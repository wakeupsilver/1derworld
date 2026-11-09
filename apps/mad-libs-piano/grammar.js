// Grammar for Mad Libs Piano: when you swap the subject of a line ("I" → "Bigfoot"),
// the verb that goes with it changes to match ("wonder" → "wonders", "am" → "is").
// Used by the page while you play, and by vocab.js to list the verb forms to record.

const GRAMMAR = (() => {
  // the real words that start a clause as its subject
  const SUBJECTS = new Set(["i", "you", "we", "they", "he", "she", "it", "ye"]);
  const VERB_TAGS = new Set(["V", "LINK", "LINKPAST", "VS"]);
  const lower = w => w.toLowerCase();
  const keepCase = (from, to) => from[0] && from[0] === from[0].toUpperCase() && from[0] !== from[0].toLowerCase() ? to[0].toUpperCase() + to.slice(1) : to;

  // Who is the subject? "I", a group ("you", "the elves", "my socks"), or one other thing ("Bigfoot", "the dog").
  function subjectClass(word) {
    const w = lower(word).trim();
    if (w === "i") return "I";
    if (["you", "we", "they", "ye"].includes(w)) return "pl";
    if (["he", "she", "it"].includes(w)) return "3s";
    const last = w.split(/\s+/).pop();
    if (/^(everybody|everyone|nobody|somebody|someone|anybody)$/.test(last)) return "3s";
    if (/^(people|children|mice|geese|police|elves|reindeer|deer|sheep|fish|feet|teeth|men|women)$/.test(last)) return "pl";
    if (/[^s'u]s$/.test(last)) return "pl";
    return "3s";
  }

  // Mark which words of a song agree with a subject: the verbs after a subject pronoun in the same line.
  function markAgreement(tokens) {
    let line = -1, subject = false;
    tokens.forEach((t, i) => {
      if (t.line !== line) { line = t.line; subject = false; }
      if (t.tag === "PRON" && SUBJECTS.has(t.key)) { subject = true; t.subject = true; return; }
      const prev = tokens[i - 1];
      const verb = VERB_TAGS.has(t.tag) || (t.tag === "MODAL" && t.key === "have");
      const helped = prev && prev.line === t.line && (prev.tag === "TO" || (prev.tag === "MODAL" && prev.key !== "have"));
      // a question puts the verb before its own subject ("are you sleeping"), so it isn't about the subject before it
      const next = tokens[i + 1], asks = next && next.line === t.line && next.tag === "PRON" && SUBJECTS.has(next.key);
      if (subject && verb && !helped && !asks) t.agree = true;
    });
    return tokens;
  }

  function thirdPerson(v) {
    const w = lower(v);
    if (w === "have") return "has";
    if (w === "do") return "does";
    if (w === "go") return "goes";
    if (/[^aeiou]y$/.test(w)) return v.slice(0, -1) + "ies";
    if (/(s|sh|ch|x|z|o)$/.test(w)) return v + "es";
    return v + "s";
  }
  // Change a verb (or a short verb phrase) to fit the subject class. A past-tense word only
  // changes between "was" and "were".
  function inflect(word, cls, tag) {
    if (!cls) return word;
    const w = lower(word);
    if (tag === "LINKPAST" || tag === "VED") return ["was", "were"].includes(w) ? keepCase(word, cls === "pl" ? "were" : "was") : word;
    if (["am", "is", "are"].includes(w)) return keepCase(word, cls === "I" ? "am" : cls === "3s" ? "is" : "are");
    if (["was", "were"].includes(w)) return keepCase(word, cls === "pl" ? "were" : "was");
    if (["have", "has"].includes(w)) return keepCase(word, cls === "3s" ? "has" : "have");
    if (["aren't", "isn't"].includes(w)) return keepCase(word, cls === "3s" ? "isn't" : "aren't");
    if (["weren't", "wasn't"].includes(w)) return keepCase(word, cls === "pl" ? "weren't" : "wasn't");
    if (/'/.test(w) || w === "ain't") return word; // other short forms ("can't", "won't") stay as they are
    if (cls !== "3s") return word;
    const parts = word.split(" ");
    // "sneeze on" → "sneezes on", "belly flop" → "belly flops", "high-five" → "high-fives"
    const particle = parts.length > 1 && /^(on|at|to|up|down|out|in|off|about|over)$/i.test(parts[1]);
    const i = particle ? 0 : parts.length - 1;
    parts[i] = thirdPerson(parts[i]);
    return parts.join(" ");
  }
  return { subjectClass, markAgreement, inflect };
})();

if (typeof module !== "undefined") module.exports = { GRAMMAR };
