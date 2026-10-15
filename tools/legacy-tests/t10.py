import sys,json
from playwright.sync_api import sync_playwright
from h3 import *
M=int(sys.argv[1]);OUT=sys.argv[2]
errs=[]
FF="(s)=>{for(let t=0;t<s;t+=.05){seqTick(.05);keys(.05);update(.05)}}"
with sync_playwright() as p:
    b=p.chromium.launch(args=ARGS)
    pg=page(b,m=M,q=2,errs=errs,W=820,H=560,extra='&manual')
    def shot(n,fr=3,snap=False):
        if snap:pg.evaluate("step(1);G3.snap()")
        pg.evaluate(f"step({fr})");pg.screenshot(path=f"{OUT}/{n}.png",timeout=120000)
    shot("00_cover",2)
    pg.click("#ov span");pg.evaluate(FF,2.5);shot("01_start")
    if M==6:
        pg.evaluate(FF,4);shot("02_idle");print("idle",pg.evaluate("[prp,beta,N,M.gv()]"))
        pg.evaluate("raw=1;applyRaw()");pg.evaluate(FF,6);shot("03_max");print("max",pg.evaluate("[prp,beta,N,M.gv(),tpT()]"))
    else:
        print("s0",pg.evaluate("({alt,vz,N,ph,hov:skyHov()})"))
        pg.evaluate("raw=skyHov()+.02;applyRaw()");pg.evaluate(FF,3);shot("02_hover");print("hov",pg.evaluate("({alt,vz,N,T:sc.T})"))
        pg.evaluate("raw2=1");pg.evaluate("raw=skyHov();applyRaw()");pg.evaluate(FF,4);shot("03_lower");print("low",pg.evaluate("({alt,vz,bl:sc.bl,act:sc.act,raw})"))
    pg.evaluate("view=1;lab()");shot("05_close",3,True)
    pg.evaluate("view=2;lab()");shot("06_rear",3,True)
    pg.evaluate("view=1;exposed=1;lab()");shot("07_cut_close",3,True)
    pg.evaluate("view=0;lab()");shot("08_cut_side",3,True)
    pg.evaluate("exposed=0;lens=1;lab()");shot("09_schlieren")
    pg.evaluate("lens=2;lab()");shot("10_thermal")
    pg.evaluate("lens=0;scene=1;lab()");shot("11_scene1")
    pg.evaluate("scene=2;lab()");shot("12_scene2")
    print("gauges",pg.evaluate("M.gv().map(v=>+v.toFixed(2))"),pg.evaluate("document.querySelector('[data-k=scn]').textContent"))
    print("ERR",json.dumps(errs[:10],indent=0))
    b.close()
