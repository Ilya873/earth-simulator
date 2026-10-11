/* Earth Simulator — титульная карта.
   Процедурная физическая карта: послойная окраска высот, отмывка рельефа, горизонтали,
   «водная штриховка» у берегов, градусная сетка и рамка. Материки медленно дрейфуют.
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

  /* ---------- мир ---------- */
  var seed, blobs, cities = [];
  var NAMES = LANG === 'en'
    ? ['Volaria', 'Karor', 'Velest', 'Tirnia', 'Omland', 'Drapolis', 'Mimir', 'Kaen', 'Sinvess', 'Goros', 'Lumir', 'Arstan']
    : ['Волария', 'Карор', 'Велест', 'Тирния', 'Омланд', 'Драполис', 'Мимир', 'Каен', 'Синвесь', 'Горос', 'Лумир', 'Арстан'];

  function newWorld(s) {
    seed = s >>> 0;
    var rnd = mulberry(seed);
    seedNoise(rnd);
    blobs = [];
    // «плиты-лайт»: несколько гауссовых материков в видимой части листа
    var n = 4 + Math.floor(rnd() * 3);
    for (var k = 0; k < n; k++) {
      blobs.push({
        x: 0.34 + rnd() * 0.62, y: 0.1 + rnd() * 0.66,
        r2: Math.pow(0.13 + rnd() * 0.17, 2), w: 0.6 + rnd() * 0.5
      });
    }
    blobs.push({ x: 0.08 + rnd() * 0.2, y: 0.08 + rnd() * 0.2, r2: 0.012, w: 0.5 });
    cities = [];
    cityRnd = mulberry(seed ^ 0x9e3779b9);
    citiesPlaced = false;
  }
  var cityRnd, citiesPlaced = false;

  var T = 0; // геологическое время листа
  function heightAt(u, v) {
    var wx = noise(u * 1.15 + 13.7 + T * 0.55, v * 1.15 - 4.2) * 0.32;
    var wy = noise(u * 1.15 - 7.9, v * 1.15 + 21.3 - T * 0.45) * 0.32;
    var x = u + wx, y = v + wy, c = 0;
    for (var k = 0; k < blobs.length; k++) {
      var b = blobs[k], dx = x - b.x * aspect, dy = y - b.y;
      c += b.w * Math.exp(-(dx * dx + dy * dy) / b.r2);
    }
    c = 1 - Math.exp(-1.7 * c);                         // насыщение: материки не превращаются в столовые горы
    var h = c * 0.92 + fbm(x * 2.3, y * 2.3) * 0.56 - 0.44;
    var r = 1 - Math.abs(noise(x * 3.3 + 40, y * 3.3 + 40));
    var land = h < 0 ? 0 : h > 0.2 ? 1 : h / 0.2;
    h += r * r * r * 0.34 * land;
    return h;
  }

  /* ---------- сетка и геометрия листа ---------- */
  var DPR = 1, Wc = 0, Hc = 0, aspect = 1.6;
  var FR = 18;                        // поле рамки, css px
  var mapX, mapY, mapW, mapH;
  var gw, gh, cs, csy, B, U, Hh, off, offCtx, img, stripe = 0;
  var LON0 = 22, LON_SPAN = 150, LAT_C = 16, lat0, latSpan;

  function layout() {
    var r = host.getBoundingClientRect();
    Wc = Math.max(320, Math.round(r.width)); Hc = Math.max(260, Math.round(canvas.getBoundingClientRect().height || r.height));
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(Wc * DPR); canvas.height = Math.round(Hc * DPR);
    mapX = FR; mapY = FR; mapW = Wc - 2 * FR; mapH = Hc - 2 * FR;
    aspect = mapW / mapH;
    var cell = Wc < 700 ? 5 : 6;
    gw = Math.max(40, Math.round(mapW / cell) + 1); gh = Math.max(30, Math.round(mapH / cell) + 1);
    cs = mapW / (gw - 1); csy = mapH / (gh - 1);
    B = new Float32Array(gw * gh); U = new Float32Array(gw * gh); Hh = new Float32Array(gw * gh);
    off = document.createElement('canvas'); off.width = gw; off.height = gh;
    offCtx = off.getContext('2d'); img = offCtx.createImageData(gw, gh);
    // узкий (портретный) лист: сужаем охват по долготе, чтобы широты не выходили за полюса
    LON_SPAN = aspect >= 1.36 ? 150 : Math.max(56, 110 * aspect);
    latSpan = LON_SPAN * mapH / mapW; lat0 = LAT_C + latSpan / 2;
    var hr = host.getBoundingClientRect(), tr = host.querySelector('.hero__tools');
    toolsRect = null;
    if (tr && tr.offsetParent) { var r2 = tr.getBoundingClientRect(); toolsRect = [r2.left - hr.left - 8, r2.top - hr.top - 8, r2.right - hr.left + 8, r2.bottom - hr.top + 8]; }
    for (var j = 0; j < gh; j++) computeRow(j);
    citiesPlaced = false;
  }
  var toolsRect = null;
  function inTools(x, y) { return toolsRect && x > toolsRect[0] && x < toolsRect[2] && y > toolsRect[1] && y < toolsRect[3]; }
  function computeRow(j) {
    var v = j / (gh - 1), base = j * gw;
    for (var i = 0; i < gw; i++) B[base + i] = heightAt((i / (gw - 1)) * aspect, v);
  }

  /* ---------- палитра: послойная окраска ---------- */
  function hex(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
  var SEA = [[0.06, hex('#C9D9D5')], [0.16, hex('#B9CFD1')], [0.32, hex('#A8C3CA')], [9, hex('#9AB8C3')]];
  var LAND = [[0.05, hex('#CAD7AA')], [0.12, hex('#D6DDB0')], [0.20, hex('#E2E0B3')], [0.30, hex('#E7D7A5')], [0.42, hex('#E0C292')],
              [0.56, hex('#D3AC83')], [0.70, hex('#C39B7D')], [9, hex('#EFEBE2')]];
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

  /* ---------- горизонтали: marching squares ---------- */
  // уровни: [значение, класс]; классы: 0 берег, 1 водная штриховка, 2 изобаты, 3 горизонтали, 4 утолщённые
  var LEVELS = [[-0.5, 2], [-0.34, 2], [-0.2, 2], [-0.1, 1], [-0.058, 1], [-0.026, 1], [0, 0]];
  for (var lv = 0.08; lv < 0.95; lv += 0.08) LEVELS.push([Math.round(lv * 100) / 100, Math.abs(lv - 0.24) < 0.01 || Math.abs(lv - 0.48) < 0.01 || Math.abs(lv - 0.72) < 0.01 ? 4 : 3]);
  var paths;
  function contour() {
    paths = [new Path2D(), new Path2D(), new Path2D(), new Path2D(), new Path2D(), new Path2D(), new Path2D()];
    var lining = [paths[5], paths[6], paths[1]]; // три линии штриховки — разной силы
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
  function lonAt(x) { return LON0 + (x - mapX) / mapW * LON_SPAN; }
  function latAt(y) { return lat0 - (y - mapY) / mapH * latSpan; }
  function xOfLon(lon) { return mapX + (lon - LON0) / LON_SPAN * mapW; }
  function yOfLat(lat) { return mapY + (lat0 - lat) / latSpan * mapH; }
  function dms(v, pos, neg) {
    var a = Math.abs(v), d = Math.floor(a), m = Math.floor((a - d) * 60);
    return d + '°' + (m < 10 ? '0' : '') + m + '′ ' + (v >= 0 ? pos : neg);
  }

  /* ---------- города ---------- */
  function avoidRects() {
    var hr = host.getBoundingClientRect(), out = [];
    host.querySelectorAll('.cartouche, .legend, .hero__tools, .hero__north').forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (!r.width) return;
      out.push([r.left - hr.left - 26, r.top - hr.top - 18, r.right - hr.left + 90, r.bottom - hr.top + 18]);
    });
    return out;
  }
  function placeCities() {
    cities = [];
    var rects = avoidRects(), tries = 0, minD = Math.max(90, mapW * 0.09);
    while (cities.length < 9 && tries++ < 1600) {
      var i = 2 + Math.floor(cityRnd() * (gw - 4)), j = 2 + Math.floor(cityRnd() * (gh - 4));
      var h = B[j * gw + i];
      if (h < 0.025 || h > 0.3) continue;
      var x = mapX + i * cs, y = mapY + j * csy, ok = true, q;
      for (q = 0; q < rects.length; q++) { var R = rects[q]; if (x > R[0] && x < R[2] && y > R[1] && y < R[3]) { ok = false; break; } }
      if (!ok || x > mapX + mapW - 110 || y < mapY + 34 || y > mapY + mapH - 20) continue;
      for (q = 0; q < cities.length; q++) { var dx = cities[q].x - x, dy = cities[q].y - y; if (dx * dx + dy * dy < minD * minD) { ok = false; break; } }
      if (!ok) continue;
      cities.push({ i: i, j: j, x: x, y: y, name: NAMES[cities.length % NAMES.length], cap: cities.length === 0 });
    }
    citiesPlaced = true;
  }

  /* ---------- отрисовка ---------- */
  var INK = '#1D252C', PAPER = '#F5F0E3', SEA_INK = '#2B5A73', CONTOUR = '#8A6848';
  var serifFont = '"Alegreya", Georgia, serif', monoFont = '"IBM Plex Mono", Consolas, monospace';

  function label(text, x, y, font, color, align, halo) {
    ctx.font = font; ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = halo || 3.2; ctx.strokeStyle = 'rgba(245,240,227,.92)';
    ctx.strokeText(text, x, y); ctx.fillStyle = color; ctx.fillText(text, x, y);
  }

  function draw() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, Wc, Hc);
    ctx.fillStyle = PAPER; ctx.fillRect(0, 0, Wc, Hc);

    ctx.save();
    ctx.beginPath(); ctx.rect(mapX, mapY, mapW, mapH); ctx.clip();
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(off, mapX - cs / 2, mapY - csy / 2, gw * cs, gh * csy);

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

    drawGraticule();
    drawCities();
    ctx.restore();

    drawFrame();
    if (pointer.in && finePointer) drawBrush();
  }

  function drawGraticule() {
    var lon, lat, x, y;
    ctx.strokeStyle = INK; ctx.lineWidth = 0.6; ctx.globalAlpha = 0.22;
    ctx.beginPath();
    for (lon = Math.ceil(LON0 / 15) * 15; lon <= LON0 + LON_SPAN; lon += 15) { x = xOfLon(lon); ctx.moveTo(x, mapY); ctx.lineTo(x, mapY + mapH); }
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
    // подписи градусов: долготы — по верхнему краю, широты — по правому
    var f = '400 10px ' + monoFont, stepLon = (mapW / LON_SPAN) * 15 < 80 ? 30 : 15;
    for (lon = Math.ceil(LON0 / stepLon) * stepLon; lon <= LON0 + LON_SPAN; lon += stepLon) {
      x = xOfLon(lon); if (x < mapX + 30 || x > mapX + mapW - 70 || inTools(x + 4, mapY + 10) || inTools(x + 50, mapY + 10)) continue;
      label(Math.abs(lon) + '°' + (lon >= 0 ? (S.e || 'E') : (S.w || 'W')), x + 4, mapY + 10, f, INK, 'left', 3);
    }
    var stepLat = (mapH / latSpan) * 15 < 46 ? 30 : 15;
    for (lat = Math.floor(lat0 / stepLat) * stepLat; lat >= lat0 - latSpan; lat -= stepLat) {
      y = yOfLat(lat); if (y < mapY + 80 || y > mapY + mapH - 16) continue;
      label(Math.abs(lat) + '°' + (lat > 0 ? ' ' + (S.n || 'N') : lat < 0 ? ' ' + (S.s || 'S') : ''), mapX + mapW - 6, y - 8, f, INK, 'right', 3);
    }
  }

  function drawCities() {
    if (!citiesPlaced) placeCities();
    for (var q = 0; q < cities.length; q++) {
      var c = cities[q], h = Hh[c.j * gw + c.i];
      if (h < 0.008) continue;
      ctx.lineWidth = 1.3; ctx.strokeStyle = INK; ctx.fillStyle = PAPER;
      ctx.beginPath(); ctx.arc(c.x, c.y, c.cap ? 5 : 3.6, 0, 6.2832); ctx.fill(); ctx.stroke();
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(c.x, c.y, c.cap ? 2.2 : 1.5, 0, 6.2832); ctx.fill();
      label(c.name, c.x + 9, c.y - 1, (c.cap ? 'italic 700 15px ' : 'italic 500 13.5px ') + serifFont, INK, 'left', 3.4);
    }
  }

  function drawFrame() {
    // градусная рамка: чередующиеся штрихи через 5°
    var bw = 6, ox = mapX - bw, oy = mapY - bw;
    ctx.fillStyle = PAPER; ctx.fillRect(ox, oy, mapW + 2 * bw, bw); ctx.fillRect(ox, mapY + mapH, mapW + 2 * bw, bw);
    ctx.fillRect(ox, mapY, bw, mapH); ctx.fillRect(mapX + mapW, mapY, bw, mapH);
    ctx.fillStyle = INK;
    var lon, lat, a, b, n = 0;
    for (lon = Math.floor(LON0 / 5) * 5; lon < LON0 + LON_SPAN; lon += 5, n++) {
      if ((Math.round(lon / 5) & 1) === 0) continue;
      a = Math.max(mapX, xOfLon(lon)); b = Math.min(mapX + mapW, xOfLon(lon + 5));
      if (b > a) { ctx.fillRect(a, oy, b - a, bw); ctx.fillRect(a, mapY + mapH, b - a, bw); }
    }
    for (lat = Math.ceil(lat0 / 5) * 5; lat > lat0 - latSpan; lat -= 5) {
      if ((Math.round(lat / 5) & 1) === 0) continue;
      a = Math.max(mapY, yOfLat(lat)); b = Math.min(mapY + mapH, yOfLat(lat - 5));
      if (b > a) { ctx.fillRect(ox, a, bw, b - a); ctx.fillRect(mapX + mapW, a, bw, b - a); }
    }
    ctx.strokeStyle = INK; ctx.lineWidth = 1;
    ctx.strokeRect(ox + 0.5, oy + 0.5, mapW + 2 * bw - 1, mapH + 2 * bw - 1);
    ctx.strokeRect(mapX - 0.5, mapY - 0.5, mapW + 1, mapH + 1);
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
    var R = BRUSH, ci = (pointer.x - mapX) / cs, cj = (pointer.y - mapY) / csy;
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
    var i = Math.round((pointer.x - mapX) / cs), j = Math.round((pointer.y - mapY) / csy);
    var on = pointer.in && i >= 0 && j >= 0 && i < gw && j < gh;
    readout.classList.toggle('is-on', on);
    if (!on) return;
    var h = Hh[j * gw + i], lat = latAt(pointer.y), lon = lonAt(pointer.x);
    var m = h >= 0 ? Math.round(h * 5600 / 10) * 10 : Math.round(-h * 6800 / 10) * 10;
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
    T = 0; for (var j = 0; j < gh; j++) computeRow(j); U.fill(0); wake();
  });

  /* ---------- цикл ---------- */
  var visible = true, last = 0, lastDraw = 0, raf = 0, idleFrames = 0;
  function frame(now) {
    raf = 0;
    if (!visible || document.hidden) return;
    var dt = Math.min(0.1, (now - last) / 1000 || 0.016); last = now;
    var active = pointer.down || pointer.in;
    var fps = active ? 40 : 14;
    if (now - lastDraw >= 1000 / fps) {
      var step = (now - lastDraw) / 1000; lastDraw = now;
      if (!reduceMotion) {
        T += step * 0.016;
        var rows = Math.ceil(gh / 5);
        for (var r = 0; r < rows; r++) { computeRow(stripe); stripe = (stripe + 1) % gh; }
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
  document.addEventListener('visibilitychange', function () { if (!document.hidden) wake(); });
  var rT = 0;
  function onResize() { clearTimeout(rT); rT = setTimeout(function () { layout(); lastDraw = 0; wake(); }, 120); }
  if ('ResizeObserver' in window) new ResizeObserver(onResize).observe(host); else window.addEventListener('resize', onResize);

  newWorld((Math.random() * 4294967296) >>> 0);
  layout();
  for (var k0 = 0; k0 < gw * gh; k0++) Hh[k0] = B[k0];
  paintTint(); contour(); draw();
  host.classList.add('is-live');
  // шрифты подгружаются позже — перерисуем подписи
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { lastDraw = 0; wake(); });
  wake();
})();
