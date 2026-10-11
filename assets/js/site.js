/* Earth Simulator — общий скрипт сайта: увеличение иллюстраций, связи на шкале времени,
   язык записей дневника. Без зависимостей. */
(function () {
  'use strict';

  /* ---------- увеличение иллюстраций ---------- */
  var dlg = document.querySelector('[data-lightbox]');
  if (dlg && typeof dlg.showModal === 'function') {
    var img = dlg.querySelector('[data-lb-img]'), cap = dlg.querySelector('[data-lb-cap]'), cnt = dlg.querySelector('[data-lb-count]');
    var group = [], at = 0;
    function show(i) {
      at = (i + group.length) % group.length;
      var f = group[at];
      img.src = f.getAttribute('data-lb-src');
      img.alt = f.getAttribute('data-lb-cap') || '';
      cap.textContent = f.getAttribute('data-lb-cap') || '';
      cnt.textContent = group.length > 1 ? (at + 1) + ' / ' + group.length : '';
      dlg.classList.toggle('is-single', group.length < 2);
    }
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

  /* ---------- шкала времени: подсветка зависимостей ---------- */
  var tl = document.querySelector('[data-tl]');
  if (tl) {
    var rows = tl.querySelectorAll('.tl__row');
    function hl(id, on) {
      var row = tl.querySelector('.tl__row[data-row="' + id + '"]');
      if (!row) return;
      var deps = (row.getAttribute('data-deps') || '').split(' ').filter(Boolean);
      tl.classList.toggle('has-hl', on);
      row.classList.toggle('is-hl', on);
      tl.querySelectorAll('.tl__arc').forEach(function (a) {
        var hit = a.getAttribute('data-to') === id || a.getAttribute('data-from') === id;
        a.classList.toggle('is-hl', on && hit);
        if (on && hit) a.parentNode.appendChild(a); // поверх остальных дуг
      });
      tl.querySelectorAll('.tl__node').forEach(function (n) {
        var nid = n.getAttribute('data-node');
        var linked = nid === id || deps.indexOf(nid) >= 0 || !!tl.querySelector('.tl__row[data-row="' + nid + '"][data-deps~="' + id + '"]');
        n.classList.toggle('is-hl', on && linked);
        if (on && linked) n.parentNode.appendChild(n);
      });
      if (!on) return;
      rows.forEach(function (r) {
        var rid = r.getAttribute('data-row');
        var linked = deps.indexOf(rid) >= 0 || (r.getAttribute('data-deps') || '').split(' ').indexOf(id) >= 0;
        r.classList.toggle('is-linked', linked);
      });
    }
    function clear() { rows.forEach(function (r) { r.classList.remove('is-linked'); }); }
    rows.forEach(function (r) {
      var id = r.getAttribute('data-row');
      r.querySelectorAll('.tl__c').forEach(function (c) {
        c.addEventListener('mouseenter', function () { clear(); hl(id, true); });
        c.addEventListener('mouseleave', function () { hl(id, false); clear(); });
        c.addEventListener('click', function (e) {
          if (e.target.closest('a')) return;
          var a = r.querySelector('a[href^="#"]');
          if (a) a.click();
        });
      });
      var link = r.querySelector('a');
      if (link) {
        link.addEventListener('focus', function () { clear(); hl(id, true); });
        link.addEventListener('blur', function () { hl(id, false); clear(); });
      }
    });
  }

  /* ---------- язык записи дневника ---------- */
  var bodies = document.querySelectorAll('[data-lang-body]');
  if (bodies.length) {
    var want = null;
    try { want = new URLSearchParams(location.search).get('lang'); } catch (e) {}
    if (!want) { try { want = localStorage.getItem('es-lang'); } catch (e) {} }
    function setLang(l) {
      var has = document.querySelector('[data-lang-body="' + l + '"]');
      if (!has) return;
      bodies.forEach(function (b) { b.hidden = b.getAttribute('data-lang-body') !== l; });
      document.querySelectorAll('[data-lang-btn]').forEach(function (b) {
        b.setAttribute('aria-pressed', b.getAttribute('data-lang-btn') === l ? 'true' : 'false');
      });
    }
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
