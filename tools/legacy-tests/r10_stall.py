import sys
import time
from playwright.sync_api import sync_playwright
from h3 import URL
# Compressor-stall regression in the 2D renderer. Counts what the page does without replacing its functions
# (modules can't be patched from outside): stalls = sT rising from 0, bangs = surge pulses (the only
# navigator.vibrate(40)), beeps = the warning oscillator (the only one set to 1100 Hz).
COUNT="""(()=>{window.__st=0;window.__b=0;window.__p=0;window.__maxL=0;
  const v=navigator.vibrate?navigator.vibrate.bind(navigator):null;navigator.vibrate=t=>{if(t===40)window.__b++;return v?v(t):false};
  const co=AudioContext.prototype.createOscillator;AudioContext.prototype.createOscillator=function(){const o=co.call(this),d=Object.getOwnPropertyDescriptor(AudioParam.prototype,'value');
    Object.defineProperty(o.frequency,'value',{get(){return d.get.call(this)},set(x){if(x===1100)window.__p++;d.set.call(this,x)}});return o};
})()"""
POLL="""window.__st=0;window.__b=0;window.__p=0;window.__maxL=0;let ps=sT;
  setInterval(()=>{if(ps<=0&&sT>0)__st++;ps=sT;__maxL=Math.max(__maxL,Lrate)},4)"""
ST="({ph,sT:+sT.toFixed(2),N:+N.toFixed(2),E:Math.round(E),F:+F.toFixed(1),A:+A.toFixed(2),ign:+ign.toFixed(2),stl:+stl.toFixed(2),faults,st:window.__st,bang:window.__b,beep:window.__p,maxL:+window.__maxL.toFixed(2)})"
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required"])
    ctx=b.new_context(viewport={"width":905,"height":655})
    ctx.add_init_script(COUNT)
    pg=ctx.new_page()
    pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.on("console",lambda m:errs.append(m.text) if m.type=="error" else None)
    pg.goto(URL+"?r=2d&q=2&m="+sys.argv[1])
    pg.click("#ov span");pg.wait_for_timeout(6500)
    pg.evaluate(POLL)
    tr=pg.evaluate("(()=>{const r=trk.getBoundingClientRect();return {x:r.left+r.width/2,top:r.top,bottom:r.bottom}})()")
    x,top,bot=tr["x"],tr["top"],tr["bottom"]
    def slam(force=True):
        if force: pg.evaluate("window._r=Math.random;Math.random=()=>0.0001")
        pg.mouse.move(x,bot-2);pg.mouse.down();pg.mouse.move(x,top+2)
        pg.wait_for_timeout(250)
        if force: pg.evaluate("Math.random=window._r")
    def release(): pg.mouse.up()
    def idle(sec=6):
        pg.evaluate("raw=0;applyRaw()");pg.wait_for_timeout(int(sec*1000))
    # 1) slow, deliberate ramp to MIL must NOT stall (even with a forced-yes roll)
    pg.evaluate("window._r=Math.random;Math.random=()=>0.0001")
    pg.mouse.move(x,bot-2);pg.mouse.down()
    for i in range(1,31):
        pg.mouse.move(x,bot-(bot-top)*0.72*i/30);pg.wait_for_timeout(40)
    pg.mouse.up();pg.evaluate("Math.random=window._r");pg.wait_for_timeout(500)
    print("slow ramp     ",pg.evaluate(ST))
    idle(7)
    # 2) forced slam from idle: stall
    slam();release()
    pg.wait_for_timeout(150);pg.screenshot(path="d7/s0_first_surge.png")
    print("slam +0.4s    ",pg.evaluate(ST))
    pg.wait_for_timeout(700);pg.screenshot(path="d7/s1_stalling.png")
    print("slam +1.1s    ",pg.evaluate(ST))
    pg.wait_for_timeout(2600)
    print("slam +3.7s    ",pg.evaluate(ST),pg.evaluate("document.getElementById('hint').textContent"))
    pg.wait_for_timeout(3000);pg.screenshot(path="d7/s2_recovered.png")
    print("recovered +6.7",pg.evaluate(ST))
    # 3) pull the lever back during a stall -> clears quicker (desert scene for the soot)
    idle(7);pg.evaluate("scene=1;lab()")
    slam();release();t0=time.time()
    pg.wait_for_timeout(450);pg.screenshot(path="d7/s3_desert_soot.png")
    pg.evaluate("raw=0;applyRaw()")
    while pg.evaluate("sT")>0 and time.time()-t0<5: pg.wait_for_timeout(50)
    print("pull-back cleared after %.2fs (full stall is 2.6s)"%(time.time()-t0),pg.evaluate(ST))
    # 4) FAULTS off: same slam does nothing
    idle(7);pg.keyboard.press("f");before=pg.evaluate("__st")
    slam();release();pg.wait_for_timeout(1500)
    print("faults OFF    ",pg.evaluate(ST),"new stalls:",pg.evaluate("__st")-before,"| button:",pg.evaluate("document.querySelector('[data-k=flt]').textContent"))
    # 5) unforced slam with faults on: probabilistic, must be able to go either way without errors
    idle(7);pg.keyboard.press("f")
    res=[]
    for k in range(3):
        before=pg.evaluate("__st");slam(force=False);release();pg.wait_for_timeout(1200)
        res.append(pg.evaluate("__st")-before);idle(7)
    print("3 natural slams, stalls per slam:",res)
    print("ERRORS",errs)
    b.close()
