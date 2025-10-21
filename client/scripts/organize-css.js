const fs = require("fs");
const path = require("path");

const ROOT = "./src";
const TARGET = "./src/themes";
const STRUCTURE = {
  base: `${TARGET}/base`,
  pages: `${TARGET}/pages`,
  themes: `${TARGET}/themes`,
};

Object.values(STRUCTURE).forEach((dir) => fs.mkdirSync(dir, { recursive: true }));

function moveCssFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) moveCssFiles(full);
    else if (entry.name.endsWith(".css")) {
      let targetDir = STRUCTURE.base;
      if (full.includes("/pages/")) targetDir = STRUCTURE.pages;
      else if (full.includes("/themes/")) targetDir = STRUCTURE.themes;

      const dest = path.join(targetDir, entry.name);
      const content = fs.readFileSync(full, "utf-8");
      fs.writeFileSync(dest, `/* 🧭 moved from: ${full} */\n${content}\n`);
      console.log(`✅ moved: ${entry.name} → ${targetDir}`);
    }
  }
}

moveCssFiles(ROOT);

const baseFiles = fs.readdirSync(STRUCTURE.base).map(f => `@import './base/${f}';`);
const pageFiles = fs.readdirSync(STRUCTURE.pages).map(f => `@import './pages/${f}';`);
const themeFiles = fs.readdirSync(STRUCTURE.themes).map(f => `@import './themes/${f}';`);

const indexContent = [
  "/* 🧩 Auto-generated CSS imports */",
  "/* Base */",
  ...baseFiles,
  "",
  "/* Pages */",
  ...pageFiles,
  "",
  "/* Themes */",
  ...themeFiles,
].join("\n");

fs.writeFileSync(`${TARGET}/index.css`, indexContent);
console.log("\n🎉 All CSS organized into src/themes and index.css created!");
