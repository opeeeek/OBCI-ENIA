/* =====================================================================
   ObciążeniaEC – zdarzenia, pliki, kreator, start
   ===================================================================== */
'use strict';

/* ---------- kreator: automatyczne zestawienie typowego budynku ---------- */
function genProject(w, base) {
  const s = base || blank();
  s.wiz = Object.assign({}, w);
  const type = w.type || 'A', roof = w.roof || 'duo';
  const L = num(w.L, 20), B = num(w.B, 12), H = num(w.H, 9.5), a = num(w.alpha, 30), n = Math.max(1, Math.round(num(w.n, 2)));
  const Hk = num(w.Hk, Math.max(H - B / 2 * Math.tan(rad(a)), 3));
  const hall = type === 'hala';
  s.perm = []; s.imp = []; s.snow = []; s.wind = []; s.therm = []; s.groups = [];
  /* G */
  let floor = null;
  if (!hall) {
    floor = { id: uid(), type: 'layers', name: 'Strop międzykondygnacyjny', alpha: 0, basis: 'pow', layers: [] };
    if (type === 'A') floor.layers = [Ly('PANL', 0.8), Ly('PODK', 0.3), Ly('JCEM', 5), Ly('FPE', 0.02), Ly('EPS', 3, 'izolacja akustyczna'), Ly('ZB', 20), Ly('TGIP', 1.0)];
    else if (type === 'B' || type === 'C1') floor.layers = [Ly('GRES', 1.0), Ly('KLEJ', 0.5), Ly('JCEM', 6), Ly('FPE', 0.02), Ly('EPS', 4), Ly('ZB', 22), Ly('SGK'), Ly('INST')];
    else floor.layers = [Ly('ZYWI', 0.4), Ly('JCEM', 6), Ly('FPE', 0.02), Ly('XPS', 5), Ly('ZB', 25), Ly('INST')];
    s.perm.push(floor);
  }
  let rf;
  if (hall) rf = { id: uid(), type: 'layers', name: 'Dach hali – płyta warstwowa na płatwiach', alpha: roof === 'flat' ? 0 : a, basis: 'pow', layers: [Ly('PWPI', 0, 'płyta warstwowa PIR 100 mm'), Ly('INST', 0, 'instalacje, oświetlenie'), Ly('USRA', 0, 'płatwie stalowe – przyjąć z projektu')] };
  else if (roof === 'flat') rf = { id: uid(), type: 'layers', name: 'Stropodach pełny', alpha: 0, basis: 'pow', layers: [Ly('PAPA', 0.9, '2 × papa termozgrzewalna'), Ly('WMD', 20), Ly('FPE', 0.02, 'paroizolacja'), Ly('BKER', 6, 'warstwa spadkowa – średnio'), Ly('ZB', 20), Ly('TGIP', 1.0)] };
  else rf = { id: uid(), type: 'layers', name: 'Dach ' + (roof === 'duo' ? 'dwuspadowy' : 'jednospadowy') + ' – połać', alpha: a, basis: 'pow', layers: [Ly('DCER'), Ly('LATY'), Ly('MEMB'), RIB('C24', 8, 18, Math.round(num(w.rafter, 0.9) * 100), 'krokwie 8×18 cm'), Ly('WMM', 18, 'wełna między krokwiami (pomniejszyć o krokwie – zapas)'), Ly('FPE', 0.02), Ly('GK', 1.25, 'zabudowa poddasza')] };
  if (hall) { const u = rf.layers.find(x => x.m === 'USRA'); if (u) u.g = 0.15; }
  s.perm.push(rf);
  const wall = { id: uid(), type: 'layers', name: 'Ściana zewnętrzna', alpha: 0, basis: 'pow', layers: hall ? [Ly('PWMW', 0, 'płyta warstwowa ścienna')] : [Ly('TCIE', 0.5), Ly('ETIC', 0, 'ETICS – EPS 15 cm'), Ly('SPEL', 18), Ly('TGIP', 1.5)] };
  s.perm.push(wall);
  /* Q */
  let qFloor = null, qPart = null;
  if (!hall) {
    const cat = type === 'A' ? 'A1' : type === 'B' ? 'B' : type === 'C1' ? 'C1' : type === 'D1' ? 'D1' : 'E1';
    qFloor = Object.assign(newImp('cat'), { name: 'Stropy – ' + EC.CAT[cat].n, cat, qk: EC.CAT[cat].qk, Qk: EC.CAT[cat].Qk });
    s.imp.push(qFloor);
    if (['A', 'B', 'C1'].includes(type)) { qPart = Object.assign(newImp('part'), { name: 'Ścianki działowe – zastępcze', cat, wmode: 'calc', wg: type === 'A' ? 1.0 : 0.5, wh: 2.7 }); s.imp.push(qPart); }
    if (type === 'A') s.imp.push(Object.assign(newImp('cat'), { name: 'Klatka schodowa', cat: 'A2', qk: 3.0, Qk: 2.0 }));
    if (type === 'A') s.imp.push(Object.assign(newImp('barrier'), { name: 'Balustrada balkonu / schodów' }));
  }
  const qRoof = Object.assign(newImp('cat'), { name: 'Dach bez dostępu (kat. H)', cat: 'H', qk: 0.4, Qk: 1.0 });
  s.imp.push(qRoof);
  /* S */
  let sMain, sDrift = null;
  if (roof === 'flat') { sMain = Object.assign(newSnow('mono'), { name: 'Dach płaski – bez zawiewania', a1: 0 }); if (num(w.hp, 0) > 0) sDrift = Object.assign(newSnow('obst'), { name: 'Zaspa przy attyce', h: num(w.hp, 0.6), L: B }); }
  else if (roof === 'duo') sMain = Object.assign(newSnow('duo'), { name: 'Dach dwuspadowy ' + F(a, 0) + '°', a1: a, a2: a });
  else sMain = Object.assign(newSnow('mono'), { name: 'Dach jednospadowy ' + F(a, 0) + '°', a1: a });
  s.snow.push(sMain); if (sDrift) s.snow.push(sDrift);
  if (roof !== 'flat' && a >= 15) s.snow.push(Object.assign(newSnow('guard'), { name: 'Śniegołap na połaci', a1: a, b: B / (roof === 'duo' ? 2 : 1) }));
  /* W */
  const wWalls = Object.assign(newWind('walls'), { name: 'Ściany budynku', h: H, b: L, d: B });
  let wRoof;
  if (roof === 'flat') wRoof = Object.assign(newWind('flat'), { name: 'Dach płaski', h: H, b: L, d: B, eaves: num(w.hp, 0) > 0 ? 'par' : 'sharp', hp: num(w.hp, 0) });
  else wRoof = Object.assign(newWind(roof), { name: roof === 'duo' ? 'Dach dwuspadowy' : 'Dach jednospadowy', h: H, b: L, d: B, a });
  s.wind.push(wWalls, wRoof);
  let wPar = null;
  if (roof === 'flat' && num(w.hp, 0) > 0) { wPar = Object.assign(newWind('fwall'), { name: 'Attyka', mode: 'par', h: num(w.hp, 0.6), hb: H, l: L }); s.wind.push(wPar); }
  /* T */
  s.therm.push(Object.assign(newTherm('bld'), { name: hall ? 'Ściana / płatew – element zewnętrzny stalowy' : 'Wieniec / strop przy ścianie zewnętrznej', pos: hall ? 'out' : 'wall', mat: hall ? 'stal' : 'bet', E: hall ? 210 : 32, L: L, hs: hall ? 0.3 : 0.25 }));
  /* Σ */
  const sym = (col, it) => it ? col + ':' + it.id : null;
  if (floor) s.groups.push({ id: uid(), name: 'Strop międzykondygnacyjny', mode: 'direct', alpha: 0, unit: 'area', b: 1, perm: [floor.id], vars: [qFloor && { ref: 'imp:' + qFloor.id, key: 'q' }, qPart && { ref: 'imp:' + qPart.id, key: 'q' }].filter(Boolean) });
  if (roof === 'flat') {
    s.groups.push({ id: uid(), name: hall ? 'Dach hali' : 'Stropodach', mode: 'direct', alpha: 0, unit: 'area', b: 1, perm: [rf.id], vars: [{ ref: 'imp:' + qRoof.id, key: 'q' }, { ref: 'snow:' + sMain.id, key: 's' }, sDrift && { ref: 'snow:' + sDrift.id, key: 's2' }, { ref: 'wind:' + wRoof.id, key: 'H' }].filter(Boolean) });
  } else {
    const wk = 'H₀';
    s.groups.push({ id: uid(), name: hall ? 'Dach – płatew (pasmo)' : 'Krokiew – składowe względem połaci', mode: 'perp', alpha: a, unit: 'line', b: num(w.rafter, 0.9), perm: [rf.id], vars: [{ ref: 'imp:' + qRoof.id, key: 'q' }, { ref: 'snow:' + sMain.id, key: roof === 'duo' ? 's1' : 's' }, { ref: 'wind:' + wRoof.id, key: wk }] });
    s.groups.push({ id: uid(), name: 'Dach – na m² rzutu poziomego', mode: 'proj', alpha: a, unit: 'area', b: 1, perm: [rf.id], vars: [{ ref: 'imp:' + qRoof.id, key: 'q' }, { ref: 'snow:' + sMain.id, key: roof === 'duo' ? 'max' : 's' }, { ref: 'wind:' + wRoof.id, key: wk }] });
  }
  s.groups.push({ id: uid(), name: 'Ściana zewnętrzna – parcie/ssanie wiatru', mode: 'direct', alpha: 0, unit: 'area', b: 1, perm: [], vars: [{ ref: 'wind:' + wWalls.id, key: 'D' }] });
  s.ui.act = {};
  return s;
}
function example() {
  const s = blank();
  s.meta = Object.assign(s.meta, { name: 'Budynek mieszkalny – przykład', object: 'Zestawienie obciążeń – budynek mieszkalny wielorodzinny', address: 'Łódź' });
  const lodz = GEO.towns().find(t => t.n === 'Łódź');
  if (lodz) { Object.assign(s.loc, { name: 'Łódź', desc: (String(lodz.pow).includes('prawach') ? lodz.pow : 'miasto, pow. ' + lodz.pow) + ', woj. ' + lodz.woj, kind: 'miasto', lat: lodz.lat, lon: lodz.lon, A: lodz.A, src: 'baza miast' }); locApply(s); }
  genProject(s.wiz, s);
  return s;
}
function autoGroups() {
  const lays = S.perm.filter(p => p.type !== 'line');
  let n = 0;
  lays.forEach(p => {
    if (S.groups.some(g => g.perm.includes(p.id))) return;
    const roofish = /dach|połać|stropodach/i.test(p.name) || num(p.alpha, 0) > 0;
    const vars = [];
    if (roofish) {
      S.imp.filter(c => c.kind === 'cat' && c.cat === 'H').forEach(c => vars.push({ ref: 'imp:' + c.id, key: 'q' }));
      S.snow.filter(c => !['over', 'guard'].includes(c.type)).forEach(c => vars.push({ ref: 'snow:' + c.id, key: R.snow[c.id].def }));
      S.wind.filter(c => ['flat', 'mono', 'duo', 'hip'].includes(c.type)).forEach(c => vars.push({ ref: 'wind:' + c.id, key: R.wind[c.id].def }));
    } else if (!/ścian/i.test(p.name)) S.imp.filter(c => (c.kind === 'cat' && c.cat !== 'H') || c.kind === 'part').slice(0, 2).forEach(c => vars.push({ ref: 'imp:' + c.id, key: 'q' }));
    S.groups.push({ id: uid(), name: p.name, mode: num(p.alpha, 0) > 0 ? 'proj' : 'direct', alpha: num(p.alpha, 0), unit: 'area', b: 1, perm: [p.id], vars });
    n++;
  });
  return n;
}

