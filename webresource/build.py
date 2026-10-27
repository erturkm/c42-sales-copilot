"""Builds c42_seeddata.html by embedding the seed definitions (../seed/seed_data.py) into template.html."""
import json, re, sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "seed"))
import seed_data as d
prods = json.load(open(os.path.join(os.path.dirname(__file__), "products.json")))
def clean(o):
    return json.loads(re.sub(r"\s*\(due Jan 10\)", "", json.dumps(o)))
data = clean(dict(TAG=d.TAG, ACCOUNTS=d.ACCOUNTS, SUBS=d.SUBS, OPEN=d.OPEN, WON=d.WON, CASE_POOL=d.CASE_POOL, CASES=d.CASES, FAM=d.FAM, ST=d.ST, PRODUCTS=prods))
t = open(os.path.join(os.path.dirname(__file__), "template.html")).read()
open(os.path.join(os.path.dirname(__file__), "c42_seeddata.html"), "w").write(t.replace("/*__DATA__*/null", json.dumps(data, separators=(",", ":"))))
print("built", len(t))
