import math
import re
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from flask import Blueprint, current_app, jsonify, request
from sqlalchemy.exc import OperationalError
from ..core import (
    CATEGORIES,
    MAX_IMAGE_BYTES,
    UPLOAD_URL_PREFIX,
    current_user,
    csrf_valid,
    delete_uploaded_image,
    get_connection,
    serialize_listing,
    upload_relative_path,
)
from ..data_catalog import (
    CATEGORY_ALLOWED_IDS,
    CATEGORY_GROUPS,
    CATEGORY_TREE,
    IRAN_LOCATIONS,
    LOCATION_INDEX,
    LOCATION_TYPE_RANK,
    POPULAR_CITIES,
    TRADE_GROUPS,
    normalize_location_name,
)
from ..services import rate_limits

bp = Blueprint("listings", __name__)


# Paid "featured" placements expire on a timer. The sweep runs on the listing
# read path, so it is throttled per process: expiring a placement a minute late
# is invisible to users, while writing on every request would fight with real
# writes for SQLite's single writer lock.
FEATURED_SWEEP_INTERVAL_SECONDS = 60.0
_last_featured_sweep = 0.0

# How many full-text matches are considered for a single search. Raising this
# widens recall for very popular terms; the cost is roughly linear.
FTS_SEARCH_WINDOW = 5000


def _expire_featured_promotions(connection) -> None:
    """Clear expired featured flags at most once per process per minute."""
    global _last_featured_sweep
    now_monotonic = time.monotonic()
    if now_monotonic - _last_featured_sweep < FEATURED_SWEEP_INTERVAL_SECONDS:
        return
    _last_featured_sweep = now_monotonic
    now = datetime.now(timezone.utc).isoformat()
    connection.execute(
        "UPDATE listings SET featured=0 WHERE featured_until<>'' AND featured_until<?",
        (now,),
    )


def _attach_active_tags(items):
    if not items:
        return items
    now = datetime.now(timezone.utc).isoformat()
    ids = [int(item["id"]) for item in items]
    placeholders = ",".join("?" for _ in ids)
    with get_connection() as connection:
        rows = connection.execute(
            f"""SELECT listing_id, tag_type, ends_at FROM listing_tags
                WHERE status='active' AND ends_at>? AND listing_id IN ({placeholders})
                ORDER BY ends_at DESC""",
            [now, *ids],
        ).fetchall()
    active = {}
    for row in rows:
        active.setdefault(row["listing_id"], {"type": row["tag_type"], "ends_at": row["ends_at"]})
    labels = {"listing_tag_sale": "حراج", "listing_tag_special": "فروش ویژه", "listing_tag_discount": "تخفیف‌دار"}
    for item in items:
        tag = active.get(int(item["id"]))
        item["paid_tag"] = ({**tag, "label": labels.get(tag["type"], "ویژه")} if tag else None)
    return items


def _fts_match_query(raw: str) -> str | None:
    """Build a safe FTS5 MATCH string from user input (AND of quoted tokens)."""
    tokens = re.findall(r"[\w\u0600-\u06FF]+", raw, flags=re.UNICODE)
    if not tokens:
        return None
    # Quote each token so FTS special characters cannot break the query.
    return " AND ".join(f'"{token}"' for token in tokens[:12])


@bp.get("/api/categories")
def categories():
    return jsonify({
        "items": CATEGORIES,
        "subcategories": [
            {"id": item["value"], "name": item["text"], "group_id": group["id"], "group": group["group"]}
            for group in CATEGORY_TREE for item in group["types"]
        ],
    })


