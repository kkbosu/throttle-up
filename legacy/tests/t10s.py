import json,sys
from playwright.sync_api import sync_playwright
from h3 import *
errs=[];OUT=sys.argv[1]
with sync_playwright() as p:
    b=p.chromium.launch(args=ARGS)
    for m in (6,7):
        pg=page(b,m=m,q=0,errs=errs,W=820,H=560,extra='&manual')
        pg.click("#ov span");pg.evaluate("step(1)");pg.keyboard.press("q");caps=[];log=[];shots=0
        for i in range(400):
            pg.evaluate("step(4,50)")
            st=pg.evaluate("({on:SQ.on,cap:SQ.cap,ph,alt:+alt.toFixed(2),vz:+vz.toFixed(2),n:+N.toFixed(2),bl:+sc.bl.toFixed(2),td:sc.td,cut:sc.cut,fly:+sc.fly.toFixed(1),done:sc.done,x:+sc.x.toFixed(1),prp:+prp.toFixed(2),beta:+beta.toFixed(0),raw:+raw.toFixed(3)})")
            if st['cap'] not in caps:
                caps.append(st['cap']);log.append(st)
                pg.screenshot(path=f"{OUT}/m{m}_{len(caps):02d}.png",timeout=120000)
            if not st['on']:break
        print(m,"caps:",caps)
        for l in log:print("   ",l)
        print("   end:",st)
        if m==7:print("   touchdown speed",pg.evaluate("sc.tdv"))
        pg.context.close()
    print("ERR",json.dumps(errs[:8]))
    b.close()
