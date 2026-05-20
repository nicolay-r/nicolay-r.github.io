#!/usr/bin/env python3
"""Generate per-row share stubs for social-media crawlers (LinkedIn, X/Twitter, ...).

Reads ``index.html``, walks every ``<tbody data-type="..."><tr id="...">`` inside
``#professional-content`` (athletics / news rows are dynamic and skipped), and
emits a static ``share/<id>.html`` page with row-specific Open Graph / Twitter
Card meta tags. Each stub redirects human visitors to the canonical URL while
preserving any extra query parameters (utm_*, ref, ...) appended to the share
link.

Usage:
    python3 tools/build_share_stubs.py [--repo PATH] [--site https://nicolayr.com]

The script depends only on the Python standard library so it runs anywhere.
"""
from __future__ import annotations

import argparse
import html
import json
import os
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from typing import Iterable, List, Optional


SITE = "https://nicolayr.com"
DEFAULT_DESCRIPTION = (
    "From Nicolay Rusnachenko's site: papers, talks, projects and career."
)

# Map row data_type -> Open Graph type and the tab the row lives in.
OG_TYPE_BY_DATA_TYPE = {
    "career": "profile",
    "paper": "article",
    "presentation": "video.other",
    "project": "website",
    "school": "website",
}
TAB_BY_DATA_TYPE = {
    "career": "professional",
    "paper": "professional",
    "presentation": "professional",
    "project": "professional",
    "school": "professional",
}

VOID_ELEMENTS = {
    "area", "base", "br", "col", "embed", "hr", "img", "input",
    "link", "meta", "param", "source", "track", "wbr",
}


# --- minimal DOM ----------------------------------------------------------

class Node:
    __slots__ = ("tag", "attrs", "children", "parent")

    def __init__(self, tag: str = "", attrs=None):
        self.tag = tag
        self.attrs = dict(attrs or [])
        self.children: list = []
        self.parent: Optional["Node"] = None

    def has_class(self, name: str) -> bool:
        return name in (self.attrs.get("class") or "").split()

    def find(self, **kwargs) -> Optional["Node"]:
        for n in self.walk():
            if _matches(n, kwargs):
                return n
        return None

    def find_all(self, **kwargs) -> List["Node"]:
        return [n for n in self.walk() if _matches(n, kwargs)]

    def walk(self) -> Iterable["Node"]:
        for c in self.children:
            if isinstance(c, Node):
                yield c
                yield from c.walk()

    def text(self) -> str:
        parts: list[str] = []
        _collect_text(self, parts)
        return _collapse_ws("".join(parts))


def _matches(node: "Node", filters: dict) -> bool:
    for k, v in filters.items():
        if k == "tag":
            if node.tag != v:
                return False
        elif k == "class_":
            if not node.has_class(v):
                return False
        elif k == "id":
            if node.attrs.get("id") != v:
                return False
        else:
            if node.attrs.get(k) != v:
                return False
    return True


def _collect_text(node, parts: list[str]) -> None:
    if isinstance(node, str):
        parts.append(node)
        return
    if not isinstance(node, Node):
        return
    if node.tag == "br":
        parts.append(" ")
        return
    for c in node.children:
        _collect_text(c, parts)


