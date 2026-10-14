// Builds the oscilloscope hero: a graphite bench scope whose phosphor beam
// writes the signature in a Hershey single-stroke font, the lettering real
// vector displays used. Run: node scripts/build-scope.mjs
//
// Outputs four files for <picture>: desktop and phone, each animated and still.
// Pure SVG, no script, no external fonts: GitHub serves it through <img>.
import { readFileSync, writeFileSync } from "node:fs";

// ---- Hershey fonts (SVG font format, y up, cap height 662 units) -------------

function loadFont(file) {
  const src = readFileSync(new URL(`./hershey/${file}`, import.meta.url), "utf8");
  const glyphs = new Map();
  for (const m of src.matchAll(/<glyph unicode="([^"]+)"[^>]*?horiz-adv-x="([\d.]+)"(?:[^>]*?d="([^"]*)")?/g)) {
    const ch = m[1].replace("&quot;", '"').replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">").replace("&#x27;", "'");
    const strokes = [];
    for (const part of (m[3] || "").split("M").map((s) => s.trim()).filter(Boolean)) {
      const nums = part.replace(/L/g, " ").trim().split(/\s+/).map(Number);
      const pts = [];
      for (let i = 0; i + 1 < nums.length; i += 2) pts.push([nums[i], nums[i + 1]]);
      if (pts.length > 1) strokes.push(pts);
    }
    glyphs.set(ch, { adv: Number(m[2]), strokes });
  }
  return glyphs;
}
const SCRIPT = loadFont("HersheyScript1.svg");
const SANS = loadFont("HersheySans1.svg");
const CAP = 662;

/** Lays out text as pixel-space strokes. `size` is the cap height in px. */
function layout(text, font, { x, y, size, anchor = "start", track = 0 }) {
  const k = size / CAP;
  // Drawn by hand: the set has no middle dot, and its hyphen is so long it
  // reads as a dash.
  const SPECIAL = { "·": { adv: 340, half: 18, cy: 300 }, "-": { adv: 380, half: 95, cy: 300 } };
  const adv = (ch) => SPECIAL[ch]?.adv ?? (font.get(ch) ?? font.get(" ")).adv;
  let width = 0;
  for (const ch of text) width += (adv(ch) + track) * k;
  width -= track * k;
  let pen = anchor === "middle" ? x - width / 2 : anchor === "end" ? x - width : x;
  const strokes = [];
  for (const ch of text) {
    const sp = SPECIAL[ch];
    if (sp) {
      const mx = pen + (sp.adv / 2) * k, my = y - sp.cy * k;
      strokes.push([[mx - sp.half * k, my], [mx + sp.half * k, my]]);
      pen += (sp.adv + track) * k;
      continue;
    }
    const g = font.get(ch) ?? font.get(" ");
    for (const s of g.strokes) strokes.push(s.map(([gx, gy]) => [pen + gx * k, y - gy * k]));
    pen += (g.adv + track) * k;
  }
  return { strokes, width };
}

const r1 = (n) => Math.round(n * 10) / 10;
const d = (strokes) => strokes.map((s) => "M" + s.map(([px, py]) => `${r1(px)} ${r1(py)}`).join("L")).join("");
const len = (s) => s.reduce((acc, p, i) => (i ? acc + Math.hypot(p[0] - s[i - 1][0], p[1] - s[i - 1][1]) : 0), 0);

// ---- palette: graphite body, one phosphor hue ----------------------------------

const P = {
  card: "#0B0C0F", cardEdge: "#1C1E23",
  phosphor: "#7CF29A", core: "#E2FFE9", grid: "#7CF29A",
  label: "#ABAEB6", engrave: "#07080A",
};

// ---- geometry ---------------------------------------------------------------------

const W = 1200, H = 560;
const body = { x: 40, y: 34, w: 1120, h: 478, r: 24 };
const bezel = { x: 72, y: 66, w: 724, h: 414, r: 16 };
const glass = { x: 90, y: 84, w: 688, h: 378, r: 20 };
const cx = glass.x + glass.w / 2, cy = glass.y + glass.h / 2;

// ---- the signature: what the beam writes ------------------------------------------

