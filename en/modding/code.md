---
layout: guide
lang: en
chapter: code
title: "Code add-ons"
summary: "How to write add-ons that change the game itself: new mechanics, windows, map layers, rules and walk-mode events. How loading works, your first add-on step by step, ModAPI, events, wrappers, anchor patches, multiplayer and debugging."
alt_url: /modding/code/
permalink: /en/modding/code/
---

* Contents
{:toc}

## When you need code

Everything described in the chapters on the [editor]({{ '/en/modding/editor/' | relative_url }}) and [mod.json]({{ '/en/modding/data/' | relative_url }}) is **data**: the game reads it and decides by itself what to do with it. With data you can make a scenario, a world, balance, eras, biomes, models. But a new *mechanic* can't be described with data: «no wars in the first hundred years», «a capital on the coast adds stability», «a window of my own with my own table», «in walk mode the O key puts on chain mail». For that an add-on has **code** — plain JavaScript that the game loads alongside its own files.

Code can:

- **read the whole world** — map cells, nations, cities, wars, the chronicle, people;
- **change the world** inside its step — population, treasury, stability, climate, pollution;
- **subscribe to events** — a new year, nations born and dying, wars, disasters, walk mode;
- **wrap the game's functions** — change their result or cancel the call altogether;
- **add interface** — windows, buttons, map layers, tabs on the nation page, walk-mode HUD panels and keys, chronicle entries;
- **patch the game's files at an anchor**, when there is no other way to reach the right place.

Ready-made examples of all of this are in the chapter [«What code can change»]({{ '/en/modding/recipes/' | relative_url }}): ten small add-ons, each tested in the game.

## How the game loads code

The game loads an add-on's code **by itself on every start**, in memory: the game files on disk are not changed and no installers are needed. Steam updates the game as usual, and the add-on keeps working.

To the player, a code add-on looks like any other: **one checkbox** in the «Workshop» turns the whole thing on — both data and code. There are two differences:

1. After subscribing, a code add-on is **off** until the player ticks the checkbox themselves. Code runs with the game's rights, and a subscription alone must not start someone else's program. When the game finds such an add-on, it tells the player that it can be turned on.
2. Code is loaded **when the game starts**, so an add-on you turn on starts working after a restart: a «Restart» button appears under the list (the world goes to the autosave, as on exit).

{% include figure.html src="/assets/modding/ws-en-1600.jpg" caption="The «Workshop» with the ten example add-ons: each one has a checkbox, and the ones that loaded show no extra lines." wide=true %}

A line appears under the add-on's name only when there is something to say:

| Line | What it means |
|---|---|
| «Will work after a restart» | the checkbox has just been ticked |
| «Will turn off after a restart» | the checkbox was unticked, but the code is still running |
| «Incompatible with this version of the game» | an anchor patch didn't find its place, a required game file is missing, etc. |
| «The add-on has an error» | a syntax error in a script — only the author can fix it |
| «The add-on files are damaged» | a file from the `code` section is missing or lies outside the add-on's folder |
| «Requires a newer version of the game» | `minGame` is newer than the installed game |
| «Turned off: the game failed to start with this add-on» | the safety net kicked in (see below) |

The detailed reason — for the author — is in the tooltip of that line: for example, «the edit point in people.js was not found». The game knows about «Incompatible» and «The add-on has an error» in advance, before the checkbox is even ticked: it parses the code without running it.

**Safety net.** If a start of the game with add-on code did not finish (an error or a hang while loading), those add-ons turn themselves off on the next start, and the player sees a notice. A broken add-on can't «lock up» the game. Fix the error and tick the checkbox again.
{: .note}

## Your first add-on in ten minutes {#first}

Let's make an add-on that writes to the chronicle every 50 years how many people live in the world, and shows a greeting when the world starts.

**1. The folder.** Open the game folder (in your Steam library: right-click the game → «Manage» → «Browse local files») and create a `hello-world` folder inside the `mods` folder:

```
Earth Simulator/
  mods/
    hello-world/
      mod.json
      hello.js
```

**2. `mod.json`** — the add-on's description and a `code` section with the list of scripts:

```json
{
  "id": "hello-world",
  "name": { "ru": "Привет, мир", "en": "Hello, world" },
  "author": "Your name",
  "description": { "ru": "Моё первое дополнение с кодом.", "en": "My first code add-on." },
  "version": "1.0",
  "code": {
    "minGame": "2.2.0",
    "scripts": ["hello.js"]
  }
}
```

