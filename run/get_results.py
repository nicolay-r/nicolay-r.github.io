# Source
# https://gist.github.com/nicolay-r/528b4400c58e22abc4e7925d932224f6

import json
import re
from urllib.error import URLError
from urllib.request import Request, urlopen

from bs4 import BeautifulSoup

PARKRUN_URL = "https://www.parkrun.org.uk/parkrunner/9401392/all/"
SRC = "results.html"
TGT = "parkrun-results.jsonl"
TABLE_ID = "results"
USER_AGENT = "Mozilla/5.0 (compatible; get_results/1.0)"


def fetch_html(url):
    request = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(request, timeout=30) as response:
        return response.read().decode("utf-8", errors="replace")


def load_html():
    try:
        html = fetch_html(PARKRUN_URL)
        with open(SRC, "w", encoding="utf-8") as cache:
            cache.write(html)
        print(f"Fetched {PARKRUN_URL} (cached to {SRC})")
        return html
    except (URLError, TimeoutError, OSError) as err:
        print(f"Fetch failed ({err}); using local {SRC}")
        with open(SRC, encoding="utf-8") as cached:
            return cached.read()


def find_results_table(soup):
    tables = soup.find_all("table", attrs={"id": TABLE_ID})
    for table in tables:
        row = table.find("tr")
        if not row:
            continue
        headings = [th.get_text(strip=True) for th in row.find_all("th")]
        if "Run Date" in headings and "Time" in headings:
            return table, headings

    if len(tables) > 2:
        table = tables[2]
    elif tables:
        table = tables[0]
    else:
        raise ValueError(f"No table with id={TABLE_ID!r} found in source HTML")

    headings = [th.get_text(strip=True) for th in table.find("tr").find_all("th")]
    return table, headings


html = load_html()

# Handling
soup = BeautifulSoup(re.sub(r"(\s)+", " ", str(html)), features="html.parser")
table, headings = find_results_table(soup)
results = []
for row in table.find_all("tr")[1:]:
    results.append(dict(zip(headings, (td.get_text() for td in row.find_all("td")))))

# Writing
with open(TGT, "w", encoding="utf-8") as f:
    for result in results:
        json.dump(result, f)
        f.write("\n")

print(f"Wrote {len(results)} rows to {TGT}")
