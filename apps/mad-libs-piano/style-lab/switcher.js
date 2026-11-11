// Style lab switcher. Picks a look (<html data-style>), and for Sunshine a page colour (data-bg)
// and any mix of add-ons (data-add, space-separated). Remembers the choice in this browser, and
// reads ?style=sunshine&bg=sky&add=rainbow,chunky so a combination can be shared as a link.
(() => {
  const looks = [["original", "Original"], ["sunshine", "Sunshine"]];
  const bgs = [["yellow", "#ffd84d"], ["sky", "#8fd3ff"], ["mint", "#8ee6b0"], ["peach", "#ffb38a"], ["lilac", "#c8b6ff"], ["pink", "#ff9ecf"]];
  const adds = [["rainbow", "Rainbow keys"], ["colors", "Color buttons"], ["chunky", "Chunky"], ["dots", "Polka dots"], ["bouncy", "Extra bouncy"]];
  const root = document.documentElement;

  let state = { style: "sunshine", bg: "yellow", add: [] };
  try { Object.assign(state, JSON.parse(localStorage.getItem("mlp-lab") || "{}")); } catch (e) {}
  const q = new URLSearchParams(location.search);
  if (q.get("style")) state.style = q.get("style");
  if (q.get("bg")) state.bg = q.get("bg");
  if (q.has("add")) state.add = q.get("add").split(",").filter(Boolean);

  const bar = document.createElement("div");
  bar.className = "style-lab";
  bar.setAttribute("role", "group");
  bar.setAttribute("aria-label", "Style lab");
  bar.innerHTML =
    `<div class="grp">${looks.map(([id, name]) => `<button type="button" data-look="${id}">${name}</button>`).join("")}</div>` +
    `<div class="grp opt">${bgs.map(([id, c]) => `<button type="button" class="sw" data-bg="${id}" style="--c:${c}" aria-label="${id} page" title="${id}"></button>`).join("")}</div>` +
    `<div class="grp opt">${adds.map(([id, name]) => `<button type="button" data-add="${id}">${name}</button>`).join("")}</div>`;
  document.body.appendChild(bar);

  const apply = () => {
    if (!looks.some(l => l[0] === state.style)) state.style = "sunshine";
    if (state.style === "original") root.removeAttribute("data-style"); else root.setAttribute("data-style", state.style);
    root.setAttribute("data-bg", state.bg);
    root.setAttribute("data-add", state.add.join(" "));
    bar.toggleAttribute("data-off", state.style !== "sunshine");
    bar.querySelectorAll("[data-look]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.look === state.style)));
    bar.querySelectorAll("[data-bg]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.bg === state.bg)));
    bar.querySelectorAll("[data-add]").forEach(b => b.setAttribute("aria-pressed", String(state.add.includes(b.dataset.add))));
    try { localStorage.setItem("mlp-lab", JSON.stringify(state)); } catch (e) {}
    const link = new URL(location.href);
    link.search = state.style === "original" ? "?style=original" : `?style=sunshine&bg=${state.bg}${state.add.length ? "&add=" + state.add.join(",") : ""}`;
    history.replaceState(null, "", link);
  };
  // a click shouldn't leave focus on the switcher, so the letter keys keep playing the piano
  bar.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.look) state.style = b.dataset.look;
    if (b.dataset.bg) state.bg = b.dataset.bg;
    if (b.dataset.add) state.add = state.add.includes(b.dataset.add) ? state.add.filter(a => a !== b.dataset.add) : [...state.add, b.dataset.add];
    apply(); b.blur();
  });
  apply();
})();
