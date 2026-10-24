/* Animated artwork for the P11 Research Labs articles.
   The drawing code below (rng … ART) is copied from the original site,
   post-quantum-articles/p11-research-labs/original-page.html. The runner at the end is new:
   mountArt() puts a piece into a canvas, keeps it animating while on screen, and gives it an
   old-TV picture with the odd flicker. */

const ART_LINE_SCALE = Math.min(window.devicePixelRatio || 1, 2);

/* ---------------------------------------------------------------
   Generative art — one isometric line-art family. Each piece sits on a dark
   ground lit by large, slowly drifting fields of saturated colour, so a blurred
   card spreads vivid colour into the UI around it.
---------------------------------------------------------------- */
function rng(seed) {
  let a = 0;
  for (const c of String(seed)) a = (a * 31 + c.charCodeAt(0)) >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let grainPattern = null;
function grain(ctx) {
  if (!grainPattern) {
    const g = document.createElement("canvas");
    g.width = g.height = 160;
    const gx = g.getContext("2d");
    const img = gx.createImageData(160, 160);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 22;
    }
    gx.putImageData(img, 0, 0);
    grainPattern = g;
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "overlay";
  ctx.fillStyle = ctx.createPattern(grainPattern, "repeat");
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}

const clamp01 = x => Math.max(0, Math.min(1, x));
const ease = x => (x = clamp01(x)) < .5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
const mix = (a, b, f) => a.map((v, i) => Math.round(v + (b[i] - v) * f));
const rgb = (c, k = 1) => `rgb(${c.map(v => Math.min(255, Math.round(v * k))).join(",")})`;

/* Dark ground + colour fields: [x, y, radius, "r,g,b", alpha] in frame fractions */
function ground(ctx, w, h, fields, t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#0e0f12"; ctx.fillRect(0, 0, w, h);
  const m = Math.max(w, h);
  ctx.globalCompositeOperation = "screen";
  fields.forEach(([x, y, r, c, a], i) => {
    const cx = (x + Math.sin(t * .23 + i * 2.1) * .05) * w, cy = (y + Math.cos(t * .19 + i * 1.7) * .05) * h;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * m);
    g.addColorStop(0, `rgba(${c},${a})`); g.addColorStop(1, `rgba(${c},0)`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  });
  ctx.globalCompositeOperation = "source-over";
}

/* Isometric projection fitted to a (u, v, z) box, plus drawing helpers */
function isoKit(ctx, w, h, [u0, u1, v0, v1, z0, z1], fit = .82) {
  const dpr = ART_LINE_SCALE;
  const lw = Math.max(1, dpr * .9);
  const C = Math.cos(Math.PI / 6), Sn = .5;
  const xs = [], ys = [];
  for (const u of [u0, u1]) for (const v of [v0, v1]) for (const z of [z0, z1]) { xs.push((u + v) * C); ys.push((u - v) * Sn - z); }
  const bx0 = Math.min(...xs), bx1 = Math.max(...xs), by0 = Math.min(...ys), by1 = Math.max(...ys);
  const S = Math.min(w * fit / (bx1 - bx0), h * fit / (by1 - by0));
  const ox = w / 2 - (bx0 + bx1) / 2 * S, oy = h / 2 - (by0 + by1) / 2 * S;
  const k = { dpr, lw, S };
  k.P = (u, v, z = 0) => [ox + (u + v) * C * S, oy + ((u - v) * Sn - z) * S];
  k.reset = () => ctx.setTransform(1, 0, 0, 1, 0, 0);
  k.floor = (z = 0) => ctx.setTransform(C * S, Sn * S, C * S, -Sn * S, ox, oy - z * S);   // (u, v) at height z
  k.vz = u => ctx.setTransform(C * S, -Sn * S, 0, -S, ox + u * C * S, oy + u * Sn * S);   // (v, z) at u
  k.rr = (x, y, ww, hh, rad) => { ctx.beginPath(); ctx.roundRect(x, y, ww, hh, rad); };
  k.stroke = (color, width = lw, dash) => {
    k.reset(); ctx.setLineDash(dash ? dash.map(d => d * dpr) : []);
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke(); ctx.setLineDash([]);
  };
  k.fill = (style, alpha = 1) => { k.reset(); ctx.globalAlpha = alpha; ctx.fillStyle = style; ctx.fill(); ctx.globalAlpha = 1; };
  k.path = pts => {
    k.reset(); ctx.beginPath();
    pts.forEach((p, i) => { const q = k.P(...p); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); });
  };
  k.line = (pts, color, width = lw, dash) => { k.path(pts); k.stroke(color, width, dash); };
  k.glow = (x, y, rad, c, a) => {
    k.reset();
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, `rgba(${c},${a})`); g.addColorStop(1, `rgba(${c},0)`);
    ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = g;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    ctx.globalCompositeOperation = "source-over";
  };
  k.dot = (x, y, rad, color = "#fff") => { k.reset(); ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); };
  k.grad = (a, b, stops) => {
    const g = ctx.createLinearGradient(a[0], a[1], b[0], b[1]);
    stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
    return g;
  };
  // Box with its three visible faces: front-left (v = b0), front-right (u = a1), top
  k.prism = (a0, a1, b0, b1, c0, c1, { top, left, right, edge = "rgba(255,255,255,.5)", alpha = 1 } = {}) => {
    const face = (pts, style) => { k.path(pts); ctx.closePath(); if (style) k.fill(style, alpha); k.stroke(edge); };
    face([[a0, b0, c0], [a1, b0, c0], [a1, b0, c1], [a0, b0, c1]], left);
    face([[a1, b0, c0], [a1, b1, c0], [a1, b1, c1], [a1, b0, c1]], right);
    face([[a0, b0, c1], [a1, b0, c1], [a1, b1, c1], [a0, b1, c1]], top);
  };
  // Upright rounded plate in the v–z plane at track position u
  k.plate = (u, va, vb, za, zb, rad, fillStyle, alpha, edge = "rgba(255,255,255,.7)", dash) => {
    k.vz(u); k.rr(va, za, vb - va, zb - za, rad);
    if (fillStyle) k.fill(fillStyle, alpha);
    k.stroke(edge, lw, dash);
  };
  return k;
}

