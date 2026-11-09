// Builds the page: index.html (template + song data + silly words) and voice/<song>.json,
// one file of recorded words per song, which the page fetches when that song is picked.
// Usage: node build.js voice_bank.json   (voice_bank.json comes from build_voice.py)
const fs = require("fs"), path = require("path");
const { songWords } = require("./vocab.js"); // also checks the song data
const dir = __dirname;
const strip = f => fs.readFileSync(path.join(dir, f), "utf8").replace(/\nif \(typeof module[^\n]*\n?/, "\n");
const bank = JSON.parse(fs.readFileSync(process.argv[2] || path.join(dir, "voice_bank.json"), "utf8"));
const html = fs.readFileSync(path.join(dir, "template.html"), "utf8")
  .replace("/*DATA*/", () => strip("data.js"))
  .replace("/*ALTS*/", () => strip("alts.js"))
  .replace("/*ART*/", () => strip("art.js"))
  .replace("/*GRAMMAR*/", () => strip("grammar.js"));
fs.writeFileSync(path.join(dir, "index.html"), html);
console.log("index.html", (html.length / 1e3).toFixed(0), "kB");
fs.mkdirSync(path.join(dir, "voice"), { recursive: true });
for (const [id, keys] of Object.entries(songWords)) {
  const words = {}, missing = [];
  for (const k of keys) bank.words[k] ? (words[k] = bank.words[k]) : missing.push(k);
  if (missing.length) { console.error(id, "not recorded:", missing.join(", ")); process.exitCode = 1; }
  const json = JSON.stringify({ sr: bank.sr, words });
  fs.writeFileSync(path.join(dir, "voice", id + ".json"), json);
  console.log(`voice/${id}.json`, keys.length, "words", (json.length / 1e6).toFixed(2), "MB");
}
