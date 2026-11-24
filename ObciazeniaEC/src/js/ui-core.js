/* =====================================================================
   ObciążeniaEC – interfejs: rdzeń (stan, przeliczenie, pola, zdarzenia, pliki)
   ===================================================================== */
'use strict';
const { F, Fs, Fp, isNum, num, clamp, rad } = EC;
const $ = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const strip = s => String(s == null ? '' : s).replace(/<sub>(.*?)<\/sub>/g, '$1').replace(/<sup>(.*?)<\/sup>/g, '^$1').replace(/<[^>]+>/g, '');
const uid = () => Math.random().toString(36).slice(2, 9);
const fin = x => isNum(x) ? String(+x.toFixed(6)).replace('.', ',') : '';
const pnum = s => { if (s == null) return NaN; s = String(s).trim().replace(/\s/g, '').replace(',', '.').replace('−', '-'); if (s === '' || s === '-') return NaN; const v = Number(s); return isFinite(v) ? v : NaN; };
const today = () => { const d = new Date(); return String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + d.getFullYear(); };
const LS_KEY = 'obciazeniaEC.v1', LS_THEME = 'obciazeniaEC.theme';
const ART = !!window.__OEC_ARTIFACT;   // wersja online (artefakt claude.ai)
const PSI_DEF = JSON.parse(JSON.stringify(EC.PSI));
const COLS = ['perm', 'imp', 'snow', 'wind', 'therm', 'groups'];
const SYM = { perm: 'G', imp: 'Q', snow: 'S', wind: 'W', therm: 'T', groups: 'Σ' };
const CHIP = { perm: 'G', imp: 'Q', snow: 'S', wind: 'W', therm: 'T', groups: 'X' };
const TAB_OF = { perm: 'perm', imp: 'imp', snow: 'snow', wind: 'wind', therm: 'therm', groups: 'sum' };
let S = null, R = null, MAPV = null, MAPL = 'snow', FILE = { name: '', handle: null }, undoSnap = null;