const ART = {
  /* Threshold ML-DSA: signers send shares to the centre; one reuses its state and leaks. */
  reuse(ctx, w, h, r, t) {
    if (t == null) t = 5.3;
    const tt = t % 8.5, N = 5, R = 2.5, BAD = 3;
    ground(ctx, w, h, [[.5, .55, .6, "255,59,59", .48], [.2, .3, .45, "255,154,43", .42], [.85, .8, .35, "255,60,140", .28]], t);
    const k = isoKit(ctx, w, h, [-3.3, 3.3, -3.3, 3.3, 0, 2.8], .82);
    const pos = i => { const a = Math.PI * .75 + i * 2 * Math.PI / N; return [Math.cos(a) * R, Math.sin(a) * R]; };
    k.floor(); ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); k.stroke("rgba(255,255,255,.28)", k.lw, [1, 4]);
    for (let i = 0; i < N; i++) k.line([[...pos(i), 0], [0, 0, 0]], "rgba(255,255,255,.18)");
    const sends = [...Array(N)].map((_, i) => ({ i, at: .4 + i * .55, hot: false })).concat([{ i: BAD, at: 4.1, hot: true }]);
    const arrive = e => e.at + .6;
    const done = sends.filter(e => !e.hot && tt > arrive(e)).length / N;
    const leak = tt > arrive(sends[N]) ? Math.exp(-(tt - arrive(sends[N])) * .55) : 0;
    sends.forEach(e => {
      const f = (tt - e.at) / .6; if (f < 0 || f > 1) return;
      const [pu, pv] = pos(e.i), q = k.P(pu * (1 - f), pv * (1 - f), .35);
      k.glow(q[0], q[1], k.S * .7, e.hot ? "255,40,40" : "255,170,60", .9); k.dot(q[0], q[1], k.lw * 2.2);
    });
    const items = [...Array(N)].map((_, i) => ({ i, uv: pos(i) })).concat([{ i: -1, uv: [0, 0] }]);
    items.sort((a, b) => (a.uv[0] - a.uv[1]) - (b.uv[0] - b.uv[1])).forEach(({ i, uv: [u, v] }) => {
      if (i < 0) {
        const hgt = .25 + done * .55, c = mix([255, 170, 60], [255, 50, 50], leak);
        k.prism(u - .85, u + .85, v - .85, v + .85, 0, hgt, { top: rgb(c, 1.1), left: rgb(c, .6), right: rgb(c, .8), alpha: .35 + .6 * Math.max(done, leak), edge: "rgba(255,255,255,.6)" });
        const q = k.P(0, 0, hgt); k.glow(q[0], q[1], k.S * 2.4, leak > .05 ? "255,40,40" : "255,150,50", .25 + .35 * Math.max(done, leak));
        return;
      }
      const sending = sends.some(e => e.i === i && tt > e.at - .2 && tt < arrive(e));
      const hot = i === BAD ? leak : 0, c = mix(sending ? [255, 190, 90] : [70, 70, 80], [255, 45, 45], hot);
      k.prism(u - .42, u + .42, v - .42, v + .42, 0, .8, { top: rgb(c, 1.15), left: rgb(c, .55), right: rgb(c, .8), alpha: .9 });
    });
    if (leak > .02) {   // the secret share escapes upward
      const [u, v] = pos(BAD), b = k.P(u, v, .8), tp = k.P(u, v, 2.8);
      k.reset(); const g = ctx.createLinearGradient(b[0], b[1], tp[0], tp[1]);
      g.addColorStop(0, `rgba(255,60,60,${.85 * leak})`); g.addColorStop(1, "rgba(255,60,60,0)");
      ctx.fillStyle = g; ctx.fillRect(b[0] - k.S * .3, tp[1], k.S * .6, b[1] - tp[1]);
      for (let j = 0; j < 7; j++) {
        const f = ((tt * .9 + j / 7) % 1), q = k.P(u + Math.sin(j * 3.1) * .25, v + Math.cos(j * 2.3) * .25, .8 + f * 2);
        k.glow(q[0], q[1], k.S * .18, "255,90,90", leak * (1 - f));
      }
    }
  },

  /* Every decision is temporary: a migration wave re-colours the grid, over and over. */
  wave(ctx, w, h, r, t) {
    if (t == null) t = 2.4;
    const PER = 6, n = 9, cols = [[123, 92, 255], [198, 255, 61], [255, 63, 160], [61, 214, 255]];
    const cyc = Math.floor(t / PER), ph = (t % PER) / PER;
    const old = cols[cyc % 4], neu = cols[(cyc + 1) % 4];
    ground(ctx, w, h, [[.3, .3, .55, old.join(), .45 * (1 - ph * .5)], [.72, .72, .55, neu.join(), .25 + .3 * ph], [.5, .5, .3, "255,255,255", .05]], t);
    const k = isoKit(ctx, w, h, [0, n, 0, n, 0, 1.1], .86);
    const front = ph * 1.5 - .25, tiles = [];
    for (let u = 0; u < n; u++) for (let v = 0; v < n; v++) {
      const d = (u + (n - 1 - v)) / (2 * (n - 1)), diff = d - front;
      tiles.push({ u, v, lift: Math.exp(-((diff / .07) ** 2)) * .85, c: diff < 0 ? neu : old });
    }
    tiles.sort((a, b) => (a.u - a.v) - (b.u - b.v)).forEach(({ u, v, lift, c }) => {
      k.prism(u + .08, u + .92, v + .08, v + .92, lift, lift + .16, {
        top: rgb(c, 1 + lift * .35), left: rgb(c, .45), right: rgb(c, .65),
        edge: `rgba(255,255,255,${.12 + lift * .6})`,
      });
      if (lift > .45) { const q = k.P(u + .5, v + .5, lift + .16); k.glow(q[0], q[1], k.S * 1.1, "255,255,255", .18 * lift); }
    });
  },

  /* Ownership after Q-Day: seed → child → address; a proof wraps the hardened step and an attacker bounces off it. */
  derive(ctx, w, h, r, t) {
    if (t == null) t = 1.6;
    const tt = t % 7.5;
    ground(ctx, w, h, [[.3, .28, .55, "25,227,192", .48], [.76, .66, .5, "255,215,64", .38], [.62, .2, .38, "70,110,255", .28]], t);
    const k = isoKit(ctx, w, h, [-3, 3, -1.8, 1.8, 0, 4.2], .82);
    const steps = [[-1.8, 0, 3.4], [-.6, 0, 2.3], [.6, 0, 1.2], [1.8, 0, 0]];
    const plateAt = ([u, v, z], cols, a) => {
      k.floor(z); k.rr(u - .7, v - .7, 1.4, 1.4, .28);
      k.fill(k.grad(k.P(u - .7, v, z), k.P(u + .7, v, z), cols), a); k.stroke("rgba(255,255,255,.7)");
    };
    for (let i = 0; i < 3; i++) k.line([steps[i], steps[i + 1]], "rgba(255,255,255,.3)", k.lw, [2, 3]);
    plateAt(steps[3], ["#19e3c0", "#4fd8ff"], .55);
    plateAt(steps[2], ["#19e3c0", "#a6ffea"], .65);
    // the hardened step: a glass sheet the attacker cannot climb through
    k.floor(1.75); k.rr(-2.7, -1.6, 5.4, 3.2, .5);
    k.fill("rgba(255,215,64,.08)"); k.stroke("rgba(255,215,64,.7)", k.lw, [3, 3]);
    plateAt(steps[1], ["#19e3c0", "#ffd740"], .8);
    plateAt(steps[0], ["#ffd740", "#ff9d2e"], .95);
    k.prism(-2.65, .15, -1.05, 1.05, 1.95, 3.95, { top: "rgba(25,227,192,.07)", left: "rgba(25,227,192,.1)", right: "rgba(25,227,192,.08)", edge: "rgba(140,255,230,.55)" });
    const along = (a, b, f) => a.map((v, i) => v + (b[i] - v) * f);
    if (tt < 2.4) {          // derivation flows down
      const s = tt / 2.4 * 3, i = Math.min(2, Math.floor(s)), q = k.P(...along(steps[i], steps[i + 1], s - i));
      k.glow(q[0], q[1], k.S * .8, "120,255,220", .85); k.dot(q[0], q[1], k.lw * 2.2);
    } else if (tt > 3 && tt < 5) {   // attacker climbs, bounces at the sheet
      const f = (tt - 3) / 2, up = f < .6 ? f / .6 : 1 - (f - .6) / .4;
      const target = along(steps[2], steps[1], .5);
      const p = up < .5 ? along(steps[3], steps[2], up * 2) : along(steps[2], target, (up - .5) * 2);
      const q = k.P(...p); k.glow(q[0], q[1], k.S * .8, "255,60,170", .9); k.dot(q[0], q[1], k.lw * 2.2);
      if (f > .55 && f < .8) { const b = k.P(...target); k.glow(b[0], b[1], k.S * 2.2, "255,215,64", .7 * (1 - Math.abs(f - .62) / .2)); }
    }
    const s = k.P(...steps[0]); k.glow(s[0], s[1], k.S * 2.4, "255,200,60", .3);
  },

  /* NIST round 3: fourteen pillars, nine rise in their family colours, five sink. */
  rise(ctx, w, h, r, t) {
    if (t == null) t = 3.4;
    const tt = t % 8;
    ground(ctx, w, h, [[.28, .4, .55, "255,176,0", .48], [.74, .6, .55, "255,79,163", .46], [.5, .18, .38, "61,214,255", .3]], t);
    const k = isoKit(ctx, w, h, [0, 4.4, 0, 4.4, 0, 3], .82);
    const fam = [[255, 79, 163], [138, 92, 255], [255, 176, 0], [255, 176, 0], [255, 176, 0], [255, 176, 0], [61, 214, 255], [61, 214, 255], [61, 214, 255]];
    const cells = [];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if (!(i === 0 && j === 3) && !(i === 3 && j === 0)) cells.push([i, j]);
    const winners = [0, 2, 4, 5, 7, 8, 10, 11, 13];
    const heights = cells.map(() => 1.1 + r() * 1.6);
    cells.map((c, idx) => ({ c, idx })).sort((a, b) => (a.c[0] - a.c[1]) - (b.c[0] - b.c[1])).forEach(({ c: [i, j], idx }) => {
      const u = i * 1.1, v = j * 1.1, wi = winners.indexOf(idx);
      if (wi < 0) {
        const fade = 1 - ease((tt - .8) / 1.2) * (1 - ease((tt - 6.6) / 1));
        k.prism(u, u + .8, v, v + .8, 0, .14, { edge: `rgba(255,255,255,${.12 + .4 * fade})`, top: `rgba(255,255,255,${.06 * fade})` });
        return;
      }
      const grow = ease((tt - .6 - wi * .14) / 1.3) * (1 - ease((tt - 6.4) / 1.2));
      const hgt = .14 + grow * heights[idx], col = fam[wi];
      k.prism(u, u + .8, v, v + .8, 0, hgt, { top: rgb(col, 1.15), left: rgb(col, .55), right: rgb(col, .78), edge: "rgba(255,255,255,.55)" });
      const q = k.P(u + .4, v + .4, hgt); k.glow(q[0], q[1], k.S * 1.2, col.join(), .25 * grow);
    });
  },

  /* CUTS: chained columns whose heights rebalance but always keep the same total. */
  columns(ctx, w, h, r, t) {
    if (t == null) t = 1.4;
    ground(ctx, w, h, [[.25, .5, .55, "138,92,255", .5], [.75, .42, .55, "255,63,208", .46], [.5, .88, .38, "61,214,255", .3]], t);
    const n = 8, gap = 1.1, k = isoKit(ctx, w, h, [-.6, n * gap, -1.2, 1.2, 0, 3.2], .84);
    const hs = [...Array(n)].map((_, i) => 1.4 + .95 * Math.sin(t * 1.05 + i * 2 * Math.PI / n));
    k.floor(); k.rr(-.55, -.9, n * gap + .25, 1.8, .6); k.fill("rgba(255,255,255,.04)"); k.stroke("rgba(255,255,255,.4)");
    const mean = 1.4;
    k.line([[-.4, -.9, mean], [n * gap - .2, -.9, mean]], "rgba(255,255,255,.5)", k.lw, [3, 4]);
    const stops = [[138, 92, 255], [255, 63, 208], [61, 214, 255]];
    const colAt = f => f < .5 ? mix(stops[0], stops[1], f * 2) : mix(stops[1], stops[2], (f - .5) * 2);
    const tops = [];
    hs.forEach((hgt, i) => {
      const u = i * gap, c = colAt(i / (n - 1));
      k.prism(u, u + .7, -.35, .35, 0, hgt, { top: rgb(c, 1.2), left: rgb(c, .55), right: rgb(c, .8), edge: "rgba(255,255,255,.55)" });
      tops.push([u + .35, 0, hgt]);
      const q = k.P(u + .35, 0, hgt); k.glow(q[0], q[1], k.S * 1.1, c.join(), .3);
    });
    k.line(tops, "rgba(255,255,255,.85)", k.lw * 1.4);
    const f = (t * .35) % 1, s = f * (n - 1), i = Math.min(n - 2, Math.floor(s));
    const p = tops[i].map((v, j) => v + (tops[i + 1][j] - v) * (s - i)), q = k.P(...p);
    k.glow(q[0], q[1], k.S * .8, "255,255,255", .7); k.dot(q[0], q[1], k.lw * 2.4);
  },

  /* Signing primer: an elliptic curve on the floor; P + Q → R plays out as Q slides. */
  curve(ctx, w, h, r, t) {
    if (t == null) t = 2.2;
    ground(ctx, w, h, [[.28, .58, .55, "61,123,255", .52], [.76, .38, .52, "255,122,43", .46], [.55, .88, .38, "138,92,255", .3]], t);
    const SC = 1.45, k = isoKit(ctx, w, h, [-2.2, 3.4, -3.1, 3.1, 0, .8], .9);
    const f = x => x ** 3 - x + 1, X0 = -1.3247, at = (x, y, z = 0) => [x * SC, y * SC, z];
    for (let g = -1; g <= 2; g++) k.line([at(g, -2.1), at(g, 2.1)], "rgba(255,255,255,.07)");
    for (let g = -2; g <= 2; g++) k.line([at(-1.5, g), at(2.3, g)], "rgba(255,255,255,.07)");
    const xsU = [];
    for (let i = 0; i <= 90; i++) xsU.push(X0 + (1.75 - X0) * (i / 90) ** 1.6);
    const curvePts = [...xsU.slice().reverse().map(x => at(x, -Math.sqrt(Math.max(0, f(x))))), ...xsU.map(x => at(x, Math.sqrt(Math.max(0, f(x)))))];
    k.path(curvePts);
    ctx.save(); ctx.shadowColor = "rgba(90,150,255,.9)"; ctx.shadowBlur = k.S * .5;
    k.stroke(k.grad(k.P(...at(2, -2)), k.P(...at(2, 2)), ["#ff8a3d", "#ff3f8e", "#6b5cff", "#3d8bff"]), k.lw * 2.6);
    ctx.restore();
    const P = [-1, 1], xq = -.5 + 2.1 * (.5 - .5 * Math.cos(t * .7)), Q = [xq, Math.sqrt(f(xq))];
    const m = (Q[1] - P[1]) / (Q[0] - P[0]), x3 = m * m - P[0] - Q[0], y3 = P[1] + m * (x3 - P[0]);
    const lo = Math.min(P[0], Q[0], x3) - .25, hi = Math.max(P[0], Q[0], x3) + .25;
    k.line([at(lo, P[1] + m * (lo - P[0])), at(hi, P[1] + m * (hi - P[0]))], "rgba(211,255,82,.85)", k.lw * 1.4);
    k.line([at(x3, y3), at(x3, -y3)], "rgba(255,255,255,.55)", k.lw, [2, 3]);
    const pin = ([x, y], c, big) => {
      const b = k.P(...at(x, y)), tp = k.P(...at(x, y, .55));
      k.line([at(x, y), at(x, y, .55)], "rgba(255,255,255,.7)");
      k.glow(tp[0], tp[1], k.S * (big ? 1.2 : .7), c, .9); k.dot(tp[0], tp[1], k.lw * (big ? 3 : 2.2));
      k.dot(b[0], b[1], k.lw * 1.4, "rgba(255,255,255,.8)");
    };
    pin(P, "61,140,255"); pin(Q, "61,140,255"); pin([x3, y3], "211,255,82"); pin([x3, -y3], "255,122,43", true);
  },

  /* Q-Day as a forcing function: a sunrise over the grid, light rolling toward us. */
  sunrise(ctx, w, h, r, t) {
    if (t == null) t = 7;
    const PER = 12, ph = (t % PER) / PER;
    ground(ctx, w, h, [[.5, .32, .55, "255,63,142", .42], [.18, .62, .45, "255,90,31", .4], [.82, .6, .45, "255,210,63", .32]], t);
    const k = isoKit(ctx, w, h, [-4, 4, -4, 4, 0, 0], 1.3);
    const horizon = h * .4;
    const up = ease(Math.min(1, ph * 1.3)), fade = 1 - ease((ph - .88) / .12);
    const R = Math.min(w, h) * .3, cx = w / 2, cy = horizon + R * .9 - up * R * 1.25;
    k.reset(); ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, horizon); ctx.clip();
    ctx.globalAlpha = fade;
    for (let i = 0; i < 14; i++) {   // slow rays
      const a = i / 14 * Math.PI * 2 + t * .05;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * R * 3, cy + Math.sin(a) * R * 3);
      ctx.strokeStyle = "rgba(255,200,120,.08)"; ctx.lineWidth = k.lw * 6; ctx.stroke();
    }
    const sg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    sg.addColorStop(0, "#fff3b0"); sg.addColorStop(.45, "#ffc23f"); sg.addColorStop(.8, "#ff6a2b"); sg.addColorStop(1, "#ff3f8e");
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fillStyle = sg; ctx.fill();
    ctx.restore();
    k.glow(cx, horizon, R * 2.6, "255,120,60", .45 * fade * up);
    const wave = ph * 26 - 4;
    k.reset(); ctx.save(); ctx.beginPath(); ctx.rect(0, horizon, w, h - horizon); ctx.clip();
    for (let g = -12; g <= 12; g++) {   // an open floor running to the horizon
      const lit = Math.exp(-((((g + 12) - wave) / 1.4) ** 2));
      const col = `rgba(255,${170 + 60 * lit | 0},${120 + 60 * lit | 0},${.1 + .55 * lit * fade})`;
      k.line([[g, -12], [g, 12]], col);
      k.line([[-12, -g], [12, -g]], col);
    }
    ctx.restore();
    const g = k.grad(k.P(2.6, -2.9, .1), k.P(2.6, -1.7, 1.3), ["#ff3f8e", "#ff8a3d", "#ffe27a"]);
    k.plate(2.6, -2.9, -1.7, .1, 1.3, .3, g, .9 * (.4 + .6 * up));
    const q = k.P(2.6, -2.3, .7); k.glow(q[0], q[1], k.S * 1.6, "255,150,80", .35 * up);
  },

  /* A new advisor: a lime node spirals in and settles into orbit around the core. */
  orbit(ctx, w, h, r, t) {
    if (t == null) t = 5;
    const tt = t % 10;
    ground(ctx, w, h, [[.5, .45, .55, "79,168,255", .5], [.22, .72, .42, "211,255,82", .36], [.8, .28, .42, "138,92,255", .34]], t);
    const k = isoKit(ctx, w, h, [-3.4, 3.4, -3.4, 3.4, 0, 1.6], .86);
    const rings = [1.2, 2.1, 3];
    rings.forEach((rad, i) => { k.floor(); ctx.beginPath(); ctx.arc(0, 0, rad, 0, Math.PI * 2); k.stroke(`rgba(255,255,255,${.3 - i * .05})`, k.lw, [1, 4]); });
    const bodies = [];
    [[1.2, 0, 1.1], [1.2, Math.PI, 1.1], [2.1, 1, .7], [2.1, 3.6, .7], [3, 2.2, .5]].forEach(([rad, a0, sp]) => {
      const a = a0 + t * sp * .5; bodies.push({ u: Math.cos(a) * rad, v: Math.sin(a) * rad, c: "79,168,255", s: .9 });
    });
    const inT = ease((tt - 1) / 2.6), outT = 1 - ease((tt - 9) / .9);
    const ang = 4 + t * .25, rad = 3 + (1 - inT) * 3.2;
    const nu = { u: Math.cos(ang) * rad, v: Math.sin(ang) * rad, c: "211,255,82", s: 1.4, a: outT };
    bodies.push(nu);
    const draw = b => {
      const q = k.P(b.u, b.v, .35);
      k.glow(q[0], q[1], k.S * .9 * b.s, b.c, .85 * (b.a ?? 1)); k.dot(q[0], q[1], k.lw * 2.2 * b.s, `rgba(255,255,255,${b.a ?? 1})`);
    };
    bodies.filter(b => b.u - b.v < 0).forEach(draw);
    k.prism(-.5, .5, -.5, .5, 0, 1.1, { top: "#9fd0ff", left: "#2f6fe0", right: "#4f9bff", edge: "rgba(255,255,255,.7)" });
    const c = k.P(0, 0, 1.1); k.glow(c[0], c[1], k.S * 2.4, "79,168,255", .45);
    bodies.filter(b => b.u - b.v >= 0).forEach(draw);
  },

  /* SHRINCS — one public key over two trees. Stateful side: an unbalanced tree (a spine
     with one leaf per step), so early signatures carry short paths. Stateless side: a
     balanced SLH-DSA tree used as the fallback. Animated: the counter lights each leaf in
     turn and a pulse climbs to the root; when the spine is spent, the fallback signs. */
  shrincs(ctx, w, h, r, t) {
    const dpr = ART_LINE_SCALE;
    const lw = Math.max(1, dpr * 0.9);
    const C = Math.cos(Math.PI / 6), Sn = Math.sin(Math.PI / 6);
    const clamp = x => Math.max(0, Math.min(1, x));
    const lerp = (a, b, f) => a + (b - a) * f;

    // stateful spine and its leaf plates (plates stand in the v–z plane)
    const N = 7, U0 = 1.3, SP = 1.15;
    const su = k => U0 + k * SP;
    const LV = 0.7, LW = 2.0, LH = 1.35, LR = 0.42;
    // stateless balanced tree, growing away from the root along −u
    const D = 3, RU = -1.3, DU = 1.05, LS = 0.62;
    const lu = l => RU - l * DU;
    const lv = (l, i) => { const span = 2 ** (D - l); return (i * span + (span - 1) / 2 - (2 ** D - 1) / 2) * LS; };
    const HALFV = ((2 ** D - 1) / 2) * LS;

    /* fit the composition to the frame */
    const raw = (u, v, z) => [(u + v) * C, (u - v) * Sn - z];
    const fitPts = [];
    [[lu(D) - 1.1, -HALFV - .5], [lu(D) - 1.1, HALFV + .5], [RU + .5, -HALFV - .5], [RU + .5, HALFV + .5],
     [0, -.9], [0, .9], [U0 - .8, -.5], [su(N - 1) + .8, -.5], [su(N - 1) + .8, LV + LW + .45], [U0 - .8, LV + LW + .45]]
      .forEach(([u, v]) => fitPts.push(raw(u, v, 0), raw(u, v, 1.9)));
    const xs = fitPts.map(p => p[0]), ys = fitPts.map(p => p[1]);
    const bx0 = Math.min(...xs), bx1 = Math.max(...xs), by0 = Math.min(...ys), by1 = Math.max(...ys);
    const S = Math.min(w * 0.9 / (bx1 - bx0), h * 0.84 / (by1 - by0));
    const ox = w / 2 - (bx0 + bx1) / 2 * S, oy = h / 2 - (by0 + by1) / 2 * S;
    const P = (u, v, z = 0) => [ox + (u + v) * C * S, oy + ((u - v) * Sn - z) * S];

    const reset = () => ctx.setTransform(1, 0, 0, 1, 0, 0);
    const floorT = () => ctx.setTransform(C * S, Sn * S, C * S, -Sn * S, ox, oy);
    const vzT = u0 => ctx.setTransform(C * S, -Sn * S, 0, -S, ox + u0 * C * S, oy + u0 * Sn * S);
    const uzT = v0 => ctx.setTransform(C * S, Sn * S, 0, -S, ox + v0 * C * S, oy - v0 * Sn * S);
    const rr = (x, y, ww, hh, rad) => { ctx.beginPath(); ctx.roundRect(x, y, ww, hh, rad); };
    const stroke = (color, width = lw, dash) => {
      reset(); ctx.setLineDash(dash ? dash.map(d => d * dpr) : []);
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke(); ctx.setLineDash([]);
    };
    const floorLine = (pts, color, width = lw, dash) => {
      reset(); ctx.beginPath();
      pts.forEach((p, i) => { const q = P(p[0], p[1]); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); });
      stroke(color, width, dash);
    };
    const len = pts => pts.reduce((L, p, i) => i ? L + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0, 0);
    const upTo = (pts, d) => {
      const out = [pts[0]]; let acc = 0;
      for (let i = 1; i < pts.length; i++) {
        const [a, b] = [pts[i - 1], pts[i]], sl = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (acc + sl >= d) { const f = (d - acc) / sl; out.push([lerp(a[0], b[0], f), lerp(a[1], b[1], f)]); return out; }
        acc += sl; out.push(b);
      }
      return out;
    };

    /* signing paths: leaf → root */
    const sPath = k => [[su(k), LV], [su(k), 0], [0, 0]];
    const fPath = j => {
      const pts = [[lu(D), lv(D, j)]]; let i = j;
      for (let l = D; l >= 1; l--) {
        const um = (lu(l) + lu(l - 1)) / 2, pi = i >> 1;
        pts.push([um, lv(l, i)], [um, lv(l - 1, pi)], [lu(l - 1), lv(l - 1, pi)]); i = pi;
      }
      pts.push([0, 0]); return pts;
    };

    /* timeline */
    const SPEED = 6.5, ev = [];
    let T = 0.5;
    for (let k = 0; k < N; k++) {
      const pts = sPath(k), L = len(pts);
      ev.push({ fb: false, k, pts, L, start: T, travel: L / SPEED }); T += 0.35 + L / SPEED + 0.55;
    }
    for (const j of [5, 2]) {
      const pts = fPath(j), L = len(pts);
      ev.push({ fb: true, k: j, pts, L, start: T, travel: L / SPEED }); T += 0.35 + L / SPEED + 0.75;
    }
    const RESET = T, PERIOD = T + 1.4;
    if (t == null) t = ev[4].start + .25 + ev[4].travel * .6;          // still frame
    const tt = ((t % PERIOD) + PERIOD) % PERIOD;
    const resetF = clamp((tt - RESET) / 1.2);
    const glowOf = e => clamp((tt - e.start) / .3) * (1 - clamp((tt - (e.start + .35 + e.travel + .45)) / .6));
    const headOf = e => clamp((tt - e.start - .25) / e.travel);
    const arrive = e => e.start + .25 + e.travel;

    const COOL = ["#5a33ff", "#27b4ff", "#8affd8"], COOL_RGB = "60,170,255";
    const HOT = ["#ff2fb3", "#a34dff", "#ffc2f2"], HOT_RGB = "214,80,255";

    /* ground */
    ground(ctx, w, h, [[.3, .35, .55, "60,170,255", .46], [.76, .66, .52, "214,80,255", .42], [.55, .15, .38, "90,51,255", .3]], t);

    /* trays */
    const tray = (u0, v0, u1, v1, k) => {
      floorT(); rr(u0, v0, u1 - u0, v1 - v0, .9);
      reset(); ctx.fillStyle = `rgba(255,255,255,${.04 * k})`; ctx.fill(); stroke(`rgba(255,255,255,${.36 * k})`);
      floorT(); rr(u0 - .25, v0 - .25, u1 - u0 + .5, v1 - v0 + .5, 1.15); stroke(`rgba(255,255,255,${.13 * k})`);
    };
    tray(U0 - .75, -.45, su(N - 1) + .75, LV + LW + .4, 1);
    tray(lu(D) - 1.05, -HALFV - .45, RU + .45, HALFV + .45, .8);

    /* dotted guide rails running off both ends */
    for (const v of [-1.15, LV + LW + 1.15]) floorLine([[U0 - .75, v], [U0 + 60, v]], "rgba(255,255,255,.28)", lw, [1, 4]);
    for (const v of [-HALFV - 1.15, HALFV + 1.15]) floorLine([[RU + .45, v], [RU - 60, v]], "rgba(255,255,255,.28)", lw, [1, 4]);

    /* edges */
    floorLine([[su(N - 1), 0], [su(N - 1) + 40, 0]], "rgba(255,255,255,.22)", lw, [1, 4]);
    floorLine([[RU, 0], [su(N - 1), 0]], "rgba(255,255,255,.45)");
    for (let k = 0; k < N; k++) floorLine([[su(k), 0], [su(k), LV]], "rgba(255,255,255,.38)");
    for (let l = 1; l <= D; l++) {
      const um = (lu(l) + lu(l - 1)) / 2;
      for (let pi = 0; pi < 2 ** (l - 1); pi++) {
        floorLine([[lu(l), lv(l, 2 * pi)], [um, lv(l, 2 * pi)], [um, lv(l, 2 * pi + 1)], [lu(l), lv(l, 2 * pi + 1)]], "rgba(255,255,255,.24)");
        floorLine([[um, lv(l - 1, pi)], [lu(l - 1), lv(l - 1, pi)]], "rgba(255,255,255,.24)");
      }
    }
    const node = (u, v, s, a) => { floorT(); ctx.beginPath(); ctx.rect(u - s / 2, v - s / 2, s, s); reset(); ctx.fillStyle = "#111214"; ctx.fill(); stroke(`rgba(255,255,255,${a})`); };
    for (let k = 0; k < N; k++) node(su(k), 0, .17, .6);
    for (let l = 0; l < D; l++) for (let i = 0; i < 2 ** l; i++) node(lu(l), lv(l, i), .12, .38);

    /* pulses climbing to the root */
    ev.forEach(e => {
      const hd = headOf(e), fade = 1 - clamp((tt - arrive(e) - .1) / .7);
      if (hd <= 0 || fade <= 0) return;
      const rgb = e.fb ? HOT_RGB : COOL_RGB;
      const sub = upTo(e.pts, hd * e.L);
      ctx.save(); ctx.shadowColor = `rgba(${rgb},1)`; ctx.shadowBlur = S * .3;
      floorLine(sub, `rgba(${rgb},${.85 * fade})`, lw * 2); ctx.restore();
      if (hd < 1) {
        const q = P(...sub[sub.length - 1]);
        const g = ctx.createRadialGradient(q[0], q[1], 0, q[0], q[1], S * .8);
        g.addColorStop(0, `rgba(${rgb},.8)`); g.addColorStop(1, `rgba(${rgb},0)`);
        ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = g; ctx.fillRect(q[0] - S, q[1] - S, S * 2, S * 2);
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(q[0], q[1], lw * 2.2, 0, Math.PI * 2); ctx.fill();
      }
    });

    /* light pooling under lit leaves */
    ev.forEach(e => {
      const g = glowOf(e); if (g <= .01) return;
      const [cu, cv, rad] = e.fb ? [lu(D) - .5, lv(D, e.k), 1.3] : [su(e.k), LV + LW / 2, 2.3];
      const rgb = e.fb ? HOT_RGB : COOL_RGB;
      floorT();
      const fg = ctx.createRadialGradient(cu, cv, 0, cu, cv, rad);
      fg.addColorStop(0, `rgba(${rgb},${.42 * g})`); fg.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(cu, cv, rad, 0, Math.PI * 2); ctx.fill();
      reset();
    });

    /* root flash */
    let flash = 0, flashRgb = COOL_RGB;
    ev.forEach(e => { const f = tt > arrive(e) ? Math.exp(-(tt - arrive(e)) * 3.2) : 0; if (f > flash) { flash = f; flashRgb = e.fb ? HOT_RGB : COOL_RGB; } });
    floorT();
    const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, 1.6);
    rg.addColorStop(0, `rgba(${flashRgb},${.5 * flash})`); rg.addColorStop(1, `rgba(${flashRgb},0)`);
    ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(0, 0, 1.6, 0, Math.PI * 2); ctx.fill();
    reset();

    const fillGrad = (a, b, cols, g, rgb) => {
      const gr = ctx.createLinearGradient(a[0], a[1], b[0], b[1]);
      gr.addColorStop(0, cols[0]); gr.addColorStop(.5, cols[1]); gr.addColorStop(1, cols[2]);
      ctx.save(); ctx.shadowColor = `rgba(${rgb},.9)`; ctx.shadowBlur = S * .8 * g;
      ctx.globalAlpha = .92 * g; ctx.fillStyle = gr; ctx.fill(); ctx.restore();
    };

    /* stateless leaves — small cards facing along the tree (back to front) */
    for (let j = 2 ** D - 1; j >= 0; j--) {
      const v = lv(D, j), u0 = lu(D) - .85;
      uzT(v); rr(u0, .1, .7, .8, .18);
      reset(); ctx.fillStyle = "rgba(255,255,255,.035)"; ctx.fill();
      const e = ev.find(x => x.fb && x.k === j), g = e ? glowOf(e) : 0;
      if (g > 0) fillGrad(P(u0, v, .1), P(u0 + .7, v, .9), HOT, g, HOT_RGB);
      stroke(`rgba(255,255,255,${.38 + .45 * g})`);
    }

    /* root: the public key */
    vzT(0); rr(-1.03, -.03, 2.06, 1.96, .55); stroke("rgba(255,255,255,.2)");
    vzT(0); rr(-.85, .15, 1.7, 1.6, .45);
    reset(); ctx.fillStyle = "rgba(255,255,255,.06)"; ctx.fill();
    if (flash > .01) fillGrad(P(0, -.85, .15), P(0, .85, 1.75), flashRgb === HOT_RGB ? HOT : COOL, flash * .9, flashRgb);
    stroke(`rgba(255,255,255,${.7 + .3 * flash})`, lw * 1.1);

    /* stateful leaves — consumed in order */
    for (let k = 0; k < N; k++) {
      const e = ev[k], g = glowOf(e);
      const used = (tt >= e.start ? 1 : 0) * (1 - resetF);
      vzT(su(k)); rr(LV, .2, LW, LH, LR);
      reset(); ctx.fillStyle = `rgba(255,255,255,${lerp(.025, .055, used)})`; ctx.fill();
      if (g > 0) fillGrad(P(su(k), LV, .2), P(su(k), LV + LW, LH + .2), COOL, g, COOL_RGB);
      stroke(`rgba(255,255,255,${lerp(.26, .62, used) + .3 * g})`, lw, used < .5 && g === 0 ? [2, 3] : null);
    }

    /* bloom */
    ctx.globalCompositeOperation = "lighter";
    ev.forEach(e => {
      const g = glowOf(e); if (g <= .01) return;
      const c = e.fb ? P(lu(D) - .5, lv(D, e.k), .4) : P(su(e.k), LV + LW / 2, LH / 2 + .2);
      const rgb = e.fb ? HOT_RGB : COOL_RGB;
      const b = ctx.createRadialGradient(c[0], c[1], 0, c[0], c[1], S * 3);
      b.addColorStop(0, `rgba(${rgb},${.2 * g})`); b.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = b; ctx.fillRect(0, 0, w, h);
    });
    ctx.globalCompositeOperation = "source-over";
  },
};

