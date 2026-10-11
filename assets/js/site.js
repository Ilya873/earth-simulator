/* Earth Simulator — общий скрипт сайта: увеличение иллюстраций, масштаб виджета Steam,
   язык записей дневника. Без зависимостей. */
(function () {
  'use strict';

  /* ---------- увеличение иллюстраций ---------- */
  var dlg = document.querySelector('[data-lightbox]');
  if (dlg && typeof dlg.showModal === 'function') {
    var img = dlg.querySelector('[data-lb-img]'), cap = dlg.querySelector('[data-lb-cap]'), cnt = dlg.querySelector('[data-lb-count]');
    var group = [], at = 0;
    var show = function (i) {
      at = (i + group.length) % group.length;
      var f = group[at];
      img.src = f.getAttribute('data-lb-src');
      img.alt = f.getAttribute('data-lb-cap') || '';
      cap.textContent = f.getAttribute('data-lb-cap') || '';
      cnt.textContent = group.length > 1 ? (at + 1) + ' / ' + group.length : '';
      dlg.classList.toggle('is-single', group.length < 2);
    };
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.plate-fig__btn');
      if (!btn) return;
      var fig = btn.closest('[data-lb-src]');
      if (!fig) return;
      e.preventDefault();
      var g = fig.getAttribute('data-lb-group') || '';
      group = Array.prototype.slice.call(document.querySelectorAll('[data-lb-src][data-lb-group="' + g + '"]'));
      if (!group.length) group = [fig];
      show(Math.max(0, group.indexOf(fig)));
      dlg.showModal();
    });
    dlg.querySelector('[data-lb-prev]').addEventListener('click', function () { show(at - 1); });
    dlg.querySelector('[data-lb-next]').addEventListener('click', function () { show(at + 1); });
    dlg.querySelector('[data-lb-close]').addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { show(at - 1); e.preventDefault(); }
      if (e.key === 'ArrowRight') { show(at + 1); e.preventDefault(); }
    });
    dlg.addEventListener('close', function () { img.removeAttribute('src'); });
  }

  /* ---------- виджет Steam: у него фиксированные 646×190, масштабируем под ширину колонки ---------- */
  document.querySelectorAll('[data-steam-embed]').forEach(function (box) {
    var fit = function () { box.style.setProperty('--s', Math.min(1, box.clientWidth / 646).toFixed(4)); };
    fit();
    if ('ResizeObserver' in window) new ResizeObserver(fit).observe(box); else window.addEventListener('resize', fit);
  });

  /* ---------- язык записи дневника ---------- */
  var bodies = document.querySelectorAll('[data-lang-body]');
  if (bodies.length) {
    var want = null;
    try { want = new URLSearchParams(location.search).get('lang'); } catch (e) {}
    if (!want) { try { want = localStorage.getItem('es-lang'); } catch (e) {} }
    var setLang = function (l) {
      if (!document.querySelector('[data-lang-body="' + l + '"]')) return;
      bodies.forEach(function (b) { b.hidden = b.getAttribute('data-lang-body') !== l; });
      document.querySelectorAll('[data-lang-btn]').forEach(function (b) {
        b.setAttribute('aria-pressed', b.getAttribute('data-lang-btn') === l ? 'true' : 'false');
      });
    };
    if (want) setLang(want);
    document.querySelectorAll('[data-lang-btn]').forEach(function (b) {
      b.addEventListener('click', function () {
        var l = b.getAttribute('data-lang-btn'); setLang(l);
        try { localStorage.setItem('es-lang', l); } catch (e) {}
      });
    });
  } else {
    // запоминаем язык, на котором читают сайт, — для записей дневника
    try { localStorage.setItem('es-lang', document.documentElement.lang === 'en' ? 'en' : 'ru'); } catch (e) {}
  }
})();
