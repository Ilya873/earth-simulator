# CLAUDE.md — сайт Earth Simulator

Лендинг игры Earth Simulator: дорожная карта и полевой дневник (девлог). Jekyll на GitHub Pages
(классическая сборка из ветки `main`: Jekyll 3.10, Liquid 4, kramdown GFM, плагин jekyll-feed).
Сборки и зависимостей нет — коммит в `main` публикует сайт. Репозиторий: `Ilya873/earth-simulator`,
адрес: https://ilya873.github.io/earth-simulator/ (`baseurl: /earth-simulator` — все ссылки через `relative_url`).

## Публикация записи дневника

- Файл: `_posts/YYYY-MM-DD-latin-slug.md`. Шапка: `title`, `summary` (обязательно); `title_en`, `summary_en`,
  `version`, `cover`, `cover_caption`, `cover_caption_en`, `body_en: |` (английский текст в Markdown) — по желанию.
  `lang` по умолчанию `ru` (задано в `_config.yml`).
- Медиа — в `assets/devlog/YYYY-MM-DD/`. Скриншоты ужимать до 1600 px по ширине, JPEG q≈82, progressive
  (Pillow есть в системе). Обложка 16:9 — она же превью ссылки в Telegram.
- Вставки: `{% include figure.html src=… caption=… wide=true %}`, `{% include gallery.html images="a|b" captions="…|…" %}`,
  `{% include video.html youtube|rutube|vk|src=… caption=… %}`. Свои ролики — до ~20 МБ, длинные — на хостинг видео.
- Голос записи — от первого лица разработчика, коротко и по делу. Без смайлов.
- Не публиковать содержимое невыпущенных обновлений, пока разработчик явно не попросил.

## Дорожная карта

- Данные — `_data/roadmap.yml` (листы `phases`, у каждого `items`; тексты `ru`/`en`, пункт = `[заголовок, пояснение]`).
  Статусы: `done | wip | plan | idea`. Метка «Вы здесь» — `now: true` ровно у одного листа.
  Зависимости листов — `deps` (по ним рисуются дуги на шкале времени и ссылки «Опирается на / Открывает путь»).
- Просьбы игроков — `_data/requests.yml` (`phase` = id листа). Строки интерфейса — `_data/i18n.yml`.
- Лист выпущен → `status: done`, пункты → `s: done`, `now: true` переносится на следующий лист;
  в «Паспорте мира» (`pp_version_v` в i18n.yml) обновить версию.

## Оформление

Концепция — «атлас грядущего мира»: бумага, тушь (`--ink`), киноварь (`--verm`), двойные рамки, условные знаки,
послойная окраска высот. Шрифты: Alegreya / Alegreya SC (заголовки), Alegreya Sans SC (подписи), IBM Plex Mono (данные).
Не использовать: скруглённые «таблетки», градиентные кнопки, неон, стекло, эмодзи и иконки-значки.
Все цвета — переменные в начале `assets/css/main.css`. Статусы рисуются классами `.sym--done/wip/plan/idea`.

## Проверка

Jekyll локально не установлен. Перед коммитом проверять Liquid на совместимость с Jekyll 3.10
(никаких фильтров, которых нет в Jekyll/Liquid 4). После пуша — открыть сайт и убедиться, что страница собралась
(`gh api repos/Ilya873/earth-simulator/pages/builds/latest`).
