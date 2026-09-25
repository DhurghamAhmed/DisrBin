// Syntax highlighting on the server with highlight.js: the page arrives
// already coloured, and the browser loads nothing for it. A curated set of
// languages keeps automatic detection accurate; prose stays plain.
import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import c from "highlight.js/lib/languages/c";
import cpp from "highlight.js/lib/languages/cpp";
import csharp from "highlight.js/lib/languages/csharp";
import css from "highlight.js/lib/languages/css";
import dart from "highlight.js/lib/languages/dart";
import diff from "highlight.js/lib/languages/diff";
import dockerfile from "highlight.js/lib/languages/dockerfile";
import go from "highlight.js/lib/languages/go";
import ini from "highlight.js/lib/languages/ini";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import kotlin from "highlight.js/lib/languages/kotlin";
import lua from "highlight.js/lib/languages/lua";
import makefile from "highlight.js/lib/languages/makefile";
import markdown from "highlight.js/lib/languages/markdown";
import objectivec from "highlight.js/lib/languages/objectivec";
import perl from "highlight.js/lib/languages/perl";
import php from "highlight.js/lib/languages/php";
import plaintext from "highlight.js/lib/languages/plaintext";
import powershell from "highlight.js/lib/languages/powershell";
import python from "highlight.js/lib/languages/python";
import r from "highlight.js/lib/languages/r";
import ruby from "highlight.js/lib/languages/ruby";
import rust from "highlight.js/lib/languages/rust";
import scss from "highlight.js/lib/languages/scss";
import sql from "highlight.js/lib/languages/sql";
import swift from "highlight.js/lib/languages/swift";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";

const LANGS = {
  plaintext, javascript, typescript, python, go, java, kotlin, swift, c, cpp, csharp, rust, php, ruby,
  dart, bash, powershell, sql, json, yaml, xml, css, scss, markdown, dockerfile, ini, makefile, lua,
  perl, r, objectivec, diff,
};
for (const [id, def] of Object.entries(LANGS)) hljs.registerLanguage(id, def);

// Names shown to people, where highlight.js's own are unhelpful.
const NAMES = { plaintext: "Plain text", xml: "HTML", ini: "TOML / INI", bash: "Shell", objectivec: "Objective-C" };

export const LANGUAGE_IDS = Object.keys(LANGS);

// Languages tried when nobody named one. Order breaks ties: JavaScript
// before TypeScript, C before C++. Left out are grammars that match prose
// or other languages too readily (Dart above all, SCSS, INI, R, Perl, Lua,
// Objective-C, PowerShell, Makefile, diff); they can still be chosen.
const AUTO = [
  "javascript", "typescript", "python", "go", "java", "kotlin", "swift", "c", "cpp", "csharp", "rust",
  "php", "ruby", "bash", "sql", "json", "yaml", "xml", "css", "markdown", "dockerfile",
];

// Beyond this, a paste is shown plain: highlighting stays fast.
export const MAX_HIGHLIGHT_BYTES = 128 * 1024;

export const isLanguage = (id) => typeof id === "string" && Object.hasOwn(LANGS, id);
export const languageName = (id) => NAMES[id] || hljs.getLanguage(id)?.name || id;

// coverage is the share of the text's characters a highlighting coloured,
// leaving comments out. Code is mostly tokens; prose only trips over the
// odd keyword, and a list of URLs is nothing but JavaScript "comments".
function coverage(html) {
  let depth = 0, comment = 0, inside = 0, total = 0;
  for (const t of html.match(/<span class="[^"]*">|<\/span>|[^<]+/g) || []) {
    if (t.startsWith("<span")) {
      depth++;
      if (t.includes("hljs-comment")) comment++;
    } else if (t === "</span>") {
      if (comment > 0 && depth <= comment) comment--;
      depth--;
    } else {
      const n = t.replace(/&\w+;/g, "x").replace(/\s+/g, "").length;
      total += n;
      if (depth > 0 && comment === 0) inside += n;
    }
  }
  return total ? inside / total : 0;
}

