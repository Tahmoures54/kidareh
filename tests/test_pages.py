"""Page rendering regression tests.

The original file had several leaks:

* ``app.config.update(TESTING=True)`` was not undone between tests.
* ``DATABASE_PATH`` was only patched on ``main``; ``kidareh.core`` and
  ``kidareh.schema_init`` kept the original path.
* ``_sign_in_test_seller`` never committed, and the DB connection context
  manager's behaviour was assumed rather than asserted.
* ``test_product_and_store_pages_include_ids`` and the search test relied on
  demo seed data without pinning it down — if seed was disabled (``LIARA_APP_ID``
  set on CI), the test crashed with ``TypeError: 'NoneType' is not subscriptable``.
* ``test_search_page_prefills_city...`` read ``static/js/pages.js`` via a
  relative path, breaking when pytest was invoked from another CWD.
"""
import importlib
from pathlib import Path

import main as app_module


# Env vars that the factory / initializer reads. Leaving them set (e.g. on
# Liara CI) flips behaviour into production mode and disables demo seed.
_ENV_VARS_TO_CLEAR = (
    "LIARA_APP_ID",
    "KIDAREH_SEED_DEMO_DATA",
    "KAVENEGAR_API_KEY",
    "ADMIN_PHONE",
    "ZIBAL_MERCHANT",
    "ZIBAL_MERCHANT_ID",
    "SECRET_KEY",
)


# ---------------------------------------------------------------------------
# infrastructure helpers (not collected by pytest)
# ---------------------------------------------------------------------------
def _patch_db_path(monkeypatch, db_path):
    """Point every module that may own a ``DATABASE_PATH`` reference at the test DB."""
    monkeypatch.setattr(app_module, "DATABASE_PATH", db_path, raising=False)
    for module_name in ("kidareh.core", "kidareh.schema_init"):
        try:
            module = importlib.import_module(module_name)
        except Exception:
            continue
        monkeypatch.setattr(module, "DATABASE_PATH", db_path, raising=False)


def _setup(monkeypatch, tmp_path, filename="pages.sqlite3"):
    """Fresh DB, TESTING=True via monkeypatch.setitem, demo seed active by default."""
    for name in _ENV_VARS_TO_CLEAR:
        monkeypatch.delenv(name, raising=False)

    db_path = tmp_path / filename
    _patch_db_path(monkeypatch, db_path)
    monkeypatch.setitem(app_module.app.config, "TESTING", True)
    monkeypatch.setitem(app_module.app.config, "TESTING_OTP_CODE", False)

    app_module.initialize_database()
    return app_module.app.test_client()


def _ensure_demo_data():
    """Ensure at least one listing and store exist.

    Some tests query for the first row of ``listings``/``stores``. Demo seed
    normally provides those, but a hostile CI environment could disable it.
    Inserting a fallback guarantees the test can still exercise the page.
    """
    with app_module.get_connection() as connection:
        if connection.execute("SELECT 1 FROM listings LIMIT 1").fetchone():
            return
        user_id = connection.execute(
            "INSERT INTO users (name, phone, password_hash, role) VALUES (?, ?, ?, ?)",
            ("seed", "09120000000", "x", "seller"),
        ).lastrowid
        store_id = connection.execute(
            "INSERT INTO stores (owner_id, name, city) VALUES (?, ?, ?)",
            (user_id, "فروشگاه تست", "تهران"),
        ).lastrowid
        connection.execute(
            "INSERT INTO listings (title, category, city, price, owner_id, store_id)"
            " VALUES (?, ?, ?, ?, ?, ?)",
            ("کالای تست", "home", "تهران", 1000, user_id, store_id),
        )
        connection.commit()


def _sign_in_test_seller(client):
    """Insert a seller and sign them in. Returns the new user id."""
    with app_module.get_connection() as connection:
        user_id = connection.execute(
            "INSERT INTO users (name, phone, password_hash, role) VALUES (?, ?, ?, ?)",
            ("فروشنده آزمایشی", "09129990001", "test-hash", "seller"),
        ).lastrowid
        connection.commit()
    with client.session_transaction() as session:
        session["user_id"] = user_id
        session["csrf_token"] = "test-token"
    client.environ_base["HTTP_X_CSRF_TOKEN"] = "test-token"
    return user_id


def _read_project_file(*parts):
    """Read a file under the project root regardless of the test's CWD."""
    return (Path(app_module.BASE_DIR).joinpath(*parts)).read_text(encoding="utf-8")


