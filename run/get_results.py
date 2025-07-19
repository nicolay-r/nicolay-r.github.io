# Source
# https://gist.github.com/nicolay-r/528b4400c58e22abc4e7925d932224f6

import re
from bs4 import BeautifulSoup
import json

SRC = "results.html"
TGT = "parkrun-results.jsonl"
table_id = 'results'

with open(SRC, "r") as r:
    html = r.read()

# Handling
soup = BeautifulSoup(re.sub(r'(\s)+', ' ', str(html)), features="html.parser")
table = soup.find_all('table', attrs = { 'id': table_id })[2]
headings = [th.get_text() for th in table.find('tr').find_all('th')]
results = []
for row in table.find_all('tr')[1:]:
    results.append(dict(zip(headings, (td.get_text() for td in row.find_all('td')))))

# Writing
with open(TGT, "w") as f:
    for r in results:
        json.dump(r, f)
        f.write("\n")