/* ---------- fabryki ---------- */
const Ly = (m, t, nm, extra) => Object.assign({ id: uid(), m, mode: (EC.matOf(m).u === 'a' ? 'a' : 'v'), t: isNum(t) ? t : 0, g: EC.matOf(m).g, nm: nm || '' }, extra || {});
const RIB = (m, b, h, a, nm) => ({ id: uid(), m, mode: 'rib', t: 0, g: EC.matOf(m).g, b, h, a, nm: nm || '' });
function newPerm(type) {
  if (type === 'line') return { id: uid(), type: 'line', name: 'Element liniowy', lmode: 'sec', secShape: 'rect', b: 30, h: 50, A: 1500, g: 25, extra: 0, wallRef: '', gA: 3.0, H: 3.0, open: 0, v: 1.0 };
  return { id: uid(), type: 'layers', name: 'Nowy układ warstw', alpha: 0, basis: 'pow', layers: [Ly('ZB', 20)] };
}
const IMP_T = { cat: 'Kategoria użytkowania (q, Q)', part: 'Ścianki działowe – zastępcze', barrier: 'Bariera / balustrada (poziome)', fork: 'Wózek widłowy (FL1–FL6)', constr: 'Obciążenia montażowe – betonowanie', other: 'Inne oddziaływanie zmienne' };
function newImp(kind) {
  const b = { id: uid(), kind, name: IMP_T[kind] };
  if (kind === 'cat') return Object.assign(b, { name: 'Obciążenie użytkowe', cat: 'A1', like: 'C3', qk: 2.0, Qk: 2.0, useAA: false, Aarea: 20, useAN: false, nst: 3, storeG: 6, storeH: 0 });
  if (kind === 'part') return Object.assign(b, { name: 'Ścianki działowe (obciążenie zastępcze)', cat: 'A1', wmode: 'calc', w: 1.8, wg: 0.5, wh: 2.7 });
  if (kind === 'barrier') return Object.assign(b, { name: 'Balustrada', bcat: 'A', qk: 0.5 });
  if (kind === 'fork') return Object.assign(b, { name: 'Wózek widłowy', fl: 'FL2', tyre: 'pneu', Qax: null });
  if (kind === 'constr') return Object.assign(b, { name: 'Betonowanie stropu – obciążenia montażowe', t: 0.20, gc: 26, qcc: 0.5 });
  return Object.assign(b, { name: 'Inne oddziaływanie zmienne', qk: 1.0, unit: 'kN/m²', p0: 0.7, p1: 0.5, p2: 0.3 });
}
const SNOW_T = { mono: 'Dach jednospadowy / płaski', duo: 'Dach dwuspadowy', multi: 'Dach wielopołaciowy – kosz', cyl: 'Dach walcowy', tall: 'Dach przy wyższej budowli', obst: 'Zaspa przy attyce / przeszkodzie', over: 'Nawis śnieżny na okapie', guard: 'Bariera przeciwśnieżna (śniegołap)' };
function newSnow(type) { return { id: uid(), type, name: SNOW_T[type], a1: type === 'mono' ? 5 : 30, a2: 30, guard: false, h: type === 'cyl' ? 3 : type === 'tall' ? 3 : 0.8, b: type === 'cyl' ? 12 : 3, b1: 12, b2: 10, au: 0, bu: 5, L: 20, mu: 0.8, dman: false, d: 0.3, muMan: false }; }
const WIND_T = { walls: 'Ściany budynku', flat: 'Dach płaski', mono: 'Dach jednospadowy', duo: 'Dach dwuspadowy', hip: 'Dach czterospadowy (kopertowy)', canopy1: 'Wiata jednospadowa', canopy2: 'Wiata dwuspadowa', fwall: 'Ściana wolnostojąca / attyka', sign: 'Tablica reklamowa', force: 'Siła na element (c_f podany)', fric: 'Tarcie wiatru' };
function newWind(type) {
  const o = { id: uid(), type, name: WIND_T[type], h: 10, b: 20, d: 12, a: type === 'mono' ? 10 : type === 'canopy1' ? 5 : type === 'canopy2' ? 10 : 30, a90: 30, eaves: 'sharp', hp: 0.6, rr: 0.5, am: 45, Aload: 10, cpiMode: 'std', cpiFace: 'D', cpiRatio: 2, cpiMuV: 0.5, cpi1: 0.2, cpi2: -0.3, mode: 'wall', hb: 10, l: 20, phi: 1, ret: false, psis: 1, zeUse: false, zeMan: 2, zg: 3, zeF: 10, cf: 2.0, Aref: 1, cfr: 0.02 };
  if (type === 'fwall') Object.assign(o, { h: 2, l: 20 });
  if (type === 'sign') Object.assign(o, { b: 4, h: 2, zg: 3 });
  if (type === 'canopy1' || type === 'canopy2') Object.assign(o, { h: 4, b: 10, d: 6, phi: 0, cpiMode: 'none' });
  if (type === 'fric') Object.assign(o, { h: 10, b: 20, d: 60 });
  return o;
}
const THERM_T = { bld: 'Element budynku', bridge: 'Pomost / most', custom: 'Dowolna zmiana temperatury' };
function newTherm(type) { return { id: uid(), type, name: THERM_T[type], orient: 'SW', abs: '0.9', TinS: 20, TinW: 25, pos: 'wall', depth: 'shallow', mat: 'bet', E: 32, aT: 10, L: 30, hs: 0.25, restr: 1, btype: '3', sub3: 'slab', surf: '50', dT: 25, dT2: 5 }; }
function newGroup() { return { id: uid(), name: 'Nowe zestawienie', mode: 'direct', alpha: 0, unit: 'area', b: 1.0, perm: [], vars: [] }; }
function newLoc() { return { name: '', desc: '', kind: '', lat: null, lon: null, A: null, src: '', snow: '', wind: '', gs: [], gw: [], aNote: '' }; }
function blank() {
  return {
    v: 1, meta: { name: '', object: '', address: '', investor: '', author: '', checker: '', date: today(), notes: '' },
    f: { gGsup: 1.35, gGinf: 1.0, gQ: 1.5, xi: 0.85, rule: '610ab', useKFI: false, rc: 'RC2', eqGsup: 1.10, eqGinf: 0.90, eqQ: 1.5 },
    psi: null, loc: newLoc(),
    ss: { zone: 2, zoneB: 0, trans: 'avg', skTrans: null, A: 150, Ce: 1, Ct: 1, skMan: false, skUser: 1.0 },
    ws: { zone: 1, zoneB: 0, trans: 'avg', A: 150, terrain: 'III', method: 'NA', cdir: 1, cseason: 1, co: 1, kI: 1, rho: 1.25, cscd: 1, qpUser: 0.6, vbMan: false, vb0User: 22 },
    ts: { Tmax: 36, Tmin: -30, T0: 10, altCorr: false },
    umat: [], perm: [], imp: [], snow: [], wind: [], therm: [], groups: [],
    wiz: { type: 'A', roof: 'duo', L: 20, B: 12, H: 9.5, Hk: 6.5, alpha: 35, n: 3, hp: 0.6, rafter: 0.9 },
    ui: { tab: 'proj', act: {}, lw: 54, closed: {} }
  };
}
function migrate(o) {
  const b = blank();
  if (!o || typeof o !== 'object') return b;
  const s = Object.assign(b, o);
  ['meta', 'f', 'ss', 'ws', 'ts', 'wiz', 'ui'].forEach(k => { s[k] = Object.assign(blank()[k], o[k] || {}); });
  s.loc = Object.assign(newLoc(), o.loc || {});
  COLS.forEach(k => { if (!Array.isArray(s[k])) s[k] = []; });
  if (!Array.isArray(s.umat)) s.umat = [];
  s.perm = s.perm.map(p => Object.assign(newPerm(p.type === 'line' ? 'line' : 'layers'), p));
  s.perm.forEach(p => { if (p.type !== 'line') { if (!Array.isArray(p.layers)) p.layers = []; p.layers.forEach(L => { if (!L.id) L.id = uid(); if (!L.mode) L.mode = EC.matOf(L.m, umatMap(s)).u === 'a' ? 'a' : 'v'; }); } });
  s.imp = s.imp.map(c => Object.assign(newImp(IMP_T[c.kind] ? c.kind : 'other'), c));
  s.snow = s.snow.map(c => Object.assign(newSnow(SNOW_T[c.type] ? c.type : 'duo'), c));
  s.wind = s.wind.map(c => Object.assign(newWind(WIND_T[c.type] ? c.type : 'walls'), c));
  s.therm = s.therm.map(c => Object.assign(newTherm(THERM_T[c.type] ? c.type : 'bld'), c));
  s.groups = s.groups.map(g => Object.assign(newGroup(), g, { perm: Array.isArray(g.perm) ? g.perm : [], vars: Array.isArray(g.vars) ? g.vars : [] }));
  if (!s.ui.act) s.ui.act = {};
  if (!s.ui.closed) s.ui.closed = {};
  return s;
}
function umatMap(s) { const m = {}; ((s || S).umat || []).forEach(u => { m[u.k] = { grp: 'usr', k: u.k, n: u.n || 'materiał własny', g: u.g, u: u.u === 'a' ? 'a' : 'v', r: u.r || '', src: 'u', note: u.note || '' }; }); return m; }
let saveT = null;
function flushSave() { if (!S) return; try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) { } }
function save() { clearTimeout(saveT); saveT = setTimeout(flushSave, 300); }
window.addEventListener('beforeunload', () => { if (saveT) { clearTimeout(saveT); flushSave(); } });
function loadState() { try { const t = localStorage.getItem(LS_KEY); if (t) return migrate(JSON.parse(t)); } catch (e) { } return null; }
function snap() { undoSnap = JSON.stringify(S); }

