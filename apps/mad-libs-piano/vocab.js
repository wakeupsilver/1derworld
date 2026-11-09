// Checks the song data and lists every word each song can sing.
// node vocab.js        -> JSON {key: textToSpeak} for build_voice.py (every word of every song)
// require("./vocab.js") -> { keyOf, songWords } for build.js
const { SONGS, SILLY } = require("./data.js");
const { ALTS } = require("./alts.js");
const { GRAMMAR } = require("./grammar.js");
const keyOf = w => w.toLowerCase().replace(/[’]/g, "'").replace(/[^a-zñé' \-]/g, "").replace(/[\s'\-]+$/, "").replace(/^[\s\-]+/, "");
const LETTERS = { r: "are", b: "bee", d: "dee", e: "ee", g: "gee", i: "eye", n: "en", o: "oh", p: "pee", q: "cue", t: "tee", u: "you", v: "vee", x: "ex", y: "why", z: "zee" };
const spoken = k => LETTERS[k] || k.replace(/^'/, "").replace(/-/g, " ");
const split = s => s.split(",").map(x => x.trim()).filter(Boolean);
let bad = 0;
const songWords = {};
for (const s of SONGS) {
  const words = new Set(), tags = new Set(), seen = new Set();
  const lines = s.lyrics.split("\n");
  if (lines.length !== s.melody.length) { console.error(s.id, "line count", lines.length, s.melody.length); bad++; }
  lines.forEach((ln, i) => {
    const toks = ln.trim().split(/\s+/);
    if (s.melody[i] && toks.length !== s.melody[i].length) { console.error(s.id, "line", i + 1, toks.length, "words vs", s.melody[i].length, "notes:", ln); bad++; }
    for (const t of toks) {
      const [w, tag] = t.split("|");
      if (!SILLY[tag]) { console.error("bad tag", t); bad++; continue; }
      const k = keyOf(w); words.add(k); tags.add(tag);
      const alt = (ALTS[s.id] || {})[k + "|" + tag] || (ALTS[s.id] || {})[k];
      if (!alt) { console.error(s.id, "no silly words for", k, tag); bad++; }
      else { seen.add(alt === ALTS[s.id][k] ? k : k + "|" + tag); split(alt).forEach(x => words.add(keyOf(x))); }
    }
  });
  for (const k of Object.keys(ALTS[s.id] || {})) if (!seen.has(k)) { console.error(s.id, "unused silly list", k); bad++; }
  for (const tag of tags) SILLY[tag].forEach(x => words.add(keyOf(x)));
  // verb forms that change to match a swapped subject ("Bigfoot wonders", "my socks were")
  const toks = [];
  lines.forEach((ln, li) => ln.trim().split(/\s+/).forEach((t, wi, arr) => { const [w, tag] = t.split("|"); const d = w.replace(/[.,;:!?]+$/, ""); toks.push({ disp: d, key: keyOf(d), tag, line: li }); }));
  GRAMMAR.markAgreement(toks);
  const altsOf = t => split((ALTS[s.id] || {})[t.key + "|" + t.tag] || (ALTS[s.id] || {})[t.key] || "");
  for (const t of toks.filter(t => t.agree)) {
    const cands = [t.disp, ...altsOf(t), ...toks.filter(u => u.tag === t.tag && u.key !== t.key).flatMap(altsOf), ...SILLY[t.tag]];
    for (const c of cands) for (const cls of ["I", "pl", "3s"]) words.add(keyOf(GRAMMAR.inflect(c, cls, t.tag)));
  }
  songWords[s.id] = [...words].filter(Boolean);
}
if (bad) process.exit(1);
if (require.main === module) {
  const out = {};
  for (const ws of Object.values(songWords)) ws.forEach(k => out[k] = spoken(k));
  process.stdout.write(JSON.stringify(out));
}
module.exports = { keyOf, songWords };
