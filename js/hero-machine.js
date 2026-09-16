(function () {
  var stage = document.getElementById("heroMachine");
  if (!stage) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var states = ["is-web", "is-play", "is-store"];
  var i = 0;
  setInterval(function () {
    stage.classList.remove(states[i]);
    i = (i + 1) % states.length;
    stage.classList.add(states[i]);
  }, 2600);
})();
