# Earth Simulator — дорожная карта и полевой дневник

Сайт игры [Earth Simulator](https://store.steampowered.com/app/4932460/Earth_Simulator/): дорожная карта развития от племён до галактики и дневник разработки.

**Адрес:** https://ilya873.github.io/earth-simulator/ (английская версия — `/en/`)

Сайт собирает GitHub Pages (Jekyll) сам: достаточно закоммитить изменения в ветку `main`, и через минуту они на сайте.

## Как опубликовать запись в дневнике

1. Создайте файл `_posts/ГГГГ-ММ-ДД-латинское-название.md`, например `_posts/2026-11-20-vyshlo-obnovlenie-2-1.md`.
2. Картинки и короткие ролики положите в папку `assets/devlog/ГГГГ-ММ-ДД/`.
3. Шапка и текст записи:

```markdown
---
title: "Вышло обновление 2.1"
title_en: "Update 2.1 is out"            # необязательно — заголовок для английской версии сайта
summary: "Порты, поезда, самолёты и военные базы."
summary_en: "Ports, trains, planes and military bases."
version: "2.1"                           # необязательно
cover: /assets/devlog/2026-11-20/cover.jpg   # необязательно — обложка (и картинка для превью в Telegram)
cover_caption: "Подпись к обложке"
---
Текст записи в Markdown.

## Подзаголовок

{% include figure.html src="/assets/devlog/2026-11-20/port.jpg" caption="Морской порт в индустриальную эпоху" %}

{% include gallery.html images="/assets/devlog/2026-11-20/a.jpg|/assets/devlog/2026-11-20/b.jpg" captions="Первый|Второй" %}

{% include video.html youtube="ID_ролика" caption="Трейлер обновления" %}
```

Видео: `youtube="…"`, `rutube="…"`, `vk="полная ссылка video_ext.php"` или свой файл `src="/assets/devlog/…/clip.mp4"` (до ~20 МБ).

Чтобы запись была на двух языках, добавьте в шапку поле `body_en: |` с английским текстом — на странице появится переключатель «Русский / English».

## Как обновить дорожную карту

Всё в `_data/roadmap.yml`:

- статус пункта — `s: done | wip | plan | idea` (в игре / в работе / запланировано / исследование);
- статус листа — `status:` у листа; метка «Вы здесь» — `now: true` (держите её на одном листе);
- сроки — `when:`, точность — `precision: exact | approx | conj`.

Просьбы игроков — в `_data/requests.yml`, тексты интерфейса — в `_data/i18n.yml`, подписи к скриншотам — в `_data/gallery.yml`.

## Устройство

| Путь | Что там |
|---|---|
| `_layouts/` | каркас страниц: главная, дневник, запись |
| `_includes/home/` | разделы главной: титульная карта, «Мир сегодня», шкала времени, листы, просьбы, дневник |
| `assets/css/main.css` | всё оформление |
| `assets/js/atlas.js` | живая карта на титульном листе |
| `assets/js/site.js` | увеличение картинок, связи на шкале, язык записей |
| `en/` | английская версия главной и дневника |