/* ---------- lokalizacja → strefy ---------- */
function locApply(s) {
  s = s || S;
  const L = s.loc;
  if (!isNum(L.lat) || !isNum(L.lon)) return;
  const z = GEO.at(L.lon, L.lat);
  L.snow = z.snow || ''; L.wind = z.wind || '';
  const ps = GEO.parse(z.snow), pw = GEO.parse(z.wind);
  if (ps) { s.ss.zone = ps.zone; s.ss.zoneB = ps.zoneB; }
  if (pw) { s.ws.zone = pw.zone; s.ws.zoneB = pw.zoneB; }
  if (isNum(L.A)) { s.ss.A = L.A; s.ws.A = L.A; }
}

/* ---------- przeliczenie całości ---------- */
function applyPsi() {
  Object.keys(PSI_DEF).forEach(k => { EC.PSI[k] = (S.psi && Array.isArray(S.psi[k]) && S.psi[k].every(isNum)) ? S.psi[k].slice() : PSI_DEF[k].slice(); });
}
function symOf(col, id) { const i = S[col].findIndex(x => x.id === id); return i < 0 ? '?' : SYM[col] + (i + 1); }
function itemOf(col, id) { return S[col].find(x => x.id === id); }
function compute() {
  applyPsi();
  const user = umatMap();
  const out = { perm: {}, imp: {}, snow: {}, wind: {}, therm: {}, groups: {}, warns: [], errs: [] };
  out.snowSite = EC.snowSite(S.ss);
  out.windBase = EC.windBase(S.ws);
  const Aloc = isNum(S.loc.A) ? S.loc.A : S.ss.A;
  out.thermSite = EC.thermSite(S.ts, Aloc);
  S.perm.forEach(p => { if (p.type !== 'line') out.perm[p.id] = EC.permCalc(p, S.f, user); });
  S.perm.forEach(p => { if (p.type === 'line') out.perm[p.id] = EC.lineCalc(p, S.f, out.perm); });
  S.imp.forEach(c => { out.imp[c.id] = EC.imposedCalc(c, S.f); });
  S.snow.forEach(c => { out.snow[c.id] = EC.snowCalc(c, out.snowSite, S.f); });
  S.wind.forEach(c => { out.wind[c.id] = EC.windCalc(c, S.ws, S.f); });
  S.therm.forEach(c => { out.therm[c.id] = EC.thermCalc(c, S.ts, Aloc); });
  R = out;
  S.groups.forEach(g => { out.groups[g.id] = groupCalc(g); });
  /* ostrzeżenia zbiorcze */
  const W = (col, id, t) => out.warns.push({ col, id, t });
  if (!isNum(S.loc.lat)) W('loc', '', 'Nie wskazano lokalizacji obiektu – strefy śniegowa i wiatrowa przyjęte ręcznie.');
  (out.snowSite.warn || []).forEach(t => W('ss', 'site', t));
  ['perm', 'imp', 'snow', 'wind', 'therm'].forEach(col => S[col].forEach(c => { const r = out[col][c.id]; if (r) (r.warn || []).forEach(t => W(col, c.id, symOf(col, c.id) + ' ' + esc(c.name) + ': ' + t)); }));
  S.groups.forEach(g => { const r = out.groups[g.id]; (r.warn || []).forEach(t => W('groups', g.id, symOf('groups', g.id) + ' ' + esc(g.name) + ': ' + t)); if (r.err) out.errs.push({ col: 'groups', id: g.id, t: r.err }); });
  if (!S.groups.length) W('groups', '', 'Brak zestawień – dodaj zestawienie w zakładce Σ, aby otrzymać kombinacje obciążeń.');
  return out;
}

