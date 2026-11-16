---
layout: guide
lang: en
chapter: data
title: "mod.json by hand"
summary: "The complete add-on format: every section of mod.json, every field, its range and what the game does with it — scenarios, goals, worlds, events, names, flags, wildlife, balance, eras, biomes, models, vehicles, textures, sounds and music."
alt_url: /modding/data/
permalink: /en/modding/data/
---

* Contents
{:toc}

Almost everything on this page can be built with the mouse in the [add-on editor]({{ '/en/modding/editor/' | relative_url }}) — the editor writes exactly the `mod.json` described here. This page is for authors who want to write or edit the file themselves: for rare fields, bulk edits, or simply to know exactly what the game does with each line.

New to add-ons? Start with [getting started]({{ '/en/modding/' | relative_url }}). Add-ons that change the game's code (the `code` section) are covered in their own chapter: [code add-ons]({{ '/en/modding/code/' | relative_url }}).

## How an add-on is built

### The folder

An add-on is a folder with a `mod.json` file inside. Your own add-ons live in the `mods` folder next to the game. To find it: Steam → right-click Earth Simulator → **Manage** → **Browse local files**. The game also has a **«Mods folder»** button in the Workshop section of the main menu.

```
Earth Simulator/
  mods/
    example-pack/      a working sample, switched off by default
    my-pack/           your add-on
      mod.json
      preview.png
      worlds/          ready-made worlds and their thumbnails
      tex/             images
      snd/             sounds
      music/           music tracks
      models/          .obj models
```

The sub-folders are only a habit — any layout works, as long as every file is **inside** the add-on folder.

The sample `example-pack` uses most sections described below: two scenarios (one on a ready-made world), scheduled events, custom names, an animal, balance changes, an extra era and custom biomes. It is listed but not applied until you tick it in **Main menu → «Workshop»** and press **«Restart the game»**.

### Start by hand in four steps

1. Copy the `example-pack` folder and rename the copy, for example to `my-pack`.
2. Open `mod.json` in any text editor (Notepad, Notepad++, VS Code) and set `"id"` to the same name as the folder: `"id": "my-pack"`.
3. Remove the line `"disabledByDefault": true`, or your add-on will also start switched off.
4. Save the file as **UTF-8** and start the game. The add-on appears in **«Workshop»**; its **«Edit»** button opens it in the editor.

If you edit `mod.json` while the game is running, press **«Refresh»** in the Workshop section or restart the game.

### A minimal mod.json

```json
{
  "id": "my-pack",
  "name": { "ru": "Мой набор", "en": "My pack" },
  "author": "Your name",
  "description": { "ru": "Короткое описание", "en": "A short description for the Workshop" },
  "version": "1.0",
  "eraLadder": 3,
  "names": ["Vulcania", "Ashgrad", "Obsidia"]
}
```