@bp.get("/api/locations")
def locations():
    """Search unique real Iranian city names; villages and urban sub-areas are excluded.

    City records with the same normalized name are grouped in data_catalog and
    represented by one option with their matching province names. The catalogue
    is normalized once at import, so each keystroke only scans a compact index.
    """
    query = normalize_location_name(request.args.get("q", ""))[:80]
    kind = request.args.get("kind", "city").strip().lower()
    if kind == "village":
        return jsonify({"items": [], "count": 0})
    if kind not in {"city", "point"}:
        kind = "city"

    # The city chooser needs the complete, compact city directory, not the
    # full 1.2 MB source catalogue. Return grouped city records plus shortcuts.
    if kind == "city" and request.args.get("all") == "1":
        items = [payload for _, payload in LOCATION_INDEX["city"]]
        items.sort(key=lambda item: normalize_location_name(item["name"]))
        response = jsonify({
            "items": items,
            "popular": list(POPULAR_CITIES),
            "count": len(items),
            "source_year": IRAN_LOCATIONS["source_year"],
        })
        # The grouped city-only directory is compact and changes infrequently.
        # Let browsers and reverse proxies reuse it instead of downloading it
        # again every time the homepage chooser is opened.
        response.headers["Cache-Control"] = "public, max-age=86400"
        return response

    if len(query) < 2:
        if query or kind != "city":
            return jsonify({"items": []})
        items = list(POPULAR_CITIES)
        return jsonify({"items": items, "count": len(items),
                        "source_year": IRAN_LOCATIONS["source_year"]})

    candidates = [payload for normalized, payload in LOCATION_INDEX[kind] if query in normalized]
    candidates.sort(key=lambda item: (
        not normalize_location_name(item["name"]).startswith(query),
        LOCATION_TYPE_RANK.get(item["type"], 4),
        item["name"],
    ))

    seen, items = set(), []
    for item in candidates:
        key = (item["name"], item["type"], item["province"], item["county"])
        if key in seen:
            continue
        seen.add(key)
        items.append(item)
        if len(items) >= 25:
            break
    return jsonify({
        "items": items,
        "count": len(items),
        "source_year": IRAN_LOCATIONS["source_year"],
        "urban_zones_available": len(IRAN_LOCATIONS.get("urban_zones", [])),
        "important_points_available": len(IRAN_LOCATIONS.get("county_centers", [])),
    })


@bp.get("/api/trades")
def trades():
    return jsonify({"items": TRADE_GROUPS})