/* ---------- zestawienie (grupa) ---------- */
function varCandidates() {
  const L = [];
  S.imp.forEach(c => { const r = R.imp[c.id]; if (!r) return; L.push({ ref: 'imp:' + c.id, col: 'imp', c, r, sym: symOf('imp', c.id), keys: r.vals.filter(v => !v.point && !v.horiz).map(v => [v.key, strip(v.label) + ' = ' + F(v.v, 3) + ' ' + v.unit]) }); });
  S.snow.forEach(c => { const r = R.snow[c.id]; if (!r) return; L.push({ ref: 'snow:' + c.id, col: 'snow', c, r, sym: symOf('snow', c.id), keys: r.vals.map(v => [v.key, strip(v.label) + ' = ' + F(v.v, 3) + ' ' + v.unit]) }); });
  S.wind.forEach(c => { const r = R.wind[c.id]; if (!r) return; L.push({ ref: 'wind:' + c.id, col: 'wind', c, r, sym: symOf('wind', c.id), keys: r.vals.filter(v => !v.point).map(v => [v.key, strip(v.label) + ': ' + F(v.v, 3) + ' / ' + F(v.vmin, 3) + ' ' + v.unit]) }); });
  return L;
}
function groupCalc(g) {
  const out = { rows: [], warn: [], notes: [], unit: g.unit === 'line' ? 'kN/m' : 'kN/m²' };
  const mode = g.mode || 'direct', a = num(g.alpha, 0);
  const lineU = g.unit === 'line';
  const b = lineU ? num(g.b, 1) : 1;
  let Gk = 0, Gt = 0;
  const comp = (kind, v) => EC.slopeComp(mode, a, kind, v);
  g.perm.forEach(pid => {
    const p = itemOf('perm', pid), r = R.perm[pid];
    if (!p || !r) return;
    if (p.type === 'line') {
      if (!lineU) { out.warn.push(symOf('perm', pid) + ' – element liniowy [kN/m] pominięty w zestawieniu na m² (wybierz „na m bieżący”).'); return; }
      const c = mode === 'direct' ? { n: r.gk, t: 0, f: '' } : comp('G', r.gk);
      out.rows.push({ sym: symOf('perm', pid), name: p.name, fam: 'G', ch: 'G', v0: r.gk, unit0: 'kN/m', n: c.n, t: c.t, conv: c.f, psi: null });
      Gk += c.n; Gt += c.t; return;
    }
    let v0 = mode === 'direct' ? r.used : r.gk, c;
    if (mode === 'direct') c = { n: v0, t: 0, f: p.basis === 'rzut' && r.alpha > 0 ? '/cos α (rzut)' : '' };
    else c = comp('G', v0);
    out.rows.push({ sym: symOf('perm', pid), name: p.name, fam: 'G', ch: 'G', v0, unit0: 'kN/m²', n: c.n * b, t: c.t * b, conv: c.f + (lineU ? ' ·b' : ''), psi: null });
    Gk += c.n * b; Gt += c.t * b;
  });
  const acts = [], actsT = [];
  g.vars.forEach(vr => {
    const [col, id] = String(vr.ref).split(':');
    const c = itemOf(col, id), r = R[col] && R[col][id];
    if (!c || !r) return;
    const sym = symOf(col, id);
    let val = r.vals.find(v => v.key === vr.key) || r.vals.find(v => v.key === r.def) || r.vals.find(v => !v.point && !v.horiz);
    if (!val) return;
    if (val.point || val.horiz) { out.warn.push(sym + ' – wartość skupiona/pozioma nie wchodzi do zestawienia obciążeń rozłożonych.'); return; }
    const isLine = val.unit === 'kN/m';
    if (isLine && !lineU) { out.warn.push(sym + ' – obciążenie liniowe [kN/m] pominięte w zestawieniu na m².'); return; }
    const mult = isLine ? 1 : b;
    let fam = r.fam || col, kind = col === 'snow' ? 'S' : col === 'wind' ? 'W' : 'Q';
    if (col === 'imp' && r.fam === 'other:' + (c.id || '')) fam = 'other:' + c.id;
    const psi = (r.psi || [0, 0, 0]).slice();
    const vmax = val.v, vmin = isNum(val.vmin) ? val.vmin : (val.v < 0 ? val.v : 0);
    const cN = comp(kind, vmax), cNn = comp(kind, vmin);
    const q = Math.max(cN.n * mult, 0), qn = Math.min(cNn.n * mult, col === 'wind' ? 0 : Math.min(cN.n * mult, 0));
    const lbl = strip(val.label);
    out.rows.push({ sym, name: c.name + ' – ' + lbl, fam, ch: col === 'imp' ? 'Q' : col === 'snow' ? 'S' : 'W', v0: vmax, v0n: col === 'wind' ? vmin : null, unit0: val.unit, n: cN.n * mult, nn: col === 'wind' ? cNn.n * mult : null, t: cN.t * mult, conv: cN.f + (mult !== 1 ? ' ·b' : ''), psi });
    acts.push({ sym, name: c.name, fam, q, qn, psi });
    actsT.push({ sym, name: c.name, fam, q: Math.max(cN.t * mult, 0), qn: 0, psi });
  });
  out.Gk = Gk; out.Gt = Gt; out.acts = acts;
  out.comb = EC.combine(Gk, acts, S.f);
  if (mode === 'perp') out.combT = EC.combine(Gt, actsT, S.f);
  if (!g.perm.length) out.warn.push('Nie wybrano obciążeń stałych.');
  if (mode === 'proj' && acts.some(x => x.fam === 'wind')) out.notes.push('Wiatr działa prostopadle do połaci; w trybie „rzut poziomy” sumowana jest jego składowa pionowa (w na m² rzutu), składowa pozioma w·tg α działa dodatkowo.');
  if (mode === 'perp') out.notes.push('Składowe na m² połaci: G<sub>⟂</sub> = g·cos α, G<sub>∥</sub> = g·sin α; S i Q (podane na rzut): ⟂ = s·cos²α, ∥ = s·cos α·sin α; W – prostopadle do połaci.');
  if (out.comb && out.comb.scen.length > 1) out.notes.push('Obciążenia kategorii H nie łączy się ze śniegiem ani wiatrem (PN-EN 1991-1-1, 3.3.2(1)) – sprawdzono dwa scenariusze.');
  return out;
}

