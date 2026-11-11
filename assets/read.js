/* The reader: one chapter of the KJV, with place names linked to the map and the chapter's era. */
(async () => {
  const [books, places, timeline] = await Promise.all([Psalt.books(), Psalt.places(), Psalt.timeline()]);
  const p = Psalt.params();
  let book = books.find((b) => b.id === p.get('book')) || books.find((b) => b.id === 'john');
  let ch = Math.min(Math.max(parseInt(p.get('chapter'), 10) || 1, 1), book.chapters);
  // "?verse=5" or "?verse=22-23"
  const [v1, v2] = (p.get('verse') || '').split('-').map((n) => parseInt(n, 10));

  const bookSel = document.getElementById('book');
  const chSel = document.getElementById('chapter');
  bookSel.innerHTML = ['ot', 'nt']
    .map((t) => `<optgroup label="${t === 'ot' ? 'Old Testament' : 'New Testament'}">${books
      .filter((b) => b.testament === t)
      .map((b) => `<option value="${b.id}">${Psalt.esc(b.name)}</option>`)
      .join('')}</optgroup>`)
    .join('');
  bookSel.value = book.id;
  const fillChapters = () => {
    chSel.innerHTML = Array.from({ length: book.chapters }, (_, i) => `<option value="${i + 1}">Chapter ${i + 1}</option>`).join('');
    chSel.value = String(ch);
  };
  fillChapters();
  bookSel.addEventListener('change', () => go(bookSel.value, 1));
  chSel.addEventListener('change', () => go(book.id, Number(chSel.value)));

  function go(bookId, chapter) {
    location.href = Psalt.readUrl(bookId, chapter);
  }

  const title = Psalt.chapterTitle(book, ch);
  document.title = `${title} (KJV) · Psalt`;
  document.getElementById('title').textContent = title;

  // Context: places on the map and the era on the timeline.
  const mentions = places.chapters[`${book.id}:${ch}`] || [];
  const pinned = mentions.map(([id]) => Psalt.place(places, id)).filter((pl) => pl.lat !== null);
  const era = Psalt.eraFor(timeline.eras, book.id, ch);
  const ctx = [];
  if (pinned.length) ctx.push(`<a class="chip" href="/map?book=${book.id}&chapter=${ch}">${Psalt.ICON.map} Map · ${pinned.length} place${pinned.length === 1 ? '' : 's'}</a>`);
  if (era) ctx.push(`<a class="chip" href="/timeline#${era.id}">${Psalt.ICON.time} ${Psalt.esc(era.name)}</a>`);
  document.getElementById('ctx').innerHTML = ctx.join('');

  // Verses, with mapped place names linked (only the places OpenBible lists for that verse).
  const text = (await Psalt.bible(book.id))[ch - 1] || [];
  const byVerse = {};
  mentions.forEach(([id, verses]) => {
    const pl = Psalt.place(places, id);
    if (pl.lat === null) return;
    verses.forEach((v) => (byVerse[v] ||= []).push(pl));
  });
  document.getElementById('verses').innerHTML = text
    .map((t, i) => {
      const n = i + 1;
      const pls = byVerse[n] || [];
      const html = Psalt.linkNames(t, pls.map((pl) => pl.name), (name) => {
        const pl = pls.find((x) => x.name === name);
        return `<a class="place" href="/map?book=${book.id}&place=${pl.id}" title="See ${Psalt.esc(name)} on the map">${Psalt.esc(name)}</a>`;
      });
      const hl = v1 && n >= v1 && n <= (v2 || v1) ? ' class="hl"' : '';
      return `<p id="v${n}"${hl}><sup>${n}</sup>${html}</p>`;
    })
    .join('');
  if (v1) document.getElementById(`v${v1}`)?.scrollIntoView({ block: 'center' });

  // Previous and next chapter, crossing between books.
  const idx = books.findIndex((b) => b.id === book.id);
  const prev = ch > 1 ? [book, ch - 1] : idx > 0 ? [books[idx - 1], books[idx - 1].chapters] : null;
  const next = ch < book.chapters ? [book, ch + 1] : idx < books.length - 1 ? [books[idx + 1], 1] : null;
  const set = (el, target) => {
    if (!target) return (el.hidden = true);
    el.href = Psalt.readUrl(target[0].id, target[1]);
    el.textContent = el.id === 'prev' ? `← ${Psalt.chapterTitle(...target)}` : `${Psalt.chapterTitle(...target)} →`;
  };
  set(document.getElementById('prev'), prev);
  set(document.getElementById('next'), next);
})();
