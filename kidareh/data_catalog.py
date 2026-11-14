"""Versioned category, trade, and Iranian administrative-location catalogs."""
import json
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).resolve().parent / "data"


def _load(name):
    with (DATA_DIR / name).open("r", encoding="utf-8") as source:
        return json.load(source)


CATEGORY_TREE = _load("categories.json")
IRAN_LOCATIONS = _load("iran_locations.json")
TRADE_GROUPS = _load("trades.json")


# --- Location name normalization ---------------------------------------------
# The same function must be applied to both sides of any comparison (the
# pre-computed index and the incoming query), otherwise equivalent names will
# fail to match. The mapping covers the variants that actually occur in Iranian
# administrative data and in text pasted from Arabic-script sources.
#
# Deliberately NOT normalized:
#   * ``ة`` (taa marbuta) → ``ه`` — Iranian city names almost never end in
#     taa marbuta, so a mapping would only affect rare cases and could collapse
#     distinct names.
#   * ``أ`` / ``إ`` / ``آ`` → ``ا`` — these carry real distinctions and are
#     not used interchangeably for Iranian place names.
#   * ``ئ`` / ``ؤ`` — hamza carriers carry meaning in Persian orthography.
_LOCATION_TRANSLATION_TABLE = str.maketrans({
    "ي": "ی",   # Arabic yeh (U+064A) → farsi yeh
    "ى": "ی",   # alef maqsura (U+0649) → farsi yeh
    "ك": "ک",   # Arabic kaf (U+0643) → farsi keheh
    **{chr(cp): None for cp in range(0x064B, 0x0660)},  # Arabic diacritics
    "\u0640": None,  # tatweel (kashida) — visually decorative
})


def normalize_location_name(value):
    """Normalize Persian/Arabic letter variants and whitespace for matching.

    Handles: Arabic yeh / alef maqsura → farsi yeh, Arabic kaf → farsi keheh,
    Arabic diacritics and tatweel stripped, runs of whitespace collapsed.

    Returns ``""`` for non-string input or input that normalizes to nothing
    (whitespace-only, diacritic-only, etc.). Callers must treat ``""`` as
    "no value", never as a valid city name.
    """
    if not isinstance(value, str):
        return ""
    normalized = value.translate(_LOCATION_TRANSLATION_TABLE).strip()
    return " ".join(normalized.split())


# --- Location search index ---------------------------------------------------
# The city picker queries this catalogue on every keystroke, so entries are
# normalized once at import time instead of per request. `iran_locations.json`
# stays the single source of truth; this is only a pre-computed view of it.
LOCATION_TYPE_RANK = {"city": 0, "urban_zone": 1, "important_point": 2, "province_capital": 3}

# Offered when the picker opens with an empty query. Names must exactly match
# the ``name`` field in ``iran_locations.json`` (whitespace matters: the JSON
# uses "بندر عباس", not "بندرعباس"). A mismatch is logged below; the picker
# still works, but the missing city will not appear in the shortcuts.
POPULAR_CITY_NAMES = (
    "تهران", "مشهد", "اصفهان", "کرج", "شیراز", "تبریز", "قم",
    "اهواز", "کرمانشاه", "رشت", "کرمان", "یزد", "ساری", "بندر عباس", "اراک",
)


def _build_location_index() -> dict[str, list[tuple[str, dict]]]:
    provinces = {item["id"]: item["name"] for item in IRAN_LOCATIONS["provinces"]}
    counties = {item["id"]: item["name"] for item in IRAN_LOCATIONS["counties"]}

    def entry(name, identifier, kind, province="", county="", extra=None):
        payload = {
            "id": identifier,
            "name": name,
            "type": kind,
            "province": province,
            "county": county,
        }
        if extra:
            payload.update(extra)
        return (normalize_location_name(name), payload)

    # The public city picker is intentionally city-only. Multiple real cities can
    # share a name, so aggregate those records into one selectable name and show
    # all matching provinces instead of presenting duplicate options.
    grouped_cities: dict[str, dict] = {}
    for item in IRAN_LOCATIONS["cities"]:
        normalized = normalize_location_name(item.get("name", ""))
        if not normalized:
            # Empty names (whitespace-only, diacritic-only) are not valid
            # selectable cities. Skipping them here is what keeps
            # ``is_city_name("")`` returning False.
            continue
        province = provinces.get(item["province_id"], "")
        county = counties.get(item["county_id"], "")
        if normalized not in grouped_cities:
            grouped_cities[normalized] = {
                "id": item["id"],
                "name": item["name"],
                "provinces": set(),
                "counties": set(),
            }
        if province:
            grouped_cities[normalized]["provinces"].add(province)
        if county:
            grouped_cities[normalized]["counties"].add(county)

    cities: list[tuple[str, dict]] = []
    for normalized, grouped in grouped_cities.items():
        province_names = sorted(grouped["provinces"])
        county_names = sorted(grouped["counties"])
        payload = {
            "id": grouped["id"],
            "name": grouped["name"],
            "type": "city",
            "province": "، ".join(province_names),
            "county": county_names[0] if len(county_names) == 1 else "",
        }
        cities.append((normalized, payload))

    points: list[tuple[str, dict]] = []
    for item in IRAN_LOCATIONS.get("county_centers", []):
        # County centres remain available to map-point consumers, never to the
        # city picker.
        points.append(
            entry(
                item["center_name"],
                item["county_id"],
                "important_point",
                provinces.get(item["province_id"], ""),
                item["county_name"],
                {"latitude": item.get("latitude"), "longitude": item.get("longitude")},
            )
        )
    for item in IRAN_LOCATIONS.get("province_capitals", []):
        points.append(
            entry(
                item["center_name"],
                item["province_id"],
                "province_capital",
                item["province_name"],
                "",
                {"latitude": item.get("latitude"), "longitude": item.get("longitude")},
            )
        )

    return {"city": cities, "point": points}