/* ---------- formatowanie ---------- */
function kv(k, v, unit, cls, d) { return `<div class="kv ${cls || ''}"><span class="k">${k}</span><span class="v">${typeof v === 'string' ? v : F(v, d == null ? 2 : d)}<small>${unit || ''}</small></span></div>`; }
function refLink(key, label) { if (!label) return ''; return key && NORM[key] ? `<button type="button" class="nref" data-ref="${esc(key)}">${label}</button>` : label; }
function stepsHTML(st) { return st && st.length ? `<ol class="steps">${st.map(([a, b, k]) => `<li><span class="f">${a}</span>${b ? `<span class="rf">${refLink(k, b)}</span>` : ''}</li>`).join('')}</ol>` : ''; }
const warnHTML = w => (w || []).map(x => `<div class="msg warn">${x}</div>`).join('');
const noteHTML = t => t ? `<div class="note">${t}</div>` : '';
function box(title, body, extra) { return `<div class="box"><div class="bh"><h4>${title}</h4>${extra || ''}</div><div class="bb">${body}</div></div>`; }

/* ---------- pola formularza ---------- */
function oKey(o) { return o; }
function getObj(o) {
  if (!o) return null;
  if (['meta', 'f', 'loc', 'ss', 'ws', 'ts', 'wiz', 'ui'].includes(o)) return S[o];
  const p = o.split('.');
  if (p[0] === 'lay') { const pm = itemOf('perm', p[1]); return pm && pm.layers.find(L => L.id === p[2]); }
  if (p[0] === 'umat') return S.umat.find(u => u.k === p[1]);
  if (p[0] === 'psi') { if (!S.psi) S.psi = JSON.parse(JSON.stringify(PSI_DEF)); return S.psi[p[1]]; }
  if (COLS.includes(p[0])) return itemOf(p[0], p[1]);
  return null;
}
function fNum(o, k, label, unit, opt) {
  opt = opt || {};
  const obj = getObj(o) || {};
  const v = obj[k];
  const list = opt.list ? ` data-list="${esc(JSON.stringify(opt.list))}"` : '';
  const id = 'f_' + o.replace(/\W/g, '_') + '_' + k;
  return `<div class="row"><label for="${id}">${label}${opt.sym ? ' ' + opt.sym : ''}</label><div class="combo"><input id="${id}" data-o="${o}" data-k="${k}" data-num="1"${opt.rr ? ' data-rr="1"' : ''}${opt.opt ? ' data-opt="1"' : ''} value="${esc(fin(v))}"${opt.dis ? ' disabled' : ''}${opt.ph ? ` placeholder="${esc(opt.ph)}"` : ''} autocomplete="off" spellcheck="false" inputmode="decimal"><button type="button" tabindex="-1" data-lst="1"${list} aria-label="lista wartości"${opt.dis ? ' disabled' : ''}>▾</button></div><span class="unit">${unit || ''}</span></div>` + (opt.hint ? `<div class="hint">${opt.hint}</div>` : '');
}
function fSel(o, k, label, opts, opt) {
  opt = opt || {};
  const obj = getObj(o) || {};
  const v = obj[k];
  const id = 'f_' + o.replace(/\W/g, '_') + '_' + k;
  const os = opts.map(x => Array.isArray(x) ? x : [x, x]).map(([val, lab, grp]) => `<option value="${esc(val)}"${String(val) === String(v) ? ' selected' : ''}>${esc(strip(lab))}</option>`).join('');
  return `<div class="row ${opt.full ? 'wide' : ''}"><label for="${id}">${label}</label><select id="${id}" data-o="${o}" data-k="${k}"${opt.numv ? ' data-numv="1"' : ''}${opt.rr ? ' data-rr="1"' : ''}${opt.dis ? ' disabled' : ''}>${os}</select>${opt.full ? '' : `<span class="unit">${opt.unit || ''}</span>`}</div>` + (opt.hint ? `<div class="hint">${opt.hint}</div>` : '');
}
function fChk(o, k, label, opt) {
  opt = opt || {};
  const obj = getObj(o) || {};
  return `<label class="chk"><input type="checkbox" data-o="${o}" data-k="${k}"${obj[k] ? ' checked' : ''}${opt.rr !== false ? ' data-rr="1"' : ''}><span>${label}</span></label>` + (opt.hint ? `<div class="hint">${opt.hint}</div>` : '');
}
function fTxt(o, k, label, opt) {
  opt = opt || {};
  const obj = getObj(o) || {};
  const id = 'f_' + o.replace(/\W/g, '_') + '_' + k;
  if (opt.area) return `<div class="row wide"><label for="${id}">${label}</label><textarea id="${id}" data-o="${o}" data-k="${k}" data-txt="1" spellcheck="false">${esc(obj[k] || '')}</textarea></div>`;
  return `<div class="row wide"><label for="${id}">${label}</label><input class="txt" id="${id}" data-o="${o}" data-k="${k}" data-txt="1" value="${esc(obj[k] || '')}" placeholder="${esc(opt.ph || '')}" spellcheck="false" autocomplete="off"></div>`;
}
const sub = t => `<div class="lsub">${t}</div>`;
const hint = t => `<div class="hint">${t}</div>`;
const rng = (a, b, st, d) => { const r = []; for (let v = a; v <= b + 1e-9; v += st) r.push([+v.toFixed(d || 3), '']); return r; };