const sig = layout("Surya Pratik", SCRIPT, { x: cx, y: cy + 8, size: 74, anchor: "middle", track: 10 });
// Keywords, not a sentence: the beam writes them straight after the name.
const keywords = layout("VOICE AI · LLM TOOLS · FLUTTER · EMBEDDED", SANS, { x: cx, y: cy + 92, size: 13, anchor: "middle", track: 110 });
const readouts = [
  layout("CH1  VOICE AI", SANS, { x: glass.x + 22, y: glass.y + 30, size: 11, track: 40 }),
  layout("RUN", SANS, { x: glass.x + glass.w - 22, y: glass.y + 30, size: 11, anchor: "end", track: 40 }),
  layout("B.TECH CSE · VIT-AP · 2027", SANS, { x: glass.x + 22, y: glass.y + glass.h - 18, size: 11, track: 40 }),
  layout("OPEN TO WORK", SANS, { x: glass.x + glass.w - 22, y: glass.y + glass.h - 18, size: 11, anchor: "end", track: 40 }),
];

// ---- pieces ----------------------------------------------------------------------------

function defs() {
  return `<defs>
    <radialGradient id="desk" cx="${W / 2}" cy="0" r="${W * 0.7}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#191A1F"/><stop offset="1" stop-color="${P.card}"/>
    </radialGradient>
    <linearGradient id="shell" x1="0" y1="${body.y}" x2="0" y2="${body.y + body.h}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#34363C"/><stop offset=".08" stop-color="#2A2C31"/>
      <stop offset=".85" stop-color="#1D1E22"/><stop offset="1" stop-color="#141518"/>
    </linearGradient>
    <linearGradient id="rim" x1="${body.x}" y1="0" x2="${body.x + body.w}" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".3" stop-color="#fff" stop-opacity=".22"/>
      <stop offset=".7" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="crt" cx="${cx}" cy="${cy}" r="${glass.w * 0.62}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#0C1A11"/><stop offset=".7" stop-color="#07100A"/><stop offset="1" stop-color="#030604"/>
    </radialGradient>
    <linearGradient id="glare" x1="${glass.x}" y1="${glass.y}" x2="${glass.x + glass.w * 0.55}" y2="${glass.y + glass.h * 0.75}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#fff" stop-opacity=".09"/><stop offset=".5" stop-color="#fff" stop-opacity=".025"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="knobSkirt" cx=".5" cy=".35" r=".7">
      <stop offset="0" stop-color="#43464D"/><stop offset=".6" stop-color="#25272C"/><stop offset="1" stop-color="#121316"/>
    </radialGradient>
    <linearGradient id="knobCap" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#555861"/><stop offset=".5" stop-color="#2E3035"/><stop offset="1" stop-color="#1A1B1F"/>
    </linearGradient>
    <radialGradient id="metal" cx=".38" cy=".32" r=".75">
      <stop offset="0" stop-color="#E6E8EC"/><stop offset=".45" stop-color="#8B8E96"/><stop offset="1" stop-color="#2B2D32"/>
    </radialGradient>
    <linearGradient id="key" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3A3C42"/><stop offset="1" stop-color="#202125"/>
    </linearGradient>
    <clipPath id="bodyClip"><rect x="${body.x}" y="${body.y}" width="${body.w}" height="${body.h}" rx="${body.r}"/></clipPath>
    <clipPath id="glassClip"><rect x="${glass.x}" y="${glass.y}" width="${glass.w}" height="${glass.h}" rx="${glass.r}"/></clipPath>
    <filter id="grain" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="7" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .55 0"/>
    </filter>
    <filter id="soft" x="-10%" y="-10%" width="120%" height="140%"><feGaussianBlur stdDeviation="16"/></filter>
    <filter id="lift" x="-30%" y="-30%" width="160%" height="170%" color-interpolation-filters="sRGB">
      <feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#000" flood-opacity=".55"/>
      <feDropShadow dx="0" dy="9" stdDeviation="9" flood-color="#000" flood-opacity=".35"/>
    </filter>
    <filter id="inset" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feFlood flood-color="#000" flood-opacity=".9"/><feComposite in2="SourceAlpha" operator="out"/>
      <feGaussianBlur stdDeviation="7"/><feOffset dy="5" result="s"/>
      <feComposite in="s" in2="SourceAlpha" operator="in"/>
    </filter>
    <filter id="bloom" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5"/></filter>
  </defs>`;
}

