// URL parameters read at load: ?q (quality), ?manual (tests step frames themselves), ?fps, ?nomerge, ?daily.

/* 3D renderer handle (null = 2D fallback) */

/* quality: 2 full, 1 coarse haze, 0 no haze/bloom. Steps down on its own if frames stay slow; ?q=0|1|2 pins it */
export const QP = new URLSearchParams(location.search).get('q');
/* test hook: ?manual stops the loop so a slow test machine can step frames one at a time */
export const MAN = new URLSearchParams(location.search).has('manual');
/* ?fps: show the frame-time readout (hud/fps.js) */
export const FPS = new URLSearchParams(location.search).has('fps');
/* ?nomerge: skip the static-parts pass (render3d/merge.js: merging, freezing, instanced materials), to compare */
export const NOMERGE = new URLSearchParams(location.search).has('nomerge');
/* ?daily: start the machine's daily MISSION as soon as START is pressed (the link a shared result points to) */
export const DAILY = new URLSearchParams(location.search).has('daily');
