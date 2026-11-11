/* The Bible map: places from OpenBible.info (top-ranked identification only), colored by confidence. */
(async () => {
  const [books, data] = await Promise.all([Psalt.books(), Psalt.places()]);
  const bookById = Object.fromEntries(books.map((b) => [b.id, b]));
  const C = Psalt.CONFIDENCE;

  // Every mention of every place: id -> [{ book, chapter, verses }], in Bible order.
  const order = Object.fromEntries(books.map((b, i) => [b.id, i]));
  const mentions = new Map();
  Object.entries(data.chapters)
    .map(([key, list]) => {
      const [book, ch] = key.split(':');
      return { book, chapter: Number(ch), list };
    })
    .sort((a, b) => order[a.book] - order[b.book] || a.chapter - b.chapter)
    .forEach(({ book, chapter, list }) =>
      list.forEach(([id, verses]) => {
        if (!mentions.has(id)) mentions.set(id, []);
        mentions.get(id).push({ book, chapter, verses });
      })
    );
  const all = [...mentions.keys()].map((id) => Psalt.place(data, id));
  const mappedBooks = books.filter((b) => all.some((p) => mentions.get(p.id).some((m) => m.book === b.id)));

  // State
  const params = Psalt.params();
  let book = bookById[params.get('book')] ? params.get('book') : '';
  let chapter = Number(params.get('chapter')) || 0;
  let onlyEstablished = false;
  let selected = params.get('place') ? Number(params.get('place')) : null;

  // Controls
  const bookSel = document.getElementById('book');
  bookSel.innerHTML = `<option value="">All books</option>` + ['ot', 'nt']
    .map((t) => `<optgroup label="${t === 'ot' ? 'Old Testament' : 'New Testament'}">${mappedBooks
      .filter((b) => b.testament === t)
      .map((b) => `<option value="${b.id}">${Psalt.esc(b.name)}</option>`)
      .join('')}</optgroup>`)
    .join('');
  bookSel.value = book;
  bookSel.addEventListener('change', () => {
    book = bookSel.value;
    chapter = 0;
    selected = null;
    search.value = '';
    syncUrl();
    draw(true);
  });
  const search = document.getElementById('search');
  search.addEventListener('input', () => {
    selected = null;
    renderPanel();
  });

  const keyBtn = document.getElementById('key-btn');
  const key = document.getElementById('key');
  key.innerHTML =
    ['established', 'debated', 'uncertain']
      .map((t) => `<div><span class="dot" style="background:${C[t].color}"></span><span><strong>${C[t].label}.</strong> ${C[t].about}</span></div>`)
      .join('') +
    `<div><span class="dot" style="background:transparent;border:2px solid ${C.unknown.color}"></span><span><strong>No pin.</strong> ${C.unknown.about}</span></div>` +
    `<label class="switch"><input type="checkbox" id="only"> Show well-established places only</label>`;
  keyBtn.addEventListener('click', () => {
    key.hidden = !key.hidden;
    keyBtn.setAttribute('aria-expanded', String(!key.hidden));
  });
  document.getElementById('only').addEventListener('change', (e) => {
    onlyEstablished = e.target.checked;
    draw(false);
  });

  // Map
  const dark = matchMedia('(prefers-color-scheme: dark)').matches;
  const map = L.map('map', { zoomControl: true, worldCopyJump: true, preferCanvas: true }).setView([31.8, 35.2], 6);
  L.tileLayer(`https://{s}.basemaps.cartocdn.com/${dark ? 'dark_all' : 'rastertiles/voyager'}/{z}/{x}/{y}{r}.png`, {
    maxZoom: 18,
    subdomains: 'abcd',
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
  }).addTo(map);
  const layer = L.layerGroup().addTo(map);
  const markers = new Map();

  function visible() {
    return all.filter((p) => {
      const ms = mentions.get(p.id);
      if (book && !ms.some((m) => m.book === book && (!chapter || m.chapter === chapter))) return false;
      if (onlyEstablished && p.confidence !== 'established') return false;
      return true;
    });
  }

  function draw(fit) {
    layer.clearLayers();
    markers.clear();
    const pins = visible().filter((p) => p.lat !== null);
    pins.forEach((p) => {
      const m = L.circleMarker([p.lat, p.lon], style(p)).addTo(layer);
      m.bindTooltip(p.name, { direction: 'top', offset: [0, -6] });
      m.on('click', () => {
        select(p.id, false);
        // On phones the panel sits under the map: bring the place's verses into view.
        if (matchMedia('(max-width: 860px)').matches) document.querySelector('.panel').scrollIntoView({ behavior: 'smooth' });
      });
      markers.set(p.id, m);
    });
    if (fit && pins.length) map.fitBounds(L.latLngBounds(pins.map((p) => [p.lat, p.lon])).pad(0.15), { maxZoom: 9 });
    renderPanel();
  }

  function style(p) {
    const on = p.id === selected;
    return {
      radius: on ? 10 : 6,
      color: on ? (dark ? '#ECE8DE' : '#132033') : dark ? '#0B121D' : '#FFFFFF',
      weight: on ? 3 : 1.5,
      fillColor: C[p.confidence].color,
      fillOpacity: 0.95,
    };
  }

  function select(id, pan) {
    const prev = selected;
    selected = id;
    [prev, id].forEach((x) => {
      const m = markers.get(x);
      if (m) m.setStyle(style(Psalt.place(data, x)));
    });
    const p = Psalt.place(data, id);
    if (pan && p.lat !== null) map.setView([p.lat, p.lon], Math.max(map.getZoom(), 8));
    markers.get(id)?.bringToFront();
    syncUrl();
    renderPanel();
  }

  function syncUrl() {
    const q = new URLSearchParams();
    if (book) q.set('book', book);
    if (book && chapter) q.set('chapter', chapter);
    if (selected !== null) q.set('place', selected);
    history.replaceState(null, '', `${location.pathname}${q.toString() ? `?${q}` : ''}`);
  }

  // Panel
  const body = document.getElementById('body');
  function renderPanel() {
    if (selected !== null) return renderPlace(Psalt.place(data, selected));
    const q = search.value.trim().toLowerCase();
    let list = q ? all.filter((p) => p.name.toLowerCase().includes(q)) : visible();
    const count = (p) => mentions.get(p.id).filter((m) => !book || (m.book === book && (!chapter || m.chapter === chapter))).length;
    list = list.sort((a, b) => count(b) - count(a) || a.name.localeCompare(b.name)).slice(0, 80);
    const scope = book ? (chapter ? Psalt.chapterTitle(bookById[book], chapter) : bookById[book].name) : 'the Bible';
    const head = q
      ? `<p class="muted small" style="margin:0">${list.length ? `Places matching “${Psalt.esc(search.value.trim())}”` : 'No places match that name.'}</p>`
      : `<div style="display:grid;gap:4px"><h2 style="font-size:26px">Places in ${Psalt.esc(scope)}</h2><p class="muted small" style="margin:0">Most mentioned first. Tap one to read its verses.</p></div>`;
    const chapterChip = book && chapter
      ? `<div class="row"><button class="chip" id="all-ch">All of ${Psalt.esc(bookById[book].name)}</button><a class="chip" href="${Psalt.readUrl(book, chapter)}">${Psalt.ICON.book} Read ${Psalt.esc(Psalt.chapterTitle(bookById[book], chapter))}</a></div>`
      : '';
    body.innerHTML = head + chapterChip + `<ul class="place-list">${list
      .map((p) => `<li><button data-id="${p.id}"><span class="dot" style="${p.lat === null ? `border:2px solid ${C.unknown.color}` : `background:${C[p.confidence].color}`}"></span>${Psalt.esc(p.name)}<span class="count">${count(p)}</span></button></li>`)
      .join('')}</ul>`;
    body.querySelectorAll('[data-id]').forEach((b) => b.addEventListener('click', () => select(Number(b.dataset.id), true)));
    document.getElementById('all-ch')?.addEventListener('click', () => {
      chapter = 0;
      syncUrl();
      draw(true);
    });
  }

  let renderToken = 0;
  async function renderPlace(p) {
    const token = ++renderToken;
    const ms = mentions.get(p.id).filter((m) => !book || m.book === book);
    const conf = C[p.confidence];
    body.innerHTML = `
      <button class="back" id="back">← ${book ? `Places in ${Psalt.esc(bookById[book].name)}` : 'All places'}</button>
      <div style="display:grid;gap:6px">
        <h2 style="font-size:30px">${Psalt.esc(p.name)}</h2>
        <button class="chip" id="conf" aria-expanded="false" style="justify-self:start"><span class="dot" style="${p.lat === null ? `border:2px solid ${conf.color}` : `background:${conf.color}`}"></span>${conf.label}</button>
        <p class="muted small" id="conf-about" hidden style="margin:0">${conf.about}</p>
      </div>
      <p class="muted small" style="margin:0">Mentioned in ${ms.length} chapter${ms.length === 1 ? '' : 's'}${book ? ` of ${Psalt.esc(bookById[book].name)}` : ''}.</p>
      <div id="mentions"></div>
      <button class="btn outline small" id="more" hidden>Show more</button>`;
    document.getElementById('back').addEventListener('click', () => {
      const prev = selected;
      selected = null;
      const m = markers.get(prev);
      if (m) m.setStyle(style(Psalt.place(data, prev)));
      syncUrl();
      renderPanel();
    });
    const confBtn = document.getElementById('conf');
    confBtn.addEventListener('click', () => {
      const about = document.getElementById('conf-about');
      about.hidden = !about.hidden;
      confBtn.setAttribute('aria-expanded', String(!about.hidden));
    });
    const box = document.getElementById('mentions');
    const more = document.getElementById('more');
    const nameRe = new RegExp(`\\b(${p.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'g');
    let shown = 0;
    const page = async () => {
      const slice = ms.slice(shown, shown + 12);
      shown += slice.length;
      const html = [];
      for (const m of slice) {
        const text = (await Psalt.bible(m.book))[m.chapter - 1] || [];
        if (token !== renderToken) return;
        const b = bookById[m.book];
        html.push(`<div class="mention">
          <h4>${Psalt.esc(Psalt.chapterTitle(b, m.chapter))}</h4>
          ${m.verses.map((v) => `<p class="verse"><sup>${v}</sup>${Psalt.esc(text[v - 1] || '').replace(nameRe, '<mark>$1</mark>')}</p>`).join('')}
          <a class="small" href="${Psalt.readUrl(m.book, m.chapter, m.verses[0])}" style="font-weight:800">Read ${Psalt.esc(Psalt.chapterTitle(b, m.chapter))} in full →</a>
        </div>`);
      }
      box.insertAdjacentHTML('beforeend', html.join(''));
      more.hidden = shown >= ms.length;
    };
    more.addEventListener('click', page);
    await page();
  }

  draw(true);
  if (selected !== null && mentions.has(selected)) select(selected, true);
  else selected = null;
})();