function shell() {
  const { x, y, w, h, r } = body;
  return `
  <rect x="${x + 30}" y="${y + h - 24}" width="${w - 60}" height="40" rx="20" fill="#000" opacity=".75" filter="url(#soft)"/>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="url(#shell)"/>
  <g clip-path="url(#bodyClip)">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" filter="url(#grain)" opacity=".05"/>
    <rect x="${x}" y="${y + h - 14}" width="${w}" height="14" fill="#0E0F11" opacity=".8"/>
  </g>
  <path d="M${x + r} ${y + 1}H${x + w - r}" stroke="url(#rim)" stroke-width="1.5"/>
  <rect x="${x + .5}" y="${y + .5}" width="${w - 1}" height="${h - 1}" rx="${r}" fill="none" stroke="#000" stroke-opacity=".6"/>`;
}

function screen(animated) {
  const g = glass, cols = 10, rows = 8, cw = g.w / cols, rh = g.h / rows;
  let grid = "";
  for (let i = 1; i < cols; i++) grid += `M${r1(g.x + i * cw)} ${g.y}V${g.y + g.h}`;
  for (let j = 1; j < rows; j++) grid += `M${g.x} ${r1(g.y + j * rh)}H${g.x + g.w}`;
  let ticks = "";
  for (let i = 1; i < cols * 5; i++) { const tx = r1(g.x + (i * cw) / 5); ticks += `M${tx} ${cy - 4}V${cy + 4}`; }
  for (let j = 1; j < rows * 5; j++) { const ty = r1(g.y + (j * rh) / 5); ticks += `M${cx - 4} ${ty}H${cx + 4}`; }
  const read = readouts.map((t) => d(t.strokes)).join("");
  return `
  <rect x="${bezel.x}" y="${bezel.y}" width="${bezel.w}" height="${bezel.h}" rx="${bezel.r}" fill="#0C0D0F"/>
  <rect x="${bezel.x}" y="${bezel.y}" width="${bezel.w}" height="${bezel.h}" rx="${bezel.r}" fill="#000" filter="url(#inset)"/>
  <path d="M${bezel.x + bezel.r} ${bezel.y + bezel.h - .5}H${bezel.x + bezel.w - bezel.r}" stroke="#fff" stroke-opacity=".08"/>
  <rect x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}" rx="${g.r}" fill="url(#crt)"/>
  <g clip-path="url(#glassClip)">
    <path d="${grid}" stroke="${P.grid}" stroke-opacity=".09" stroke-width="1"/>
    <path d="${ticks}" stroke="${P.grid}" stroke-opacity=".16" stroke-width="1"/>
    <path d="M${g.x} ${cy}H${g.x + g.w}M${cx} ${g.y}V${g.y + g.h}" stroke="${P.grid}" stroke-opacity=".16"/>
    <path d="${read}" fill="none" stroke="${P.phosphor}" stroke-opacity=".62" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
    ${trace(animated)}
    <rect x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}" fill="url(#glare)"/>
  </g>
  <rect x="${g.x + .5}" y="${g.y + .5}" width="${g.w - 1}" height="${g.h - 1}" rx="${g.r}" fill="none" stroke="#fff" stroke-opacity=".06"/>`;
}

/**
 * The beam. Each stroke is its own path so its dash can draw in turn; the
 * cycle is: write (0 to WRITE), hold, phosphor decay, blank, repeat. Strokes
 * are referenced three times (bloom, halo, core) through <use>.
 */