/* ---------- pliki ---------- */
const fileBase = () => (S.meta.name || 'zestawienie-obciazen').replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '_').slice(0, 60);
async function saveBlob(name, data, mime, desc, ext) {
  const blob = new Blob([data], { type: mime });
  if (window.showSaveFilePicker) {
    try {
      const h = await window.showSaveFilePicker({ suggestedName: name, types: [{ description: desc, accept: { [mime]: [ext] } }] });
      const wr = await h.createWritable(); await wr.write(blob); await wr.close();
      return h;
    } catch (e) { if (e && e.name === 'AbortError') return null; }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  return 'download';
}
async function saveProject(as) {
  const data = JSON.stringify(Object.assign({}, S, { app: 'ObciazeniaEC', saved: new Date().toISOString() }), null, 1);
  if (!as && FILE.handle && FILE.handle.createWritable) {
    try { const wr = await FILE.handle.createWritable(); await wr.write(data); await wr.close(); toast('Zapisano: ' + esc(FILE.name)); return; } catch (e) { }
  }
  const h = await saveBlob(fileBase() + '.obc', data, 'application/json', 'Projekt ObciążeniaEC', '.obc');
  if (h && h !== 'download') { FILE.handle = h; FILE.name = h.name; }
  else if (h) FILE.name = fileBase() + '.obc';
  if (h) { $('#fileName').textContent = FILE.name; toast('Zapisano projekt' + (FILE.name ? ': ' + esc(FILE.name) : '')); }
}
async function openProject() {
  if (window.showOpenFilePicker) {
    try {
      const [h] = await window.showOpenFilePicker({ types: [{ description: 'Projekt ObciążeniaEC', accept: { 'application/json': ['.obc', '.json'] } }] });
      const f = await h.getFile(); loadText(await f.text(), f.name); FILE.handle = h; return;
    } catch (e) { if (e && e.name === 'AbortError') return; }
  }
  $('#fileIn').click();
}
function loadText(txt, name) {
  try {
    const o = JSON.parse(txt);
    snap();
    S = migrate(o); FILE = { name: name || '', handle: null };
    $('#fileName').textContent = FILE.name;
    changed(true); showTab(S.ui.tab || 'proj');
    toast('Wczytano: ' + esc(name || 'projekt'), true);
  } catch (e) { toast('Nie można odczytać pliku – to nie jest projekt ObciążeniaEC.'); }
}

/* ---------- lokalizacja: wyszukiwarka i mapa ---------- */
function locSearchRender() {
  const ac = $('#locac'); if (!ac) return;
  if (!LOC_Q || LOC_Q.length < 2) { ac.hidden = true; return; }
  if (!LOC_RES.length) { ac.innerHTML = '<div class="ac-e">Brak wyników w bazie wbudowanej – kliknij miejsce na mapie i wpisz wysokość A.</div>'; ac.hidden = false; return; }
  ac.innerHTML = LOC_RES.map((e, i) => {
    const z = e.kind === 'miasto' ? GEO.at(e.lon, e.lat) : { snow: e.s[0], wind: e.w[0] };
    const zs = e.kind === 'miasto' ? 'śnieg ' + GEO.label(z.snow).replace(' (pas przejściowy)', '*') + ' · wiatr ' + GEO.label(z.wind).replace(' (pas przejściowy)', '*') + ' · A ≈ ' + e.A + ' m' : 'śnieg ' + e.s.map(c => GEO.label(c).replace(' (pas przejściowy)', '*')).join('/') + ' · wiatr ' + e.w.map(c => GEO.label(c).replace(' (pas przejściowy)', '*')).join('/');
    return `<button type="button" class="ac-i" data-locpick="${i}"><b>${esc(e.n)}</b><span>${e.kind}, ${String(e.pow).startsWith('m.') || String(e.pow).includes('prawach') ? '' : 'pow. '}${esc(e.pow)}, woj. ${esc(e.woj)}</span><small>${zs}</small></button>`;
  }).join('');
  ac.hidden = false;
}
function locSet(o) {
  snap();
  const L = S.loc;
  Object.assign(L, { name: o.name || '', desc: o.desc || '', kind: o.kind || '', lat: o.lat, lon: o.lon, src: o.src || '', gs: o.gs || [], gw: o.gw || [], aNote: o.aNote || '' });
  if (isNum(o.A)) L.A = o.A; else if (!o.keepA) L.A = null;
  if (!isNum(L.A)) L.aNote = L.aNote || 'Wysokość terenu A nie została ustalona – wpisz ją dla miejsca budowy.';
  if (o.zoom !== false) MAPV = SVG.zoomView(SVG.mx(o.lon), SVG.my(o.lat), 3);
  locApply();
  changed(true);
  toast('Przypisano: ' + esc(L.name || 'punkt na mapie') + ' – strefa śniegowa ' + GEO.label(L.snow).replace(' (pas przejściowy)', ' (pas)') + ', wiatrowa ' + GEO.label(L.wind).replace(' (pas przejściowy)', ' (pas)') + (isNum(L.A) ? ', A = ' + F(L.A, 0) + ' m' : ''), true);
}
function locPick(e) {
  LOC_Q = ''; LOC_RES = [];
  if (e.kind === 'miasto') locSet({ name: e.n, desc: (String(e.pow).includes('prawach') ? e.pow : 'miasto, pow. ' + e.pow) + ', woj. ' + e.woj, kind: 'miasto', lat: e.lat, lon: e.lon, A: e.A, src: 'baza miast', aNote: e.A >= 300 ? 'Wysokość A = ' + e.A + ' m dotyczy centrum miejscowości – dla działki w terenie górzystym sprawdź rzędną terenu.' : '' });
  else locSet({ name: 'gm. ' + e.n, desc: e.kind + ', pow. ' + e.pow + ', woj. ' + e.woj, kind: 'gmina', lat: e.lat, lon: e.lon, A: null, keepA: true, src: 'punkt środkowy gminy (PRG)', gs: e.s, gw: e.w, aNote: 'Dla gminy nie ustala się wysokości – wpisz A dla miejsca budowy lub pobierz ją z internetu.' });
}
async function fetchElev(lat, lon) {
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 12000);
    const r = await fetch('https://api.open-meteo.com/v1/elevation?latitude=' + lat.toFixed(5) + '&longitude=' + lon.toFixed(5), { signal: ctl.signal });
    clearTimeout(t);
    const d = await r.json(); const e = d && d.elevation && d.elevation[0];
    return isNum(e) ? Math.round(e) : null;
  } catch (e) { return null; }
}
(function mapEvents() {
  let drag = null;
  document.addEventListener('pointerdown', e => {
    const svg = e.target.closest('svg[data-map]'); if (!svg) return;
    const vb = svg.viewBox.baseVal;
    drag = { svg, x: e.clientX, y: e.clientY, vb: { x: vb.x, y: vb.y, w: vb.width, h: vb.height }, moved: false, k: vb.width / svg.getBoundingClientRect().width };
    try { svg.setPointerCapture(e.pointerId); } catch (er) { }
  });
  document.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 5) return;
    drag.moved = true;
    const v = drag.vb;
    MAPV = { x: v.x - dx * drag.k, y: v.y - dy * drag.k, w: v.w, h: v.h };
    drag.svg.setAttribute('viewBox', `${MAPV.x.toFixed(1)} ${MAPV.y.toFixed(1)} ${MAPV.w.toFixed(1)} ${MAPV.h.toFixed(1)}`);
  });
  document.addEventListener('pointerup', e => {
    if (!drag) return;
    const d = drag; drag = null;
    if (d.moved) return;
    const pt = d.svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const m = d.svg.getScreenCTM(); if (!m) return;
    const p = pt.matrixTransform(m.inverse());
    const lon = SVG.ilon(p.x), lat = SVG.ilat(p.y);
    if (lon < 13.8 || lon > 24.5 || lat < 48.8 || lat > 55.2) return;
    locSet({ name: '', desc: 'punkt wskazany na mapie', kind: 'punkt', lat: +lat.toFixed(5), lon: +lon.toFixed(5), A: null, keepA: true, zoom: false, src: 'mapa', aNote: 'Sprawdź wysokość terenu A dla wskazanego miejsca (przycisk „Pobierz A z internetu” lub wpisz).' });
  });
  document.addEventListener('pointercancel', () => { drag = null; });
  document.addEventListener('wheel', e => {
    const svg = e.target.closest('svg[data-map]'); if (!svg || !e.ctrlKey && !e.altKey) return;
    e.preventDefault();
    const v = MAPV || { x: 0, y: 0, w: SVG.MAP_W, h: SVG.MAP_H };
    const z = SVG.MAP_W / v.w * (e.deltaY < 0 ? 1.4 : 1 / 1.4);
    MAPV = z <= 1 ? null : SVG.zoomView(v.x + v.w / 2, v.y + v.h / 2, Math.min(16, z));
    refreshLight();
  }, { passive: false });
})();