**3. `hello.js`** — the code itself:

```js
// hello.js — my first code add-on
(function () {
  'use strict';

  // the world is created and the game has started — show a greeting
  ModAPI.started(function () {
    UI.toast({ title: T('Привет, мир', 'Hello, world'), text: T('Дополнение работает', 'The add-on works'), icon: 'globe' });
  });

  // every new year; y is the year number
  ModAPI.on('year', function (y) {
    if (y % 50 !== 0) return;
    let pop = 0;
    for (const st of states) if (st.alive) pop += st.pop;
    logEvent('people', TF('Год {0}: в мире живёт {1} человек', 'Year {0}: {1} people live in the world', y, UI.fmt(Math.round(pop))));
  });
})();
```

Save the files as UTF-8 (Notepad, VS Code and Notepad++ do that by default).

**4. Turn it on.** Start the game → «Workshop» → tick «Hello, world» → «Restart». After the restart, start a new game: the greeting appears, and every 50 years the chronicle gets a line about the population.

**5. Edit and restart.** You tick the checkbox only once; after that the game re-reads the add-on's files on every start. Changed the script? Press «Restart the game» in the «Workshop».

Why everything is wrapped in `(function () { … })();`: a script runs in a **shared scope** with the game. Top-level `const` and `let` declarations land in it, and two add-ons that use the same name break each other. Expose only what you really need — with your add-on's prefix in the name.
{: .note}

## The `code` section in `mod.json` {#code-section}

```json
"code": {
  "minGame": "2.2.0",
  "scripts": [
    "main.js",
    { "file": "js/walk-extra.js", "after": "walk.js" },
    { "file": "js/early.js", "before": "civ.js" }
  ],
  "patches": [
    { "file": "people.js", "find": "  function _pDie(p, cause, year) {",
      "insertAfter": "\n    if (typeof deathsHook === 'function') deathsHook(p, cause, year);" }
  ]
}
```

| Field | What it means |
|---|---|
| `minGame` | optional: the game version the code needs; on an older one the player sees «Requires a newer version of the game» |
| `scripts` | your scripts, in order |
| `patches` | anchor patches to the game's files (see [below](#patches)) |

**Scripts.** With just a file name, the script runs **after all of the game's files**, before the world has been created. That is right almost always. `{ "file": …, "after": "walk.js" }` or `{ "file": …, "before": "civ.js" }` puts the script right after or before the given game file — for when your code has to run before the rest of the game.

- The path is inside the add-on's folder; subfolders are fine.
- The place is the name of a game file (`civ.js`, `walk.js`, `ui.js`…). Nothing can go before `keys.js`.
- If scripts of several add-ons take the same place, their order among themselves is not defined.
- Every script is checked for syntax in advance. On an error the add-on's code is not loaded, and the «Workshop» says in which file and line.
- If a script throws an exception while running, the add-on's following scripts are not run; the game carries on.

An add-on can have only a `code` section — or code together with scenarios, worlds, balance. The data of such an add-on works only while its code works.

## What code can see {#globals}

A script sees all of the game's global names. The main ones:

### Map cells — `W` and `GRID`

The map is a grid of `GRID.W × GRID.H` cells (`GRID.N` cells in all). A cell's number is `i = y * GRID.W + x`; helpers: `idx(x, y)`, `inB(x, y)`, the latitude of a row `latOf(y)`. Everything that lives in a cell is a typed array in the `W` object, one value per cell:

| Array | What it holds |
|---|---|
| `W.elev`, `W.isWater`, `W.isCoast`, `W.slope` | elevation (0…1, sea level is `W.seaLevel`), water, coast, steepness; `landH(i)` — height above the sea 0…1 (1 = 5000 m) |
| `W.temp`, `W.tempSmoothed`, `W.precip` | temperature in °C (right now and without seasons), precipitation in mm per year |
| `W.biome`, `W.veg`, `W.fertility`, `W.eco` | biome, vegetation, fertility, health of nature |
| `W.pop`, `W.urban`, `W.stateId` | the cell's population, urban population, nation number (−1 — nobody's) |
| `W.culture`, `W.religion`, `W.res` | culture, faith, resource deposit |
| `W.pollution`, `W.industry`, `W.fire`, `W.ruin`, `W.fallout` | pollution, industry, fire, destruction, radiation |
| `W.herb`, `W.pred`, `W.fish` | wildlife: herbivores, predators, fish (0…1) |
| `W.distOcean`, `W.landmass` | distance to the sea in cells, number of the continent or island |

