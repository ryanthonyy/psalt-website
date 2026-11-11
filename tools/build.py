#!/usr/bin/env python3
"""Builds the site's HTML pages from src/: each page in src/pages/ is wrapped in src/layout.html.

Each page starts with a settings block:
<!--
title: Page title
description: One sentence for search results
nav: map            (which menu item to mark as current; optional)
head: <link ...>    (extra tags for <head>; optional)
scripts: assets/map.js assets/other.js   (optional)
-->

Run from the repository folder:  python3 tools/build.py
"""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'src'
layout = (SRC / 'layout.html').read_text()
footer = (SRC / 'footer.html').read_text()

for page in sorted((SRC / 'pages').glob('*.html')):
    text = page.read_text()
    m = re.match(r'<!--\n(.*?)\n-->\n', text, re.S)
    meta = {}
    if m:
        for line in m.group(1).splitlines():
            key, _, value = line.partition(':')
            meta[key.strip()] = value.strip()
        text = text[m.end():]
    nav = meta.get('nav', '')
    out = layout
    for item in ('read', 'map', 'timeline', 'support'):
        out = out.replace('{{nav_%s}}' % item, ' aria-current="page"' if item == nav else '')
    # Local scripts get a leading "/" so pages work at any address (thepsalt.com/map, /read?...).
    scripts = '\n'.join(
        f'<script src="{s if s.startswith(("http", "/")) else "/" + s}"></script>' for s in meta.get('scripts', '').split() if s
    )
    out = (out.replace('{{title}}', meta.get('title', 'Psalt'))
              .replace('{{description}}', meta.get('description', ''))
              .replace('{{head}}', meta.get('head', ''))
              .replace('{{scripts}}', scripts)
              .replace('{{footer}}', '' if meta.get('footer') == 'none' else footer)
              .replace('{{body}}', text.strip()))
    (ROOT / page.name).write_text(out)
    print('built', page.name)
