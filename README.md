# thepsalt.com

The website for **Psalt**, a free King James Bible app. Read it. Hear it. See it.

Pages: Home (verse of the day, features, beta sign-up), Read (the KJV, with place names linked to the map), Map, Timeline, Support and Privacy.

## How it's built

- Plain HTML, CSS and JavaScript. No build tools are needed to host it; GitHub Pages serves the files as they are.
- Each page's content is in `src/pages/`, wrapped in the shared header and footer (`src/layout.html`, `src/footer.html`). After changing anything in `src/`, run `python3 tools/build.py` to rebuild the pages in the main folder.
- `data/` and `bible/` are copied from the app (psalt-app): the KJV text, books, verse of the day, places and timeline. Refresh them whenever the app's data changes so the site and app always match.

## Beta sign-up form

Until a form service is connected, the beta section asks people to email team@thepsalt.com. To switch on the form: create a free form at formspree.io, copy its endpoint (like `https://formspree.io/f/abcdwxyz`), put it in `data-endpoint=""` on `<form id="beta-form">` in `src/pages/index.html`, and rebuild.

## Credits

- Scripture: King James Version, public domain in the United States. Text data from [aruljohn/Bible-kjv](https://github.com/aruljohn/Bible-kjv), MIT License, © 2019 Arul John (see `bible/SOURCE.md`).
- Place locations: [OpenBible.info Bible Geocoding Data](https://github.com/openbibleinfo/Bible-Geocoding-Data), CC BY 4.0.
- Map: [Leaflet](https://leafletjs.com) (BSD-2-Clause), tiles © OpenStreetMap contributors and © CARTO.
- Fonts: DM Serif Display, Literata and Manrope from Google Fonts (SIL Open Font License).
