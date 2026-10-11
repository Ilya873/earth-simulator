/* Earth Simulator — титульная карта.
   Процедурная физическая карта: послойная окраска высот, отмывка рельефа, горизонтали,
   «водная штриховка» у берегов, градусная сетка. Мир медленно и ровно плывёт на запад —
   как планета, поворачивающаяся под картой; города привязаны к своей клетке суши и плывут вместе с ней.
   Зажатая кнопка мыши поднимает сушу (с Shift — опускает), как кисть «Земля» в игре. */
(function () {
  'use strict';

  var host = document.querySelector('[data-atlas]');
  if (!host) return;
  var canvas = host.querySelector('canvas');
  var ctx = canvas.getContext('2d');
  if (!ctx) return;
  var readout = host.querySelector('[data-readout]');
  var btnNew = host.querySelector('[data-new-world]');
  var S = {};
  try { S = JSON.parse(host.getAttribute('data-str') || '{}'); } catch (e) {}
  var LANG = host.getAttribute('data-lang') || 'ru';
  var reduceMotion = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  var M_LAND = 5000, M_SEA = 5000;   // метров на единицу высоты
  var DRIFT = 0.4;                   // скорость дрейфа, клеток сетки в секунду (≈2–3 px/с)

  /* ---------- шум: 2D simplex (Gustavson) с зерном ---------- */
  function mulberry(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var GR = [1, 1, -1, 1, 1, -1, -1, -1, 1, 0, -1, 0, 0, 1, 0, -1];
  var F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
  var perm = new Uint8Array(512);
  function seedNoise(rnd) {
    var p = new Uint8Array(256), i, j, t;
    for (i = 0; i < 256; i++) p[i] = i;
    for (i = 255; i > 0; i--) { j = Math.floor(rnd() * (i + 1)); t = p[i]; p[i] = p[j]; p[j] = t; }
    for (i = 0; i < 512; i++) perm[i] = p[i & 255];
  }
  function noise(x, y) {
    var s = (x + y) * F2, i = Math.floor(x + s), j = Math.floor(y + s);
    var t = (i + j) * G2, x0 = x - (i - t), y0 = y - (j - t);
    var i1 = x0 > y0 ? 1 : 0, j1 = 1 - i1;
    var x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    var ii = i & 255, jj = j & 255, n = 0, tt, g;
    tt = 0.5 - x0 * x0 - y0 * y0;
    if (tt > 0) { g = (perm[ii + perm[jj]] & 7) << 1; tt *= tt; n += tt * tt * (GR[g] * x0 + GR[g + 1] * y0); }
    tt = 0.5 - x1 * x1 - y1 * y1;
    if (tt > 0) { g = (perm[ii + i1 + perm[jj + j1]] & 7) << 1; tt *= tt; n += tt * tt * (GR[g] * x1 + GR[g + 1] * y1); }
    tt = 0.5 - x2 * x2 - y2 * y2;
    if (tt > 0) { g = (perm[ii + 1 + perm[jj + 1]] & 7) << 1; tt *= tt; n += tt * tt * (GR[g] * x2 + GR[g + 1] * y2); }
    return 70 * n;
  }
  function fbm(x, y) {
    var a = 1, f = 1, s = 0, n = 0;
    for (var o = 0; o < 5; o++) { s += a * noise(x * f, y * f); n += a; a *= 0.5; f *= 2.03; }
    return s / n;
  }

  /* ---------- мир: бесконечная по долготе суша ---------- */
  var rnd = mulberry(1);
  var NAMES = LANG === 'en'
    ? ['Volaria', 'Karor', 'Velest', 'Tirnia', 'Omland', 'Drapolis', 'Mimir', 'Kaen', 'Sinvess', 'Goros', 'Lumir', 'Arstan', 'Elgrad', 'Beyum', 'Fengrad', 'Unos']
    : ['Волария', 'Карор', 'Велест', 'Тирния', 'Омланд', 'Драполис', 'Мимир', 'Каен', 'Синвесь', 'Горос', 'Лумир', 'Арстан', 'Элград', 'Беум', 'Фенград', 'Унос'];
  var nameAt = 0;

  function newWorld(s) {
    rnd = mulberry(s >>> 0);
    seedNoise(rnd);
    nameAt = Math.floor(rnd() * NAMES.length);
  }
  // u — долгота в долях высоты листа (растёт без предела), v — 0…1 сверху вниз
  function heightAt(u, v) {
    var x = u + noise(u * 1.15 + 13.7, v * 1.15 - 4.2) * 0.3;
    var y = v + noise(u * 1.15 - 7.9, v * 1.15 + 21.3) * 0.3;
    var cont = noise(x * 0.75 + 31.1, y * 0.75 + 5.3) * 0.7 + noise(x * 1.6 - 12.4, y * 1.6 + 8.8) * 0.3;
    var c = 1 / (1 + Math.exp(-cont * 5));                   // мягкая маска материков
    var h = c * 0.92 + fbm(x * 2.3, y * 2.3) * 0.5 - 0.52;
    var r = 1 - Math.abs(noise(x * 3.3 + 40, y * 3.3 + 40));
    var land = h < 0 ? 0 : h > 0.2 ? 1 : h / 0.2;
    h += r * r * r * 0.34 * land;
    return h;
  }

  /* ---------- сетка листа ----------
     Колонка i рисуется в x = mapX + (i − frac)·cs; когда дрейф набегает на целую клетку,
     массивы сдвигаются на колонку влево и справа досчитывается одна новая. */
  var DPR = 1, Wc = 0, Hc = 0, aspect = 1.6;
  var mapX = 0, mapY = 0, mapW, mapH;
  var nCols, nRows, gw, gh, cs, csy, cellU, B, U, Hh, off, offCtx, img;
  var u0 = 0, frac = 0, avoid = [];   // u0 — долгота левой колонки в единицах листа, frac — дробный сдвиг (доля клетки)
  var LON0 = 22, LON_SPAN = 150, LAT_C = 16, lat0, latSpan;

  function layout() {
    var r = host.getBoundingClientRect();
    Wc = Math.max(320, Math.round(r.width)); Hc = Math.max(260, Math.round(canvas.getBoundingClientRect().height || r.height));
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(Wc * DPR); canvas.height = Math.round(Hc * DPR);
    mapW = Wc; mapH = Hc; aspect = mapW / mapH;
    var cell = Wc < 700 ? 5 : 6;
    nCols = Math.max(40, Math.round(mapW / cell)); nRows = Math.max(30, Math.round(mapH / cell));
    cs = mapW / nCols; csy = mapH / nRows;
    gw = nCols + 3; gh = nRows + 1;
    cellU = aspect / nCols;
    B = new Float32Array(gw * gh); U = new Float32Array(gw * gh); Hh = new Float32Array(gw * gh);
    off = document.createElement('canvas'); off.width = gw; off.height = gh;
    offCtx = off.getContext('2d'); img = offCtx.createImageData(gw, gh);
    // узкий (портретный) лист: сужаем охват по долготе, чтобы широты не выходили за полюса
    LON_SPAN = aspect >= 1.36 ? 150 : Math.max(56, 110 * aspect);
    latSpan = LON_SPAN * mapH / mapW; lat0 = LAT_C + latSpan / 2;
    avoid = avoidRects();
    for (var i = 0; i < gw; i++) computeColumn(i);
    placeCities();
  }
  function computeColumn(i) {
    var u = u0 + i * cellU;
    for (var j = 0; j < gh; j++) B[j * gw + i] = heightAt(u, j / nRows);
  }
  function shiftLeft() {
    for (var j = 0; j < gh; j++) {
      var a = j * gw;
      B.copyWithin(a, a + 1, a + gw); U.copyWithin(a, a + 1, a + gw); U[a + gw - 1] = 0;
    }
    u0 += cellU;
    computeColumn(gw - 1);
    for (var q = cities.length - 1; q >= 0; q--) { cities[q].i--; if (cities[q].i < -40) cities.splice(q, 1); }
    maybeSpawnCity(gw - 1);
  }

  /* ---------- палитра: послойная окраска ---------- */
  function hex(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
  var SEA = [[0.04, hex('#C9D9D5')], [0.2, hex('#B9CFD1')], [0.4, hex('#A8C3CA')], [9, hex('#9AB8C3')]];
  var LAND = [[0.04, hex('#CAD7AA')], [0.1, hex('#D6DDB0')], [0.2, hex('#E2E0B3')], [0.3, hex('#E7D7A5')], [0.4, hex('#E0C292')],
              [0.6, hex('#D3AC83')], [0.8, hex('#C39B7D')], [9, hex('#EFEBE2')]];
  function band(tab, x) { for (var k = 0; k < tab.length; k++) if (x < tab[k][0]) return tab[k][1]; return tab[tab.length - 1][1]; }

  function paintTint() {
    var d = img.data, i, j, k, h, c, sh, p;
    for (j = 0; j < gh; j++) {
      for (i = 0; i < gw; i++) {
        k = j * gw + i; h = Hh[k];
        if (h < 0) { c = band(SEA, -h); sh = 1; }
        else {
          c = band(LAND, h);
          var hl = Hh[i > 0 ? k - 1 : k], hr = Hh[i < gw - 1 ? k + 1 : k];
          var hu = Hh[j > 0 ? k - gw : k], hd = Hh[j < gh - 1 ? k + gw : k];
          sh = 1 + ((hl - hr) + (hu - hd)) * 2.6;
          sh = sh < 0.8 ? 0.8 : sh > 1.14 ? 1.14 : sh;
        }
        p = k * 4;
        d[p] = c[0] * sh; d[p + 1] = c[1] * sh; d[p + 2] = c[2] * sh; d[p + 3] = 255;
      }
    }
    offCtx.putImageData(img, 0, 0);
  }

  /* ---------- горизонтали: marching squares (в координатах сетки без дробного сдвига) ---------- */
  var LEVELS = [[-0.5, 2], [-0.34, 2], [-0.2, 2], [-0.1, 1], [-0.058, 1], [-0.026, 1], [0, 0]];
  for (var lv = 0.08; lv < 0.95; lv += 0.08) LEVELS.push([Math.round(lv * 100) / 100, Math.abs(lv - 0.24) < 0.01 || Math.abs(lv - 0.48) < 0.01 || Math.abs(lv - 0.72) < 0.01 ? 4 : 3]);
  var paths;
  function contour() {
    paths = [new Path2D(), new Path2D(), new Path2D(), new Path2D(), new Path2D(), new Path2D(), new Path2D()];
    var lining = [paths[5], paths[6], paths[1]];
    var i, j, k, v0, v1, v2, v3, mn, mx, L, l, cls, idx, x0, y0, x1, y1, P;
    for (j = 0; j < gh - 1; j++) {
      y0 = mapY + j * csy; y1 = y0 + csy;
      for (i = 0; i < gw - 1; i++) {
        k = j * gw + i;
        v0 = Hh[k]; v1 = Hh[k + 1]; v2 = Hh[k + gw + 1]; v3 = Hh[k + gw];
        mn = Math.min(v0, v1, v2, v3); mx = Math.max(v0, v1, v2, v3);
        if (mx < -0.5 || mn > 0.95) continue;
        x0 = mapX + i * cs; x1 = x0 + cs;
        for (L = 0; L < LEVELS.length; L++) {
          l = LEVELS[L][0];
          if (l <= mn || l > mx) continue;
          cls = LEVELS[L][1];
          P = cls === 1 ? lining[L - 3] : paths[cls];
          idx = (v0 > l ? 1 : 0) | (v1 > l ? 2 : 0) | (v2 > l ? 4 : 0) | (v3 > l ? 8 : 0);
          seg(P, idx, l, x0, y0, x1, y1, v0, v1, v2, v3);
        }
      }
    }
  }
  function ex(e, l, x0, y0, x1, y1, v0, v1, v2, v3) {
    switch (e) {
      case 0: return [x0 + (l - v0) / (v1 - v0) * (x1 - x0), y0];
      case 1: return [x1, y0 + (l - v1) / (v2 - v1) * (y1 - y0)];
      case 2: return [x0 + (l - v3) / (v2 - v3) * (x1 - x0), y1];
      default: return [x0, y0 + (l - v0) / (v3 - v0) * (y1 - y0)];
    }
  }
  var SEGS = [null, [3, 0], [0, 1], [3, 1], [1, 2], [3, 0, 1, 2], [0, 2], [3, 2], [2, 3], [0, 2], [0, 1, 2, 3], [1, 2], [1, 3], [0, 1], [3, 0], null];
  function seg(P, idx, l, x0, y0, x1, y1, v0, v1, v2, v3) {
    var s = SEGS[idx]; if (!s) return;
    for (var q = 0; q < s.length; q += 2) {
      var a = ex(s[q], l, x0, y0, x1, y1, v0, v1, v2, v3), b = ex(s[q + 1], l, x0, y0, x1, y1, v0, v1, v2, v3);
      P.moveTo(a[0], a[1]); P.lineTo(b[0], b[1]);
    }
  }

  /* ---------- координаты ---------- */
  function colAt(x) { return (x - mapX) / cs + frac; }
  function lonAt(x) { return LON0 + (u0 + colAt(x) * cellU) * LON_SPAN / aspect; }
  function latAt(y) { return lat0 - (y - mapY) / mapH * latSpan; }
  function xOfLon(lon) { return mapX + (((lon - LON0) * aspect / LON_SPAN - u0) / cellU - frac) * cs; }
  function yOfLat(lat) { return mapY + (lat0 - lat) / latSpan * mapH; }
  function wrapLon(l) { l = ((l + 180) % 360 + 360) % 360 - 180; return l; }
  function dms(v, pos, neg) {
    var a = Math.abs(v), d = Math.floor(a), m = Math.floor((a - d) * 60);
    return d + '°' + (m < 10 ? '0' : '') + m + '′ ' + (v >= 0 ? pos : neg);
  }
  function hAtXY(x, y) {
    var i = Math.round(colAt(x)), j = Math.round((y - mapY) / csy);
    if (i < 0 || j < 0 || i >= gw || j >= gh) return -1;
    return Hh[j * gw + i];
  }

  /* ---------- города: привязаны к своей клетке и плывут вместе с ней ---------- */
  var cities = [];
  function avoidRects() {
    var hr = host.getBoundingClientRect(), out = [];
    host.querySelectorAll('.cartouche, .hero__tools, .hero__north').forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (!r.width || getComputedStyle(el).display === 'none') return;
      out.push([r.left - hr.left, r.top - hr.top, r.right - hr.left, r.bottom - hr.top]);
    });
    return out;
  }
  function nextName() {
    for (var t = 0; t < NAMES.length; t++) {
      var n = NAMES[nameAt++ % NAMES.length], used = false;
      for (var q = 0; q < cities.length; q++) if (cities[q].name === n) { used = true; break; }
      if (!used) return n;
    }
    return NAMES[nameAt++ % NAMES.length];
  }
  function farFromCities(i, j, minD) {
    for (var q = 0; q < cities.length; q++) {
      var dx = (cities[q].i - i) * cs, dy = (cities[q].j - j) * csy;
      if (dx * dx + dy * dy < minD * minD) return false;
    }
    return true;
  }
  // зазор от значка с подписью до ближайшей панели; отрицательный — заходит под неё
  function clearance(x, y, w) {
    var b0 = x - 8, b1 = y - 12, b2 = x + 12 + w, b3 = y + 12, d = 1e9;
    for (var q = 0; q < avoid.length; q++) {
      var R = avoid[q], g = Math.max(R[0] - b2, b0 - R[2], R[1] - b3, b1 - R[3]);
      if (g < d) d = g;
    }
    return d;
  }
  function goodSite(i, j) { var h = B[j * gw + i]; return h >= 0.03 && h <= 0.3 && j * csy > 40 && j * csy < mapH - 30; }
  function placeCities() {
    cities = [];
    var tries = 0, minD = Math.max(90, mapW * 0.09);
    while (cities.length < 9 && tries++ < 1600) {
      var i = 2 + Math.floor(rnd() * (nCols - 4)), j = 2 + Math.floor(rnd() * (gh - 4));
      if (!goodSite(i, j)) continue;
      if (clearance(mapX + i * cs, mapY + j * csy, 110) < 30 || !farFromCities(i, j, minD)) continue;
      cities.push({ i: i, j: j, name: nextName(), cap: cities.length === 0 });
    }
  }
  function maybeSpawnCity(i) {
    var onMap = 0, hasCap = false;
    for (var q = 0; q < cities.length; q++) { if (cities[q].i >= 0 && cities[q].i <= nCols) onMap++; if (cities[q].cap) hasCap = true; }
    if (onMap >= 10 || rnd() > 0.09) return;
    var minD = Math.max(90, mapW * 0.09);
    for (var t = 0; t < 12; t++) {
      var j = 2 + Math.floor(rnd() * (gh - 4));
      if (goodSite(i, j) && farFromCities(i, j, minD)) { cities.push({ i: i, j: j, name: nextName(), cap: !hasCap }); return; }
    }
  }

  /* ---------- отрисовка ---------- */
  var INK = '#1D252C', PAPER = '#F5F0E3', NIGHT = '#0A1320', SEA_INK = '#2B5A73', CONTOUR = '#8A6848';
  var serifFont = '"Alegreya", Georgia, serif';

  function label(text, x, y, font, color, align, halo) {
    ctx.font = font; ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = halo || 3.2; ctx.strokeStyle = 'rgba(245,240,227,.92)';
    ctx.strokeText(text, x, y); ctx.fillStyle = color; ctx.fillText(text, x, y);
  }

  function draw() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, Wc, Hc);
    ctx.fillStyle = NIGHT; ctx.fillRect(0, 0, Wc, Hc);

    ctx.save();
    ctx.beginPath(); ctx.rect(mapX, mapY, mapW, mapH); ctx.clip();
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(off, mapX - cs / 2 - frac * cs, mapY - csy / 2, gw * cs, gh * csy);

    ctx.save();
    ctx.translate(-frac * cs, 0);
    ctx.lineCap = 'round';
    ctx.strokeStyle = SEA_INK;
    ctx.globalAlpha = 0.22; ctx.lineWidth = 0.8; ctx.stroke(paths[2]);
    ctx.lineWidth = 0.7;
    ctx.globalAlpha = 0.14; ctx.stroke(paths[5]);   // −0.10: дальняя линия штриховки
    ctx.globalAlpha = 0.28; ctx.stroke(paths[6]);   // −0.058
    ctx.globalAlpha = 0.46; ctx.stroke(paths[1]);   // −0.026: у самого берега
    ctx.strokeStyle = CONTOUR;
    ctx.globalAlpha = 0.42; ctx.lineWidth = 0.7; ctx.stroke(paths[3]);
    ctx.globalAlpha = 0.62; ctx.lineWidth = 1.2; ctx.stroke(paths[4]);
    ctx.globalAlpha = 1; ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.stroke(paths[0]);
    ctx.restore();

    drawGraticule();
    drawCities();
    ctx.restore();

    ctx.strokeStyle = 'rgba(232,223,201,.25)'; ctx.lineWidth = 1;
    ctx.strokeRect(mapX + 0.5, mapY + 0.5, mapW - 1, mapH - 1);
    if (pointer.in && finePointer) drawBrush();
  }

  function drawGraticule() {
    var lon, lat, x, y, l0 = Math.floor(lonAt(mapX) / 15) * 15, l1 = lonAt(mapX + mapW);
    ctx.strokeStyle = INK; ctx.lineWidth = 0.6; ctx.globalAlpha = 0.22;
    ctx.beginPath();
    for (lon = l0; lon <= l1; lon += 15) { x = xOfLon(lon); ctx.moveTo(x, mapY); ctx.lineTo(x, mapY + mapH); }
    for (lat = Math.floor(lat0 / 15) * 15; lat >= lat0 - latSpan; lat -= 15) { y = yOfLat(lat); ctx.moveTo(mapX, y); ctx.lineTo(mapX + mapW, y); }
    ctx.stroke();
    ctx.globalAlpha = 1;
    var special = [[0, S.eq, []], [23.44, S.cancer, [5, 4]], [-23.44, S.capricorn, [5, 4]], [66.56, S.arctic, [2, 4]], [-66.56, S.antarctic, [2, 4]]];
    for (var k = 0; k < special.length; k++) {
      lat = special[k][0];
      if (lat > lat0 || lat < lat0 - latSpan) continue;
      y = yOfLat(lat);
      ctx.save(); ctx.setLineDash(special[k][2]); ctx.strokeStyle = lat === 0 ? INK : SEA_INK;
      ctx.globalAlpha = lat === 0 ? 0.45 : 0.5; ctx.lineWidth = lat === 0 ? 1 : 0.9;
      ctx.beginPath(); ctx.moveTo(mapX, y); ctx.lineTo(mapX + mapW, y); ctx.stroke(); ctx.restore();
      if (special[k][1] && y - 9 > mapY + 24) label(special[k][1], mapX + mapW - 78, y - 9, 'italic 500 12.5px ' + serifFont, SEA_INK, 'right');
    }
  }

  function drawCities() {
    for (var q = 0; q < cities.length; q++) {
      var c = cities[q], x = mapX + (c.i - frac) * cs, y = mapY + c.j * csy;
      if (x < mapX - 160 || x > mapX + mapW + 4) continue;
      if (c.i < 0 || c.i >= gw || Hh[c.j * gw + c.i] < 0.006) continue;   // город ушёл под воду — не рисуем
      var font = (c.cap ? 'italic 700 15px ' : 'italic 500 13.5px ') + serifFont;
      if (!c.w) { ctx.font = font; c.w = ctx.measureText(c.name).width; }
      var a = clearance(x, y, c.w) / 36;
      if (a <= 0) continue;
      ctx.globalAlpha = a > 1 ? 1 : a;
      ctx.lineWidth = 1.3; ctx.strokeStyle = INK; ctx.fillStyle = PAPER;
      ctx.beginPath(); ctx.arc(x, y, c.cap ? 5 : 3.6, 0, 6.2832); ctx.fill(); ctx.stroke();
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x, y, c.cap ? 2.2 : 1.5, 0, 6.2832); ctx.fill();
      label(c.name, x + 9, y - 1, font, INK, 'left', 3.4);
    }
    ctx.globalAlpha = 1;
  }

  var BRUSH = 46;
  function drawBrush() {
    ctx.save();
    ctx.strokeStyle = INK; ctx.globalAlpha = 0.7; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.arc(pointer.x, pointer.y, BRUSH, 0, 6.2832); ctx.stroke();
    ctx.setLineDash([]); ctx.beginPath();
    ctx.moveTo(pointer.x - 6, pointer.y); ctx.lineTo(pointer.x + 6, pointer.y);
    ctx.moveTo(pointer.x, pointer.y - 6); ctx.lineTo(pointer.x, pointer.y + 6); ctx.stroke();
    ctx.restore();
  }

  /* ---------- кисть ---------- */
  var pointer = { x: 0, y: 0, in: false, down: false, sign: 1 };
  var finePointer = !!(window.matchMedia && matchMedia('(pointer: fine)').matches);
  function brush(dt) {
    var R = BRUSH, ci = colAt(pointer.x), cj = (pointer.y - mapY) / csy;
    var ri = Math.ceil(R / cs), rj = Math.ceil(R / csy), amt = 0.9 * dt * pointer.sign;
    for (var j = Math.max(0, Math.floor(cj - rj)); j <= Math.min(gh - 1, Math.ceil(cj + rj)); j++) {
      for (var i = Math.max(0, Math.floor(ci - ri)); i <= Math.min(gw - 1, Math.ceil(ci + ri)); i++) {
        var dx = (i - ci) * cs, dy = (j - cj) * csy, d2 = (dx * dx + dy * dy) / (R * R);
        if (d2 > 1) continue;
        var k = j * gw + i, w = Math.exp(-d2 * 3.2);
        U[k] = Math.max(-0.9, Math.min(0.9, U[k] + amt * w));
      }
    }
  }
  function updateReadout() {
    if (!readout) return;
    var h = hAtXY(pointer.x, pointer.y), on = pointer.in && h !== -1;
    readout.classList.toggle('is-on', on);
    if (!on) return;
    var lat = latAt(pointer.y), lon = wrapLon(lonAt(pointer.x));
    var m = h >= 0 ? Math.round(h * M_LAND / 10) * 10 : Math.round(-h * M_SEA / 10) * 10;
    var num = m.toLocaleString(LANG === 'en' ? 'en-US' : 'ru-RU');
    readout.textContent = dms(lat, S.n || 'N', S.s || 'S') + ' · ' + dms(lon, S.e || 'E', S.w || 'W') + ' · ' +
      (h >= 0 ? (S.elev || 'elevation') : (S.depth || 'depth')) + ' ' + num + ' ' + (S.m || 'm');
  }

  function local(ev) {
    var r = canvas.getBoundingClientRect();
    pointer.x = ev.clientX - r.left; pointer.y = ev.clientY - r.top;
    pointer.in = pointer.x > mapX && pointer.y > mapY && pointer.x < mapX + mapW && pointer.y < mapY + mapH;
  }
  canvas.addEventListener('pointermove', function (ev) { local(ev); wake(); });
  canvas.addEventListener('pointerleave', function () { pointer.in = false; pointer.down = false; wake(); });
  canvas.addEventListener('pointerdown', function (ev) {
    if (ev.pointerType !== 'mouse' || ev.button !== 0) return;
    local(ev); pointer.down = true; pointer.sign = ev.shiftKey ? -1 : 1;
    try { canvas.setPointerCapture(ev.pointerId); } catch (e) {}
    ev.preventDefault(); wake();
  });
  window.addEventListener('pointerup', function () { pointer.down = false; });
  window.addEventListener('keydown', function (e) { if (e.key === 'Shift') pointer.sign = -1; });
  window.addEventListener('keyup', function (e) { if (e.key === 'Shift') pointer.sign = 1; });
  if (btnNew) btnNew.addEventListener('click', function () {
    newWorld((Math.random() * 4294967296) >>> 0);
    u0 = 0; frac = 0; U.fill(0);
    for (var i = 0; i < gw; i++) computeColumn(i);
    placeCities(); lastDraw = 0; wake();
  });

  /* ---------- цикл ---------- */
  var visible = true, lastDraw = 0, raf = 0, idleFrames = 0;
  function frame(now) {
    raf = 0;
    if (!visible || document.hidden) return;
    var active = pointer.down || pointer.in;
    var fps = active ? 40 : 20;
    if (now - lastDraw >= 1000 / fps) {
      var step = Math.min(0.25, (now - lastDraw) / 1000); lastDraw = now;
      if (!reduceMotion) {
        frac += step * DRIFT;
        while (frac >= 1) { frac -= 1; shiftLeft(); }
      }
      if (pointer.down && pointer.in) brush(step);
      var decay = Math.exp(-step / 40), n = gw * gh, k, anyU = false;
      for (k = 0; k < n; k++) { if (U[k] !== 0) { U[k] *= decay; if (Math.abs(U[k]) < 1e-4) U[k] = 0; else anyU = true; } Hh[k] = B[k] + U[k]; }
      paintTint(); contour(); draw(); updateReadout();
      idleFrames = (!active && reduceMotion && !anyU) ? idleFrames + 1 : 0;
    }
    if (!(reduceMotion && idleFrames > 2)) raf = requestAnimationFrame(frame);
  }
  function wake() { idleFrames = 0; if (!raf && visible) raf = requestAnimationFrame(frame); }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) wake(); }, { threshold: 0.02 }).observe(host);
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { lastDraw = performance.now(); wake(); } });
  var rT = 0, lastSize = '';
  function sizeKey() { var r = host.getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height); }
  function onResize() {
    clearTimeout(rT);
    rT = setTimeout(function () {
      var k = sizeKey();
      if (k === lastSize) return;
      lastSize = k; layout(); lastDraw = 0; wake();
    }, 150);
  }
  if ('ResizeObserver' in window) new ResizeObserver(onResize).observe(host); else window.addEventListener('resize', onResize);

  newWorld((Math.random() * 4294967296) >>> 0);
  layout();
  lastSize = sizeKey();
  for (var k0 = 0; k0 < gw * gh; k0++) Hh[k0] = B[k0];
  paintTint(); contour(); draw();
  host.classList.add('is-live');
  // шрифты подгружаются позже — перерисуем подписи
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { lastDraw = 0; wake(); });
  wake();
})();
