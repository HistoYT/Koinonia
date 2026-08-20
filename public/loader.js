(function () {
  var MIN_VISIBLE_MS = 450;
  var MAX_WAIT_MS = 5000;
  var start = Date.now();
  var revealed = false;

  function reveal() {
    if (revealed) return;
    revealed = true;
    var wait = Math.max(0, MIN_VISIBLE_MS - (Date.now() - start));
    setTimeout(function () {
      document.body.classList.add('is-loaded');
    }, wait);
  }

  window.addEventListener('load', reveal);
  setTimeout(reveal, MAX_WAIT_MS);
})();
