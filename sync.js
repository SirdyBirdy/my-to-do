// GitHub sync: stores the board as one JSON file in a (private) repo through the Contents API.
(() => {
  const CFG_KEY = 'dateboard.sync';

  const b64e = s => { let bin = ''; new TextEncoder().encode(s).forEach(c => bin += String.fromCharCode(c)); return btoa(bin); };
  const b64d = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g, '')), c => c.charCodeAt(0)));

  const getCfg = () => { try { return JSON.parse(localStorage.getItem(CFG_KEY)); } catch (e) { return null; } };
  const setCfg = c => c ? localStorage.setItem(CFG_KEY, JSON.stringify(c)) : localStorage.removeItem(CFG_KEY);

  const fileUrl = c => `https://api.github.com/repos/${c.repo}/contents/${c.path.split('/').map(encodeURIComponent).join('/')}`;
  const headers = c => ({ Authorization: `Bearer ${c.token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' });

  function fail(status, text) {
    const msg = status === 401 ? 'GitHub rejected the token. It may have expired.'
      : status === 403 ? 'The token lacks permission, or GitHub is rate limiting. Check that Contents is set to Read and write.'
      : status === 404 ? 'Repo not found, or the token has no access to it.'
      : `GitHub returned an error (${status}).`;
    const e = new Error(msg); e.status = status; e.conflict = status === 409 || status === 422; e.detail = text; return e;
  }

  async function get(c) {
    const r = await fetch(`${fileUrl(c)}?t=${Date.now()}`, { headers: headers(c), cache: 'no-store' });
    if (r.status === 404) {
      const probe = await fetch(`https://api.github.com/repos/${c.repo}`, { headers: headers(c), cache: 'no-store' });
      if (!probe.ok) throw fail(probe.status === 404 ? 404 : probe.status);
      return null; // repo is fine, file does not exist yet
    }
    if (!r.ok) throw fail(r.status);
    const j = await r.json();
    return { sha: j.sha, data: JSON.parse(b64d(j.content)) };
  }

  async function put(c, data, sha) {
    const body = { message: 'Update dateboard', content: b64e(JSON.stringify(data, null, 1)) };
    if (sha) body.sha = sha;
    const r = await fetch(fileUrl(c), { method: 'PUT', headers: { ...headers(c), 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) throw fail(r.status);
    return r.json();
  }

  // Per-item merge: the newest edit wins; a delete wins over an older edit.
  function merge(a, b) {
    if (a.seed) return { ...b, seed: false }; // fresh device with sample data: take the cloud copy
    const deleted = { ...b.deleted };
    for (const [k, v] of Object.entries(a.deleted)) deleted[k] = Math.max(v, deleted[k] || 0);
    const cutoff = Date.now() - 120 * 864e5;
    for (const k of Object.keys(deleted)) if (deleted[k] < cutoff) delete deleted[k];
    const pick = (mine, theirs) => {
      const m = new Map();
      for (const x of [...theirs, ...mine]) {
        const o = m.get(x.id);
        if (!o || (x.u || 0) >= (o.u || 0)) m.set(x.id, x);
      }
      return [...m.values()].filter(x => !(deleted[x.id] > (x.u || 0)));
    };
    return { events: pick(a.events, b.events), tasks: pick(a.tasks, b.tasks), tags: { ...b.tags, ...a.tags }, deleted, seed: false };
  }

  const byId = (x, y) => x.id < y.id ? -1 : 1;
  const sortKeys = o => Object.fromEntries(Object.entries(o).sort());
  const sig = s => JSON.stringify([
    [...s.events].sort(byId), [...s.tasks].sort(byId), sortKeys(s.tags), sortKeys(s.deleted)
  ]);

  window.DB_SYNC = { getCfg, setCfg, get, put, merge, sig };
})();
