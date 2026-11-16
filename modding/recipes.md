---
layout: guide
lang: ru
chapter: recipes
title: "Что можно менять кодом"
summary: "Десять готовых дополнений с кодом — от правила «сто лет без войн» до своего слоя карты, окна, вкладки державы и кольчуги на прогулке. Каждое проверено в игре, код можно скачать и взять за основу своего."
alt_url: /en/modding/recipes/
permalink: /modding/recipes/
---

* Оглавление
{:toc}

## Как пользоваться рецептами

Каждый рецепт — **отдельное рабочее дополнение**: папка с `mod.json` и одним скриптом. Все десять проверены в игре версии 2.2.0 — подключены как настоящие дополнения через «Мастерскую», вместе, в одном мире на 400 лет, на русском и английском. Снимки ниже сделаны там же.

**[Скачать все десять примеров (zip)]({{ '/assets/modding/earthsim-code-examples.zip' | relative_url }})** — распакуйте папки в `mods` рядом с игрой, поставьте галочки в «Мастерской» и перезапустите игру.
{: .note}

Если вы ещё не делали дополнений с кодом, начните с главы [«Дополнения с кодом»]({{ '/modding/code/' | relative_url }}): там объяснено, как игра подключает код, что такое `ModAPI` и почему код обёрнут в `(function () { … })();`.

