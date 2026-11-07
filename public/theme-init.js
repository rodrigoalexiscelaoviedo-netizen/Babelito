(function () {
  try {
    var t = localStorage.getItem("babelito:theme") === "night" ? "night" : "day";
    document.documentElement.setAttribute("data-theme", t);
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute("content", t === "night" ? "#0E1320" : "#F7F3EA");
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "day");
  }
})();
