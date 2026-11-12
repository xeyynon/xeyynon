// Builds the profile README's images in the language of the portfolio's v3
// (the Golden Snitch version): the Snitch with the name and the three words,
// the six areas as one line branching into six with a cut stone at each end,
// the three link keys, and the About card.
//
// Run: node scripts/build-v3.mjs   (glyphs come from scripts/extract-glyphs.py)
//
// Every image is an opaque dark card (GitHub's app always reports light
// theme), drawn on a 900-wide canvas for desktop and a 360-wide one for
// phones, with a still version of anything that moves for reduced motion.
// Pure SVG: no script, no fonts to load, no external images.
import { readFileSync, writeFileSync } from "node:fs";

const OUT = new URL("../assets/", import.meta.url);
const GLYPHS = JSON.parse(readFileSync(new URL("./fonts/glyphs.json", import.meta.url), "utf8"));

// ---- Tokens: the portfolio's own (app/globals.css, app/redesign.css) --------

const C = {
  bg: "#0B0C0F",
  card: "#111318",
  ink: "#F2F0E9",
  muted: "#B3B5BF",
  line: "#24262C",
  gold: "#D8A94A",
  goldLight: "#FFE7B3",
  giltMid: "#A87322",
  giltDeep: "#5E3D0C",
  giltEdge: "#2A1904",
};
// The six areas, first lowest, as on the site.
const AREAS = [
  { label: "AI / ML", color: "#9B7EDE" },
  { label: "Mobile", color: "#7B93E0" },
  { label: "Web & Backend", color: "#4FD8E0" },
  { label: "Cloud & DevOps", color: "#6FE07D" },
  { label: "Languages", color: "#F2A65A" },
  { label: "Hardware", color: "#E8536B" },
];

const r2 = (n) => Math.round(n * 100) / 100;

// ---- Colour mixing (sRGB, like CSS color-mix) --------------------------------

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (rgb) => "#" + rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("").toUpperCase();
/** `a` at `p` (0..1), the rest `b`. */
const mix = (a, p, b) => {
  const A = hex(a);
  const B = hex(b);
  return toHex(A.map((v, i) => v * p + B[i] * (1 - p)));
};

// ---- Lettering: glyph outlines placed with <use>, so each shape is stored once

function makeText() {
  const used = new Map(); // id -> d
  const id = (face, ch) => `g-${face}-${ch.codePointAt(0).toString(16)}`;
  const width = (str, face, size, track = 0) => {
    const f = GLYPHS[face];
    const k = size / f.unitsPerEm;
    let w = 0;
    for (const ch of str) w += (f.glyphs[ch === " " ? " " : ch]?.adv ?? f.glyphs[" "].adv) * k + track;
    return w - track;
  };
  /** One line of text as <use> elements. `y` is the baseline. */
  const line = (str, { face, size, x, y, anchor = "start", track = 0, fill, cls = "" }) => {
    const f = GLYPHS[face];
    const k = size / f.unitsPerEm;
    const w = width(str, face, size, track);
    let cx = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x;
    let out = "";
    for (const ch of str) {
      const g = f.glyphs[ch === " " ? " " : ch] ?? f.glyphs[" "];
      if (g.d) {
        const gid = id(face, ch);
        used.set(gid, g.d);
        out += `<use href="#${gid}" transform="translate(${r2(cx)} ${r2(y)}) scale(${r2(k * 1000) / 1000} ${-r2(k * 1000) / 1000})"/>`;
      }
      cx += g.adv * k + track;
    }
    return `<g${fill ? ` fill="${fill}"` : ""}${cls ? ` class="${cls}"` : ""}>${out}</g>`;
  };
  /** Wraps `str` to lines no wider than `max`. */
  const wrap = (str, face, size, max) => {
    // a no-break space keeps its neighbours together, and is drawn as a space
    const words = str.split(" ");
    const lines = [];
    let cur = "";
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (width(next, face, size) > max && cur) {
        lines.push(cur);
        cur = w;
      } else cur = next;
    }
    if (cur) lines.push(cur);
    return lines;
  };
  const defs = () => [...used].map(([gid, d]) => `<path id="${gid}" d="${d}"/>`).join("");
  return { line, width, wrap, defs };
}

