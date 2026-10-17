(function () {
  const S = window.SURVEY, C = window.CONFIG, NA = S.NA;
  const secs = S.sections;
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let cur = 0;
  const form = $('#form');

  /* ---------- header / cover ---------- */
  function logoHtml(cls, fb) {
    return '<img class="' + cls + '" src="' + esc(C.LOGO) + '" alt="' + esc(C.UNIVERSITY) + ' logo" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">' +
      '<div class="' + fb + '">UoG</div>';
  }
  $('#topLogo').innerHTML = logoHtml('', 'logo-fallback');
  $('#topUni').textContent = C.UNIVERSITY;
  $('#topDept').textContent = C.DEPARTMENT + ' • ' + C.PROGRAM;
  $('#cover').innerHTML =
    logoHtml('bigLogo', 'bigFallback') +
    '<div class="uni">' + esc(C.UNIVERSITY) + '</div>' +
    '<div class="meta">' + esc(C.DEPARTMENT) + ' • ' + esc(C.PROGRAM) + '</div>' +
    '<div class="rule"></div>' +
    '<h1>' + esc(C.STUDY_TITLE) + '</h1>' +
    '<div class="meta">Academic Research Survey</div>' +
    '<div class="meta">Researcher: <b>' + esc(C.RESEARCHER) + '</b> &nbsp;|&nbsp; Supervisor: <b>' + esc(C.SUPERVISOR) + '</b> &nbsp;|&nbsp; Session ' + esc(C.SESSION) + '</div>' +
    '<div class="rule"></div>' +
    '<div class="note">This questionnaire is part of an academic research study conducted as part of the ' + esc(C.PROGRAM) +
    ' program. Its purpose is to assess gastrointestinal symptoms and selected factors that may be associated with intestinal parasitic infections. ' +
    'Your responses will be used for academic research purposes only and will be treated confidentially. Please answer each question honestly. ' +
    'It takes about 8–10 minutes.</div>' +
    '<p style="margin-top:20px"><button class="btn" id="startBtn">Start Survey</button></p>';
  if (!C.SCRIPT_URL) $('#demoBanner').classList.remove('hide');

  /* ---------- render questions ---------- */
  function qHtml(q) {
    const req = q.optional ? '' : ' <span class="req">*</span>';
    let body = '';
    if (q.type === 'radio' || q.type === 'checkbox') {
      const t = q.type;
      body = '<div class="opts">' + q.options.map((o) =>
        '<label class="pill"><input type="' + t + '" name="' + q.id + '" value="' + esc(o) + '"><span>' + esc(o) + '</span></label>').join('') + '</div>';
    } else if (q.type === 'grid') {
      body = q.rows.map((r) =>
        '<div class="grow"><div class="glabel">' + esc(r) + '</div><div class="opts small">' + q.cols.map((c) =>
          '<label class="pill"><input type="radio" name="' + q.id + '.' + esc(r) + '" value="' + esc(c) + '"><span>' + esc(c) + '</span></label>').join('') + '</div></div>').join('');
    } else if (q.type === 'scale') {
      let b = '';
      for (let i = q.min; i <= q.max; i++) b += '<label class="pill"><input type="radio" name="' + q.id + '" value="' + i + '"><span>' + i + '</span></label>';
      body = '<div class="scale">' + b + '</div><div class="scalelab"><span>' + esc(q.low) + '</span><span>' + esc(q.high) + '</span></div>';
    } else if (q.type === 'text') {
      body = '<input type="text" name="' + q.id + '" autocomplete="name">';
    } else if (q.type === 'date') {
      body = '<input type="date" name="' + q.id + '">';
    } else if (q.type === 'textarea') {
      body = '<textarea name="' + q.id + '"></textarea>';
    }
    return '<div class="q" data-q="' + q.id + '"><span class="ql">' + esc(q.text) + req + '</span>' + body + '</div>';
  }

  form.innerHTML = secs.map((s, i) =>
    '<div class="card sec" data-sec="' + i + '" style="display:none"><h2 class="sectitle">Section ' + s.id + ' — ' + esc(s.title) + '</h2>' +
    s.questions.map(qHtml).join('') +
    (s.id === 'A' ? '<div class="warn hide" id="noConsent">You chose not to participate. Thank you for your time — you may close this page. To continue, select “Yes, I agree”.</div>' : '') +
    '<div class="btnrow">' +
    '<button type="button" class="btn sec" data-act="back"' + (i === 0 ? ' style="visibility:hidden"' : '') + '>← Back</button>' +
    (i === secs.length - 1 ? '<button type="button" class="btn" data-act="submit">Submit Survey</button>' : '<button type="button" class="btn" data-act="next">Next →</button>') +
    '</div></div>').join('');

  const dateIn = form.querySelector('input[name="A3"]');
  if (dateIn) dateIn.value = new Date().toISOString().slice(0, 10);

  /* ---------- helpers ---------- */
  function val(name) { return new FormData(form).getAll(name); }
  const allQ = [];
  secs.forEach((s, i) => s.questions.forEach((q) => allQ.push({ q: q, sec: i })));

  function isHidden(q) {
    if (!q.showIf) return false;
    const v = val(q.showIf.q)[0];
    if (v === undefined) return true;
    if (q.showIf.eq !== undefined) return v !== q.showIf.eq;
    return v === q.showIf.neq;
  }
  function applyLogic() {
    allQ.forEach((o) => {
      if (o.q.showIf) form.querySelector('[data-q="' + o.q.id + '"]').classList.toggle('hidden', isHidden(o.q));
    });
    const c = val('A1')[0];
    $('#noConsent').classList.toggle('hide', !(c && c.indexOf('No') === 0));
  }
  form.addEventListener('change', () => { applyLogic(); });
  form.addEventListener('input', (e) => { const qd = e.target.closest('.q'); if (qd) qd.classList.remove('err'); });

  function answered(q) {
    if (q.optional) return true;
    if (q.type === 'grid') return q.rows.every((r) => val(q.id + '.' + r).length);
    if (q.type === 'text' || q.type === 'date' || q.type === 'textarea') return (val(q.id)[0] || '').trim() !== '';
    return val(q.id).length > 0;
  }

  function validate(i) {
    let firstBad = null;
    secs[i].questions.forEach((q) => {
      const el = form.querySelector('[data-q="' + q.id + '"]');
      if (isHidden(q)) { el.classList.remove('err'); return; }
      const ok = answered(q);
      el.classList.toggle('err', !ok);
      if (!ok && !firstBad) firstBad = el;
    });
    if (i === 0) {
      const c = val('A1')[0];
      if (c && c.indexOf('No') === 0) { $('#noConsent').scrollIntoView({ behavior: 'smooth', block: 'center' }); return false; }
    }
    if (firstBad) { firstBad.scrollIntoView({ behavior: 'smooth', block: 'center' }); return false; }
    return true;
  }

  function show(i) {
    cur = i;
    form.querySelectorAll('.sec').forEach((el) => { el.style.display = Number(el.dataset.sec) === i ? 'block' : 'none'; });
    $('#bar').style.width = ((i + 1) / secs.length * 100) + '%';
    $('#pinfo').innerHTML = '<span>Section ' + secs[i].id + ' of ' + secs[secs.length - 1].id + '</span><span>' + Math.round((i + 1) / secs.length * 100) + '%</span>';
    applyLogic();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---------- collect ---------- */
  function collect() {
    const a = {};
    allQ.forEach((o) => {
      const q = o.q, hid = isHidden(q);
      if (q.type === 'grid') {
        q.rows.forEach((r) => { a[q.id + '.' + r] = hid ? NA : (val(q.id + '.' + r)[0] || ''); });
      } else if (q.type === 'checkbox') {
        a[q.id] = hid ? NA : val(q.id).join('; ');
      } else {
        a[q.id] = hid ? NA : ((val(q.id)[0] || '').trim());
      }
    });
    return a;
  }

  function payload(a) {
    const labels = {}, layout = [];
    secs.forEach((s) => {
      const items = [];
      s.questions.forEach((q) => S.keysOf(q).forEach((k) => { labels[k.key] = k.label; items.push(k); }));
      layout.push({ title: 'Section ' + s.id + ' — ' + s.title, items: items });
    });
    return {
      id: 'R' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase(),
      submittedAt: new Date().toISOString(),
      study: C.STUDY_TITLE,
      answers: a,
      scores: window.Scoring.compute(a),
      layout: layout,
      labels: labels
    };
  }

  /* ---------- submit ---------- */
  async function send(p) {
    if (!C.SCRIPT_URL) {
      const k = 'uog_survey_demo';
      const old = JSON.parse(localStorage.getItem(k) || '[]');
      old.push(p); localStorage.setItem(k, JSON.stringify(old));
      return 'demo';
    }
    await fetch(C.SCRIPT_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(p) });
    return 'sent';
  }

  async function doSubmit(btn) {
    for (let i = 0; i < secs.length; i++) { if (!validate(i)) { show(i); return; } }
    const a = collect(), p = payload(a);
    btn.disabled = true; btn.textContent = 'Submitting…';
    try {
      const mode = await send(p);
      showDone(p, mode);
    } catch (err) {
      const q = JSON.parse(localStorage.getItem('uog_survey_pending') || '[]'); q.push(p);
      localStorage.setItem('uog_survey_pending', JSON.stringify(q));
      btn.disabled = false; btn.textContent = 'Submit Survey';
      alert('Could not reach the server. Please check your internet connection and press Submit again.');
    }
  }

  function showDone(p, mode) {
    const s = p.scores;
    $('#formWrap').classList.add('hide');
    const d = $('#done'); d.classList.remove('hide');
    d.innerHTML =
      '<div class="card"><h2>Thank you for participating!</h2>' +
      '<p>Your response has been ' + (mode === 'demo' ? 'saved locally (demo mode — it was <b>not</b> emailed)' : 'recorded and sent to the researcher') + '. Reference ID: <b>' + p.id + '</b></p>' +
      '<div class="stat">' +
      '<div><b>' + s.SCORE_SymptomCount + '</b><small>GI symptoms reported</small></div>' +
      '<div><b>' + (s.SCORE_HygieneIndex === '' ? '—' : s.SCORE_HygieneIndex + '%') + '</b><small>Hygiene practice (' + (s.SCORE_HygieneLevel || '—') + ')</small></div>' +
      '<div><b>' + (s.SCORE_ExposureIndex === '' ? '—' : s.SCORE_ExposureIndex + '%') + '</b><small>Exposure risk (' + (s.SCORE_ExposureLevel || '—') + ')</small></div>' +
      '</div>' +
      '<div class="interp"><b>Your summary:</b> ' + esc(s.SCORE_Interpretation) + '</div>' +
      '<p style="color:#5f6b7a;font-size:14px">Tip: washing hands with soap before eating and after using the toilet, drinking boiled/filtered water and washing raw vegetables and fruit are simple ways to lower the risk of intestinal infections. If you have ongoing symptoms, please consult a doctor.</p>' +
      '</div>';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---------- events ---------- */
  $('#startBtn').addEventListener('click', () => {
    $('#coverWrap').classList.add('hide');
    $('#formWrap').classList.remove('hide');
    show(0);
  });
  form.addEventListener('click', (e) => {
    const act = e.target.dataset && e.target.dataset.act;
    if (!act) return;
    if (act === 'back') show(cur - 1);
    if (act === 'next') { if (validate(cur)) show(cur + 1); }
    if (act === 'submit') { if (validate(cur)) doSubmit(e.target); }
  });
})();