def _collapse_ws(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


# --- HTML parser ----------------------------------------------------------

class TreeBuilder(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node("document")
        self.stack: list[Node] = [self.root]

    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs)
        node.parent = self.stack[-1]
        self.stack[-1].children.append(node)
        if tag not in VOID_ELEMENTS:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        node = Node(tag, attrs)
        node.parent = self.stack[-1]
        self.stack[-1].children.append(node)

    def handle_endtag(self, tag):
        # Pop until we find a matching open tag; ignore stray end tags.
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                self.stack = self.stack[:i]
                return

    def handle_data(self, data):
        if data:
            self.stack[-1].children.append(data)


def parse_html(path: Path) -> Node:
    builder = TreeBuilder()
    builder.feed(path.read_text(encoding="utf-8"))
    builder.close()
    return builder.root


# --- row extraction -------------------------------------------------------

def absolutize(url: str, site: str) -> str:
    if not url:
        return ""
    if url.startswith(("http://", "https://", "//")):
        if url.startswith("//"):
            return "https:" + url
        return url
    if url.startswith("/"):
        return site.rstrip("/") + url
    return site.rstrip("/") + "/" + url.lstrip("./")


def extract_title(tr: Node) -> str:
    pt = tr.find(tag="papertitle")
    if pt is not None:
        return pt.text()
    jt = tr.find(class_="jobtitle")
    if jt is not None:
        return jt.text()
    # Fall back to the first anchor text inside the card content.
    a = tr.find(tag="a")
    if a is not None:
        text = a.text()
        if text:
            return text
    return ""


def extract_image(tr: Node, site: str) -> str:
    logo_cell = tr.find(id="card-logo")
    img = logo_cell.find(tag="img") if logo_cell else tr.find(tag="img")
    if img is None:
        return f"{site.rstrip('/')}/website/images/photo.png"
    return absolutize(img.attrs.get("src", ""), site)


def _extract_career_description(tr: Node) -> str:
    table = tr.find(class_="career-kv-table")
    if table is None:
        return ""
    parts: list[str] = []
    for row in table.find_all(tag="tr"):
        key_node = row.find(class_="career-kv-key")
        val_node = row.find(class_="career-kv-value")
        key = (key_node.text().rstrip(":") if key_node else "").strip()
        val = (val_node.text() if val_node else "").strip()
        if key and val:
            parts.append(f"{key}: {val}")
        elif val:
            parts.append(val)
    return " ".join(parts)


def _extract_prose_description(tr: Node) -> str:
    card = tr.find(id="card-content")
    if card is None:
        return ""
    # Collect text that appears AFTER the last .auto-card-actions block.
    after_actions = False
    buf: list[str] = []

    def walk(node, after):
        if isinstance(node, str):
            if after[0]:
                buf.append(node)
            return
        if not isinstance(node, Node):
            return
        if node.tag == "div" and node.has_class("auto-card-actions"):
            # Skip the actions block but flip the flag once we exit it.
            after[0] = True
            return
        for c in node.children:
            walk(c, after)

    walk(card, [after_actions])
    return _collapse_ws(" ".join(buf))


def extract_description(tr: Node, data_type: str) -> str:
    if data_type == "career":
        text = _extract_career_description(tr)
    else:
        text = _extract_prose_description(tr)
    text = _collapse_ws(text)
    if not text:
        return DEFAULT_DESCRIPTION
    return text


def truncate(text: str, limit: int = 200) -> str:
    if len(text) <= limit:
        return text
    cut = text[: limit - 1].rsplit(" ", 1)[0]
    return cut + "\u2026"


# --- stub rendering -------------------------------------------------------

STUB_TEMPLATE = """\
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{title} \u2014 Nicolay Rusnachenko</title>
<meta name="description" content="{description}">
<meta name="robots" content="noindex,follow">
<link rel="canonical" href="{canonical_url}">

<meta property="og:type" content="{og_type}">
<meta property="og:site_name" content="Nicolay Rusnachenko">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{description}">
<meta property="og:url" content="{share_url}">
<meta property="og:image" content="{image_url}">
<meta property="og:image:alt" content="{title}">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{title}">
<meta name="twitter:description" content="{description}">
<meta name="twitter:image" content="{image_url}">
<meta name="twitter:site" content="@nicolayr_">
<meta name="twitter:creator" content="@nicolayr_">

<meta http-equiv="refresh" content="0; url={fallback_redirect}">
<script>
(function () {{
  try {{
    var src = new URL(window.location.href);
    var target = new URL('/', src.origin);
    // Preserve every extra query parameter (utm_*, ref, ...).
    src.searchParams.forEach(function (value, key) {{
      target.searchParams.set(key, value);
    }});
    // Force the canonical row identity (overrides any spoofed values).
    target.searchParams.set('tab', {tab_json});
    target.searchParams.set('data_type', {data_type_json});
    target.searchParams.set('id', {id_json});
    window.location.replace(target.href);
  }} catch (err) {{
    window.location.replace({fallback_redirect_json});
  }}
}})();
</script>
<style>
  body {{ font-family: 'Lato', Verdana, Helvetica, sans-serif; max-width: 640px; margin: 4rem auto; padding: 0 1rem; color: #2c3e50; }}
  a {{ color: #1772d0; }}
</style>
</head>
<body>
<noscript>
  <p>Redirecting to <a href="{fallback_redirect}">{title}</a> on nicolayr.com.</p>
  <p>If your browser does not redirect automatically, click the link above.</p>
</noscript>
<p>Redirecting to <a href="{fallback_redirect}">{title}</a>\u2026</p>
</body>
</html>
"""


def render_stub(*, row_id: str, data_type: str, title: str,
                description: str, image_url: str, site: str) -> str:
    tab = TAB_BY_DATA_TYPE.get(data_type, "professional")
    og_type = OG_TYPE_BY_DATA_TYPE.get(data_type, "article")
    canonical_url = (
        f"{site.rstrip('/')}/?tab={tab}&data_type={data_type}&id={row_id}"
    )
    share_url = f"{site.rstrip('/')}/share/{row_id}.html"
    fallback_redirect = (
        f"/?tab={tab}&data_type={data_type}&id={row_id}"
    )
    return STUB_TEMPLATE.format(
        title=html.escape(title, quote=True),
        description=html.escape(truncate(description), quote=True),
        canonical_url=html.escape(canonical_url, quote=True),
        share_url=html.escape(share_url, quote=True),
        image_url=html.escape(image_url, quote=True),
        og_type=og_type,
        tab_json=json.dumps(tab),
        data_type_json=json.dumps(data_type),
        id_json=json.dumps(row_id),
        fallback_redirect=html.escape(fallback_redirect, quote=True),
        fallback_redirect_json=json.dumps(fallback_redirect),
    )


# --- main -----------------------------------------------------------------

def collect_rows(root: Node) -> list[dict]:
    section = root.find(id="professional-content")
    if section is None:
        raise SystemExit("Could not find <div id='professional-content'> in index.html")

    rows = []
    seen_ids: set[str] = set()
    for tbody in section.find_all(tag="tbody"):
        data_type = tbody.attrs.get("data-type")
        if not data_type:
            continue
        tr = tbody.find(tag="tr")
        if tr is None:
            continue
        row_id = tr.attrs.get("id")
        if not row_id:
            continue
        if row_id in seen_ids:
            print(f"warning: duplicate row id '{row_id}', skipping", file=sys.stderr)
            continue
        seen_ids.add(row_id)
        rows.append({"tr": tr, "data_type": data_type, "row_id": row_id})
    return rows


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--repo", type=Path, default=Path(__file__).resolve().parent.parent,
                        help="Path to repository root (default: parent of this file)")
    parser.add_argument("--site", default=SITE, help="Canonical site origin (default: %(default)s)")
    parser.add_argument("--dry-run", action="store_true", help="Don't write files; just report")
    args = parser.parse_args(argv)

    repo = args.repo.resolve()
    index = repo / "index.html"
    out_dir = repo / "share"
    out_dir.mkdir(exist_ok=True)

    root = parse_html(index)
    rows = collect_rows(root)

    written = 0
    skipped: list[str] = []
    for row in rows:
        tr = row["tr"]
        data_type = row["data_type"]
        row_id = row["row_id"]
        title = extract_title(tr).strip()
        if not title:
            skipped.append(f"{row_id} (no title)")
            continue
        image_url = extract_image(tr, args.site)
        description = extract_description(tr, data_type)

        html_out = render_stub(
            row_id=row_id,
            data_type=data_type,
            title=title,
            description=description,
            image_url=image_url,
            site=args.site,
        )
        out_path = out_dir / f"{row_id}.html"
        if not args.dry_run:
            out_path.write_text(html_out, encoding="utf-8")
        written += 1

    print(f"share stubs: wrote {written} file(s) to {out_dir.relative_to(repo)}")
    if skipped:
        print(f"share stubs: skipped {len(skipped)}: {', '.join(skipped)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