// ---- The cut stone (port of the portfolio's lib/gemCut.ts) -------------------

function gemCut() {
  const n = 8;
  const step = (Math.PI * 2) / n;
  const a0 = -Math.PI / 2 + step / 2;
  const at = (r, a) => ({ x: r * Math.cos(a), y: r * Math.sin(a) });
  const T = Array.from({ length: n }, (_, k) => at(0.46, a0 + k * step));
  const S = Array.from({ length: n }, (_, k) => at(0.74, a0 + (k + 0.5) * step));
  const G = Array.from({ length: n }, (_, k) => at(1, a0 + k * step));
  const H = Array.from({ length: n }, (_, k) => at(1, a0 + (k + 0.5) * step));
  const LIGHT = { x: -0.6, y: -0.8 };
  const shade = (ps, tilt, k) => {
    const cx = ps.reduce((s, p) => s + p.x, 0) / ps.length;
    const cy = ps.reduce((s, p) => s + p.y, 0) / ps.length;
    const len = Math.hypot(cx, cy) || 1;
    const facing = (cx / len) * LIGHT.x + (cy / len) * LIGHT.y;
    return Math.min(1, Math.max(0, 0.5 + facing * tilt + (k % 2 ? 0.1 : -0.06)));
  };
  const facets = [];
  for (let k = 0; k < n; k++) {
    const nx = (k + 1) % n;
    const pv = (k + n - 1) % n;
    const star = [T[k], T[nx], S[k]];
    const kite = [T[k], S[pv], G[k], S[k]];
    const ua = [S[k], G[k], H[k]];
    const ub = [S[k], H[k], G[nx]];
    facets.push({ ps: star, s: shade(star, 0.35, k) }, { ps: kite, s: shade(kite, 0.5, k + 1) }, { ps: ua, s: shade(ua, 0.62, k) }, { ps: ub, s: shade(ub, 0.62, k + 1) });
  }
  return { facets, table: T, rim: G.flatMap((g, k) => [g, H[k]]) };
}
const CUT = gemCut();
const pts = (ps, x, y, r) => ps.map((p) => `${r2(x + p.x * r)},${r2(y + p.y * r)}`).join(" ");
const facetFill = (color, s) =>
  s >= 0.5 ? mix(color, 1 - (s - 0.5) * 2 * 0.42, C.ink) : mix(color, 1 - (0.5 - s) * 2 * 0.62, C.bg);

/** A cut stone of radius `r` at (x, y), in its gold setting. */
function stone(x, y, r, color, { glow = true } = {}) {
  const edge = mix(color, 0.45, C.ink);
  let s = "";
  if (glow) s += `<circle cx="${r2(x)}" cy="${r2(y)}" r="${r2(r * 1.9)}" fill="url(#halo-${color.slice(1)})"/>`;
  s += `<circle cx="${r2(x)}" cy="${r2(y)}" r="${r2(r + 2.2)}" fill="${C.giltEdge}"/>`;
  s += `<circle cx="${r2(x)}" cy="${r2(y)}" r="${r2(r + 1.4)}" fill="none" stroke="${C.gold}" stroke-width="1.3"/>`;
  s += `<polygon points="${pts(CUT.rim, x, y, r)}" fill="${mix(color, 0.4, C.bg)}"/>`;
  s += `<g stroke="${edge}" stroke-opacity="0.35" stroke-width="0.4" stroke-linejoin="round">`;
  for (const f of CUT.facets) s += `<polygon points="${pts(f.ps, x, y, r)}" fill="${facetFill(color, f.s)}"/>`;
  s += `<polygon points="${pts(CUT.table, x, y, r)}" fill="${facetFill(color, 0.7)}"/></g>`;
  const gx = x - r * 0.42;
  const gy = y - r * 0.38;
  const q = r * 0.24;
  s += `<path d="M${r2(gx)} ${r2(gy - q)} L${r2(gx + q * 0.25)} ${r2(gy - q * 0.25)} L${r2(gx + q)} ${r2(gy)} L${r2(gx + q * 0.25)} ${r2(gy + q * 0.25)} L${r2(gx)} ${r2(gy + q)} L${r2(gx - q * 0.25)} ${r2(gy + q * 0.25)} L${r2(gx - q)} ${r2(gy)} L${r2(gx - q * 0.25)} ${r2(gy - q * 0.25)} Z" fill="${C.ink}"/>`;
  return s;
}
const haloDefs = () =>
  AREAS.map(
    (a) =>
      `<radialGradient id="halo-${a.color.slice(1)}"><stop offset="0.45" stop-color="${a.color}" stop-opacity="0.45"/><stop offset="1" stop-color="${a.color}" stop-opacity="0"/></radialGradient>`,
  ).join("");

