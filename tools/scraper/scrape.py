#!/usr/bin/env python3
"""
Cyprus Lifestyle — generic, profile-driven scraper (Scrapling).
==============================================================================
One engine, many sites. Each target site is a small YAML **profile** describing
where its pages are and (optionally) how to read a field. Where a site is tidy,
the profile's selectors + schema.org JSON-LD do the work; where it isn't, an
optional AI pass fills the gaps. Extracted records are mapped to one of four
destinations and written as DRAFTS (with provenance) into your Supabase:

    target: directory     → directory_listings                (businesses)
    target: developments  → directory_listings (type=development, price/status…)
    target: events        → events                            (the Agenda)
    target: news          → scraped_articles                  (the AI newsroom queue)

Nothing is published automatically; a field the page doesn't show is left null.

USAGE
  pip install -r requirements.txt
  scrapling install                    # only if a profile uses fetcher: browser
  cp .env.example .env                  # SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
  python scrape.py --site cyprusatlas --query restaurants --dry-run
  python scrape.py --site cyprusatlas --query restaurants,hotels --limit 200
  python scrape.py --site my-developer --limit 50
  python scrape.py --list                          # show available profiles
==============================================================================
"""
from __future__ import annotations
import argparse
import json
import os
import re
import sys
import time
import unicodedata
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests  # our own Supabase / Anthropic APIs only

try:
    import yaml
except Exception:
    sys.exit('Missing dependency. Run:  pip install -r requirements.txt  (needs pyyaml)')
try:
    from scrapling.fetchers import Fetcher, StealthyFetcher
except Exception as e:  # pragma: no cover
    sys.exit('Scrapling not installed. Run:  pip install "scrapling[fetchers]"\n(%s)' % e)

PROFILES_DIR = Path(__file__).parent / "profiles"
DISTRICTS = {"nicosia": "nicosia", "lefkosia": "nicosia", "λευκωσ": "nicosia", "limassol": "limassol",
             "lemesos": "limassol", "λεμεσ": "limassol", "larnaca": "larnaca", "larnaka": "larnaca",
             "λαρνακ": "larnaca", "paphos": "paphos", "pafos": "paphos", "πάφο": "paphos", "παφο": "paphos",
             "famagusta": "famagusta", "ayia napa": "famagusta", "agia napa": "famagusta", "protaras": "famagusta",
             "paralimni": "famagusta"}
TYPE_MAP = [(r"restaurant|tavern|taverna|caf|bar|bistro|grill|dining", "restaurant", "dining"),
            (r"hotel|resort|apartment|guest ?house|b&b|accommodation", "hotel", "hospitality"),
            (r"winery|vineyard|wine", "winery", "food-wine")]
GROUP_MAP = [(r"lawyer|legal|advocate|solicitor|law firm", "professional"),
             (r"account|audit|tax|book ?keep", "professional"), (r"bank|insurance|financ|invest", "professional"),
             (r"real ?estate|property|developer|estate agent", "realestate"),
             (r"doctor|clinic|dental|pharmac|medical|health|physio|hospital", "health"),
             (r"beauty|salon|spa|hair|nail|cosmet", "health"),
             (r"construction|builder|contractor|architect|engineer|renovation", "home-services"),
             (r"clean|mover|removal|plumb|electric|handyman|maintenance|garden", "home-services"),
             (r"car|auto|rental|garage|transport|taxi|logistic", "mobility"),
             (r"shop|store|retail|boutique|market|e-?shop", "retail"),
             (r"school|academy|educat|tuition|nursery|training", "community")]


# ── utilities ────────────────────────────────────────────────────────────────
def slugify(s: str) -> str:
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode("ascii")
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", s.lower())).strip("-")[:80]


def map_type(cats: str) -> tuple[str, str | None]:
    low = (cats or "").lower()
    for pat, typ, grp in TYPE_MAP:
        if re.search(pat, low):
            return typ, grp
    for pat, grp in GROUP_MAP:
        if re.search(pat, low):
            return "vendor", grp
    return "vendor", None


def map_district(text: str) -> str | None:
    low = (text or "").lower()
    for key, canon in DISTRICTS.items():
        if key in low:
            return canon
    return None


