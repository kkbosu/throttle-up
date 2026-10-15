import os,pathlib
TJ=os.path.join(os.path.dirname(os.path.abspath(__file__)),'tj/node_modules/three')
PRE='https://cdn.jsdelivr.net/npm/three@0.160.0/'
ARGS=["--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist","--autoplay-policy=no-user-gesture-required"]
def route(ctx):
    if not os.path.isdir(TJ): return   # no local copy of three: let the page load it from the CDN
    def h(r):
        path=os.path.join(TJ,r.request.url[len(PRE):].split('?')[0])
        if os.path.exists(path):
            r.fulfill(status=200,body=open(path,'rb').read(),headers={'Content-Type':'application/javascript','Access-Control-Allow-Origin':'*'})
        else: r.fulfill(status=404,body='nf')
    ctx.route(PRE+'**',h)
def page(b,W=905,H=655,q=2,m=0,extra='',mobile=False,errs=None,file=os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..','throttle-up-v11.html'))):
    ctx=b.new_context(viewport={"width":W,"height":H},has_touch=mobile,is_mobile=mobile)
    route(ctx);pg=ctx.new_page()
    if errs is not None:
        pg.on("pageerror",lambda e:errs.append(("pageerror",str(e))))
        pg.on("console",lambda m:errs.append((m.type,m.text)) if m.type in("error","warning") else None)
    pg.goto(pathlib.Path(file).as_uri()+f"?q={q}&m={m}{extra}")
    pg.wait_for_function("R3done",timeout=60000)
    return pg
