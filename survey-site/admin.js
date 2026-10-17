(function () {
  const S = window.SURVEY, C = window.CONFIG, NA = S.NA, SC = window.Scoring;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const str = (v) => (v === undefined || v === null) ? '' : String(v).trim();
  const f1 = (x) => (x === null || isNaN(x)) ? '—' : x.toFixed(1);
  const pc = (n, d) => d ? n / d * 100 : 0;
  const PAL = ['#12355b', '#b8921f', '#2e7d6b', '#a63a3a', '#5b7db1', '#7a5ea8', '#d9822b', '#4f9da6', '#8a8f98'];

  const QS = {};
  S.sections.forEach((s) => s.questions.forEach((q) => { QS[q.id] = Object.assign({ sec: s }, q); }));

  let DATA = [];
  let charts = [];
  let queue = [];
  let exportSheets = null;

  /* ---------- logo / header ---------- */
  $('topLogo').innerHTML = '<img src="' + esc(C.LOGO) + '" alt="logo" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'"><div class="logo-fallback">UoG</div>';
  $('topSub').textContent = C.UNIVERSITY + ' • ' + C.PROGRAM;
  try { $('token').value = sessionStorage.getItem('uog_token') || ''; } catch (e) { }

  /* ---------- statistics helpers ---------- */
  function lgamma(x) {
    const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
    let y = x, t = x + 5.5; t -= (x + 0.5) * Math.log(t);
    let s = 1.000000000190015; for (let j = 0; j < 6; j++) s += c[j] / ++y;
    return -t + Math.log(2.5066282746310005 * s / x);
  }
  function gammaP(a, x) { // regularized lower incomplete gamma
    if (x <= 0) return 0;
    if (x < a + 1) {
      let ap = a, sum = 1 / a, del = sum;
      for (let n = 0; n < 300; n++) { ap++; del *= x / ap; sum += del; if (Math.abs(del) < Math.abs(sum) * 1e-12) break; }
      return sum * Math.exp(-x + a * Math.log(x) - lgamma(a));
    }
    let b = x + 1 - a, c = 1e300, d = 1 / b, h = d;
    for (let i = 1; i < 300; i++) {
      const an = -i * (i - a); b += 2; d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300;
      c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-12) break;
    }
    return 1 - Math.exp(-x + a * Math.log(x) - lgamma(a)) * h;
  }
  function chi2(tab) {
    let t = tab.filter((r) => r.reduce((a, b) => a + b, 0) > 0);
    if (!t.length) return null;
    const cols = t[0].map((_, j) => t.reduce((a, r) => a + r[j], 0));
    const keep = cols.map((c) => c > 0);
    t = t.map((r) => r.filter((_, j) => keep[j]));
    if (t.length < 2 || t[0].length < 2) return null;
    const rs = t.map((r) => r.reduce((a, b) => a + b, 0));
    const cs = t[0].map((_, j) => t.reduce((a, r) => a + r[j], 0));
    const N = rs.reduce((a, b) => a + b, 0);
    let x = 0, small = 0, cells = 0;
    t.forEach((r, i) => r.forEach((o, j) => { const e = rs[i] * cs[j] / N; x += (o - e) * (o - e) / e; cells++; if (e < 5) small++; }));
    const df = (t.length - 1) * (t[0].length - 1);
    return { chi: x, df: df, p: Math.max(0, 1 - gammaP(df / 2, x / 2)), smallPct: small / cells * 100 };
  }
  const fmtP = (p) => p < 0.001 ? '< 0.001' : p.toFixed(3);

  /* ---------- per-question summaries ---------- */
  function freq(id) {
    const q = QS[id], cnt = {};
    let opts = q.options.slice();
    if (q.showIf) opts = opts.filter((o) => o !== NA);
    opts.forEach((o) => { cnt[o] = 0; });
    let N = 0;
    DATA.forEach((r) => {
      const v = str(r[id]); if (!v) return;
      if (q.showIf && v === NA) return;
      N++;
      if (q.type === 'checkbox') v.split('; ').forEach((x) => { if (x === NA) return; cnt[x] = (cnt[x] || 0) + 1; });
      else cnt[v] = (cnt[v] || 0) + 1;
    });
    return { N: N, rows: Object.keys(cnt).map((k) => ({ label: k, n: cnt[k], p: pc(cnt[k], N) })) };
  }
  function grid(id) {
    const q = QS[id];
    const rows = q.rows.map((r) => {
      const cnt = q.cols.map(() => 0); let N = 0, sum = 0;
      DATA.forEach((d) => { const v = str(d[id + '.' + r]); const j = q.cols.indexOf(v); if (j < 0) return; cnt[j]++; N++; sum += j; });
      return { label: r, cnt: cnt, N: N, mean: N ? sum / N : null };
    });
    return { rows: rows, cols: q.cols };
  }
  function scale(id) {
    const q = QS[id]; const v = [];
    DATA.forEach((d) => { const s = str(d[id]); if (s === '' || s === NA) return; const n = Number(s); if (!isNaN(n)) v.push(n); });
    if (!v.length) return { n: 0 };
    const n = v.length, m = v.reduce((a, b) => a + b, 0) / n;
    const sd = n > 1 ? Math.sqrt(v.reduce((a, b) => a + (b - m) * (b - m), 0) / (n - 1)) : 0;
    const s = v.slice().sort((a, b) => a - b);
    const med = n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
    const dist = []; for (let i = q.min; i <= q.max; i++) dist.push(v.filter((x) => x === i).length);
    return { n: n, mean: m, sd: sd, median: med, min: s[0], max: s[n - 1], dist: dist };
  }

  /* ---------- interpretation text ---------- */
  function interpFreq(id, f) {
    const q = QS[id];
    if (!f.N) return 'No valid responses yet.';
    const top = f.rows.slice().sort((a, b) => b.n - a.n)[0];
    const sorted = f.rows.slice().sort((a, b) => b.n - a.n);
    if (q.type === 'checkbox') {
      const two = sorted.slice(0, 3).filter((r) => r.n > 0).map((r) => r.label + ' (' + f1(r.p) + '%)').join(', ');
      return 'Among ' + f.N + ' respondents, the most frequently selected options were ' + two + '. Percentages can exceed 100% in total because more than one option could be chosen.';
    }
    let t = 'Of ' + f.N + ' respondents, the largest group was “' + top.label + '” (' + f1(top.p) + '%, n=' + top.n + ').';
    if (sorted[1] && sorted[1].n > 0) t += ' This was followed by “' + sorted[1].label + '” (' + f1(sorted[1].p) + '%).';
    if (f.rows.length === 2 || (f.rows.length === 3 && f.rows[0].label === 'Yes')) {
      const y = f.rows.find((r) => r.label === 'Yes'); if (y) t = f1(y.p) + '% (' + y.n + ' of ' + f.N + ') answered “Yes”.' + (sorted[1] ? '' : '');
    }
    return t;
  }
  function interpScale(id, s) {
    if (!s.n) return 'No valid responses yet.';
    const lvl = s.mean < 3.5 ? 'low' : s.mean < 6.5 ? 'moderate' : 'high';
    return 'Mean score = ' + f1(s.mean) + ' (SD ' + f1(s.sd) + '), median ' + s.median + ', range ' + s.min + '–' + s.max + ' (n=' + s.n + '), indicating a ' + lvl + ' level on the 0–10 scale.';
  }
  function interpGrid(g) {
    const live = g.rows.filter((r) => r.N);
    if (!live.length) return 'No valid responses yet.';
    const hi = live.slice().sort((a, b) => b.mean - a.mean)[0], lo = live.slice().sort((a, b) => a.mean - b.mean)[0];
    return 'On the ' + g.cols[0] + '→' + g.cols[g.cols.length - 1] + ' scale (0–' + (g.cols.length - 1) + '), “' + hi.label + '” had the highest mean (' + f1(hi.mean) + ') and “' + lo.label + '” the lowest (' + f1(lo.mean) + ').';
  }

  /* ---------- html builders ---------- */
  let cid = 0;
  function chartHtml(tall) { const id = 'ch' + (++cid); return { id: id, html: '<div class="chartbox' + (tall ? ' tall' : '') + '"><canvas id="' + id + '"></canvas></div>' }; }
  function addChart(id, cfg) { queue.push(() => { const ch = new Chart($(id), cfg); charts.push(ch); }); }
  function table(head, rows, numFrom) {
    return '<div class="tblwrap"><table class="tbl"><thead><tr>' + head.map((h, i) => '<th class="' + (i >= numFrom ? 'n' : '') + '">' + esc(h) + '</th>').join('') + '</tr></thead><tbody>' +
      rows.map((r) => '<tr>' + r.map((c, i) => '<td class="' + (i >= numFrom ? 'n' : '') + '">' + c + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
  }
  const interpBox = (t) => '<div class="interp"><b>Interpretation:</b> ' + t + '</div>';

  function freqBlock(id) {
    const q = QS[id], f = freq(id);
    const ch = chartHtml(false);
    const labels = f.rows.map((r) => r.label), data = f.rows.map((r) => +r.p.toFixed(1));
    const small = f.rows.length <= 4 && q.type !== 'checkbox';
    addChart(ch.id, small ? {
      type: 'doughnut', data: { labels: labels, datasets: [{ data: data, backgroundColor: PAL }] },
      options: { maintainAspectRatio: false, plugins: { legend: { position: 'right' }, tooltip: { callbacks: { label: (c) => c.label + ': ' + c.parsed + '%' } } } }
    } : {
      type: 'bar', data: { labels: labels, datasets: [{ label: '% of respondents', data: data, backgroundColor: PAL[0] }] },
      options: { indexAxis: q.type === 'checkbox' || labels.some((l) => l.length > 14) ? 'y' : 'x', maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { [(q.type === 'checkbox' || labels.some((l) => l.length > 14)) ? 'x' : 'y']: { beginAtZero: true, title: { display: true, text: '%' } } } }
    });
    exportSheets.freq.push(...f.rows.map((r) => [q.sec.title, id, q.text, r.label, r.n, +r.p.toFixed(1), f.N]));
    exportSheets.interp.push([id, q.text, interpFreq(id, f).replace(/<[^>]+>/g, '')]);
    return '<h3 class="qh"><span class="qid">' + id + '</span>' + esc(q.text) + '</h3>' +
      table(['Response', 'n', '%'], f.rows.map((r) => [esc(r.label), r.n, f1(r.p) + '%']).concat([['<b>Total respondents</b>', '<b>' + f.N + '</b>', '']]), 1) +
      ch.html + interpBox(esc(interpFreq(id, f)));
  }
  function gridBlock(id) {
    const q = QS[id], g = grid(id), ch = chartHtml(true);
    const ds = g.cols.map((c, j) => ({ label: c, data: g.rows.map((r) => +pc(r.cnt[j], r.N).toFixed(1)), backgroundColor: ['#9fb8d3', '#6f93bd', '#3f6a9c', '#12355b', '#b8921f'][j] }));
    addChart(ch.id, { type: 'bar', data: { labels: g.rows.map((r) => r.label), datasets: ds }, options: { indexAxis: 'y', maintainAspectRatio: false, scales: { x: { stacked: true, max: 100, title: { display: true, text: '% of respondents' } }, y: { stacked: true } } } });
    g.rows.forEach((r) => exportSheets.freq.push(...g.cols.map((c, j) => [q.sec.title, id, q.text + ' — ' + r.label, c, r.cnt[j], +pc(r.cnt[j], r.N).toFixed(1), r.N])));
    exportSheets.interp.push([id, q.text, interpGrid(g)]);
    return '<h3 class="qh"><span class="qid">' + id + '</span>' + esc(q.text) + '</h3>' +
      table([''].concat(g.cols.map((c) => c + ' n (%)')).concat(['Mean']), g.rows.map((r) => [esc(r.label)].concat(r.cnt.map((n) => n + ' (' + f1(pc(n, r.N)) + '%)')).concat([f1(r.mean)])), 1) +
      ch.html + interpBox(esc(interpGrid(g)));
  }
  function scaleBlock(id) {
    const q = QS[id], s = scale(id), ch = chartHtml(false);
    if (s.n) {
      const labels = []; for (let i = q.min; i <= q.max; i++) labels.push(String(i));
      addChart(ch.id, { type: 'bar', data: { labels: labels, datasets: [{ label: 'Respondents', data: s.dist, backgroundColor: PAL[0] }] }, options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: 'Number of respondents' } }, x: { title: { display: true, text: 'Score' } } } } });
    }
    exportSheets.interp.push([id, q.text, interpScale(id, s)]);
    exportSheets.freq.push(...(s.n ? s.dist.map((n, i) => [q.sec.title, id, q.text, String(q.min + i), n, +pc(n, s.n).toFixed(1), s.n]) : []));
    return '<h3 class="qh"><span class="qid">' + id + '</span>' + esc(q.text) + '</h3>' +
      (s.n ? table(['n', 'Mean', 'SD', 'Median', 'Min', 'Max'], [[s.n, f1(s.mean), f1(s.sd), s.median, s.min, s.max]], 0) + ch.html : '') + interpBox(esc(interpScale(id, s)));
  }

  /* ---------- associations ---------- */
  const FACTORS = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'D1', 'D2', 'D4', 'D6', 'E1', 'E2', 'E3', 'G1', 'G2', 'G3'];
  function assoc(factorId, outFn, outName) {
    const q = QS[factorId];
    const rows = q.options.map((o) => ({ label: o, yes: 0, no: 0 }));
    DATA.forEach((d) => {
      const v = str(d[factorId]); const o = outFn(d); if (!v || v === NA || !o) return;
      const r = rows.find((x) => x.label === v); if (!r) return; if (o === 'Yes') r.yes++; else r.no++;
    });
    const live = rows.filter((r) => r.yes + r.no > 0);
    const test = chi2(live.map((r) => [r.yes, r.no]));
    return { q: q, rows: live, test: test };
  }
  function assocBlock(factorId, outFn, outName) {
    const a = assoc(factorId, outFn, outName);
    if (!a.rows.length) return '';
    const withP = a.rows.map((r) => Object.assign({ n: r.yes + r.no, pct: pc(r.yes, r.yes + r.no) }, r));
    const hi = withP.slice().sort((x, y) => y.pct - x.pct)[0], lo = withP.slice().sort((x, y) => x.pct - y.pct)[0];
    let t = esc(outName) + ' was highest among respondents with “' + esc(hi.label) + '” (' + f1(hi.pct) + '%, n=' + hi.n + ') and lowest among “' + esc(lo.label) + '” (' + f1(lo.pct) + '%, n=' + lo.n + '). ';
    let sig = '';
    if (a.test) {
      const ok = a.test.p < 0.05;
      sig = 'χ²(' + a.test.df + ') = ' + a.test.chi.toFixed(2) + ', p ' + (a.test.p < 0.001 ? '< 0.001' : '= ' + a.test.p.toFixed(3));
      t += 'The association was <span class="' + (ok ? 'sig' : 'nsig') + '">' + (ok ? 'statistically significant' : 'not statistically significant') + '</span> (' + sig + ').';
      if (a.test.smallPct > 20) t += ' Caution: more than 20% of cells have expected counts below 5, so the test may be unreliable with this sample size.';
    } else t += 'A chi-square test could not be calculated (too few categories with data).';
    const ch = chartHtml(false);
    addChart(ch.id, { type: 'bar', data: { labels: withP.map((r) => r.label), datasets: [{ label: '% ' + outName, data: withP.map((r) => +r.pct.toFixed(1)), backgroundColor: PAL[3] }] }, options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100, title: { display: true, text: '% ' + outName } } } } });
    withP.forEach((r) => exportSheets.cross.push([outName, a.q.short, r.label, r.yes, r.no, r.n, +r.pct.toFixed(1), a.test ? +a.test.chi.toFixed(3) : '', a.test ? a.test.df : '', a.test ? +a.test.p.toFixed(4) : '']));
    return '<h3 class="qh"><span class="qid">' + factorId + '</span>' + esc(a.q.short) + ' × ' + esc(outName) + (a.test ? ' <small style="color:#5f6b7a;font-weight:400">(p ' + (a.test.p < 0.001 ? '< 0.001' : '= ' + a.test.p.toFixed(3)) + ')</small>' : '') + '</h3>' +
      table([a.q.short, 'Yes (n)', 'No (n)', 'Total', '% ' + outName], withP.map((r) => [esc(r.label), r.yes, r.no, r.n, f1(r.pct) + '%']), 1) + ch.html + interpBox(t);
  }

  /* ---------- report ---------- */
  function render() {
    charts.forEach((c) => c.destroy()); charts = []; queue = []; cid = 0;
    exportSheets = { freq: [], cross: [], interp: [], kpi: [] };
    const N = DATA.length;
    if (!N) { $('report').innerHTML = '<div class="card">No responses loaded yet.</div>'; return; }
    // per-respondent scores
    const sc = DATA.map((d) => SC.compute(d));
    const hy = sc.map((s) => s.SCORE_HygieneIndex).filter((x) => x !== '');
    const ex = sc.map((s) => s.SCORE_ExposureIndex).filter((x) => x !== '');
    const avg = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
    const symN = DATA.filter((d) => str(d.C1) === 'Yes').length;
    const diagN = DATA.filter((d) => str(d.F1) === 'Yes').length;
    const stoolN = DATA.filter((d) => str(d.F2) === 'Yes').length;
    const sev = scale('C5'), dh = scale('H4'), ql = scale('H5');
    const dates = DATA.map((d) => str(d.SubmittedAt) || str(d.A3)).filter(Boolean).sort();

    exportSheets.kpi.push(['Total respondents', N], ['Respondents with GI symptoms (past 3 months)', symN + ' (' + f1(pc(symN, N)) + '%)'],
      ['Previously diagnosed intestinal/parasitic infection', diagN + ' (' + f1(pc(diagN, N)) + '%)'], ['Ever had stool examination', stoolN + ' (' + f1(pc(stoolN, N)) + '%)'],
      ['Mean symptom severity (0-10)', f1(sev.mean)], ['Mean hygiene-practice index (%)', f1(avg(hy))], ['Mean exposure-risk index (%)', f1(avg(ex))],
      ['Mean overall digestive health (0-10)', f1(dh.mean)], ['Mean effect on quality of life (0-10)', f1(ql.mean)]);

    let h = '';
    // cover page
    h += '<div class="card coverpage cover">' +
      '<img class="bigLogo" src="' + esc(C.LOGO) + '" alt="logo" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'"><div class="bigFallback">UoG</div>' +
      '<div class="uni">' + esc(C.UNIVERSITY) + '</div><div class="meta">' + esc(C.DEPARTMENT) + ' • ' + esc(C.PROGRAM) + '</div><div class="rule"></div>' +
      '<h1>' + esc(C.STUDY_TITLE) + '</h1><div class="meta" style="font-size:18px">Survey Data Analysis Report</div><div class="rule"></div>' +
      '<div class="meta">Researcher: <b>' + esc(C.RESEARCHER) + '</b></div><div class="meta">Supervisor: <b>' + esc(C.SUPERVISOR) + '</b></div>' +
      '<div class="meta">Respondents analysed: <b>' + N + '</b>' + (dates.length ? ' • Data from ' + esc(dates[0].slice(0, 10)) + ' to ' + esc(dates[dates.length - 1].slice(0, 10)) : '') + '</div>' +
      '<div class="meta">Report generated: ' + new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) + '</div></div>';

    // summary
    const hyLv = ['Good', 'Moderate', 'Poor'].map((l) => sc.filter((s) => s.SCORE_HygieneLevel === l).length);
    const exLv = ['Low', 'Moderate', 'High'].map((l) => sc.filter((s) => s.SCORE_ExposureLevel === l).length);
    const c1 = chartHtml(false), c2 = chartHtml(false);
    addChart(c1.id, { type: 'doughnut', data: { labels: ['Good', 'Moderate', 'Poor'], datasets: [{ data: hyLv, backgroundColor: ['#2e7d6b', '#b8921f', '#a63a3a'] }] }, options: { maintainAspectRatio: false, plugins: { title: { display: true, text: 'Hygiene-practice level' }, legend: { position: 'bottom' } } } });
    addChart(c2.id, { type: 'doughnut', data: { labels: ['Low', 'Moderate', 'High'], datasets: [{ data: exLv, backgroundColor: ['#2e7d6b', '#b8921f', '#a63a3a'] }] }, options: { maintainAspectRatio: false, plugins: { title: { display: true, text: 'Exposure-risk level' }, legend: { position: 'bottom' } } } });
    const topSym = freq('C2').rows.slice().sort((a, b) => b.n - a.n)[0];
    h += '<div class="card"><h2>1. Executive Summary</h2><div class="stat">' +
      '<div><b>' + N + '</b><small>Respondents</small></div>' +
      '<div><b>' + f1(pc(symN, N)) + '%</b><small>GI symptoms in last 3 months</small></div>' +
      '<div><b>' + f1(pc(diagN, N)) + '%</b><small>Previously diagnosed parasitic/intestinal infection</small></div>' +
      '<div><b>' + f1(pc(stoolN, N)) + '%</b><small>Ever had stool examination</small></div>' +
      '<div><b>' + f1(sev.mean) + '</b><small>Mean severity (0–10)</small></div>' +
      '<div><b>' + f1(avg(hy)) + '%</b><small>Mean hygiene index</small></div>' +
      '<div><b>' + f1(avg(ex)) + '%</b><small>Mean exposure index</small></div></div>' +
      interpBox('Of ' + N + ' respondents, ' + symN + ' (' + f1(pc(symN, N)) + '%) reported gastrointestinal symptoms during the past 3 months' +
        (topSym && topSym.n ? '; the most common symptom was ' + esc(topSym.label.toLowerCase()) + ' (' + f1(topSym.p) + '% of symptomatic respondents)' : '') + '. ' +
        diagN + ' (' + f1(pc(diagN, N)) + '%) reported a previous diagnosis of an intestinal or parasitic infection, and ' + stoolN + ' (' + f1(pc(stoolN, N)) + '%) had undergone stool examination. ' +
        'The mean hygiene-practice index was ' + f1(avg(hy)) + '% and the mean exposure-risk index was ' + f1(avg(ex)) + '%. ' +
        'Note: indices are simple composite scores (0–100) built from the hygiene and exposure items; they are descriptive and not clinically validated.') +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px"><div>' + c1.html + '</div><div>' + c2.html + '</div></div></div>';

    // sections
    S.sections.forEach((sec, si) => {
      if (sec.id === 'A') return;
      let b = '';
      sec.questions.forEach((q) => {
        if (q.type === 'radio' || q.type === 'checkbox') b += freqBlock(q.id);
        else if (q.type === 'grid') b += gridBlock(q.id);
        else if (q.type === 'scale') b += scaleBlock(q.id);
        else if (q.type === 'textarea') {
          const t = DATA.map((d) => str(d[q.id])).filter((x) => x && x !== NA);
          b += '<h3 class="qh"><span class="qid">' + q.id + '</span>' + esc(q.text) + '</h3>' + (t.length ? '<ul>' + t.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>' : '<p style="color:#5f6b7a">No comments.</p>');
        }
      });
      h += '<div class="card sec-break"><h2>' + (si + 1) + '. Section ' + sec.id + ' — ' + esc(sec.title) + '</h2>' + b + '</div>';
    });

    // associations
    const symFn = (d) => str(d.C1) === 'Yes' ? 'Yes' : str(d.C1) === 'No' ? 'No' : '';
    const diagFn = (d) => { const v = str(d.F1); return v === 'Yes' ? 'Yes' : (v === 'No' || v === 'Not sure') ? 'No' : ''; };
    h += '<div class="card sec-break"><h2>' + (S.sections.length + 1) + '. Associations with GI Symptoms</h2>' +
      '<p>Cross-tabulations show the percentage of respondents who reported GI symptoms within each category of a factor. Chi-square tests of independence (α = 0.05) assess whether the association is statistically significant. These are associations only and do not prove cause and effect.</p>' +
      FACTORS.map((f) => assocBlock(f, symFn, 'GI symptoms')).join('') + '</div>';
    h += '<div class="card sec-break"><h2>' + (S.sections.length + 2) + '. Associations with Diagnosed Intestinal/Parasitic Infection</h2>' +
      '<p>“Diagnosed” = answered Yes to F1; “not diagnosed” = No or Not sure.</p>' +
      FACTORS.map((f) => assocBlock(f, diagFn, 'Diagnosed infection')).join('') + '</div>';
    h += '<div class="card"><h2>Limitations</h2><p>Results are based on self-reported, convenience-sampled responses and cannot confirm infection without laboratory stool examination. Small subgroup sizes limit statistical power. Interpretations are auto-generated summaries and should be reviewed by the researcher before inclusion in a thesis.</p></div>';

    $('report').innerHTML = h;
    queue.forEach((fn) => fn());
    $('xlsBtn').disabled = false; $('pdfBtn').disabled = false;
    $('status').textContent = N + ' responses loaded';
  }

  /* ---------- data sources ---------- */
  function setData(rows, label) {
    DATA = rows.map((r) => { const o = {}; Object.keys(r).forEach((k) => { o[k] = r[k]; }); return o; });
    $('status').textContent = label;
    render();
    renderResponses();
  }

  $('loadBtn').addEventListener('click', async () => {
    if (!C.SCRIPT_URL) { alert('SCRIPT_URL is empty in config.js. Add your Google Apps Script URL first (README Step 2), or use Upload / Demo data.'); return; }
    const t = $('token').value.trim();
    try { sessionStorage.setItem('uog_token', t); } catch (e) { }
    $('status').textContent = 'Loading…';
    try {
      const res = await fetch(C.SCRIPT_URL + '?action=list&token=' + encodeURIComponent(t));
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || 'Rejected');
      setData(j.rows, j.rows.length + ' responses loaded from Google Sheet');
    } catch (e) { $('status').textContent = 'Failed: ' + e.message; alert('Could not load responses: ' + e.message); }
  });

  $('file').addEventListener('change', async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try {
      if (/\.json$/i.test(f.name)) {
        const j = JSON.parse(await f.text()); setData(Array.isArray(j) ? j : (j.rows || []), 'Loaded ' + f.name);
      } else {
        const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' });
        const name = wb.SheetNames.indexOf('Responses') >= 0 ? 'Responses' : (wb.SheetNames.indexOf('Raw Data') >= 0 ? 'Raw Data' : wb.SheetNames[0]);
        setData(XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: '', raw: false }), 'Loaded ' + f.name);
      }
    } catch (err) { alert('Could not read file: ' + err.message); }
    e.target.value = '';
  });

  /* simulated data: for previewing the dashboard only */
  function demoRows(n) {
    const rows = [];
    const pick = (opts, bias) => { const m = (opts.length - 1) * bias, i = Math.round(m + (Math.random() + Math.random() - 1) * (opts.length / 2.2)); return opts[Math.max(0, Math.min(opts.length - 1, i))]; };
    const rnd = (opts) => opts[Math.floor(Math.random() * opts.length)];
    for (let i = 0; i < n; i++) {
      const r = Math.random(), a = { ResponseID: 'DEMO-' + (i + 1), SubmittedAt: new Date(Date.now() - Math.random() * 14 * 864e5).toISOString() };
      S.sections.forEach((s) => s.questions.forEach((q) => {
        let v;
        if (q.id === 'A1') v = 'Yes, I agree'; else if (q.id === 'A2') v = 'Demo ' + (i + 1); else if (q.id === 'A3') v = a.SubmittedAt.slice(0, 10);
        else if (q.id === 'B5') v = pick(q.options, r);
        else if (q.id === 'C1') v = Math.random() < 0.3 + 0.45 * r ? 'Yes' : 'No';
        else if (['D4', 'G1', 'G2'].indexOf(q.id) >= 0) v = pick(q.options, 1 - r);
        else if (['E1', 'E2', 'E3'].indexOf(q.id) >= 0) v = pick(q.options, r);
        else if (q.type === 'radio') v = rnd(q.options.filter((o) => o !== NA));
        else if (q.type === 'checkbox') { const k = 1 + Math.floor(Math.random() * 3); v = q.options.filter(() => Math.random() < k / q.options.length).join('; ') || q.options[0]; }
        else if (q.type === 'scale') v = String(Math.floor(Math.random() * 11));
        else if (q.type === 'grid') { q.rows.forEach((row) => { a[q.id + '.' + row] = pick(q.cols, ['D7', 'E4'].indexOf(q.id) >= 0 ? r : Math.random()); }); return; }
        else v = '';
        a[q.id] = v;
      }));
      if (a.C1 === 'No') { ['C2', 'C3', 'C4', 'C5'].forEach((k) => { const q = QS[k]; if (q.type === 'grid') q.rows.forEach((row) => { a[k + '.' + row] = NA; }); else a[k] = NA; }); }
      else { a.C5 = String(Math.min(10, Math.max(1, Math.round(2 + 6 * r + Math.random() * 3)))); }
      if (a.D4 === 'Never') a.D5 = NA;
      if (a.G3 === 'No') a.G4 = NA;
      if (a.H2 !== 'Yes') a.H3 = NA;
      rows.push(a);
    }
    return rows;
  }
  $('demoBtn').addEventListener('click', () => setData(demoRows(80), 'SIMULATED demo data (80 fake responses) — not real results'));

  /* ---------- Excel export ---------- */
  $('xlsBtn').addEventListener('click', () => {
    const wb = XLSX.utils.book_new();
    const raw = DATA.map((d) => { const o = {}; Object.keys(d).forEach((k) => { o[k] = d[k]; }); const s = SC.compute(d); Object.keys(s).forEach((k) => { o[k] = s[k]; }); return o; });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(raw), 'Raw Data');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Indicator', 'Value']].concat(exportSheets.kpi)), 'Summary');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Section', 'Q ID', 'Question', 'Response', 'n', '%', 'Valid N']].concat(exportSheets.freq)), 'Frequency Tables');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Outcome', 'Factor', 'Category', 'Yes (n)', 'No (n)', 'Total', '% Yes', 'Chi-square', 'df', 'p-value']].concat(exportSheets.cross)), 'Cross-tabs');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Q ID', 'Question', 'Interpretation']].concat(exportSheets.interp)), 'Interpretations');
    const code = [['Column key', 'Question']]; S.sections.forEach((s) => s.questions.forEach((q) => S.keysOf(q).forEach((k) => code.push([k.key, k.label]))));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(code), 'Codebook');
    XLSX.writeFile(wb, 'GI_Parasitic_Survey_Analysis.xlsx');
  });

  /* ---------- Responses tab (Google Forms / Tally style) ---------- */
  let respChart = null;
  const nameOf = (d) => str(d.A2) || '(no name)';
  const whenOf = (d) => { const t = str(d.SubmittedAt) || str(d.A3); const dt = new Date(t); return isNaN(dt) ? t : dt; };
  const fmtWhen = (d) => { const w = whenOf(d); return w instanceof Date ? w.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : String(w); };
  function lvlBadge(label, kind) {
    if (!label) return '<span class="badge b-gray">—</span>';
    const good = kind === 'hyg' ? { Good: 'b-ok', Moderate: 'b-mid', Poor: 'b-bad' } : { Low: 'b-ok', Moderate: 'b-mid', High: 'b-bad' };
    return '<span class="badge ' + (good[label] || 'b-gray') + '">' + esc(label) + '</span>';
  }

  function renderResponses() {
    const box = $('responses');
    if (respChart) { respChart.destroy(); respChart = null; }
    const N = DATA.length;
    if (!N) { box.innerHTML = '<div class="card">No responses loaded yet. Click “Load responses” (or use demo data to preview).</div>'; return; }
    const rows = DATA.map((d, i) => ({ d: d, i: i, s: SC.compute(d) }))
      .sort((a, b) => (whenOf(b.d) - whenOf(a.d)) || 0);
    const today = new Date().toDateString();
    const todayN = DATA.filter((d) => { const w = whenOf(d); return w instanceof Date && w.toDateString() === today; }).length;
    const symN = DATA.filter((d) => str(d.C1) === 'Yes').length;
    const days = {};
    DATA.forEach((d) => { const w = whenOf(d); if (w instanceof Date) { const k = w.toISOString().slice(0, 10); days[k] = (days[k] || 0) + 1; } });
    const dk = Object.keys(days).sort();

    box.innerHTML =
      '<div class="card"><h2>Responses</h2><div class="stat">' +
      '<div><b>' + N + '</b><small>Total responses</small></div>' +
      '<div><b>' + todayN + '</b><small>Today</small></div>' +
      '<div><b>' + f1(pc(symN, N)) + '%</b><small>Reported GI symptoms</small></div>' +
      '<div><b>' + f1(pc(DATA.filter((d) => str(d.F1) === 'Yes').length, N)) + '%</b><small>Diagnosed parasitic infection</small></div></div>' +
      (dk.length > 1 ? '<div class="chartbox" style="height:200px"><canvas id="respTime"></canvas></div>' : '') + '</div>' +
      '<div class="card"><div class="adminbar noprint"><input type="text" id="search" placeholder="Search by name…"></div>' +
      '<div class="tblwrap"><table class="tbl rtable"><thead><tr><th>#</th><th>Name</th><th>Submitted</th><th>Age</th><th>Gender</th><th>GI symptoms</th><th class="n">Severity</th><th>Hygiene</th><th>Exposure</th></tr></thead><tbody id="rbody">' +
      rows.map((r, k) => '<tr data-i="' + r.i + '"><td>' + (N - k) + '</td><td><b>' + esc(nameOf(r.d)) + '</b></td><td>' + esc(fmtWhen(r.d)) + '</td><td>' + esc(str(r.d.B1)) + '</td><td>' + esc(str(r.d.B2)) + '</td>' +
        '<td>' + (str(r.d.C1) === 'Yes' ? '<span class="badge b-bad">Yes (' + r.s.SCORE_SymptomCount + ')</span>' : '<span class="badge b-ok">No</span>') + '</td>' +
        '<td class="n">' + (r.s.SCORE_Severity === '' ? '—' : r.s.SCORE_Severity) + '</td><td>' + lvlBadge(r.s.SCORE_HygieneLevel, 'hyg') + '</td><td>' + lvlBadge(r.s.SCORE_ExposureLevel, 'exp') + '</td></tr>').join('') +
      '</tbody></table></div><p style="color:#5f6b7a;font-size:13px">Click a row to see that person’s full answers, result and interpretation.</p></div>';

    if (dk.length > 1) {
      respChart = new Chart($('respTime'), { type: 'bar', data: { labels: dk, datasets: [{ label: 'Responses per day', data: dk.map((k) => days[k]), backgroundColor: PAL[0] }] }, options: { maintainAspectRatio: false, plugins: { legend: { display: false }, title: { display: true, text: 'Responses per day' } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } } });
    }
    $('search').addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll('#rbody tr').forEach((tr) => { tr.style.display = tr.cells[1].textContent.toLowerCase().indexOf(q) >= 0 ? '' : 'none'; });
    });
    $('rbody').addEventListener('click', (e) => { const tr = e.target.closest('tr'); if (tr) showDetail(Number(tr.dataset.i)); });
  }

  function showDetail(i) {
    const d = DATA[i], s = SC.compute(d), box = $('responses');
    let h = '<div class="card detail"><button class="btn sec back noprint" id="backBtn">← All responses</button>' +
      '<h2>' + esc(nameOf(d)) + '</h2><div style="color:#5f6b7a">Submitted ' + esc(fmtWhen(d)) + (str(d.ResponseID) ? ' • ID ' + esc(str(d.ResponseID)) : '') + '</div>' +
      '<div class="stat"><div><b>' + s.SCORE_SymptomCount + '</b><small>GI symptoms</small></div>' +
      '<div><b>' + (s.SCORE_Severity === '' ? '—' : s.SCORE_Severity + '/10') + '</b><small>Severity</small></div>' +
      '<div><b>' + (s.SCORE_HygieneIndex === '' ? '—' : s.SCORE_HygieneIndex + '%') + '</b><small>Hygiene (' + esc(s.SCORE_HygieneLevel || '—') + ')</small></div>' +
      '<div><b>' + (s.SCORE_ExposureIndex === '' ? '—' : s.SCORE_ExposureIndex + '%') + '</b><small>Exposure (' + esc(s.SCORE_ExposureLevel || '—') + ')</small></div></div>' +
      '<div class="interp"><b>Interpretation:</b> ' + esc(s.SCORE_Interpretation) + '</div>';
    S.sections.forEach((sec) => {
      h += '<h3>Section ' + sec.id + ' — ' + esc(sec.title) + '</h3>';
      sec.questions.forEach((q) => S.keysOf(q).forEach((k) => {
        const v = str(d[k.key]);
        h += '<div class="row"><span>' + esc(k.label) + '</span><b>' + (v ? esc(v) : '—') + '</b></div>';
      }));
    });
    h += '<p class="noprint"><button class="btn" onclick="window.print()">Print this response</button></p></div>';
    box.innerHTML = h;
    window.scrollTo({ top: 0 });
    $('backBtn').addEventListener('click', renderResponses);
  }

  /* tabs + auto refresh */
  document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((x) => x.classList.toggle('on', x === t));
    const rep = t.dataset.tab === 'analysis';
    $('report').classList.toggle('hide', !rep);
    $('responses').classList.toggle('hide', rep);
  }));
  let timer = null;
  $('auto').addEventListener('change', (e) => {
    clearInterval(timer);
    if (e.target.checked) timer = setInterval(() => { if (C.SCRIPT_URL && $('token').value.trim()) $('loadBtn').click(); }, 60000);
  });
  renderResponses();
  if (C.SCRIPT_URL && $('token').value.trim()) $('loadBtn').click();

  $('pdfBtn').addEventListener('click', () => window.print());
})();
