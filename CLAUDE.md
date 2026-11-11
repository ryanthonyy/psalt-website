# thepsalt.com: notes for Claude

- Static site on GitHub Pages (custom domain in `CNAME`). Owner Ry is a beginner; explain steps plainly.
- Edit `src/` (pages, layout, footer) and run `python3 tools/build.py`; never hand-edit the built `*.html` in the root.
- Colors and fonts mirror the app's `src/theme.ts`. Keep it minimal: content first, extra info on demand.
- `data/` and `bible/` come from the app repo (psalt-app); scripture is never typed by hand. Places use OpenBible's top-ranked identification only; same confidence tiers as the app.
- Emails: team@, support@, privacy@thepsalt.com. Never hello@.
- Keep `privacy.html` accurate whenever the app or site starts handling data differently.
