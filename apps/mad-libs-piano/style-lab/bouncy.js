// Extra bouncy, part 2: the word you just pressed finishes its bounce before the new word appears.
// The page swaps a pressed key's word the moment you press it, so this watches for that swap and
// puts a copy of the OLD word in its place. The copy bounces and floats up and away; then the new
// word drops in. Only runs when Sunshine + Extra bouncy are on. The page's own code is untouched.
(() => {
  const root = document.documentElement, kb = document.getElementById("kb");
  if (!kb) return;
  const on = () => root.dataset.style === "sunshine" && (root.dataset.add || "").split(" ").includes("bouncy");
  const keys = () => [...kb.querySelectorAll(":scope > .key")];
  const realWord = key => key.querySelector(".kw:not(.ghost)");
  const last = new Map(); // key -> { text, cls } as it was after the previous change
  const remember = () => keys().forEach(k => { const s = realWord(k); if (s) last.set(k, { text: s.textContent, cls: s.className }); });

  const OUT_MS = 650, IN_MS = 380;
  function bounceOut(key, old) {
    key.querySelectorAll(".kw.ghost").forEach(g => g.remove()); // pressed again mid-bounce: start over
    clearTimeout(key._bouncy);
    const real = realWord(key);
    const ghost = document.createElement("span");
    ghost.className = old.cls.replace(/\bchanged\b/, "") + " ghost";
    ghost.textContent = old.text;
    ghost.setAttribute("aria-hidden", "true");
    real.after(ghost); // after, so the page's querySelector(".kw") still finds the real word
    key.dataset.ghosting = "";
    key.removeAttribute("data-arriving");
    key._bouncy = setTimeout(() => {
      ghost.remove();
      key.removeAttribute("data-ghosting");
      key.dataset.arriving = "";
      key._bouncy = setTimeout(() => key.removeAttribute("data-arriving"), IN_MS);
    }, OUT_MS);
  }

  // Juice: flash + squash the key, and pop a few music notes out of its top
  const NOTES = ["♪", "♫", "♩", "♬"];
  function juice(key) {
    key.classList.remove("juice"); void key.offsetWidth; key.classList.add("juice");
    setTimeout(() => key.classList.remove("juice"), 520);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = key.getBoundingClientRect();
    const silly = !key._wasGuide;
    const colors = silly ? ["#ff5fb8", "#ff5a5f", "#ffd84d"] : ["#22b45a", "#3d9bff", "#ffd84d"];
    const n = silly ? 4 : 3;
    for (let i = 0; i < n; i++) {
      const s = document.createElement("span");
      s.className = "juice-note";
      s.textContent = NOTES[(Math.random() * NOTES.length) | 0];
      s.style.left = r.left + r.width / 2 + "px";
      s.style.top = r.top + 4 + "px";
      s.style.setProperty("--c", colors[i % colors.length]);
      s.style.setProperty("--dx", (Math.random() * 90 - 45).toFixed(0) + "px");
      s.style.setProperty("--dy", -(60 + Math.random() * 60).toFixed(0) + "px");
      s.style.setProperty("--rot", (Math.random() * 60 - 30).toFixed(0) + "deg");
      s.style.animationDelay = i * 45 + "ms";
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 1000 + i * 45);
    }
  }

  // Remember which key was the green one, so a press can tell a right note from a silly one
  // (by the time the press is seen, the green has already moved on to the next key).
  const markGuide = () => keys().forEach(k => { k._wasGuide = k._isGuide; k._isGuide = k.classList.contains("guide"); });

  new MutationObserver(muts => {
    if (on()) {
      const pressed = new Set();
      muts.forEach(m => { if (m.type === "attributes" && m.target.classList.contains("down") && !m.oldValue?.includes("down")) pressed.add(m.target); });
      markGuide();
      pressed.forEach(juice);
      keys().forEach(k => {
        const s = realWord(k), was = last.get(k);
        if (s && was && was.text && was.text !== s.textContent && k.classList.contains("down")) bounceOut(k, was);
      });
    }
    remember();
  }).observe(kb, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["class"], attributeOldValue: true });
  remember(); markGuide(); markGuide();
})();