const CYCLE = 11, WRITE = 0.5, HOLD = 0.8, DECAY = 0.96;
function trace(animated) {
  const strokes = [...sig.strokes, ...keywords.strokes];
  const lengths = strokes.map(len);
  const total = lengths.reduce((a, b) => a + b, 0);
  let acc = 0;
  const paths = strokes.map((s, i) => {
    const L = r1(lengths[i]);
    const t0 = (acc / total) * WRITE, t1 = ((acc + lengths[i]) / total) * WRITE;
    acc += lengths[i];
    // Hidden = dash pushed past the start by more than the widest round cap,
    // or the caps of unwritten strokes show as dots.
    const off = r1(L + 6), gap = r1(L + 12);
    const anim = animated
      ? `<animate attributeName="stroke-dashoffset" dur="${CYCLE}s" repeatCount="indefinite" values="${off};${off};0;0" keyTimes="0;${t0.toFixed(4)};${t1.toFixed(4)};1"/>`
      : "";
    const dash = animated ? ` stroke-dasharray="${L} ${gap}" stroke-dashoffset="${off}"` : "";
    return `<path id="b${i}" d="${d([s])}"${dash}>${anim}</path>`;
  });
  const uses = strokes.map((_, i) => `<use href="#b${i}"/>`).join("");
  const fade = animated
    ? `<animate attributeName="opacity" dur="${CYCLE}s" repeatCount="indefinite" values="1;1;.14;0;0" keyTimes="0;${HOLD};${DECAY};.985;1"/>`
    : "";
  // the writing spot rides the same strokes, blanked between them
  const spot = animated ? beamSpot(strokes, lengths, total) : "";
  return `<defs>${paths.join("")}</defs>
    <g fill="none" stroke-linecap="round" stroke-linejoin="round">${fade}
      <g stroke="${P.phosphor}" stroke-width="7" stroke-opacity=".5" filter="url(#bloom)">${uses}</g>
      <g stroke="${P.phosphor}" stroke-width="3.4" stroke-opacity=".55">${uses}</g>
      <g stroke="${P.core}" stroke-width="1.5">${uses}</g>
    </g>${spot}`;
}

function beamSpot(strokes, lengths, total) {
  const all = strokes.map((s) => d([s])).join("");
  // keyPoints are fractions of the motion path length; movetos add no length,
  // so the spot hops between strokes exactly as the dashes do.
  return `
    <g opacity="0">
      <animate attributeName="opacity" dur="${CYCLE}s" repeatCount="indefinite" values="1;1;0;0" keyTimes="0;${WRITE};${WRITE + 0.005};1"/>
      <circle r="9" fill="${P.phosphor}" opacity=".35" filter="url(#bloom)"/>
      <circle r="2.6" fill="${P.core}"/>
      <animateMotion dur="${CYCLE}s" repeatCount="indefinite" calcMode="linear" keyPoints="0;1;1" keyTimes="0;${WRITE};1" path="${all}"/>
    </g>`;
}

