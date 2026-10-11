/* Earth Simulator — звёздная карта развития.
   Каждое обновление — звёздная система, каждая возможность — планета на её орбите.
   Готовые планеты светятся. Линии — зависимости. Данные — _data/roadmap.yml (в странице как JSON). */
(function () {
  'use strict';

  var root = document.querySelector('[data-starmap]');
  var dataEl = document.getElementById('starmap-data');
  if (!root || !dataEl) return;
  var DATA;
  try { DATA = JSON.parse(dataEl.textContent); } catch (e) { return; }
  var L = document.documentElement.lang === 'en' ? 'en' : 'ru';
  var STR = {};
  try { STR = JSON.parse(root.getAttribute('data-str') || '{}'); } catch (e) {}
  var svg = root.querySelector('.sm-svg');
  var chart = root.querySelector('.sm-chart');
  var tip = root.querySelector('.sm-tip');
  var upds = root.querySelector('[data-upds]');
  var NS = 'http://www.w3.org/2000/svg';
  var reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  var phases = DATA.phases || [], byId = {};
  phases.forEach(function (p, i) { p._i = i; byId[p.id] = p; });
  var eons = {};
  (DATA.eons || []).forEach(function (e) { eons[e.id] = e; });
  var now = new Date();
  var TODAY = now.getFullYear() + (now.getMonth() + (now.getDate() - 1) / 31) / 12;

  function el(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function txt(s) { return String(s == null ? '' : s); }
  function esc(s) { return txt(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  /* ---------- раскладка: «широкая» (время слева направо) и «высокая» для телефона ---------- */
  var mode = '', VW = 1400, VH = 640, P = {};
  function layout() {
    mode = chart.clientWidth < 720 ? 'tall' : 'wide';
    if (mode === 'wide') {
      VW = 1400; VH = 640;
      phases.forEach(function (p) { P[p.id] = { x: p.pos.x, y: p.pos.y }; });
    } else {
      VW = 400; VH = 1580;
      // по вертикали — равный шаг в порядке времени (на узком экране пропорции времени дают тесноту)
      var minY = 110, maxY = 510, ranked = phases.slice().sort(function (a, b) { return a.t - b.t; });
      var step = (VH - 200) / Math.max(1, ranked.length - 1);
      ranked.forEach(function (p, r) {
        P[p.id] = { x: 70 + (p.pos.y - minY) / (maxY - minY) * (VW - 140), y: 96 + r * step };
      });
    }
    phases.forEach(function (p) {
      var c = P[p.id];
      c.R = p.major ? 36 : 31;
      // прямоугольник подписи — препятствие для линий
      if (mode === 'wide') c.lb = [c.x - 82, c.y + c.R + 4, c.x + 82, c.y + c.R + 48];
      else if (c.x < VW / 2) c.lb = [c.x + c.R + 6, c.y - 24, c.x + c.R + 176, c.y + 16];
      else c.lb = [c.x - c.R - 176, c.y - 24, c.x - c.R - 6, c.y + 16];
    });
  }

  // положение на оси времени (x в широкой раскладке, y — в высокой) — интерполяция между системами
  function timeCoord(t) {
    var pts = phases.map(function (p) { return [p.t, mode === 'wide' ? P[p.id].x : P[p.id].y]; }).sort(function (a, b) { return a[0] - b[0]; });
    if (t <= pts[0][0]) return pts[0][1] - (pts[0][0] - t) * (pts[1][1] - pts[0][1]) / Math.max(0.01, pts[1][0] - pts[0][0]);
    for (var i = 1; i < pts.length; i++) {
      if (t <= pts[i][0]) return pts[i - 1][1] + (t - pts[i - 1][0]) / Math.max(0.001, pts[i][0] - pts[i - 1][0]) * (pts[i][1] - pts[i - 1][1]);
    }
    var n = pts.length - 1;
    return pts[n][1] + (t - pts[n][0]) * (pts[n][1] - pts[n - 1][1]) / Math.max(0.01, pts[n][0] - pts[n - 1][0]);
  }

  /* ---------- линии-зависимости: изгиб, который обходит чужие системы и подписи ---------- */
  function boxDist(x, y, b) {
    var dx = Math.max(b[0] - x, 0, x - b[2]), dy = Math.max(b[1] - y, 0, y - b[3]);
    return Math.sqrt(dx * dx + dy * dy);
  }
  function linkPath(a, b, ida, idb) {
    var dx = b.x - a.x, dy = b.y - a.y, dist = Math.sqrt(dx * dx + dy * dy) || 1;
    var ux = dx / dist, uy = dy / dist, nx = -uy, ny = ux;
    var sx = a.x + ux * (a.R + 3), sy = a.y + uy * (a.R + 3), ex = b.x - ux * (b.R + 8), ey = b.y - uy * (b.R + 8);
    var ks = [0.06, -0.06, 0.16, -0.16, 0.26, -0.26, 0.38, -0.38, 0.52, -0.52], best = null;
    for (var q = 0; q < ks.length; q++) {
      var k = ks[q], cx = (sx + ex) / 2 + nx * k * dist, cy = (sy + ey) / 2 + ny * k * dist, minC = 1e9;
      for (var s = 1; s < 24; s++) {
        var t = s / 24, mt = 1 - t;
        var x = mt * mt * sx + 2 * mt * t * cx + t * t * ex, y = mt * mt * sy + 2 * mt * t * cy + t * t * ey;
        if (x < 8 || x > VW - 8 || y < 30 || y > VH - (mode === 'wide' ? 60 : 30)) minC = Math.min(minC, -20);
        for (var i = 0; i < phases.length; i++) {
          var id = phases[i].id, c = P[id];
          if (id !== ida && id !== idb) minC = Math.min(minC, Math.sqrt((x - c.x) * (x - c.x) + (y - c.y) * (y - c.y)) - c.R - 8);
          if (id !== idb || t < 0.8) minC = Math.min(minC, boxDist(x, y, c.lb) + (id === ida || id === idb ? 6 : 0));
        }
      }
      if (minC >= 10) { best = { cx: cx, cy: cy }; break; }
      if (!best || minC > best.c) best = { cx: cx, cy: cy, c: minC };
    }
    return 'M' + sx.toFixed(1) + ' ' + sy.toFixed(1) + ' Q' + best.cx.toFixed(1) + ' ' + best.cy.toFixed(1) + ' ' + ex.toFixed(1) + ' ' + ey.toFixed(1);
  }

  /* ---------- построение карты ---------- */
  var systems = [], links = [], planetGroups = [], planets = [];
  function build() {
    layout();
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute('viewBox', '0 0 ' + VW + ' ' + VH);
    svg.classList.toggle('is-tall', mode === 'tall');
    systems = []; links = []; planetGroups = []; planets = [];

    var defs = el('defs', null, svg);
    var mk = el('marker', { id: 'sm-arr', viewBox: '0 0 10 10', refX: '8.5', refY: '5', markerWidth: '7', markerHeight: '7', orient: 'auto' }, defs);
    el('path', { d: 'M0 1.5 L9 5 L0 8.5 Z', 'class': 'sm-arrow' }, mk);

    // ось времени и годы
    var ax = el('g', { 'class': 'sm-axis' }, svg);
    var y0 = Math.floor(Math.min.apply(null, phases.map(function (p) { return p.t; })));
    var y1 = Math.ceil(Math.max.apply(null, phases.map(function (p) { return p.t; })));
    if (mode === 'wide') {
      var ay = VH - 26;
      el('line', { x1: 20, y1: ay, x2: VW - 20, y2: ay }, ax);
      for (var yr = y0 + 1; yr <= y1; yr++) {
        var x = timeCoord(yr);
        if (x < 30 || x > VW - 30) continue;
        el('line', { x1: x, y1: 40, x2: x, y2: ay, 'class': 'sm-year' }, ax);
        el('line', { x1: x, y1: ay - 5, x2: x, y2: ay + 5 }, ax);
        el('text', { x: x, y: ay + 20, 'text-anchor': 'middle' }, ax).textContent = yr;
      }
      el('text', { x: 22, y: ay - 10, 'class': 'sm-axis__cap' }, ax).textContent = (STR.time || 'time') + ' →';
    } else {
      var axx = 16;
      el('line', { x1: axx, y1: 40, x2: axx, y2: VH - 20 }, ax);
      for (var yr2 = y0 + 1; yr2 <= y1; yr2++) {
        var yy = timeCoord(yr2);
        if (yy < 40 || yy > VH - 20) continue;
        el('line', { x1: axx, y1: yy, x2: VW - 10, y2: yy, 'class': 'sm-year' }, ax);
        el('text', { x: axx + 4, y: yy - 6 }, ax).textContent = yr2;
      }
    }
    // «сегодня»
    var tc = timeCoord(TODAY), td = el('g', { 'class': 'sm-today' }, svg);
    if (mode === 'wide') {
      el('line', { x1: tc, y1: 36, x2: tc, y2: VH - 26 }, td);
      el('text', { x: tc + 6, y: 48 }, td).textContent = STR.today || 'today';
    } else {
      el('line', { x1: 16, y1: tc, x2: VW - 10, y2: tc }, td);
      el('text', { x: VW - 12, y: tc - 6, 'text-anchor': 'end' }, td).textContent = STR.today || 'today';
    }

    // названия эонов — как названия созвездий
    var eg = el('g', null, svg), prevMax = null;
    (DATA.eons || []).forEach(function (e) {
      var name = e.name[L];
      if (mode === 'wide') {
        el('text', { x: e.label.x, y: e.label.y, 'text-anchor': 'middle', 'class': 'sm-eon' }, eg).textContent = name;
      } else {
        // на телефоне — граница эона: тонкая линия и подпись
        var ys = phases.filter(function (p) { return p.eon === e.id; }).map(function (p) { return P[p.id].y; });
        var top = Math.min.apply(null, ys), by = prevMax == null ? top - 62 : (prevMax + top) / 2;
        if (prevMax != null) el('line', { x1: 26, y1: by, x2: VW - 8, y2: by, 'class': 'sm-eon-line' }, eg);
        el('text', { x: VW - 10, y: by - 7, 'text-anchor': 'end', 'class': 'sm-eon-t' }, eg).textContent = e.roman + ' · ' + name;
        prevMax = Math.max.apply(null, ys);
      }
    });

    // связи
    var lg = el('g', null, svg);
    phases.forEach(function (p) {
      (p.deps || []).forEach(function (d) {
        if (!byId[d]) return;
        var far = p.eon !== 'e1';
        var path = el('path', {
          d: linkPath(P[d], P[p.id], d, p.id), 'class': 'sm-link ' + (far ? 'sm-link--far' : 'sm-link--draw'),
          'data-from': d, 'data-to': p.id, 'marker-end': 'url(#sm-arr)'
        }, lg);
        path.style.setProperty('--d', (0.25 + p._i * 0.09).toFixed(2) + 's');
        links.push(path);
      });
    });
    links.forEach(function (l) {
      if (!l.classList.contains('sm-link--draw')) return;
      try { l.style.setProperty('--len', Math.ceil(l.getTotalLength())); } catch (e) {}
    });

    // системы
    var sg = el('g', null, svg);
    phases.forEach(function (p) { buildSystem(p, sg); });
    if (reduce) svg.classList.add('is-on');
    else if (introDone) svg.classList.add('is-on');
    if (curFilter) applyFilter(curFilter);
    if (sel) markSelected(sel);
  }

  function buildSystem(p, parent) {
    var c = P[p.id], R = c.R, items = p.items || [];
    var lit = items.filter(function (it) { return it.s === 'done' || it.s === 'wip'; }).length;
    var aria = p.ver + ' ' + p.name[L] + ', ' + p.when[L] + ', ' + DATA.status[p.status][L];
    var g = el('g', { 'class': 'sm-sys sm-sys--' + p.status + (p.now ? ' is-now' : ''), 'data-id': p.id, transform: 'translate(' + c.x + ' ' + c.y + ')', tabindex: '0', role: 'button', 'aria-label': aria }, parent);
    var inner = el('g', { 'class': 'sm-sys__in' }, g);
    inner.style.setProperty('--d', (0.1 + p._i * 0.09).toFixed(2) + 's');
    el('circle', { r: R + 16, 'class': 'sm-hit' }, inner);
    el('circle', { r: R + 7, 'class': 'sm-sel' }, inner);
    el('circle', { r: R, 'class': 'sm-orbit' }, inner);

    // звезда
    var sr = p.major ? 8.5 : 6.5;
    if (p.status === 'done' || p.now) {
      var sp = el('g', null, inner), L1 = sr + 7;
      el('line', { x1: -L1, y1: 0, x2: L1, y2: 0, 'class': 'sm-spike' }, sp);
      el('line', { x1: 0, y1: -L1, x2: 0, y2: L1, 'class': 'sm-spike' }, sp);
    }
    if (p.now) el('circle', { r: sr + 5, 'class': 'sm-ring-now' }, inner);
    el('circle', { r: sr, 'class': 'sm-star', fill: p.color }, inner);

    // планеты на орбите
    var pg = el('g', { 'class': 'sm-planets' }, inner), n = items.length, a0 = -Math.PI / 2 + (p._i % 4) * 0.37;
    items.forEach(function (it, i) {
      var a = a0 + i * 2 * Math.PI / n;
      var pl = el('circle', {
        cx: (R * Math.cos(a)).toFixed(2), cy: (R * Math.sin(a)).toFixed(2), r: p.major ? 4.6 : 4.2,
        'class': 'sm-pl sm-pl--' + it.s, 'data-id': p.id, 'data-i': i, 'data-k': it.k, 'data-req': it.req ? '1' : '0'
      }, pg);
      planets.push(pl);
    });
    planetGroups.push({ g: pg, speed: (p._i % 2 ? -1 : 1) * 360 / (210 + p._i * 17), base: 0 });

    // подписи
    if (mode === 'wide') {
      if (p.now) el('text', { x: 0, y: -R - 14, 'text-anchor': 'middle', 'class': 'sm-here' }, inner).textContent = (STR.here || '') + ' ▾';
      el('text', { x: 0, y: R + 21, 'text-anchor': 'middle', 'class': 'sm-ver' }, inner).textContent = p.ver + '  ·  ' + lit + '/' + n;
      el('text', { x: 0, y: R + 41, 'text-anchor': 'middle', 'class': 'sm-name' }, inner).textContent = p.name[L];
    } else {
      var right = c.x < VW / 2, lx = right ? R + 12 : -R - 12, anchor = right ? 'start' : 'end';
      if (p.now) el('text', { x: lx, y: -26, 'text-anchor': anchor, 'class': 'sm-here' }, inner).textContent = STR.here || '';
      el('text', { x: lx, y: -8, 'text-anchor': anchor, 'class': 'sm-ver' }, inner).textContent = p.ver + '  ·  ' + lit + '/' + n;
      el('text', { x: lx, y: 12, 'text-anchor': anchor, 'class': 'sm-name' }, inner).textContent = p.name[L];
    }
    systems.push(g);

    g.addEventListener('pointerenter', function (e) { highlight(p.id, true); if (!e.target.classList.contains('sm-pl')) showSysTip(p, e); });
    g.addEventListener('pointermove', function (e) { if (!e.target.classList.contains('sm-pl')) showSysTip(p, e); });
    g.addEventListener('pointerleave', function () { highlight(p.id, false); hideTip(); });
    g.addEventListener('focus', function () { highlight(p.id, true); });
    g.addEventListener('blur', function () { highlight(p.id, false); });
    g.addEventListener('click', function (e) {
      var pl = e.target.closest && e.target.closest('.sm-pl');
      select(p.id, { scroll: true, item: pl ? +pl.getAttribute('data-i') : null });
    });
    g.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(p.id, { scroll: true }); }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); focusSys(p._i + 1); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); focusSys(p._i - 1); }
    });
  }
  function focusSys(i) {
    var p = phases[Math.max(0, Math.min(phases.length - 1, i))];
    var g = svg.querySelector('.sm-sys[data-id="' + p.id + '"]');
    if (g) g.focus();
  }

  /* ---------- подсветка связей ---------- */
  function highlight(id, on) {
    svg.classList.toggle('has-hl', on);
    var p = byId[id], deps = p.deps || [];
    links.forEach(function (l) {
      var hit = l.getAttribute('data-to') === id || l.getAttribute('data-from') === id;
      l.classList.toggle('is-hl', on && hit);
    });
    systems.forEach(function (g) {
      var sid = g.getAttribute('data-id'), q = byId[sid];
      g.classList.toggle('is-hl', on && sid === id);
      g.classList.toggle('is-linked', on && (deps.indexOf(sid) >= 0 || (q.deps || []).indexOf(id) >= 0));
    });
  }

  /* ---------- подсказки ---------- */
  function placeTip(e) {
    var r = chart.getBoundingClientRect(), x = e.clientX - r.left + 16, y = e.clientY - r.top + 16;
    tip.hidden = false;
    var w = tip.offsetWidth, h = tip.offsetHeight;
    if (x + w > r.width - 6) x = e.clientX - r.left - w - 16;
    if (y + h > r.height - 6) y = e.clientY - r.top - h - 12;
    tip.style.left = Math.max(4, x) + 'px'; tip.style.top = Math.max(4, y) + 'px';
  }
  function showSysTip(p, e) {
    if (e.pointerType === 'touch') return;
    var items = p.items || [], lit = items.filter(function (it) { return it.s === 'done' || it.s === 'wip'; }).length;
    tip.innerHTML = '<span class="mono">' + esc(p.ver) + ' · ' + esc(p.when[L]) + '</span><b>' + esc(p.name[L]) + '</b><small>' +
      esc(DATA.status[p.status][L]) + ' · ' + lit + '/' + items.length + ' ' + esc(STR.planets || '') + '</small>';
    placeTip(e);
  }
  function hideTip() { tip.hidden = true; }
  svg.addEventListener('pointerover', function (e) {
    var pl = e.target.closest && e.target.closest('.sm-pl');
    if (!pl || e.pointerType === 'touch') return;
    var p = byId[pl.getAttribute('data-id')], it = p.items[+pl.getAttribute('data-i')];
    tip.innerHTML = '<span class="mono">' + esc(p.ver) + ' · ' + esc(p.name[L]) + '</span><b>' + esc(it[L][0]) + '</b><small>' +
      esc(DATA.tracks[it.k][L]) + ' · ' + esc(DATA.status[it.s][L]) + (it.req ? ' · <span class="sm-tip__req">' + esc(STR.req || '') + '</span>' : '') + '</small>';
    placeTip(e);
  });
  svg.addEventListener('pointermove', function (e) {
    if (e.target.classList && e.target.classList.contains('sm-pl') && !tip.hidden) placeTip(e);
  });

  /* ---------- выбор системы и карточка ---------- */
  var sel = null;
  function markSelected(id) {
    systems.forEach(function (g) { g.classList.toggle('is-sel', g.getAttribute('data-id') === id); });
  }
  function select(id, opts) {
    opts = opts || {};
    if (!byId[id]) return;
    sel = id;
    markSelected(id);
    upds.querySelectorAll('.upd').forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('data-id') === id); });
    var art = document.getElementById('upd-' + id);
    upds.querySelectorAll('.upd__item.is-ping').forEach(function (x) { x.classList.remove('is-ping'); });
    if (art && opts.item != null) {
      var li = art.querySelector('.upd__item[data-i="' + opts.item + '"]');
      if (li) li.classList.add('is-ping');
    }
    if (opts.hash !== false && history.replaceState) history.replaceState(null, '', '#upd-' + id);
    if (art && opts.scroll) {
      art.classList.remove('is-flash'); void art.offsetWidth; art.classList.add('is-flash');
      var r = art.getBoundingClientRect(), vh = window.innerHeight;
      if (upds.classList.contains('is-all') || r.top > vh - 160 || r.bottom < 80) {
        art.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      }
    }
  }
  root.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-goto]');
    if (!a) return;
    e.preventDefault();
    var id = a.getAttribute('data-goto');
    if (upds.classList.contains('is-all')) { document.getElementById('upd-' + id).scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); return; }
    select(id, { scroll: true });
  });
  var toggle = root.querySelector('[data-list-toggle]');
  if (toggle) toggle.addEventListener('click', function () {
    var all = !upds.classList.contains('is-all');
    upds.classList.toggle('is-all', all);
    toggle.setAttribute('aria-expanded', all ? 'true' : 'false');
    toggle.textContent = all ? (STR.showOne || '') : (STR.showAll || '');
    if (!all && sel) document.getElementById('upd-' + sel).scrollIntoView({ block: 'nearest' });
  });

  /* ---------- фильтры ---------- */
  var curFilter = 'all', fbtns = root.querySelectorAll('[data-filter]');
  function matches(node, f) { return f === 'req' ? node.getAttribute('data-req') === '1' : node.getAttribute('data-k') === f; }
  function applyFilter(f) {
    curFilter = f;
    svg.setAttribute('data-filter', f); upds.setAttribute('data-filter', f);
    fbtns.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-filter') === f ? 'true' : 'false'); });
    planets.forEach(function (pl) { pl.classList.toggle('is-match', f !== 'all' && matches(pl, f)); });
    upds.querySelectorAll('.upd__item').forEach(function (li) {
      if (!li.hasAttribute('data-req')) li.setAttribute('data-req', '0');
      li.classList.toggle('is-match', f !== 'all' && matches(li, f));
    });
  }
  fbtns.forEach(function (b) { b.addEventListener('click', function () { applyFilter(b.getAttribute('data-filter')); }); });
  function counts() {
    var cnt = { req: 0 };
    phases.forEach(function (p) { (p.items || []).forEach(function (it) { cnt[it.k] = (cnt[it.k] || 0) + 1; if (it.req) cnt.req++; }); });
    root.querySelectorAll('[data-count]').forEach(function (s) { s.textContent = cnt[s.getAttribute('data-count')] || 0; });
  }

  /* ---------- вращение орбит и мерцание звёзд ---------- */
  var visible = false, raf = 0, last = 0, introDone = false;
  var tw = document.createElement('canvas'), twx = tw.getContext('2d'), twStars = [], twW = 0, twH = 0, twDpr = 1;
  tw.className = 'sm-twinkle'; tw.setAttribute('aria-hidden', 'true');
  tw.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;';
  chart.insertBefore(tw, chart.firstChild);
  function sizeTwinkle() {
    var r = chart.getBoundingClientRect();
    twDpr = Math.min(window.devicePixelRatio || 1, 2); twW = r.width; twH = r.height;
    tw.width = Math.round(twW * twDpr); tw.height = Math.round(twH * twDpr);
    var n = Math.round(twW * twH / 9000), rnd = seeded(7);
    twStars = [];
    for (var i = 0; i < n; i++) twStars.push({ x: rnd() * twW, y: rnd() * twH, r: 0.5 + rnd() * 1.1, a: 0.25 + rnd() * 0.6, ph: rnd() * 6.28, sp: 0.6 + rnd() * 1.8, c: rnd() < 0.25 ? '255,236,200' : rnd() < 0.5 ? '205,220,255' : '255,255,255' });
  }
  function drawTwinkle(t) {
    twx.setTransform(twDpr, 0, 0, twDpr, 0, 0);
    twx.clearRect(0, 0, twW, twH);
    for (var i = 0; i < twStars.length; i++) {
      var s = twStars[i], a = s.a * (0.55 + 0.45 * Math.sin(t * s.sp + s.ph));
      twx.fillStyle = 'rgba(' + s.c + ',' + a.toFixed(3) + ')';
      twx.beginPath(); twx.arc(s.x, s.y, s.r, 0, 6.2832); twx.fill();
    }
  }
  function tick(ts) {
    raf = 0;
    if (!visible || document.hidden) return;
    if (ts - last > 45) {
      var t = ts / 1000;
      planetGroups.forEach(function (o) { o.g.setAttribute('transform', 'rotate(' + ((o.base + t * o.speed) % 360).toFixed(2) + ')'); });
      drawTwinkle(t);
      last = ts;
    }
    raf = requestAnimationFrame(tick);
  }
  function wake() { if (!raf && visible && !reduce) raf = requestAnimationFrame(tick); }

  /* ---------- небо раздела: Млечный Путь и звёзды (рисуется один раз) ---------- */
  var sky = root.querySelector('.sky__stars'), sctx = sky ? sky.getContext('2d') : null;
  function seeded(s) { return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  function drawSky() {
    if (!sctx) return;
    var W = root.clientWidth, H = root.clientHeight, dpr = W * H > 4e6 ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
    sky.width = Math.round(W * dpr); sky.height = Math.round(H * dpr);
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sctx.clearRect(0, 0, W, H);
    var rnd = seeded(20261011), i, x, y, r, a;
    // Млечный Путь — полоса от нижнего левого угла карты к верхнему правому, к «миру звёзд»
    var bandH = Math.min(H, 1100), x0 = -W * 0.05, y0 = bandH * 0.95, x1 = W * 1.05, y1 = bandH * 0.02;
    var bl = Math.sqrt((x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0)), bx = (x1 - x0) / bl, by = (y1 - y0) / bl;
    for (i = 0; i < 70; i++) {
      var t = rnd(), off = (rnd() - 0.5) * 2 * bandH * 0.12;
      x = x0 + bx * bl * t - by * off; y = y0 + by * bl * t + bx * off; r = 60 + rnd() * 160;
      var gr = sctx.createRadialGradient(x, y, 0, x, y, r);
      var col = rnd() < 0.5 ? '120,140,190' : '140,128,190';
      gr.addColorStop(0, 'rgba(' + col + ',' + (0.025 + rnd() * 0.03).toFixed(3) + ')');
      gr.addColorStop(1, 'rgba(' + col + ',0)');
      sctx.fillStyle = gr; sctx.beginPath(); sctx.arc(x, y, r, 0, 6.2832); sctx.fill();
    }
    for (i = 0; i < 1600; i++) {
      var tt = rnd(), o2 = (rnd() + rnd() + rnd() - 1.5) * bandH * 0.1;
      x = x0 + bx * bl * tt - by * o2; y = y0 + by * bl * tt + bx * o2;
      a = 0.1 + rnd() * 0.35; sctx.fillStyle = 'rgba(225,230,255,' + a.toFixed(3) + ')';
      sctx.fillRect(x, y, 0.8, 0.8);
    }
    // россыпь звёзд по всему разделу
    var n = Math.round(W * H / 2600);
    for (i = 0; i < n; i++) {
      x = rnd() * W; y = rnd() * H; r = Math.pow(rnd(), 3) * 1.5 + 0.3; a = 0.2 + rnd() * 0.6;
      sctx.fillStyle = (rnd() < 0.2 ? 'rgba(255,236,205,' : rnd() < 0.4 ? 'rgba(200,215,255,' : 'rgba(255,255,255,') + a.toFixed(3) + ')';
      sctx.beginPath(); sctx.arc(x, y, r, 0, 6.2832); sctx.fill();
    }
    // несколько ярких звёзд с лучами — как на старых звёздных картах
    sctx.strokeStyle = 'rgba(229,201,141,.5)'; sctx.lineWidth = 0.8;
    for (i = 0; i < 9; i++) {
      x = rnd() * W; y = rnd() * H; r = 2 + rnd() * 2.5;
      sctx.fillStyle = 'rgba(245,236,214,.85)'; sctx.beginPath(); sctx.arc(x, y, r * 0.6, 0, 6.2832); sctx.fill();
      sctx.beginPath(); sctx.moveTo(x - r * 3, y); sctx.lineTo(x + r * 3, y); sctx.moveTo(x, y - r * 3); sctx.lineTo(x, y + r * 3); sctx.stroke();
    }
  }

  /* ---------- запуск ---------- */
  counts();
  build();
  sizeTwinkle(); drawTwinkle(0);
  drawSky();
  var start = null, m = /^#upd-([\w-]+)$/.exec(location.hash || '');
  if (m && byId[m[1]]) start = m[1];
  if (!start) phases.forEach(function (p) { if (p.now && !start) start = p.id; });
  select(start || phases[0].id, { hash: false });
  if (m && byId[m[1]]) setTimeout(function () { var a = document.getElementById('upd-' + m[1]); if (a) a.scrollIntoView({ block: 'start' }); }, 60);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (en.target === svg && en.isIntersecting && !introDone) { introDone = true; svg.classList.add('is-on'); }
        if (en.target === chart) { visible = en.isIntersecting; wake(); }
      });
    }, { threshold: [0, 0.18] }).observe(svg);
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; wake(); }, { threshold: 0 }).observe(chart);
  } else { introDone = true; svg.classList.add('is-on'); visible = true; wake(); }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) wake(); });

  var rt = 0, lastW = chart.clientWidth, lastSkyH = root.clientHeight;
  function onResize() {
    clearTimeout(rt);
    rt = setTimeout(function () {
      var w = chart.clientWidth, newMode = w < 720 ? 'tall' : 'wide';
      if (newMode !== mode) build();
      if (w !== lastW || newMode !== mode) { sizeTwinkle(); drawTwinkle(0); }
      if (Math.abs(root.clientHeight - lastSkyH) > 2 || w !== lastW) { drawSky(); lastSkyH = root.clientHeight; }
      lastW = w;
    }, 150);
  }
  if ('ResizeObserver' in window) { new ResizeObserver(onResize).observe(root); new ResizeObserver(onResize).observe(chart); }
  else window.addEventListener('resize', onResize);
})();
