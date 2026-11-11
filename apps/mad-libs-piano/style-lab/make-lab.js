// Makes style-lab.html: a copy of the built index.html with the fun looks and a switcher added.
// index.html itself is not changed. Run again after rebuilding index.html:  node style-lab/make-lab.js
const fs = require("fs"), path = require("path");
const dir = path.join(__dirname, "..");
let html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const head = `
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400..700&family=Nunito:wght@400;600;700;800&display=swap">
<link rel="stylesheet" href="style-lab/fun.css">
<title>Mad Libs Piano – Style lab</title>`;
const i = html.indexOf("</style>");
if (i < 0) throw new Error("index.html has no </style>");
html = html.slice(0, i + 8) + head + html.slice(i + 8).replace("<title>Mad Libs Piano</title>", "");
html = html.replace("<title>Mad Libs Piano</title>", "") + `\n<script src="style-lab/switcher.js"></script>\n<script src="style-lab/bouncy.js"></script>\n`;
if (!/<meta charset/i.test(html)) html = `<meta charset="utf-8">\n` + html; // a plain local server doesn't say UTF-8, so ♪ and ♯ would come out garbled
fs.writeFileSync(path.join(dir, "style-lab.html"), html);
console.log("wrote style-lab.html");