/* ---------------------------------------------------------------
   Runner: size each canvas to its box, redraw on-screen ones ~30 times a second
---------------------------------------------------------------- */
const artReduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const artVisible = new Set();
const artWatch = new IntersectionObserver(entries => entries.forEach(e => {
  e.isIntersecting ? artVisible.add(e.target) : artVisible.delete(e.target);
}));

function paintArt(canvas, t) {
  const box = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.round(box.width * ART_LINE_SCALE)), h = Math.max(1, Math.round(box.height * ART_LINE_SCALE));
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ART[canvas._art](ctx, w, h, rng(canvas._seed), t);
  grain(ctx);
}

/* Old-TV flicker: now and then a picture flashes, dips, rolls, slips sideways or fills with
   static for a split second (sometimes twice). The look itself is .tv in screen.css. */
const FLICKERS = ["flash", "dim", "roll", "slip", "static"];
const artRand = (a, b) => a + Math.random() * (b - a);
{
  // one tile of static, shared by every picture
  const s = document.createElement("canvas"); s.width = s.height = 96;
  const sx = s.getContext("2d"), img = sx.createImageData(96, 96);
  for (let i = 0; i < img.data.length; i += 4) {
    img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.random() * 255; img.data[i + 3] = 255;
  }
  sx.putImageData(img, 0, 0);
  document.documentElement.style.setProperty("--tv-static", `url(${s.toDataURL()})`);
}

