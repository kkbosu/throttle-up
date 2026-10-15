import json
from playwright.sync_api import sync_playwright
from h3 import *
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(args=ARGS)
    for m in (3,7):
        pg=page(b,m=m,q=0,errs=errs,W=640,H=440,extra='&manual')
        pg.click("#ov span");pg.evaluate("step(1)");pg.keyboard.press("q");caps=[];mx=0
        for i in range(260):
            pg.evaluate("step(4,50)");st=pg.evaluate("({on:SQ.on,cap:SQ.cap,ph,alt:+alt.toFixed(1),n:+N.toFixed(2),view})");mx=max(mx,st['alt'])
            if st['cap'] not in caps:caps.append(st['cap'])
            if not st['on']:break
        print(m,"caps:",caps);print("   end:",st,"max alt",mx)
        pg.context.close()
    pg=page(b,m=0,q=1,errs=errs,W=640,H=440,extra='&r=2d')
    print("2D chips:",pg.evaluate("[...document.querySelectorAll('#mch button')].map(b=>b.textContent+':'+(b.style.display||'show')).join(' ')"))
    print("ERR",json.dumps(errs[:8]))
    b.close()
