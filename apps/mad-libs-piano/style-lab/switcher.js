// Style lab switcher: sets <html data-style="..."> and remembers the pick in this browser.
(() => {
  const looks = [["original", "Original"], ["stickers", "Stickers"], ["notebook", "Notebook"], ["cardboard", "Cardboard"]];
  const root = document.documentElement;
  const fromUrl = new URLSearchParams(location.search).get("style");
  let saved = null;
  try { saved = localStorage.getItem("mlp-style"); } catch (e) {}
  const bar = document.createElement("div");
  bar.className = "style-lab";
  bar.setAttribute("role", "group");
  bar.setAttribute("aria-label", "Style lab");
  bar.innerHTML = "<span>Style lab</span>" + looks.map(([id, name]) => `<button type="button" data-look="${id}">${name}</button>`).join("");
  document.body.appendChild(bar);
  const set = id => {
    if (!looks.some(l => l[0] === id)) id = "stickers";
    if (id === "original") root.removeAttribute("data-style"); else root.setAttribute("data-style", id);
    bar.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.look === id)));
    try { localStorage.setItem("mlp-style", id); } catch (e) {}
  };
  // a click shouldn't leave focus on the switcher, so the letter keys keep playing the piano
  bar.addEventListener("click", e => { const b = e.target.closest("button"); if (b) { set(b.dataset.look); b.blur(); } });
  set(fromUrl || saved || "stickers");
})();
