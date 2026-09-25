// disrbin: one CodeMirror for both pages. On "/" it edits and saves; on a
// paste's page it shows the text read-only in the paste's language.
(function () {
  var root = document.documentElement;
  function remember(key, value) {
    try { localStorage.setItem(key, value); } catch (e) {}
  }
  function recall(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  // --- Theme: remembered choice, otherwise the system's ---
  var themeBtn = document.getElementById("theme");
  function effectiveTheme() {
    var t = root.getAttribute("data-theme");
    if (t === "dark" || t === "light") return t;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  themeBtn.addEventListener("click", function () {
    var next = effectiveTheme() === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    remember("theme", next);
  });

  var app = document.getElementById("app");
  if (!app) return;
  var isView = app.classList.contains("view");
  var CDN = "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.20";
  CodeMirror.modeURL = CDN + "/mode/%N/%N.min.js";

  var toastEl = document.getElementById("toast");
  var toastTimer;
  function toast(text) {
    toastEl.textContent = text;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.hidden = true; }, 1600);
  }

  // --- Editor ---
  var wrapPref = recall("wrap");
  var wrap = wrapPref === null ? window.matchMedia("(max-width: 640px)").matches : wrapPref === "1";
  var source = document.getElementById("source");
  var editor = CodeMirror(app, {
    value: source ? source.value : "",
    lineNumbers: true,
    theme: "disrbin",
    lineWrapping: wrap,
    readOnly: isView,
    styleActiveLine: !isView,
    matchBrackets: true,
    indentUnit: 4,
    tabSize: 4,
    direction: app.dataset.dir === "rtl" ? "rtl" : "ltr",
    placeholder: isView ? "" : "Paste code, save and share the link.",
    extraKeys: {
      "Ctrl-S": function () { save(); },
      "Cmd-S": function () { save(); },
      Tab: function (cm) {
        if (cm.somethingSelected()) cm.indentSelection("add");
        else cm.replaceSelection(cm.getOption("indentWithTabs") ? "\t" : Array(cm.getOption("indentUnit") + 1).join(" "), "end");
      },
    },
  });
  var fallback = document.getElementById("fallback");
  if (fallback) fallback.remove();
  if (!isView) editor.focus();

  // setLanguage loads a mode from the CDN on first use, then applies it.
  function setLanguage(mode, mime) {
    if (!mode) { editor.setOption("mode", null); return; }
    editor.setOption("mode", mime);
    CodeMirror.autoLoadMode(editor, mode);
  }
  if (isView) setLanguage(app.dataset.mode, app.dataset.mime);

  // --- Wrap toggle ---
  var wrapBtn = document.getElementById("wrap");
  function applyWrap(on) {
    editor.setOption("lineWrapping", on);
    wrapBtn.setAttribute("aria-pressed", on ? "true" : "false");
  }
  applyWrap(wrap);
  wrapBtn.addEventListener("click", function () {
    var on = !editor.getOption("lineWrapping");
    applyWrap(on);
    remember("wrap", on ? "1" : "0");
  });

  // --- Copy: the text, or the link ---
  function copyText(text, done) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { toast("Copy failed"); });
    } else {
      toast("Copy not available");
    }
  }
  var copyBtn = document.getElementById("copy");
  if (copyBtn) copyBtn.addEventListener("click", function () { copyText(editor.getValue(), function () { toast("Copied"); }); });
  var crumb = document.getElementById("crumb");
  if (crumb) {
    crumb.addEventListener("click", function (e) {
      e.preventDefault();
      copyText(location.origin + location.pathname, function () {
        toast("Link copied");
        crumb.classList.add("done");
        setTimeout(function () { crumb.classList.remove("done"); }, 1600);
      });
    });
  }

  // --- The paste's date, in the reader's own time zone ---
  var when = document.querySelector("[data-created]");
  if (when) {
    try {
      when.textContent = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" })
        .format(new Date(Number(when.dataset.created)));
    } catch (e) {}
  }

  // --- Status bar ---
  var pos = document.getElementById("pos");
  var sizeEl = document.getElementById("size");
  var MAX = 256 * 1024;
  function bytes(s) { return new Blob([s]).size; }
  function fmt(n) { return n < 1024 ? n + " B" : (n / 1024).toFixed(1) + " KB"; }
  if (pos) {
    editor.on("cursorActivity", function () {
      var c = editor.getCursor();
      pos.textContent = "Ln " + (c.line + 1) + ", Col " + (c.ch + 1);
    });
  }

  if (isView) return;

  // --- Editing: size, language, save ---
  var saveBtn = document.getElementById("save");
  var langSel = document.getElementById("lang");
  var tooBig = false;
  editor.on("change", function () {
    var n = bytes(editor.getValue());
    tooBig = n > MAX;
    sizeEl.textContent = fmt(n);
    sizeEl.classList.toggle("over", tooBig);
    saveBtn.disabled = tooBig || editor.getValue().trim() === "";
    scheduleDetect(pasting ? 50 : 700);
    pasting = false;
  });
  // A paste is coloured at once; typing waits for a pause.
  var pasting = false;
  editor.on("beforeChange", function (cm, change) { if (change.origin === "paste") pasting = true; });

  // --- Auto: ask the server what the text is, the same guess the saved
  // page will make, and colour the editor to match ---
  var autoOption = langSel ? langSel.options[0] : null;
  var detectTimer, detectCtl, lastSample = "";
  function scheduleDetect(delay) {
    if (!langSel || langSel.value) return;
    clearTimeout(detectTimer);
    detectTimer = setTimeout(runDetect, delay);
  }
  function runDetect() {
    var sample = editor.getValue().slice(0, 16384);
    if (sample === lastSample) return;
    lastSample = sample;
    if (sample.trim().length < 12) { showAuto(null); return; }
    if (detectCtl) detectCtl.abort();
    detectCtl = window.AbortController ? new AbortController() : null;
    fetch("/api/detect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: sample }),
      signal: detectCtl ? detectCtl.signal : undefined,
    }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { if (d && !langSel.value) showAuto(d); })
      .catch(function () {});
  }
  function showAuto(d) {
    var found = d && d.mode;
    autoOption.textContent = found ? "Auto · " + d.name : "Auto";
    setLanguage(found ? d.mode : null, found ? d.mime : null);
  }
  if (langSel) {
    langSel.addEventListener("change", function () {
      if (!langSel.value) { lastSample = ""; runDetect(); return; }
      autoOption.textContent = "Auto";
      var m = MODES[langSel.value] || [null, null];
      setLanguage(m[0], m[1]);
    });
  }

  var busy = false;
  function save() {
    if (busy || saveBtn.disabled) return;
    busy = true;
    saveBtn.disabled = true;
    var body = { content: editor.getValue() };
    if (langSel && langSel.value) body.language = langSel.value;
    fetch("/api/new", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(function (r) {
      if (r.status === 429) throw new Error("Too many pastes, wait a minute");
      if (r.status === 413) throw new Error("Too large: the limit is 256 KB");
      if (!r.ok) throw new Error("Could not save");
      return r.json();
    }).then(function (d) {
      location.replace("/" + d.id);
    }).catch(function (err) {
      busy = false;
      saveBtn.disabled = false;
      toast(err.message || "Could not save");
    });
  }
  saveBtn.addEventListener("click", save);
  document.addEventListener("keydown", function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      save();
    }
  });

  // Live colouring in the editor once a language is chosen: the same map
  // the server uses to colour a saved paste.
  var MODES = {
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
})();