| Field | Meaning |
|---|---|
| `id` | the add-on's internal name. Use latin letters, digits and dashes, and keep it the same as the folder name (the editor always saves an add-on to `mods/<id>/`). Up to 40 characters. The game remembers completed scenarios by it, so do not change it after publishing |
| `name` | the name players see (up to 60 characters) |
| `author` | your name (up to 40 characters) |
| `description` | a description (up to 240 characters; `desc` works too) |
| `version` | any short text, for example `"1.0"` (up to 16 characters) |
| `eraLadder` | which era numbering the add-on uses. Write `3` (the editor of version 2.2 writes it for you). See [Era numbers in old add-ons](#era-numbers-in-old-add-ons) |
| `disabledByDefault` | `true` — the add-on is listed but not applied until the player ticks it. Useful for an optional variant |

After these fields come any of the optional sections, in any order: `scenarios`, `worlds`, `events`, `names`, `nameParts`, `cityNames`, `personNames`, `flags`, `flagShare`, `govNames`, `species`, `balance`, `eras`, `vis`, `biomes`, `models`, `buildings`, `vehicles`, `roads`, `textures`, `sounds`, `music` — and `code` for [code add-ons]({{ '/en/modding/code/' | relative_url }}).

A `preview.png` next to `mod.json` becomes the picture on the Workshop page.

Two add-ons by different authors may have the same `id` — both load; the game quietly makes the second one's internal id unique.
{: .note}

### Text in two languages

**Any text a player reads** — the add-on name and description, scenario names and descriptions, goal texts, defeat texts, chronicle entries — can be one string or a pair:

```json
{ "name": { "ru": "Вулканическая зима", "en": "Volcanic Winter" } }
```

The player sees the half in their language. If one half is missing, the other is used. Players of the other 15 languages of the game see the English half.

The game removes markup from every string: the characters `< > & \` and the backtick are deleted, straight quotes become typographic ones, line breaks become spaces, and every string is cut to the length its field allows.

### File paths

Every file is given as a path **relative to the add-on folder**: `"tex/grass.png"`, `"worlds/ash.json"`. Backslashes are accepted and turned into forward slashes. A path that contains `..`, starts with a drive letter, `/` or `~`, or leads outside the folder through a link is refused — the game never reads files from outside the add-on.

### What happens with mistakes

The game **never crashes** because of bad add-on data. A wrong value is skipped or corrected, a note is written, and the rest of the add-on loads. To see the notes:

- open the add-on in the editor — the **«Validation»** panel lists everything the game skips or corrects, with the path to the field (for example `scenarios[1].goals[2].metric: unknown metric`), and a click leads to it;
- or start the game with `--enable-logging=stderr` and read the lines that begin with `[mods]`.

Only one thing makes the whole file unreadable: a JSON syntax error (a missing comma or quote). Then the add-on shows an error in the Workshop list.

## Scenarios

A scenario is a starting world, starting conditions and a list of goals. Players find the scenarios of enabled add-ons in **Main menu → «Scenarios»**, next to the built-in ones. An add-on can have up to **12** scenarios.

### A complete scenario

```json
{
  "id": "my-pack",
  "name": "My pack",
  "eraLadder": 3,
  "scenarios": [{
    "id": "volcano",
    "name": { "ru": "Вулканическая зима", "en": "Volcanic Winter" },
    "desc": { "ru": "Супервулкан затянул небо пеплом.", "en": "A supervolcano has veiled the sky in ash. Lead people through the cold." },
    "boot": { "type": "continents", "w": 100, "h": 70, "solar": 0.94, "co2": 1.6, "disasterRate": 2, "seedPop": 40 },
    "lock": ["solar", "gtemp", "co2"],
    "lockTools": ["nuke", "rocket"],
    "enforce": { "solar": 0.94 },
    "states": [
      { "name": "Caria", "x": 0.3, "y": 0.5, "tech": 4, "color": "#c0503a", "gov": "monarchy" },
      { "name": "Lydia", "x": 0.7, "y": 0.45, "era": 1, "color": "#3a7fc0", "gov": "republic", "pop": 30000 }
    ],
    "ties": [{ "a": 0, "b": 1, "k": "rel", "v": -0.4 }],
    "goals": [
      { "text": "Survive for 200 years", "metric": "year", "target": 200 },
      { "text": "Population 1.5 million", "metric": "pop", "target": 1500000 },
      { "text": "Three nations of the Classical era", "metric": "statesAtEra", "param": 2, "target": 3 },
      { "text": "Keep ecology above 25%", "metric": "eco", "target": 0.25, "keep": true }
    ],
    "loseIfPopBelow": 2000,
    "loseAfterYear": 80,
    "lose": [{ "metric": "avgT", "below": -8, "text": "The ice sheet has buried the habitable land." }],
    "events": [{ "year": 60, "do": "disaster", "type": "volcano", "at": "random", "power": 0.8 }]
  }]
}
```

| Field | Meaning |
|---|---|
| `id` | the scenario's internal name, latin letters and digits, up to 32 characters, unique inside the add-on. The game remembers completed scenarios by it — do not change it after publishing |
| `name` | the name (up to 60 characters) |
| `desc` | the description on the scenario card (up to 300 characters; `description` works too) |
| `icon` | one or two characters shown on the card, usually an emoji. Without it — a puzzle piece |
| `boot` | the starting world and conditions — see below |
| `lock`, `lockTools`, `enforce` | what the player cannot touch — see [Locks](#locks) |
| `states`, `ties`, `statesMet`, `allowPol` | nations present from the first second — see [Starting nations](#starting-nations) |
| `goals` | up to 6 goals — see [Goals](#goals) |
| `loseIf…`, `lose` | defeat conditions — see [Defeat](#defeat) |
| `events` | events of this scenario only — see [Scenario events](#scenario-events) |

A scenario with no valid goals is skipped: a scenario that cannot be won is not registered.
{: .note .warn}

### The starting world

These `boot` fields describe the map:

| Field | Values | Meaning |
|---|---|---|
| `type` | `continents`, `earth`, `pangea`, `islands`, `empty`, `flat` | the land layout. `earth` is the real map of Earth, `empty` is all ocean (the player raises the land). An unknown value becomes `continents` |
| `w`, `h` | 24 … 400 | map size in cells (80 × 60 when not given) |
| `solar` | 0.7 … 1.4 | the Sun's output, 1 is ours |
| `co2` | 0.2 … 6 | greenhouse effect, 1 is normal (280 ppm) |
| `seaLevel` | 0.2 … 0.7 | sea level |
| `eqShift` | −30 … 30 | equator shift, degrees to the north |
| `world` | a file path | start on a **ready-made world** of this add-on (see [Ready-made worlds](#ready-made-worlds)). Map size, year, nations and the whole history come from the file; `type`, `w` and `h` are ignored. If the file cannot be read, the scenario is skipped |

### Starting conditions

The same options as in an ordinary **«New Game»**, also inside `boot`:

| Field | Values | Meaning |
|---|---|---|
| `pace` | 0.2 … 4 | pace of history: science, growth, wars. 1 is normal. The player cannot change it during a scenario |
| `disasterRate` | 0, 1, 2 | natural disasters: off, normal, frequent (the name `disasters` works too) |
| `dynSea` | `true` / `false` | «living» sea level: the sea rises and falls with the climate |
| `startYear` | −20000 … 20000 | the year the chronicle starts from |
| `seedPop` | 0 … 2000 | how many habitable cells get their first people right at the start, so the player does not have to seed them |
| `hist` | `true` / `false` | historical start on Real Earth (use with `"type": "earth"`): the cradles of ancient civilisations in 3000 BC and later waves of new peoples. Turned off when `world` is given |
| `rules` | object | world rules, see below |
| `pins` | object | `{ "co2": 1, "sea": 1 }` — the game holds CO₂ and/or the sea level where they are |

World rules (`rules`) bind the computer-run nations, not the player:

| Key | Values | Meaning |
|---|---|---|
| `noWar` | 0, 1 | nations do not start wars |
| `noRevolt` | 0, 1 | no uprisings |
| `noAlliance` | 0, 1 | no alliances |
| `lockBiomes` | 0, 1 | biomes do not change |
| `collapse` | 0, 1, 2 | collapse of nations: as in history, rarely, never |
| `startEra` | 0 … 31 | the era new nations start in (0 — tribes) |
| `maxStates` | 0 … 200 | no more than this many nations (0 — no limit; 1 counts as 2) |
| `era` | 0 … 33 | 0 — no limit; 1 — every nation stays in its era; 2 + e — no nation goes past era e |
| `eraCap` | era number | a simpler way to write `era`: the ceiling era |
| `eraLock` | 1 | a simpler way to write `"era": 1` |

```json
{ "boot": { "type": "earth", "hist": true, "rules": { "noWar": 1, "eraCap": 4 }, "pins": { "co2": 1 } } }
```

### Starting nations

Up to **32** nations that are on the map from the first second. In the editor this is **Gameplay → «Nations»**: the scenario's map, a land brush, the capital and the nation card. By hand:

| Field | Meaning |
|---|---|
| `x`, `y` | **required.** The capital as fractions of the map width and height, 0 … 1 (0, 0 is the top-left corner). A point at sea or outside the nation's land moves to the nearest cell of its land (with no land — to the nearest habitable ground) |
| `name` | the name (a string or a `{ru, en}` pair, up to 30 characters). Without it — from the name generator |
| `capName` | the capital's name |
| `color` | map colour, `#rrggbb` |
| `area` | painted land, see below. Without it the nation gets the cells around its capital |
| `flag` | a pixel flag, see below |
| `gov` | form of government, see the list below. Held for 20 years, like one chosen by the player |
| `ideo` | ideology: `feudal`, `capital`, `liberal`, `socialist`, `communist`, `fascist`, `democrat`, `centrist`; `""` — none. Held for 20 years |
| `era` | era number (0 … 11); science is raised to that era's threshold. This knowledge is «before history»: it does not count as first discoveries |
| `tech` | starting science, 0 … 1000 (the stock era thresholds are 2, 5, 7, 9, 11, 13.5, 17) |
| `pop` | people, 1,000 … 20,000,000 (20,000 by default): densest at the capital, the rest of the land at least lightly inhabited |
| `stab` | stability, 0 … 1 |
| `treasury` | treasury, 0 … 1,000,000,000 |
| `gdpPc` | wealth per person, 50 … 200,000 |
| `traits` | permanent traits for the nation's whole life: `mil` (military might) 0.5 … 1.5, `gdp` (economy) 0.85 … 1.2, `stab` (order) −0.1 … 0.12, `tech` (science) 0.85 … 1.2 |
| `culture`, `religion` | names of the people and the faith. The same name on several nations of the scenario means one people, one faith |

**Forms of government** (`gov`): `tribe`, `chiefdom`, `monarchy`, `empire`, `republic`, `theocracy`, `democracy`, `dictatorship`, `technocracy`, `federation`, and since 2.2 `duchy`, `emirate`, `sultanate`, `khanate`, `caliphate`, `constmon` (constitutional monarchy), `merchrep` (merchant republic), `junta` (military junta), `workers` (workers' republic).

**Painted land** (`area`) is a mask `{ "w": …, "h": …, "rle": "…" }`. `w` and `h` are 24 … 400 cells. `rle` lists run lengths over the mask, row by row from the top, separated by dots: «no, yes, no, yes…» — it always starts with a «no» run (write `0` first if the top-left cell belongs to the nation). The runs must add up to exactly `w × h`, and the string may be up to 65,536 characters. A mask of another size than the map is stretched to it. This 24 × 24 mask is a 4 × 4 square in the middle:

```json
{ "area": { "w": 24, "h": 24, "rle": "250.4.20.4.20.4.20.4.250" } }
```

**A pixel flag** (`flag`) is `{ "w": …, "h": …, "p": [colours], "px": "…" }`: 4 … 64 cells a side, a palette `p` of 1 … 32 colours `#rrggbb`, and `px` — base64 of one byte per cell (row by row from the top), each byte the number of a colour in the palette. This 4 × 4 flag has a dark top half and an orange bottom half:

```json
{ "flag": { "w": 4, "h": 4, "p": ["#2b2b2e", "#f08a1c"], "px": "AAAAAAAAAAABAQEBAQEBAQ==" } }
```

Writing `px` by hand is tedious — draw flags in the editor (**Gameplay → «Nations»**), it writes the field for you.
{: .note}

**Ties between nations** go into a `ties` list next to `states` (up to 200):

| Field | Meaning |
|---|---|
| `a`, `b` | numbers of two nations in `states`, counting **from zero** |
| `k` | `ally` — alliance; `vassal` — `a` is the vassal of `b`; `war` — `a` declares war on `b`; `rel` — relations only |
| `v` | relations from −1 to 1 (required for `rel`) |

Contradictions are dropped with a note: an alliance and a war between one pair, a second overlord, a vassal cycle.

Two more scenario fields:

- `"statesMet": false` — the scenario's nations do not know each other at the start (with two or more nations they do by default);
- `"allowPol": true` — the player may change these nations' government, course and diplomacy (locked otherwise).

A world rule «no more than N nations» beats the scenario: nations over the limit are not founded.

### Locks

**`lock`** — sliders of the **«Planet»** window the player cannot move:

| Key | Slider |
|---|---|
| `co2` | greenhouse effect |
| `solar` | the Sun |
| `sea` | sea level |
| `gtemp` | global temperature |
| `tilt` | axial tilt |
| `dis` | disaster rate |
| `dynsea` | living sea |
| `pace` | pace of history (always locked in scenarios anyway) |

Without locks many goals are reached with one drag of a slider.

**`lockTools`** — tools the player cannot use (up to 48 names). Locked buttons are dimmed and cannot be picked. **Inspect** cannot be locked.

| Tool group | Tool names |
|---|---|
| «Land» | `terrain`, `elevation`, `smooth`, `flatten`, `water`, `resource`, `eraser`, `river` |
| «Climate» | `temp`, `precip`, `wind`, `current`, `rain`, `drought`, `pin` |
| «Life» | `population`, `city`, `fauna`, `bless`, `plague`, `zombie` |
| «Elements» | `volcano`, `quake`, `meteor`, `tsunami`, `hurricane`, `fire`, `flood`, `blizzard`, `asteroid`, `supervolcano`, `rift`, `rocket`, `nuke` |
| «Power» | `border`, `rebel`, `ally`, `inspire`, `peace`, `discord` |
| Not on the tool panel | `walk` — the first-person walk; `polctl` — every action on a nation's page (government, course, diplomacy); `landmark` — founding landmarks from the city window |

An unknown tool name is kept with a note, in case a newer game version adds such a tool.

**`enforce`** — values the game holds every tick, a guard against workarounds:

| Key | Values | What is held |
|---|---|---|
| `solar` | 0.7 … 1.4 | the Sun stays at this value |
| `co2` | 0.2 … 6 | the greenhouse effect never drops below this value |
| `disasters` | 0, 1, 2 | the disaster rate |

### Goals

Up to **6** goals. Each goal is a metric, a threshold and, for three metrics, a parameter:

```json
{ "text": "Three cities of a million", "metric": "megacities", "param": 1000000, "target": 3 }
```

| Field | Meaning |
|---|---|
| `text` | what the player reads (up to 120 characters). Without it — «Goal N» |
| `metric` | what is measured — see the tables below. An unknown metric skips the goal |
| `target` | the threshold |
| `param` | only for `statesAtEra` (an era number), `statesWithGov` (a form of government, **required**) and `megacities` (a population) |
| `below` | `true` — the goal is to stay **at or below** the threshold (for example CO₂) |
| `keep` | `true` — the goal must be **held** until the end. Without it a goal once reached stays reached, even if the value falls later |

Years in goals count **from the start of the scenario**: on a ready-made world in year 170, or with `startYear`, the goal «survive 200 years» still starts from zero.

**People and nations**

| `metric` | What it measures | Units |
|---|---|---|
| `pop` | world population | people |
| `year` | years since the scenario began | years |
| `states` | nations alive at the same time | count |
| `topPop` | population of the largest nation | people |
| `areaShare` | the part of all land the largest nation holds | 0 … 1 |
| `statesAtEra` | nations at era N or later; `param` is the era number (without it, or 0 — era 1) | count |
| `statesWithGov` | nations with a given form of government; `param` is the form, as in `gov` above | count |
| `vassals` | nations that have accepted an overlord | count |

**Progress**

| `metric` | What it measures | Units |
|---|---|---|
| `era` | era of the most advanced nation (0 is tribal) | era number |
| `techMax` | science of the most advanced nation (stock era thresholds 2, 5, 7, 9, 11, 13.5, 17) | number |
| `inventions` | discoveries made in the world (fire, writing, gunpowder…) | count |
| `gdp` | world GDP, the sum over all nations | game units |
| `gdpPc` | world GDP divided by world population | per person |
| `literacy` | literacy of the largest nation | 0 … 1 |
| `happiness` | happiness of the largest nation | 0 … 1 |
| `lifeExp` | life expectancy in the largest nation | years |
| `stability` | stability of the largest nation | 0 … 1 |

**Cities**

| `metric` | What it measures | Units |
|---|---|---|
| `cities` | cities on the map | count |
| `cityMax` | population of the largest city | people |
| `megacities` | cities of at least N people; `param` is N (without it — a million) | count |
| `urban` | urban share of the world's people | 0 … 1 |

**War and society**

| `metric` | What it measures | Units |
|---|---|---|
| `wars` | wars in progress | count |
| `warsTotal` | wars in all of history, finished and ongoing | count |
| `cultures` | peoples that have formed | count |
| `religions` | living religions | count |
| `dynasties` | dynasties | count |

**Planet**

| `metric` | What it measures | Units |
|---|---|---|
| `eco` | world ecology: average health of land ecosystems, 1 is untouched nature | 0 … 1 |
| `green` | green share of land: forests, grasslands, savannas | 0 … 1 |
| `ice` | share of the planet under ice | 0 … 1 |
| `avgT` | average land temperature | °C |
| `co2ppm` | CO₂ in the air; 280 is the pre-industrial level | ppm |
| `land` | land cells — useful when the player raises land | cells |
| `speciesAlive` | animal species alive | count |
| `speciesExtinct` | species gone extinct | count |
| `disasters` | disasters in progress | count |

**New in 2.2**

| `metric` | What it measures | Units |
|---|---|---|
| `companies` | living companies of all nations | count |
| `landmarks` | landmarks completed and still standing | count |
| `cradles` | cradles of antiquity still alive (only in the historical start on Real Earth) | count |
| `blocs` | military and economic blocs and unions not yet dissolved | count |
| `nukesUsed` | nuclear strikes by nations in all of history (the player's strikes do not count) | count |

The same 40 metrics are used by defeat conditions and by event conditions. The editor shows each metric's value **in the world open right now**, so you can see whether a threshold is realistic.

### Defeat

Simple conditions — leave a field out to switch it off:

| Field | The scenario is lost when |
|---|---|
| `loseIfPopBelow` | population drops below this number (only after people have appeared on the map) |
| `loseIfEcoBelow` | ecology drops below this value, 0 … 1 |
| `loseIfStatesBelow` | there are fewer than N nations — but only after there have been at least N |
| `loseIfTempAbove`, `loseIfTempBelow` | the average land temperature crosses the threshold, °C (−90 … 90) |
| `loseIfExtinctAbove` | more than N species have gone extinct |
| `loseAfterYear` | no defeat before this year of the scenario. **60 by default**: at first there are no people on the map, and without a grace period the scenario would be lost at once |

And custom conditions — any metric above or below a threshold, up to **6**:

```json
{
  "lose": [
    { "metric": "co2ppm", "above": 900, "text": "A greenhouse catastrophe." },
    { "metric": "year", "above": 400, "text": "Time is up." }
  ]
}
```

| Field | Meaning |
|---|---|
| `metric`, `param` | as in goals |
| `above` / `below` | the threshold (one of them is required) |
| `text` | what the player sees (up to 160 characters) |
| `after` | this condition's own grace period in years (otherwise `loseAfterYear`) |

### Scenario events

A scenario can carry its own `events` list. It works exactly like the [scheduled events](#scheduled-events) of the whole add-on, with two differences: it runs only in this scenario, and its years count from the scenario's start.

### Making a scenario interesting

- **Add a time goal.** Without one, a scenario is often over in half a minute. At ×20 speed one real second is about two years: a «300 years» goal takes about two and a half minutes.
- **Avoid goals that complete themselves.** «Five nations» is reached in twenty years — there are usually about thirty on the map. Fast-forward a world by the right number of years and see where the threshold lands.
- **Be careful with ecology as a goal to hold.** Over three centuries of industry ecology falls to about 20% by itself. In a long scenario make ecology a defeat condition (10–15%) instead.
- **A ready-made world plus a time limit** works well: the player starts with a living history, and a `lose` condition on `year` stops it from dragging on forever.
- **Lock what makes a goal trivial.** A temperature goal without `"lock": ["gtemp", "solar", "co2"]` is one slider move.

## Ready-made worlds

A world is a whole saved game: terrain, climate, nations, cities, the chronicle and all of history. An add-on can carry up to **8** worlds. Players see them in **Main menu → «Load»**, under **«Add-on worlds»**, and can start a game in any of them; a scenario starts on one with `"boot": { "world": "…" }`.

```json
{
  "worlds": [{
    "id": "ash-isles",
    "name": { "ru": "Пепельные острова", "en": "The Ash Isles" },
    "desc": "A 60×40 archipelago in year 170: eleven nations.",
    "file": "worlds/ash-isles.json",
    "thumb": "worlds/ash-isles.png"
  }]
}
```

| Field | Meaning |
|---|---|
| `id` | internal name: latin letters, digits, `_` and `-`, up to 32 characters |
| `name` | name (up to 60 characters) |
| `desc` | description (up to 240 characters) |
| `file` | the world file — a game save written by **Main menu → «Save» → «To file»** (a `.json` file; you may gzip it). Up to 64 MB, maps from 24 × 24 to 400 × 400 |
| `thumb` | optional thumbnail: png, jpg or webp up to 1 MB |

The easiest way: make a world in the game (generate it, shape it with brushes, populate it, run its history), open your add-on in the editor and press **Gameplay → «Worlds» → «Add the current world»**. The editor writes the file and a thumbnail into the add-on folder.

A world used only as a scenario's `boot.world` is not listed among the ready-made worlds. List it under `worlds` too if players should also be able to start a free game in it.
{: .note}

A world from someone else's file is never loaded as it is. The game builds a **new, clean save** from it and copies only what passes the checks: world fields of the right size, numbers within their ranges, nations, cities and a chronicle with cleaned strings. A scenario that was running when the world was saved does not belong to the world and is not carried over.

## A world from an image

This is an editor tool, not a `mod.json` field: **Gameplay → «Worlds» → «A world from an image»**. A heightmap (PNG or JPG) becomes a new world: light is mountains, dark is sea, transparent is sea too. The game works out the climate, rivers and biomes by itself.

- **«Grid size»** — from 24 × 24 to 400 × 400 cells; it can be fitted to the image's proportions.
- **«Sea level in the image»** — which brightness counts as the coast.
- **«Smoothing»** — removes single-pixel needles that would become one-cell islands and pillar mountains.
- **«Land mask»** (optional) — a second image: white is land, black is sea. With a mask, the mask draws the coastline and the heightmap only gives the relief.

**«Create a world from the image»** restarts the game in the new world. Refine it with brushes, populate it, and add it to the add-on with **«Add the current world»** — from then on it is an ordinary ready-made world.

## Scheduled events

The top-level `events` list holds events that run **in any game** while the add-on is enabled. The same list inside a scenario runs only in that scenario. Up to **32** events per list.

```json
{
  "events": [
    { "year": 150, "every": 250, "chance": 0.6, "do": "disaster", "type": "volcano", "at": "random", "power": 0.6,
      "text": { "ru": "Проснулся вулкан", "en": "A volcano has awakened" } },
    { "when": { "metric": "avgT", "below": 4 }, "every": 100, "do": "message", "kind": "disaster",
      "text": "A cold spell: the average land temperature is below 4 °C" },
    { "year": 300, "do": "climate", "solar": -0.03, "co2": 0.5, "text": "The sky has dimmed" },
    { "when": { "metric": "warsTotal", "above": 10 }, "do": "power", "type": "peace", "at": "capital" }
  ]
}
```

### When an event happens

| Field | Meaning |
|---|---|
| `year` | the year of the event: the world's year for top-level events, the year from the scenario's start for scenario events |
| `when` | a condition: `{ "metric": …, "param": …, "above": …, "below": … }` — a metric as in goals, above and/or below a threshold (both must hold if both are given) |
| `every` | repeat every so many years. With `when` — fire at most that often |
| `chance` | probability, 0 … 1 (1 by default) |
| `once` | `true` — fire only once. This is the default for an event without `every`; a `when` event with `"once": false` fires again each time its condition becomes true |

An event needs `year`, `when` or both. Together they mean «this condition, but not before this year». A condition fires when it **becomes** true; it can fire again only after it has been false in between. An event whose year had already passed before the world was loaded counts as done, and what has fired is remembered in the save, so a one-off event does not repeat after loading.

### What an event does

| `do` | Fields | Action |
|---|---|---|
| `disaster` | `type`, `at`, `power` 0.1 … 1 (0.6 by default) | a natural disaster. `type`: `volcano`, `quake`, `tsunami`, `hurricane`, `fire`, `meteor`, `plague`, `drought`, `flood`, `blizzard` |
| `power` | `type`, `at`, `radius` 0.6 … 12 (3 by default), `power` 0.2 … 2 (1 by default) | a maker's power. `type`: `rain`, `bless` (blessing of the land), `inspire` (inspiration), `peace`, `discord` |
| `climate` | `solar`, `co2`, `seaLevel`, `absolute` | a climate shift. Without `absolute` these are changes: Sun ±0.7, CO₂ ±5.8, sea level ±0.5. With `"absolute": true` — new values (0.7 … 1.4, 0.2 … 6, 0.2 … 0.7). At least one of the three is required |
| `message` | `text` (required) | only a chronicle entry |

**Where** (`at`):

| `at` | Place |
|---|---|
| `random` | a random place (the default): land, preferably inhabited; the sea for hurricanes and tsunamis |
| `capital` | the capital of the largest nation |
| `city` | the largest city |
| `land` | a random land cell |
| `ocean` | a random sea cell |
| `[x, y]` | a point, as fractions of the map width and height, 0 … 1 |

**The chronicle entry**:

| Field | Meaning |
|---|---|
| `text` | the entry's text, up to 200 characters. Without it a disaster or power still happens, just with no entry of its own |
| `kind` | the entry's look: `dawn` (the default), `found`, `collapse`, `era`, `war`, `peace`, `alliance`, `secede`, `colony`, `famine`, `exodus`, `ruler`, `dynasty`, `revolt`, `reform`, `union`, `vassal`, `invention`, `wonder`, `religion`, `culture`, `disaster` (the default for disasters), `plague`, `extinct`, `domestic`, `golden`, `capital`, `player`, `fauna` |
| `imp` | prominence, 0 … 3: 0 — quiet, chronicle only; 1 — the default for disasters, powers and climate shifts; 2 — with an on-screen notice (the default for messages); 3 — an event of the age |

## Names, flags and government names

### Names of nations, cities and people

```json
{
  "names": ["Vulcania", "Ashgrad", "Obsidia"],
  "nameParts": { "a": ["Ash", "Magm"], "b": ["stadt", "polis"] },
  "cityNames": ["Crater", "Grey Haven"],
  "personNames": { "male": ["Ignat"], "female": ["Ember"], "dynasty": ["Ashborn"] }
}
```

| Field | Meaning |
|---|---|
| `names` | ready nation names. The game hands them out first; when they run out it builds new ones from `nameParts` |
| `nameParts` | `a` — beginnings, `b` — endings of generated nation names |
| `cityNames` | city names: new cities often take one of them, the rest come from the generator |
| `personNames` | names of rulers and their kin (`male`, `female`) and of ruling houses (`dynasty`) |

Up to 400 names per list, each up to 30 characters; up to 200 parts per list, each up to 20 characters.

### Flags

```json
{
  "flags": [
    { "id": "ash", "flag": { "w": 4, "h": 4, "p": ["#2b2b2e", "#f08a1c"], "px": "AAAAAAAAAAABAQEBAQEBAQ==" } },
    { "id": "volcano", "names": ["Vulcan", "Вулкан"], "flag": { "w": 4, "h": 4, "p": ["#7a1f12", "#f0c040"], "px": "AAAAAAAAAAABAQEBAQEBAQ==" } },
    { "id": "arc", "cultures": ["arcad", "аркад"], "flag": { "w": 4, "h": 4, "p": ["#1c4a7a", "#ffffff"], "px": "AAAAAAAAAAABAQEBAQEBAQ==" } }
  ],
  "flagShare": 0.5
}
```

Flags for the nations the game creates by itself: tribes, breakaway provinces, colonies. Up to 200 flags.

| Field | Meaning |
|---|---|
| `id` | the flag's internal name (latin letters, digits, `_`, `-`) |
| `flag` | the picture, in the same form as a [starting nation's flag](#starting-nations) |
| `names` | up to 16 name parts: the flag goes to nations whose name contains one of them |
| `cultures` | up to 16 parts of a people's name: the flag goes to nations of a people whose name contains one of them (for example a people named in your scenario) |

Flags with neither `names` nor `cultures` form a common set, taken by the share `flagShare` (0 … 1, 1 by default) of all other nations. The pick depends only on the nation and its name, so a nation always shows the same flag. A flag drawn by the player always wins.

Give name parts in both languages: in an English game nation names are written in Latin letters. In the editor: **Rules → «Names» → «Flags»** — draw in the game's pixel editor or import an image.
{: .note}

### Names of forms of government

```json
{
  "govNames": {
    "monarchy": {
      "ru": "Огненное царство", "en": "Fire Kingdom", "de": "Feuerreich",
      "state": { "ru": "Царство", "en": "Tsardom" },
      "lead": { "ru": "Царь-кузнец", "en": "Smith King" }
    }
  }
}
```

The key is a form of government (see the list under [Starting nations](#starting-nations)).

| Field | Meaning |
|---|---|
| `ru`, `en`, other language codes (`de`, `fr`, `zh-CN`…) | the form's name, up to 30 characters each |
| `state` | the word in a nation's name, when it differs from the form's name (a constitutional monarchy is «Kingdom of X») |
| `lead` | the leader's title |

A plain string instead of an object sets the same name in every language. The new name shows everywhere: in nations' names, windows, the chronicle, newspapers and residents' talk. A language without its own name takes the English one. Rulers' titles in family trees stay the game's own. Only the fields you give change, so one add-on can rename the form and another the leader's title.

## Custom wildlife

```json
{
  "species": [{
    "key": "ashfox", "ru": "Пепельная лисица", "en": "Ash fox",
    "guild": "pred", "model": "wolf",
    "temp": [-15, 18], "precip": [150, 1200],
    "size": 0.6, "herd": [1, 3], "speed": 1.2, "danger": 0.1
  }]
}
```

| Field | Meaning |
|---|---|
| `key` | internal name: latin letters, digits, `_`, up to 24 characters. Must not match a built-in species |
| `ru`, `en` | the name (up to 40 characters) |
| `guild` | **required**: `herb` (herbivore), `pred` (predator), `fish` (sea life), `bird` |
| `model` | the look, one of the built-in shapes: `deer`, `boar`, `bison`, `horse`, `camel`, `elephant`, `mammoth`, `rabbit`, `goat`, `wolf`, `bear`, `lion`, `tiger`, `penguin`, `seal`, `whale`, `fish`, `shark`, `bird`, `eagle`. Without it: deer, wolf, fish or bird by guild |
| `temp` | the temperature range it lives in, °C, `[from, to]` within −90 … 90 |
| `precip` | the precipitation range, mm a year, within 0 … 6000. The game picks the species' biomes from the climate |
| `size`, `speed` | 0.1 … 10 (1 by default) |
| `herd` | herd size `[from, to]`, 1 … 500 |
| `danger` | 0 … 1 (0.5 for predators, 0 for others by default) |
| `domestic` | `true` — a herbivore people can tame |
| `biomes` | optional: weights 0 … 1 per biome instead of the climate-based choice, for example `{ "tundra": 1, "borealForest": 0.5 }` |
| `sea` | optional, for sea life: three weights 0 … 1 — deep water, shelf, reef |
| `dens`, `r`, `vuln` | optional fine tuning: population density (0.001 … 100,000), growth rate (0.01 … 2), vulnerability to hunting (0.05 … 20) |

Biome keys: `deepOcean`, `oceanShelf`, `coral`, `mangrove`, `marsh`, `iceSheet`, `tundra`, `borealForest` (taiga), `coldDesert`, `temperateGrassland`, `temperateDeciduous`, `temperateRainforest`, `mediterranean`, `subtropicalDesert`, `savanna`, `tropSeasonalForest`, `tropRainforest`, `alpine`, `barrenRock`, `scorched`, plus the keys of custom biomes.

Up to **16** species. A new species does not appear by itself in a world that is already running — release it with the **«Animals»** brush; a new world gets it at creation.

## Balance

`balance` changes the numbers the simulation runs on: growth, wars, climate, disasters and much more. It is grouped by sections, and each section holds «parameter: value» pairs:

```json
{
  "balance": {
    "civ":       { "R_BASE": 0.05, "WAR_P": 0.02, "AT_MISSILE": 6 },
    "climate":   { "T_equator": 33, "co2Sens": 6 },
    "ecology":   { "GROW": 0.03 },
    "currents":  { "windGain": 1.2 },
    "society":   { "REVOLT": 0.08 },
    "disasters": { "P_VOLCANO": 0.03 },
    "people":    { "MAX_PEOPLE": 30000 }
  }
}
```

In this example: population growth is faster (`R_BASE`, stock 0.042), wars are rarer (`WAR_P`, stock 0.05), missiles come one era later (`AT_MISSILE`, stock 5), the equator is hotter (`T_equator`, stock 30), CO₂ warms more strongly (`co2Sens` — degrees per doubling, stock 3.6), and so on.

### Sections

| Section | What it covers |
|---|---|
| `civ` | people, economy, nations, wars, era thresholds `AT_*`, contact between nations (`CONTACT_*`) |
| `climate` | climate, also sea ice and nuclear winter |
| `ecology` | ecology and biomes |
| `currents` | ocean currents |
| `society` | cultures, faiths, government |
| `disasters` | natural disasters, also craters (`CR_*`) |
| `fauna` | wildlife |
| `people` | rulers and dynasties |
| `walk` | the first-person walk |
| `stats` | statistics and history records |
| `sound`, `music` | sound volumes and the built-in music (silence between tracks, crossfades) |
| `trade` | goods, cargo lots, trade routes |
| `corp` | companies, shares, manufacturer models (2.2) |
| `history` | the historical start on Real Earth (2.2) |
| `politics` | forms of government, ideologies, piety (2.2) |
| `diplomacy` | provinces, blocs, the world council, treaties, world wars (2.2) |
| `army` | regiments, the front, supply, commanders (2.2) |
| `airwar` | war in the air (2.2) |
| `nuclear` | nuclear weapons (2.2) |
| `landmarks` | landmarks (2.2) |
| `ruins` | ruins and their decay (2.2) |
| `epidemic` | plague carried by ships, the walking dead (2.2) |
| `city3d` | the look of cities on the 3D map (2.2) |
| `terrain` | the Flatten brush (2.2) |

### The rules

- Only parameters that **already exist** can be changed. An unknown name is skipped with a note — you cannot add new parameters.
- A number is replaced by a number, a list of numbers by a list of numbers **of the same length**.
- The loader itself only refuses values that are not numbers and keeps every value within ±1,000,000. Sensible limits come from the editor: its sliders stay within them. A wild value typed by hand is accepted — test the result.
- Only numbers and lists of numbers can be changed. A few numeric parameters are technical links rather than balance and are refused with a note.
- If several enabled add-ons change the same parameter, the one loaded last wins.

### Where to find every parameter

There are several hundred parameters. Every one of them — its key, label, stock value and meaning — is listed in the editor: **Rules → «Balance»**, with search, sections, a «changed only» filter and a reset for each parameter. Hover over a parameter for its explanation. The editor writes the same `"section": { "KEY": value }` pairs you would type by hand. See the [add-on editor]({{ '/en/modding/editor/' | relative_url }}) chapter.

Add-ons that change how the world runs — balance outside `walk`, `stats`, `sound`, `music`, `city3d` and `terrain`, custom eras, biomes, species or scheduled events — make a world not count for the Steam leaderboards. Looks, names, flags, sounds and music do not.
{: .note}

## Custom eras

There are eight eras by default: Tribal, Agrarian, Classical, Medieval, Industrial, Post-Industrial, Modern, Space Age, with science thresholds 2, 5, 7, 9, 11, 13.5, 17. An add-on can replace the whole ladder:

```json
{
  "eras": {
    "tech":  [2, 5, 9, 13, 17, 21],
    "names": {
      "ru": ["Племена", "Аграрная", "Классическая", "Индустриальная", "Современная", "Космическая", "Звёздная"],
      "en": ["Tribal", "Agrarian", "Classical", "Industrial", "Modern", "Space Age", "Interstellar"]
    },
    "agri":       [0.3, 1.2, 2.6, 6, 11, 18, 26],
    "military":   [0.5, 1, 1.6, 2.5, 3.6, 5, 7],
    "seafaring":  [0, 1, 1, 2, 3, 4, 5],
    "transition": [0, 0.15, 0.45, 0.8, 0.9, 0.96, 0.98],
    "techSpeed":  [3.4, 2.2, 1.55, 1.3, 1.15, 1, 0.9],
    "cityCap":    [0.07, 0.15, 0.3, 0.55, 1, 1, 1],
    "look":       [0, 1, 2, 3, 4, 5, 5]
  }
}
```

**The length rule.** `tech` holds the thresholds to **enter** each era after the first, so N thresholds give **N + 1** eras, and every other list must be N + 1 long. In the example: 6 thresholds → 7 eras. `tech` may have 1 to 11 numbers (2 to 12 eras), and they must increase.

| List | Meaning |
|---|---|
| `tech` | how much science is needed to enter the era. Must increase |
| `names.ru` | **required**: era names (up to 24 characters). `names.en` is optional — otherwise the Russian names are used |
| `agri` | **required**: farming multiplier |
| `military` | **required**: military strength multiplier |
| `seafaring` | **required**: seafaring range |
| `transition` | **required**: demographic transition, 0 … 1 — how much population growth is damped. 0 — tribal birth rates, 0.96 — a modern city |
| `techSpeed` | optional: the pace of science in the era (early eras go faster) |
| `cityCap` | optional: the city size ceiling in the era, a share of a cell's population ceiling |
| `look` | optional: which of the six «visual» eras each of your eras looks like — 0 Tribal, 1 Agrarian, 2 Classical (and Medieval), 3 Industrial (and Post-Industrial), 4 Modern, 5 Space Age. The game picks buildings, walk vehicles and music by it. Without it the visual eras are spread over yours evenly |

If one required list is missing or has the wrong length, the whole `eras` section is skipped.

**Era thresholds of features.** Many features start at an era: missiles (`AT_MISSILE`), nuclear weapons (`AT_NUKE`), factories (`AT_FACTORY`), cars, aircraft, railways and so on — the `AT_*` parameters of `balance.civ`. When your add-on replaces the ladder, the game spreads these thresholds over your eras proportionally. If you want a feature in a particular era, set its `AT_*` parameter in `balance.civ` — the `balance` section is applied after `eras`.

### Inserting an era between existing ones

Thresholds must increase down the list. By hand, simply keep `tech` increasing and write every other list in the same order. In the editor (**Rules → «Eras»**): press **«Add»** (the new era goes last), give it its threshold, then press **«Sort by threshold»** — the era moves into place together with its name and every multiplier. The first era cannot be moved: it is the starting one.

### Era numbers in old add-ons

Before version 2.1.2 there were six eras, and «era 3» meant Industrial. An add-on without `"eraLadder": 2` or higher is treated as an old one: its `AT_*` thresholds, six-value per-era lists, «era N» and «nations at era N» goals and custom building and vehicle era ranges are translated to the eight-era numbers (Medieval takes the Classical values, Post-Industrial the Industrial ones).

Version 2.2 added seven discoveries (65 instead of 58). With `"eraLadder": 3` the «N discoveries» goals (`inventions`) count against all 65; with `"eraLadder": 2` they count only the 58 older ones, so older scenarios keep their difficulty.

**Write new add-ons with `"eraLadder": 3`** and the eight-era numbers: 0 Tribal, 1 Agrarian, 2 Classical, 3 Medieval, 4 Industrial, 5 Post-Industrial, 6 Modern, 7 Space Age.

## Era look

`vis` recolours buildings and vehicles on the 3D map, era by era:

```json
{
  "vis": {
    "3": { "house": "#c9b79a", "factory": "#b8a68c", "land": "#8c3b2e" },
    "4": { "tower": "#e8f4ff", "plane": "#f0f8ff" }
  }
}
```

The key is the number of a **visual** era. There are six: 0 Tribal, 1 Agrarian, 2 Classical and Medieval, 3 Industrial and Post-Industrial, 4 Modern, 5 Space Age. If your add-on has its own ladder (`eras`), the key is the number of your era. Per-era `models` and `roads` are numbered the same way.

Inside are colours `#rrggbb`:

| Key | What |
|---|---|
| `tent` | tents and huts |
| `house` | houses |
| `factory` | factories |
| `tower` | skyscrapers |
| `towerAlt` | the second kind of skyscraper |
| `landmark` | landmarks |
| `land` | land vehicles |
| `landAcc` | trailers and details of land vehicles |
| `ship` | ship hulls |
| `sail` | sails |
| `plane` | aircraft |
| `rail` | locomotives |
| `wagon` | railway wagons |

You do not need to list them all: anything not given stays as it was. An era missing from the table can be added; it starts as a copy of the last one.

## Custom biomes

Built-in biomes come from a rule tree inside the game. Custom biomes are described by a **climate envelope** and are checked **before** the built-in ones. Up to **24**.

```json
{
  "biomes": [{
    "key": "volcanic",
    "ru": "Вулканическая пустошь",
    "en": "Volcanic waste",
    "color": "#4a3f3a",
    "colorLush": "#5c5048",
    "arable": 0.05,
    "rough": 0.9,
    "priority": 10,
    "texture": "tex/waste.png",
    "veg": { "sprite": "tex/dead_tree.png", "d": 3, "height": 0.6, "width": 0.9 },
    "when": { "temp": [24, 60], "precip": [0, 500], "height": [0.3, 1], "water": false }
  }]
}
```

| Field | Meaning |
|---|---|
| `key` | internal name: latin letters, digits, `_`. Must be unique and must not match a built-in biome |
| `ru`, `en` | the name (up to 40 characters) |
| `color` | **required**: the base colour, `#rrggbb` |
| `colorLush` | the colour under dense vegetation (the base colour by default) |
| `arable` | how good the land is for farming, 0 … 1 (0.2 by default). Affects how many people a cell can feed |
| `rough` | texture grain on the 2D map, 0 … 1 (0.5 by default) |
| `priority` | −100 … 100; higher is checked earlier |
| `texture` | a seamless terrain texture for 3D (png, jpg or webp) |
| `veg.mesh` | built-in plants: `conifer`, `broadleaf`, `jungle`, `bush`, `field` |
| `veg.sprite` | **or** your own plant: a png with transparency, drawn as two crossed pictures |
| `veg.height`, `veg.width` | the sprite's size, 0.1 … 3 (0.62 and 0.85 by default) |
| `veg.d` | plant density, 0 … 8 (3 by default) |

### Conditions

`when` decides where the biome appears:

| Field | Range | Meaning |
|---|---|---|
| `temp` | −90 … 90 | temperature, °C |
| `precip` | 0 … 6000 | precipitation, mm a year |
| `height` | 0 … 1 | height above sea level |
| `slope` | 0 … 2 | steepness |
| `water` | `true` / `false` | water only or land only |
| `coast` | `true` / `false` | coast only or away from the coast |

Ranges are written `[from, to]`. A field left out is not checked; all given conditions must hold at once.

Too narrow an envelope and the biome never appears; too wide and it takes half the map. Start with middle values and check in the game.
{: .note}

## Models, building kinds and vehicles

### Custom models

The format is **Wavefront OBJ** (`.obj`); Blender, 3ds Max, SketchUp, Cinema 4D and most other editors export it. `models` replaces built-in shapes on the 3D map:

```json
{
  "models": {
    "house":   { "obj": "models/house.obj", "texture": "models/house.png" },
    "factory": "models/factory.obj",
    "tower":   { "4": { "obj": "models/sky.obj", "texture": "models/sky.png" } },
    "mover_land": { "0": "models/cart.obj", "4": ["models/car.obj", "models/van.obj"] },
    "mover_sea": "models/ship.obj",
    "mover_air": "models/plane.obj"
  }
}
```

Four ways to write a model:

- `"house": "models/house.obj"` — one model for all eras, **coloured by the game** with the era and nation colour, like the built-in shapes;
- `"house": { "obj": "…", "texture": "…" }` — a model **with its own texture**, shown as you drew it, with no era tint;
- `"tower": { "4": … }` — a model for one era (a visual era, see [Era look](#era-look));
- `"mover_land": { "4": ["…", "…"] }` — a **list of up to 64 models**, for vehicles only: each vehicle on the 3D map takes one of them. A list can also stand for all eras: `"mover_land": ["…", "…"]`.

| Shape | What |
|---|---|
| `tent`, `house`, `factory`, `tower`, `landmark` | buildings |
| `mover_land` | land vehicles |
| `mover_sea` | ships |
| `mover_air` | aircraft |
| `mover_war` | the warship of naval battles |
| `mover_rail` | the locomotive (wagons stay built-in) |

**Model requirements**

- **Scale does not matter.** The model is fitted into a unit cube and set on the ground automatically.
- **Orientation:** Y is up, the model faces +X.
- **A texture needs UV coordinates** (`vt` lines in the file); without them the texture collapses into one pixel.
- Materials (`.mtl`) are ignored — the texture comes from `mod.json`.
- Quads and larger polygons are split into triangles automatically.
- Up to 12 MB per model, up to 8 MB per texture (png, jpg or webp).

**Exporting from Blender:** File → Export → Wavefront (.obj), tick «Triangulated Mesh» and «UV Coordinates»; «Materials» can stay off.

### Custom building kinds

`models` replaces a built-in shape. `buildings` **adds a new kind**: it takes a share of the buildings of one shape and is placed by the game on the same streets. Up to **12** kinds.

```json
{
  "buildings": [{
    "key": "temple",
    "model": { "obj": "models/temple.obj", "texture": "models/temple.png" },
    "replaces": "house",
    "where": "city",
    "eras": [2, 5],
    "chance": 0.2,
    "size": 1.6,
    "color": "#d8c39c"
  }]
}
```

| Field | Meaning |
|---|---|
| `key` | internal name: latin letters, digits, `_`, up to 24 characters |
| `model` | **required**: a path to an `.obj`, or `{ "obj": …, "texture": … }` as in `models` |
| `replaces` | whose place it takes: `house` (the default), `tent`, `factory`, `tower`, `landmark` |
| `where` | `any` — anywhere (the default), `city` — cities only, `center` — village centres, `village` — hamlets |
| `eras` | `[from, to]` — a range of **real** eras (0 … 7 in the stock ladder). All eras by default |
| `chance` | share of those buildings, 0.01 … 1 (0.15 by default); 0.2 is roughly every fifth |
| `size` | size multiplier, 0.2 … 4 |
| `color` | the colour when the model has no texture of its own |

The choice is fixed by the building's position: the same building always stands in the same place and never flickers.

### Custom vehicles

`vehicles` gives **new looks to the walk mode's vehicle kinds**. A custom vehicle drives, parks and fights where its kind does, with that kind's speed, seats and toughness, for a share of the vehicles of that kind in its eras. One kind can have any number of custom looks.

```json
{
  "vehicles": [{
    "key": "zil130",
    "name": { "ru": "ЗИЛ-130", "en": "ZIL-130" },
    "model": { "obj": "models/zil130.obj", "texture": "models/zil130.png" },
    "replaces": "truck",
    "eras": [6, 6],
    "chance": 0.3,
    "size": 1,
    "color": "#4a6a3a"
  }]
}
```

| Field | Meaning |
|---|---|
| `key` | internal name: latin letters, digits, `_`, up to 24 characters; unique across all enabled add-ons |
| `name` | the name in walk hints (up to 40 characters); without it — the built-in kind's name |
| `model` | **required**: a path to an `.obj`, or `{ "obj": …, "texture": … }` |
| `replaces` | **required**: which kind it is a look for — see the table below |
| `eras` | `[from, to]` — a range of **real** eras. All eras by default |
| `chance` | share of the vehicles of that kind, 0.01 … 1 (0.25 by default). Shares of one kind add up; at 1 or more in total no built-in look of that kind is left in those eras |
| `size` | length multiplier, 0.3 … 3 (1 — the length of the built-in kind) |
| `color` | the colour when the model has no texture; without it — the kind's usual paint |

| Where it drives | Kinds (`replaces`) |
|---|---|
| Streets and roads | `oldcar` motor carriage, `lorry` early lorry, `car30` 1930s car, `lorry30` 1930s lorry, `bus30` bonneted bus, `taxi30` 1930s taxi, `van30` 1930s delivery van, `roadster` roadster, `car` sedan, `hatch` hatchback, `suv` SUV, `van` van, `pickup` pickup, `taxi` taxi, `minibus` minibus, `truck` truck, `semi` semi-trailer truck, `bus` bus, `hover` hover car, `hbus` hover bus, `htruck` hover truck, `htaxi` hover taxi |
| Police | `police30` 1930s police car, `police` patrol car, `hpolice` patrol hover car |
| Fire and ambulance | `ftruck30` 1930s fire engine, `ftruck` fire engine, `hftruck` fire hover engine, `amb30` 1930s ambulance, `amb` ambulance, `hamb` hover ambulance |
| Water near the shore | `canoe` dugout canoe, `boat` boat, `sailboat` sailing yacht, `launch` steam launch, `mboat` motorboat, `yacht` motor yacht, `hboat` hovercraft |
| Army: bases and battles | `acar` armoured car, `rtank` rhomboid tank, `tank` medium tank, `htrack` half-track, `apc` armoured personnel carrier, `mbt` main battle tank, `htank` hover tank |

- Which vehicle gets which model is decided by the vehicle's seed: the same vehicle always has the same model, for every player of a multiplayer room too.
- The game fits the model's length to the built-in kind. Orientation as for all models: Y up, nose along +X. From the driver's seat you see the built-in cabin — an `.obj` model has no interior.
- The «streets and roads» kinds also drive on the 3D map's roads: there a custom vehicle takes its share of that era's land traffic.
- Up to **400** custom vehicles per add-on, their models together up to 160 MB (they are read when the game starts).

**Not possible yet:** carts, carriages, chariots and riding animals (a model is static, while horses and oxen walk), and custom residents of the walk (people move joint by joint). A new kind of resident can be added by a [code add-on]({{ '/en/modding/code/' | relative_url }}).
{: .note}

## Textures, roads, sounds and music

### Game textures

```json
{ "textures": { "grass": "tex/grass.png", "water": "tex/water.png" } }
```

Names: `grass`, `sand`, `snow`, `rock`, `cobble`, `planks`, `water`, `wall_stone`, `wall_timber`, `wall_glass`, `wall_concrete`, `tree_broadleaf`, `tree_conifer`, `tree_jungle`, `bush`, `field`.

png, jpg or webp, up to 8 MB each. Terrain textures must be **seamless** — they tile.

### Roads per era

```json
{ "roads": { "2": "tex/road_stone.png", "4": "tex/road_asphalt.png" } }
```

The key is a visual era (see [Era look](#era-look)). The road ribbon is unrolled **along** the route, so the texture must be seamless from top to bottom. Where there is no texture, the era's standard colour stays.

### Sounds

```json
{ "sounds": { "war": "snd/war.wav", "thunder": "snd/thunder.ogg", "step": "snd/step.wav" } }
```

An add-on can replace any sound of the game:

| Group | Names |
|---|---|
| Interface and chronicle | `click`, `paint` (brush), `ach` (achievement), `win`, `lose`, `era` (new era), `war`, `city` (city founded), `collapse` (nation collapse), `famine`, `colony`, `disaster`, `peace`, `ruler`, `invention`, `extinct`, `plague`, `revolt` |
| World and walk | `rain`, `thunder`, `quake`, `eruption`, `splash`, `engine`, `horn`, `hover`, `animal`, `step`, `gallop`, `oar`, `door`, `talk`, `coin`, `take`, `battle`, `alarm`, `cannon`, `explosion`, `crash`, `thud`, `sword`, `swing`, `clash`, `arrow`, `shot`, `reload`, `empty`, `draw`, `hit`, `hurt`, `shout`, `scream` |

The game has more sounds than this list; the editor (**Look → «Files» → «Event sounds»**) shows the full list, taken from the game itself.

ogg, wav or mp3, up to 4 MB each — these are short sounds, not music.

### Music

```json
{ "music": ["music/theme.mp3", "music/calm.ogg"] }
```

Add-on music **replaces the built-in soundtrack entirely**: while it is present, the game's own composer stays silent. Tracks loop, and their volume follows the music slider in the settings. Up to **12** tracks, up to 24 MB each; mp3, ogg, wav, m4a or flac.

Fine settings of sound and of the built-in music are in `balance.sound` and `balance.music`.

## Testing, removing, publishing

### Testing

1. Open the add-on in the editor: the **«Validation»** panel shows everything the game will skip or correct, with the path to the field.
2. **«Test in game»** saves the add-on, enables it and starts the selected scenario at once (or a new world, if there are no scenarios).
3. Without the editor: save `mod.json` and press **«Refresh»** in the Workshop section, or restart the game. Scenarios appear in **«Scenarios»** next to the built-in ones.
4. If something did not take effect, start the game with `--enable-logging=stderr` and read the `[mods]` lines.

### Removing an add-on

- **Your own** (in `mods`): the **«Delete»** button in the Workshop section. The folder is erased from disk, so the game asks first. The change takes effect after a restart.
- **A Workshop subscription** cannot be deleted from the game: unsubscribe on the item's page (the **«Workshop page»** button) and Steam removes the files. Deleting them by hand only makes Steam download them again.
- **An item you already published**: deleting your local folder does not touch it. Remove the item on its Workshop page, from the owner's menu.

Creating an add-on in the editor **never uploads it** — the folder just appears in `mods`. Only what you send with **«Publish»** reaches the Workshop, and the game asks first.
{: .note}

### Publishing to the Workshop

In the editor: **Add-on → «Publishing»**.

- **«Workshop preview image»** — `preview.png`: **«Capture from the current map»** (2D or 3D, whatever is on screen behind the menu) or **«Choose an image…»**; the editor fits it to 640 × 360.
- **«Before uploading»** — a short checklist: no errors, a description, a preview.
- **«What changed»** — a change note for subscribers, sent with the update.
- **«Publish»** — the item is created **hidden** in your account. To show it to others, open its Workshop page, accept the agreement and change the visibility.

Requirements: `mod.json` is mandatory, `preview.png` is recommended, and every file must be **inside** the add-on folder. The whole folder is uploaded — remove unused files (the editor's **«Overview»** lists them).

**Publishing again updates the same item.** The game keeps the item number in a `workshop.id` file next to `mod.json` — do not delete or edit it. An update does not change the item's visibility. To publish the add-on as a separate new item, press **«Unlink»** in the editor (or delete `workshop.id`) before uploading; **«Duplicate add-on»** makes a copy without `workshop.id`.

If publishing fails, the game explains why. One special case: the item was created but the files failed to upload. Steam writes the reason only to its own log, `logs\workshop_log.txt` in the Steam folder.

## Limits

An add-on's data is **declarative**: the game reads it and decides itself what to do, but runs nothing from it. These files come from strangers over the internet, so:

- goals and events are a metric, a threshold and an action from a fixed list — never a formula;
- only parameters that already exist can be changed, numbers are clamped, lists keep their length;
- strings are stripped of markup;
- files are read only from inside the add-on folder, and every file type has a size limit;
- a world file is rebuilt from scratch instead of being loaded as is;
- a bad entry is skipped with a note; the rest of the add-on still loads.

Code runs only in [code add-ons]({{ '/en/modding/code/' | relative_url }}), and only after the player has switched that add-on on.

| What | Limit |
|---|---|
| `mod.json` size | 512 KB |
| Scenarios per add-on | 12 |
| Goals per scenario | 6 |
| Custom defeat conditions per scenario | 6 |
| Starting nations per scenario | 32 |
| Ties between starting nations | 200 |
| Painted land (`area.rle`) | 65,536 characters, mask 24 … 400 cells a side |
| Pixel flag | 4 … 64 cells a side, up to 32 colours |
| Locked tools per scenario | 48 |
| Events per list | 32 |
| Ready-made worlds | 8 |
| World file | 64 MB, map 24 × 24 … 400 × 400 |
| World thumbnail | 1 MB |
| Names per list | 400, up to 30 characters each |
| Name parts per list | 200, up to 20 characters each |
| Flags | 200 |
| Custom animal species | 16 |
| Eras | 2 … 12 |
| Custom biomes | 24 |
| Custom building kinds | 12 |
| Custom vehicles | 400, their models together 160 MB |
| Vehicle models in one list | 64 |
| `.obj` model | 12 MB |
| Texture, sprite, image | 8 MB (png, jpg, webp) |
| Sound | 4 MB (ogg, wav, mp3) |
| Music | 12 tracks, 24 MB each (mp3, ogg, wav, m4a, flac) |
| Code add-ons: one script or inserted file / all scripts of an add-on | 4 MB / 16 MB |
