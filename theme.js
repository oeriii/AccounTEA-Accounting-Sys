/* Accountea - light/dark theme. Loaded in <head> so the right theme is set before the page paints. */
(function () {
  var KEY = "accountea-theme";

  function saved() {
    try {
      var value = localStorage.getItem(KEY);
      return value === "light" || value === "dark" ? value : null;
    } catch (e) {
      return null;
    }
  }

  function current() {
    return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  }

  function sync() {
    var buttons = document.querySelectorAll(".theme-toggle");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute("aria-checked", current() === "dark" ? "true" : "false");
    }
  }

  function apply(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    sync();
  }

  function toggle() {
    var next = current() === "dark" ? "light" : "dark";
    apply(next);
    try {
      localStorage.setItem(KEY, next);
    } catch (e) {}
  }

  document.documentElement.setAttribute("data-theme", saved() || "dark");

  document.addEventListener("DOMContentLoaded", function () {
    var buttons = document.querySelectorAll(".theme-toggle");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener("click", toggle);
    }
    sync();
  });
})();
