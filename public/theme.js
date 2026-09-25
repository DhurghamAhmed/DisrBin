// Applies a remembered theme before the first paint, so the page never
// flashes the other one. Loaded synchronously in the head for that reason.
(function () {
  try {
    var t = localStorage.getItem("theme");
    if (t === "dark" || t === "light") document.documentElement.setAttribute("data-theme", t);
  } catch (e) {}
})();