LOCATION_INDEX = _build_location_index()

# Only genuine cities, so the "popular cities" shortcut cannot resolve to an
# urban zone or county centre that happens to share a name.
CITY_INDEX_BY_NAME = {
    normalized: payload
    for normalized, payload in LOCATION_INDEX["city"]
    if payload["type"] == "city"
}

# Derive the canonical city-name set from the same index that powers the
# picker. Doing it this way guarantees that ``is_city_name`` and the picker
# cannot drift apart, and it inherits the "skip empty normalized names" rule
# from ``_build_location_index``.
CITY_NAMES: set[str] = set(CITY_INDEX_BY_NAME)


def is_city_name(value):
    """Return whether a value matches a city in the canonical Iranian directory."""
    normalized = normalize_location_name(value)
    if not normalized:
        return False
    return normalized in CITY_NAMES


POPULAR_CITIES = []
for name in POPULAR_CITY_NAMES:
    normalized = normalize_location_name(name)
    payload = CITY_INDEX_BY_NAME.get(normalized)
    if payload is None:
        # The picker is still correct; only the shortcut chip is missing. Log
        # so a typo in ``POPULAR_CITY_NAMES`` is caught at startup instead of
        # being silently absorbed.
        logger.warning(
            "Popular city %r (normalized: %r) is not in the cities catalog; "
            "omitting it from the city picker shortcuts.",
            name, normalized,
        )
        continue
    POPULAR_CITIES.append(payload)


# --- Category taxonomy -------------------------------------------------------
CATEGORIES = [
    {"id": group["id"], "name": group["group"], "icon": group.get("icon", "▦"),
     "description": group.get("description", ""), "types": group.get("types", [])}
    for group in CATEGORY_TREE
]

# Subcategory values per new group, straight from the taxonomy JSON. This is
# the *only* source of the group↔subcategory relation; the compatibility
# mapping below builds on top of it.
SUB_CATEGORIES: dict[str, list[str]] = {
    group["id"]: [item["value"] for item in group["types"]]
    for group in CATEGORY_TREE
}

# Display labels: group IDs map to group names, subcategory values map to their
# text. Legacy IDs are added below.
CATEGORY_LABELS: dict[str, str] = {group["id"]: group["group"] for group in CATEGORY_TREE}
for group in CATEGORY_TREE:
    for item in group["types"]:
        CATEGORY_LABELS[item["value"]] = item["text"]

# Legacy listing IDs still appear in already-published rows and in demo data.
# Keep them searchable by mapping each legacy ID to the new group IDs it used
# to represent, and (symmetrically) letting the new groups resolve to the
# legacy ID so old listings surface under either filter.
LEGACY_CATEGORY_GROUPS = {
    "home": ("home_and_life", "home_appliances_group"),
    "digital": ("digital_goods",),
    "fashion": ("personal_goods", "beauty_care"),
    "vehicle": ("vehicles",),
    "services": ("jobs",),
    "other": ("others",),
}
LEGACY_CATEGORY_NAMES = {
    "home": "خانه و زندگی",
    "digital": "دیجیتال",
    "fashion": "پوشاک",
    "vehicle": "خودرو",
    "services": "خدمات",
    "other": "سایر",
}

# Expanded mapping used by the browse query:
#   CATEGORY_GROUPS["furniture"]   → []            (a leaf: no children)
#   CATEGORY_GROUPS["home_and_life"] → [furniture, …, home]
#   CATEGORY_GROUPS["home"]         → [furniture, …, home_and_life, home_appliances_group]
# The lists are freshly allocated (not shared with ``SUB_CATEGORIES``) so that
# appending the legacy marker below cannot leak back into the source data.
CATEGORY_GROUPS: dict[str, list[str]] = {
    group_id: list(subcategories)
    for group_id, subcategories in SUB_CATEGORIES.items()
}

for legacy_id, new_group_ids in LEGACY_CATEGORY_GROUPS.items():
    # Legacy → new: the legacy filter must find every subcategory of every new
    # group it used to represent, plus listings stored at the new group ID
    # itself.
    legacy_targets: list[str] = []
    for new_group_id in new_group_ids:
        legacy_targets.extend(SUB_CATEGORIES.get(new_group_id, []))
        legacy_targets.append(new_group_id)
        # New → legacy (symmetric): filtering by the new group must also find
        # listings stored under the old legacy ID.
        CATEGORY_GROUPS[new_group_id].append(legacy_id)
    CATEGORY_GROUPS[legacy_id] = legacy_targets
    CATEGORY_LABELS[legacy_id] = LEGACY_CATEGORY_NAMES[legacy_id]

# Any ID accepted by the listing endpoints: new group IDs, subcategory values,
# and legacy IDs. Built once, after every mapping above has been populated, so
# the set cannot accidentally miss a key that was added later.
CATEGORY_ALLOWED_IDS: set[str] = set(CATEGORY_LABELS) | set(CATEGORY_GROUPS) | set(LEGACY_CATEGORY_NAMES)