And the world-wide values: `W.simYear` (the year, fractional), `W.co2`, `W.solar`, `W.seaLevel`, `W.pace` (the pace of history), `W.paused`.

### Nations — `states`

`states` is the array of nations. Dead ones stay in it with `alive: false`, and their slot (`id`) is later taken by a new nation. That's why **you remember a nation for the long term by its `uid`** — a running number that never repeats: `stateByUid(uid)` returns the living nation or `null`.

| Field | What it holds |
|---|---|
| `id`, `uid`, `alive`, `name`, `color` | slot in the array, running number, whether it's alive, name, colour `[r, g, b]` |
| `capital`, `cells`, `area` | the capital's cell, a `Set` of cells, how many there are |
| `pop`, `tech`, `era`, `gov`, `ideo` | population, science, era (`eraName(era)`), form of government, ideology |
| `stability`, `treasury`, `gdp`, `military` | stability 0…1, treasury, GDP, army |
| `atWar`, `relations`, `overlord`, `bloc` | whether it's at war, relations (`Map` id → number), overlord, bloc |
| `culture`, `religion`, `piety`, `ruler`, `dynasty` | culture, faith, piety, ruler and dynasty |
| `born`, `cityCount`, `largestCity` | founding year, number of cities, the largest city |

### Everything else

- **Wars:** `wars` (ongoing), `warLog` (all of them); `warBetween(a, b)`, `powerOf(st)` — military strength.
- **Chronicle:** `worldEvents` (newest first), `logEvent(kind, text, data)` — a new entry.
- **Cities:** `cityName(i)`, `cityInfo(i)`; place names — `placeNameAt(i)`.
- **People:** `personById(id)`, `rulerOf(st)`, `personName(p)`.
- **Balance numbers:** the tables `CIV`, `CLIM`, `ECO`, `FAU`, `DIS`, `WALK`… — the same ones the `balance` section edits.
- **Interface:** `UI.win`, `UI.table`, `UI.toast`, `UI.icon`, `UI.esc`, `UI.fmt`; `focusCell(i)` — show a cell on the map; `openStateDetail(st, tab)` — the nation page.

Names that start with `_` are internal: they can change from version to version, so don't rely on them. The game promises not to remove anything else (see [Compatibility](#compat)).
{: .note}

### Text and languages

The game is in 17 languages. Write any text the player sees through `T('по-русски', 'in English')`, and with substitutions — `TF('Год {0}', 'Year {0}', y)`. In the other languages the player sees the English version. Don't glue a sentence together from pieces (`T('Держава ') + name`): other languages order words differently — use a template with `{0}`.

Names from the world (of nations, cities, people) go into markup **only through `UI.esc()`**: a player can name a nation anything at all.

## ModAPI {#modapi}

`ModAPI` is the stable part of the game for authors: it doesn't change from update to update. Whatever can be done through it, do through it.

| Call | What it does |
|---|---|
| `ModAPI.on(event, fn)` | subscribe to a world event |
| `ModAPI.walkOn(event, fn)` | subscribe to a walk-mode event |
| `ModAPI.wrap(name, fn, id)` | a wrapper around a game function: `fn(orig, ...args)` |
| `ModAPI.before(name, fn, id)` | `fn(...args)` before the game function; if it returns `false`, the game function is not called |
| `ModAPI.after(name, fn, id)` | `fn(result, ...args)` after it; if it returns anything other than `undefined`, that is the new result |
| `ModAPI.ready(fn)` | all of the game's files are loaded, there is no world yet |
| `ModAPI.started(fn)` | the world is created, the game has started |
| `ModAPI.version` | the game version, for example `"2.2.0"` |
| `ModAPI.report()` | code add-ons and their state |

### What runs when

1. Scripts with a place (`after`, `before`) — at their place in the loading order.
2. Scripts without a place — right after the last game file.
3. `ModAPI.ready` — all of the game's files are loaded; there is no world yet.
4. The world is created or loaded — the `worldgen` or `load` events.
5. `ModAPI.started` — the world is created, the game has started.