// ---- Shared card ------------------------------------------------------------

const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function svg(w, h, { title: raw, body, defs = "", style = "" }) {
  const title = esc(raw);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${title}">
<title>${title}</title>
<defs>${defs}</defs>
${style ? `<style>${style}</style>` : ""}
<rect width="${w}" height="${h}" rx="18" fill="${C.bg}"/>
<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="17.5" fill="none" stroke="${C.line}"/>
${body}
</svg>
`;
}
const REDUCED = `@media (prefers-reduced-motion: reduce){*{animation:none!important}}`;

// Deterministic randomness, so builds are stable.
function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ---- 1. The hero: the Snitch, the name, the three words -------------------------

function snitch(cx, cy, R, animated, spanK = 5.2) {
  // Wing: a curved spine from the joint up and out, ribs hanging from it,
  // a thin glass membrane between. Drawn for the right side; mirrored.
  const span = R * spanK;
  const joint = { x: R * 0.96, y: -R * 0.18 };
  const tip = { x: joint.x + span, y: -R * 1.7 };
  const bend = { x: joint.x + span * 0.5, y: R * 0.15 };
  const at = (t) => {
    const u = 1 - t;
    return { x: u * u * joint.x + 2 * u * t * bend.x + t * t * tip.x, y: u * u * joint.y + 2 * u * t * bend.y + t * t * tip.y };
  };
  let ribs = "";
  let membrane = `M${r2(joint.x)} ${r2(joint.y)}`;
  const lower = [];
  const N = 26;
  for (let i = 1; i <= N; i++) {
    const t = i / (N + 1);
    const p = at(t);
    const reach = R * 1.15 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.62)), 0.9);
    const end = { x: p.x - reach * 0.32, y: p.y + reach };
    ribs += `M${r2(p.x)} ${r2(p.y)} L${r2(end.x)} ${r2(end.y)} `;
    lower.push(end);
  }
  membrane += ` Q${r2(bend.x)} ${r2(bend.y)} ${r2(tip.x)} ${r2(tip.y)}`;
  for (let i = lower.length - 1; i >= 0; i--) membrane += ` L${r2(lower[i].x)} ${r2(lower[i].y)}`;
  membrane += " Z";
  const spine = `M${r2(joint.x)} ${r2(joint.y)} Q${r2(bend.x)} ${r2(bend.y)} ${r2(tip.x)} ${r2(tip.y)}`;
  const wing = `<g class="wing">
    <path d="${membrane}" fill="url(#sail)"/>
    <path d="${ribs}" stroke="url(#rib)" stroke-width="${r2(R * 0.035)}" stroke-linecap="round"/>
    <path d="${spine}" fill="none" stroke="${C.ink}" stroke-width="${r2(R * 0.075)}" stroke-linecap="round"/>
    <path d="${spine}" fill="none" stroke="url(#film)" stroke-width="${r2(R * 0.05)}" stroke-linecap="round" opacity="0.8"/>
  </g>`;
  // The ball: gold, engraved bands, an equator seam, a glint that sweeps.
  const bands = [
    `M${-R} ${-R * 0.1} C${-R * 0.4} ${-R * 0.55} ${R * 0.4} ${-R * 0.55} ${R} ${-R * 0.1}`,
    `M${-R * 0.92} ${R * 0.38} C${-R * 0.3} ${R * 0.05} ${R * 0.35} ${R * 0.62} ${R * 0.9} ${R * 0.3}`,
    `M${-R * 0.55} ${-R * 0.8} C${-R * 0.1} ${-R * 0.55} ${R * 0.25} ${-R * 0.95} ${R * 0.6} ${-R * 0.76}`,
    `M${-R * 0.7} ${R * 0.72} C${-R * 0.2} ${R * 0.95} ${R * 0.3} ${R * 0.7} ${R * 0.62} ${R * 0.8}`,
  ]
    .map((d) => `<path d="${d}" fill="none" stroke="${C.giltDeep}" stroke-width="${r2(R * 0.06)}" stroke-linecap="round" opacity="0.75"/>`)
    .join("");
  const ball = `<g>
    <circle r="${R * 2.1}" fill="url(#aura)"/>
    <circle r="${R}" fill="url(#ball)"/>
    <g clip-path="url(#ballClip)">
      ${bands}
      <path d="M${-R} ${R * 0.05} C${-R * 0.35} ${R * 0.28} ${R * 0.35} ${R * 0.28} ${R} ${R * 0.05}" fill="none" stroke="${C.giltEdge}" stroke-width="${r2(R * 0.05)}"/>
      <ellipse class="glint" cx="${-R * 0.38}" cy="${-R * 0.42}" rx="${R * 0.34}" ry="${R * 0.2}" fill="${C.goldLight}" opacity="0.9" transform="rotate(-28 ${-R * 0.38} ${-R * 0.42})"/>
      <circle cx="${-R * 0.46}" cy="${-R * 0.5}" r="${R * 0.07}" fill="#FFFFFF"/>
    </g>
    <circle r="${R}" fill="none" stroke="${C.giltEdge}" stroke-width="0.8" opacity="0.6"/>
    <circle cx="${r2(joint.x)}" cy="${r2(joint.y)}" r="${r2(R * 0.13)}" fill="url(#joint)"/>
    <circle cx="${r2(-joint.x)}" cy="${r2(joint.y)}" r="${r2(R * 0.13)}" fill="url(#joint)"/>
  </g>`;
  const defs = `
    <radialGradient id="ball" cx="0.35" cy="0.3" r="0.78"><stop offset="0" stop-color="${C.goldLight}"/><stop offset="0.32" stop-color="${C.gold}"/><stop offset="0.75" stop-color="${C.giltMid}"/><stop offset="1" stop-color="${C.giltDeep}"/></radialGradient>
    <radialGradient id="joint" cx="0.35" cy="0.3"><stop offset="0" stop-color="${C.goldLight}"/><stop offset="1" stop-color="${C.giltMid}"/></radialGradient>
    <radialGradient id="aura"><stop offset="0.45" stop-color="${C.gold}" stop-opacity="0.22"/><stop offset="1" stop-color="${C.gold}" stop-opacity="0"/></radialGradient>
    <clipPath id="ballClip"><circle r="${R}"/></clipPath>
    <linearGradient id="sail" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.ink}" stop-opacity="0.34"/><stop offset="0.6" stop-color="#9FB4FF" stop-opacity="0.12"/><stop offset="1" stop-color="${C.ink}" stop-opacity="0.04"/></linearGradient>
    <linearGradient id="rib" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.ink}" stop-opacity="0.9"/><stop offset="1" stop-color="${C.ink}" stop-opacity="0.55"/></linearGradient>
    <linearGradient id="film" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7FE3FF"/><stop offset="0.5" stop-color="#E7A6FF"/><stop offset="1" stop-color="#FFE29A"/></linearGradient>`;
  const flap = animated ? ` class="flapR"` : "";
  const flapL = animated ? ` class="flapL"` : "";
  return {
    defs,
    body: `<g transform="translate(${cx} ${cy})"><g class="${animated ? "hover" : ""}">
      <g${flapL} style="transform-origin:${r2(-joint.x)}px ${r2(joint.y)}px"><g transform="scale(-1 1)">${wing}</g></g>
      <g${flap} style="transform-origin:${r2(joint.x)}px ${r2(joint.y)}px">${wing}</g>
      ${ball}
    </g></g>`,
  };
}

