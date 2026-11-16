---
layout: guide
lang: en
chapter: start
title: "Modding: getting started"
summary: "How Earth Simulator add-ons work, what you can make with them and which chapter of the guide to start with: the editor with no programming, mod.json by hand, or code."
alt_url: /modding/
permalink: /en/modding/
cover: /assets/modding/layer-en-1600.jpg
cover_caption: "A code add-on has added a new «To the sea» layer to the map — with its own button, legend and line in the cursor tooltip."
---

An add-on (a mod) is a **folder** with a `mod.json` file and, if needed, pictures, sounds, models, worlds and scripts. The game reads it on startup and adds whatever it describes. Players install add-ons from the Steam Workshop with a single «Subscribe» button — or drop them by hand into the `mods` folder next to the game.

## What you can make

There are two kinds of add-ons, and one add-on can be both.

**Data** — things the game reads and applies by itself. No programming needed; almost everything can be put together with the mouse in the built-in editor:

- scenarios with starting conditions, goals, defeat conditions and events;
- your own nations on the map from the very first second — with borders, capitals, flags, alliances and wars;
- ready-made worlds, and a world built from a heightmap (PNG);
- about five hundred balance parameters: population growth, wars, climate, disasters, trade, walk mode;
- your own ladder of eras, your own biomes, animals, names of nations, cities and people, forms of government;
- the look of the world: era colours, models of buildings and vehicles (OBJ), textures, sounds, your own music.

**Code** — JavaScript that the game loads alongside its own files. It does everything that data can't describe:

- new rules and mechanics («no wars in the first hundred years», «a capital on the coast adds stability»);
- your own windows, buttons, map layers, tabs on the nation page, chronicle entries;
- events and HUD panels in first-person walk mode, your own keys;
- any change to the world: treasury, stability, climate, pollution, ruins.

## Chapters of the guide

<ul class="cards">
<li><a href="{{ '/en/modding/editor/' | relative_url }}"><strong>The add-on editor</strong></a><br>Everything with the mouse, no programming: from a template to publishing in the Workshop. Start here.</li>
<li><a href="{{ '/en/modding/data/' | relative_url }}"><strong>mod.json by hand</strong></a><br>Every section and every field of <code>mod.json</code> with examples: scenarios, goals, worlds, balance, eras, biomes, models, limits.</li>
<li><a href="{{ '/en/modding/code/' | relative_url }}"><strong>Code add-ons</strong></a><br>How the game loads code, your first add-on step by step, ModAPI, events, wrappers, anchor patches, multiplayer, debugging.</li>
<li><a href="{{ '/en/modding/recipes/' | relative_url }}"><strong>What code can change</strong></a><br>Ten ready-made add-ons — from a map layer to chain mail in walk mode. Each one is tested in the game and available for download.</li>
</ul>

## Where add-ons live

- **From the Workshop.** Once you subscribe, the game finds the add-on by itself the next time it starts.
- **Your own.** The `mods` folder next to the game: in your Steam library, right-click the game → «Manage» → «Browse local files». The **example-pack** sample is there too — it is off by default; turn it on to see what data add-ons can do.

```
Earth Simulator/
  EarthSimulator.exe
  mods/
    example-pack/      ← sample: scenarios, events, names, balance, eras, biomes
    my-first-mod/      ← your add-on
      mod.json
```

Add-ons are turned on and off in the main menu, in the **«Workshop»** section: each one has a checkbox, and the «Restart the game» button applies the changes.

{% include figure.html src="/assets/modding/workshop-en-1600.jpg" caption="The «Workshop» section: the list of add-ons, creating your own, the mods folder." wide=true %}

## The smallest add-on

A folder `mods/my-first-mod` with a `mod.json` inside:

```json
{
  "id": "my-first-mod",
  "name": { "ru": "Тёплая планета", "en": "Warm planet" },
  "author": "Your name",
  "description": { "ru": "Солнце светит на 3 % ярче.", "en": "The Sun shines 3% brighter." },
  "version": "1.0",
  "events": [
    { "year": 0, "do": "climate", "solar": 0.03, "text": { "ru": "Солнце разгорелось", "en": "The Sun flares up" } }
  ]
}
```

Start the game — the add-on appears in the «Workshop», and in every new world the Sun gets brighter in the very first year. Any text the player sees is written in two languages at once: `{ "ru": "…", "en": "…" }`; in the game's other languages the player sees the English one.

## Safety

- **Data runs nothing.** Goals and events are a measure, a threshold and an action from a fixed list — not a formula. Numbers are clamped to sensible limits, strings are cleaned, and files are read only from inside the add-on's folder. A bad entry doesn't break the whole add-on — the game skips it and loads the rest.
- **Only the player turns code on.** After subscribing, a code add-on stays off until the player ticks its checkbox, and it starts working after a restart. If the game fails to start with the code, those add-ons turn themselves off on the next start.
- **Multiplayer.** Everyone in a room must have the same add-ons — the game compares their contents.

## Publishing

A finished add-on is published straight from the editor: the «Publishing» tab, a preview picture for the Workshop page, a change note and the «Publish» button. The Workshop item is created hidden — open its page in Steam, accept the agreement and make it visible. Details are in the chapter [«The add-on editor»]({{ '/en/modding/editor/' | relative_url }}).

Questions and discoveries — in the game's discussions on Steam.
