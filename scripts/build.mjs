// Builds the profile's SVG cards from the data below. Run: node scripts/build.mjs
// Facts mirror data/portfolioData.ts in the portfolio repo; change them there first.
import { writeFileSync } from "node:fs";

const C = {
  bg: "#0B0C0F", line: "#24262C", ink: "#F2F0E9", muted: "#B3B5BF", quiet: "#9A9CA4",
  400: "#9B7EDE", 450: "#7B93E0", 500: "#4FD8E0", 560: "#6FE07D", 600: "#F2A65A", 680: "#E8536B",
};
const SANS = `'Space Grotesk', 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif`;
const BODY = `Inter, 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif`;
const MONO = `'IBM Plex Mono', ui-monospace, 'Cascadia Mono', Consolas, Menlo, monospace`;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Greedy word wrap by an estimated character budget. */
function wrap(text, max) {
  const lines = [];
  let cur = "";
  for (const w of text.split(" ")) {
    if (cur && (cur + " " + w).length > max) { lines.push(cur); cur = w; } else cur = cur ? cur + " " + w : w;
  }
  if (cur) lines.push(cur);
  return lines;
}

const frame = (w, h, title, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(title)}">
  <title>${esc(title)}</title>
  <rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="14" fill="${C.bg}" stroke="${C.line}"/>
${body}
</svg>
`;

// ---- featured project cards ------------------------------------------------

const featured = [
  { file: "card-tarang", title: "TARANG", subtitle: "Oil-spill detection and vessel attribution", nm: 400, cap: "AI / ML", metric: ["~3 min", "from slick to ranked ships"] },
  { file: "card-dhara", title: "DHARA", subtitle: "Dam hazard assessment and routing", nm: 500, cap: "Web & Backend", metric: ["0.037 m", "RMSE against the analytic dam break"] },
  { file: "card-orca", title: "ORCA", subtitle: "Satellite collision-risk screening", nm: 500, cap: "Web & Backend", metric: ["19 s", "to screen 15,968 objects for a day"] },
  { file: "card-surrag", title: "SURRAG", subtitle: "Criminal network analysis over police FIRs", nm: 400, cap: "AI / ML", metric: ["783", "districts of hotspot data"] },
];

function projectCard(p) {
  const W = 440, H = 176, pad = 24, col = C[p.nm];
  const [value, label] = p.metric;
  const valueW = value.length * 13 + 12;
  return frame(W, H, `${p.title}: ${p.subtitle}. ${value} ${label}.`, `  <rect x="1" y="1" width="${W - 2}" height="3" rx="1.5" fill="${col}"/>
  <rect x="${pad}" y="28" width="9" height="9" rx="2" fill="${col}"/>
  <text x="${pad + 16}" y="37" font-family="${MONO}" font-size="11" letter-spacing="1.2" fill="${col}">${esc(p.cap.toUpperCase())}</text>
  <text x="${W - pad}" y="37" text-anchor="end" font-family="${MONO}" font-size="11" font-weight="600" fill="${C.quiet}">LIVE ↗</text>
  <text x="${pad - 1}" y="82" font-family="${SANS}" font-size="32" font-weight="700" letter-spacing="-.5" fill="${C.ink}">${esc(p.title)}</text>
  <text x="${pad}" y="106" font-family="${BODY}" font-size="14" fill="${C.muted}">${esc(p.subtitle)}</text>
  <text x="${pad}" y="150" font-family="${SANS}" font-size="24" font-weight="700" fill="${col}">${esc(value)}</text>
  <text x="${pad + valueW}" y="149" font-family="${BODY}" font-size="13" fill="${C.muted}">${esc(label)}</text>`);
}

// ---- capabilities strip ------------------------------------------------------

const capabilities = [
  { nm: 400, label: "AI / ML" }, { nm: 450, label: "Mobile" }, { nm: 500, label: "Web & Backend" },
  { nm: 560, label: "Cloud & DevOps" }, { nm: 600, label: "Languages" }, { nm: 680, label: "Hardware" },
];

function capabilityStrip() {
  const W = 900, H = 56, slot = W / 6;
  const items = capabilities.map((c, i) => {
    const cx = slot * i + slot / 2, tw = c.label.length * 8.2 + 16;
    return `  <rect x="${cx - tw / 2}" y="20" width="10" height="10" rx="2.5" fill="${C[c.nm]}"/>
  <text x="${cx - tw / 2 + 16}" y="30" font-family="${SANS}" font-size="15" font-weight="600" fill="${C.ink}">${esc(c.label)}</text>`;
  }).join("\n");
  return frame(W, H, "Capabilities: " + capabilities.map((c) => c.label).join(", "), items);
}

// ---- contact buttons -----------------------------------------------------------

const buttons = [
  { file: "btn-portfolio", label: "Portfolio", nm: 500 },
  { file: "btn-linkedin", label: "LinkedIn", nm: 450 },
  { file: "btn-email", label: "Email", nm: 600 },
];

function button(b) {
  const W = Math.round(b.label.length * 9.2 + 58), H = 40;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(b.label)}">
  <title>${esc(b.label)}</title>
  <rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="20" fill="${C.bg}" stroke="${C[b.nm]}" stroke-opacity=".7"/>
  <rect x="18" y="16" width="8" height="8" rx="2" fill="${C[b.nm]}"/>
  <text x="36" y="25" font-family="${SANS}" font-size="15" font-weight="600" fill="${C.ink}">${esc(b.label)}</text>
</svg>
`;
}

const out = (name, svg) => writeFileSync(new URL(`../assets/${name}.svg`, import.meta.url), svg);
for (const p of featured) out(p.file, projectCard(p));
out("capabilities", capabilityStrip());
for (const b of buttons) out(b.file, button(b));
console.log(`built ${featured.length} cards, capability strip, ${buttons.length} buttons`);