/* ---------- operacje na listach ---------- */
function colOfEl(el) { const d = el.closest('details.item'); return d ? { col: d.dataset.col, id: d.dataset.id } : null; }
function cloneItem(o) { const c = JSON.parse(JSON.stringify(o)); c.id = uid(); if (c.layers) c.layers.forEach(L => L.id = uid()); c.name = (c.name || '') + ' (kopia)'; return c; }
function itemAction(act, col, id) {
  const arr = S[col]; const i = arr.findIndex(x => x.id === id); if (i < 0) return;
  if (act === 'up' && i > 0) { [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; }
  else if (act === 'down' && i < arr.length - 1) { [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]]; }
  else if (act === 'dup') { snap(); const c = cloneItem(arr[i]); arr.splice(i + 1, 0, c); S.ui.act[TAB_OF[col]] = c.id; }
  else if (act === 'del') {
    snap();
    const nm = arr[i].name;
    arr.splice(i, 1);
    S.groups.forEach(g => { g.perm = g.perm.filter(x => x !== id); g.vars = g.vars.filter(v => v.ref !== col + ':' + id); });
    S.perm.forEach(p => { if (p.wallRef === id) p.wallRef = ''; });
    changed(true); toast('Usunięto: ' + esc(nm), true); return;
  }
  changed(true);
}
function addItem(col, type) {
  let it;
  if (col === 'perm') it = newPerm(type === 'line' ? 'line' : 'layers');
  else if (col === 'imp') it = newImp(type);
  else if (col === 'snow') it = newSnow(type);
  else if (col === 'wind') { it = newWind(type); if (['walls', 'flat', 'mono', 'duo', 'hip'].includes(type) && S.wiz) Object.assign(it, { h: num(S.wiz.H, 10), b: num(S.wiz.L, 20), d: num(S.wiz.B, 12) }); }
  else if (col === 'therm') it = newTherm(type);
  else if (col === 'groups') it = newGroup();
  if (!it) return;
  S[col].push(it);
  S.ui.act[TAB_OF[col]] = it.id;
  delete S.ui.closed[it.id];
  changed(true);
  const el = $(`#p-${TAB_OF[col]} details[data-id="${it.id}"]`); if (el) el.scrollIntoView({ block: 'nearest' });
}