/* ---------- popupy, modal, toast ---------- */
let popFor = null;
function showPop(html, anchor, cls) {
  const p = $('#pop');
  p.innerHTML = html; p.className = cls || '';
  p.style.display = 'block';
  const r = anchor.getBoundingClientRect();
  const pw = p.offsetWidth, ph = p.offsetHeight;
  let x = Math.min(r.left, window.innerWidth - pw - 10), y = r.bottom + 4;
  if (y + ph > window.innerHeight - 10) y = Math.max(10, r.top - ph - 4);
  p.style.left = Math.max(10, x) + 'px'; p.style.top = y + 'px';
  popFor = anchor;
}
function closePop() { $('#pop').style.display = 'none'; popFor = null; }
function normPopup(key, anchor) {
  const n = NORM[key]; if (!n) return;
  showPop(`<div class="nh"><h5>${n.t}</h5><div>${n.s}</div>${n.f ? `<div class="nf">${n.f}</div>` : ''}${n.h ? `<div class="nhh">${n.h}</div>` : ''}<div class="src">Streszczenie własne – nie zastępuje tekstu normy.</div></div>`, anchor);
}
function modal(html, cls) { const m = $('#modal'); m.innerHTML = `<div class="dlg ${cls || ''}">${html}</div>`; m.classList.add('on'); }
function closeModal() { $('#modal').classList.remove('on'); $('#modal').innerHTML = ''; }
function confirmDlg(title, text, okLabel, onOk) {
  modal(`<h3>${title}</h3><div>${text}</div><div class="dact"><button class="btn" data-act="mclose">Anuluj</button><button class="btn pri" id="mok">${okLabel || 'OK'}</button></div>`);
  $('#mok').onclick = () => { closeModal(); onOk(); };
}
let toastT = null;
function toast(msg, undo) {
  const t = $('#toast');
  t.innerHTML = msg + (undo && undoSnap ? ' <button class="lnk" style="color:#9cc0f5;margin-left:8px" id="tUndo">Cofnij</button>' : '');
  t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), undo ? 6000 : 3200);
  const u = $('#tUndo'); if (u) u.onclick = () => { if (undoSnap) { S = migrate(JSON.parse(undoSnap)); undoSnap = null; changed(true); t.classList.remove('on'); } };
}