def coords_from_maps(src: str) -> tuple[float | None, float | None]:
    if not src:
        return None, None
    m = re.search(r"!3d(-?\d+\.\d+)!.*?!2d(-?\d+\.\d+)", src)
    if m:
        return float(m.group(1)), float(m.group(2))
    m = re.search(r"!2d(-?\d+\.\d+)!3d(-?\d+\.\d+)", src)
    if m:
        return float(m.group(2)), float(m.group(1))
    m = re.search(r"[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)", src) or re.search(r"@(-?\d+\.\d+),(-?\d+\.\d+)", src)
    if m:
        return float(m.group(1)), float(m.group(2))
    return None, None


def to_iso_date(s: str) -> str | None:
    """Best-effort: accept an ISO-ish date/datetime, reject junk/past."""
    if not s:
        return None
    m = re.search(r"\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2})?", str(s))
    if not m:
        return None
    iso = m.group(0).replace(" ", "T")
    try:
        y = int(iso[:4])
        if y < 2000 or y > 2100:
            return None
    except ValueError:
        return None
    return iso if "T" in iso else iso + "T00:00:00"


# ── fetch (Scrapling) ────────────────────────────────────────────────────────
def fetch(url: str, profile: dict):
    if profile.get("fetcher") == "browser":
        return StealthyFetcher.fetch(url, headless=True, timeout=45000)
    return Fetcher.get(url, stealthy_headers=True, timeout=30)


def sel_one(page, selector: str | None) -> str | None:
    if not selector:
        return None
    try:
        v = page.css(selector).get()
        return v.strip() if v and v.strip() else None
    except Exception:
        return None


def sel_all(page, selector: str | None) -> list[str]:
    if not selector:
        return []
    try:
        return [x.strip() for x in page.css(selector).getall() if x and x.strip()]
    except Exception:
        return []


# ── JSON-LD (schema.org) — the most portable structured source ───────────────
def jsonld_objects(page) -> list[dict]:
    out: list[dict] = []
    for block in sel_all(page, 'script[type="application/ld+json"]::text'):
        try:
            data = json.loads(block)
        except Exception:
            continue
        items = data if isinstance(data, list) else [data]
        for it in items:
            if isinstance(it, dict):
                out.append(it)
                if isinstance(it.get("@graph"), list):
                    out.extend([g for g in it["@graph"] if isinstance(g, dict)])
    return out


def from_jsonld(objs: list[dict], want_types: tuple[str, ...]) -> dict:
    def typ(o):
        t = o.get("@type", "")
        return " ".join(t) if isinstance(t, list) else str(t)
    for o in objs:
        if any(w.lower() in typ(o).lower() for w in want_types):
            addr = o.get("address")
            if isinstance(addr, dict):
                addr = ", ".join(str(addr.get(k, "")) for k in ("streetAddress", "postalCode", "addressLocality") if addr.get(k))
            geo = o.get("geo") if isinstance(o.get("geo"), dict) else {}
            return {
                "name": o.get("name"), "phone": o.get("telephone"), "website": o.get("url"),
                "address": addr if isinstance(addr, str) else None,
                "summary": (o.get("description") or None),
                "lat": _f(geo.get("latitude")), "lng": _f(geo.get("longitude")),
                "starts_at": to_iso_date(o.get("startDate", "")), "ends_at": to_iso_date(o.get("endDate", "")),
                "price": _price(o),
            }
    return {}