# ---------------------------------------------------------------------------
# tests
# ---------------------------------------------------------------------------
def test_dedicated_marketplace_pages_render(monkeypatch, tmp_path):
    client = _setup(monkeypatch, tmp_path, "pages.sqlite3")
    _sign_in_test_seller(client)

    cases = [
        ("/search", "جست‌وجوی کالا"),
        ("/stores", "ویترین فروشگاه‌ها"),
        ("/seller", "پنل مدیریت فروشگاه"),
        ("/account", "حساب کاربری"),
        ("/saved", "محصولات ذخیره‌شده"),
        ("/following", "فروشگاه‌های دنبال‌شده"),
    ]
    for path, expected in cases:
        response = client.get(path)
        assert response.status_code == 200, path
        assert expected.encode() in response.data, path
        assert b"templates" not in response.data


def test_product_and_store_pages_include_ids(monkeypatch, tmp_path):
    client = _setup(monkeypatch, tmp_path, "detail-pages.sqlite3")
    _ensure_demo_data()

    with app_module.get_connection() as connection:
        listing = connection.execute(
            "SELECT id FROM listings ORDER BY id LIMIT 1"
        ).fetchone()
        store = connection.execute(
            "SELECT id FROM stores ORDER BY id LIMIT 1"
        ).fetchone()
    assert listing is not None, "no listing available for product detail test"
    assert store is not None, "no store available for store detail test"

    product_response = client.get(f"/product/{listing['id']}")
    store_response = client.get(f"/store/{store['id']}")

    assert product_response.status_code == 200
    assert b"product-detail" in product_response.data
    assert store_response.status_code == 200
    assert b"store-detail" in store_response.data


def test_search_page_preserves_filters(monkeypatch, tmp_path):
    client = _setup(monkeypatch, tmp_path, "search-page.sqlite3")
    response = client.get(
        "/search?q=%DA%AF%D9%88%D8%B4%DB%8C&category=digital&city=%D8%AA%D9%87%D8%B1%D8%A7%D9%86"
    )
    assert response.status_code == 200
    # The form is re-rendered with the current filter values so a reload
    # preserves the query even when the result set is empty.
    assert "گوشی".encode() in response.data
    assert b"digital" in response.data
    assert "تهران".encode() in response.data


def test_seller_dashboard_has_storefront_first_layout_and_product_actions(monkeypatch, tmp_path):
    client = _setup(monkeypatch, tmp_path, "seller-dashboard.sqlite3")
    _sign_in_test_seller(client)
    response = client.get("/seller")
    html = response.get_data(as_text=True)

    assert response.status_code == 200
    for marker in (
        'class="seller-hero"',
        'class="seller-metrics"',
        'id="storePanel"',
        'id="myProductsPanel"',
        'id="addProductDialog"',
        'id="sellerProductForm"',
        'id="pageListings"',
        'id="sellerStoreMetric"',
        'id="sellerProductMetric"',
    ):
        assert marker in html, marker
    assert "seller-console" in html
    # The current console uses a dialog-based product form and large tap targets.
    dashboard_css = _read_project_file("static", "css", "seller-dashboard.css")
    compact = dashboard_css.replace(" ", "").replace("\n", "").replace("\t", "")
    assert ".seller-quick-link{display:flex" in compact
    assert "min-height:48px" in compact


def test_global_header_exposes_logout_controls_for_authenticated_users(monkeypatch, tmp_path):
    client = _setup(monkeypatch, tmp_path, "header-auth.sqlite3")
    response = client.get("/")
    html = response.get_data(as_text=True)

    assert response.status_code == 200
    assert 'id="headerLoginLink"' in html
    assert 'id="headerRegisterLink"' in html
    assert 'id="headerAccountLink"' in html
    assert 'id="headerLogoutButton"' in html


