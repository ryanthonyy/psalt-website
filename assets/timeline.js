/* The Bible timeline: ten eras, their dated moments and books, the same as the app. */
(async () => {
  const [books, tl] = await Promise.all([Psalt.books(), Psalt.timeline()]);
  const bookById = Object.fromEntries(books.map((b) => [b.id, b]));
  const C = tl.certainty;

  // Key (on demand)
  const keyBtn = document.getElementById('key-btn');
  const key = document.getElementById('key');
  key.innerHTML =
    Object.values(C)
      .map((c) => `<div><span class="dot" style="background:${c.color}"></span><span><strong>${c.label}.</strong> ${c.about}</span></div>`)
      .join('') +
    '<p class="muted small" style="margin:0">Dates follow a traditional chronology (for example, an exodus around 1446 BC). The colors are a judgment about the kind of evidence, not a measured percentage.</p>';
  keyBtn.addEventListener('click', () => {
    key.hidden = !key.hidden;
    keyBtn.setAttribute('aria-expanded', String(!key.hidden));
  });

  document.getElementById('strip').innerHTML = tl.eras
    .map((e) => `<a class="chip" href="#${e.id}">${Psalt.esc(e.name)}</a>`)
    .join('');

  const bookLabel = (eb) => {
    const b = bookById[eb.book];
    if (!b) return '';
    const range = eb.chapters ? ` ${eb.chapters[0]}–${eb.chapters[1]}` : '';
    return `<a class="chip" href="${Psalt.readUrl(b.id, eb.chapters ? eb.chapters[0] : 1)}">${Psalt.esc(b.name)}${range}</a>`;
  };

  document.getElementById('eras').innerHTML = tl.eras
    .map((e) => `
      <article class="card era" id="${e.id}">
        <div class="era-head">
          <span class="years">${Psalt.esc(e.years)}</span>
          <h2 style="font-size:32px">${Psalt.esc(e.name)}</h2>
          <p class="muted" style="margin:0">${Psalt.esc(e.summary)}</p>
        </div>
        <ol class="events">
          ${e.events
            .map((ev, i) => {
              const c = C[ev.certainty];
              const ref = ev.ref && bookById[ev.ref[0]] ? ev.ref : null;
              const name = ref
                ? `<a href="${Psalt.readUrl(ref[0], ref[1])}">${Psalt.esc(ev.name)}</a> <span class="muted small">${Psalt.esc(Psalt.chapterTitle(bookById[ref[0]], ref[1]))}</span>`
                : Psalt.esc(ev.name);
              const basis = ev.basis || c.about;
              return `<li class="event">
                <span class="date">
                  <button aria-expanded="false" aria-controls="b-${e.id}-${i}" title="${c.label}: what this date rests on"><span class="dot" style="background:${c.color}"></span></button>
                  ${Psalt.esc(ev.date)}
                </span>
                <span class="name">${name}</span>
                <span class="basis" id="b-${e.id}-${i}" hidden><strong>${c.label}.</strong> ${Psalt.esc(basis)}</span>
              </li>`;
            })
            .join('')}
        </ol>
        <div style="display:grid;gap:8px">
          <p class="eyebrow" style="color:var(--muted)">Books in this era</p>
          <div class="era-books">${e.books.map(bookLabel).join('')}</div>
        </div>
      </article>`)
    .join('');

  document.querySelectorAll('.event .date button').forEach((b) =>
    b.addEventListener('click', () => {
      const box = document.getElementById(b.getAttribute('aria-controls'));
      box.hidden = !box.hidden;
      b.setAttribute('aria-expanded', String(!box.hidden));
    })
  );

  // Arriving from a link like timeline.html#exile: scroll to that era once it exists.
  if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
})();