function hero({ w, h, animated, phone }) {
  const T = makeText();
  const r = rng(11);
  let stars = "";
  for (let i = 0; i < (phone ? 34 : 70); i++) {
    const x = r2(r() * w);
    const y = r2(r() * h * 0.92);
    const s = r2(0.4 + r() * 1.1);
    const tw = animated && i % 4 === 0 ? ` class="tw" style="animation-delay:${r2(r() * 6)}s"` : "";
    stars += `<circle cx="${x}" cy="${y}" r="${s}" fill="${C.ink}" opacity="${r2(0.15 + r() * 0.45)}"${tw}/>`;
  }
  const R = phone ? 30 : 46;
  const sn = snitch(w / 2, phone ? 150 : 158, R, animated, phone ? 4.5 : 5);
  const nameY = phone ? 290 : 334;
  const name = T.line("SURYA PRATIK", { face: "display-700", size: phone ? 34 : 54, x: w / 2, y: nameY, anchor: "middle", track: phone ? 1.5 : 3, fill: C.ink });
  const words = ["Learning.", "Building.", "Improving."];
  const ws = phone ? 17 : 22;
  const gap = phone ? 9 : 12;
  const total = words.reduce((s, x) => s + T.width(x, "display-600", ws), 0) + gap * 2;
  let wx = w / 2 - total / 2;
  let wordEls = "";
  words.forEach((word, i) => {
    wordEls += T.line(word, { face: "display-600", size: ws, x: wx, y: nameY + (phone ? 40 : 52), fill: !animated && i === 0 ? C.gold : C.ink, cls: animated ? `word w${i}` : "" });
    wx += T.width(word, "display-600", ws) + gap;
  });
  const style = animated
    ? `.hover{animation:hover 5.2s ease-in-out infinite}
@keyframes hover{0%,100%{transform:translate(0,0)}25%{transform:translate(6px,-7px)}50%{transform:translate(0,-3px)}75%{transform:translate(-6px,-8px)}}
.flapR{animation:flapR .9s ease-in-out infinite}
.flapL{animation:flapL .9s ease-in-out infinite}
@keyframes flapR{0%,100%{transform:rotate(0)}50%{transform:rotate(-13deg) scaleY(.92)}}
@keyframes flapL{0%,100%{transform:rotate(0)}50%{transform:rotate(13deg) scaleY(.92)}}
.glint{animation:glint 4s ease-in-out infinite}
@keyframes glint{0%,100%{transform:translate(0,0) rotate(-28deg);transform-box:fill-box;transform-origin:center}50%{transform:translate(${R * 0.55}px,${R * 0.1}px) rotate(-28deg);transform-box:fill-box;transform-origin:center}}
.tw{animation:tw 4.5s ease-in-out infinite}
@keyframes tw{0%,100%{opacity:.15}50%{opacity:.8}}
.word{fill:${C.ink};animation:light 9s ease-in-out infinite}
.w1{animation-delay:3s}.w2{animation-delay:6s}
@keyframes light{0%,100%{fill:${C.ink}}5%,28%{fill:${C.gold}}36%{fill:${C.ink}}}
${REDUCED}`
    : "";
  return svg(w, h, {
    title: "Surya Pratik. A Golden Snitch with glass wings above the name, and three words: Learning. Building. Improving.",
    defs: sn.defs + T.defs(),
    style,
    body: `<g>${stars}</g>${sn.body}${name}${wordEls}`,
  });
}

