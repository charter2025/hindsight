"""Rebuild index.html and api/_engine.js from src/. Run from the repo root: python3 scripts/build.py"""
import json, os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = lambda f: os.path.join(root, "src", f)
t = open(src("template.html")).read()
data = open(src("data.json")).read()
news = json.dumps(json.load(open(src("headlines.json"))), separators=(",", ":"))
html = t.replace("/*DATA*/", data).replace("/*NEWS*/", news)
meta = open(os.path.join(root, "scripts", "meta.html")).read()
open(os.path.join(root, "index.html"), "w").write(html.replace("<title>Hindsight Macro</title>", "<title>Hindsight</title>\n" + meta))
js = t.split("<script>")[1].split("</script>")[0]
a, b = js.index("const ASSETS"), js.index("/* ---------- state")
engine = ("// Generated from src/template.html by scripts/build.py. Do not edit by hand.\n"
          "const DATA = " + data + ";\n" + js[a:b] +
          "\nfunction serverNo(){return Math.floor((Date.now()-EPOCH)/864e5)+1;}\n"
          "module.exports={DATA,ASSETS,SEGS,R,growth,buildPuzzle,runPlan,analyze,pctBeat,hashStr,serverNo};\n")
open(os.path.join(root, "api", "_engine.js"), "w").write(engine)
print("built index.html and api/_engine.js")
