// Visitor counts, through GoatCounter (kkbosu.goatcounter.com): no cookies, nothing personal, and nothing the game
// waits for. It runs only on the live site and never under automation, so development and the tests count nothing
// and fetch nothing. If the script is blocked, count() does nothing.
import { MAN } from './params.js';

const SITE = 'https://kkbosu.goatcounter.com/count',
  LIVE = 'kkbosu.github.io',
  wait = []; /* what was counted before the script arrived */
let on = 0;

const send = (v) => window.goatcounter.count(v);
/* load-time setup, called from main.js */
export function wireAnalytics() {
  on = location.hostname === LIVE && !navigator.webdriver && !MAN ? 1 : 0;
  if (!on) return;
  /* the page view is sent by count(), with the machine's own address, not by the script on its own */
  window.goatcounter = { no_onload: true };
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://gc.zgo.at/count.js';
  s.dataset.goatcounter = SITE;
  s.onload = () => wait.splice(0).forEach(send);
  s.onerror = () => (on = 0);
  document.head.appendChild(s);
}
/* a page view (path: '/lunar-module/daily'), or with ev an event ('share/lunar-module') */
export function count(path, ev) {
  if (!on) return;
  const v = { path, title: ev ? path : document.title, event: !!ev };
  if (window.goatcounter && window.goatcounter.count) send(v);
  else if (wait.length < 50) wait.push(v);
}
