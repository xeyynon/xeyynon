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
  let width = 0;
  for (const ch of text) width += ((font.get(ch) ?? font.get(" ")).adv + track) * k;
  width -= track * k;
  let pen = anchor === "middle" ? x - width / 2 : anchor === "end" ? x - width : x;
  const strokes = [];
  for (const ch of text) {
    if (ch === "·") {
      // No middle dot in the Hershey set: draw a short tick at x-height centre.
      const cx = pen + 170 * k, cy = y - 300 * k;
      strokes.push([[cx - 18 * k, cy], [cx + 18 * k, cy]]);
      pen += (340 + track) * k;
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

const sig = layout("Surya Pratik", SCRIPT, { x: cx, y: cy + 18, size: 74, anchor: "middle", track: 10 });
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
  const strokes = sig.strokes;
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
  <desc>A graphite bench oscilloscope whose phosphor beam writes the signature Surya Pratik.</desc>
  ${defs()}
  <rect x="${phone ? bezel.x - 18 : 0}" y="${phone ? bezel.y - 18 : 0}" width="${vw}" height="${vh}" rx="${phone ? 18 : 22}" fill="url(#desk)"/>
  ${shell()}
  ${screen(animated)}
  ${phone ? "" : panel(animated)}
  ${phone ? "" : `<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="22" fill="none" stroke="${P.cardEdge}"/>`}
</svg>
`;
}

const out = (name, svg) => writeFileSync(new URL(`../assets/${name}.svg`, import.meta.url), svg);
out("scope", scope({ animated: true, phone: false }));
out("scope-still", scope({ animated: false, phone: false }));
out("scope-phone", scope({ animated: true, phone: true }));
out("scope-phone-still", scope({ animated: false, phone: true }));
console.log("built scope, scope-still, scope-phone, scope-phone-still");
