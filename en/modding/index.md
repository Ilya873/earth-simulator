---
layout: guide
lang: en
title: "How to make your own add-on"
summary: "A step-by-step guide to modding Earth Simulator: your own scenarios, worlds, nations, balance, eras and the look of the world — in the built-in editor, no programming needed. And for those who want more, add-ons with code."
alt_url: /modding/
permalink: /en/modding/
cover: /assets/modding/scenario-en-1600.jpg
cover_caption: "The built-in add-on editor: a scenario card."
---

An add-on (mod) is a folder with a `mod.json` file and, if needed, images, sounds, models and worlds. The game reads it at start-up: it adds scenarios, changes the balance, recolours the eras, replaces the music. **Almost everything can be put together with the mouse in the built-in editor** — you don't have to write files by hand. Below is the path from an empty folder to a page in the Steam Workshop.

## 1. Where add-ons live and how to turn them on

Main menu → **Workshop**. Here is the list of installed add-ons: the checkbox on the left turns each one on and off, and **«Restart the game»** applies the changes. The game finds Steam Workshop subscriptions by itself; your own add-ons live in the `mods` folder next to the game (the **«Mods folder»** button).

{% include figure.html src="/assets/modding/workshop-en-1600.jpg" caption="The Workshop section: the list of add-ons, creating your own, the mods folder." wide=true %}

The `mods` folder contains a ready sample, **example-pack** — it is off by default. Tick it and restart the game to see what add-ons can do: two scenarios, scheduled events, custom names, an animal, balance tweaks, a seventh era and custom biomes.

## 2. Create an add-on

Click **«Create an add-on»** and choose where to start: «Scenario», «Rebalance», «Your own world», «Name set», «Era recolour» or an empty add-on. A template is only a beginning: every add-on has all the sections.

{% include figure.html src="/assets/modding/templates-en-1600.jpg" caption="Choosing a template for a new add-on." wide=true %}

The editor's sections are on the left; at the top are the add-on's name, folder and status. The **«Overview»** tab shows what the add-on changes and everything the game will skip or fix on loading — a click on a line takes you straight to the field. Creating an add-on doesn't send it anywhere — the folder simply lands in `mods`, and your draft survives even if you close the game.

{% include figure.html src="/assets/modding/overview-en-1600.jpg" caption="«Overview»: what the add-on changes and the validation — the game tells you in advance what it will accept." wide=true %}

## 3. A scenario: start, goals, defeat

A scenario is a starting world, its conditions and goals. In the **«Scenarios»** tab set the name and description (each field in two languages — the RU/EN button), an icon and an internal name. Below is the card as the player will see it.

- **Start:** the shape of the land (continents, a pangaea, islands, the real Earth, an empty ocean), map size, the Sun, CO₂, sea level, the pace of history, disaster frequency, the starting year. Since 2.2 — a historical start on Real Earth from 3000 BC, a shifted equator and world rules: no wars, no uprisings, an era ceiling and more.
- **Goals** — up to six. A goal is a world measure and a threshold: «a population of 1.5 million», «three nations in the Classical era», «keep the ecology above 25%». The editor shows the measure's value **in the world open right now** — so you can see whether the threshold is realistic.
- **Defeat** — population, ecology, temperature, extinct species or any measure above or below a threshold.
- **Locks** — Planet sliders and tools the player can't use: without them many goals are reached with a single slider move.

{% include figure.html src="/assets/modding/scenario-en-1600.jpg" caption="«Scenarios»: the card, icon and internal name; below — start, goals and defeat." wide=true %}

**Tip.** Add a goal or a condition based on time — otherwise a scenario is over in half a minute. Fast-forward the world by the number of years you need and see where the threshold lands.

## 4. Your own nations on the map

In the **«Nations»** tab paint the nations that are on the map from the very first second — up to 32. The brush paints a nation's land, the eraser removes it, a click places the capital. Each nation has a name, a capital name, a colour, a pixel flag, a form of government, an ideology, an era, population, a treasury and permanent traits (military might, economy, order, science). Below you set alliances, vassals and wars between them. **«From the open world»** takes nations straight from the world on screen.

{% include figure.html src="/assets/modding/nations-en-1600.jpg" caption="«Nations»: the scenario map with the land brush, eraser and capital." wide=true %}

## 5. Ready-made worlds and a world from a picture

The **«Worlds»** tab gives two ways to bring a whole world along — terrain, climate, nations, cities and all of history:

- **«Add the current world»** — whatever is on screen behind the menu. Create a world in the game, shape it with the brushes, let history run — and add it. A scenario can start in such a world.
- **«World from a picture»** — a PNG or JPG heightmap becomes a new world: light is mountains, dark is sea. The game works out the climate, rivers and biomes itself.