@bp.get("/api/listings")
def listings():
    query = request.args.get("q", "").strip()[:100]
    category = request.args.get("category", "").strip()[:40]
    city = request.args.get("city", "").strip()[:100]
    availability = request.args.get("availability", "").strip()
    if availability and availability not in {"in_stock", "out_of_stock", "ask"}:
        return jsonify({"error": "invalid_availability", "message": "فیلتر موجودی معتبر نیست."}), 400
    province = request.args.get("province", "").strip().replace("ي", "ی").replace("ك", "ک")[:80]
    near_lat, near_lon = request.args.get("lat", type=float), request.args.get("lon", type=float)
    radius_km = min(100.0, max(1.0, request.args.get("radius_km", default=25.0, type=float) or 25.0))
    use_nearby = near_lat is not None and near_lon is not None and -90 <= near_lat <= 90 and -180 <= near_lon <= 180
    page_size = min(100, max(1, request.args.get("limit", default=50, type=int) or 50))
    # Composite keyset cursor matches ORDER BY featured DESC, id DESC.
    before_id = request.args.get("before_id", type=int)
    before_featured = request.args.get("before_featured", type=int)
    if before_featured not in (None, 0, 1):
        return jsonify({"error": "invalid_cursor", "message": "نشانگر صفحه‌بندی معتبر نیست."}), 400

    parameters: list[Any] = []
    fts_match = _fts_match_query(query) if query else None

    if fts_match and use_nearby:
        # For nearby searches, apply the geographic window before limiting FTS
        # candidates. Otherwise the newest global matches can consume the
        # candidate budget and hide older listings at the user's location.
        delta_lat = radius_km / 111.0
        cos_lat = max(0.01, abs(math.cos(math.radians(near_lat))))
        delta_lon = radius_km / (111.0 * cos_lat)
        sql = """
            SELECT listings.*
            FROM listings
            INNER JOIN (
                SELECT nearby_listing.id AS candidate_id
                FROM listings_fts
                INNER JOIN listings AS nearby_listing
                    ON nearby_listing.id = listings_fts.rowid
                WHERE listings_fts MATCH ?
                  AND nearby_listing.latitude IS NOT NULL
                  AND nearby_listing.longitude IS NOT NULL
                  AND nearby_listing.latitude BETWEEN ? AND ?
                  AND nearby_listing.longitude BETWEEN ? AND ?
                ORDER BY (
                    (nearby_listing.latitude - ?) * (nearby_listing.latitude - ?) +
                    (nearby_listing.longitude - ?) * (nearby_listing.longitude - ?) * ?
                ), nearby_listing.id DESC
                LIMIT ?
            ) candidates ON candidates.candidate_id = listings.id
            WHERE 1=1
        """
        parameters.extend([
            fts_match,
            near_lat - delta_lat, near_lat + delta_lat,
            near_lon - delta_lon, near_lon + delta_lon,
            near_lat, near_lat, near_lon, near_lon, cos_lat * cos_lat,
            FTS_SEARCH_WINDOW,
        ])
    elif fts_match:
        # The candidate window is bounded on purpose. A popular term can match
        # hundreds of thousands of rows, and joining every match back onto the
        # listings table only to throw all but one page away costs ~200 ms on a
        # million listings. Taking the newest FTS_SEARCH_WINDOW matches first
        # caps the work (3 ms at the same scale) and, because FTS walks rowids in
        # order, still yields the newest page the user asked for.
        sql = """
            SELECT listings.*
            FROM listings
            INNER JOIN (
                SELECT rowid AS candidate_id
                FROM listings_fts
                WHERE listings_fts MATCH ?
                ORDER BY rowid DESC
                LIMIT ?
            ) candidates ON candidates.candidate_id = listings.id
            WHERE 1=1
        """
        parameters.extend([fts_match, FTS_SEARCH_WINDOW])
    else:
        sql = "SELECT * FROM listings WHERE 1=1"

    if category and category != "all":
        category_ids = [category]
        category_ids.extend(CATEGORY_GROUPS.get(category, []))
        category_ids = list(dict.fromkeys(category_ids))
        placeholders = ",".join("?" for _ in category_ids)
        sql += " AND category IN (" + placeholders + ")"
        parameters.extend(category_ids)
    if city and city != "همه شهرها":
        sql += " AND city = ?"
        parameters.append(city)
    if availability:
        sql += " AND availability_status = ?"
        parameters.append(availability)
    if province and province not in {"all", "همه استان‌ها"}:
        province_row = next((
            item for item in IRAN_LOCATIONS.get("provinces", [])
            if item.get("name", "").replace("ي", "ی").replace("ك", "ک") == province
        ), None)
        province_city_names = [
            item["name"] for item in IRAN_LOCATIONS.get("cities", [])
            if province_row and item.get("province_id") == province_row.get("id")
        ]
        if province_city_names:
            placeholders = ",".join("?" for _ in province_city_names)
            sql += " AND city IN (" + placeholders + ")"
            parameters.extend(province_city_names)
        else:
            sql += " AND 1=0"
    if use_nearby:
        sql += " AND latitude IS NOT NULL AND longitude IS NOT NULL"
        delta_lat = radius_km / 111.0
        cos_lat = max(0.01, abs(math.cos(math.radians(near_lat))))
        delta_lon = radius_km / (111.0 * cos_lat)
        sql += " AND latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ?"
        parameters.extend([
            near_lat - delta_lat, near_lat + delta_lat,
            near_lon - delta_lon, near_lon + delta_lon,
        ])
    if before_id is not None and before_id > 0 and not use_nearby:
        if before_featured in (0, 1):
            sql += " AND (featured < ? OR (featured = ? AND id < ?))"
            parameters.extend([before_featured, before_featured, before_id])
        else:
            # Compatibility for older clients that only send before_id.
            sql += " AND id < ?"
            parameters.append(before_id)

    # Nearby discovery must rank by physical distance, not paid placement.
    # Use an equirectangular distance key in SQLite to select a bounded set of
    # nearest candidates, then calculate exact haversine distances below.
    # This avoids letting featured listings crowd genuinely closer shops out
    # of the candidate window while keeping the query index/bounding-box bound.
    fetch_limit = page_size + 1
    if use_nearby:
        fetch_limit = min(300, max(100, page_size * 3))
        cos_lat = math.cos(math.radians(near_lat))
        sql += (
            " ORDER BY ((latitude - ?) * (latitude - ?) + "
            "((longitude - ?) * (longitude - ?) * ?)), id DESC LIMIT ?"
        )
        parameters.extend([
            near_lat, near_lat, near_lon, near_lon, cos_lat * cos_lat,
            fetch_limit,
        ])
    else:
        sql += " ORDER BY featured DESC, id DESC LIMIT ?"
        parameters.append(fetch_limit)

    with get_connection() as connection:
        _expire_featured_promotions(connection)
        try:
            rows = connection.execute(sql, parameters).fetchall()
        except OperationalError as error:
            # A legacy database without the FTS index can still be searched once
            # with LIKE. Any other failure (a malformed MATCH expression, say) is
            # a bug and must surface rather than quietly trigger a table scan:
            # on millions of rows an unanchored LIKE is a disaster, not a fallback.
            if not fts_match:
                raise
            current_app.logger.warning("FTS search unavailable (%s); using LIKE fallback", error)
            fallback_sql = "SELECT * FROM listings WHERE 1=1"
            fallback_params: list[Any] = []
            term = f"%{query}%"
            fallback_sql += " AND (title LIKE ? OR description LIKE ? OR city LIKE ?)"
            fallback_params.extend([term, term, term])
            if category and category != "all":
                category_ids = list(dict.fromkeys([category, *CATEGORY_GROUPS.get(category, [])]))
                placeholders = ",".join("?" for _ in category_ids)
                fallback_sql += " AND category IN (" + placeholders + ")"
                fallback_params.extend(category_ids)
            if city and city != "همه شهرها":
                fallback_sql += " AND city = ?"
                fallback_params.append(city)
            if availability:
                fallback_sql += " AND availability_status = ?"
                fallback_params.append(availability)
            if province and province not in {"all", "همه استان‌ها"}:
                province_row = next((
                    item for item in IRAN_LOCATIONS.get("provinces", [])
                    if item.get("name", "").replace("ي", "ی").replace("ك", "ک") == province
                ), None)
                province_city_names = [
                    item["name"] for item in IRAN_LOCATIONS.get("cities", [])
                    if province_row and item.get("province_id") == province_row.get("id")
                ]
                if province_city_names:
                    placeholders = ",".join("?" for _ in province_city_names)
                    fallback_sql += " AND city IN (" + placeholders + ")"
                    fallback_params.extend(province_city_names)
                else:
                    fallback_sql += " AND 1=0"
            if before_id is not None and before_id > 0 and not use_nearby:
                if before_featured in (0, 1):
                    fallback_sql += " AND (featured < ? OR (featured = ? AND id < ?))"
                    fallback_params.extend([before_featured, before_featured, before_id])
                else:
                    fallback_sql += " AND id < ?"
                    fallback_params.append(before_id)
            fallback_sql += " ORDER BY featured DESC, id DESC LIMIT ?"
            fallback_params.append(fetch_limit)
            rows = connection.execute(fallback_sql, fallback_params).fetchall()

    items = _attach_active_tags([serialize_listing(row) for row in rows])
    if use_nearby:
        for item in items:
            lat, lon = item.get("latitude"), item.get("longitude")
            item["distance_km"] = None
            if lat is not None and lon is not None:
                dlat = math.radians(float(lat) - near_lat)
                dlon = math.radians(float(lon) - near_lon)
                a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(near_lat)) * math.cos(math.radians(float(lat))) * math.sin(dlon / 2) ** 2
                item["distance_km"] = round(6371 * 2 * math.asin(min(1, math.sqrt(a))), 2)
        items = [item for item in items if item["distance_km"] is not None and item["distance_km"] <= radius_km]
        items.sort(key=lambda item: item["distance_km"])
        page = items[:page_size]
        return jsonify({
            "items": page,
            "count": len(page),
            "nearby": True,
            "radius_km": radius_km,
            # Nearby results are distance-sorted in Python and do not yet expose
            # a stable distance cursor. Never advertise a load-more page that
            # would repeat the same first window.
            "has_more": False,
            "next_before_id": None,
            "next_before_featured": None,
            "results_limited": len(rows) >= fetch_limit,
        })

    has_more = len(items) > page_size
    page = items[:page_size]
    next_before_id = page[-1]["id"] if has_more and page else None
    next_before_featured = int(bool(page[-1]["featured"])) if has_more and page else None
    return jsonify({
        "items": page,
        "count": len(page),
        "nearby": False,
        "radius_km": None,
        "has_more": has_more,
        "next_before_id": next_before_id,
        "next_before_featured": next_before_featured,
    })

