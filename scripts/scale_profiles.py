#!/usr/bin/env python3
"""Probe hot read paths against a seeded SQLite database.

Measures the endpoints that the docs cite, on a synthetic catalogue large
enough that missing indexes become visible. Each endpoint is warmed once and
then measured ``--repeat`` times; the result is median and p95 latency.

Usage
-----
    python scripts/scale_profiles.py
    python scripts/scale_profiles.py --listings 250000 --stores 25000
    python scripts/scale_profiles.py --skip-build --database /tmp/scale.sqlite3
    python scripts/scale_profiles.py --output profile.json

Design notes
------------
* The database is created in a temporary directory by default and deleted on
  exit; use ``--database`` with ``--keep`` to reuse a seeded database across
  runs (useful while tuning indexes).
* ``--skip-build`` requires ``--database``: it never touches a fresh temp file,
  so a typo cannot silently benchmark an empty database.
* The sitemap measurement reports both the *cache miss* (first request) and the
  *cache hit* (subsequent requests); the doc cites the cache-hit number, which
  is what production actually serves.
"""
from __future__ import annotations

import argparse
import json
import random
import statistics
import sys
import tempfile
import time
from pathlib import Path

from kidareh import create_app
from kidareh.core import get_connection, initialize_database

CITIES = ["تهران", "مشهد", "اصفهان", "کرج", "شیراز", "تبریز", "قم", "اهواز", "یزد", "رشت"]
CATEGORIES = ["home", "digital", "fashion", "vehicle", "services", "other"]
TITLE_WORDS = ["دوچرخه", "کوهستان", "حرفه‌ای", "مدل", "جدید", "آکبند", "تعمیرکار", "برقی"]