A new game from the menu, loading a save and starting a scenario reload the page, and the scripts run again. But the world can also change without a reload (a new world from the button, «Reset»), so reset your own state on the `worldgen` and `reset` events, and read it from the save on `load`.

## World events {#events}

`ModAPI.on(name, fn)` — `fn` receives the arguments from the table. An error in a subscriber is written to the console once and doesn't stop the world.

| Event | Arguments | When |
|---|---|---|
| `worldgen` | `type` | a world has been created from scratch |
| `reset` | — | «Reset»: people are erased, terrain and climate remain |
| `year` | `y` | a new year has begun |
| `civTick` | — | a civilization step has finished (≈ 15 days) |
| `stateNew` | `st, parent, how` | a nation is born; `how`: `tribe`, `player`, `secede`, `revolt`, `colony` |
| `stateDead` | `st, cause, by` | a nation has disappeared; `cause`: `conquered`, `collapse`, `depop`, `merged` |
| `eraChange` | `st, from, to` | a nation has moved into another era |
| `govChange` | `st, from, to, how` | the form of government has changed; `how`: `reform`, `revolution`, `coup`, `silent` |
| `war`, `peace` | `w` | a war has started / ended (the war object) |
| `event` | `e` | an entry has reached the chronicle: `{ year, type, text, d }` |
| `save`, `load` | `o` | the world is being saved / has been loaded (see [below](#save)) |
| `contact` | `a, b, how, cell` | two nations have met for the first time |
| `seaDiscovery` | `st, cell, first` | the first colony on another land |
| `stateCollapse` | `st, lost` | an empire has lost provinces |
| `rules` | `key, value, prev` | a world rule has changed |
| `ideoChange` | `st, from, to, how` | the ideology has changed |
| `warCell` | `w, cell, side, defUid` | a cell has changed hands in a war |
| `civilWar` | `w, st, rebels` | a civil war |
| `treaty` | `tr, w` | a treaty has been signed |
| `blocNew`, `blocEnd` | `b` / `b, why` | a bloc has been formed / has broken up |
| `councilNew` | `council` | the World Council has been founded |
| `rightsChange` | `st, kind, from, to` | minority rights have changed |
| `worldWar` | `w` | a war has become a world war |
| `rivalry` | `a, b` | two nations have become rivals |
| `nuketest` | `st, cell, kt` | a nuclear test |
| `disasterPre`, `disaster` | `type, cell, power, byPlayer` / `d, type, cell, byPlayer` | a disaster is about to strike / has struck |
| `godPower` | `name, cell, r, s` | a benevolent power has been used |
| `ruin` | `cell, how, why` | a cell has turned into ruins or stopped being ruins |
| `landmark` | `L, what` | a landmark has been founded, built, damaged… |
| `company` | `c, what, …` | a company has been founded, closed, nationalised… |
| `ancStart`, `ancCiv`, `ancWave` | `n` / `st, key, wave` / `wave, made, skipped` | historical start: it has begun / an ancient nation has appeared / a wave of new peoples |
| `faunaSpecies` | `sp` | an animal species has been added (by an add-on) |

**Don't change the world from an `event` handler.** The chronicle drops a repeated entry by its text, and the text is in the player's language: in multiplayer the same entry can reach the chronicle on one computer and not on another. Subscribe to the event itself (`war`, `ruin`, `disaster`…). Reading the world and showing something from `event` is fine.
{: .note .warn}

## Wrapping the game's functions {#wrap}

A wrapper takes the place of a game function and decides whether to call the original and what to return. Three forms:

```js
// before: return false — the game function is not called
ModAPI.before('disasterTrigger', function (type, cell, power, byPlayer) {
  if (type === 'meteor' && !byPlayer) return false;   // meteorites only by the player's will
}, 'my-mod');

// after: return anything other than undefined — that is the new result
ModAPI.after('powerOf', function (power, st) {
  return st.gov === 'theocracy' ? power * 1.25 : power;   // theocracies are a quarter stronger
}, 'my-mod');

// wrap: full control; orig is the game function (or another add-on's wrapper)
ModAPI.wrap('declareWar', function (orig, att, def, cause, force) {
  if (!force && W.simYear < 100) return null;   // the AI doesn't fight in the first hundred years
  return orig(att, def, cause, force);
}, 'my-mod');
```

Rules:

- You can wrap only a **global function declared with `function`** at the top level of a game file. Names declared with `const` and `let`, and functions inside closures (for example, almost all of `people.js`), can't be reached this way — use [anchor patches](#patches) for them.
- Wrap once the function exists: in a script without a place or in `ModAPI.ready`. If there is no such function, the call returns `false` and says so in the console.
- Several add-ons can wrap the same function: the wrappers form a chain.
- **A wrapper that throws is switched off**: the error goes to the console, and the game function works without it. The third argument is your add-on's id: it shows whose wrapper failed.
- `orig()` with no arguments passes on the original arguments, `orig(a, b)` passes yours.
- When `before` cancels a call, the function returns `undefined`. If the caller needs a specific answer (for example, `null` — «it didn't work»), use `wrap`.
- A wrapper adds work to every call: don't wrap functions that are called thousands of times per step.
- **Don't wrap `climateStep`, `ecologyStep`, `civTick`, `computeCurrents` and `simEmit`.** Since 2.2 a world step on big maps is split into parts to keep frames smooth; a wrapper around these functions switches the splitting off, and big maps start to stutter. Subscribe to an event (`civTick`, `year`) or make an anchor patch inside the function.

If the game saved a reference to a function beforehand (subscribed it to an event, put it in a table), that call goes past the wrapper.
{: .note}

## Your own data in the save {#save}

```js
let level = 0;
ModAPI.on('save', function (o) { o.ext['my-mod'] = { level: level }; });
ModAPI.on('load', function (o) {
  const d = o.ext && o.ext['my-mod'];   // no section — an old save or one made without the add-on
  level = d ? d.level : 0;
});
ModAPI.on('worldgen', function () { level = 0; });
```

- The key in `o.ext` is your add-on's id; the other keys belong to the game.
- Store only what survives JSON: numbers, strings, arrays, plain objects. Convert `Map`, `Set` and typed arrays to arrays.
- The section may be missing — then start from a clean slate.
- In multiplayer the save *is* the snapshot of the world a new player receives: everything you put in `save` reaches everyone who joins the room.

## Walk-mode events {#walk}

`ModAPI.walkOn(name, fn)` — first-person walk mode.

| Event | Arguments | When |
|---|---|---|
| `init` | — | the walk scene is ready, the player isn't there yet |
| `enter` | `cell, opts` | the player has entered walk mode |
| `arrive` | `cell, how` | the player has appeared in a cell: `enter`, `teleport`, `respawn` |
| `cell` | `cell, prev` | the player has moved to another world cell |
| `exit` | `cell` | the player is leaving walk mode |
| `dispose` | — | the scene is being taken down: remove your objects |
| `clear` | `all` | every living thing around is being removed |
| `update` | `dt` | every frame; `dt` is in seconds |
| `sync` | — | once a second |
| `hud` | — | HUD panels are being refreshed (`wkHudSet`) |
| `kill` | `victim, by` | a resident, an animal or a vehicle is down; `by === 'player'` — by the player |
| `fire` | `key, weapon` | the player has struck or fired |
| `loot` | `npc, out` | searching a body: add your own to `out.msgs`, `out.ammo`, `out.wpn` |
| `cast` | `pl, add, rng, cast` | a cell is being populated: `add(kind, x, z, yaw, o)` adds your own resident |
| `vehWreck` | `v, by` | a vehicle is wrecked |
| `blast` | `x, y, z, R, dmg, by` | an explosion |

These events wait for an answer (return nothing, and the game acts as usual):

| Event | Arguments | What to return |
|---|---|---|
| `crime` | `level, x, z, victim, info` | `true` — you take care of the wanted level yourself |
| `hurt` | `dmg, why` | a number — the new damage to the player (armour) |
| `death` | `why` | `true` — you decide what happens next |
| `canTeleport` | — | `false` or a reason string — teleporting isn't allowed |
| `battle` | `b, cell, d` | `true` — you play out the nearby battle yourself |
| `junction` | `v, cell, legs` | one of `legs` — where the vehicle goes |

Walk-mode HUD panels: `wkHudSet('name', html)` (an empty string hides it); a message at the bottom of the screen — `wkMsg(text, 'good')`. Keys are the `WK_KEYS` table (key name → `fn(e, k)`, return `true` — the key is taken); don't overwrite someone else's handler, join the chain instead, as in the [example]({{ '/en/modding/recipes/' | relative_url }}#walk).

## The game's registries {#registries}

Many parts of the game accept additions from other files — and from add-ons. This is more reliable than wrappers: the game itself calls your code at the right moment.

| Registry | What it adds | Example |
|---|---|---|
| `registerLayer(name, def)` | a map layer (2D and 3D) with a button, a legend and a tooltip | [«To the sea»]({{ '/en/modding/recipes/' | relative_url }}#layer) |
| `chronKind(kind, def)` | a kind of chronicle entry: icon, category, notification title | [«Jubilees»]({{ '/en/modding/recipes/' | relative_url }}#chronicle) |
| `civStabTerm(key, ru, en, fn)` | a term in nations' stability | [«Harbours»]({{ '/en/modding/recipes/' | relative_url }}#politics) |
| `POL_PM_HOOKS` | political multipliers: science, growth, GDP, war… | [«Theocracies»]({{ '/en/modding/recipes/' | relative_url }}#politics) |
| `statsAddStateTab(def)` | a tab on the nation page | [«Dossier»]({{ '/en/modding/recipes/' | relative_url }}#dossier) |
| `netAct(name, fn)` + `netDo` | a player action that changes the world (in multiplayer too) | [«Festival»]({{ '/en/modding/recipes/' | relative_url }}#dossier) |
| `UI.win`, `UI.table` | windows and tables in the game's style | [«Largest nations»]({{ '/en/modding/recipes/' | relative_url }}#window) |
| `WK_KEYS`, `wkHudSet` | walk-mode keys and HUD panels | [«Wanderer's mail»]({{ '/en/modding/recipes/' | relative_url }}#walk) |
| `invGives(key, fn)` | «What it gives» lines of an invention on the «Science» tab | — |
| `disasterTypeAdd(kind, def)` | a new kind of disaster | — |
| `planetRowAdd(tab, el)` | a row in the «Planet» window (`clim`, `hist`, `rules`) | — |

## Anchor patches {#patches}

When neither an event nor a wrapper can reach the place (code inside a closure, the middle of a long function), a patch looks in a game file for an **anchor** — a piece of code that occurs in that file exactly once — and changes the text next to it.

| Field | What it does |
|---|---|
| `file` | the game file: `people.js`, `civ.js`… |
| `find` | the anchor — an exact piece of text from that file |
| `replace` | replace the anchor with this text |
| `insertBefore` / `insertAfter` | insert text before / after the anchor |
| `insertBeforeFile` / `insertAfterFile` | insert the contents of a file from the add-on's folder |

An example: all of `people.js` (rulers, dynasties) is hidden in a closure. The patch inserts one line at the start of `_pDie` — the death of any person — that calls the add-on's function:

```json
"patches": [{
  "file": "people.js",
  "find": "  function _pDie(p, cause, year) {",
  "insertAfter": "\n    if (typeof deathsHook === 'function') deathsHook(p, cause, year);"
}]
```

The `typeof` in the patch is a safety net: if the add-on's script didn't run, the game works as if there were no patch. The full example is in the [recipes]({{ '/en/modding/recipes/' | relative_url }}#patch).

Rules:

- **The anchor occurs in the file exactly once.** Not found, or found twice — the add-on's code is not loaded.
- **All or nothing.** If even one patch fails to apply, all of the add-on's patches are rolled back, its scripts don't run, and the «Workshop» says why.
- The patched file is parsed in advance; if it no longer parses, the add-on is not loaded.
- The text is inserted as is: add line breaks yourself (`\n`). CRLF or LF line endings don't matter.
- You can't patch `three.min.js`, `i18n.js`, `demomode.js` and `modboot.js` — they load before the patches.

**How to choose an anchor.** Try ModAPI first — it doesn't depend on the text of the code. If there's no way without a patch: one distinctive line (a function declaration, a special comment), with no balance numbers and no player-facing text. **The patch is a bridge, the logic lives in your script**: insert one line that calls your function. Check that the anchor is unique by searching the game file in the game folder.
{: .note}

If the anchor line has only been re-indented or wrapped onto another line, the game still finds it: it also searches for the anchor ignoring spaces and line breaks, as long as there is only one such piece in the file.

## Multiplayer {#net}

In a room every player computes the whole simulation on their own computer, and only commands travel over the network. So everyone in the room must have the same add-ons — the game compares their contents and won't let a player with a different set into the room. To keep the worlds from drifting apart:

- World events (`ModAPI.on`) and wrappers of simulation functions run **inside the step** on every computer. `Math.random` there gives everyone the same numbers — use it as usual.
- **Don't change the world from a timer, a button or a key**: that would happen on one computer only. Register an action with `netAct` and call `netDo` — in a room it runs for everyone at the same moment, outside a room it is an ordinary call:

```js
netAct('mymod_quake', function (cell) {
  // the arguments come from the network — check them
  if (Number.isInteger(cell) && cell >= 0 && cell < GRID.N) disasterTrigger('quake', cell, 1, true);
});
// in the button handler:
netDo('mymod_quake', cell);
```

- Data stored through `save`/`load` reaches a newcomer together with the world. Data that lives only in a variable doesn't: the newcomer starts without it, and the worlds drift apart.
- Walk-mode actions that change the world (pick something up, give a reward) are registered with `netFree(name, fn, check)` and called with `netDoFree(name, …)`. The host first calls `check(from, args)`: `1` — accept, `0` — refuse, `-1` — wait. Without `check` the action is not accepted.
- Sounds, pop-up messages and windows are interface, not world: you can show them anywhere. `netRemote()` is true while someone else's command is running (for example, so you don't play a sound for another player).

If the worlds do drift apart, the game sends the guest the host's world again and shows a notice naming the code add-ons that are turned on. Testing an add-on is easy: two copies of the game in a local network room, a few minutes of play.
{: .note}

## Speed

The game has to run on integrated graphics too, so:

- Don't go over all the cells **every frame**. Once a year or once per civilization step (`year`, `civTick`) is fine: that's cheap even on a 1000×1000 map.
- Redraw windows on world events or no more than once a second.
- Don't create objects in hot spots (the walk-mode `update` event, wrappers of frequently called functions).
- The **F3** panel shows the frame time and the world step time — compare with and without your add-on.

## Debugging {#debug}

- Why an add-on didn't load is shown in the line under its name in the «Workshop», and in detail in that line's tooltip.
- Console messages (`console.log`, errors in your scripts, ModAPI warnings) are visible if you start the game from the command line with the `--enable-logging=stderr` switch:

```
EarthSimulator.exe --enable-logging=stderr 2> log.txt
```

  In the log an add-on script is named `mods/…/name.js`, and a game file changed by a patch is `people.js?modpatched`.
- While you're writing, the easiest thing is to print debug output right into the game: `UI.toast({ text: '…' })` or a chronicle entry.
- If you crashed the start, the next start goes without your code and the add-on is turned off: fix the error and tick the checkbox again.
- The built-in editor saves the `code` section as is, but doesn't show it yet: it will list the script files among the files «the add-on does not refer to» — there's no need to delete them.
- Say in the add-on's description that it contains code and what that code does: the player decides whether to trust you. The code must not touch anything on the computer except the game.

## Compatibility with updates {#compat}

The goal is that you don't have to redo your add-on for every version of the game.

- **The game's names don't disappear.** Everything declared at the top level of the game files that doesn't start with `_`, table fields (`UI.win`, `CIV.ERA_TECH`…), events and `ModAPI` don't disappear from 2.1.3 on: if an update needs to rename something, the old name stays next to it and leads to the new one.
- **A check before every build of the game.** The build itself compares the public names with every released version and checks every code add-on it has ever seen. If an update would break something that used to work, the build stops.
- **An anchor survives edits around it.** If an update has to change the anchor line of a known add-on itself, an «old anchor → new anchor» alias is added to the game.

So whatever can be done through `ModAPI`, events and public names, do it through them. Anchor patches are the fallback. If a patch does stop applying, players see «Incompatible with this version of the game», and the game runs without the add-on.

## Old code packages

Add-ons made before 2.1.3 for installers load without changes: the game recognises `patches.json` with anchor patches and packages that carry their own copy of `index.html`. Patches **by line number** can't be carried over to another version of the game — a line number shifts with any edit higher up in the file; the player will see «Incompatible», and the author needs to switch to a `code` section with anchors. If a player ever ran an old installer, they should verify the game files in Steam («Properties» → «Installed Files» → «Verify integrity of game files»).
