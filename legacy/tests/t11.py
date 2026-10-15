import json
from playwright.sync_api import sync_playwright
from h3 import *
errs=[]
FF="(s)=>{for(let t=0;t<s;t+=.05){seqTick(.05);keys(.05);update(.05)}}"
with sync_playwright() as p:
    b=p.chromium.launch(args=ARGS)
    pg=page(b,m=3,q=2,errs=errs,W=820,H=560,extra='&manual')
    pg.click("#ov span");pg.evaluate(FF,4);pg.evaluate("raw=1;applyRaw()");pg.evaluate(FF,4)
    pg.evaluate("act('view');act('view');act('view')");print("view",pg.evaluate("[view,document.querySelector('[data-k=view]').textContent]"))
    pg.evaluate("step(1);G3.snap();step(3)");pg.screenshot(path="h_earth400.png",timeout=120000)
    pg.evaluate("orb.r=RE+722e3;step(3)");pg.screenshot(path="h_earth722.png",timeout=120000)
    pg.evaluate("orb.r=RE+3000e3;step(3)");pg.screenshot(path="h_earth3000.png",timeout=120000)
    pg.evaluate("scene=0;act('view')");print("wrap",pg.evaluate("view"))
    pg.evaluate("view=3;setMachine(0)");print("after switch to F-type",pg.evaluate("[view,document.querySelector('[data-k=view]').textContent]"))
    pg.evaluate("act('view');act('view');act('view')");print("F-type cycles",pg.evaluate("view"))
    print("ERR",json.dumps(errs[:8]))
    b.close()