function knob(x, y, label, angle) {
  let ticks = "";
  for (let i = 0; i <= 10; i++) {
    const a = ((-135 + i * 27) * Math.PI) / 180;
    ticks += `M${r1(x + Math.sin(a) * 41)} ${r1(y - Math.cos(a) * 41)}L${r1(x + Math.sin(a) * 46)} ${r1(y - Math.cos(a) * 46)}`;
  }
  const a = (angle * Math.PI) / 180;
  const t = layout(label, SANS, { x, y: y + 72, size: 10.5, anchor: "middle", track: 50 });
  return `
  <path d="${ticks}" stroke="#7A7D85" stroke-width="1.4" stroke-linecap="round"/>
  <g filter="url(#lift)">
    <circle cx="${x}" cy="${y}" r="34" fill="url(#knobSkirt)"/>
    <circle cx="${x}" cy="${y}" r="29.5" fill="none" stroke="#0B0C0E" stroke-width="5" stroke-dasharray="1.6 2.3" opacity=".75"/>
    <circle cx="${x}" cy="${y}" r="23" fill="url(#knobCap)"/>
  </g>
  <ellipse cx="${x - 7}" cy="${y - 9}" rx="11" ry="6" fill="#fff" opacity=".1" transform="rotate(-30 ${x - 7} ${y - 9})"/>
  <path d="M${x} ${y}L${r1(x + Math.sin(a) * 19)} ${r1(y - Math.cos(a) * 19)}" stroke="#DADCE0" stroke-width="3" stroke-linecap="round"/>
  <path d="${d(t.strokes)}" fill="none" stroke="${P.label}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function key(x, y, label, lit, animated) {
  const t = layout(label, SANS, { x: x + 26, y: y + 46, size: 9, anchor: "middle", track: 50 });
  const led = lit
    ? `<circle cx="${x + 26}" cy="${y + 12}" r="6" fill="${P.phosphor}" opacity=".6" filter="url(#bloom)">${animated ? `<animate attributeName="opacity" dur="2.6s" repeatCount="indefinite" values=".6;.25;.6"/>` : ""}</circle>
  <circle cx="${x + 26}" cy="${y + 12}" r="2.4" fill="${P.core}"/>`
    : `<circle cx="${x + 26}" cy="${y + 12}" r="2.4" fill="#3B3E44"/>`;
  return `
  <g filter="url(#lift)"><rect x="${x}" y="${y}" width="52" height="24" rx="6" fill="url(#key)"/></g>
  <path d="M${x + 6} ${y + .8}H${x + 46}" stroke="#fff" stroke-opacity=".14"/>
  ${led}
  <path d="${d(t.strokes)}" fill="none" stroke="${P.label}" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function bnc(x, y, label) {
  const t = layout(label, SANS, { x, y: y + 38, size: 9, anchor: "middle", track: 50 });
  return `
  <circle cx="${x}" cy="${y}" r="17" fill="#0D0E10"/>
  <g filter="url(#lift)"><circle cx="${x}" cy="${y}" r="14" fill="url(#metal)"/></g>
  <circle cx="${x}" cy="${y}" r="7" fill="#0E0F11"/>
  <circle cx="${x}" cy="${y}" r="2.2" fill="#C9CCD2"/>
  <path d="${d(t.strokes)}" fill="none" stroke="${P.label}" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function panel(animated) {
  const px = 836, brand = layout("SP 2027", SANS, { x: px, y: 104, size: 17, track: 60 });
  const model = layout("SIGNAL SCOPE", SANS, { x: px, y: 126, size: 9, track: 90 });
  const engrave = (t, w) => `<path d="${d(t.strokes)}" fill="none" stroke="${P.engrave}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" transform="translate(0 1)"/>
  <path d="${d(t.strokes)}" fill="none" stroke="${P.label}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  return `
  ${engrave(brand, 1.8)}
  ${engrave(model, 1.1)}
  <path d="M${px} 148H1124" stroke="#000" stroke-opacity=".5"/><path d="M${px} 149H1124" stroke="#fff" stroke-opacity=".05"/>
  ${knob(878, 210, "AI / ML", -60)}
  ${knob(980, 210, "FLUTTER", 15)}
  ${knob(1082, 210, "EMBEDDED", 80)}
  ${key(846, 330, "RUN", true, animated)}
  ${key(928, 330, "AUTO", false, animated)}
  ${key(1010, 330, "SINGLE", false, animated)}
  ${bnc(878, 432, "CH1")}
  ${bnc(980, 432, "CH2")}
  ${bnc(1082, 432, "EXT")}`;
}

function scope({ animated, phone }) {
  const view = phone ? `${bezel.x - 18} ${bezel.y - 18} ${bezel.w + 36} ${bezel.h + 36}` : `0 0 ${W} ${H}`;
  const [, , vw, vh] = view.split(" ").map(Number);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${view}" width="${vw}" height="${vh}">
  <title>Surya Pratik</title>
  <desc>A graphite bench oscilloscope whose phosphor beam writes the signature Surya Pratik, then the keywords voice AI, LLM tools, Flutter, embedded.</desc>
  ${defs()}
  <rect x="${phone ? bezel.x - 18 : 0}" y="${phone ? bezel.y - 18 : 0}" width="${vw}" height="${vh}" rx="${phone ? 18 : 22}" fill="url(#desk)"/>
  ${shell()}
  ${screen(animated)}
  ${phone ? "" : panel(animated)}
  ${phone ? "" : `<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="22" fill="none" stroke="${P.cardEdge}"/>`}
</svg>
`;
}

// ---- link keys -------------------------------------------------------------------

/**
 * One of the scope's graphite keycaps, sized to sit in a row of three under
 * the instrument. Each is its own <img> so each can be its own link: links
 * inside an SVG image do nothing on GitHub.
 */
function linkKey(label) {
  const KW = 360, KH = 92, k = { x: 8, y: 8, w: 344, h: 66, r: 14 };
  const t = layout(label, SANS, { x: k.x + 62, y: k.y + 40, size: 15, track: 70 });
  const ax = k.x + k.w - 40, ay = k.y + 33;
  const arrow = `M${ax} ${ay}H${ax + 18}M${ax + 11} ${ay - 7}L${ax + 18} ${ay}L${ax + 11} ${ay + 7}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${KW} ${KH}" width="${KW}" height="${KH}">
  <title>${label}</title>
  <defs>
    <linearGradient id="cap" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3C3E44"/><stop offset=".55" stop-color="#2A2C31"/><stop offset="1" stop-color="#1D1E22"/>
    </linearGradient>
    <linearGradient id="capRim" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".25" stop-color="#fff" stop-opacity=".2"/>
      <stop offset=".75" stop-color="#fff" stop-opacity=".2"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <filter id="lift" x="-10%" y="-20%" width="120%" height="160%" color-interpolation-filters="sRGB">
      <feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#000" flood-opacity=".55"/>
      <feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="#000" flood-opacity=".3"/>
    </filter>
    <filter id="bloom" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="4"/></filter>
  </defs>
  <g filter="url(#lift)"><rect x="${k.x}" y="${k.y}" width="${k.w}" height="${k.h}" rx="${k.r}" fill="url(#cap)"/></g>
  <path d="M${k.x + k.r} ${k.y + 1}H${k.x + k.w - k.r}" stroke="url(#capRim)" stroke-width="1.4"/>
  <rect x="${k.x + .5}" y="${k.y + .5}" width="${k.w - 1}" height="${k.h - 1}" rx="${k.r}" fill="none" stroke="#000" stroke-opacity=".55"/>
  <circle cx="${k.x + 34}" cy="${k.y + 33}" r="7" fill="${P.phosphor}" opacity=".55" filter="url(#bloom)"/>
  <circle cx="${k.x + 34}" cy="${k.y + 33}" r="3" fill="${P.core}"/>
  <path d="${d(t.strokes)}" fill="none" stroke="#000" stroke-opacity=".7" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" transform="translate(0 1)"/>
  <path d="${d(t.strokes)}" fill="none" stroke="#D3D5DA" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="${arrow}" fill="none" stroke="#8C8F97" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;
}

// ---- about: a rack module with a phosphor readout --------------------------------

// Facts only, from the resume-backed portfolio data. No taglines.
const ABOUT = [
  ["NOW", "Embedded Engineer Intern · Alfaleus Technologies · Hyderabad"],
  ["BUILDS", "voice agents · LLM tools · Flutter apps · hardware"],
  ["STUDY", "B.Tech CSE · VIT-AP University · 2027 · CGPA 8.34"],
  ["LEADS", "Microsoft Student Chapter VIT-AP · Best Student Chapter, Fall 2025"],
  ["FROM", "Bhilai, Chhattisgarh, India"],
  ["OPEN TO", "AI/ML · software · Flutter internships"],
];

/** Greedy wrap by measured width. */
function wrapText(text, font, size, track, max) {
  const lines = [];
  let cur = "";
  for (const w of text.split(" ")) {
    const next = cur ? cur + " " + w : w;
    if (cur && layout(next, font, { x: 0, y: 0, size, track }).width > max) { lines.push(cur); cur = w; } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}

function about({ animated, phone }) {
  const W2 = phone ? 640 : 1200;
  const ear = phone ? 0 : 46;
  const body = { x: phone ? 16 : 40, y: 20, w: phone ? 608 : 1120, r: 18 };
  const disp = { x: body.x + ear + 24, w: body.w - ear * 2 - 48 };
  const pad = 28, keySize = phone ? 14 : 11, valSize = phone ? 19 : 14.5;
  const valX = phone ? 0 : 150, valMax = disp.w - pad * 2 - valX;
  const lineGap = valSize + 13;

  // Lay the rows out first so the module can size itself to them.
  const rows = [];
  let y = phone ? 124 : 132;
  for (const [k, v] of ABOUT) {
    const key = layout(k, SANS, { x: disp.x + pad, y, size: keySize, track: 70 });
    const top = y - valSize - 10;
    if (phone) y += 30;
    const lines = wrapText(v, SANS, valSize, 28, valMax).map((line, i) =>
      layout(line, SANS, { x: disp.x + pad + valX, y: y + i * lineGap, size: valSize, track: 28 }));
    y += (lines.length - 1) * lineGap;
    rows.push({ key, lines, top, base: y, bottom: y + 12 });
    y += phone ? 46 : 40;
  }
  disp.y = body.y + 22;
  disp.h = y - 26 - disp.y + 8;
  body.h = disp.h + 44;
  const H2 = body.y + body.h + 30;

  const header = [
    layout("ABOUT", SANS, { x: disp.x + pad, y: disp.y + 34, size: 11, track: 90 }),
    layout("CH2", SANS, { x: disp.x + disp.w - pad, y: disp.y + 34, size: 11, anchor: "end", track: 90 }),
  ];
  // Rows type in once, left to right, then hold. The scope keeps looping; this does not.
  const T0 = 0.5, STEP = 0.55, TYPE = 0.6;
  const rowSvg = rows.map((r, i) => {
    const keyD = d(r.key.strokes), valD = r.lines.map((l) => d(l.strokes)).join("");
    const clip = animated ? ` clip-path="url(#row${i})"` : "";
    const clipDef = animated
      ? `<clipPath id="row${i}"><rect x="${disp.x}" y="${r1(r.top)}" width="0" height="${r1(r.bottom - r.top)}">
        <animate attributeName="width" from="0" to="${disp.w}" begin="${(T0 + i * STEP).toFixed(2)}s" dur="${TYPE}s" fill="freeze"/>
      </rect></clipPath>`
      : "";
    return `${clipDef}
    <g${clip} fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="${keyD}" stroke="${P.phosphor}" stroke-opacity=".55" stroke-width="1.3"/>
      <path d="${valD}" stroke="${P.phosphor}" stroke-opacity=".35" stroke-width="3.6"/>
      <path d="${valD}" stroke="${P.core}" stroke-width="1.45"/>
    </g>`;
  }).join("");

  // A block cursor that blinks after the last row has typed in.
  const last = rows[rows.length - 1], lastLine = last.lines[last.lines.length - 1];
  const curX = r1(disp.x + pad + valX + lastLine.width + 10), curY = r1(last.base - valSize);
  const cursor = `<rect x="${curX}" y="${curY}" width="${r1(valSize * 0.6)}" height="${valSize}" fill="${P.phosphor}" opacity="${animated ? 0 : 0.8}">${animated
    ? `<animate attributeName="opacity" values="0;.85;.85;0;0" keyTimes="0;.02;.5;.52;1" dur="1.1s" begin="${(T0 + (rows.length - 1) * STEP + TYPE).toFixed(2)}s" repeatCount="indefinite"/>`
    : ""}</rect>`;

  const screws = phone ? "" : [[body.x + 23, body.y + 30], [body.x + 23, body.y + body.h - 30], [body.x + body.w - 23, body.y + 30], [body.x + body.w - 23, body.y + body.h - 30]]
    .map(([sx, sy]) => `<circle cx="${sx}" cy="${sy}" r="8" fill="#0C0D0F"/><circle cx="${sx}" cy="${sy}" r="6.5" fill="url(#screw)"/><path d="M${sx - 4} ${sy}H${sx + 4}M${sx} ${sy - 4}V${sy + 4}" stroke="#141518" stroke-width="1.6"/>`).join("");
  const ears = phone ? "" : `<path d="M${body.x + ear} ${body.y + 6}V${body.y + body.h - 6}M${body.x + body.w - ear} ${body.y + 6}V${body.y + body.h - 6}" stroke="#000" stroke-opacity=".55"/>
  <path d="M${body.x + ear + 1} ${body.y + 6}V${body.y + body.h - 6}M${body.x + body.w - ear + 1} ${body.y + 6}V${body.y + body.h - 6}" stroke="#fff" stroke-opacity=".05"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W2} ${H2}" width="${W2}" height="${H2}">
  <title>About Surya Pratik</title>
  <desc>${ABOUT.map(([k, v]) => `${k}: ${v}`).join(". ")}.</desc>
  <defs>
    <linearGradient id="aShell" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#34363C"/><stop offset=".1" stop-color="#2A2C31"/><stop offset=".85" stop-color="#1D1E22"/><stop offset="1" stop-color="#141518"/>
    </linearGradient>
    <linearGradient id="aRim" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".3" stop-color="#fff" stop-opacity=".22"/><stop offset=".7" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="aCrt" cx=".5" cy=".5" r=".75">
      <stop offset="0" stop-color="#0C1A11"/><stop offset=".7" stop-color="#07100A"/><stop offset="1" stop-color="#030604"/>
    </radialGradient>
    <linearGradient id="aGlare" x1="0" y1="0" x2=".6" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".07"/><stop offset=".5" stop-color="#fff" stop-opacity=".02"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="screw" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#C9CCD2"/><stop offset=".6" stop-color="#6E7179"/><stop offset="1" stop-color="#2B2D32"/></radialGradient>
    <clipPath id="aBody"><rect x="${body.x}" y="${body.y}" width="${body.w}" height="${body.h}" rx="${body.r}"/></clipPath>
    <filter id="aGrain" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="11" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .55 0"/>
    </filter>
    <filter id="aSoft" x="-10%" y="-50%" width="120%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>
    <filter id="aInset" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feFlood flood-color="#000" flood-opacity=".9"/><feComposite in2="SourceAlpha" operator="out"/>
      <feGaussianBlur stdDeviation="6"/><feOffset dy="4" result="s"/><feComposite in="s" in2="SourceAlpha" operator="in"/>
    </filter>
  </defs>
  <rect width="${W2}" height="${H2}" rx="${phone ? 18 : 22}" fill="${P.card}"/>
  <rect x="${body.x + 30}" y="${body.y + body.h - 20}" width="${body.w - 60}" height="34" rx="17" fill="#000" opacity=".7" filter="url(#aSoft)"/>
  <rect x="${body.x}" y="${body.y}" width="${body.w}" height="${body.h}" rx="${body.r}" fill="url(#aShell)"/>
  <g clip-path="url(#aBody)"><rect x="${body.x}" y="${body.y}" width="${body.w}" height="${body.h}" filter="url(#aGrain)" opacity=".05"/></g>
  <path d="M${body.x + body.r} ${body.y + 1}H${body.x + body.w - body.r}" stroke="url(#aRim)" stroke-width="1.5"/>
  <rect x="${body.x + .5}" y="${body.y + .5}" width="${body.w - 1}" height="${body.h - 1}" rx="${body.r}" fill="none" stroke="#000" stroke-opacity=".6"/>
  ${ears}${screws}
  <rect x="${disp.x - 10}" y="${disp.y - 10}" width="${disp.w + 20}" height="${disp.h + 20}" rx="14" fill="#0C0D0F"/>
  <rect x="${disp.x - 10}" y="${disp.y - 10}" width="${disp.w + 20}" height="${disp.h + 20}" rx="14" fill="#000" filter="url(#aInset)"/>
  <rect x="${disp.x}" y="${disp.y}" width="${disp.w}" height="${disp.h}" rx="10" fill="url(#aCrt)"/>
  <path d="${header.map((h) => d(h.strokes)).join("")}" fill="none" stroke="${P.phosphor}" stroke-opacity=".5" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M${disp.x + pad} ${disp.y + 52}H${disp.x + disp.w - pad}" stroke="${P.phosphor}" stroke-opacity=".14"/>
  ${rowSvg}
  ${cursor}
  <rect x="${disp.x}" y="${disp.y}" width="${disp.w}" height="${disp.h}" rx="10" fill="url(#aGlare)"/>
  <rect x="${disp.x + .5}" y="${disp.y + .5}" width="${disp.w - 1}" height="${disp.h - 1}" rx="10" fill="none" stroke="#fff" stroke-opacity=".06"/>
  ${phone ? "" : `<rect x=".5" y=".5" width="${W2 - 1}" height="${H2 - 1}" rx="22" fill="none" stroke="${P.cardEdge}"/>`}
</svg>
`;
}

const out = (name, svg) => writeFileSync(new URL(`../assets/${name}.svg`, import.meta.url), svg);
out("scope", scope({ animated: true, phone: false }));
out("scope-still", scope({ animated: false, phone: false }));
out("scope-phone", scope({ animated: true, phone: true }));
out("scope-phone-still", scope({ animated: false, phone: true }));
out("about", about({ animated: true, phone: false }));
out("about-still", about({ animated: false, phone: false }));
out("about-phone", about({ animated: true, phone: true }));
out("about-phone-still", about({ animated: false, phone: true }));
for (const [file, label] of [["key-portfolio", "PORTFOLIO"], ["key-linkedin", "LINKEDIN"], ["key-email", "EMAIL"]]) out(file, linkKey(label));
console.log("built scope x4, about x4, 3 link keys");