{% include figure.html src="/assets/modding/worlds-en-1600.jpg" caption="«Worlds»: the add-on's ready-made worlds and a world from a picture." wide=true %}

The **«Events»** tab holds scheduled events: in a given year or on a condition (for example, when the average temperature drops below 4 °C) — a volcano, a meteorite, a plague, a drought, a benevolent power, a climate shift or just a chronicle entry.

## 6. Rules: balance, eras, names, wildlife

- **«Balance»** — about five hundred parameters of every game system: population growth, wars, climate, disasters, wildlife, walk mode, trade, politics, armies. Search, sliders within sensible limits, a reset for each parameter and an «only changed» filter. The out-of-the-box value is marked with a tick.
- **«Eras»** — your own ladder of eras: names and science thresholds, harvests, military strength, seafaring. A new era can be inserted between existing ones with «Put in order».
- **«Names»** — your own names for nations, cities, rulers and dynasties, flags for the nations the game creates, and names of forms of government («Fire Kingdom», the title «Smith King»).
- **«Wildlife»** — your own species: a body from the built-in shapes, the climate it lives in, size, herd, danger.

{% include figure.html src="/assets/modding/balance-en-1600.jpg" caption="«Balance»: every game parameter with search, sliders and reset." wide=true %}

{% include figure.html src="/assets/modding/eras-en-1600.jpg" caption="«Eras»: your own ladder of eras with thresholds and multipliers." wide=true %}

## 7. The look of the world: colours, biomes, models, sounds

- **«Era look»** — the colours of buildings and vehicles for every era.
- **«Biomes»** — your own climate-based biomes: colour, how arable they are, a terrain texture and vegetation (built-in or your own sprite).
- **«Files»** — your own building and vehicle models in OBJ format (from Blender and other programs), textures, sounds for any event and your own music instead of the built-in soundtrack.

{% include figure.html src="/assets/modding/look-en-1600.jpg" caption="«Era look»: the colours of houses, factories and vehicles for each era." wide=true %}

## 8. Testing and publishing

1. **«Test in game»** saves the add-on, turns it on and starts the scenario right away (or a new world if there are no scenarios).
2. The **«Details»** tab — the name, author and Workshop description in two languages.
3. The **«Publishing»** tab — a showcase image (it can be captured straight from the map, 640×360), a change note and the **«Publish»** button.

{% include figure.html src="/assets/modding/publish-en-1600.jpg" caption="«Publishing»: the showcase image, the pre-flight check, the change note." wide=true %}

The Workshop item is created **hidden** — open its page, accept the agreement and make it visible. Publishing again updates the same item (its number is kept in a `workshop.id` file next to `mod.json` — don't delete it). Since 2.2, Russian and other non-English titles and descriptions reach Steam correctly.

## 9. Add-ons with code

If data isn't enough, you can change the game itself: add mechanics, windows, rules. The game loads the code itself on every start, the game files on disk stay untouched, no installers are needed. For a player it's a single checkbox, but after subscribing an add-on with code stays **off** until they tick it — and it starts working after a restart. If a start with code fails, such add-ons are turned off by themselves on the next start.

In `mod.json` this is the `code` section: your scripts (`scripts`) and patches to game files by an «anchor» — a piece of code that occurs in the file exactly once (`patches`). The best route is the `ModAPI` object: subscriptions to world events (`ModAPI.on('war', …)`, `'year'`, `'disaster'`, `'save'`, `'load'`…) and wrappers around game functions (`ModAPI.before`, `after`, `wrap`). Anything built on `ModAPI` and the game's public names doesn't break with updates: every game build checks the known code add-ons itself.

```js
// meteorites only by the player's will
ModAPI.before('disasterTrigger', function (type, cell, power, byPlayer) {
  if (type === 'meteor' && !byPlayer) return false;
}, 'my-mod');
```

In multiplayer everyone in a room must have the same add-ons — the game checks this. Change the world inside world events or through `netAct` / `netDo`, not from a timer or a button.

## Limits and where to learn more

Add-on data is only read: numbers are clamped to sensible limits, strings are cleaned, files are taken only from inside the add-on folder, and a bad entry doesn't break the whole add-on — the game skips it and loads the rest. Limits: 12 scenarios, 6 goals each, 32 nations, 8 worlds, 24 biomes, 16 animal species, 400 custom vehicles.

The full reference — every balance parameter, goal measures, nation fields and anchor patches — is in the Steam guide and in the editor itself: hover over any field and it tells you what it means. Questions and finds — in the game's Steam discussions.