// Marks a grammar scores too little for, though each belongs to one
// language alone. They settle near ties: highlight.js rates a Java class
// higher as TypeScript than as Java.
const SIGNATURES = {
  java: /\bSystem\.out\.print|public\s+static\s+void\s+main|^import\s+java\./m,
  csharp: /\bConsole\.Write|^using\s+System\b|\bnamespace\s+[\w.]+/m,
  kotlin: /\bfun\s+\w+\s*\(|\bval\s+\w+\s*[:=]/,
  swift: /\bfunc\s+\w+\s*\([^)]*\)\s*(->|\{)|^import\s+(Foundation|UIKit|SwiftUI)\b/m,
  go: /^package\s+\w+|\bfunc\s+(\([^)]*\)\s*)?\w+\s*\(|:=/m,
  python: /^\s*def\s+\w+\s*\(|^\s*(import|from)\s+\w+|\bprint\(/m,
  php: /<\?php|\$\w+\s*=|->\w+\(/,
  ruby: /^\s*def\s+\w+\s*$|\bputs\s|^\s*end\s*$/m,
  rust: /\bfn\s+\w+\s*\(|\blet\s+mut\b|println!\(/,
  cpp: /#include\s*<(iostream|vector|string|map)>|std::|\bcout\b/,
  c: /#include\s*<(stdio|stdlib|string)\.h>|\bprintf\s*\(|\bint\s+main\s*\(/,
  typescript: /:\s*(string|number|boolean|void)\b|\binterface\s+\w+\s*\{|\btype\s+\w+\s*=/,
  javascript: /\bconsole\.log\(|=>|\bconst\s+\w+\s*=|\bdocument\./,
  sql: /\bSELECT\b[\s\S]*\bFROM\b|\bINSERT\s+INTO\b|\bCREATE\s+TABLE\b/i,
  bash: /^#!\/bin\/(ba)?sh|^\s*(if|for|while)\b.*;\s*(then|do)\s*$|\becho\s/m,
};
const SIGNATURE_BONUS = 5;

// Grammars that are near copies of each other tie; a margin is measured
// against the best language outside the family instead.
const FAMILY = { javascript: "js", typescript: "js", c: "c", cpp: "c", objectivec: "c" };
const family = (id) => FAMILY[id] || id;

// Grammars that colour ordinary lines wholesale get a shape check too.
const YAML_LINE = /^\s*(-\s|#|[\w.-]+:(\s|$))/;
const YAML_SHAPE = /^\s*-\s|:\s*$|^\s+[\w.-]+:|:\s*(-?\d+(\.\d+)?|true|false|null|~|"[^"]*"|'[^']*'|\/\S*|[\w.-]+)\s*$/m;
const guards = {
  yaml: (text) => {
    const lines = text.split("\n").filter((l) => l.trim());
    return lines.length > 0 && lines.filter((l) => YAML_LINE.test(l)).length >= lines.length * 0.6 && YAML_SHAPE.test(text);
  },
  markdown: (text) => /^(#{1,6}\s|[-*]\s|\d+\.\s|>|```)/m.test(text) && /[*_`#\[]/.test(text),
};

// detect picks a language for text nobody named. The grammar that scores
// highest must also colour a good share of the text; on a long paste a
// runaway score may make do with less, provided it clearly beats every
// other family, which prose never does since they all tie on English words.
export function detect(text) {
  const scored = AUTO.map((language) => {
    const r = hljs.highlight(text, { language, ignoreIllegals: true });
    const signed = SIGNATURES[language]?.test(text) === true;
    return { language, signed, relevance: r.relevance + (signed ? SIGNATURE_BONUS : 0), coverage: coverage(r.value) };
  });
  scored.sort((a, b) => b.relevance - a.relevance || AUTO.indexOf(a.language) - AUTO.indexOf(b.language));
  const best = scored[0];
  if (best.relevance < 3) return "plaintext";
  const rival = scored.find((c) => family(c.language) !== family(best.language));
  const clear = !rival || best.relevance >= rival.relevance * 1.25;
  // A signature vouches for a sparse grammar like Kotlin's.
  const bar = best.signed ? 0.3 : 0.45;
  const enough = best.coverage >= bar || (best.relevance >= 15 && best.coverage >= 0.2 && clear);
  if (!enough) return "plaintext";
  if (guards[best.language] && !guards[best.language](text)) return "plaintext";
  return best.language;
}

// languageOf decides a paste's language the one way every page shares: a
// language named when it was saved wins, one too large to colour is plain
// text, and anything else is detected. text is without its final newline.
export function languageOf(text, hint, bytes) {
  if (bytes > MAX_HIGHLIGHT_BYTES) return "plaintext";
  if (hint) return isLanguage(hint) ? hint : "plaintext";
  return detect(text);
}

// CM_MODES maps our language ids to CodeMirror 5's mode file and MIME type,
// which the page loads on demand to colour the text.
const CM_MODES = {
  javascript: ["javascript", "text/javascript"], typescript: ["javascript", "text/typescript"],
  python: ["python", "text/x-python"], go: ["go", "text/x-go"], java: ["clike", "text/x-java"],
  kotlin: ["clike", "text/x-kotlin"], swift: ["swift", "text/x-swift"], c: ["clike", "text/x-csrc"],
  cpp: ["clike", "text/x-c++src"], csharp: ["clike", "text/x-csharp"], rust: ["rust", "text/x-rustsrc"],
  php: ["php", "application/x-httpd-php"], ruby: ["ruby", "text/x-ruby"], dart: ["dart", "application/dart"],
  bash: ["shell", "text/x-sh"], powershell: ["powershell", "application/x-powershell"], sql: ["sql", "text/x-sql"],
  json: ["javascript", "application/json"], yaml: ["yaml", "text/x-yaml"], xml: ["htmlmixed", "text/html"],
  css: ["css", "text/css"], scss: ["css", "text/x-scss"], markdown: ["markdown", "text/x-markdown"],
  dockerfile: ["dockerfile", "text/x-dockerfile"], ini: ["toml", "text/x-toml"], lua: ["lua", "text/x-lua"],
  perl: ["perl", "text/x-perl"], r: ["r", "text/x-rsrc"], objectivec: ["clike", "text/x-objectivec"],
  diff: ["diff", "text/x-diff"],
};
export function cmMode(id) {
  const [mode, mime] = CM_MODES[id] || [null, null];
  return { mode, mime };
}

// mostlyArabic reports whether text reads right to left: prose in Arabic
// is shown aligned to the right, code and everything else to the left.
export function mostlyArabic(text) {
  const arabic = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  return arabic > latin;
}