/* ---------- motyw ---------- */
function applyTheme(t) { if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme; }
function cycleTheme() { let t = ''; try { t = localStorage.getItem(LS_THEME) || ''; } catch (e) { } t = t === '' ? 'light' : t === 'light' ? 'dark' : ''; try { localStorage.setItem(LS_THEME, t); } catch (e) { } applyTheme(t); toast('Motyw: ' + (t === 'light' ? 'jasny' : t === 'dark' ? 'ciemny' : 'automatyczny (systemowy)')); }

function about() {
  modal(`<h3>ObciążeniaEC – zestawienie obciążeń wg Eurokodów</h3>
  <p>Program do kompletnego zestawiania obciążeń konstrukcji budowlanych w Polsce: ciężar własny z bazą ${MATDB.MATS.length - 2} materiałów, obciążenia użytkowe, śnieg, wiatr, oddziaływania termiczne, obciążenia montażowe oraz kombinacje SGN/SGU wg PN-EN 1990 – z Załącznikami krajowymi PL. Każdy wynik ma tok obliczeń z podstawieniem liczb i odwołaniem do punktu normy (kliknij odwołanie, aby zobaczyć objaśnienie).</p>
  <p><b>Automatyzacja:</b> lokalizacja → strefy i wysokość; kreator tworzy pełne zestawienie budynku; każdą wartość (γ, grubości, współczynniki, ψ, γ, strefy, q<sub>p</sub>) można zmienić ręcznie.</p>
  <p><b>Skróty:</b> Ctrl+S – zapisz, Ctrl+Shift+S – zapisz jako, Ctrl+O – otwórz, Ctrl+N – nowy, Ctrl+P – drukuj raport; Ctrl+kółko na mapie – powiększenie.</p>
  <p><b>Dane:</b> mapy stref i baza miejscowości – z programu ObciążeniaEC1 (granice wg map ZK do PN-EN 1991-1-3 i 1991-1-4 z pasami przejściowymi, gminy PRG 2025, wysokości Copernicus DEM). Ciężary: PN-EN 1991-1-1 zał. A oraz dane orientacyjne (literatura, producenci).</p>
  <p class="hint">Program wspomaga projektanta – nie zastępuje jego oceny ani tekstu norm. Objaśnienia punktów norm są streszczeniami własnymi.</p>
  <div class="dact"><button class="btn pri" data-act="mclose">Zamknij</button></div>`);
}

