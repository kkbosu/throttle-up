import json,time
from playwright.sync_api import sync_playwright
from h3 import *
errs=[]
FF="(s)=>{for(let t=0;t<s;t+=.05){seqTick(.05);keys(.05);update(.05)}}"
with sync_playwright() as p:
    b=p.chromium.launch(args=ARGS)
    pg=page(b,m=0,q=1,errs=errs,W=700,H=480,extra='&manual')
    pg.click("#ov span");pg.evaluate(FF,8);pg.evaluate("step(2)")
    # sequence: drive its clock by stepping frames with big dt (seqTick uses real-time dr)
    pg.keyboard.press("q");views=set()
    for i in range(60):
        pg.evaluate("step(4,50)");st=pg.evaluate("({on:SQ.on,i:SQ.i,cap:SQ.cap,view,ph})");views.add(st['view'])
        if not st['on']:break
    print("sequence ended:",st,"views used:",sorted(views))
    pg.screenshot(path="f_seqend.png")
    # machine switch mid-sequence, all scenes, exposed, Q changes
    pg.evaluate(FF,6);pg.keyboard.press("q");pg.evaluate("step(10,50)")
    pg.evaluate("act('mach')");pg.evaluate("step(3)");print("after switch",pg.evaluate("({on:SQ.on,m:M.btn,ph})"))
    for m in range(8):
        for sc in range(3):
            for ex in (0,1):
                pg.evaluate(f"scene={sc};exposed={ex};lab();step(1)")
        pg.evaluate("act('mach');step(2)")
    for q in (0,2,1):pg.evaluate(f"Q={q};step(2)")
    print("Q cycle ok, SN:",pg.evaluate("SN.join(',')"),"| casing label on shuttle:",pg.evaluate("mi=2;M=MC[2];setMachine(2);document.querySelector('[data-k=exp]').textContent"))
    # recording composite includes the WebGL frame
    pg.evaluate("setMachine(0)");pg.evaluate(FF,8);pg.evaluate("raw=1;applyRaw()");pg.evaluate(FF,5)
    pg.evaluate("startRec()");pg.evaluate("step(20,33)")
    px=pg.evaluate("(()=>{const d=rc.getImageData(RC.width*.55|0,RC.height*.42|0,40,40).data;let s=0;for(let i=0;i<d.length;i+=4)s+=d[i]+d[i+1]+d[i+2];return s/(d.length/4)/3})()")
    pg.evaluate("stopRec()");pg.wait_for_function("getComputedStyle(document.getElementById('clip')).display!='none'",timeout=30000)
    print("rec composite mean brightness at plume:",round(px,1),"| clip bytes:",pg.evaluate("clipFile.size"),pg.evaluate("clipFile.type"))
    print("ERR",json.dumps(errs[:10],indent=0))
    b.close()