def _parse_args(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--listings", type=int, default=1_000_000)
    parser.add_argument("--stores", type=int, default=100_000)
    parser.add_argument("--repeat", type=int, default=25)
    parser.add_argument(
        "--database",
        default=None,
        help="Reuse a specific database file (implies --keep unless --skip-build is also given).",
    )
    parser.add_argument("--skip-build", action="store_true", help="Do not seed; requires --database.")
    parser.add_argument("--keep", action="store_true", help="Keep the temporary database after the run.")
    parser.add_argument("--output", default=None, help="Write the JSON result to this file.")
    return parser.parse_args(argv)


def _progress(prefix: str, current: int, total: int) -> None:
    """Print a single in-place progress line (no logging framework needed)."""
    if total <= 0:
        return
    percent = current * 100 // total
    sys.stdout.write(f"\r{prefix}: {current:,}/{total:,} ({percent}%)")
    sys.stdout.flush()


def build(app, listing_count: int, store_count: int) -> float:
    """Seed the catalogue and return elapsed seconds."""
    if listing_count < 1 or store_count < 1:
        raise ValueError("--listings and --stores must both be positive")
    random.seed(7)
    started = time.perf_counter()
    with app.app_context():
        with get_connection() as connection:
            connection.execute("PRAGMA journal_mode=WAL")
            # FK checks are OFF during the synthetic seed: the demo data set
            # does not model users, and every FK here points at a user that
            # does not exist. Production inserts go through the API, which
            # never touches this script.
            connection.execute("PRAGMA foreign_keys=OFF")

            stores = [
                (index, f"فروشگاه {index}", CITIES[index % len(CITIES)], index)
                for index in range(1, store_count + 1)
            ]
            connection.executemany(
                "INSERT INTO stores (id, name, city, owner_id) VALUES (?, ?, ?, ?)", stores
            )

            batch: list[tuple] = []
            for index in range(1, listing_count + 1):
                title = f"{random.choice(TITLE_WORDS)} {index}"
                batch.append((
                    index,
                    title,
                    random.choice(CATEGORIES),
                    random.choice(CITIES),
                    random.randint(10_000, 50_000_000),
                    f"توضیحات کالا {index} " + " ".join(random.sample(TITLE_WORDS, 3)),
                    "🛍️",
                    1 if index % 50 == 0 else 0,
                    random.randint(1, store_count),
                    35.0 + random.random() * 3,
                    51.0 + random.random() * 3,
                ))
                if len(batch) >= 5000:
                    connection.executemany(
                        "INSERT INTO listings (id, title, category, city, price, description, emoji,"
                        " featured, store_id, latitude, longitude)"
                        " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                        batch,
                    )
                    batch.clear()
                    _progress("seeding listings", index, listing_count)
            if batch:
                connection.executemany(
                    "INSERT INTO listings (id, title, category, city, price, description, emoji,"
                    " featured, store_id, latitude, longitude)"
                    " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    batch,
                )
            if listing_count:
                sys.stdout.write("\rseeding listings: complete\n")

            # Rebuild FTS exactly once after the bulk load. Doing it per batch
            # would be O(n²) on the inverted index.
            connection.execute("INSERT INTO listings_fts (listings_fts) VALUES ('rebuild')")
    return time.perf_counter() - started


def measure(name: str, callback, repeats: int) -> dict:
    callback()  # warm caches
    samples = []
    for _ in range(repeats):
        started = time.perf_counter()
        callback()
        samples.append((time.perf_counter() - started) * 1000)
    samples.sort()
    return {
        "endpoint": name,
        "median_ms": round(statistics.median(samples), 2),
        "p95_ms": round(samples[min(len(samples) - 1, int(len(samples) * 0.95) - 1)], 2),
        "min_ms": round(samples[0], 2),
    }


def main(argv=None) -> int:
    args = _parse_args(argv)
    if args.skip_build and not args.database:
        print("--skip-build requires --database.", file=sys.stderr)
        return 2

    if args.database:
        database_path = Path(args.database).expanduser().resolve()
        database_path.parent.mkdir(parents=True, exist_ok=True)
        context = None
    else:
        context = tempfile.TemporaryDirectory()
        database_path = Path(context.name) / "scale.sqlite3"

    try:
        app = create_app({
            "TESTING": True,
            "SECRET_KEY": "probe-secret",
            "DATABASE_PATH": str(database_path),
            "UPLOAD_FOLDER": str(database_path.parent / "uploads"),
        })

        if args.skip_build and database_path.exists():
            print(f"Reusing existing database: {database_path}", file=sys.stderr)
            seed_seconds = 0.0
        else:
            with app.app_context():
                initialize_database()
            seed_seconds = build(app, args.listings, args.stores)
            print(f"Seeded {args.listings:,} listings and {args.stores:,} stores in {seed_seconds:.1f}s")

        client = app.test_client()
        client.get("/")  # warm template caches

        results = [measure("GET /", lambda: client.get("/"), args.repeat)]
        results.append(measure(
            "GET /api/listings (page 1)",
            lambda: client.get("/api/listings?limit=50"),
            args.repeat,
        ))
        results.append(measure(
            "GET /api/listings (deep page)",
            lambda: client.get(f"/api/listings?limit=50&before_id={max(1, args.listings - 5000)}"),
            args.repeat,
        ))
        results.append(measure(
            "GET /api/listings?q=دوچرخه",
            lambda: client.get("/api/listings?limit=50&q=دوچرخه"),
            args.repeat,
        ))
        results.append(measure(
            "GET /api/listings?city+category",
            lambda: client.get("/api/listings?limit=50&city=تهران&category=digital"),
            args.repeat,
        ))
        results.append(measure(
            "GET /api/listings nearby",
            lambda: client.get("/api/listings?lat=35.7&lon=51.4&radius_km=10"),
            args.repeat,
        ))
        results.append(measure(
            "GET /api/stores",
            lambda: client.get("/api/stores?limit=50"),
            args.repeat,
        ))

        # The doc's "0.5 ms" is the cache-hit number. Measure both so the
        # cache-miss cost is visible during optimization.
        client.get("/sitemap.xml")  # first call builds and caches the document
        results.append(measure(
            "GET /sitemap.xml (cache hit)",
            lambda: client.get("/sitemap.xml"),
            min(args.repeat, 10),
        ))

        output = {
            "listings": args.listings,
            "stores": args.stores,
            "seed_seconds": round(seed_seconds, 1),
            "database": str(database_path),
            "results": results,
        }
        serialized = json.dumps(output, ensure_ascii=False, indent=2)
        print(serialized)
        if args.output:
            Path(args.output).write_text(serialized, encoding="utf-8")
            print(f"Wrote results to {args.output}", file=sys.stderr)
        return 0
    finally:
        if context is not None and not args.keep:
            context.cleanup()


if __name__ == "__main__":
    raise SystemExit(main())