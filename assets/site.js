/* Shared helpers for the Psalt website. Data comes from the app (see README). */
const Psalt = (() => {
  const cache = {};
  const json = (path) => (cache[path] ??= fetch(path).then((r) => {
    if (!r.ok) throw new Error(`Could not load ${path}`);
    return r.json();
  }));

  const books = () => json('data/books.json');
  const places = () => json('data/places.json');
  const timeline = () => json('data/timeline.json');
  const daily = () => json('data/daily.json');
  /** One book of the KJV: an array of chapters, each an array of verses. */
  const bible = (id) => json(`bible/${id}.json`);

  const chapterTitle = (book, ch) => `${book.id === 'psalms' ? 'Psalm' : book.name} ${ch}`;

  /** Confidence tiers, the same as the app (OpenBible's score for recent scholarship). */
  const CONFIDENCE = {
    established: { label: 'Well established', color: '#C8941E', about: 'Scholars broadly agree on this location.' },
    debated: { label: 'Debated', color: '#7C5CB0', about: 'Scholars disagree. The pin shows the location most sources support.' },
    uncertain: { label: 'Uncertain', color: '#8A929E', about: 'Only a few sources support this location. Treat the pin as a guess.' },
    unknown: { label: 'Location unknown', color: '#8A929E', about: 'Scholars do not know where this place was, so it has no pin.' },
  };
  const tier = (lat, score) => (lat === null ? 'unknown' : score >= 500 ? 'established' : score >= 200 ? 'debated' : 'uncertain');
  const place = (data, id) => {
    const [name, lat, lon, kind, score] = data.places[id];
    return { id, name, lat, lon, kind, score, confidence: tier(lat, score) };
  };

  const eraFor = (eras, bookId, ch) =>
    eras.find((e) => e.books.some((b) => b.book === bookId && (!b.chapters || (ch >= b.chapters[0] && ch <= b.chapters[1]))));

  const readUrl = (book, ch, verse) => `read.html?book=${book}&chapter=${ch}${verse ? `&verse=${verse}` : ''}`;

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  /** Wraps exact place names in a verse (whole words only), the same way the app does. */
  const linkNames = (text, names, make) => {
    if (!names.length) return esc(text);
    const sorted = [...names].sort((a, b) => b.length - a.length).map(reEsc);
    return text
      .split(new RegExp(`\\b(${sorted.join('|')})\\b`))
      .map((part, i) => (i % 2 ? make(part) : esc(part)))
      .join('');
  };

  const ICON = {
    map: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/></svg>',
    time: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    book: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 6c-2-1.5-5-2-8-1.5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5v-13c-3-.5-6 0-8 1.5z"/><path d="M12 6v13"/></svg>',
  };

  const params = () => new URLSearchParams(location.search);

  // Mobile menu
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.querySelector('.menu-btn');
    const nav = document.querySelector('.nav');
    if (btn && nav) {
      btn.addEventListener('click', () => {
        const open = nav.classList.toggle('open');
        btn.setAttribute('aria-expanded', String(open));
      });
    }
    const year = document.querySelector('[data-year]');
    if (year) year.textContent = new Date().getFullYear();
  });

  return { ICON, json, books, places, timeline, daily, bible, chapterTitle, CONFIDENCE, place, eraFor, readUrl, esc, linkNames, params };
})();
