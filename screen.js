/* Shared CRT screen: rainbow-stripe background, glitch bursts, typing helpers
   and the status-bar clock. A page can tune it by setting window.CRT first. */
const CFG = Object.assign({
  density: 1,               // amount of resting stripe patches
  burst: [2500, 7000],      // quiet gap between glitch bursts: minimum + random extra (ms)
  jolt: true,               // occasional sideways jump of the whole terminal
  edge: 0,                  // px: confine the rainbow to a strip along the bottom edge (0 = anywhere clear of the text)
  deadLines: 0,             // faint full-height lines near the right edge, like a damaged panel (0 = none)
  weights: {},              // override how often each glitch kind is picked
}, window.CRT || {});

document.documentElement.style.setProperty('--edge', `${CFG.edge}px`);   // the faded band starts above the rainbow strip

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- background: rows of rainbow stripes ---------- */
const cv = document.getElementById('bg');
const ctx = cv.getContext('2d');
// the resting screen lives on an offscreen canvas so glitches can be wiped by copying back
const base = document.createElement('canvas'), bctx = base.getContext('2d');
const BG_COLOR = '#19191a';
const ROW = 14, ROW_H = 13;    // terminal line pitch / filled height
const BASE_ALPHA = 0.9;
let W, H, dpr;

// mixed rainbow, like a terminal spewing binary
const STRIPE = Array.from({length: 64}, () =>
  `hsl(${Math.random() * 360 | 0} ${55 + Math.random() * 35 | 0}% ${40 + Math.random() * 30 | 0}%)`);
const pick = (a, rand = Math.random) => a[rand() * a.length | 0];