def inspect_image(upload) -> tuple[bytes, str] | None:
    """Identify raster image data from its signature, not the supplied filename."""
    if upload is None or not upload.filename:
        return None
    content = upload.stream.read(MAX_IMAGE_BYTES + 1)
    if len(content) > MAX_IMAGE_BYTES:
        raise ValueError("image_too_large")
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return content, ".png"
    if content.startswith(b"\xff\xd8\xff"):
        return content, ".jpg"
    if len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP":
        return content, ".webp"
    raise ValueError("invalid_image")

@bp.post("/api/listings")
def create_listing():
    user = current_user()
    if not user:
        return jsonify({"error": "authentication_required", "message": "برای ثبت آگهی ابتدا وارد حساب شوید."}), 401
    # Publishing inventory is a seller capability; public browsing remains open.
    if user.get("role") != "seller":
        return jsonify({
            "error": "seller_account_required",
            "message": "برای ثبت کالا ابتدا حساب خود را به فروشنده تبدیل کنید.",
        }), 403
    if not csrf_valid():
        return jsonify({"error": "csrf_failed", "message": "صفحه را تازه‌سازی کنید و دوباره تلاش کنید."}), 400
    try:
        rate_limits.enforce("listing_create", user, limit=60, window_seconds=3600, cooldown_seconds=2)
    except rate_limits.RateLimitExceeded as error:
        return rate_limits.error_response(error, "تعداد آگهی‌های ثبت‌شده از سقف ساعتی گذشته است؛ کمی بعد دوباره تلاش کنید.")
    is_multipart = bool(request.content_type and request.content_type.startswith("multipart/form-data"))
    payload = request.form if is_multipart else request.get_json(silent=True)
    if payload is None or not hasattr(payload, "get"):
        return jsonify({"error": "invalid_payload"}), 400

    title = payload.get("title")
    category = payload.get("category")
    city = payload.get("city")
    description = payload.get("description", "")
    seller_phone = payload.get("seller_phone", "")
    availability_status = payload.get("availability_status", "ask")
    if availability_status not in {"in_stock", "out_of_stock", "ask"}:
        return jsonify({"error": "invalid_availability_status", "message": "وضعیت موجودی معتبر نیست."}), 400
    price_updated_at = datetime.now(timezone.utc).isoformat()
    try:
        latitude = float(payload.get("latitude")) if payload.get("latitude") not in (None, "") else None
        longitude = float(payload.get("longitude")) if payload.get("longitude") not in (None, "") else None
    except (TypeError, ValueError):
        return jsonify({"error":"invalid_coordinates"}), 400
    if (latitude is None) != (longitude is None) or (latitude is not None and not (-90 <= latitude <= 90 and -180 <= longitude <= 180)):
        return jsonify({"error":"invalid_coordinates"}), 400
    raw_price = payload.get("price", 0)
    try:
        price = int(raw_price) if not isinstance(raw_price, bool) else -1
    except (TypeError, ValueError):
        price = -1

    if not isinstance(title, str) or not title.strip() or len(title.strip()) > 100:
        return jsonify({"error": "invalid_title", "message": "عنوان باید بین ۱ تا ۱۰۰ نویسه باشد."}), 400
    if not isinstance(category, str) or category not in CATEGORY_ALLOWED_IDS:
        return jsonify({"error": "invalid_category"}), 400
    if not isinstance(city, str) or not city.strip() or len(city.strip()) > 100:
        return jsonify({"error": "invalid_city"}), 400
    if not isinstance(description, str) or len(description.strip()) > 1000:
        return jsonify({"error": "invalid_description"}), 400
    if not isinstance(seller_phone, str):
        return jsonify({"error": "invalid_seller_phone", "message": "شماره تماس معتبر وارد کنید."}), 400
    digit_map = str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789")
    seller_phone = seller_phone.translate(digit_map)
    seller_phone = re.sub(r"[\s()\-]", "", seller_phone)
    if seller_phone and not re.fullmatch(r"09\d{9}", seller_phone):
        return jsonify({"error": "invalid_seller_phone", "message": "شماره همراه باید مانند 09123456789 باشد."}), 400
    if price < 0 or price > 10**12:
        return jsonify({"error": "invalid_price"}), 400

    image_content = None
    upload = request.files.get("image") if is_multipart else None
    if upload and upload.filename:
        try:
            image_content = inspect_image(upload)
        except ValueError as error:
            reason = str(error)
            status = 413 if reason == "image_too_large" else 400
            return jsonify({"error": reason, "message": "تصویر باید JPG، PNG یا WebP و حداکثر ۴ مگابایت باشد."}), status

    image_path = ""
    if image_content:
        binary, extension = image_content
        filename = f"{uuid.uuid4().hex}{extension}"
        # Sharded into two-character directories: one flat folder with millions
        # of images makes every lookup (and backup) slower than it needs to be.
        relative_path = upload_relative_path(filename)
        target = Path(current_app.config["UPLOAD_FOLDER"]) / relative_path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(binary)
        image_path = f"{UPLOAD_URL_PREFIX}{relative_path}"

    with get_connection() as connection:
        store = connection.execute("SELECT id FROM stores WHERE owner_id = ?", (user["id"],)).fetchone()
        if store is None:
            return jsonify({"error": "store_required", "message": "برای افزودن کالا، ابتدا ویترین فروشگاه خود را بسازید."}), 409
        cursor = connection.execute(
            """
            INSERT INTO listings (title, category, city, price, description, emoji, featured, image_path, seller_phone, owner_id, store_id, latitude, longitude, availability_status, price_updated_at)
            VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (title.strip(), category, city.strip(), price, description.strip(), "🛍️", image_path, seller_phone, user["id"], store["id"], latitude, longitude, availability_status, price_updated_at),
        )
        listing_id = cursor.lastrowid
        row = connection.execute(
            "SELECT * FROM listings WHERE id = ?", (listing_id,)
        ).fetchone()

    return jsonify({"item": _attach_active_tags([serialize_listing(row, include_contact=True)])[0]}), 201

@bp.route("/api/listings/<int:listing_id>", methods=["PATCH", "DELETE"])
def manage_listing(listing_id: int):
    user = current_user()
    if not user:
        return jsonify({"error": "authentication_required", "message": "برای مدیریت آگهی وارد شوید."}), 401
    if not csrf_valid():
        return jsonify({"error": "csrf_failed"}), 400
    with get_connection() as connection:
        row = connection.execute("SELECT * FROM listings WHERE id = ?", (listing_id,)).fetchone()
        if row is None:
            return jsonify({"error": "listing_not_found"}), 404
        if row["owner_id"] != user["id"]:
            return jsonify({"error": "listing_forbidden", "message": "فقط صاحب آگهی می‌تواند آن را تغییر دهد."}), 403
        if user.get("role") != "seller":
            return jsonify({
                "error": "seller_account_required",
                "message": "مدیریت کالا فقط برای حساب فروشنده در دسترس است.",
            }), 403
        if request.method == "DELETE":
            image_path = row["image_path"] if row["image_path"] else ""
            connection.execute("DELETE FROM listings WHERE id = ?", (listing_id,))
        else:
            image_path = None
            payload = request.get_json(silent=True) or {}
            allowed = {"title", "category", "city", "price", "description", "seller_phone", "latitude", "longitude", "availability_status"}
            if not payload or set(payload) - allowed:
                return jsonify({"error": "invalid_payload"}), 400
            title = payload.get("title", row["title"])
            category = payload.get("category", row["category"])
            city = payload.get("city", row["city"])
            description = payload.get("description", row["description"])
            price = payload.get("price", row["price"])
            phone = payload.get("seller_phone", row["seller_phone"])
            availability_status = payload.get("availability_status", row["availability_status"] if "availability_status" in row.keys() else "ask")
            if availability_status not in {"in_stock", "out_of_stock", "ask"}:
                return jsonify({"error": "invalid_availability_status", "message": "وضعیت موجودی معتبر نیست."}), 400
            price_changed = "price" in payload and str(payload.get("price")) != str(row["price"])
            price_updated_at = datetime.now(timezone.utc).isoformat() if price_changed else (row["price_updated_at"] if "price_updated_at" in row.keys() else "")
            try:
                latitude = float(payload.get("latitude", row["latitude"])) if payload.get("latitude", row["latitude"]) not in (None, "") else None
                longitude = float(payload.get("longitude", row["longitude"])) if payload.get("longitude", row["longitude"]) not in (None, "") else None
            except (TypeError, ValueError):
                return jsonify({"error": "invalid_coordinates"}), 400
            if (latitude is None) != (longitude is None) or (latitude is not None and not (-90 <= latitude <= 90 and -180 <= longitude <= 180)):
                return jsonify({"error": "invalid_coordinates"}), 400
            if not isinstance(title, str) or not title.strip() or len(title.strip()) > 100:
                return jsonify({"error": "invalid_title"}), 400
            if not isinstance(category, str) or category not in CATEGORY_ALLOWED_IDS:
                return jsonify({"error": "invalid_category"}), 400
            if not isinstance(city, str) or not city.strip() or len(city.strip()) > 60:
                return jsonify({"error": "invalid_city"}), 400
            if not isinstance(description, str) or len(description) > 1000:
                return jsonify({"error": "invalid_description"}), 400
            try:
                price = int(price)
            except (TypeError, ValueError):
                return jsonify({"error": "invalid_price"}), 400
            if price < 0 or price > 10**12:
                return jsonify({"error": "invalid_price"}), 400
            if not isinstance(phone, str):
                return jsonify({"error": "invalid_seller_phone"}), 400
            phone = phone.translate(str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789"))
            phone = re.sub(r"[\s()\-]", "", phone)
            if phone and not re.fullmatch(r"09\d{9}", phone):
                return jsonify({"error": "invalid_seller_phone"}), 400
            connection.execute(
                "UPDATE listings SET title=?, category=?, city=?, price=?, description=?, seller_phone=?, latitude=?, longitude=?, availability_status=?, price_updated_at=? WHERE id=?",
                (title.strip(), category, city.strip(), price, description.strip(), phone, latitude, longitude, availability_status, price_updated_at, listing_id),
            )
            updated = connection.execute("SELECT * FROM listings WHERE id=?", (listing_id,)).fetchone()
            return jsonify({"item": _attach_active_tags([serialize_listing(updated, include_contact=True)])[0]})
    if request.method == "DELETE":
        delete_uploaded_image(image_path)
        return jsonify({"ok": True})
    return jsonify({"error": "method_not_allowed"}), 405

@bp.get("/api/listings/<int:listing_id>")
def listing_detail(listing_id: int):
    with get_connection() as connection:
        row = connection.execute(
            "SELECT * FROM listings WHERE id = ?", (listing_id,)
        ).fetchone()
    if row is None:
        return jsonify({"error": "listing_not_found"}), 404
    return jsonify({"item": _attach_active_tags([serialize_listing(row, include_contact=True)])[0]})

