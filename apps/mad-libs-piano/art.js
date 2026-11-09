// Song art for Mad Libs Piano: an illustrated scene behind "Your song" for each song,
// shown when the Art toggle is on. Each scene is flat SVG drawn in its own fixed colours
// (it is a picture, so it looks the same in light and dark mode), with the lyric colours
// chosen to read on top of it. Scenes keep their busy parts to the right and bottom so the
// words on the left stay clear.

const ART = (() => {
  // a small seeded random, so every visit draws the same stars and confetti
  function rnd(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
  const W = 800, H = 320;
  const wrap = (bg, body) => `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMaxYMax slice" aria-hidden="true">${bg}${body}</svg>`;
  const sky = (id, a, b) => `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#${id})"/>`;
  const star = (x, y, r, c) => `<path d="M${x} ${y - r}L${x + r * .28} ${y - r * .28}L${x + r} ${y}L${x + r * .28} ${y + r * .28}L${x} ${y + r}L${x - r * .28} ${y + r * .28}L${x - r} ${y}L${x - r * .28} ${y - r * .28}Z" fill="${c}"/>`;
  const dots = (seed, n, x0, x1, y0, y1, f) => { const r = rnd(seed); let s = ""; for (let i = 0; i < n; i++) s += f(x0 + r() * (x1 - x0), y0 + r() * (y1 - y0), r(), i); return s; };
  const hill = (y, amp, c, phase = 0) => { let d = `M0 ${H}L0 ${y}`; for (let x = 0; x <= W; x += 40) d += `L${x} ${(y + Math.sin(x / 130 + phase) * amp).toFixed(1)}`; return `<path d="${d}L${W} ${H}Z" fill="${c}"/>`; };
  const cloud = (x, y, s, c) => `<g fill="${c}"><ellipse cx="${x}" cy="${y}" rx="${36 * s}" ry="${16 * s}"/><ellipse cx="${x - 22 * s}" cy="${y + 4 * s}" rx="${22 * s}" ry="${12 * s}"/><ellipse cx="${x + 24 * s}" cy="${y + 5 * s}" rx="${24 * s}" ry="${11 * s}"/><ellipse cx="${x + 2 * s}" cy="${y - 10 * s}" rx="${20 * s}" ry="${14 * s}"/></g>`;
  const pine = (x, y, h, c) => `<path d="M${x} ${y - h}L${x + h * .32} ${y - h * .45}L${x + h * .16} ${y - h * .45}L${x + h * .42} ${y}L${x - h * .42} ${y}L${x - h * .16} ${y - h * .45}L${x - h * .32} ${y - h * .45}Z" fill="${c}"/>`;
  const flake = (x, y, r, o) => `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(1 + r * 2.6).toFixed(1)}" fill="#fff" opacity="${(.45 + o * .5).toFixed(2)}"/>`;
  const light = { ink: "#1b1a2e", sub: "#3d3a52", silly: "#b0306a", glow: "rgba(255,255,255,.75)" };
  const dark = { ink: "#fbf7ee", sub: "#d9d3e6", silly: "#ff9cc6", glow: "rgba(0,0,0,.55)" };

  const scenes = {
    twinkle: { ...dark, svg: () => wrap(sky("tw", "#0c1534", "#27407a"),
      dots(7, 70, 0, W, 0, H * .8, (x, y, r) => `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(r * 1.6 + .4).toFixed(1)}" fill="#fff" opacity="${(.35 + r * .6).toFixed(2)}"/>`) +
      star(560, 90, 26, "#ffe27a") + star(690, 160, 14, "#fff2b8") + star(470, 200, 10, "#fff2b8") + star(740, 60, 9, "#fff2b8") +
      `<circle cx="700" cy="130" r="34" fill="#fff4cf"/><circle cx="718" cy="120" r="32" fill="#1c2c5c"/>` +
      `<path d="M600 230l24-22 24 22-24 34z" fill="#9fe7ff" opacity=".9"/><path d="M600 230h48M612 230l12 34 12-34" stroke="#e6f9ff" stroke-width="2" fill="none"/>` +
      hill(290, 10, "#0b1129")) },
    row: { ...light, svg: () => wrap(sky("rw", "#bfe6ff", "#e9f7ff"),
      `<circle cx="720" cy="125" r="34" fill="#ffd45c"/>` + cloud(520, 70, 1, "#fff") + cloud(300, 40, .7, "#fff") +
      hill(200, 18, "#8fd18c") + hill(225, 12, "#6cbf73", 2) +
      `<path d="M0 250 C200 230 420 270 800 245 L800 320 L0 320Z" fill="#4aa3df"/><path d="M0 270 C220 255 430 292 800 268" stroke="#bfe6ff" stroke-width="3" fill="none" opacity=".8"/>` +
      `<g transform="translate(560 238)"><path d="M-60 0h120l-18 22h-84z" fill="#a0522d"/><path d="M-40 -6l-26 40M40 -6l26 40" stroke="#5b3417" stroke-width="5"/><circle cx="0" cy="-22" r="12" fill="#ffcf9e"/><rect x="-12" y="-12" width="24" height="16" rx="5" fill="#e4572e"/></g>`) },
    grace: { ...light, svg: () => wrap(sky("gr", "#ffd9a8", "#fff3e0"),
      `<g opacity=".55">${Array.from({ length: 14 }, (_, i) => { const a = Math.PI * (i / 13); return `<path d="M640 300L${(640 + Math.cos(a) * 700).toFixed(0)} ${(300 - Math.sin(a) * 700).toFixed(0)}L${(640 + Math.cos(a + .08) * 700).toFixed(0)} ${(300 - Math.sin(a + .08) * 700).toFixed(0)}Z" fill="#fff6c9"/>`; }).join("")}</g>` +
      `<circle cx="640" cy="300" r="70" fill="#ffb347"/>` + hill(270, 14, "#e8a27a") + hill(292, 10, "#c97b63", 1.5) +
      `<path d="M560 180q14-14 28 0q14-14 28 0" stroke="#6b3e2e" stroke-width="4" fill="none"/><path d="M650 150q10-10 20 0q10-10 20 0" stroke="#6b3e2e" stroke-width="3" fill="none"/>`) },
    clementine: { ...light, svg: () => wrap(sky("cl", "#ffb46b", "#ffe2b0"),
      `<circle cx="560" cy="115" r="40" fill="#fff0b3"/>` +
      `<path d="M380 320V180h70l20-40h90l20 40h40v140z" fill="#c8553d"/><path d="M620 320V150h60l15-30h70l20 30h35v170z" fill="#a8432f"/>` +
      `<path d="M500 320v-60a35 35 0 0170 0v60z" fill="#3a1d14"/><path d="M490 262h90" stroke="#6b3a24" stroke-width="8"/>` +
      `<path d="M330 320v-80M330 270h-18v-26M330 280h18v-24" stroke="#3f8f4f" stroke-width="12" stroke-linecap="round" fill="none"/>` +
      `<g transform="translate(720 300)"><path d="M-20 0l6-18h28l6 18z" fill="#c7a17a"/><path d="M-12-18c0-10 24-10 24 0" fill="#e4c14b"/></g>` + hill(306, 4, "#d98c53")) },
    range: { ...light, svg: () => wrap(sky("rg", "#8fd0ff", "#e6f5ff"),
      cloud(460, 60, 1.1, "#fff") + cloud(700, 110, .8, "#fff") + `<circle cx="620" cy="125" r="26" fill="#ffd45c"/>` +
      hill(220, 6, "#b9a36b", .5) + hill(240, 8, "#d8bf63", 1) +
      `<g fill="#5a3b22"><ellipse cx="560" cy="250" rx="46" ry="26"/><circle cx="604" cy="246" r="18"/><rect x="528" y="262" width="9" height="26"/><rect x="580" y="262" width="9" height="26"/><path d="M612 232l10-10M600 230l-2-12" stroke="#5a3b22" stroke-width="5"/></g>` +
      `<g fill="#b97a3c"><ellipse cx="700" cy="262" rx="24" ry="11"/><circle cx="724" cy="250" r="7"/><path d="M684 270v18M714 270v18" stroke="#b97a3c" stroke-width="4"/><path d="M724 244l6-14M727 245l10-12" stroke="#5a3b22" stroke-width="2.5"/></g>` +
      `<path d="M380 320 L410 236 M392 280 l28-10" stroke="#8a6a3a" stroke-width="3"/>`) },
    shenandoah: { ...dark, svg: () => wrap(sky("sh", "#3c3f7a", "#e58b6b"),
      `<circle cx="640" cy="210" r="46" fill="#ffd08a"/>` + hill(190, 26, "#4b4f8c") + hill(220, 22, "#373b6e", 1.2) + hill(250, 14, "#262a54", 2.4) +
      `<path d="M300 320 C420 300 520 280 640 262 C700 254 760 252 800 252 L800 274 C700 280 580 296 480 320Z" fill="#f2a46e" opacity=".85"/>` +
      `<g transform="translate(560 288)"><path d="M-34 0h68l-10 12h-48z" fill="#1a1c3a"/><path d="M0 0v-46l26 34z" fill="#fff3e0"/></g>`) },
    birthday: { ...light, svg: () => wrap(sky("bd", "#ffe3f1", "#fff7e0"),
      dots(11, 45, 430, W, 60, H, (x, y, r, i) => `<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="7" height="12" rx="2" fill="${["#ff6b9a", "#ffc93c", "#4fc3f7", "#7bd389", "#b388ff"][i % 5]}" transform="rotate(${(r * 180).toFixed(0)} ${x.toFixed(0)} ${y.toFixed(0)})" opacity=".8"/>`) +
      [["#ff6b9a", 470, 90], ["#4fc3f7", 540, 60], ["#ffc93c", 610, 100], ["#7bd389", 700, 70]].map(([c, x, y]) => `<path d="M${x} ${y + 40}q-6 40 6 90" stroke="#888" stroke-width="1.5" fill="none"/><ellipse cx="${x}" cy="${y}" rx="28" ry="36" fill="${c}"/><path d="M${x - 4} ${y + 36}h8l-4 6z" fill="${c}"/>`).join("") +
      `<g transform="translate(600 300)"><rect x="-90" y="-60" width="180" height="60" rx="8" fill="#ffb6c9"/><rect x="-90" y="-60" width="180" height="16" rx="8" fill="#fff"/><rect x="-70" y="-110" width="140" height="50" rx="8" fill="#ffd7a8"/><rect x="-70" y="-110" width="140" height="12" rx="6" fill="#fff"/>${[-40, 0, 40].map(x => `<rect x="${x - 4}" y="-140" width="8" height="30" fill="#4fc3f7"/><path d="M${x} -152q8 8 0 14q-8-6 0-14z" fill="#ffb300"/>`).join("")}</g>`) },
    jingle: { ...dark, svg: () => wrap(sky("jb", "#0e2a4a", "#3d6e9c"),
      dots(5, 80, 0, W, 0, H, (x, y, r, i) => flake(x, y, r, (i * 37 % 10) / 10)) + hill(250, 16, "#eef4fb") + hill(275, 10, "#dce8f5", 2) +
      pine(470, 250, 90, "#1f5a3e") + pine(740, 260, 120, "#1a4d35") +
      `<g transform="translate(600 238)"><path d="M-70 0h110q20 0 24-24" stroke="#c0392b" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M-80 10h150" stroke="#e8c15a" stroke-width="5" stroke-linecap="round"/><rect x="-66" y="-40" width="90" height="40" rx="10" fill="#c0392b"/><circle cx="-30" cy="-44" r="12" fill="#ffd166"/></g>` +
      `<g transform="translate(470 200)">${[0, 1, 2].map(i => `<circle cx="${i * 16}" cy="${(i % 2) * 6}" r="8" fill="#ffd166" stroke="#b8860b" stroke-width="2"/>`).join("")}</g>`) },
    macdonald: { ...light, svg: () => wrap(sky("md", "#a8dcff", "#e9f7ff"),
      `<circle cx="740" cy="120" r="30" fill="#ffd45c"/>` + cloud(400, 60, .9, "#fff") + hill(240, 8, "#8bcf6e") +
      `<g transform="translate(560 250)"><path d="M-70 0V-80l70-50 70 50V0z" fill="#c8372d"/><path d="M-70-80l70-50 70 50" stroke="#fff" stroke-width="6" fill="none"/><rect x="-26" y="-56" width="52" height="56" fill="#fff"/><path d="M-26-56l52 56M26-56l-52 56" stroke="#c8372d" stroke-width="5"/><rect x="-14" y="-108" width="28" height="22" fill="#fff"/></g>` +
      `<g transform="translate(700 270)"><ellipse cx="0" cy="0" rx="40" ry="22" fill="#fff"/><circle cx="-12" cy="-6" r="8" fill="#222"/><circle cx="14" cy="4" r="9" fill="#222"/><ellipse cx="44" cy="-12" rx="16" ry="13" fill="#fff"/><ellipse cx="52" cy="-6" rx="8" ry="6" fill="#ffb6c1"/><path d="M-26 18v18M26 18v18" stroke="#fff" stroke-width="7"/></g>` +
      `<path d="M360 290h440M360 270h440" stroke="#d9b07a" stroke-width="6"/>${[380, 440, 500, 640, 760].map(x => `<rect x="${x}" y="258" width="8" height="42" fill="#c9965a"/>`).join("")}`) },
    merry: { ...dark, svg: () => wrap(sky("mx", "#1d1530", "#3b2a55"),
      dots(9, 60, 0, W, 0, H, (x, y, r, i) => flake(x, y, r, (i * 53 % 10) / 10)) + hill(285, 8, "#f1eef8") +
      `<g transform="translate(600 290)">${[[0, -220, 70], [0, -160, 95], [0, -95, 120]].map(([x, y, w]) => `<path d="M${x} ${y}L${x + w} ${y + 90}H${x - w}Z" fill="#2e8b57"/>`).join("")}<rect x="-14" y="-6" width="28" height="22" fill="#6b3e26"/>${star(0, -228, 18, "#ffd700")}${[[-40, -120, "#ff5c5c"], [30, -150, "#4fc3f7"], [-20, -70, "#ffd166"], [55, -60, "#ff9cc6"], [-60, -40, "#7bd389"], [10, -100, "#ff5c5c"]].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="8" fill="${c}"/>`).join("")}</g>` +
      `<g transform="translate(720 290)"><rect x="-26" y="-30" width="52" height="30" fill="#e74c3c"/><rect x="-4" y="-30" width="8" height="30" fill="#ffd166"/></g><g transform="translate(470 290)"><rect x="-22" y="-24" width="44" height="24" fill="#4fc3f7"/><rect x="-22" y="-14" width="44" height="6" fill="#fff"/></g>`) },
    mary: { ...light, svg: () => wrap(sky("my", "#c9ecff", "#f3fbff"),
      cloud(380, 70, .8, "#fff") + `<circle cx="745" cy="115" r="26" fill="#ffe066"/>` + hill(235, 10, "#a8e08a") + hill(262, 8, "#8fd17a", 1.7) +
      `<g transform="translate(640 210)"><rect x="-56" y="-50" width="112" height="70" fill="#e85d4a"/><path d="M-66-50L0-96l66 46z" fill="#7a3b2e"/><rect x="-14" y="-12" width="28" height="32" fill="#7a3b2e"/><rect x="-6" y="-120" width="12" height="28" fill="#7a3b2e"/><path d="M0-120h20v10H0" fill="#ffd166"/></g>` +
      `<g transform="translate(520 280)"><g fill="#fff">${[[-20, 0], [0, -8], [20, 0], [-10, 8], [10, 8], [0, 4]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="16"/>`).join("")}</g><ellipse cx="36" cy="-4" rx="12" ry="10" fill="#3d3d3d"/><circle cx="40" cy="-6" r="2" fill="#fff"/><path d="M-16 18v14M12 18v14" stroke="#3d3d3d" stroke-width="5"/></g>` +
      dots(4, 16, 360, 800, 280, 315, (x, y, r, i) => `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="4" fill="${["#ff8fab", "#ffd166", "#fff"][i % 3]}"/>`)) },
    spider: { ...light, svg: () => wrap(sky("sp", "#cfe6f5", "#f3f9ee"),
      `<circle cx="700" cy="120" r="34" fill="#ffd45c"/>` + cloud(560, 70, 1, "#fff") + cloud(470, 105, .7, "#eef4fa") +
      dots(21, 26, 430, 620, 110, 230, (x, y) => `<path d="M${x.toFixed(0)} ${y.toFixed(0)}l-3 9" stroke="#7fb3e0" stroke-width="2.4" stroke-linecap="round"/>`) +
      hill(275, 8, "#9fd08a") + `<rect x="640" y="150" width="26" height="150" fill="#9aa7b4"/><rect x="630" y="140" width="46" height="18" rx="4" fill="#7f8c99"/><path d="M653 300q0 14 24 14h40v-18h-40" fill="#7f8c99"/>` +
      `<path d="M653 158v52" stroke="#555" stroke-width="1.5"/><g transform="translate(653 222)"><ellipse rx="11" ry="9" fill="#333"/><circle cy="-10" r="6" fill="#333"/><path d="M-10-4l-12-8M-10 2l-14 0M-10 6l-12 9M10-4l12-8M10 2l14 0M10 6l12 9" stroke="#333" stroke-width="2.4" stroke-linecap="round"/><circle cx="-2" cy="-11" r="1.6" fill="#fff"/><circle cx="2.5" cy="-11" r="1.6" fill="#fff"/></g>`) },
    london: { ...light, svg: () => wrap(sky("ld", "#c9d6e3", "#eef2f6"),
      cloud(480, 70, 1, "#fff") + `<path d="M0 262h800v58H0z" fill="#6f8fa8"/><path d="M0 272c120-8 240 8 360 0s240-8 440 0" stroke="#b9cbd9" stroke-width="3" fill="none"/>` +
      `<g fill="#6b6f7a"><rect x="470" y="120" width="44" height="150"/><rect x="660" y="120" width="44" height="150"/><path d="M466 120l26-34 26 34zM656 120l26-34 26 34z"/><rect x="514" y="150" width="146" height="10"/><path d="M380 230h420v14H380z"/></g>` +
      `<g fill="#9ea6b4">${[0, 1, 2, 3].map(i => `<rect x="${478 + i * 0}" y="${140 + i * 30}" width="28" height="14" rx="7"/><rect x="${668}" y="${140 + i * 30}" width="28" height="14" rx="7"/>`).join("")}</g>` +
      `<path d="M514 244q73-70 146 0" stroke="#4d5260" stroke-width="5" fill="none"/>`) },
    yankee: { ...light, svg: () => wrap(sky("yk", "#dff0ff", "#fffaf0"),
      `<g>${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<path d="M${400 + i * 52} 20l26 38 26-38z" fill="${["#c0392b", "#fff", "#2d5aa0"][i % 3]}" stroke="#d9d9d9"/>`).join("")}<path d="M396 20h420" stroke="#8a6a3a" stroke-width="3"/></g>` +
      hill(265, 10, "#a5d78f") +
      `<g transform="translate(620 250)"><ellipse rx="56" ry="26" fill="#a0673a"/><path d="M42-10l30-34 14 6-24 40z" fill="#a0673a"/><circle cx="80" cy="-42" r="13" fill="#a0673a"/><path d="M74-50l-6-16M84-50l2-16" stroke="#6b4423" stroke-width="5"/><path d="M-40 18v34M-14 22v30M18 22v30M42 18v34" stroke="#6b4423" stroke-width="8"/><path d="M-56-6q-20 10-12 40" stroke="#4a2f17" stroke-width="7" fill="none"/></g>` +
      `<g transform="translate(560 150) rotate(-20)"><path d="M0 0q40-30 90-6-50 18-90 6z" fill="#fff" stroke="#bbb"/><path d="M0 0h96" stroke="#999" stroke-width="2"/></g>`) },
    sleeping: { ...dark, svg: () => wrap(sky("sl", "#141a3c", "#3a2e5c"),
      dots(31, 50, 0, W, 0, H * .7, (x, y, r) => `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(r * 1.4 + .4).toFixed(1)}" fill="#fff" opacity="${(.3 + r * .6).toFixed(2)}"/>`) +
      `<circle cx="720" cy="80" r="30" fill="#fff4cf"/><circle cx="734" cy="72" r="28" fill="#1d2248"/>` +
      `<g fill="#2a2450"><rect x="520" y="110" width="80" height="210"/><path d="M510 110l50-60 50 60z"/></g><path d="M545 160a15 15 0 0130 0v22h-30z" fill="#ffd166"/><circle cx="560" cy="186" r="4" fill="#ffd166"/>` +
      `<g font-family="Figtree, sans-serif" font-weight="700" fill="#d9d3e6" opacity=".85"><text x="640" y="200" font-size="22">z</text><text x="662" y="176" font-size="28">z</text><text x="690" y="146" font-size="36">Z</text></g>` +
      hill(300, 6, "#120f26")) },
    farmer: { ...light, svg: () => wrap(sky("fm", "#bfe3ff", "#fff8e6"),
      `<circle cx="720" cy="120" r="28" fill="#ffd45c"/>` + cloud(480, 70, .9, "#fff") + hill(225, 20, "#9ccf7a", .4) + hill(255, 14, "#7fbf65", 2) +
      `<g transform="translate(560 270)"><circle cy="-62" r="14" fill="#ffcf9e"/><path d="M-26-74h52l-8-10h-36z" fill="#d9a441"/><rect x="-14" y="-50" width="28" height="40" rx="6" fill="#3d7bc4"/><path d="M-8-10v30M8-10v30" stroke="#5a3b22" stroke-width="7"/><path d="M14-40l26-16" stroke="#8a6a3a" stroke-width="4"/></g>` +
      `<g transform="translate(700 280)"><path d="M0 0l40-24 40 24-40 18z" fill="#ffd54a"/><path d="M0 0v16l40 18 40-18V0" fill="#f2c02e"/><circle cx="22" cy="2" r="4" fill="#e6ac12"/><circle cx="52" cy="-6" r="5" fill="#e6ac12"/></g>`) },
    scarborough: { ...dark, svg: () => wrap(sky("sc", "#2f4f5f", "#9cb8b8"),
      `<circle cx="660" cy="130" r="40" fill="#f3efe0" opacity=".85"/>` + hill(210, 16, "#3e6262", .8) +
      `<path d="M380 320V230q60-30 120-20t110-10 190 0V320z" fill="#5d7f6b"/><path d="M0 270h800v50H0z" fill="#2b4a58" opacity=".7"/>` +
      `<g transform="translate(470 285)" stroke="#2e5d3a" stroke-width="3" fill="#6ba36f">${[0, 1, 2, 3, 4].map(i => `<path d="M${i * 10} 0q${-8 + i * 4} -30 ${-4 + i * 3} -60" fill="none"/><ellipse cx="${i * 10 - 6 + i * 3}" cy="-40" rx="5" ry="9"/>`).join("")}</g>` +
      `<g transform="translate(700 260)"><path d="M0 0v-90l18 10v80z" fill="#c9c2b0"/><path d="M-4-90l11-14 11 14z" fill="#8d6e63"/></g>`) },
    saints: { ...dark, svg: () => wrap(sky("st", "#2a1a4a", "#6a3d8a"),
      dots(41, 40, 380, W, 20, 200, (x, y, r, i) => `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(2 + r * 3).toFixed(1)}" fill="${["#ffd166", "#7bd389", "#ff9cc6"][i % 3]}" opacity=".8"/>`) +
      `<g transform="translate(560 200) rotate(-12)"><path d="M0 0h120l40-26v66l-40-26H0z" fill="#ffcf3f"/><rect x="18" y="-10" width="10" height="20" fill="#e0a800"/><rect x="40" y="-10" width="10" height="20" fill="#e0a800"/><rect x="62" y="-10" width="10" height="20" fill="#e0a800"/><circle cx="-6" cy="7" r="7" fill="#e0a800"/></g>` +
      `<g fill="#ffd166" font-family="Georgia, serif" font-size="40"><text x="470" y="120">♪</text><text x="720" y="90">♫</text><text x="660" y="300">♪</text></g>` +
      hill(300, 6, "#1d1233")) },
    daisy: { ...light, svg: () => wrap(sky("dy", "#d7efff", "#fbfff0"),
      `<circle cx="720" cy="110" r="28" fill="#ffd45c"/>` + cloud(480, 70, .9, "#fff") + hill(250, 10, "#a8dc8f") +
      dots(17, 24, 380, W, 262, 315, (x, y) => `<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)})">${[0, 60, 120, 180, 240, 300].map(a => `<ellipse rx="3" ry="7" fill="#fff" transform="rotate(${a}) translate(0 -6)"/>`).join("")}<circle r="3.4" fill="#ffc93c"/></g>`) +
      `<g transform="translate(560 220)" fill="none" stroke="#2d5aa0" stroke-width="5"><circle cx="0" cy="40" r="30"/><circle cx="170" cy="40" r="30"/><path d="M0 40l40-44h90l40 44M40-4l20 44h50l20-44M60 40l-6-50M110 40l-6-50"/><path d="M48-16h16M98-16h16M164-14l12-14" stroke-linecap="round"/></g>`) },
    joy: { ...light, svg: () => wrap(sky("jy", "#ffe9b0", "#fff7e8"),
      `<g opacity=".5">${Array.from({ length: 12 }, (_, i) => { const a = Math.PI * (i / 11); return `<path d="M640 320L${(640 + Math.cos(a) * 700).toFixed(0)} ${(320 - Math.sin(a) * 700).toFixed(0)}L${(640 + Math.cos(a + .1) * 700).toFixed(0)} ${(320 - Math.sin(a + .1) * 700).toFixed(0)}Z" fill="#fff4c4"/>`; }).join("")}</g>` +
      `<circle cx="640" cy="320" r="64" fill="#ffb347"/>` + hill(285, 8, "#c6e3a0") +
      dots(9, 18, 400, W, 250, 310, (x, y, r, i) => `<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)})"><path d="M0 0v18" stroke="#5c9b4f" stroke-width="2"/>${[0, 72, 144, 216, 288].map(a => `<ellipse rx="4" ry="7" fill="${["#ff6b9a", "#b388ff", "#ffc93c"][i % 3]}" transform="rotate(${a}) translate(0 -6)"/>`).join("")}<circle r="3" fill="#fff4c4"/></g>`)) },
    auld: { ...dark, svg: () => wrap(sky("al", "#0d1430", "#2b2350"),
      [[520, 90, "#ffd166"], [660, 70, "#ff9cc6"], [740, 150, "#7bd389"], [590, 170, "#9fd4ff"]].map(([x, y, c]) => `<g stroke="${c}" stroke-width="3" stroke-linecap="round">${Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6; return `<path d="M${(x + Math.cos(a) * 10).toFixed(0)} ${(y + Math.sin(a) * 10).toFixed(0)}L${(x + Math.cos(a) * 34).toFixed(0)} ${(y + Math.sin(a) * 34).toFixed(0)}"/>`; }).join("")}</g>`).join("") +
      `<g transform="translate(450 250)"><circle r="44" fill="#f3efe0"/><circle r="44" fill="none" stroke="#c9a227" stroke-width="5"/><path d="M0 0V-32M0 0l20-10" stroke="#222" stroke-width="5" stroke-linecap="round"/></g>` + hill(300, 6, "#090d22")) },
  };
  // Key art: colours for the white and black keys, and a small picture (a 24x24 SVG shape)
  // that sits at the top of each white key and repeats faintly as a pattern.
  const K = (white, whiteDown, black, blackDown, line, ink, inkDark, silly, sillyDark, note, motifColor, motifDark, motif) =>
    ({ white, whiteDown, black, blackDown, line, ink, inkDark, silly, sillyDark, note, motifColor, motifDark, motif });
  const STAR = "<path d='M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.2l7.1-.6z'/>";
  const keys = {
    twinkle: K("#eef1fb", "#d9def3", "#101a3d", "#26346a", "#c5cbe6", "#141a33", "#e8ecff", "#9b2a6b", "#ffb8dc", "#6a7290", "#e0b100", "#ffe27a", STAR),
    row: K("#eef8ff", "#d6ecfb", "#1f4f7a", "#2f6a9c", "#bcd8ec", "#10283d", "#e6f4ff", "#a8326b", "#ffc2de", "#5a7a92", "#3b8fd1", "#9fd4ff",
      "<path d='M2 13c3-4 5-4 8 0s5 4 8 0 4-3 4-3v6c-3 3-5 3-8 0s-5-3-8 0-4 3-4 3z'/>"),
    grace: K("#fff6e8", "#f4e3c6", "#5a2e22", "#7a4434", "#ead6b3", "#2e1a12", "#ffeedd", "#a82d5c", "#ffc0d6", "#8a6e55", "#e89a2c", "#ffcf7a",
      "<circle cx='12' cy='12' r='5'/><path d='M11 1h2v4h-2zM11 19h2v4h-2zM1 11h4v2H1zM19 11h4v2h-4zM4.2 5.6l1.4-1.4 2.8 2.8-1.4 1.4zM15.6 17l1.4-1.4 2.8 2.8-1.4 1.4zM4.2 18.4l2.8-2.8 1.4 1.4-2.8 2.8zM15.6 7l2.8-2.8 1.4 1.4-2.8 2.8z'/>"),
    clementine: K("#fff1e2", "#f5dcc0", "#5e2a1c", "#7c3c2a", "#ecceae", "#331a10", "#ffe9d6", "#9e2c55", "#ffbfd3", "#8d6a52", "#d9a017", "#ffd36b",
      "<path d='M3 17l3-8 6-4 7 4 2 8-8 4z'/>"),
    range: K("#fbf5e4", "#efe4c4", "#4a3420", "#654a30", "#e3d6b0", "#2b1e10", "#fff1d9", "#a3305e", "#ffc1d8", "#8b7a5a", "#9a6a35", "#e8c58f",
      "<path d='M5 3h3.5v9a3.5 3.5 0 007 0V3H19v9a7 7 0 01-14 0z'/>"),
    shenandoah: K("#f1effa", "#dedaf0", "#262a54", "#3a3f78", "#cfcae4", "#1c1d3a", "#f0eeff", "#a8306a", "#ffb9d9", "#6d6a8f", "#e5866a", "#ffb48f",
      "<path d='M11 2v14H4zM13 5l6 11h-6zM2 18h20l-3 4H5z'/>"),
    birthday: K("#fff4f8", "#fbdde8", "#5b2a5e", "#76407a", "#f2cddb", "#2e1630", "#fff0fb", "#a3215c", "#ffd25e", "#8f6f86", "#ff6b9a", "#ffc93c",
      "<ellipse cx='12' cy='9' rx='6' ry='7.5'/><path d='M10.5 16.2h3l-1.5 2zM11.4 18h1.2v5h-1.2z'/>"),
    jingle: K("#f2f7fc", "#dce8f5", "#0e2a4a", "#1d4570", "#c9d9ea", "#0f2236", "#eef6ff", "#b02a3a", "#ff9aa6", "#5f7590", "#c0392b", "#ffd166",
      "<path d='M12 2a1.5 1.5 0 011.5 1.5v.7A6 6 0 0118 10v5l2 3H4l2-3v-5a6 6 0 014.5-5.8v-.7A1.5 1.5 0 0112 2zM9.5 19h5a2.5 2.5 0 01-5 0z'/>"),
    macdonald: K("#fbf8ee", "#efe8d2", "#6b1f1a", "#8c2c25", "#e3dbc0", "#2a1d12", "#fff1ea", "#a3285a", "#ffc3d7", "#87775c", "#c8372d", "#ffd0c8",
      "<path fill-rule='evenodd' d='M2 10L12 3l10 7v11H2zM9 21v-7h6v7z'/>"),
    merry: K("#f4f9f4", "#dcecdc", "#2a1d40", "#3e2d5c", "#cfe0cf", "#14261a", "#f2ecff", "#b02a3a", "#ffd166", "#5e7a63", "#2e8b57", "#7bd389",
      "<path d='M12 1l5 7h-3l4 6h-3l4 6H5l4-6H6l4-6H7zM11 20h2v3h-2z'/>"),
    mary: K("#f7fbf2", "#e3f0d6", "#4a3a36", "#655047", "#d6e6c6", "#1e2a14", "#fff6ee", "#a62c62", "#ffc4dc", "#6c7d5d", "#a99686", "#f3ede5",
      "<circle cx='8' cy='12' r='4'/><circle cx='12' cy='9.5' r='4'/><circle cx='15.5' cy='12' r='4'/><circle cx='11.5' cy='14' r='4'/><ellipse cx='20' cy='10' rx='2.6' ry='2.1'/><path d='M8 16h1.6v5H8zM14 16h1.6v5H14z'/>"),
    spider: K("#f3f7f2", "#dfe9db", "#2f3b45", "#46566a", "#cfdccb", "#1a2620", "#eef6ff", "#a62c62", "#ffc2de", "#647660", "#333333", "#c9d3dc",
      "<ellipse cx='12' cy='13' rx='4' ry='3.4'/><circle cx='12' cy='8.5' r='2.4'/><path d='M8.5 11L3 7.5M8.5 13H2.5M8.5 15l-5 4M15.5 11L21 7.5M15.5 13h6M15.5 15l5 4M12 6V1' stroke='currentColor' stroke-width='1.4' fill='none'/>"),
    london: K("#f1f3f6", "#dde2e9", "#3a3f4b", "#525868", "#cdd3dc", "#1d212a", "#eef0f5", "#a62c62", "#ffc2de", "#6b7280", "#6b6f7a", "#c9ced8",
      "<path d='M2 20h20v2H2zM4 6h3v14H4zM17 6h3v14h-3zM3.5 6L5.5 2l2 4zM16.5 6l2-4 2 4zM7 9h10v1.6H7zM7 18q5-7 10 0v1H7z'/>"),
    yankee: K("#fbf7ef", "#efe6d2", "#1f3d72", "#2d5aa0", "#e6dcc6", "#1d1f2b", "#eef3ff", "#b02a3a", "#ffc2cc", "#7d7462", "#b02a3a", "#ffffff",
      "<path d='M3 20C8 9 15 4 21 3c-2 6-7 13-18 17z'/><path d='M3 20L19 5' stroke='#fff' stroke-width='1' fill='none'/>"),
    sleeping: K("#eef0f8", "#d9ddee", "#1d2248", "#2e3570", "#cdd2e6", "#151834", "#f0eeff", "#9b2a6b", "#ffb8dc", "#6a7090", "#8a7fd0", "#fff4cf",
      "<path d='M15 3a9 9 0 100 18 7.5 7.5 0 010-18z'/>"),
    farmer: K("#fbfaee", "#efecd2", "#5a6b2a", "#728836", "#e3e0c0", "#262a12", "#f6ffe6", "#a3285a", "#ffc3d7", "#7d7c5c", "#d9a441", "#ffd54a",
      "<path d='M11 22V8h2v14zM12 2c2 2 2 5 0 7-2-2-2-5 0-7zM12 9c3 0 5 2 5 4-3 0-5-2-5-4zM12 9c-3 0-5 2-5 4 3 0 5-2 5-4zM12 14c3 0 5 2 5 4-3 0-5-2-5-4zM12 14c-3 0-5 2-5 4 3 0 5-2 5-4z'/>"),
    scarborough: K("#f1f6f4", "#dbe8e3", "#2b4a58", "#3d6475", "#cadfd8", "#16262c", "#e9f6f6", "#a62c62", "#ffc4dc", "#5f7a74", "#4f8a5b", "#b8e0bf",
      "<path d='M12 22V10M12 14c-4 0-6-3-6-6 4 0 6 3 6 6zM12 11c4 0 6-3 6-6-4 0-6 3-6 6zM12 18c4 0 6-3 6-5-4 0-6 2-6 5z'/>"),
    saints: K("#f6f0fb", "#e6dbf2", "#3a1f5e", "#53308a", "#dccce8", "#1f1230", "#fff3d1", "#a3215c", "#ffd166", "#7a6890", "#c9a227", "#ffd166",
      "<path d='M9 3v12.3A3.5 3.5 0 1011 18V7l8-2v8.3A3.5 3.5 0 1021 16V1z'/>"),
    daisy: K("#f7fbf2", "#e3f0d6", "#2d5aa0", "#3d6fbf", "#d6e6c6", "#1e2a14", "#eef4ff", "#a62c62", "#ffc4dc", "#6c7d5d", "#e6b800", "#ffffff",
      "<g transform='translate(12 12)'><ellipse rx='3' ry='7' transform='translate(0 -5)'/><ellipse rx='3' ry='7' transform='rotate(60) translate(0 -5)'/><ellipse rx='3' ry='7' transform='rotate(120) translate(0 -5)'/><ellipse rx='3' ry='7' transform='rotate(180) translate(0 -5)'/><ellipse rx='3' ry='7' transform='rotate(240) translate(0 -5)'/><ellipse rx='3' ry='7' transform='rotate(300) translate(0 -5)'/></g>"),
    joy: K("#fff8ea", "#f5e8c8", "#7a3b5c", "#94507a", "#eedcb6", "#2e1a12", "#fff0f6", "#a82d5c", "#ffd25e", "#8a6e55", "#ff6b9a", "#ffc93c",
      "<path d='M12 21C5 15 2 12 2 8a5 5 0 0110-1 5 5 0 0110 1c0 4-3 7-10 13z'/>"),
    auld: K("#f0f0f8", "#dcdcee", "#14183a", "#232a5c", "#cfd0e4", "#141630", "#f0eeff", "#9b2a6b", "#ffd166", "#6a6d90", "#c9a227", "#ffd166",
      "<path d='M12 1l2 8 8-2-6 6 6 6-8-2-2 8-2-8-8 2 6-6-6-6 8 2z'/>"),
  };
  for (const id in scenes) scenes[id].keys = keys[id];
  return scenes;
})();

if (typeof module !== "undefined") module.exports = { ART };
