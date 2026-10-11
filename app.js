(() => {
  const KEY = 'dateboard.v1';
  const PALETTE = ['#4fd1c5', '#e3b45b', '#e07a6b', '#9b8cd9', '#6ab0e6', '#8fd16f', '#e58fb3'];
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const ICON = {
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    clash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 8v5M12 17h.01"/></svg>',
    repeat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/></svg>'
  };
  const REPEAT_LABEL = { weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' };

  // ---------- dates ----------
  const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const parse = s => { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); };
  const todayStart = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };
  const offset = n => { const d = todayStart(); d.setDate(d.getDate() + n); return iso(d); };
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
  const span = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
  const diffDays = s => span(iso(todayStart()), s);

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const MONTHS_L = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const DAYS_L = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  // nth repeat of a base date; short months clamp (31 Jan -> 28 Feb)
  function step(base, rep, n) {
    if (!n) return base;
    const d = parse(base);
    if (rep === 'weekly') { d.setDate(d.getDate() + 7 * n); return iso(d); }
    const y = d.getFullYear(), m = d.getMonth(), day = d.getDate();
    const ty = rep === 'yearly' ? y + n : y;
    const tm = rep === 'yearly' ? m : m + n;
    const last = new Date(ty, tm + 1, 0).getDate();
    return iso(new Date(ty, tm, Math.min(day, last)));
  }
  const unit = rep => rep === 'weekly' ? 7 : rep === 'monthly' ? 31 : 366;
  const startN = (e, from) => Math.max(0, Math.floor(span(e.date, from) / unit(e.repeat)) - 1);
  const endOf = e => (e.end && e.end >= e.date) ? e.end : e.date;

  // the occurrence to show for an event: itself, or the next/current repeat
  function occ(e) {
    if (!e.repeat) return { ev: e, date: e.date, end: endOf(e) };
    const len = span(e.date, endOf(e)), t = iso(todayStart());
    for (let n = startN(e, t); n < 6000; n++) {
      const s = step(e.date, e.repeat, n), en = addDays(s, len);
      if (en >= t) return { ev: e, date: s, end: en };
    }
    return { ev: e, date: e.date, end: endOf(e) };
  }
  // does any occurrence of e touch [a, b]?
  function hits(e, a, b) {
    if (!e.repeat) return e.date <= b && endOf(e) >= a;
    const len = span(e.date, endOf(e));
    for (let n = startN(e, a); n < 6000; n++) {
      const s = step(e.date, e.repeat, n);
      if (s > b) return false;
      if (addDays(s, len) >= a) return true;
    }
    return false;
  }

  function relN(n) {
    if (n === 0) return 'Today';
    if (n === 1) return 'Tomorrow';
    if (n === -1) return 'Yesterday';
    if (n > 1 && n <= 14) return `In ${n} days`;
    if (n > 14 && n < 60) return `In ${Math.round(n/7)} weeks`;
    if (n >= 60) return `In ${Math.round(n/30)} months`;
    if (n < -1 && n >= -14) return `${-n} days ago`;
    if (n < -14 && n > -60) return `${Math.round(-n/7)} weeks ago`;
    return `${Math.round(-n/30)} months ago`;
  }
  function rel(o) {
    const a = diffDays(o.date), b = diffDays(o.end);
    if (a <= 0 && b >= 0) {
      if (o.end === o.date) return 'Today';
      if (b === 0) return 'Ends today';
      return `Day ${-a + 1} of ${span(o.date, o.end) + 1}`;
    }
    return a > 0 ? relN(a) : relN(b);
  }
  function fmtTime(t) {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    return `${((h + 11) % 12) + 1}:${String(m).padStart(2,'0')} ${h < 12 ? 'AM' : 'PM'}`;
  }

  // ---------- state ----------
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
  function normalize(e) {
    if (e.done === true && !e.doneKey) e.doneKey = e.date; // older saves
    delete e.done;
    e.end = e.end || ''; e.repeat = e.repeat || ''; e.doneKey = e.doneKey || '';
    e.time = e.time || ''; e.note = e.note || ''; e.tag = e.tag || '';
    return e;
  }
  let state = load();
  let ui = { view: localStorage.getItem('dateboard.view') || 'grid', tag: null, q: '', past: false };
  let editing = null, lastDeleted = null, toastTimer = null;

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && Array.isArray(s.events)) return { events: s.events.map(normalize), tags: s.tags || {} };
    } catch (e) {}
    const seed = {
      tags: { Personal: PALETTE[0], Work: PALETTE[4], Health: PALETTE[5], Bills: PALETTE[1] },
      events: [
        { id: uid(), title: 'Welcome to Dateboard', date: offset(0), note: 'Tap + or press N to add a date. Click any card to edit it. Delete these samples whenever.', tag: 'Personal' },
        { id: uid(), title: 'Dentist', date: offset(3), time: '16:30', tag: 'Health' },
        { id: uid(), title: 'Client call', date: offset(4), time: '11:00', tag: 'Work', note: 'The trip overlaps this one, so both cards show an amber badge.' },
        { id: uid(), title: 'Goa trip', date: offset(3), end: offset(6), tag: 'Personal', note: 'Multi-day dates show a range.' },
        { id: uid(), title: 'Electricity bill', date: offset(9), tag: 'Bills', repeat: 'monthly', note: 'Repeats every month.' }
      ].map(normalize)
    };
    localStorage.setItem(KEY, JSON.stringify(seed));
    return seed;
  }
  function save() { localStorage.setItem(KEY, JSON.stringify(state)); }
  function tagColor(t) { return (t && state.tags[t]) || '#8ba7a3'; }
  function ensureTag(t) {
    if (!t || state.tags[t]) return;
    const used = new Set(Object.values(state.tags));
    state.tags[t] = PALETTE.find(c => !used.has(c)) || PALETTE[Object.keys(state.tags).length % PALETTE.length];
  }
  function pruneTags() {
    const live = new Set(state.events.map(e => e.tag).filter(Boolean));
    for (const t of Object.keys(state.tags)) if (!live.has(t)) delete state.tags[t];
  }

  // ---------- selection ----------
  const isDone = o => !!o.ev.doneKey && o.ev.doneKey === o.date;
  const cmp = (a, b) => a.date.localeCompare(b.date) || (a.ev.time || '99:99').localeCompare(b.ev.time || '99:99') || a.ev.title.localeCompare(b.ev.title);

  function visible() {
    const q = ui.q.trim().toLowerCase();
    return state.events.map(occ).filter(o => {
      if (!ui.past && diffDays(o.end) < 0) return false;
      if (ui.tag && o.ev.tag !== ui.tag) return false;
      if (q && !(`${o.ev.title} ${o.ev.note} ${o.ev.tag}`.toLowerCase().includes(q))) return false;
      return true;
    }).sort(cmp);
  }
  // events other than this one that overlap its dates
  function clashCount(o) {
    if (isDone(o)) return 0;
    const others = state.events.filter(x => x.id !== o.ev.id && !(!x.repeat && x.doneKey === x.date) && hits(x, o.date, o.end));
    return others.length ? others.length + 1 : 0;
  }

  // ---------- render ----------
  function renderHeader() {
    const n = new Date();
    $('today').textContent = `${DAYS_L[n.getDay()]}, ${n.getDate()} ${MONTHS_L[n.getMonth()]}`;
    const upcoming = state.events.map(occ).filter(o => !isDone(o) && diffDays(o.end) >= 0).sort(cmp);
    const week = upcoming.filter(o => diffDays(o.date) <= 7).length;
    $('summary').textContent = !upcoming.length
      ? 'Nothing coming up'
      : `${week} in the next 7 days. Next: ${upcoming[0].ev.title}, ${rel(upcoming[0]).toLowerCase()}`;

    const tags = Object.keys(state.tags).sort();
    $('chips').innerHTML = [`<button class="chip" data-tag="" aria-pressed="${!ui.tag}">All</button>`]
      .concat(tags.map(t => `<button class="chip" data-tag="${esc(t)}" style="--c:${state.tags[t]}" aria-pressed="${ui.tag === t}"><i></i>${esc(t)}</button>`)).join('');
    $('tagList').innerHTML = tags.map(t => `<option value="${esc(t)}">`).join('');
    $('pastBtn').setAttribute('aria-pressed', ui.past);
    $('vGrid').setAttribute('aria-pressed', ui.view === 'grid');
    $('vList').setAttribute('aria-pressed', ui.view === 'list');
  }

  function meta(o) {
    const e = o.ev, bits = [];
    if (e.tag) bits.push(`<span class="pill">${esc(e.tag)}</span>`);
    if (e.time) bits.push(`<span class="pill plain">${ICON.clock}${fmtTime(e.time)}</span>`);
    if (o.end !== o.date) bits.push(`<span class="pill plain">${span(o.date, o.end) + 1} days</span>`);
    if (e.repeat) bits.push(`<span class="pill plain">${ICON.repeat}${REPEAT_LABEL[e.repeat]}</span>`);
    const c = clashCount(o);
    if (c > 1) bits.push(`<span class="pill clash">${ICON.clash}${c} overlap</span>`);
    return bits.join('');
  }
  function actions(o) {
    const d = isDone(o);
    return `<div class="actions"><button class="tick ${d ? 'on' : ''}" data-act="done" aria-label="${d ? 'Mark not done' : 'Mark done'}" title="${d ? 'Mark not done' : 'Mark done'}">${ICON.check}</button><button data-act="edit" aria-label="Edit" title="Edit">${ICON.edit}</button></div>`;
  }
  function cls(o, base) {
    const covers = diffDays(o.date) <= 0 && diffDays(o.end) >= 0;
    return `${base}${covers ? ' today' : ''}${diffDays(o.end) < 0 ? ' past' : ''}${isDone(o) ? ' done' : ''}`;
  }
  function rangeLabel(o) {
    const a = parse(o.date), b = parse(o.end);
    return `${DAYS[a.getDay()]} to ${DAYS[b.getDay()]} ${b.getDate()}${b.getMonth() !== a.getMonth() ? ' ' + MONTHS[b.getMonth()] : ''}`;
  }

  function cardHTML(o) {
    const d = parse(o.date), e = o.ev;
    const yr = d.getFullYear() !== new Date().getFullYear() ? ` ${d.getFullYear()}` : '';
    const multi = o.end !== o.date;
    return `<article class="${cls(o,'card')}" data-id="${e.id}" style="--c:${tagColor(e.tag)}">
      ${actions(o)}
      <div class="date"><span class="day">${d.getDate()}</span><div class="dm"><b>${MONTHS[d.getMonth()]}${yr}</b><span>${multi ? rangeLabel(o) : DAYS[d.getDay()]}</span></div></div>
      <div class="rel">${rel(o)}</div>
      <h3>${esc(e.title)}</h3>
      ${e.note ? `<p class="note">${esc(e.note)}</p>` : ''}
      <div class="meta">${meta(o)}</div>
    </article>`;
  }
  function rowHTML(o) {
    const d = parse(o.date), e = o.ev, multi = o.end !== o.date;
    return `<div class="${cls(o,'row')}" data-id="${e.id}" style="--c:${tagColor(e.tag)}">
      <div class="d"><strong>${d.getDate()}</strong><span>${DAYS[d.getDay()]}</span></div>
      <div><h3>${esc(e.title)}</h3><div class="sub"><span class="rel">${rel(o)}</span>${multi ? `<span>${rangeLabel(o)}</span>` : ''}${e.note ? `<span>${esc(e.note.split('\n')[0].slice(0, 70))}</span>` : ''}</div></div>
      <div class="end">${meta(o)}${actions(o)}</div>
    </div>`;
  }

  function colCount() {
    const w = $('board').clientWidth;
    return Math.max(1, Math.min(5, Math.floor((w + 16) / 288)));
  }

  function renderBoard() {
    const items = visible();
    const el = $('board');
    if (!items.length) {
      const filtered = ui.tag || ui.q;
      el.innerHTML = `<div class="empty"><h2>${filtered ? 'No matches' : 'Nothing pinned yet'}</h2><p>${filtered ? 'Clear the search or pick All.' : 'Press <kbd>N</kbd> or tap + to add a date.'}</p></div>`;
      return;
    }
    if (ui.view === 'list') {
      let out = '', cur = '';
      for (const o of items) {
        const d = parse(o.date), key = `${d.getFullYear()}-${d.getMonth()}`;
        if (key !== cur) { cur = key; out += `<div class="month">${MONTHS_L[d.getMonth()]} ${d.getFullYear()}</div>`; }
        out += rowHTML(o);
      }
      el.innerHTML = `<div class="list">${out}</div>`;
    } else {
      const n = colCount(), cols = Array.from({ length: n }, () => '');
      items.forEach((o, i) => { cols[i % n] += cardHTML(o); }); // round-robin keeps date order across the row
      el.innerHTML = `<div class="grid">${cols.map(c => `<div class="col">${c}</div>`).join('')}</div>`;
    }
  }
  function render() { renderHeader(); renderBoard(); }

  // ---------- dialog ----------
  const dlg = $('dlg');
  function openDlg(id) {
    editing = id ? state.events.find(e => e.id === id) : null;
    $('dlgTitle').textContent = editing ? 'Edit date' : 'New date';
    $('saveBtn').textContent = editing ? 'Save' : 'Add';
    $('delBtn').style.display = editing ? '' : 'none';
    $('fTitle').value = editing ? editing.title : '';
    $('fDate').value = editing ? editing.date : iso(todayStart());
    $('fEnd').value = editing ? editing.end : '';
    $('fRepeat').value = editing ? editing.repeat : '';
    $('fTime').value = editing ? editing.time : '';
    $('fTag').value = editing ? editing.tag : (ui.tag || '');
    $('fNote').value = editing ? editing.note : '';
    syncEnd(); renderTagPick(); updateHint();
    dlg.showModal();
    setTimeout(() => $('fTitle').focus(), 30);
  }
  function syncEnd() {
    $('fEnd').min = $('fDate').value;
    if ($('fEnd').value && $('fEnd').value < $('fDate').value) $('fEnd').value = '';
  }
  function renderTagPick() {
    const cur = $('fTag').value.trim();
    $('tagpick').innerHTML = Object.keys(state.tags).sort().map(t =>
      `<button type="button" class="chip" data-pick="${esc(t)}" style="--c:${state.tags[t]}" aria-pressed="${cur === t}"><i></i>${esc(t)}</button>`).join('');
  }
  function updateHint() {
    const a = $('fDate').value, b = $('fEnd').value || a;
    const h = $('hint');
    if (!a) { h.classList.remove('show'); return; }
    const same = state.events.filter(e => (!editing || e.id !== editing.id) && !(!e.repeat && e.doneKey === e.date) && hits(e, a, b));
    if (same.length) {
      h.textContent = `Already booked: ${same.map(e => e.title + (e.time ? ' at ' + fmtTime(e.time) : '')).join(', ')}`;
      h.classList.add('show');
    } else h.classList.remove('show');
  }
  $('fDate').addEventListener('input', () => { syncEnd(); updateHint(); });
  $('fEnd').addEventListener('input', updateHint);
  $('fTag').addEventListener('input', renderTagPick);
  $('tagpick').addEventListener('click', e => {
    const b = e.target.closest('[data-pick]'); if (!b) return;
    $('fTag').value = $('fTag').value.trim() === b.dataset.pick ? '' : b.dataset.pick;
    renderTagPick();
  });
  $('cancelBtn').onclick = () => dlg.close();
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });

  $('form').addEventListener('submit', ev => {
    ev.preventDefault();
    const rec = {
      title: $('fTitle').value.trim(), date: $('fDate').value, end: $('fEnd').value, repeat: $('fRepeat').value,
      time: $('fTime').value, tag: $('fTag').value.trim(), note: $('fNote').value.trim()
    };
    if (!rec.title || !rec.date) return;
    if (rec.end <= rec.date) rec.end = '';
    ensureTag(rec.tag);
    if (editing) Object.assign(editing, rec);
    else state.events.push(normalize({ id: uid(), ...rec }));
    pruneTags(); save(); dlg.close(); render();
  });
  $('delBtn').onclick = () => { if (editing) { removeEvent(editing.id); dlg.close(); } };

  // ---------- actions ----------
  function removeEvent(id) {
    const i = state.events.findIndex(e => e.id === id); if (i < 0) return;
    const ev = state.events[i];
    lastDeleted = { ev, tag: ev.tag, color: state.tags[ev.tag] };
    state.events.splice(i, 1);
    pruneTags(); save(); render();
    toast(`Deleted "${ev.title}"`);
  }
  $('undoBtn').onclick = () => {
    if (!lastDeleted) return;
    state.events.push(lastDeleted.ev);
    if (lastDeleted.tag && lastDeleted.color && !state.tags[lastDeleted.tag]) state.tags[lastDeleted.tag] = lastDeleted.color;
    lastDeleted = null; save(); render(); hideToast();
  };
  function toast(msg) {
    $('toastMsg').textContent = msg; $('toast').classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(hideToast, 5000);
  }
  function hideToast() { $('toast').classList.remove('show'); }

  $('board').addEventListener('click', e => {
    const item = e.target.closest('[data-id]'); if (!item) return;
    const id = item.dataset.id, act = e.target.closest('[data-act]');
    if (act && act.dataset.act === 'done') {
      const ev = state.events.find(x => x.id === id), o = occ(ev);
      ev.doneKey = isDone(o) ? '' : o.date; save(); render();
    } else openDlg(id);
  });

  $('chips').addEventListener('click', e => {
    const b = e.target.closest('[data-tag]'); if (!b) return;
    ui.tag = b.dataset.tag || null; render();
  });
  $('q').addEventListener('input', e => { ui.q = e.target.value; renderBoard(); });
  $('pastBtn').onclick = () => { ui.past = !ui.past; render(); };
  const setView = v => { ui.view = v; localStorage.setItem('dateboard.view', v); render(); };
  $('vGrid').onclick = () => setView('grid');
  $('vList').onclick = () => setView('list');
  $('fab').onclick = () => openDlg();

  // menu, backup
  $('moreBtn').onclick = e => { e.stopPropagation(); $('pop').classList.toggle('open'); };
  document.addEventListener('click', () => $('pop').classList.remove('open'));
  $('exportBtn').onclick = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `dateboard-${iso(new Date())}.json`; a.click();
    URL.revokeObjectURL(a.href);
  };
  $('importBtn').onclick = () => $('file').click();
  $('file').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const s = JSON.parse(await f.text());
      if (!Array.isArray(s.events)) throw 0;
      if (!confirm(`Replace your current board with ${s.events.length} dates from this file?`)) return;
      state = { events: s.events.map(normalize), tags: s.tags || {} };
      state.events.forEach(ev => ensureTag(ev.tag)); save(); render();
    } catch (err) { alert('That file is not a Dateboard backup.'); }
    e.target.value = '';
  };

  // keyboard
  document.addEventListener('keydown', e => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
    if (e.key === '/' && !typing && !dlg.open) { e.preventDefault(); $('q').focus(); }
    else if ((e.key === 'n' || e.key === 'N') && !typing && !dlg.open && !e.metaKey && !e.ctrlKey) { e.preventDefault(); openDlg(); }
  });

  // keep in sync across tabs, roll the day over at midnight, re-flow on resize
  window.addEventListener('storage', e => { if (e.key === KEY) { state = load(); render(); } });
  let lastDay = iso(new Date());
  setInterval(() => { const d = iso(new Date()); if (d !== lastDay) { lastDay = d; render(); } }, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { lastDay = iso(new Date()); render(); } });
  let lastCols = 0;
  new ResizeObserver(() => { if (ui.view === 'grid') { const c = colCount(); if (c !== lastCols) { lastCols = c; renderBoard(); } } }).observe($('board'));

  render();
})();
