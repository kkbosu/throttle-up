import os
# The page is served by Vite: `npm run dev` (http://localhost:5173/) or `npm run build` + `npm run preview`
# (http://localhost:4173/). Set PAGE_URL to choose; ES modules don't run from file://.
URL=os.environ.get('PAGE_URL','http://localhost:5173/')
ARGS=["--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist","--autoplay-policy=no-user-gesture-required"]
def page(b,W=905,H=655,q=2,m=0,extra='',mobile=False,errs=None,url=URL):
    ctx=b.new_context(viewport={"width":W,"height":H},has_touch=mobile,is_mobile=mobile)
    pg=ctx.new_page()
    if errs is not None:
        pg.on("pageerror",lambda e:errs.append(("pageerror",str(e))))
        pg.on("console",lambda m:errs.append((m.type,m.text)) if m.type in("error","warning") else None)
    pg.goto(url+f"?q={q}&m={m}{extra}")
    pg.wait_for_function("R3done",timeout=60000)
    return pg