// small seeded PRNG so a patch redraws identically after a resize
function mulberry32(a) {
  return () => {
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const snapRow = y => (y / ROW | 0) * ROW;

// CSS gradient of 1-2px rainbow stripes, for glitching DOM elements
function stripeGradient() {
  const stops = [];
  for (let p = 0; p < 160; ) {
    const w = Math.random() < 0.7 ? 1 : 2;
    stops.push(`${pick(STRIPE)} ${p}px ${p + w}px`); p += w;
  }
  return `repeating-linear-gradient(90deg, ${stops.join(', ')})`;
}

// top-left area holding the terminal text and tiles, which glitches keep clear of
function textZone() {
  const fs = Math.min(28, Math.max(20, W * 0.024));   // matches .term font-size
  let r = Math.min(W, 80 + fs * 22), b = Math.min(H, 60 + fs * 11);
  document.querySelectorAll('#term .line > *, #term .tile').forEach(el => {
    const box = el.getBoundingClientRect();
    r = Math.max(r, box.right); b = Math.max(b, box.bottom);
  });
  return { r: r + 48, b: b + 32 };
}

// number of stripe rows for a glitch, capped to fit the bottom strip in edge mode
const rowCount = (min, extra) =>
  Math.min(CFG.edge ? Math.max(1, CFG.edge / ROW | 0) : Infinity, min + (Math.random() * extra | 0));

// random spot for a w×h glitch: in edge mode anywhere along the bottom strip,
// otherwise leaning right and down, outside the text zone
function spot(w, h) {
  if (CFG.edge) {
    if (h > CFG.edge) return null;
    return { x: Math.round(Math.random() * Math.max(0, W - w)), y: H - h - snapRow(Math.random() * (CFG.edge - h)) };
  }
  const z = textZone();
  for (let i = 0; i < 12; i++) {
    const x = Math.max(0, (W - w) * Math.sqrt(Math.random()));
    const y = Math.max(0, (H - h) * Math.sqrt(Math.random()));
    if (x > z.r || y > z.b) return { x: Math.round(x), y: snapRow(y) + ROW };
  }
  return null;
}

// stacked garbage-text rows of 1px stripes; one shared colour pattern keeps
// stripes lined up vertically, and each row ends raggedly
function stripeRows(c, x0, y0, n, maxW, rand = Math.random) {
  const pattern = Array.from({length: Math.ceil(maxW)}, () => rand() < 0.1 ? null : pick(STRIPE, rand));
  for (let r = 0; r < n; r++) {
    const ry = y0 + r * ROW;
    const xs = rand() < 0.6 ? 0 : rand() * 80 | 0;
    const xe = maxW * (0.3 + rand() * 0.7) | 0;
    for (let i = xs; i < xe; i++) {
      const col = rand() < 0.75 ? pattern[i] : pick(STRIPE, rand);
      if (!col) continue;
      c.fillStyle = col; c.fillRect(x0 + i, ry, 1, ROW_H);
    }
  }
}

/* The resting pattern is kept as a list of recipes (position as a fraction of the
   screen, size, random seed) so a resize redraws the same patches instead of new ones. */
const patches = [];

function addPatch(x, y, extra) {
  const p = Object.assign({ fx: x / W, fy: y / H, bottom: H - y }, extra);
  patches.push(p);
  return p;
}

function patchPos(p) {
  return { x: Math.round(p.fx * W), y: CFG.edge ? H - p.bottom : snapRow(p.fy * H) };
}

// draw one recipe onto the resting screen; skip stripe patches that would land on
// the text at this screen size. Returns the box it covers.
function drawPatch(p, zone) {
  const { x, y } = patchPos(p);
  if (p.erase) {
    bctx.fillStyle = BG_COLOR; bctx.fillRect(x, y, p.w, p.h);
    return { x, y, w: p.w, h: p.h };
  }
  if (!zone || x > zone.r || y > zone.b) {
    bctx.globalAlpha = BASE_ALPHA;
    stripeRows(bctx, x, y, p.n, p.maxW, mulberry32(p.seed));
    bctx.globalAlpha = 1;
  }
  return { x, y, w: p.maxW, h: p.n * ROW };
}

function addStripePatch(n, maxW) {
  const p = spot(maxW, n * ROW);
  return p && addPatch(p.x, p.y, { n, maxW, seed: Math.random() * 2 ** 32 | 0 });
}

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = innerWidth; H = innerHeight;
  for (const c of [cv, base]) { c.width = W * dpr; c.height = H * dpr; }
  for (const c of [ctx, bctx]) c.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (!patches.length) {
    const count = Math.round((3 + W * H / 250000) * CFG.density);
    for (let i = 0; i < count; i++) addStripePatch(rowCount(4, 26), Math.min(W, 60 + Math.random() * W * 0.3));
  }
  bctx.fillStyle = BG_COLOR; bctx.fillRect(0, 0, W, H);
  const zone = CFG.edge ? null : textZone();
  patches.forEach(p => drawPatch(p, zone));
  ctx.drawImage(base, 0, 0, W, H);
  dl.width = W * dpr; dl.height = H * dpr; dctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawDeadLines();
}

// copy a region of the resting screen back over whatever glitch is there
function restore(x, y, w, h) {
  x = Math.max(0, Math.floor(x)); y = Math.max(0, Math.floor(y));
  w = Math.min(W - x, Math.ceil(w) + 1); h = Math.min(H - y, Math.ceil(h) + 1);
  if (w > 0 && h > 0) ctx.drawImage(base, x * dpr, y * dpr, w * dpr, h * dpr, x, y, w, h);
}

/* ---------- glitch kinds ---------- */

// band of vertical binary columns in mismatched colours, with an RGB fringe
function dataBand() {
  const h = ROW * rowCount(4, 10), w = W * (0.3 + Math.random() * 0.7);
  const p = spot(w, h);
  if (!p) return;
  const x0 = p.x, y = p.y, x1 = Math.min(W, x0 + w);
  const cw = 11, lh = 11;
  const draw = () => {
    ctx.fillStyle = '#0c0c0d'; ctx.fillRect(x0, y, x1 - x0, h);
    ctx.font = '13px VT323, monospace'; ctx.textBaseline = 'top';
    for (let x = x0; x < x1; x += cw) {
      if (Math.random() < 0.25) continue;
      const c = pick(STRIPE);
      ctx.globalAlpha = 0.2; ctx.fillStyle = c; ctx.fillRect(x, y, cw - 2, h);
      for (let yy = y; yy < y + h - lh; yy += lh) {
        if (Math.random() < 0.15) continue;
        const ch = Math.random() < 0.5 ? '0' : '1';
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = '#ff2f7a'; ctx.fillText(ch, x - 1.5, yy);
        ctx.fillStyle = '#2fd6ff'; ctx.fillText(ch, x + 1.5, yy);
        ctx.globalAlpha = 1; ctx.fillStyle = c; ctx.fillText(ch, x, yy);
      }
    }
    ctx.globalAlpha = 1;
  };
  // flicker a few frames of new digits before restoring
  const frames = 1 + (Math.random() * 3 | 0);
  for (let i = 0; i < frames; i++) setTimeout(draw, i * 70);
  setTimeout(() => restore(x0, y, x1 - x0, h), frames * 70 + 100 + Math.random() * 300);
}

// a bright burst of stripe rows that disappears again
function streaks() {
  const n = rowCount(3, 12), maxW = W * (0.15 + Math.random() * 0.4);
  const p = spot(maxW, n * ROW);
  if (!p) return;
  const x0 = p.x, y = p.y;
  stripeRows(ctx, x0, y, n, maxW);
  setTimeout(() => restore(x0, y, maxW, n * ROW), 150 + Math.random() * 450);
}

// permanently grow or erase a small patch of the resting pattern
function mutate() {
  let p;
  if (Math.random() < 0.5) {
    const w = 40 + Math.random() * 200, h = ROW * rowCount(1, 6), at = spot(w, h);
    p = at && addPatch(at.x, at.y, { erase: true, w, h });
  } else {
    p = addStripePatch(rowCount(1, 5), 30 + Math.random() * 150);
  }
  if (!p) return;
  const box = drawPatch(p, null);
  restore(box.x, box.y, box.w, box.h);
}

// briefly turn one line of the terminal text into a stripe bar
function corruptText() {
  const rows = document.querySelectorAll('#term .line');
  if (!rows.length) return;
  const row = pick(rows);
  row.style.setProperty('--stripes', stripeGradient());
  row.style.setProperty('--gx', Math.round((Math.random() - .5) * 24) + 'px');
  row.classList.add('corrupt');
  setTimeout(() => row.classList.remove('corrupt'), 80 + Math.random() * 220);
}

// thin horizontal tear, below the text (or inside the bottom strip)
function tear() {
  const h = 2 + Math.random() * 12, dx = Math.round((Math.random() - .5) * 40);
  const top = CFG.edge ? H - CFG.edge : textZone().b;
  const y = top + Math.random() * Math.max(0, H - top - h);
  const img = ctx.getImageData(0, y * dpr, cv.width, h * dpr);
  ctx.putImageData(img, dx * dpr, y * dpr);
  setTimeout(() => restore(0, y, W, h), 50 + Math.random() * 120);
}

/* ---------- damaged panel: faint full-height lines near the right edge ---------- */
// drawn on their own layer above the page, the way dead columns sit on top of everything
const dl = document.createElement('canvas'), dctx = dl.getContext('2d');
dl.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:4';   // above the faded band
document.body.appendChild(dl);

const DEAD_COLORS = ['#ffffff', '#ffffff', '#a8ecff', '#ff7ad9', '#9dffb0', '#fff38a', '#b8a6ff'];
const DEAD_ZONE = 0.35;   // lines live in this right-hand share of the screen
// kept as distance from the right edge so they stay put when the window resizes
const deadLines = [];
// a line that isn't permanent stays at least `until` before it may go dark (6-15 s)
const deadLine = right => ({
  right: Math.round(right), color: pick(DEAD_COLORS), alpha: 0.12 + Math.random() * 0.3,
  until: performance.now() + 6000 + Math.random() * 9000,
});
for (let i = 0, right = 8 + Math.random() * 30; i < CFG.deadLines; i++) {
  const group = Math.random() < 0.35 ? 2 + (Math.random() * 3 | 0) : 1;   // a few columns stuck together
  for (let g = 0; g < group; g++) deadLines.push(deadLine(right + g));
  right += group + 6 + Math.random() * 45 * (1 + i / 4);      // sparser further from the edge
}
// at least 80% of the starting lines are permanent; only the rest come and go
deadLines.slice().sort(() => Math.random() - .5).forEach((l, i, all) => { l.fixed = i >= Math.floor(all.length * 0.2); });

function drawDeadLines() {
  dctx.clearRect(0, 0, W, H);
  for (const l of deadLines) {
    if (l.right > W * DEAD_ZONE) continue;
    dctx.globalAlpha = l.flash ? 0.8 : l.alpha; dctx.fillStyle = l.color;
    dctx.fillRect(W - l.right, 0, 1, H);
  }
  dctx.globalAlpha = 1;
}

// light a line up brightly for a moment, then run `after` (default: back to normal)
function flashLine(l, after) {
  l.flash = true; drawDeadLines();
  setTimeout(() => { l.flash = false; if (after) after(); drawDeadLines(); }, 60 + Math.random() * 140);
}

// one of the dead lines flares up for a moment
function deadLineFlash() {
  if (deadLines.length) flashLine(pick(deadLines));
}

// the panel keeps failing and recovering: a new line flickers on and stays, or a non-permanent
// line that has been up for its few seconds flares and goes dark. Non-permanent lines are
// capped so the permanent ones stay at 80% or more.
function deadLineChange() {
  const loose = deadLines.filter(l => !l.fixed && !l.dying);
  const due = loose.filter(l => performance.now() >= l.until);
  const canAdd = loose.length < Math.max(1, Math.floor(deadLines.filter(l => l.fixed).length / 4));
  if (canAdd && (!due.length || Math.random() < 0.5)) {
    const l = deadLine(6 + Math.random() ** 1.8 * W * DEAD_ZONE);   // mostly near the edge
    deadLines.push(l);
    flashLine(l);
  } else if (due.length) {
    const l = pick(due);
    l.dying = true;   // so a quick second change can't pick it again while it flares
    flashLine(l, () => { const i = deadLines.indexOf(l); if (i >= 0) deadLines.splice(i, 1); });
  }
}

// pages may add their own kinds to both of these
const GLITCHES = { dataBand, streaks, corruptText, mutate, tear, deadLineFlash };
const GLITCH_WEIGHTS = Object.assign({
  dataBand: .22, streaks: .48, corruptText: .06, mutate: .14, tear: .1, deadLineFlash: CFG.deadLines ? .15 : 0,
}, CFG.weights);

function glitch() {
  const kinds = Object.keys(GLITCH_WEIGHTS);
  let r = Math.random() * kinds.reduce((s, k) => s + GLITCH_WEIGHTS[k], 0);
  for (const k of kinds) { r -= GLITCH_WEIGHTS[k]; if (r <= 0) return GLITCHES[k](); }
}

// quiet for a few seconds, then a quick burst of 1-3 glitches
function burst() {
  const n = 1 + (Math.random() * 3 | 0);
  for (let i = 0; i < n; i++) setTimeout(glitch, i * (40 + Math.random() * 140));
  setTimeout(burst, CFG.burst[0] + Math.random() * CFG.burst[1]);
}

function jolt() {
  document.body.style.setProperty('--jx', Math.round((Math.random() - .5) * 8) + 'px');
  document.body.classList.add('jolt');
  setTimeout(() => document.body.classList.remove('jolt'), 40 + Math.random() * 60);
  setTimeout(jolt, 5000 + Math.random() * 10000);
}

let resizeQueued = false;
addEventListener('resize', () => {
  if (resizeQueued) return;
  resizeQueued = true;
  requestAnimationFrame(() => { resizeQueued = false; resize(); });
});
resize();
if (!reduce) {
  setTimeout(burst, 1500);
  if (CFG.jolt) setTimeout(jolt, 4000);
  // dead lines change on their own steady clock: one appears or goes dark every ~5 seconds
  if (CFG.deadLines) setTimeout(function lineTick() {
    deadLineChange();
    setTimeout(lineTick, 4000 + Math.random() * 2000);
  }, 5000);
}

/* ---------- grain texture for the whole screen (body::before in screen.css) ---------- */
{
  const n = document.createElement('canvas'); n.width = n.height = 80;
  const nx = n.getContext('2d'), img = nx.createImageData(80, 80);
  for (let i = 0; i < img.data.length; i += 4) {
    img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.random() * 255; img.data[i + 3] = 255;
  }
  nx.putImageData(img, 0, 0);
  document.documentElement.style.setProperty('--screen-noise', `url(${n.toDataURL()})`);
}

/* ---------- status bar clock ---------- */
const clock = document.getElementById('clock');
const tick = () => { clock.textContent = new Date().toTimeString().slice(0, 8); };
tick(); setInterval(tick, 1000);

/* ---------- typing helpers ---------- */
const hex = n => Array.from({length: n}, () => (Math.random() * 16 | 0).toString(16)).join('').toUpperCase();
const TECH_STRINGS = [
  () => `SYS_BOOT 0x${hex(8)} :: MEM ${640 + (Math.random() * 384 | 0)}K OK :: CHK ${hex(4)}-${hex(4)}`,
  () => `LOAD /SEG:${hex(4)} /OFF:${hex(4)} --CRC32=${hex(8)} :: OK`,
  () => `INT 21h AH=4Ch :: VGA 80x25 MODE 03h :: IRQ ${Math.random() * 15 | 0} :: ${hex(6)}`,
];
const techString = () => pick(TECH_STRINGS)();

const GLYPHS = '█▓▒░#%&@$/\\<>01';
const wait = ms => new Promise(r => setTimeout(r, reduce ? 0 : ms));

async function typeInto(el, text, speed) {
  for (let i = 0; i < text.length; i++) {
    if (!reduce && Math.random() < 0.12) {   // flash a garbage glyph first
      el.textContent = text.slice(0, i) + GLYPHS[Math.random() * GLYPHS.length | 0];
      await wait(speed);
    }
    el.textContent = text.slice(0, i + 1);
    await wait(speed + Math.random() * speed);
  }
}