// ---- 2. One line branching into six -----------------------------------------------

function branches({ w, h, animated, phone }) {
  const T = makeText();
  const top = phone ? 64 : 58;
  const bottom = h - (phone ? 26 : 30);
  const Hd = bottom - top;
  const midY = (top + bottom) / 2;
  const labelW = phone ? 128 : 190;
  const endX = w - labelW - (phone ? 18 : 36);
  const half = 1; // u runs -1..1 across 0..endX
  const smooth = (a, b, v) => {
    const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const SPLIT = [-0.62, -0.4, -0.18, -0.74, -0.52, -0.3];
  const t = 2.0;
  const lane = (i) => (i - 2.5) * 0.15;
  const yOf = (i, u) => {
    const x = u * 1.6; // the site's shader units across this width
    const trunk = 0.035 * Math.sin(x * 2.2 + t * 0.24);
    const amp = 0.045 + 0.012 * i;
    const own = (i - 2.5) * 0.115 + amp * Math.sin(x * (2.6 + i * 0.55) + t * (0.22 + 0.04 * i) + i * 1.7);
    const s = smooth(SPLIT[i], SPLIT[i] + 0.55, u / half);
    const settle = smooth(0.62, 1, u);
    const y = (trunk * (1 - s) + own * s) * (1 - settle) + lane(i) * settle;
    return midY - y * Hd;
  };
  const xOf = (u) => ((u + 1) / 2) * endX;
  const path = (fn, from = -1, to = 1) => {
    let d = "";
    const n = 56;
    for (let k = 0; k <= n; k++) {
      const u = from + ((to - from) * k) / n;
      d += `${k ? "L" : "M"}${r2(xOf(u))} ${r2(fn(u))} `;
    }
    return d.trim();
  };
  let curves = "";
  let lines = "";
  let pulses = "";
  let ends = "";
  const sw = phone ? 2 : 2.4;
  AREAS.forEach((a, i) => {
    // each curve stored once, drawn as a glow and a core (and a pulse) by reference
    curves += `<path id="b${i}" d="${path((u) => yOf(i, u))}"/>`;
    lines += `<use href="#b${i}" stroke="${a.color}" stroke-width="${sw * 4}" opacity="0.10"/>`;
    lines += `<use href="#b${i}" stroke="${a.color}" stroke-width="${sw}" opacity="0.85"/>`;
    if (animated) {
      pulses += `<path d="${path((u) => yOf(i, u))}" pathLength="100" stroke="${mix(a.color, 0.4, C.ink)}" stroke-width="${sw * 1.4}" stroke-dasharray="7 93" class="pulse" style="animation-delay:${r2(i * 0.7)}s"/>`;
    }
    const ey = yOf(i, 1);
    const sr = phone ? 7 : 9;
    ends += stone(endX + sr + 6, ey, sr, a.color);
    ends += T.line(a.label, { face: "display-600", size: phone ? 13 : 17, x: endX + sr * 2 + 16, y: ey + (phone ? 4.5 : 6), fill: C.ink });
  });
  // Strands that cross from one branch to another.
  const LINKS = [
    { a: 0, b: 1, at: 0.08 },
    { a: 3, b: 5, at: 0.02 },
    { a: 2, b: 4, at: 0.36 },
    { a: 1, b: 3, at: 0.5 },
  ];
  let strands = "";
  for (const L of LINKS) {
    const d = path((u) => {
      const m = smooth(L.at, L.at + 0.28, u);
      return yOf(L.a, u) * (1 - m) + yOf(L.b, u) * m;
    }, L.at, L.at + 0.28);
    strands += `<path d="${d}" stroke="${AREAS[L.b].color}" stroke-width="${phone ? 1.2 : 1.5}" opacity="0.5"/>`;
  }
  // The trunk, where all six still run together: near white.
  const trunkD = path((u) => yOf(0, u), -1, -0.66);
  const trunk = `<path d="${trunkD}" stroke="${C.ink}" stroke-width="${sw * 5}" opacity="0.12"/><path d="${trunkD}" stroke="${C.ink}" stroke-width="${sw * 1.2}" opacity="0.9"/>`;
  const title = T.line("SIX AREAS OF WORK · ONE BRANCH EACH", { face: "mono-500", size: phone ? 10 : 12, x: phone ? 18 : 30, y: phone ? 30 : 34, track: phone ? 1.4 : 2.2, fill: C.muted });
  const style = animated
    ? `.pulse{stroke-dashoffset:100;animation:run 4.2s cubic-bezier(.5,0,.3,1) infinite}
@keyframes run{0%{stroke-dashoffset:100;opacity:0}10%{opacity:1}85%{opacity:1}100%{stroke-dashoffset:0;opacity:0}}
${REDUCED}`
    : "";
  return svg(w, h, {
    title: `Six areas of work, one branch each: one line splits into ${AREAS.map((a) => a.label).join(", ")}.`,
    defs: haloDefs() + curves + T.defs(),
    style,
    body: `${title}<g fill="none" stroke-linecap="round" stroke-linejoin="round">${strands}${lines}${trunk}${pulses}</g>${ends}`,
  });
}

// ---- 3. Link keys -----------------------------------------------------------------------

function miniBall(x, y, r) {
  return `<circle cx="${x}" cy="${y}" r="${r * 1.9}" fill="url(#kaura)"/><circle cx="${x}" cy="${y}" r="${r}" fill="url(#kball)"/><ellipse cx="${x - r * 0.35}" cy="${y - r * 0.4}" rx="${r * 0.32}" ry="${r * 0.2}" fill="${C.goldLight}" opacity="0.9"/>`;
}
const keyDefs = `<radialGradient id="kball" cx="0.35" cy="0.3" r="0.78"><stop offset="0" stop-color="${C.goldLight}"/><stop offset="0.35" stop-color="${C.gold}"/><stop offset="1" stop-color="${C.giltDeep}"/></radialGradient><radialGradient id="kaura"><stop offset="0.4" stop-color="${C.gold}" stop-opacity="0.3"/><stop offset="1" stop-color="${C.gold}" stop-opacity="0"/></radialGradient><linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.ink}" stop-opacity="0.07"/><stop offset="0.5" stop-color="${C.ink}" stop-opacity="0"/></linearGradient>`;

function key({ label, value, phone }) {
  const T = makeText();
  if (phone) {
    const w = 120;
    const h = 64;
    // the body first: the glyphs it uses are only known once it is laid out
    const body = `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="17" fill="url(#sheen)"/>${miniBall(22, 32, 6)}${T.line(label, { face: "display-600", size: 15, x: 36, y: 37, fill: C.ink })}`;
    return svg(w, h, { title: label, defs: keyDefs + T.defs(), body });
  }
  const w = 280;
  const h = 76;
  const body = `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="17" fill="url(#sheen)"/>
${miniBall(32, 38, 8)}
${T.line(label.toUpperCase(), { face: "mono-500", size: 10.5, x: 54, y: 31, track: 2, fill: C.muted })}
${T.line(value, { face: "display-600", size: value.length > 22 ? 14.5 : 17, x: 54, y: 53, fill: C.ink })}`;
  return svg(w, h, { title: `${label}: ${value}`, defs: keyDefs + T.defs(), body });
}

// ---- 4. About: glass tiles ----------------------------------------------------------------

const ABOUT = [
  { label: "Now", value: "Embedded Engineer Intern", sub: "Alfaleus Technologies, Hyderabad" },
  { label: "Study", value: "B.Tech CSE", sub: "VIT-AP University · 2023 → 2027" },
  { label: "Led", value: "Microsoft Student Chapter", sub: "Best Student Chapter, Fall 2025" },
  { label: "From", value: "Bhilai", sub: "Chhattisgarh, India" },
];

function about({ phone }) {
  const T = makeText();
  const w = phone ? 360 : 900;
  const pad = phone ? 16 : 28;
  const cols = phone ? 2 : 4;
  const gap = phone ? 10 : 14;
  const tileW = (w - pad * 2 - gap * (cols - 1)) / cols;
  const vSize = phone ? 15 : 18;
  const sSize = phone ? 11 : 12.5;
  const tiles = ABOUT.map((t) => ({ ...t, lines: T.wrap(t.value, "display-600", vSize, tileW - 28), subs: T.wrap(t.sub, "display-400", sSize, tileW - 28) }));
  const rowH = Math.max(...tiles.map((t) => 42 + t.lines.length * (vSize + 4) + t.subs.length * (sSize + 5))) + 12;
  const rows = Math.ceil(tiles.length / cols);
  const head = phone ? 50 : 54;
  const h = head + rows * rowH + (rows - 1) * gap + pad;
  let body = T.line("ABOUT", { face: "mono-500", size: phone ? 10 : 12, x: pad, y: phone ? 32 : 36, track: 2.2, fill: C.muted });
  tiles.forEach((t, i) => {
    const x = pad + (i % cols) * (tileW + gap);
    const y = head + Math.floor(i / cols) * (rowH + gap);
    body += `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(tileW)}" height="${r2(rowH)}" rx="14" fill="${C.card}" stroke="${mix(C.ink, 0.09, C.bg)}"/>`;
    body += `<rect x="${r2(x + 1)}" y="${r2(y + 1)}" width="${r2(tileW - 2)}" height="${r2(rowH / 2)}" rx="13" fill="url(#sheen)"/>`;
    body += `<path d="M${r2(x + 14)} ${r2(y + 0.8)} H${r2(x + tileW - 14)}" stroke="${C.ink}" stroke-opacity="0.12"/>`;
    body += T.line(t.label.toUpperCase(), { face: "mono-500", size: phone ? 9.5 : 10.5, x: x + 14, y: y + 26, track: 2, fill: C.muted });
    let ly = y + 26 + vSize + 12;
    for (const ln of t.lines) {
      body += T.line(ln, { face: "display-600", size: vSize, x: x + 14, y: ly, fill: C.ink });
      ly += vSize + 4;
    }
    ly += 3;
    for (const ln of t.subs) {
      body += T.line(ln, { face: "display-400", size: sSize, x: x + 14, y: ly, fill: C.muted });
      ly += sSize + 5;
    }
  });
  return svg(w, Math.round(h), {
    title: `About. ${ABOUT.map((t) => `${t.label}: ${t.value}, ${t.sub}.`).join(" ")}`,
    defs: keyDefs + T.defs(),
    body,
  });
}

// ---- Write everything --------------------------------------------------------------------

const files = {
  "v3-hero.svg": hero({ w: 900, h: 450, animated: true }),
  "v3-hero-still.svg": hero({ w: 900, h: 450, animated: false }),
  "v3-hero-phone.svg": hero({ w: 360, h: 380, animated: true, phone: true }),
  "v3-hero-phone-still.svg": hero({ w: 360, h: 380, animated: false, phone: true }),
  "v3-branches.svg": branches({ w: 900, h: 330, animated: true }),
  "v3-branches-still.svg": branches({ w: 900, h: 330, animated: false }),
  "v3-branches-phone.svg": branches({ w: 360, h: 340, animated: true, phone: true }),
  "v3-branches-phone-still.svg": branches({ w: 360, h: 340, animated: false, phone: true }),
  "v3-key-portfolio.svg": key({ label: "Portfolio", value: "suryapratik.vercel.app" }),
  "v3-key-linkedin.svg": key({ label: "LinkedIn", value: "suryapratik" }),
  "v3-key-email.svg": key({ label: "Email", value: "pratiksurya1207@gmail.com" }),
  "v3-key-portfolio-phone.svg": key({ label: "Portfolio", phone: true }),
  "v3-key-linkedin-phone.svg": key({ label: "LinkedIn", phone: true }),
  "v3-key-email-phone.svg": key({ label: "Email", phone: true }),
  "v3-about.svg": about({ phone: false }),
  "v3-about-phone.svg": about({ phone: true }),
};
let total = 0;
for (const [name, content] of Object.entries(files)) {
  writeFileSync(new URL(name, OUT), content);
  total += content.length;
  console.log(name.padEnd(30), (content.length / 1024).toFixed(1), "KB");
}
console.log("total".padEnd(30), (total / 1024).toFixed(1), "KB");