/* ---------- delegacja zdarzeń ---------- */
document.addEventListener('click', e => {
  const t = e.target;
  if (popFor && !t.closest('#pop') && t !== popFor && !t.closest('[data-lst]') && !t.closest('.nref')) closePop();
  if (!t.closest('.srch')) { const ac = $('#locac'); if (ac) ac.hidden = true; }
  const tab = t.closest('nav.tabs button'); if (tab) { showTab(tab.dataset.tab); return; }
  if (t.closest('#status')) { showTab('over'); return; }
  const ref = t.closest('[data-ref]'); if (ref) { e.preventDefault(); normPopup(ref.dataset.ref, ref); return; }
  const lst = t.closest('[data-lst]');
  if (lst) {
    e.preventDefault();
    const inp = lst.parentElement.querySelector('input'); if (!inp || inp.disabled) return;
    let list = []; try { list = JSON.parse(lst.dataset.list || '[]'); } catch (er) { }
    if (!list.length) { inp.focus(); inp.select(); return; }
    showPop(`<div class="pl">${list.map(([v, l]) => `<button type="button" data-pv="${esc(v)}"><b style="font-family:var(--mono)">${esc(fin(+v))}</b>${l ? ' – ' + esc(l) : ''}</button>`).join('')}</div>`, lst);
    $('#pop').onclick = ev => { const b = ev.target.closest('[data-pv]'); if (!b) return; inp.value = fin(+b.dataset.pv); closePop(); onFieldInput(inp, true); };
    return;
  }
  const lp = t.closest('[data-locpick]'); if (lp) { const e2 = LOC_RES[+lp.dataset.locpick]; if (e2) locPick(e2); return; }
  const gt = t.closest('[data-goto]'); if (gt) { const [col, id] = gt.dataset.goto.split('|'); gotoItem(col, id); return; }
  const a = t.closest('[data-act]'); if (!a) return;
  const act = a.dataset.act;
  const inSummary = a.closest('summary');
  if (inSummary) e.preventDefault();
  const ci = colOfEl(a);
  switch (act) {
    case 'up': case 'down': case 'dup': case 'del': if (ci) itemAction(act, ci.col, ci.id); return;
    case 'add': addItem(a.dataset.col, a.dataset.type); return;
    case 'ladd': case 'laddrib': { const p = itemOf('perm', a.dataset.p); if (!p) return; p.layers.push(act === 'laddrib' ? RIB('C24', 8, 18, 90) : Ly('USRV', 1)); changed(true); return; }
    case 'lup': case 'ldown': case 'ldel': {
      const p = itemOf('perm', a.dataset.p); if (!p) return; const i = p.layers.findIndex(L => L.id === a.dataset.l); if (i < 0) return;
      if (act === 'ldel') { snap(); p.layers.splice(i, 1); }
      else if (act === 'lup' && i > 0) [p.layers[i - 1], p.layers[i]] = [p.layers[i], p.layers[i - 1]];
      else if (act === 'ldown' && i < p.layers.length - 1) [p.layers[i + 1], p.layers[i]] = [p.layers[i], p.layers[i + 1]];
      changed(true); return;
    }
    case 'new': confirmDlg('Nowy projekt', 'Utworzyć pusty projekt? Niezapisane zmiany bieżącego projektu zostaną zastąpione (możesz cofnąć).', 'Nowy projekt', () => { snap(); S = blank(); FILE = { name: '', handle: null }; $('#fileName').textContent = ''; changed(true); showTab('proj'); toast('Utworzono nowy projekt.', true); }); return;
    case 'open': openProject(); return;
    case 'save': saveProject(false); return;
    case 'saveas': saveProject(true); return;
    case 'print': showTab('rep'); setTimeout(() => window.print(), 250); return;
    case 'exporthtml': saveBlob(fileBase() + '_raport.html', repHTMLDoc(), 'text/html', 'Raport HTML', '.html').then(h => { if (h) toast('Zapisano raport HTML.'); }); return;
    case 'csv': saveBlob(fileBase() + '_zestawienie.csv', buildCSV(), 'text/csv', 'Arkusz CSV', '.csv').then(h => { if (h) toast('Zapisano zestawienie CSV.'); }); return;
    case 'theme': cycleTheme(); return;
    case 'about': about(); return;
    case 'mclose': closeModal(); return;
    case 'locApply': if (!isNum(S.loc.lat)) { toast('Najpierw wskaż lokalizację.'); return; } locApply(); changed(true); toast('Przypisano strefy z mapy.'); return;
    case 'locElev': {
      const L = S.loc; if (!isNum(L.lat)) { toast('Najpierw wskaż lokalizację.'); return; }
      toast('Pobieram wysokość terenu…');
      fetchElev(L.lat, L.lon).then(A => { if (!isNum(A)) { toast('Nie udało się pobrać wysokości – sprawdź połączenie z internetem lub wpisz A.'); return; } L.A = A; L.aNote = ''; locApply(); changed(true); toast('A = ' + A + ' m n.p.m. (Copernicus DEM, Open-Meteo)'); });
      return;
    }
    case 'mapL': MAPL = a.dataset.v; refreshLight(); return;
    case 'mapZ': { const v = MAPV || { x: 0, y: 0, w: SVG.MAP_W, h: SVG.MAP_H }; const z = SVG.MAP_W / v.w; MAPV = a.dataset.v === 'all' ? null : SVG.zoomView(v.x + v.w / 2, v.y + v.h / 2, Math.max(1, Math.min(16, a.dataset.v === 'in' ? z * 1.8 : z / 1.8))); if (MAPV && MAPV.w >= SVG.MAP_W - 1) MAPV = null; refreshLight(); return; }
    case 'wizard': confirmDlg('Kreator – automatyczne zestawienie', 'Zastąpić obecne pozycje G, Q, S, W, T i zestawienia nowymi, utworzonymi dla budynku: <b>' + esc({ A: 'mieszkalny', B: 'biurowy', C1: 'szkoła / restauracja', D1: 'handel', E1: 'magazyn', hala: 'hala stalowa' }[S.wiz.type] || '') + '</b>, ' + F(S.wiz.L, 1) + ' × ' + F(S.wiz.B, 1) + ' m, h = ' + F(S.wiz.H, 1) + ' m? Lokalizacja i współczynniki pozostaną bez zmian.', 'Utwórz', () => { snap(); genProject(S.wiz, S); changed(true); showTab('sum'); toast('Utworzono zestawienie – sprawdź pozycje w zakładkach G, Q, S, W, T.', true); }); return;
    case 'example': confirmDlg('Przykład', 'Wczytać projekt przykładowy (budynek mieszkalny w Łodzi)? Bieżący projekt zostanie zastąpiony (możesz cofnąć).', 'Wczytaj', () => { snap(); S = example(); changed(true); showTab('proj'); toast('Wczytano przykład.', true); }); return;
    case 'autogroups': { const n = autoGroups(); changed(true); toast(n ? 'Utworzono zestawień: ' + n + ' – sprawdź dobór oddziaływań.' : 'Każdy układ warstw ma już zestawienie.'); return; }
    case 'psiReset': S.psi = null; changed(true); toast('Przywrócono współczynniki ψ z PN-EN 1990.'); return;
    case 'umatAdd': { const k = 'U' + uid(); S.umat.push({ k, n: 'Materiał własny', g: 10, u: 'v', note: '' }); changed(true); return; }
    case 'umatDel': { const k = a.dataset.k; if (S.perm.some(p => (p.layers || []).some(L => L.m === k))) { toast('Materiał jest użyty w układzie warstw – zmień najpierw warstwę.'); return; } S.umat = S.umat.filter(u => u.k !== k); changed(true); return; }
  }
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'projName') { S.meta.name = t.value; save(); return; }
  if (t.id === 'locq') { LOC_Q = t.value; LOC_RES = GEO.search(LOC_Q, 10); locSearchRender(); return; }
  if (t.id === 'matq') { MAT_Q = t.value; $('#matlist').innerHTML = matList(); return; }
  if (t.dataset.psi) { const [k, i] = t.dataset.psi.split('.'); const v = pnum(t.value); if (!isNum(v)) { t.classList.add('bad'); return; } t.classList.remove('bad'); if (!S.psi) S.psi = JSON.parse(JSON.stringify(PSI_DEF)); S.psi[k][+i] = v; clearTimeout(rcT); rcT = setTimeout(() => changed(false), 200); return; }
  if (t.dataset.o && t.dataset.k) { if (t.dataset.txt) { setField(t); save(); if (t.dataset.k === 'name') { const h = t.closest('details.item'); if (h) { const h3 = h.querySelector('summary h3'); if (h3) h3.textContent = t.value; } } if (t.dataset.o === 'meta' && t.dataset.k === 'name') $('#projName').value = t.value; return; } onFieldInput(t, false); }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'matg') { MAT_G = t.value; $('#matlist').innerHTML = matList(); return; }
  if (t.dataset.repopt) { S.ui.rep = Object.assign(repOpts(), { [t.dataset.repopt]: t.checked }); save(); renderTab('rep'); return; }
  if (t.dataset.gperm) { const [gid, pid] = t.dataset.gperm.split('|'); const g = itemOf('groups', gid); if (!g) return; g.perm = g.perm.filter(x => x !== pid); if (t.checked) g.perm.push(pid); g.perm.sort((a, b) => S.perm.findIndex(p => p.id === a) - S.perm.findIndex(p => p.id === b)); changed(false); return; }
  if (t.dataset.gvar) { const [gid, ref] = t.dataset.gvar.split('|'); const g = itemOf('groups', gid); if (!g) return; const sel = t.closest('.vrow').querySelector('select'); g.vars = g.vars.filter(v => v.ref !== ref); if (t.checked) g.vars.push({ ref, key: sel ? sel.value : '' }); if (sel) sel.disabled = !t.checked; changed(false); return; }
  if (t.dataset.gkey) { const [gid, ref] = t.dataset.gkey.split('|'); const g = itemOf('groups', gid); if (!g) return; const v = g.vars.find(x => x.ref === ref); if (v) v.key = t.value; changed(false); return; }
  if (t.dataset.psi) { changed(false); return; }
  if (t.dataset.o && t.dataset.k && !t.dataset.txt) onFieldInput(t, true);
  else if (t.dataset.txt) { setField(t); changed(t.dataset.o === 'meta' ? false : false); }
});
document.addEventListener('focusin', e => {
  const d = e.target.closest && e.target.closest('details.item'); if (!d) return;
  const t = TAB_OF[d.dataset.col] || d.dataset.col;
  if (S.ui.act[t] !== d.dataset.id) setActive(d.dataset.col, d.dataset.id);
});
document.addEventListener('click', e => {
  const s = e.target.closest('details.item > summary'); if (!s || e.target.closest('[data-act]')) return;
  const d = s.parentElement; setActive(d.dataset.col, d.dataset.id);
}, true);
document.addEventListener('toggle', e => {
  const d = e.target; if (!d.matches || !d.matches('details.grp')) return;
  const key = d.dataset.id ? (d.classList.contains('site') ? d.dataset.col + d.dataset.id : d.dataset.id) : null;
  if (key) { if (d.open) delete S.ui.closed[key]; else S.ui.closed[key] = 1; save(); }
}, true);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closePop(); closeModal(); }
  if (e.target.id === 'locq' && e.key === 'Enter') { e.preventDefault(); if (LOC_RES[0]) locPick(LOC_RES[0]); }
  if (!(e.ctrlKey || e.metaKey)) return;
  const k = e.key.toLowerCase();
  if (k === 's') { e.preventDefault(); saveProject(e.shiftKey); }
  else if (k === 'o') { e.preventDefault(); openProject(); }
  else if (k === 'p') { e.preventDefault(); showTab('rep'); setTimeout(() => window.print(), 250); }
  else if (k === 'n' && e.altKey === false && e.shiftKey === false) { /* Ctrl+N bywa zarezerwowane przez przeglądarkę */ }
});
/* rozdzielacz paneli */
(function splitter() {
  let sp = null;
  document.addEventListener('pointerdown', e => { const d = e.target.closest('.dsplit'); if (!d) return; const w = d.parentElement; sp = { w, r: w.getBoundingClientRect() }; e.preventDefault(); });
  document.addEventListener('pointermove', e => { if (!sp) return; const p = clamp((e.clientX - sp.r.left) / sp.r.width * 100, 30, 75); sp.w.style.setProperty('--lw', p.toFixed(1) + '%'); S.ui.lw = p; });
  document.addEventListener('pointerup', () => { if (sp) { sp = null; save(); } });
  document.addEventListener('dblclick', e => { const d = e.target.closest('.dsplit'); if (!d) return; S.ui.lw = 50; d.parentElement.style.setProperty('--lw', '50%'); save(); });
})();
$('#fileIn').addEventListener('change', e => { const f = e.target.files && e.target.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => loadText(String(rd.result), f.name); rd.readAsText(f); e.target.value = ''; });
document.addEventListener('dragover', e => { if (e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files')) e.preventDefault(); });
document.addEventListener('drop', e => { const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (!f) return; e.preventDefault(); const rd = new FileReader(); rd.onload = () => loadText(String(rd.result), f.name); rd.readAsText(f); });
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });

/* ---------- start ---------- */
(function boot() {
  let th = ''; try { th = localStorage.getItem(LS_THEME) || ''; } catch (e) { }
  applyTheme(th);
  S = loadState() || example();
  R = compute();
  $('#projName').value = S.meta.name || '';
  $('#projName').addEventListener('change', () => { S.meta.name = $('#projName').value; changed(false); });
  renderStatus();
  showTab(S.ui.tab || 'proj');
  window.__OEC = { get S() { return S; }, get R() { return R; }, EC, genProject, example, compute: () => (R = compute()) };
})();
