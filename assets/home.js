/* Home page: today's verse and the beta sign-up. */
(async () => {
  // Psalt Daily: the same verse of the day as the app (by the visitor's own date).
  try {
    const daily = await Psalt.daily();
    const now = new Date();
    const key = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const v = daily[key] || daily['01-01'];
    document.getElementById('daily-text').textContent = `“${v.text}”`;
    document.getElementById('daily-ref').textContent = v.ref;
    document.getElementById('daily-date').textContent = now.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
    document.getElementById('daily-read').href = Psalt.readUrl(v.book, v.chapter, v.end && v.end !== v.verse ? `${v.verse}-${v.end}` : v.verse);
    const copy = document.getElementById('daily-copy');
    copy.addEventListener('click', () => copyText(`“${v.text}” ${v.ref} (KJV) · thepsalt.com`, copy));
  } catch (e) {
    console.warn(e);
  }

  // Copy buttons
  document.querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', () => copyText(b.dataset.copy, b)));

  // Beta sign-up: the form appears once a form endpoint is set on it (see README); until then, email.
  const form = document.getElementById('beta-form');
  if (form && form.dataset.endpoint) {
    form.hidden = false;
    document.getElementById('beta-email').hidden = true;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const done = document.getElementById('beta-done');
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      try {
        const r = await fetch(form.dataset.endpoint, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
        if (!r.ok) throw new Error();
        form.reset();
        done.textContent = "Thank you! You're on the list. We'll email you when the beta is ready.";
      } catch {
        done.textContent = 'Something went wrong. Please email team@thepsalt.com instead.';
      }
      done.hidden = false;
      btn.disabled = false;
    });
  }
})();

function copyText(text, btn) {
  const label = btn.textContent;
  const ok = () => {
    btn.textContent = 'Copied';
    setTimeout(() => (btn.textContent = label), 1600);
  };
  if (navigator.clipboard) navigator.clipboard.writeText(text).then(ok, () => {});
}
