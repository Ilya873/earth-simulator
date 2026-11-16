---
layout: guide
lang: en
chapter: recipes
title: "What code can change"
summary: "Ten ready-made code add-ons — from a «hundred years without war» rule to your own map layer, window, nation tab and chain mail in walk mode. Each one is tested in the game; download the code and use it as a base for your own."
alt_url: /modding/recipes/
permalink: /en/modding/recipes/
---

* Contents
{:toc}

## How to use the recipes

Each recipe is a **separate working add-on**: a folder with a `mod.json` and one script. All ten were tested in version 2.2.0 of the game — loaded as real add-ons through the «Workshop», all together, in one world over 400 years, in Russian and in English. The screenshots below were taken there too.

**[Download all ten examples (zip)]({{ '/assets/modding/earthsim-code-examples.zip' | relative_url }})** — unpack the folders into `mods` next to the game, tick them in the «Workshop» and restart the game.
{: .note}

If you haven't made a code add-on before, start with the chapter [«Code add-ons»]({{ '/en/modding/code/' | relative_url }}): it explains how the game loads code, what `ModAPI` is and why the code is wrapped in `(function () { … })();`.

| Recipe | What it shows |
|---|---|
| [The Long Peace](#peace) | a `wrap` wrapper around a game function, the `year` event, a chronicle entry, data in the save |
| [Your own map layer](#layer) | `registerLayer`: a button, a legend, a line in the cursor tooltip, 2D and 3D |
| [Your own chronicle entries](#chronicle) | `chronKind`: your own kind of entry, an icon, an on-screen notification |
| [Stability, politics, strength](#politics) | `civStabTerm`, `POL_PM_HOOKS`, an `after` wrapper |
| [A nation tab and your own command](#dossier) | `statsAddStateTab`, a button, `netAct`/`netDo` — changes the world in multiplayer too |
| [Your own window and button](#window) | `UI.win`, `UI.table`, a button on the top bar, `ModAPI.ready` |
| [Wanderer's mail: walk mode](#walk) | the walk-mode events `hurt`, `kill`, `loot`, a `wkHudSet` HUD panel, a `WK_KEYS` key |
| [A world that changes by itself](#world) | writing to the `W` arrays inside a world step |
| [Quiet sky](#sky) | a `before` wrapper (cancelling a call), the `disaster` event, a pop-up message |
| [Anchor patch](#patch) | `patches`: inserting into code that a wrapper can't reach |

## The Long Peace {#peace}

For the first hundred years of a world the AI declares no wars; in year 100 the chronicle tells how many wars never started. A war the player declares still goes through.

`mod.json` — it has the same shape in every recipe, only the names and the script name change:

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

- `ModAPI.wrap` takes the place of `declareWar`. Returning `null` is the same as the game's own answer «there will be no war»: the calling code understands it.
- `force` means the player declares the war with their own tool. The game's world rules also bind only the AI, never the player's will.
- The counter lives in the save (`save`/`load`) and is reset in a new world (`worldgen`, `reset`). That way it survives a restart and, in multiplayer, reaches a newcomer.

**Try it:** instead of a time limit — «while the world has fewer than five nations»: `states.filter(s => s.alive).length < 5`.

## Your own map layer {#layer}

A new button in the «Nature» row of layers: how far each piece of land is from the sea. The layer is drawn in both 2D and 3D, it has a legend, and the cursor tooltip gets a line of its own.

{% include figure.html src="/assets/modding/layer-en-1600.jpg" caption="The «To the sea» layer from the add-on: coasts are light blue, the depths of the continents dark red." wide=true %}

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

- `cell(i, out)` is called for every cell when the map redraws the layer; it must be fast and must not change anything in the world.
- `out[3] = 0` — the cell is transparent: the sea shows as usual.
- `smooth`, `veil`, `borders` — smoothing between cells, muting the biomes, nation borders on top.
- `W.distOcean` is a ready-made field of the game: the distance to the sea in cells. Any array from the [`W` table]({{ '/en/modding/code/' | relative_url }}#globals) will do for a layer of your own: temperature, precipitation, pollution, culture.

## Your own chronicle entries {#chronicle}

Every hundred years after its founding a nation celebrates a jubilee. The entries have a kind of their own: a crown icon, the green colour of a «good» event, the «Nations» filter. Jubilees from three hundred years up come with an on-screen notification.

{% include figure.html src="/assets/modding/jubilee-en-1600.jpg" caption="The chronicle searched for «celebrates»: jubilee entries with their own crown icon." wide=true %}

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

- `chronKind` is called once at load time. The kind's name is lowercase Latin letters.
- `logEvent(kind, text, data)`: `s` — the numbers of the entry's nations (the «Show» button works by them), `cell` — the place on the map, `imp: 2` — a notification.
- The text is written in the player's language at the moment of the entry — through `TF`, with the name substituted, not glued on.
- You can change the chronicle and the world from `year`: this event arrives inside the world step. From the `event` event you can't (see [world events]({{ '/en/modding/code/' | relative_url }}#events)).

## Stability, politics, strength {#politics}

Three ways to change the life of nations without touching the game's code:

1. **A stability term.** A capital on the coast adds stability. The new line appears in the stability breakdown by itself.
2. **Political multipliers.** Theocracies grow faster but learn more slowly.
3. **An `after` wrapper.** The armies of very pious theocracies are 15 % stronger.

{% include figure.html src="/assets/modding/stab-en-1600.jpg" caption="The stability tooltip on the nation page: the «Harbour capital» line is added by the add-on." wide=true %}

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

- `civStabTerm(key, ru, en, fn)`: `fn(st)` returns an addition to the stability target; the game keeps it within ±0.3. The function must be «pure»: only read the world, write nothing and not call `Math.random`.
- `POL_PM_HOOKS` is a list of `(st, m)` functions. `m` holds multipliers (`tech`, `growth`, `gdp`, `lit`, `war`, `mil`, `cultW`, `relW`; 1 — no change) and additions (`stab`, `happy`; 0 — no change). The game clamps the result to sensible limits itself, and a function that throws doesn't break the step.
- `ModAPI.after('powerOf', …)` — you can do the same with any public game function that computes something: `foodCapacity`, `powerOf`, `stateTitle`…

## A nation tab and your own command {#dossier}

A new «Dossier» tab on the nation page: lands, mean temperature, highest point, share of coastline, capital and treasury. The «Hold a festival» button spends a tenth of the treasury and raises stability — **through a command**, so it works in multiplayer too.

{% include figure.html src="/assets/modding/dossier-en-1600.jpg" caption="The «Dossier» tab from the add-on and the festival entry in the nation's chronicle." wide=true %}

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

- `statsAddStateTab`: `build(h)` builds the markup once, `update(st)` redraws it when the page refreshes (no more than once a second). `before` — which tab to stand in front of.
- **The button doesn't change the world by itself.** It calls `netDo('dossier_feast', uid)`. Outside a room this is simply a call of the function from `netAct`. In a room the command goes to the host and runs for all players at the same moment — the worlds don't drift apart.
- The command handler checks its arguments: in multiplayer they come from the network.
- Numbers and units go through the game's helpers: `uTemp` shows °F, and `uM` feet, if the player chose that in the settings.

## Your own window and button {#window}

A «top» button on the top bar next to the number of wars opens a window with a table of nations: sorting by any column, a click on a row opens the nation page.

{% include figure.html src="/assets/modding/top-en-1600.jpg" caption="The «Largest nations» window and the «top» button on the top bar — all from the add-on." wide=true %}

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

- `UI.win(id, o)` creates the window once and after that only shows it. The window is in the game's style from the start: a title bar, a close cross, Esc closes it.
- `UI.table` is a table with sorting: `num: 1` — a numeric column, `fmt` — how to show the value, `onRow` — a click on a row.
- The window redraws on the `year` event, not every frame.
- The button is inserted in `ModAPI.ready`: by then the game's interface is already built.

## Wanderer's mail: walk mode {#walk}

In first-person walk mode the **O** key puts chain mail on and takes it off: in it you take a third less damage. A HUD panel of its own shows the mail and your number of victories, and the fallen sometimes carry «a note with a map».

{% include figure.html src="/assets/modding/walk-en-1600.jpg" caption="The «Mail on · Victories: 0» panel at the top left and the message after pressing O." wide=true %}

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

- `hurt` waits for an answer: return a number, and that is the new damage.
- `kill` arrives on any death nearby; `by === 'player'` — at the player's hand.
- `loot` gives an `out` object: strings in `out.msgs` go into the «Found: …» message.
- `wkHudSet(name, html)` — your own HUD panel; an empty string hides it.
- `WK_KEYS` is the shared table of walk-mode keys. The add-on doesn't overwrite someone else's handler but joins the chain: it calls the previous one first, and if that one didn't take the key, takes it itself. `f.help` is the line in the walk-mode key help.
- The letter **O** is free in the game's default layout. If the player has rebound keys, `WK_KEYS` gets the key's name by its action — check that yours isn't taken.

## A world that changes by itself {#world}

Once a year pollution all over the world disperses faster, and ruins without fire slowly grow over.

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

- You can write to the `W` arrays **inside a world step** — in the `year`, `civTick` and other world events. Then in multiplayer it happens the same way for everyone.
- A pass over all the cells once a year is cheap even on a 1000×1000 map. Doing it every frame is not allowed.
- The world-wide values change the same way: `W.co2`, `W.solar`, `W.seaLevel`. For example, «the ocean absorbs CO₂»: `W.co2 += (1 - W.co2) * 0.01` once a year.

## Quiet sky {#sky}

Meteorites and asteroids fall only by the player's will. A nation reports every natural disaster in its capital with a pop-up that has a «Show» button.

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

- `ModAPI.before`: return `false`, and the game function isn't called. The player's tool (`byPlayer`) still works.
- `disaster` arrives once the disaster has already struck. A pop-up is interface, not world, so it can be shown right from here.
- `focusCell(i)` moves the map to the cell.

## Anchor patch {#patch}

Once a century the chronicle sums up what rulers and their kin died of most often. Almost all of `people.js` (people and dynasties) is hidden inside a closure, and a wrapper can't reach the death function. So the add-on inserts one line at the start of that function, and all the logic stays in its own script.

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

- The anchor is the function's declaration line: short, unique in the file and unchanged for years.
- The insertion is a «bridge»: one line that calls the add-on's function. `typeof` is a safety net in case the script didn't run.
- If an update of the game ever changes this line, the add-on won't load at all (rather than half-load), and the «Workshop» will say why.

## What next

- The full list of events, wrappers and registries is in the chapter [«Code add-ons»]({{ '/en/modding/code/' | relative_url }}).
- Code can be combined with data: one add-on can have scenarios, balance and scripts. Data is described in the chapter [«mod.json by hand»]({{ '/en/modding/data/' | relative_url }}).
- A code add-on is published the same way as any other — from the [editor]({{ '/en/modding/editor/' | relative_url }}). Say in the description that it contains code and what that code does.