def test_homepage_city_privacy_and_compact_category_controls(monkeypatch, tmp_path):
    client = _setup(monkeypatch, tmp_path, "city-home.sqlite3")
    response = client.get("/")
    html = response.get_data(as_text=True)

    assert response.status_code == 200
    assert 'id="activeMarketCity"' in html
    assert 'class="home-location-bar"' in html
    assert 'id="marketCityCombobox"' in html
    assert 'id="findMyLocationButton"' in html
    assert html.index('class="home-location-bar"') < html.index('class="home-intro"')
    assert "بازار شهر خودت را پیدا کن" in html
    assert "ویترینت رو به دلِ خونه‌ها بفرست." in html
    assert 'href="/seller">ویترینم رو بساز' in html
    assert 'id="citySelect"' in html
    assert 'value="تهران"' in html
    assert 'id="marketListingsTitle">بازار تهران</h2>' in html
    assert 'class="header-search-link" href="/search"' not in html
    assert '>جست‌وجوی کالا</a>' in html
    assert 'id="searchForm"' not in html
    assert 'id="searchInput"' not in html
    assert 'id="categorySelect"' not in html
    assert 'id="nearbyListingsButton"' not in html
    assert 'class="market-location-bar"' not in html
    assert 'class="category-grid"' not in html


def test_homepage_geolocation_is_click_driven_and_uses_api_longitude_parameter():
    script = _read_project_file("static", "js", "app.js")
    assert 'findMyLocationButton?.addEventListener("click"' in script
    assert 'nearbyListingsButton?.addEventListener("click"' in script
    assert 'params.set("lon", String(userCoords.lng))' in script
    assert "getCurrentPosition(" in script
    assert 'searchForm.insertAdjacentElement("afterend", nearbyButton)' not in script


def test_market_city_title_tracks_selected_city_and_defaults_to_tehran():
    script = _read_project_file("static", "js", "app.js")
    assert 'const city = citySelect?.value.trim() || "تهران"' in script
    assert 'marketListingsTitle.textContent = "بازار " + city' in script
    assert 'localStorage.getItem("kidareh.marketCity")' in script


def test_city_combobox_uses_full_location_api_and_starts_with_popular_cities(monkeypatch, tmp_path):
    client = _setup(monkeypatch, tmp_path, "location-combobox.sqlite3")

    popular = client.get("/api/locations")
    assert popular.status_code == 200
    popular_data = popular.get_json()
    assert "تهران" in [item["name"] for item in popular_data["items"]]
    assert all(item["type"] == "city" for item in popular_data["items"])

    searched = client.get("/api/locations?kind=city&q=تهران")
    assert searched.status_code == 200
    searched_items = searched.get_json()["items"]
    assert any(item["name"] == "تهران" for item in searched_items)
    assert all(item["type"] == "city" for item in searched_items)

    # The city picker intentionally excludes villages, urban zones, and county centres.
    assert client.get("/api/locations?kind=village&q=تهران").get_json()["items"] == []
    zones = client.get("/api/locations?q=اراک%201").get_json()["items"]
    assert all(item["type"] == "city" for item in zones)
    points = client.get("/api/locations?kind=point&q=اراک").get_json()["items"]
    assert any(item["type"] == "important_point" and item.get("latitude") for item in points)

    html = client.get("/").get_data(as_text=True)
    assert 'id="marketCityOptions" role="listbox"' in html
    assert 'id="toggleMarketCityPicker"' in html
    assert 'aria-controls="marketCityOptions"' in html
    assert 'id="citySelect" list=' not in html

    register_html = client.get("/register").get_data(as_text=True)
    assert 'id="buyerCity"' in register_html and 'name="city"' in register_html
    assert 'id="storeCity"' in register_html and 'name="store_city"' in register_html
    assert 'list="iranCityOptions"' in register_html
    assert 'id="buyerCity"' in register_html
    assert "data-iran-location" in register_html


def test_category_options_are_shared_across_search_seller_and_registration(monkeypatch, tmp_path):
    client = _setup(monkeypatch, tmp_path, "shared-categories.sqlite3")
    _sign_in_test_seller(client)

    pages = {
        "/search": ('id="pageCategory"', "مواد غذایی، خواربار و خشکبار", "everyday_goods"),
        "/seller": ('name="category"', "مواد غذایی، خواربار و خشکبار", "everyday_goods"),
        "/register": ('id="storeCategory"', "مواد غذایی، خواربار و خشکبار", "everyday_goods"),
    }
    home = client.get("/").get_data(as_text=True)
    assert 'id="categorySelect"' not in home

    for path, markers in pages.items():
        response = client.get(path)
        html = response.get_data(as_text=True)
        assert response.status_code == 200, path
        assert all(marker in html for marker in markers), path
        assert 'value="food"' in html, path
        assert 'value="fresh_produce"' in html, path


