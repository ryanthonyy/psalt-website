/* Quiz: the app's chapter quizzes and Bible trivia, with medals saved in this browser. */
(async () => {
  const [books, data] = await Promise.all([Psalt.books(), Psalt.json('/data/quizzes.json')]);
  const bookById = Object.fromEntries(books.map((b) => [b.id, b]));
  const LEVELS = {
    easy: { name: 'Easy', about: 'Well-known stories' },
    medium: { name: 'Medium', about: 'Names, places and details' },
    hard: { name: 'Hard', about: 'Details most readers miss' },
  };
  const TIER = { Gold: '#D9A936', Silver: '#A3AEBB', Bronze: '#C07A45' };
  const RANK = { Bronze: 1, Silver: 2, Gold: 3 };

  // Medals, kept in this browser only (and harmlessly skipped if storage is blocked).
  const KEY = 'psalt:web-medals';
  const load = () => {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || {};
    } catch {
      return {};
    }
  };
  const save = (m) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(m));
    } catch {}
  };

  // Same rule as the app: gold for all right, silver for two-thirds, bronze for at least one.
  const tierFor = (right, total) =>
    right === total ? 'Gold' : right >= Math.ceil((total * 2) / 3) ? 'Silver' : right >= 1 ? 'Bronze' : null;

  const medalSvg = (tier, size = 44) => {
    const col = tier ? TIER[tier] : 'var(--line)';
    return `<svg width="${size}" height="${size}" viewBox="0 0 48 48" aria-label="${tier ? `${tier} medal` : 'No medal yet'}" role="img">
      <path d="M16 4h7l-4 14h-7zM32 4h-7l4 14h7z" fill="${tier ? col : 'none'}" stroke="${col}" stroke-width="2" opacity="${tier ? 0.75 : 1}"/>
      <circle cx="24" cy="30" r="13" fill="${tier ? col : 'none'}" stroke="${col}" stroke-width="2.5"/>
      ${tier ? '<path d="m24 22.5 2.3 4.7 5.2.7-3.8 3.6.9 5.1-4.6-2.4-4.6 2.4.9-5.1-3.8-3.6 5.2-.7z" fill="rgba(255,255,255,.85)"/>' : ''}
    </svg>`;
  };

  // "1 Samuel 17:2" -> verse text from the KJV data.
  const parseRef = (ref) => {
    const m = ref.match(/^(.+) (\d+):(\d+)$/);
    if (!m) return null;
    const name = m[1] === 'Psalm' ? 'Psalms' : m[1];
    const book = books.find((b) => b.name === name);
    return book ? { book, chapter: Number(m[2]), verse: Number(m[3]) } : null;
  };
  const verseText = async (r) => ((await Psalt.bible(r.book.id))[r.chapter - 1] || [])[r.verse - 1] || '';

  // ---- The list ----
  const list = document.getElementById('list');
  const run = document.getElementById('run');

  function renderList() {
    const medals = load();
    document.getElementById('levels').innerHTML = Object.entries(LEVELS)
      .map(([id, l]) => `<a class="card quiz-item" href="?level=${id}">
          ${medalSvg(medals[`level:${id}`], 40)}
          <span><strong>${l.name}</strong><span class="muted small">${l.about} · ${data.levels[id].length} questions</span></span>
        </a>`)
      .join('');
    document.getElementById('chapters').innerHTML = Object.keys(data.chapters)
      .map((key) => {
        const [b, ch] = key.split(':');
        const book = bookById[b];
        return `<a class="card quiz-item" href="?chapter=${key}">
          ${medalSvg(medals[key], 40)}
          <span><strong>${Psalt.esc(Psalt.chapterTitle(book, Number(ch)))}</strong><span class="muted small">3 questions</span></span>
        </a>`;
      })
      .join('');
  }

  // ---- Taking a quiz ----
  async function start({ key, title, questions, readUrl }) {
    list.hidden = true;
    run.hidden = false;
    window.scrollTo(0, 0);
    let i = 0;
    let right = 0;

    const show = () => {
      const q = questions[i];
      run.innerHTML = `
        <div class="quiz-run">
          <div class="row" style="justify-content:space-between">
            <a class="back" href="/quiz">← All quizzes</a>
            <span class="muted small">${Psalt.esc(title)} · ${i + 1} of ${questions.length}</span>
          </div>
          <div class="quiz-progress" aria-hidden="true"><span style="width:${(i / questions.length) * 100}%"></span></div>
          <h2 class="quiz-q">${Psalt.esc(q.q)}</h2>
          <div class="quiz-options" role="group" aria-label="Answers">
            ${q.o.map((o, n) => `<button class="quiz-opt" data-n="${n}">${Psalt.esc(o)}</button>`).join('')}
          </div>
          <div id="explain" aria-live="polite"></div>
        </div>`;
      run.querySelectorAll('.quiz-opt').forEach((btn) => btn.addEventListener('click', () => answer(Number(btn.dataset.n))));
      run.querySelector('.quiz-opt')?.focus({ preventScroll: true });
    };

    const answer = async (n) => {
      const q = questions[i];
      const ok = n === q.a;
      if (ok) right++;
      run.querySelectorAll('.quiz-opt').forEach((b) => {
        b.disabled = true;
        const k = Number(b.dataset.n);
        if (k === q.a) b.classList.add('right');
        else if (k === n) b.classList.add('wrong');
      });
      const r = parseRef(q.ref);
      const text = r ? await verseText(r) : '';
      const last = i === questions.length - 1;
      document.getElementById('explain').innerHTML = `
        <div class="card quiz-verse">
          <p class="eyebrow" style="color:${ok ? 'var(--brine)' : 'var(--gold)'}">${ok ? 'That’s right' : 'Not quite'}</p>
          ${text ? `<p class="verse">“${Psalt.esc(text)}”</p>` : ''}
          <p class="muted small" style="margin:0">${Psalt.esc(q.ref)} · KJV${r ? ` · <a href="${Psalt.readUrl(r.book.id, r.chapter, r.verse)}">Read in context</a>` : ''}</p>
        </div>
        <button class="btn" id="next">${last ? 'See your result' : 'Next question'}</button>`;
      const next = document.getElementById('next');
      next.focus({ preventScroll: true });
      next.addEventListener('click', () => {
        i++;
        if (i < questions.length) show();
        else finish();
      });
    };

    const finish = () => {
      const tier = tierFor(right, questions.length);
      const medals = load();
      const prev = medals[key];
      const better = tier && (!prev || RANK[tier] > RANK[prev]);
      if (better) {
        medals[key] = tier;
        save(medals);
      }
      run.innerHTML = `
        <div class="quiz-run quiz-result">
          ${medalSvg(tier, 96)}
          <p class="eyebrow">${Psalt.esc(title)}</p>
          <h2 class="quiz-q">${right} of ${questions.length} right</h2>
          <p class="lead">${tier ? `${better ? 'You earned' : 'You got'} a ${tier.toLowerCase()} medal.${!better && prev ? ` Your best is still ${prev.toLowerCase()}.` : ''}` : 'No medal this time. Read it again and have another go.'}</p>
          <div class="hero-actions" style="justify-content:center">
            <a class="btn" href="${location.pathname}${location.search}">Try again</a>
            ${readUrl ? `<a class="btn outline" href="${readUrl}">Read the chapter</a>` : ''}
            <a class="btn outline" href="/quiz">More quizzes</a>
          </div>
          <div class="card app-cta">
            <strong>Keep your medals in the Psalt app</strong>
            <span class="muted small">Collect verse cards, earn a medal for each book, and keep your progress with you every day.</span>
            <a class="btn small" href="/#beta">Join the beta</a>
          </div>
        </div>`;
    };

    show();
  }

  // ---- Which view? ----
  const p = Psalt.params();
  const ch = p.get('chapter');
  const lv = p.get('level');
  if (ch && data.chapters[ch]) {
    const [b, n] = ch.split(':');
    const title = Psalt.chapterTitle(bookById[b], Number(n));
    document.title = `${title} quiz · Psalt`;
    start({ key: ch, title, questions: data.chapters[ch], readUrl: Psalt.readUrl(b, Number(n)) });
  } else if (lv && data.levels[lv]) {
    document.title = `${LEVELS[lv].name} Bible trivia · Psalt`;
    start({ key: `level:${lv}`, title: `${LEVELS[lv].name} trivia`, questions: data.levels[lv] });
  } else {
    renderList();
  }
})();