/* ---------- odświeżanie ---------- */
let rcT = null;
function changed(full) {
  R = compute();
  save();
  if (full) renderTab(S.ui.tab);
  else refreshLight();
  renderStatus();
  $('#projName').value = S.meta.name || '';
}
function refreshLight() {
  /* wartości w nagłówkach pozycji, prawy panel, kolumny warstw */
  $$('[data-sumv]').forEach(el => { const [col, id] = el.dataset.sumv.split('.'); el.innerHTML = sumVal(col, id); });
  $$('[data-lgk]').forEach(el => { const [pid, i] = el.dataset.lgk.split('.'); const r = R.perm[pid]; el.innerHTML = r && r.rows[+i] ? F(r.rows[+i].gk, 3) : '—'; });
  $$('[data-ltot]').forEach(el => { const r = R.perm[el.dataset.ltot]; el.innerHTML = r ? F(r.gk, 3) : '—'; });
  $$('[data-lfx]').forEach(el => { const [pid, i] = el.dataset.lfx.split('.'); const r = R.perm[pid]; el.innerHTML = r && r.rows[+i] ? (r.rows[+i].f || '') : ''; });
  const side = $('#p-' + S.ui.tab + ' .dside');
  if (side && TABS[S.ui.tab] && TABS[S.ui.tab].side) {
    const y = $('#panes').scrollTop;
    const ae = document.activeElement;
    if (ae && side.contains(ae) && side.querySelector('[data-live]')) {
      /* fokus w panelu (np. edytor warstwy) – odśwież tylko części wynikowe, pola edycji zostają */
      const tmp = document.createElement('div'); tmp.innerHTML = TABS[S.ui.tab].side();
      side.querySelectorAll('[data-live]').forEach(el => { const n = tmp.querySelector(`[data-live="${el.dataset.live}"]`); if (n) el.innerHTML = n.innerHTML; });
    } else side.innerHTML = TABS[S.ui.tab].side();
    $('#panes').scrollTop = y;
  }
  if (TABS[S.ui.tab] && TABS[S.ui.tab].light) TABS[S.ui.tab].light();
}
function renderStatus() {
  const st = $('#status');
  const nw = R.warns.length, ne = R.errs.length;
  st.className = ne ? 'fail' : nw ? 'warn' : 'ok';
  st.textContent = ne ? '✖ Błędy: ' + ne : nw ? '⚠ Uwagi: ' + nw : '✔ Zestawienie kompletne';
}
function renderTab(t) {
  const T = TABS[t]; if (!T) return;
  const el = $('#p-' + t);
  const y = $('#panes').scrollTop;
  el.innerHTML = T.render();
  if (T.after) T.after(el);
  $('#panes').scrollTop = y;
}
function showTab(t) {
  if (!TABS[t]) t = 'proj';
  S.ui.tab = t;
  $$('nav.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
  $$('.pane').forEach(p => p.classList.toggle('on', p.id === 'p-' + t));
  renderTab(t);
  $('#panes').scrollTop = 0;
  save();
}
function setActive(col, id) {
  const t = TAB_OF[col] || S.ui.tab;
  if (S.ui.act[t] === id) return;
  S.ui.act[t] = id;
  $$('#p-' + t + ' details.grp.item').forEach(d => d.classList.toggle('act', d.dataset.id === id));
  const side = $('#p-' + t + ' .dside');
  if (side && TABS[t].side) side.innerHTML = TABS[t].side();
  save();
}
function gotoItem(col, id) {
  if (col === 'loc' || col === 'ss' && false) { showTab('proj'); return; }
  const t = col === 'ss' ? 'snow' : col === 'ws' ? 'wind' : TAB_OF[col] || 'proj';
  if (id) S.ui.act[t] = id;
  showTab(t);
  const el = id ? $(`#p-${t} details[data-id="${id}"]`) : null;
  if (el) { el.open = true; el.scrollIntoView({ block: 'start' }); el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
}

/* ---------- zdarzenia pól ---------- */
function setField(el, finalCommit) {
  const obj = getObj(el.dataset.o); if (!obj) return false;
  const k = el.dataset.k;
  if (el.type === 'checkbox') obj[k] = el.checked;
  else if (el.dataset.num) {
    const v = pnum(el.value);
    if (!isNum(v)) { if (el.value.trim() === '' && el.dataset.opt) { obj[k] = null; el.classList.remove('bad'); return true; } el.classList.add('bad'); return false; }
    el.classList.remove('bad');
    obj[k] = v;
  } else if (el.dataset.numv) obj[k] = +el.value;
  else obj[k] = el.value;
  return true;
}
/* to samo pole w kilku miejscach (np. tabela warstw i edytor na schemacie) – synchronizacja wartości */
function syncFields(el) {
  const o = el.dataset.o, k = el.dataset.k; if (!o || !k) return;
  $$('[data-o][data-k]').forEach(x => { if (x === el || x.dataset.o !== o || x.dataset.k !== k) return; if (x.type === 'checkbox') x.checked = el.checked; else x.value = el.value; });
}
function onFieldInput(el, isChange) {
  const o = el.dataset.o, k = el.dataset.k;
  syncFields(el);
  if (el.tagName === 'INPUT' && el.type !== 'checkbox' && !isChange) {
    if (!setField(el)) return;
    clearTimeout(rcT); rcT = setTimeout(() => { postSet(o, k); changed(false); }, 140);
    return;
  }
  if (!setField(el, true)) return;
  postSet(o, k);
  changed(!!el.dataset.rr || el.tagName === 'SELECT' && !!el.dataset.rr);
}
function postSet(o, k) {
  /* zależności między polami */
  if (o.startsWith('lay.') && k === 'm') {
    const L = getObj(o), m = EC.matOf(L.m, umatMap());
    L.g = m.g; L.mode = m.u === 'a' ? 'a' : (L.mode === 'rib' ? 'rib' : 'v');
  }
  if (o.startsWith('imp.') && k === 'cat') {
    const it = getObj(o); const c = EC.CAT[it.cat];
    if (c && it.kind === 'cat') { if (c.g === 'I') { const l = EC.CAT[it.like] || EC.CAT.A1; it.qk = l.qk; it.Qk = l.Qk; } else { it.qk = c.qk; it.Qk = c.Qk; } }
  }
  if (o.startsWith('imp.') && k === 'like') { const it = getObj(o); const l = EC.CAT[it.like]; if (l && it.cat === 'I') { it.qk = l.qk; it.Qk = l.Qk; } }
  if (o.startsWith('imp.') && k === 'bcat') { const it = getObj(o); it.qk = (EC.BARRIER[it.bcat] || EC.BARRIER.A).q; }
  if (o.startsWith('imp.') && k === 'fl') { const it = getObj(o); it.Qax = null; }
  if (o.startsWith('imp.') && k === 'storeM') { const it = getObj(o); const m = EC.matOf(it.storeM); it.storeG = m.g; }
  if (o.startsWith('therm.') && k === 'mat') { const it = getObj(o); const m = EC.ALPHA[it.mat]; if (m) { it.E = m.E; it.aT = m.a; } }
  if (o === 'loc' && (k === 'A' || k === 'lat' || k === 'lon')) { if (k === 'A') S.loc.aNote = ''; locApply(); }
  if (o === 'ws' && k === 'method' && S.ws.method === 'man' && !isNum(S.ws.qpUser)) S.ws.qpUser = 0.6;
  if (o === 'f' && k === 'rc') S.f.useKFI = S.f.rc !== 'RC2' ? true : S.f.useKFI;
}