def test_homepage_uses_seller_focused_hero_and_image_promo_carousel(monkeypatch, tmp_path):
    client = _setup(monkeypatch, tmp_path, "seller-hero.sqlite3")
    response = client.get("/")
    html = response.get_data(as_text=True)

    assert response.status_code == 200
    assert "کی‌داره آمده تا بازارهای شهر را رونق بدهد" in html
    assert "در چند دقیقه ویترین فروشگاهت را آنلاین کن" in html
    assert "منتظر نمون تا مشتری بیاد!" in html
    assert "ویترینت رو به دلِ خونه‌ها بفرست." in html
    assert 'href="/seller">ویترینم رو بساز' in html
    assert 'id="homeRotatingMessage"' not in html
    assert 'id="homeMessageAction"' not in html
    assert 'class="market-ticker"' not in html
    assert 'id="marketTicker"' not in html
    assert 'class="market-location-bar"' not in html
    assert 'id="promoBanner"' not in html
    assert 'class="promo-banner-slide"' not in html
    assert 'id="homePromoVisual"' in html
    assert 'data-promo-slide' in html

    template = _read_project_file("templates", "index.html")
    script = _read_project_file("static", "js", "home.js")
    assert 'id="homeRotatingMessage"' not in template
    assert 'id="homeMessageAction"' not in template
    assert "window.setInterval(" in script
    assert "const CYCLE_MS = 5000" in script
    assert 'prefers-reduced-motion: reduce' in script
    assert 'dot.addEventListener("click"' in script


def test_help_and_policy_pages_render_and_link_from_footer(monkeypatch, tmp_path):
    client = _setup(monkeypatch, tmp_path, "help-policy-pages.sqlite3")

    pages = {
        "/help": "پرسش‌های پرتکرار",
        "/guide": "راهنمای استفاده از کی‌داره",
        "/safety": "راهنمای خرید امن",
        "/terms": "قوانین و مقررات استفاده",
        "/privacy": "حریم خصوصی در کی‌داره",
    }
    for path, expected in pages.items():
        response = client.get(path)
        html = response.get_data(as_text=True)
        assert response.status_code == 200, path
        assert expected in html, path
        assert 'class="footer-links"' in html, path
        assert f'href="{path}"' in html, path

    home = client.get("/").get_data(as_text=True)
    for path in pages:
        assert f'href="{path}"' in home


def test_header_navigation_search_link_routes_to_dedicated_search_page(monkeypatch, tmp_path):
    client = _setup(monkeypatch, tmp_path, "dedicated-search.sqlite3")
    home = client.get("/").get_data(as_text=True)
    search = client.get(
        "/search?q=%DA%AF%D9%88%D8%B4%DB%8C&category=digital&city=%D8%AA%D9%87%D8%B1%D8%A7%D9%86"
    ).get_data(as_text=True)

    assert 'class="header-search-link" href="/search"' not in home
    assert '>جست‌وجوی کالا</a>' in home
    assert '<nav class="desktop-nav" aria-label="ناوبری اصلی">' in home
    assert 'id="pageSearchForm"' in search
    assert 'id="pageQuery"' in search and 'value="گوشی"' in search
    assert 'name="category"' in search and "digital" in search
    assert 'id="pageCity"' in search and 'value="تهران"' in search


def test_search_page_prefills_city_from_saved_home_city_and_supports_scope_expansion():
    script = _read_project_file("static", "js", "pages.js")
    template = _read_project_file("templates", "pages", "catalog", "search.html")

    assert 'localStorage.getItem("kidareh.marketCity")' in script
    assert 'params.set("province", cityProvince)' in script
    assert 'params.set("scope", "country")' in script
    assert 'dataset.searchScope = "province"' in script
    assert 'dataset.searchScope = "country"' in script
    assert 'در این شهر نتیجه‌ای پیدا نشد' in script
    assert 'در استان ' in script

    assert "search-expansion" in template
    assert 'id="searchCityCombobox"' in template
    assert 'id="searchCityOptions" role="listbox"' in template
    assert 'id="toggleSearchCityPicker"' in template
    assert 'id="pageNearbySearchButton"' in template
    assert 'if (!paramsAtLoad.has("city"))' in script
    assert 'navigator.geolocation.getCurrentPosition' in script
    assert 'params.radius_km = String(selectedRadius())' in script
    assert 'id="pageNearbyRadius"' in template
    assert 'params.availability = availabilityInput.value' in script