def _f(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _price(o: dict):
    offers = o.get("offers")
    if isinstance(offers, dict):
        p = offers.get("price") or offers.get("lowPrice")
        return str(p) if p else None
    return None


# ── AI fallback (optional) ───────────────────────────────────────────────────
def ai_fill(name: str, body: str, target: str) -> dict:
    key = os.environ.get("CLAUDE_API_KEY")
    if not key or len(body) < 80:
        return {}
    if target == "events":
        ask = ('Extract ONE event if the text describes a concrete dated event: '
               '{"name":str,"starts_at":ISO8601|null,"ends_at":ISO8601|null,"venue":str|null,'
               '"district":str|null,"price":str|null,"summary":str|null}. Never invent a date.')
    elif target == "news":
        ask = '{"title":str,"summary":str|null}. A factual title + one-sentence summary from the article.'
    else:  # directory / developments
        ask = ('{"address":str|null,"district":str|null,"summary":str|null,'
               '"price_from":int|null,"price_to":int|null,"bedrooms":str|null,'
               '"dev_status":"planning|under-construction|ready|sold-out"|null,"completion":str|null}. '
               'Only facts present; EUR integers for prices; never invent.')
    try:
        r = requests.post("https://api.anthropic.com/v1/messages",
                          headers={"content-type": "application/json", "anthropic-version": "2023-06-01", "x-api-key": key},
                          json={"model": os.environ.get("SONNET_MODEL", "claude-haiku-4-5-20251001"), "max_tokens": 600,
                                "system": "Extract ONLY facts present in the text; return ONLY the JSON. " + ask,
                                "messages": [{"role": "user", "content": f"SUBJECT: {name}\n\nTEXT:\n{body[:8000]}"}]},
                          timeout=45)
        txt = "".join(b.get("text", "") for b in r.json().get("content", []) if b.get("type") == "text")
        return json.loads(re.sub(r"^```json\s*|\s*```$", "", txt.strip()))
    except Exception:
        return {}


# ── extraction ───────────────────────────────────────────────────────────────
def external_website(page, excludes: list[str]) -> str | None:
    ex = [e.lower() for e in excludes] + ["google.", "facebook.", "instagram.", "youtube.", "twitter.", "wa.me", "t.me"]
    try:
        for href in page.css('a[href^="http"]::attr(href)').getall():
            host = urlparse(href).netloc.lower()
            if host and not any(e in host for e in ex):
                return href.strip()
    except Exception:
        pass
    return None


def extract(page, url: str, profile: dict) -> dict | None:
    ex = profile.get("extract", {}) or {}
    target = profile.get("target", "directory")
    body = " ".join(sel_all(page, "body *::text"))[:8000]

    rec: dict = {"source_url": url}
    rec["name"] = sel_one(page, ex.get("name")) or sel_one(page, "h1::text")
    # phone via selector or tel: link
    rec["phone"] = None
    for p in (sel_all(page, ex.get("phone")) or sel_all(page, 'a[href^="tel:"]::attr(href)')):
        rec["phone"] = p.replace("tel:", "").strip()
        break
    rec["website"] = sel_one(page, ex.get("website")) or external_website(page, ex.get("website_exclude", []))
    rec["categories"] = list(dict.fromkeys(sel_all(page, ex.get("categories")) or sel_all(page, 'a[href*="/category/"]::text')))[:8]
    lat, lng = coords_from_maps(sel_one(page, ex.get("maps_iframe")) or sel_one(page, 'iframe[src*="google.com/maps"]::attr(src)') or "")
    rec["lat"], rec["lng"] = lat, lng
    rec["address"] = sel_one(page, ex.get("address"))
    rec["summary"] = sel_one(page, ex.get("summary")) or sel_one(page, 'meta[name="description"]::attr(content)')
    rec["district"] = map_district(rec.get("address") or "") or map_district(body) or map_district(rec.get("name") or "")
    rec["starts_at"] = to_iso_date(sel_one(page, ex.get("starts_at")) or "")
    rec["price"] = sel_one(page, ex.get("price"))
    rec["body"] = body

    # schema.org fills gaps (portable across sites)
    want = ("Event",) if target == "events" else ("Article", "NewsArticle") if target == "news" else ("LocalBusiness", "Organization", "Restaurant", "Hotel", "Store", "Place")
    for k, v in from_jsonld(jsonld_objects(page), want).items():
        if v and not rec.get(k):
            rec[k] = v

    # AI fills what's still missing
    if profile.get("ai_fallback"):
        need = (target == "events" and not rec.get("starts_at")) or (not rec.get("summary")) or \
               (target == "developments" and not rec.get("price_from")) or (not rec.get("address") and target in ("directory", "developments"))
        if need:
            for k, v in ai_fill(rec.get("name") or "", body, target).items():
                if v and not rec.get(k):
                    rec[k] = v
                elif v and k in ("price_from", "price_to", "bedrooms", "dev_status", "completion"):
                    rec[k] = v
            if not rec.get("district"):
                rec["district"] = map_district(rec.get("district") or "")

    if not rec.get("name") or len(str(rec["name"])) < 2:
        return None
    return rec


# ── map a generic record → a destination row ─────────────────────────────────
def now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def map_row(rec: dict, profile: dict) -> tuple[str, dict, str]:
    target = profile.get("target", "directory")
    name = str(rec["name"]).strip()
    src = rec["source_url"]
    slug = slugify(f"{name}-{urlparse(src).path.rsplit('/', 1)[-1]}") or slugify(name)

    if target == "news":
        row = {"original_title": name, "original_url": src,
               "original_content": (rec.get("body") or rec.get("summary") or "")[:20000],
               "status": "scraped", "category": (rec.get("categories") or [None])[0],
               "county": rec.get("district")}
        return "scraped_articles", row, "original_url"

    if target == "events":
        row = {"slug": slug, "ingest_key": src, "source": profile["name"], "source_url": src,
               "district": rec.get("district"), "venue": rec.get("venue") or rec.get("address"),
               "starts_at": rec.get("starts_at"), "ends_at": rec.get("ends_at"),
               "price": rec.get("price"), "url": rec.get("website"), "status": "draft"}
        for loc in ("en", "el", "ro", "ar", "de", "pl", "ru"):
            row[f"title_{loc}"] = name
        row["summary_en"] = rec.get("summary")
        return "events", row, "ingest_key"

    # directory / developments
    typ, group = map_type(", ".join(rec.get("categories") or []))
    row = {"slug": slug, "type": "development" if target == "developments" else typ,
           "category_group": "realestate" if target == "developments" else group,
           "subtype": slugify(rec["categories"][0]) if rec.get("categories") else None,
           "district": rec.get("district"), "address": rec.get("address"),
           "lat": rec.get("lat"), "lng": rec.get("lng"), "url": rec.get("website"),
           "phone": rec.get("phone"), "tags": rec.get("categories") or [],
           "source_url": src, "fetched_at": now_iso(), "status": "draft",
           "summary_en": rec.get("summary")}
    if target == "developments":
        row.update({"price_from": rec.get("price_from"), "price_to": rec.get("price_to"),
                    "price_currency": "EUR", "dev_status": rec.get("dev_status"),
                    "bedrooms": rec.get("bedrooms"), "completion": rec.get("completion"),
                    "developer_slug": profile.get("developer_slug")})
    for loc in ("en", "el", "ro", "ar", "de", "pl", "ru"):
        row[f"name_{loc}"] = name
    return "directory_listings", row, "slug"


# ── discovery ────────────────────────────────────────────────────────────────
def discover(profile: dict, queries: list[str], delay: float) -> list[str]:
    base = profile["base_url"].rstrip("/")
    disc = profile.get("discovery", {}) or {}
    urls: list[str] = []

    for seed in disc.get("seeds", []) or []:
        urls.append(urljoin(base + "/", seed))

    sm = disc.get("sitemap")
    if sm:
        try:
            page = fetch(urljoin(base + "/", sm), profile)
            locs = re.findall(r"<loc>\s*([^<]+?)\s*</loc>", getattr(page, "html_content", "") or str(page))
            pat = disc.get("detail_url_pattern")
            urls += [u for u in locs if (not pat or re.search(pat, u))]
        except Exception as e:
            print(f"  ! sitemap: {e}", file=sys.stderr)

    for listing in disc.get("listings", []) or []:
        qs = queries or disc.get("queries", [""])
        for q in qs:
            url_tpl = listing["url"].replace("{q}", q)
            for pg in range(1, int(listing.get("max_pages", 3)) + 1):
                page_url = urljoin(base + "/", url_tpl.lstrip("/"))
                if pg > 1:
                    page_url += listing.get("page_param", "?page={n}").replace("{n}", str(pg))
                try:
                    page = fetch(page_url, profile)
                    found = [urljoin(base + "/", h) for h in sel_all(page, listing["detail_link_selector"])]
                except Exception as e:
                    print(f"  ! {page_url}: {e}", file=sys.stderr)
                    break
                found = list(dict.fromkeys(found))
                if not found:
                    break
                urls += found
                print(f"  {listing['url']} q='{q}' p{pg}: {len(found)}")
                time.sleep(delay)
    return list(dict.fromkeys(urls))


# ── state ────────────────────────────────────────────────────────────────────
def state_path(name: str) -> Path:
    return Path(os.environ.get("STATE_DIR", ".")) / f".state_{name}.json"


def load_done(name: str) -> set[str]:
    try:
        return set(json.loads(state_path(name).read_text()).get("done", []))
    except Exception:
        return set()


def save_done(name: str, done: set[str]) -> None:
    try:
        state_path(name).write_text(json.dumps({"done": sorted(done)}))
    except Exception:
        pass


# ── upsert ───────────────────────────────────────────────────────────────────
def upsert(table: str, conflict: str, rows: list[dict], supabase_url: str, key: str) -> tuple[int, int]:
    if not rows:
        return 0, 0
    endpoint = f"{supabase_url.rstrip('/')}/rest/v1/{table}?on_conflict={conflict}"
    ok = err = 0
    for i in range(0, len(rows), 50):
        batch = rows[i:i + 50]
        try:
            r = requests.post(endpoint, headers={"apikey": key, "authorization": f"Bearer {key}",
                              "content-type": "application/json", "prefer": "resolution=ignore-duplicates,return=minimal"},
                              json=batch, timeout=60)
            if r.status_code < 300:
                ok += len(batch)
            else:
                err += len(batch)
                print(f"  ! supabase {r.status_code}: {r.text[:200]}", file=sys.stderr)
        except Exception as e:
            err += len(batch)
            print(f"  ! upsert: {e}", file=sys.stderr)
    return ok, err


# ── main ─────────────────────────────────────────────────────────────────────
def list_profiles() -> list[Path]:
    return sorted(p for p in PROFILES_DIR.glob("*.yaml") if not p.name.startswith("_"))


def main() -> None:
    ap = argparse.ArgumentParser(description="Generic profile-driven scraper → Cyprus Lifestyle (drafts).")
    ap.add_argument("--site", help="profile name (file in profiles/, without .yaml)")
    ap.add_argument("--query", default="", help="comma-separated values for a listing {q} placeholder")
    ap.add_argument("--url", default="", help="scrape a single detail URL with this profile")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--delay", type=float, default=None)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--list", action="store_true", help="list available profiles and exit")
    args = ap.parse_args()

    if args.list or not args.site:
        print("Profiles:", ", ".join(p.stem for p in list_profiles()) or "(none)")
        if not args.site:
            return
    pf = PROFILES_DIR / f"{args.site}.yaml"
    if not pf.exists():
        sys.exit(f"No profile {pf}")
    profile = yaml.safe_load(pf.read_text())
    profile.setdefault("name", args.site)
    delay = args.delay if args.delay is not None else float(profile.get("delay", 2.0))

    supabase_url = os.environ.get("SUPABASE_URL", "").strip()
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if not args.dry_run and (not supabase_url or not key):
        sys.exit("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or --dry-run).")

    done = load_done(profile["name"])
    queries = [q.strip() for q in args.query.split(",") if q.strip()]
    detail_urls = [args.url] if args.url else discover(profile, queries, delay)
    todo = [u for u in dict.fromkeys(detail_urls) if u not in done]
    if args.limit:
        todo = todo[:args.limit]
    print(f"{profile['name']} → {profile.get('target', 'directory')}: {len(todo)} new pages "
          f"(skip {len(detail_urls) - len(todo)}).")

    rows: list[dict] = []
    table = conflict = None
    for i, url in enumerate(todo, 1):
        try:
            page = fetch(url, profile)
            rec = extract(page, url, profile)
        except Exception as e:
            print(f"  ! {url}: {e}", file=sys.stderr)
            rec = None
        if rec:
            table, row, conflict = map_row(rec, profile)
            rows.append(row)
            print(f"  [{i}/{len(todo)}] {rec['name']}")
        done.add(url)
        if i % 20 == 0:
            save_done(profile["name"], done)
        time.sleep(delay)
    save_done(profile["name"], done)

    if args.dry_run:
        print(json.dumps(rows, ensure_ascii=False, indent=2))
        print(f"\n[dry-run] {len(rows)} rows for '{table}'; nothing written.", file=sys.stderr)
        return
    if rows and table:
        ok, err = upsert(table, conflict, rows, supabase_url, key)
        print(f"\nDone. {ok} rows upserted to {table} as drafts, {err} failed. Review in Admin.")
    else:
        print("\nNothing to write.")


if __name__ == "__main__":
    main()
