from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[2]

# The generic dividend-yield parser must not also fire for FCF yield.
p = ROOT / "lib/fallback-parse.ts"
s = p.read_text()
old = 'if (!out.some((f) => f.field === "divYield")) addThreshold(out, "divYield",'
new = 'if (!out.some((f) => f.field === "divYield") && !/(?:free cash flow|fcf) yield/.test(q)) addThreshold(out, "divYield",'
if old not in s:
    raise RuntimeError("dividend-yield parser target not found")
s = s.replace(old, new, 1)

# A specifically requested 3Y revenue-growth metric must not also emit the existing TTM revenue-growth filter.
old = 'if (!out.some((f) => f.field === "revGrowth") && !out.some((f) => f.field === "revGrowth3Y")) addThreshold(out, "revGrowth",'
new = 'if (!out.some((f) => f.field === "revGrowth") && !out.some((f) => f.field === "revGrowth3Y") && !new RegExp(FUNDAMENTAL_TERMS[0][1]).test(q)) addThreshold(out, "revGrowth",'
if old not in s:
    raise RuntimeError("revenue-growth parser target not found")
s = s.replace(old, new, 1)
p.write_text(s)

# Tighten the new explicit cases so accidental extra filters fail the gate.
p = ROOT / "eval/cases.json"
data = json.loads(p.read_text())
new_queries = {
    "ROIC above 12%",
    "Operating margin above 15%",
    "FCF margin over 10%",
    "Free cash flow yield above 3%",
    "Debt to equity below 1",
    "Interest coverage above 5",
    "3-year revenue growth above 8%",
    "3-year EPS growth above 10%",
    "EV/EBITDA under 15",
}
for case in data["cases"]:
    if case.get("query") in new_queries:
        case.setdefault("expect", {})["filterCount"] = 1
p.write_text(json.dumps(data, indent=2) + "\n")

# ROIC used to be intentionally unsupported; these production regression cases now protect the supported behavior.
p = ROOT / "eval/release-regressions.json"
data = json.loads(p.read_text())
for case in data["cases"]:
    q = case.get("query")
    if q == "ROIC above 15%":
        case["expect"] = {"filters": [{"field": "roic", "op": ">", "value": 15}], "filterCount": 1, "ranking": "marketCap"}
        case.pop("requireAssumptions", None)
    elif q == "P/E under 20 and ROIC above 15%":
        case["expect"] = {"filters": [{"field": "pe", "op": "<", "value": 20}, {"field": "roic", "op": ">", "value": 15}], "filterCount": 2}
        case.pop("requireAssumptions", None)
    elif q == "Add ROIC above 15%":
        case["expect"] = {"filters": [{"field": "pe", "op": "<", "value": 20}, {"field": "roic", "op": ">", "value": 15}], "filterCount": 2}
        case.pop("requireAssumptions", None)
p.write_text(json.dumps(data, indent=2) + "\n")

print("Long-term parser collisions and regressions updated")