| Рецепт | Что показывает |
|---|---|
| [Долгий мир](#peace) | обёртка `wrap` над функцией игры, событие `year`, запись в хронику, данные в сохранении |
| [Свой слой карты](#layer) | `registerLayer`: кнопка, легенда, подсказка у курсора, 2D и 3D |
| [Свои записи в хронике](#chronicle) | `chronKind`: свой вид записей, значок, уведомление на экране |
| [Стабильность, политика, сила](#politics) | `civStabTerm`, `POL_PM_HOOKS`, обёртка `after` |
| [Вкладка державы и своя команда](#dossier) | `statsAddStateTab`, кнопка, `netAct`/`netDo` — меняет мир и в сетевой игре |
| [Своё окно и кнопка](#window) | `UI.win`, `UI.table`, кнопка на верхней панели, `ModAPI.ready` |
| [Кольчуга странника: прогулка](#walk) | события прогулки `hurt`, `kill`, `loot`, табло `wkHudSet`, клавиша `WK_KEYS` |
| [Мир, который меняется сам](#world) | запись в массивы `W` внутри шага мира |
| [Тихое небо](#sky) | обёртка `before` (отмена вызова), событие `disaster`, всплывающее сообщение |
| [Правка по якорю](#patch) | `patches`: вставка в код, до которого обёрткой не добраться |

## Долгий мир {#peace}

Первые сто лет мира ИИ не объявляет войн; на сотый год хроника пишет, сколько войн так и не началось. Война, которую объявляет сам игрок, проходит.

`mod.json` — у всех рецептов одинаковый по форме, меняются только названия и имя скрипта:

{% raw %}
```json
{
  "id": "long-peace",
  "name": { "ru": "Долгий мир", "en": "The Long Peace" },
  "author": "Earth Simulator",
  "description": { "ru": "Первые сто лет мира войн не бывает. Пример дополнения с кодом.", "en": "No wars in the first hundred years of a world. A code add-on example." },
  "version": "1.0",
  "code": { "minGame": "2.2.0", "scripts": ["peace.js"] }
}
```
{% endraw %}

`peace.js`:

{% raw %}
```js
// peace.js — «Долгий мир»: первые сто лет войн не бывает, на сотый год хроника подводит итог
(function () {
  'use strict';
  const ID = 'long-peace';     // id дополнения: подпись обёртки и ключ в сохранении
  const UNTIL = 100;           // до какого года мира войн нет
  let stopped = 0;             // сколько войн не началось (хранится в сохранении)

  // Обёртка над функцией игры. declareWar(att, def, cause, force) возвращает войну или null, если войны не будет.
  // force — войну объявляет сам игрок (инструмент «Война»): его волю не трогаем, держим только ИИ
  ModAPI.wrap('declareWar', function (orig, att, def, cause, force) {
    if (!force && W.simYear < UNTIL) { stopped++; return null; }
    return orig(att, def, cause, force);
  }, ID);

  ModAPI.on('year', function (y) {
    if (y !== UNTIL) return;
    logEvent('peace', TF('Долгий мир окончен. Попыток начать войну за {0} лет: {1}',
      'The Long Peace is over. Attempts to start a war in {0} years: {1}', UNTIL, stopped), { imp: 2 });
  });

  // своё состояние: новый мир — с нуля, сохранение — в o.ext[ID]
  ModAPI.on('worldgen', function () { stopped = 0; });
  ModAPI.on('reset', function () { stopped = 0; });
  ModAPI.on('save', function (o) { o.ext[ID] = { stopped: stopped }; });
  ModAPI.on('load', function (o) {
    const d = o.ext && o.ext[ID];  // раздела нет — старое сохранение или мир без дополнения
    stopped = d && d.stopped > 0 ? d.stopped | 0 : 0;
  });
})();
```
{% endraw %}

- `ModAPI.wrap` встаёт вместо `declareWar`. Вернуть `null` — то же, что ответ игры «войны не будет»: вызывающий код это понимает.
- `force` — войну объявляет игрок своим инструментом. Правила мира в игре тоже держат только ИИ, а не волю игрока.
- Счётчик живёт в сохранении (`save`/`load`) и сбрасывается в новом мире (`worldgen`, `reset`). Так он переживает перезапуск и в сетевой игре доходит до новичка.

**Попробуйте:** вместо срока — «пока в мире меньше пяти держав»: `states.filter(s => s.alive).length < 5`.

## Свой слой карты {#layer}

Новая кнопка в ряду слоёв «Природа»: как далеко каждая земля от моря. Слой рисуется и в 2D, и в 3D, у него есть легенда, а подсказка у курсора получает свою строку.

{% include figure.html src="/assets/modding/layer-ru-1600.jpg" caption="Слой «До моря» из дополнения: побережья голубые, глубь материков — тёмно-красная." wide=true %}

{% raw %}
```js
// layer.js — свой слой карты «До моря»: и в 2D, и в 3D, с легендой и строкой в подсказке у курсора
(function () {
  'use strict';
  const FAR = 16;   // с какого расстояния (в клетках) земля считается совсем «глубинной»
  // цвета легенды: берег — голубой, середина — жёлтый, глубь — тёмно-красный
  const C0 = [64, 170, 235], C1 = [240, 214, 110], C2 = [168, 58, 40];
  const mix = (a, b, t, k) => Math.round(a[k] + (b[k] - a[k]) * t);

  registerLayer('coastdist', {
    label: T('До моря', 'To the sea'),     // подпись кнопки внизу экрана и плашки на карте
    group: 'nature',                        // ряд кнопок «Природа» ('society' — «Общество»)
    legend: { g: 'linear-gradient(90deg,rgb(64,170,235),rgb(240,214,110),rgb(168,58,40))',
              mn: T('берег', 'coast'), mx: TF('{0}+ клеток', '{0}+ cells', FAR) },
    // цвет клетки i: out = [r, g, b, a], всё 0..255; a = 0 — клетка прозрачна (море видно как есть)
    cell(i, out) {
      if (W.isWater[i]) { out[3] = 0; return; }
      const t = Math.min(1, W.distOcean[i] / FAR);
      const a = t < 0.5 ? C0 : C1, b = t < 0.5 ? C1 : C2, u = t < 0.5 ? t * 2 : t * 2 - 1;
      out[0] = mix(a, b, u, 0); out[1] = mix(a, b, u, 1); out[2] = mix(a, b, u, 2); out[3] = 200;
    },
    smooth: true,       // плавно между клетками (поле), а не резкими квадратами
    veil: true,         // приглушить биомы под слоем
    borders: true,      // границы держав поверх
    info(i) {           // строка в подсказке у курсора
      return W.isWater[i] ? '' : TF('До моря: {0} кл.', 'To the sea: {0} cells', W.distOcean[i]);
    },
  });
})();
```
{% endraw %}

- `cell(i, out)` зовётся для каждой клетки, когда карта перерисовывает слой; он должен быть быстрым и ничего не менять в мире.
- `out[3] = 0` — клетка прозрачна: море видно как обычно.
- `smooth`, `veil`, `borders` — плавность между клетками, приглушить биомы, границы держав поверх.
- `W.distOcean` — готовое поле игры: расстояние до моря в клетках. Любой массив из [таблицы `W`]({{ '/modding/code/' | relative_url }}#globals) годится для своего слоя: температура, осадки, загрязнение, культура.

## Свои записи в хронике {#chronicle}

Каждые сто лет со дня основания держава празднует юбилей. У записей свой вид: значок короны, зелёный цвет «хорошего» события, фильтр «Державы». Юбилей от трёхсот лет — с уведомлением на экране.

{% include figure.html src="/assets/modding/jubilee-ru-1600.jpg" caption="Хроника, поиск «празднует»: записи юбилеев со своим значком короны." wide=true %}

{% raw %}
```js
// jubilees.js — свой вид записей хроники: юбилеи держав (каждые 100 лет)
(function () {
  'use strict';
  // Вид записи: категория фильтра хроники (war, state, people, mind, nature, econ, player), значок UI.icon,
  // заголовок уведомления, good: 1 — событие хорошее (зелёное). Имя вида — латинские строчные буквы
  chronKind('jubilee', {
    cat: 'state', icon: 'crown', good: 1,
    title: function () { return T('Юбилей державы', 'A nation’s jubilee'); },
  });

  // Шаг мира: событие 'year' приходит внутри шага, поэтому писать в хронику здесь можно (и в сетевой игре тоже)
  ModAPI.on('year', function (y) {
    for (const st of states) {
      if (!st.alive) continue;
      const age = y - Math.floor(st.born);
      if (age <= 0 || age % 100 !== 0) continue;
      logEvent('jubilee', TF('{0} празднует {1} лет со дня основания', '{0} celebrates {1} years since its founding', st.name, age),
        { s: [st.id], cell: st.capital, imp: age >= 300 ? 2 : 1 });   // s — державы записи (кнопка «Показать»), imp 2 — уведомление на экране
    }
  });
})();
```
{% endraw %}

- `chronKind` вызывается один раз при загрузке. Имя вида — латинские строчные буквы.
- `logEvent(вид, текст, данные)`: `s` — номера держав записи (по ним работает кнопка «Показать»), `cell` — место на карте, `imp: 2` — уведомление.
- Текст пишется на языке игрока в момент записи — через `TF`, с подстановкой имени, а не склейкой.
- Хронику и мир можно менять из `year`: это событие приходит внутри шага мира. Из события `event` — нельзя (см. [события мира]({{ '/modding/code/' | relative_url }}#events)).

## Стабильность, политика, сила {#politics}

Три способа изменить жизнь держав, не трогая код игры:

1. **Слагаемое стабильности.** Столица на побережье добавляет стабильности. Новая строка сама появляется в разборе стабильности.
2. **Политические множители.** Теократии растут быстрее, но медленнее учатся.
3. **Обёртка `after`.** Армии очень набожных теократий на 15 % сильнее.

{% include figure.html src="/assets/modding/stab-ru-1600.jpg" caption="Подсказка стабильности на странице державы: строка «Столица-гавань» добавлена дополнением." wide=true %}

{% raw %}
```js
// politics.js — три способа изменить жизнь держав: слагаемое стабильности, политический множитель, обёртка «после»
(function () {
  'use strict';
  const ID = 'harbor-politics';

  // 1. Слагаемое стабильности: fn(st) возвращает добавку к цели стабильности (в пределах ±0.3).
  //    Строка сама появляется в разборе стабильности (подсказка у стабильности на странице державы).
  //    fn — чистая функция мира: только читает, ничего не пишет и не тянет Math.random
  civStabTerm('harbor', 'Столица-гавань', 'Harbour capital', function (st) {
    return st.capital >= 0 && W.isCoast[st.capital] ? 0.04 : 0;
  });

  // 2. Политические множители: st.pm = { tech, growth, gdp, lit, war, mil, … — множители (1 — без изменений);
  //    stab, happy — добавки (0 — без изменений) }. Игра сама держит итог в разумных пределах
  window.POL_PM_HOOKS = window.POL_PM_HOOKS || [];
  POL_PM_HOOKS.push(function (st, m) {
    if (st.gov !== 'theocracy') return;
    m.growth *= 1.05;   // больше детей
    m.tech *= 0.92;     // меньше учёных
  });

  // 3. Обёртка «после»: powerOf(st) — военная сила державы; вернули число — это новый результат
  ModAPI.after('powerOf', function (power, st) {
    return st && st.gov === 'theocracy' && st.piety > 0.8 ? power * 1.15 : power;
  }, ID);
})();
```
{% endraw %}

- `civStabTerm(ключ, ru, en, fn)`: `fn(st)` возвращает добавку к цели стабильности, игра держит её в пределах ±0,3. Функция должна быть «чистой»: только читать мир, ничего не писать и не звать `Math.random`.
- `POL_PM_HOOKS` — список функций `(st, m)`. В `m` множители (`tech`, `growth`, `gdp`, `lit`, `war`, `mil`, `cultW`, `relW`; 1 — без изменений) и добавки (`stab`, `happy`; 0 — без изменений). Игра сама зажимает итог в разумные пределы, а упавшая функция не ломает шаг.
- `ModAPI.after('powerOf', …)` — то же самое можно сделать с любой открытой функцией игры, которая что-то считает: `foodCapacity`, `powerOf`, `stateTitle`…

## Вкладка державы и своя команда {#dossier}

Новая вкладка «Досье» на странице державы: земли, средняя температура, высшая точка, доля побережья, столица и казна. Кнопка «Устроить праздник» тратит десятую часть казны и поднимает стабильность — **через команду**, поэтому работает и в сетевой игре.

{% include figure.html src="/assets/modding/dossier-ru-1600.jpg" caption="Вкладка «Досье» из дополнения и запись о празднике в хронике державы." wide=true %}

{% raw %}
```js
// dossier.js — своя вкладка на странице державы и своя команда, меняющая мир (работает и в сетевой игре)
(function () {
  'use strict';
  const E = s => UI.esc(String(s));   // всё из мира (имена держав, городов) — в разметку только через UI.esc
  let host = null;                    // элемент вкладки

  // 1. Команда. Всё, что меняет мир по нажатию кнопки, идёт через netAct/netDo: вне комнаты netDo — обычный вызов,
  //    в комнате команда уходит ведущему и выполняется у всех игроков в один и тот же момент.
  //    Аргументы приходят из сети — проверяйте их
  netAct('dossier_feast', function (uid) {
    if (!Number.isInteger(uid)) return;
    const st = stateByUid(uid); if (!st) return;
    if (!(st.treasury > 0)) return;     // пустая казна — праздника не будет
    st.treasury *= 0.9;                 // праздник стоит десятую часть казны
    st.stability = Math.min(1, st.stability + 0.05);
    logEvent('peace', TF('{0} устраивает всенародный праздник', '{0} holds a festival for all its people', st.name), { s: [st.id], cell: st.capital, imp: 1 });
  });

  // 2. Вкладка страницы державы: build(h) — один раз, разметка; update(st, r, force) — при каждой перерисовке страницы
  statsAddStateTab({
    id: 'dossier', icon: 'book', before: 'chron', dead: false,
    label: function () { return T('Досье', 'Dossier'); },
    build: function (h) {
      host = h;
      h.innerHTML = "<div class='ui-kpis' data-d='kpi'></div><p class='ui-muted' data-d='note' style='margin:10px 0'></p>" +
        "<button class='ui-btn' data-d='feast'></button>";
      h.querySelector('[data-d=feast]').addEventListener('click', function () {
        const uid = +h.dataset.uid; if (uid >= 0) netDo('dossier_feast', uid);
      });
    },
    init: function () {},
    update: function (st) {
      if (!host || !st) return;
      host.dataset.uid = st.uid;
      let n = 0, coast = 0, tSum = 0, hiI = -1, hiV = -1;
      for (const i of st.cells) {   // st.cells — Set номеров клеток державы
        n++; if (W.isCoast[i]) coast++;
        tSum += W.tempSmoothed[i];
        const h = landH(i); if (h > hiV) { hiV = h; hiI = i; }
      }
      const k = (label, val) => "<div class='ui-kpi'><b>" + E(val) + '</b><span>' + E(label) + '</span></div>';
      host.querySelector('[data-d=kpi]').innerHTML =
        k(T('Клеток земли', 'Land cells'), UI.fmt(n)) +
        k(T('Средняя температура', 'Mean temperature'), n ? uTemp(tSum / n) : '—') +
        k(T('Высшая точка', 'Highest point'), hiI >= 0 ? uM(hiV * 5000, 10) : '—') +
        k(T('Побережье', 'Coastline'), n ? Math.round(coast / n * 100) + ' %' : '—');
      const cap = st.capital >= 0 ? (cityName(st.capital) || placeNameAt(st.capital) || '—') : '—';
      host.querySelector('[data-d=note]').textContent = TF('Столица — {0}. Казна: {1}.', 'Capital: {0}. Treasury: {1}.', cap, UI.fmt(Math.round(st.treasury)));
      const b = host.querySelector('[data-d=feast]');
      b.textContent = T('Устроить праздник', 'Hold a festival');
      b.title = T('Десятая часть казны — и стабильность выше', 'A tenth of the treasury for more stability');
    },
  });
})();
```
{% endraw %}

- `statsAddStateTab`: `build(h)` строит разметку один раз, `update(st)` перерисовывает её при обновлении страницы (не чаще раза в секунду). `before` — перед какой вкладкой встать.
- **Кнопка не меняет мир сама.** Она зовёт `netDo('dossier_feast', uid)`. Вне комнаты это просто вызов функции из `netAct`. В комнате команда уходит ведущему и выполняется у всех игроков в один момент — миры не расходятся.
- Обработчик команды проверяет аргументы: в сетевой игре они приходят из сети.
- Числа и единицы — через помощники игры: `uTemp` покажет °F, а `uM` — футы, если игрок так выбрал в настройках.

## Своё окно и кнопка {#window}

Кнопка «топ» на верхней панели рядом с числом войн открывает окно с таблицей держав: сортировка по любому столбцу, щелчок по строке открывает страницу державы.

{% include figure.html src="/assets/modding/top-ru-1600.jpg" caption="Окно «Крупнейшие державы» и кнопка «топ» на верхней панели — всё из дополнения." wide=true %}

{% raw %}
```js
// top.js — своя кнопка на верхней панели и своё окно с таблицей
(function () {
  'use strict';
  let table = null;

  function rows() {
    return states.filter(function (s) { return s.alive; }).map(function (s) {
      return { uid: s.uid, name: s.name, pop: Math.round(s.pop), area: s.area, era: s.era, stab: s.stability };
    });
  }
  function open() {
    // UI.win(id, o): окно создаётся один раз по id; потом его только показывают и перерисовывают
    const w = UI.win('top-nations', { title: T('Крупнейшие державы', 'Largest nations'), width: 640 });
    if (!table) {
      table = UI.table(w.body, {
        sortKey: 'pop', sortDir: -1, limit: 30, rows: [],
        onRow: function (r) { const st = stateByUid(r.uid); if (st) openStateDetail(st); },
        cols: [
          { key: 'name', label: T('Держава', 'Nation') },
          { key: 'pop', label: T('Население', 'Population'), num: 1, fmt: function (v) { return UI.fmt(v); } },
          { key: 'area', label: T('Клеток', 'Cells'), num: 1 },
          { key: 'era', label: T('Эпоха', 'Era'), num: 1, fmt: function (v) { return UI.esc(eraName(v)); } },
          { key: 'stab', label: T('Стабильность', 'Stability'), num: 1, fmt: function (v) { return Math.round(v * 100) + ' %'; } },
        ],
      });
    }
    table.setRows(rows());
    w.show();
  }
  // окно перерисовываем по событию мира, а не каждый кадр
  ModAPI.on('year', function () { const w = UI.win('top-nations'); if (table && w.isOpen()) table.setRows(rows()); });

  // кнопка на верхней панели — рядом с числом войн
  ModAPI.ready(function () {
    const box = document.getElementById('stat-wars-box'); if (!box) return;
    const b = document.createElement('div');
    b.className = 'stat'; b.id = 'stat-top-nations'; b.style.cursor = 'pointer';
    b.title = T('Крупнейшие державы мира', 'The largest nations of the world');
    b.innerHTML = '<span class="v">' + UI.icon('crown', 15) + '<span>' + UI.esc(T('топ', 'top')) + '</span></span>';
    b.addEventListener('click', open);
    box.parentNode.insertBefore(b, box.nextSibling);
  });
})();
```
{% endraw %}

- `UI.win(id, o)` создаёт окно один раз и дальше только показывает его. Окно сразу в стиле игры: шапка, крестик, Esc закрывает.
- `UI.table` — таблица с сортировкой: `num: 1` — числовой столбец, `fmt` — как показать значение, `onRow` — щелчок по строке.
- Окно перерисовывается по событию `year`, а не каждый кадр.
- Кнопка вставляется в `ModAPI.ready`: к этому моменту интерфейс игры уже собран.

## Кольчуга странника: прогулка {#walk}

На прогулке от первого лица клавиша **O** надевает и снимает кольчугу: в ней урон на треть меньше. Своё табло показывает кольчугу и счёт побед, а у поверженных иногда находится «записка с картой».

{% include figure.html src="/assets/modding/walk-ru-1600.jpg" caption="Табло «Кольчуга надета · Побед: 0» слева вверху и сообщение после нажатия O." wide=true %}

{% raw %}
```js
// armor.js — прогулка от первого лица: события (урон, победа, обыск), своё табло и своя клавиша
(function () {
  'use strict';
  let worn = true, wins = 0;

  function hud() {
    wkHudSet('mailarmor', '<b>' + UI.esc(worn ? T('Кольчуга надета', 'Mail on') : T('Без кольчуги', 'No mail')) + '</b><br>' +
      UI.esc(TF('Побед: {0}', 'Victories: {0}', wins)));
  }
  // урон игроку: вернули число — это новый урон
  ModAPI.walkOn('hurt', function (dmg, why) { return worn ? dmg * 0.67 : dmg; });
  // кто-то повержен; by === 'player' — рукой игрока
  ModAPI.walkOn('kill', function (victim, by) { if (by === 'player') { wins++; hud(); } });
  // обыск тела: out.msgs — строки «Найдено: …», out.ammo — патроны по видам, out.wpn — оружие
  ModAPI.walkOn('loot', function (npc, out) { if (Math.random() < 0.5) out.msgs.push(T('записка с картой', 'a note with a map')); });
  // табло обновляется вместе с остальными; уходя с прогулки, прячем его
  ModAPI.walkOn('hud', hud);
  ModAPI.walkOn('exit', function () { wkHudSet('mailarmor', ''); });

  // клавиша O на прогулке. WK_KEYS — общая таблица: не затираем чужой обработчик, а встаём в цепочку
  ModAPI.ready(function () {
    const prev = WK_KEYS.o;
    const f = function (e, k) {
      if (typeof prev === 'function' && prev(e, k) === true) return true;
      worn = !worn; hud();
      wkMsg(worn ? T('Вы надели кольчугу', 'You put on the mail') : T('Вы сняли кольчугу', 'You took off the mail'), worn ? 'good' : '');
      return true;   // клавиша взята
    };
    f.help = T('надеть или снять кольчугу', 'put on or take off the mail');   // строка в справке прогулки
    WK_KEYS.o = f;
  });
})();
```
{% endraw %}

- `hurt` ждёт ответа: вернули число — это новый урон.
- `kill` приходит при любой гибели рядом; `by === 'player'` — от руки игрока.
- `loot` даёт объект `out`: строки в `out.msgs` попадут в сообщение «Найдено: …».
- `wkHudSet(имя, html)` — своё табло; пустая строка его прячет.
- `WK_KEYS` — общая таблица клавиш прогулки. Дополнение не затирает чужой обработчик, а встаёт в цепочку: сначала зовёт прежний, и если тот клавишу не взял — берёт сам. `f.help` — строка в справке клавиш прогулки.
- Буква **O** свободна в раскладке игры по умолчанию. Если игрок переназначил клавиши, `WK_KEYS` получает имя клавиши по её действию — проверьте, что ваша не занята.

## Мир, который меняется сам {#world}

Раз в год загрязнение во всём мире рассеивается быстрее, а руины без огня понемногу зарастают.

{% raw %}
```js
// clean.js — дополнение, которое меняет сам мир: раз в год проходит по всем клеткам
(function () {
  'use strict';
  const KEEP = 0.85;   // какая доля загрязнения остаётся через год

  // 'year' приходит внутри шага мира — писать в W здесь можно, в сетевой игре это случится у всех одинаково.
  // Проход по всем клеткам раз в год дёшев даже на карте 1000×1000; каждый кадр так делать нельзя
  ModAPI.on('year', function () {
    const P = W.pollution, R = W.ruin, F = W.fire, N = GRID.N;
    for (let i = 0; i < N; i++) {
      if (P[i] > 0) P[i] *= KEEP;
      if (R[i] > 0 && F[i] === 0 && !W.isWater[i]) R[i] = Math.max(0, R[i] - 0.02);   // руины без огня понемногу зарастают
    }
  });
})();
```
{% endraw %}

- Писать в массивы `W` можно **внутри шага мира** — в событиях `year`, `civTick` и других событиях мира. Тогда в сетевой игре это происходит у всех одинаково.
- Проход по всем клеткам раз в год дёшев даже на карте 1000×1000. Каждый кадр так делать нельзя.
- Так же меняются и общие значения мира: `W.co2`, `W.solar`, `W.seaLevel`. Например, «океан поглощает CO₂»: `W.co2 += (1 - W.co2) * 0.01` раз в год.

## Тихое небо {#sky}

Метеориты и астероиды падают только по воле игрока. О каждом природном бедствии в столице держава сообщает всплывающим окном с кнопкой «Показать».

{% raw %}
```js
// sky.js — обёртка «перед» (отменить вызов функции игры) и событие бедствия
(function () {
  'use strict';
  const ID = 'quiet-sky';

  // before: fn получает аргументы функции игры; вернула false — функция игры не вызывается.
  // disasterTrigger(type, cell, power, byPlayer): byPlayer — бедствие вызвал игрок своим инструментом
  ModAPI.before('disasterTrigger', function (type, cell, power, byPlayer) {
    if ((type === 'meteor' || type === 'asteroid') && !byPlayer) return false;
  }, ID);

  // Событие 'disaster' (d, type, cell, byPlayer) — бедствие уже ударило. Здесь только показываем:
  // всплывающее сообщение — это интерфейс, а не мир, поэтому netRemote() и язык игрока тут не важны
  ModAPI.on('disaster', function (d, type, cell, byPlayer) {
    if (byPlayer || !(cell >= 0)) return;
    const id = W.stateId[cell], st = id >= 0 ? states[id] : null;
    if (!st || !st.alive || st.capital !== cell) return;
    UI.toast({ title: T('Бедствие у столицы', 'Disaster at a capital'), icon: 'warn', type: 'war',
      text: TF('{0}: беда пришла в столицу', '{0}: disaster has struck the capital', st.name),
      onClick: function () { focusCell(cell); }, action: T('Показать', 'Show') });
  });
})();
```
{% endraw %}

- `ModAPI.before`: вернули `false` — функция игры не вызывается. Инструмент игрока (`byPlayer`) по-прежнему работает.
- `disaster` приходит, когда бедствие уже ударило. Всплывающее окно — интерфейс, а не мир, поэтому его можно показывать прямо отсюда.
- `focusCell(i)` переносит карту к клетке.

## Правка по якорю {#patch}

Раз в век хроника подводит итог: от чего чаще всего умирали правители и их родня. Почти весь `people.js` (люди и династии) спрятан внутри замыкания, и обёрткой до функции смерти не добраться. Поэтому дополнение вставляет в начало этой функции одну строку, а вся логика остаётся в своём скрипте.

`mod.json`:

{% raw %}
```json
{
  "id": "deaths-patch",
  "name": { "ru": "Летопись смертей", "en": "Chronicle of deaths" },
  "author": "Earth Simulator",
  "description": { "ru": "Раз в век хроника подводит итог: от чего умирали правители и их родня. Пример правки по якорю.", "en": "Once a century the chronicle sums up what rulers and their kin died of. An anchor patch example." },
  "version": "1.0",
  "code": {
    "minGame": "2.2.0",
    "scripts": ["deaths.js"],
    "patches": [{
      "file": "people.js",
      "find": "  function _pDie(p, cause, year) {",
      "insertAfter": "\n    if (typeof deathsHook === 'function') deathsHook(p, cause, year);"
    }]
  }
}
```
{% endraw %}

`deaths.js`:

{% raw %}
```js
// deaths.js — people.js зовёт deathsHook в начале _pDie (правка по якорю в mod.json):
// весь people.js спрятан в замыкание, и обёрткой ModAPI до этой функции не добраться
(function () {
  'use strict';
  const ID = 'deaths-patch';
  let byCause = {};   // причина → сколько людей за этот век

  window.deathsHook = function (p, cause, year) {
    if (!p || p.died !== null) return;   // уже мёртв — игра ничего не сделает, не считаем
    const c = cause || 'other';
    byCause[c] = (byCause[c] || 0) + 1;
  };
  ModAPI.on('year', function (y) {
    if (y % 100 !== 0) return;
    const top = Object.keys(byCause).sort(function (a, b) { return byCause[b] - byCause[a]; }).slice(0, 3);
    if (top.length) {
      const name = function (k) { return typeof causeName === 'function' ? causeName(k) : k; };
      logEvent('people', TF('Итог века: чаще всего умирали — {0}', 'The century in sum: most deaths were — {0}',
        top.map(function (k) { return tLower(name(k)) + ' (' + byCause[k] + ')'; }).join(', ')), { imp: 1 });
    }
    byCause = {};
  });
  ModAPI.on('worldgen', function () { byCause = {}; });
  ModAPI.on('reset', function () { byCause = {}; });
  ModAPI.on('save', function (o) { o.ext[ID] = { c: byCause }; });
  ModAPI.on('load', function (o) { const d = o.ext && o.ext[ID]; byCause = d && d.c && typeof d.c === 'object' ? d.c : {}; });
})();
```
{% endraw %}

- Якорь — строка объявления функции: короткая, единственная в файле и не меняется годами.
- Вставка — «мостик»: одна строка, которая зовёт функцию дополнения. `typeof` страхует на случай, если скрипт не исполнился.
- Если обновление игры когда-нибудь изменит эту строку, дополнение не подключится целиком (не наполовину), а в «Мастерской» будет написано почему.

## Что дальше

- Полный список событий, обёрток и реестров — в главе [«Дополнения с кодом»]({{ '/modding/code/' | relative_url }}).
- Код можно сочетать с данными: в одном дополнении могут быть и сценарии, и баланс, и скрипты. Данные описаны в главе [«mod.json вручную»]({{ '/modding/data/' | relative_url }}).
- Публикуется дополнение с кодом так же, как любое другое — из [редактора]({{ '/modding/editor/' | relative_url }}). Напишите в описании, что в нём есть код и что он делает.
