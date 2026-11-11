// URL parameters read at load: ?q (quality), ?manual (tests step frames themselves), ?fps, ?nomerge, ?daily; and what a
// machine's own page (/sky-crane/, /sky-crane/daily/; written by tools/pages.mjs) says in its <meta name="tu-..."> tags.

/* 3D renderer handle (null = 2D fallback) */

/* quality: 2 full, 1 coarse haze, 0 no haze/bloom. Steps down on its own if frames stay slow; ?q=0|1|2 pins it */
export const QP = new URLSearchParams(location.search).get('q');
/* test hook: ?manual stops the loop so a slow test machine can step frames one at a time */
export const MAN = new URLSearchParams(location.search).has('manual');
/* ?fps: show the frame-time readout (hud/fps.js) */
export const FPS = new URLSearchParams(location.search).has('fps');
/* ?nomerge: skip the static-parts pass (render3d/merge.js: merging, freezing, instanced materials), to compare */
export const NOMERGE = new URLSearchParams(location.search).has('nomerge');
/* a page's own setting: <meta name="tu-NAME" content="...">, null when the page has none */
const meta = (n) => {
  const e = document.querySelector('meta[name="tu-' + n + '"]');
  return e ? e.content : null;
};
/* ?daily: start the machine's daily MISSION as soon as START is pressed (the link a shared result points to) */
export const DAILY = new URLSearchParams(location.search).has('daily') || meta('daily') != null;
/* the machine to open: ?m, or the one this page belongs to */
export const M0 = +(new URLSearchParams(location.search).get('m') ?? meta('m')) || 0;
/* where the machines' own pages live (the site's root as a full URL), or null when the build has none (the dev
   server): links then use ?m= */
export const PAGES = meta('pages') == null ? null : new URL(meta('pages'), location.href).href;
/* the link to a machine's daily challenge */
export function dailyLink(mi, slug) {
  return PAGES ? PAGES + slug + '/daily/' : location.origin + location.pathname + '?m=' + mi + '&daily';
}