function flicker(canvas, kind = FLICKERS[Math.random() * FLICKERS.length | 0], again = Math.random() < 0.3) {
  const tv = canvas.parentElement;
  const sign = Math.random() < 0.5 ? -1 : 1;
  tv.style.setProperty("--shift", kind === "roll" ? `${sign * artRand(4, 14)}%` : `${sign * artRand(6, 18)}px`);
  tv.dataset.flicker = kind;
  setTimeout(() => {
    delete tv.dataset.flicker;
    if (again) setTimeout(() => flicker(canvas, kind, false), artRand(50, 140));
  }, artRand(60, 220));
}

// name: a key of ART; seed: the article id, so pieces with random parts match the original
function mountArt(canvas, name, seed) {
  canvas._art = name; canvas._seed = seed;
  canvas.parentElement.classList.add("tv");
  canvas._nextFlicker = performance.now() + artRand(2000, 12000);
  paintArt(canvas);                              // still frame straight away
  if (!artReduceMotion) artWatch.observe(canvas);
}

// each picture flickers every 4-12 s, but the page as a whole waits 1.5-3 s between flickers,
// so a grid of pictures doesn't flicker constantly
let artLast = 0, artNextAny = 0;
requestAnimationFrame(function artFrame(now) {
  if (now - artLast > 33) {
    artLast = now;
    artVisible.forEach(c => {
      if (!c.isConnected) return;
      paintArt(c, now / 1000);
      if (now > c._nextFlicker && now > artNextAny) {
        flicker(c);
        c._nextFlicker = now + artRand(4000, 12000);
        artNextAny = now + artRand(1500, 3000);
      }
    });
  }
  requestAnimationFrame(artFrame);
});
