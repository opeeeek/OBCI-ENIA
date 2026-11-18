/* =====================================================================
   ObciążeniaEC – zakładki: formularze pozycji i panele wyników
   ===================================================================== */
'use strict';
const CHEV = '<svg class="chev" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3l5 5-5 5"/></svg>';

/* ---------- wartości w nagłówkach ---------- */
function sumVal(col, id) {
  const r = R[col] && R[col][id];
  if (!r) return '';
  const c = itemOf(col, id);
  if (col === 'perm') return c.type === 'line' ? `g<sub>k</sub> = <b>${F(r.gk, 2)}</b> kN/m` : `g<sub>k</sub> = <b>${F(r.gk, 2)}</b> kN/m²${r.alpha > 0 ? ` · rzut <b>${F(r.gkH, 2)}</b>` : ''}`;
  if (col === 'imp') {
    if (c.kind === 'fork') return `Q<sub>k,dyn</sub> = <b>${F(r.Qdyn, 1)}</b> kN`;
    if (c.kind === 'barrier') return `q<sub>k</sub> = <b>${F(r.qk, 2)}</b> kN/m (poziomo)`;
    return `q<sub>k</sub> = <b>${F(r.qk, 2)}</b> ${r.unit}`;
  }
  if (col === 'snow') { const v = r.vals.find(x => x.key === r.def) || r.vals[0]; return v ? `${strip(v.label).split(' ')[0]} = <b>${F(v.v, 3)}</b> ${v.unit}` : ''; }
  if (col === 'wind') { const ws = r.vals.filter(v => v.wind); if (!ws.length) return `q<sub>p</sub> = <b>${F(r.qp, 3)}</b>`; const mx = Math.max(...ws.map(v => v.v)), mn = Math.min(...ws.map(v => v.vmin)); return `q<sub>p</sub> = ${F(r.qp, 3)} · w: <b>${F(mn, 2)}</b> … <b>${F(mx, 2)}</b> kN/m²`; }
  if (col === 'therm') return r.rows.length ? `ΔT<sub>u</sub> = <b>${r.rows.map(x => Fs(x.dTu, 1)).join(' / ')}</b> K` : '';
  if (col === 'groups') { const u = r.comb && r.comb.uls; return u ? `q<sub>Ed</sub> = <b>${F(u.v, 2)}</b> ${r.unit}` : ''; }
  return '';
}
function itemHead(col, it, i, extra) {
  const id = it.id;
  return `<summary>${CHEV}<span class="chip ${CHIP[col]}">${SYM[col]}${i + 1}</span><h3>${esc(it.name || '')}</h3><span class="sumv" data-sumv="${col}.${id}">${sumVal(col, id)}</span>${extra || ''}<span class="iacts"><button type="button" class="ibtn" data-act="up" title="W górę">↑</button><button type="button" class="ibtn" data-act="down" title="W dół">↓</button><button type="button" class="ibtn" data-act="dup" title="Duplikuj">⧉</button><button type="button" class="ibtn" data-act="del" title="Usuń">✕</button></span></summary>`;
}
function itemBox(col, it, i, body) {
  const t = TAB_OF[col];
  const act = S.ui.act[t] === it.id;
  return `<details class="grp item${act ? ' act' : ''}" data-col="${col}" data-id="${it.id}"${S.ui.closed[it.id] ? '' : ' open'}>${itemHead(col, it, i)}<div class="gbody">${body}</div></details>`;
}
function siteBox(col, id, chip, title, body, side) {
  const t = TAB_OF[col] || col;
  const act = S.ui.act[t] === id;
  return `<details class="grp item site${act ? ' act' : ''}" data-col="${col}" data-id="${id}"${S.ui.closed[col + id] ? '' : ' open'}><summary>${CHEV}<span class="chip ${chip}">${esc(SYM[col] || '')}</span><h3>${title}</h3><span class="sumv">${side || ''}</span></summary><div class="gbody">${body}</div></details>`;
}
function listLayout(t, head, left, side) {
  return head + `<div class="datawrap" style="--lw:${clamp(num(S.ui.lw, 54), 30, 75)}%"><div class="dleft">${left}</div><div class="dsplit" title="Przeciągnij, aby zmienić podział (dwuklik – po równo)"></div><aside class="dside">${side}</aside></div>`;
}
function phead(title, ref, lead) { return `<div class="phead"><h2>${title}</h2><span class="ref">${ref}</span></div>${lead ? `<p class="lead">${lead}</p>` : ''}`; }
function addBar(col, types, extra) { return `<div class="addbar"><span class="ttl">Dodaj:</span>${Object.entries(types).map(([k, v], i) => `<button type="button" class="btn sm add" data-act="add" data-col="${col}" data-type="${k}">+ ${esc(v)}</button>`).join('')}${extra || ''}</div>`; }
function activeOf(t, col, def) {
  let id = S.ui.act[t];
  const ok = id === 'site' || S[col].some(x => x.id === id);
  if (!ok) id = S[col].length ? S[col][0].id : def;
  S.ui.act[t] = id;
  return id;
}

/* =====================================================================
   PROJEKT I LOKALIZACJA
   ===================================================================== */
let LOC_Q = '', LOC_RES = [], LOC_ONL = [];
function projTab() {
  const L = S.loc;
  let left = '';
  left += `<details class="grp" open><summary>${CHEV}<h3>Dane projektu</h3></summary><div class="gbody">${fTxt('meta', 'name', 'Nazwa obiektu / projektu')}${fTxt('meta', 'object', 'Element / branża')}${fTxt('meta', 'address', 'Adres / lokalizacja')}${fTxt('meta', 'investor', 'Inwestor')}${fTxt('meta', 'author', 'Opracował')}${fTxt('meta', 'checker', 'Sprawdził')}${fTxt('meta', 'date', 'Data')}${fTxt('meta', 'notes', 'Uwagi do raportu', { area: true })}</div></details>`;
  /* lokalizacja */
  let lf = `<div class="srch"><div class="row wide"><label for="locq">Szukaj miejscowości lub gminy</label><input class="txt" id="locq" data-locq="1" value="${esc(LOC_Q)}" placeholder="np. Zakopane, Kościelisko, Hel" autocomplete="off" spellcheck="false"></div><div class="ac" id="locac" hidden></div></div>`;
  lf += hint('Baza wbudowana: ~950 miast z wysokością n.p.m. i ~2470 gmin (dane z ObciążeniaEC1). Możesz też kliknąć punkt na mapie – strefy przypiszą się automatycznie.');
  lf += fNum('loc', 'lat', 'szerokość geograficzna', '°N', { opt: true }) + fNum('loc', 'lon', 'długość geograficzna', '°E', { opt: true });
  lf += fNum('loc', 'A', 'wysokość terenu n.p.m.', 'm', { opt: true, sym: 'A', hint: 'Wysokość działki (z mapy zasadniczej / DEM). Przenosi się do zakładek Śnieg i Wiatr.' });
  lf += `<div class="row wide"><label>&nbsp;</label><span><button type="button" class="btn sm" data-act="locElev" title="Pobiera wysokość z Open-Meteo (Copernicus DEM) – wymaga internetu">Pobierz A z internetu</button> <button type="button" class="btn sm" data-act="locApply">Przypisz strefy z mapy</button></span></div>`;
  if (L.aNote) lf += `<div class="msg warn">${L.aNote}</div>`;
  if (isNum(L.lat)) {
    lf += `<div class="kvs" style="margin-top:8px">${kv('strefa śniegowa', GEO.label(L.snow), '', 'hl')}${kv('strefa wiatrowa', GEO.label(L.wind), '', 'hl')}${kv('A', isNum(L.A) ? F(L.A, 0) : '—', 'm n.p.m.')}</div>`;
    if (L.name || L.desc) lf += `<div class="note"><b>${esc(L.name)}</b>${L.desc ? ' – ' + esc(L.desc) : ''}<br>${F(L.lat, 4)}° N, ${F(L.lon, 4)}° E${L.src ? ' · ' + esc(L.src) : ''}</div>`;
    if (L.gs && L.gs.length > 1) lf += `<div class="msg warn">Gmina obejmuje kilka stref śniegowych: ${L.gs.map(GEO.label).join(', ')} – wskaż działkę na mapie.</div>`;
    if (L.gw && L.gw.length > 1) lf += `<div class="msg warn">Gmina obejmuje kilka stref wiatrowych: ${L.gw.map(GEO.label).join(', ')} – wskaż działkę na mapie.</div>`;
  }
  left += `<details class="grp" open><summary>${CHEV}<h3>Lokalizacja obiektu</h3></summary><div class="gbody">${lf}</div></details>`;
  /* współczynniki */
  let ff = fSel('f', 'rule', 'Kombinacje SGN', [['610ab', 'wzory (6.10a) i (6.10b) – zalecane w ZK PL'], ['610', 'wzór (6.10)']], { full: true });
  ff += fNum('f', 'gGsup', 'γ<sub>G,sup</sub> – stałe niekorzystne', '', { list: [[1.35, 'STR – PN-EN 1990 tabl. A1.2(B)'], [1.2, ''], [1.1, 'EQU']] });
  ff += fNum('f', 'gGinf', 'γ<sub>G,inf</sub> – stałe korzystne', '', { list: [[1.0, 'STR'], [0.9, 'EQU']] });
  ff += fNum('f', 'gQ', 'γ<sub>Q</sub> – zmienne niekorzystne', '', { list: [[1.5, 'STR/EQU']] });
  ff += fNum('f', 'xi', 'ξ – redukcja stałych w (6.10b)', '', { list: [[0.85, 'ZK PL'], [0.9, ''], [1.0, '']] });
  ff += fSel('f', 'rc', 'Klasa niezawodności (zał. B)', [['RC1', 'RC1 / CC1 – K_FI = 0,9'], ['RC2', 'RC2 / CC2 – K_FI = 1,0'], ['RC3', 'RC3 / CC3 – K_FI = 1,1']], { full: true, rr: true });
  ff += fChk('f', 'useKFI', 'stosuj K<sub>FI</sub> do oddziaływań niekorzystnych (PN-EN 1990, B3.3)');
  ff += sub('Równowaga statyczna EQU (odrywanie)');
  ff += fNum('f', 'eqGsup', 'γ<sub>G,sup</sub> (EQU)', '') + fNum('f', 'eqGinf', 'γ<sub>G,inf</sub> (EQU)', '') + fNum('f', 'eqQ', 'γ<sub>Q</sub> (EQU)', '');
  ff += hint('Wartości z PN-EN 1990, tabl. A1.2(A) i A1.2(B) wg ZK PL. Klik w ' + refLink('1990:A1.2', 'objaśnienie') + ', ' + refLink('1990:6.10', 'kombinacje') + ', ' + refLink('1990:B3', 'K<sub>FI</sub>') + '.');
  left += `<details class="grp"${S.ui.closed.f ? '' : ' open'}><summary>${CHEV}<h3>Współczynniki częściowe i kombinacje</h3></summary><div class="gbody">${ff}</div></details>`;
  /* psi */
  const PN = [['A', 'Kat. A – mieszkalne'], ['B', 'Kat. B – biurowe'], ['C', 'Kat. C – zgromadzeń'], ['D', 'Kat. D – handlowe'], ['E', 'Kat. E – magazynowe'], ['F', 'Kat. F – pojazdy ≤ 30 kN'], ['G', 'Kat. G – pojazdy 30–160 kN'], ['H', 'Kat. H – dachy'], ['snow', 'Śnieg (H ≤ 1000 m)'], ['snowHi', 'Śnieg (H > 1000 m)'], ['wind', 'Wiatr'], ['temp', 'Temperatura'], ['constr', 'Montażowe (PN-EN 1991-1-6)']];
  const psiT = `<table class="t"><thead><tr><th>Oddziaływanie</th><th class="r">ψ<sub>0</sub></th><th class="r">ψ<sub>1</sub></th><th class="r">ψ<sub>2</sub></th></tr></thead><tbody>${PN.map(([k, n]) => `<tr><td>${n}</td>${[0, 1, 2].map(i => `<td style="width:72px"><input class="txt" style="text-align:right;height:24px" data-psi="${k}.${i}" value="${fin(EC.PSI[k][i])}"></td>`).join('')}</tr>`).join('')}</tbody></table><button type="button" class="btn sm" data-act="psiReset">Przywróć wartości z PN-EN 1990 (tabl. A1.1)</button>`;
  left += `<details class="grp"${S.ui.closed.psi ? '' : ''}><summary>${CHEV}<h3>Współczynniki kombinacyjne ψ</h3></summary><div class="gbody">${psiT}${hint(refLink('1990:A1.1', 'PN-EN 1990, tabl. A1.1') + ' – wartości można zmienić ręcznie.')}</div></details>`;
  /* kreator */
  const W = 'wiz';
  let wf = hint('Kreator tworzy kompletne zestawienie typowego budynku: układy warstw, obciążenia użytkowe, przypadki śniegu i wiatru, oddziaływania termiczne oraz zestawienia z kombinacjami – na podstawie lokalizacji i wymiarów. Każdą pozycję możesz potem zweryfikować i zmienić.');
  wf += fSel(W, 'type', 'Przeznaczenie', [['A', 'budynek mieszkalny (kat. A)'], ['B', 'budynek biurowy (kat. B)'], ['C1', 'szkoła / restauracja (C1)'], ['D1', 'handel (D1)'], ['E1', 'magazyn (E1)'], ['hala', 'hala stalowa (dach kat. H)']], { full: true });
  wf += fSel(W, 'roof', 'Dach', [['duo', 'dwuspadowy (więźba drewniana)'], ['mono', 'jednospadowy'], ['flat', 'płaski (stropodach) z attyką']], { full: true, rr: true });
  wf += fNum(W, 'L', 'długość budynku (wzdłuż kalenicy)', 'm') + fNum(W, 'B', 'szerokość budynku', 'm') + fNum(W, 'H', S.wiz.roof === 'flat' ? 'wysokość do stropodachu' : 'wysokość do kalenicy', 'm') + (S.wiz.roof !== 'flat' ? fNum(W, 'Hk', 'wysokość do okapu', 'm') + fNum(W, 'alpha', 'kąt nachylenia dachu', '°') + fNum(W, 'rafter', 'rozstaw krokwi / płatwi', 'm') : fNum(W, 'hp', 'wysokość attyki', 'm')) + fNum(W, 'n', 'liczba kondygnacji', '');
  wf += `<div style="margin-top:8px"><button type="button" class="btn pri" data-act="wizard">⚙ Utwórz zestawienie automatycznie</button> <button type="button" class="btn" data-act="example">Wczytaj przykład</button></div>`;
  left += `<details class="grp" open><summary>${CHEV}<h3>Kreator – automatyczne zestawienie</h3></summary><div class="gbody">${wf}</div></details>`;
  return listLayout('proj', phead('Projekt i lokalizacja', 'PN-EN 1990 · PN-EN 1991-1-1, -1-3, -1-4, -1-5, -1-6 · Załączniki krajowe PL', 'Wskaż lokalizację – program ustali strefę śniegową i wiatrową (z pasami przejściowymi) oraz wysokość terenu A. Parametry przenoszą się do zakładek S i W; każdą wartość można zmienić ręcznie.'), left, projSide());
}
function projSide() {
  const L = S.loc;
  const m = SVG.map(MAPL, MAPV, L, { attr: 'data-map="1"' });
  let h = `<div class="mapbar"><div class="seg"><button type="button" data-act="mapL" data-v="snow" class="${MAPL === 'snow' ? 'on' : ''}">Strefy śniegowe</button><button type="button" data-act="mapL" data-v="wind" class="${MAPL === 'wind' ? 'on' : ''}">Strefy wiatrowe</button></div><div class="seg"><button type="button" data-act="mapZ" data-v="in" aria-label="Przybliż">+</button><button type="button" data-act="mapZ" data-v="out" aria-label="Oddal">−</button><button type="button" data-act="mapZ" data-v="all">Cała Polska</button></div></div>`;
  h += `<div class="map">${m.svg}</div><div class="legend">${m.leg}<span style="margin-left:auto;color:var(--ink3)">kliknij mapę, aby wskazać miejsce · przeciągnij, aby przesunąć</span></div>`;
  const sn = R.snowSite, wb = R.windBase;
  h += `<div class="kvs" style="margin-top:10px">${kv('s<sub>k</sub> – śnieg na gruncie', sn.sk, 'kN/m²', 'hl', 3)}${kv('C<sub>e</sub>·C<sub>t</sub>·s<sub>k</sub>', sn.k, 'kN/m²', '', 3)}${kv('v<sub>b,0</sub>', wb.vb0, 'm/s', '', 1)}${kv('q<sub>b</sub>', wb.qb, 'kN/m²', 'hl', 3)}${kv('q<sub>p</sub>(10 m), kat. ' + esc(S.ws.terrain), EC.qpAt(10, S.ws, wb).qp, 'kN/m²', '', 3)}${kv('T<sub>max</sub> / T<sub>min</sub>', F(R.thermSite.Tmax, 0) + ' / ' + F(R.thermSite.Tmin, 0), '°C')}</div>`;
  h += `<div class="note">Granice stref: mapy PN-EN 1991-1-3/NA i PN-EN 1991-1-4/NA z pasami przejściowymi ±10 km (uproszczone do ok. 0,5 km). Na granicy stref lub gminy – sprawdź położenie działki.</div>`;
  return h;
}

/* =====================================================================
   G – STAŁE
   ===================================================================== */
const MAT_OPTS_CACHE = {};
function matOptions(sel) {
  const um = S.umat;
  const groups = Object.entries(MATDB.MAT_GROUPS).filter(([g]) => g !== 'usr');
  let h = groups.map(([g, gn]) => `<optgroup label="${esc(gn)}">${MATDB.MATS.filter(m => m.grp === g).map(m => `<option value="${m.k}"${m.k === sel ? ' selected' : ''}>${esc(m.n)} – ${F(m.g, m.g < 1 ? 3 : 2)} ${m.u === 'a' ? 'kN/m²' : 'kN/m³'}</option>`).join('')}</optgroup>`).join('');
  h += `<optgroup label="Własne">${um.map(u => `<option value="${esc(u.k)}"${u.k === sel ? ' selected' : ''}>${esc(u.n)} – ${F(u.g, 3)} ${u.u === 'a' ? 'kN/m²' : 'kN/m³'}</option>`).join('')}${MATDB.MATS.filter(m => m.grp === 'usr').map(m => `<option value="${m.k}"${m.k === sel ? ' selected' : ''}>${esc(m.n)}</option>`).join('')}</optgroup>`;
  return h;
}
function permForm(p) {
  const o = 'perm.' + p.id;
  let h = fTxt(o, 'name', 'Nazwa');
  if (p.type === 'line') {
    h += fSel(o, 'lmode', 'Sposób wyznaczenia', [['sec', 'przekrój elementu: γ·A (belka, słup, nadproże)'], ['wall', 'ściana: g·H·(1 − ω) (ściana na stropie / belce)'], ['val', 'wartość podana [kN/m]']], { full: true, rr: true });
    if (p.lmode === 'sec') {
      h += fSel(o, 'secShape', 'Przekrój', [['rect', 'prostokątny b × h'], ['A', 'pole przekroju A']], { rr: true });
      h += p.secShape === 'rect' ? fNum(o, 'b', 'szerokość', 'cm', { sym: 'b' }) + fNum(o, 'h', 'wysokość', 'cm', { sym: 'h' }) : fNum(o, 'A', 'pole przekroju', 'cm²', { sym: 'A', list: [[28.5, 'IPE 220'], [33.4, 'IPE 240'], [39.1, 'IPE 270'], [53.8, 'IPE 300'], [62.6, 'IPE 330'], [72.7, 'IPE 360'], [84.5, 'IPE 400']] });
      h += fNum(o, 'g', 'ciężar objętościowy', 'kN/m³', { sym: 'γ', list: [[25, 'żelbet'], [24, 'beton'], [78.5, 'stal'], [4.2, 'drewno C24'], [4.2, 'GL28c']] });
      h += fNum(o, 'extra', 'dodatki (okładziny, otulina p.poż.)', 'kN/m', { opt: true });
    } else if (p.lmode === 'wall') {
      const lays = S.perm.filter(x => x.type !== 'line');
      h += fSel(o, 'wallRef', 'Ciężar ściany g [kN/m²]', [['', 'wpisz wartość poniżej'], ...lays.map(x => [x.id, symOf('perm', x.id) + ' ' + x.name + ' – ' + F(R.perm[x.id].gk, 2) + ' kN/m²'])], { full: true, rr: true });
      if (!p.wallRef) h += fNum(o, 'gA', 'ciężar ściany na m²', 'kN/m²', { sym: 'g' });
      h += fNum(o, 'H', 'wysokość ściany', 'm', { sym: 'H' }) + fNum(o, 'open', 'udział otworów', '%', { sym: 'ω', list: [[0, ''], [10, ''], [20, ''], [30, '']] });
    } else h += fNum(o, 'v', 'obciążenie liniowe', 'kN/m', { sym: 'g<sub>k</sub>' });
    return h;
  }
  h += fNum(o, 'alpha', 'nachylenie przegrody', '°', { sym: 'α', rr: true, hint: '0° – element poziomy; dla połaci podaj kąt dachu' });
  if (num(p.alpha, 0) > 0) h += fSel(o, 'basis', 'Do zestawienia „bez przeliczeń” przyjmij', [['pow', 'na m² powierzchni połaci'], ['rzut', 'na m² rzutu poziomego (÷ cos α)']], { full: true });
  const user = umatMap();
  const rows = p.layers.map((L, i) => {
    const lo = 'lay.' + p.id + '.' + L.id;
    const m = EC.matOf(L.m, user);
    const mode = L.mode || (m.u === 'a' ? 'a' : 'v');
    const srcT = m.src === 'A' ? `<i class="A">PN-EN 1991-1-1 zał. A</i>` : m.src === 'E' ? `<i class="A">PN-EN 1991-1-3 zał. E</i>` : m.src === 'u' ? '<i>własny</i>' : '<i>orient.</i>';
    let dims;
    if (mode === 'rib') dims = `<div class="mm"><input class="txt sm" data-o="${lo}" data-k="b" data-num="1" value="${fin(L.b)}" title="szerokość b [cm]" placeholder="b"><input class="txt sm" data-o="${lo}" data-k="h" data-num="1" value="${fin(L.h)}" title="wysokość h [cm]" placeholder="h"><input class="txt sm" data-o="${lo}" data-k="a" data-num="1" value="${fin(L.a)}" title="rozstaw a [cm]" placeholder="a"></div><div class="src">b × h co a [cm]</div>`;
    else if (mode === 'a') dims = `<div class="src" style="padding-top:6px">ciężar powierzchniowy</div>`;
    else dims = `<div class="combo"><input data-o="${lo}" data-k="t" data-num="1" value="${fin(L.t)}" title="grubość t [cm]"><button type="button" tabindex="-1" data-lst="1" data-list="${esc(JSON.stringify([[0.5, ''], [1, ''], [1.5, ''], [2, ''], [3, ''], [4, ''], [5, ''], [6, ''], [8, ''], [10, ''], [12, ''], [15, ''], [18, ''], [20, ''], [22, ''], [24, ''], [25, ''], [30, '']]))}">▾</button></div><div class="src">t [cm]</div>`;
    return `<tr><td class="n">${i + 1}</td><td><select data-o="${lo}" data-k="m" data-rr="1" aria-label="Materiał">${matOptions(L.m)}</select><input class="txt" style="margin-top:3px;height:24px;font-size:12px" data-o="${lo}" data-k="nm" data-txt="1" value="${esc(L.nm || '')}" placeholder="opis warstwy (opcjonalnie)"><div class="src">${srcT}${m.r ? 'zakres ' + esc(m.r) : ''}${m.note ? ' · ' + esc(m.note) : ''}</div></td><td><select data-o="${lo}" data-k="mode" data-rr="1" style="width:74px" title="Sposób liczenia"><option value="v"${mode === 'v' ? ' selected' : ''}>γ·t</option><option value="a"${mode === 'a' ? ' selected' : ''}>g</option><option value="rib"${mode === 'rib' ? ' selected' : ''}>γ·b·h/a</option></select></td><td style="width:150px">${dims}</td><td style="width:88px"><input class="txt" style="text-align:right" data-o="${lo}" data-k="g" data-num="1" value="${fin(L.g)}" title="${mode === 'a' ? 'g [kN/m²]' : 'γ [kN/m³]'}"><div class="src">${mode === 'a' ? 'kN/m²' : 'kN/m³'}</div></td><td class="v" data-lgk="${p.id}.${i}">${F(R.perm[p.id].rows[i] ? R.perm[p.id].rows[i].gk : NaN, 3)}</td><td class="acts"><button type="button" class="ibtn" data-act="lup" data-p="${p.id}" data-l="${L.id}" title="W górę">↑</button><button type="button" class="ibtn" data-act="ldown" data-p="${p.id}" data-l="${L.id}" title="W dół">↓</button><button type="button" class="ibtn" data-act="ldel" data-p="${p.id}" data-l="${L.id}" title="Usuń warstwę">✕</button></td></tr>`;
  }).join('');
  h += `<div class="tw"><table class="lay"><thead><tr><th>#</th><th>Materiał / warstwa</th><th>Tryb</th><th>Grubość / wymiary</th><th>γ / g</th><th style="text-align:right">g<sub>k</sub> [kN/m²]</th><th></th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td></td><td colspan="4">Razem (na m² przegrody)</td><td class="v" data-ltot="${p.id}">${F(R.perm[p.id].gk, 3)}</td><td></td></tr></tfoot></table></div>`;
  h += `<button type="button" class="btn sm add" data-act="ladd" data-p="${p.id}">+ warstwa</button> <button type="button" class="btn sm add" data-act="laddrib" data-p="${p.id}">+ elementy w rozstawie (krokwie, legary)</button>`;
  return h;
}
function permSide() {
  const id = activeOf('perm', 'perm');
  const p = itemOf('perm', id);
  if (!p) return box('Wyniki', '<div class="note">Dodaj układ warstw (przegrodę) lub element liniowy.</div>');
  return box(`<span class="chip G">${symOf('perm', id)}</span> ${esc(p.name)}`, resPerm(p));
}
function resPerm(p, rep) {
  const r = R.perm[p.id];
  if (!r) return '';
  let h = '';
  if (p.type === 'line') {
    h += `<div class="kvs">${kv('g<sub>k</sub>', r.gk, 'kN/m', 'hl', 3)}${kv('g<sub>d</sub> (γ<sub>G,sup</sub>)', r.gd, 'kN/m', 'd', 3)}${kv('g<sub>d</sub> (γ<sub>G,inf</sub>)', r.gdInf, 'kN/m', '', 3)}</div>`;
    return h + warnHTML(r.warn) + stepsHTML(r.steps);
  }
  const user = umatMap();
  if (!rep) h += `<div class="diag">${SVG.layers(p, r, user)}</div>`;
  h += `<div class="kvs">${kv('g<sub>k</sub> – na m² przegrody', r.gk, 'kN/m²', 'hl', 3)}${r.alpha > 0 ? kv('g<sub>k</sub> – na m² rzutu', r.gkH, 'kN/m²', '', 3) : ''}${kv('g<sub>d</sub> = γ<sub>G,sup</sub>·g<sub>k</sub>', r.gd, 'kN/m²', 'd', 3)}${kv('γ<sub>G,inf</sub>·g<sub>k</sub>', r.gdInf, 'kN/m²', '', 3)}</div>`;
  h += `<div class="tw"><table class="t"><thead><tr><th>#</th><th>Warstwa</th><th class="r">t / wymiary</th><th class="r">γ / g</th><th class="r">g<sub>k</sub> [kN/m²]</th><th>Źródło</th></tr></thead><tbody>${r.rows.map((x, i) => { const m = EC.matOf(x.L.m, user); return `<tr><td>${i + 1}</td><td>${esc(m.n)}${x.L.nm ? `<br><small>${esc(x.L.nm)}</small>` : ''}</td><td class="num">${x.mode === 'v' ? F(x.L.t, 2) + ' cm' : x.mode === 'rib' ? F(x.L.b, 0) + '×' + F(x.L.h, 0) + ' co ' + F(x.L.a, 0) + ' cm' : '—'}</td><td class="num">${F(x.L.g, x.L.g < 1 ? 3 : 2)} ${x.mode === 'a' ? 'kN/m²' : 'kN/m³'}</td><td class="num">${F(x.gk, 3)}</td><td><small>${MATDB.SRC_TXT[m.src] || ''}${m.note ? ', ' + esc(m.note) : ''}</small></td></tr>`; }).join('')}<tr class="tot"><td></td><td colspan="3">Razem</td><td class="num">${F(r.gk, 3)}</td><td></td></tr></tbody></table></div>`;
  h += warnHTML(r.warn) + stepsHTML(r.steps);
  return h;
}
function permTab() {
  const left = addBar('perm', { layers: 'Układ warstw (przegroda)', line: 'Element liniowy (belka, ściana)' }) + S.perm.map((p, i) => itemBox('perm', p, i, permForm(p))).join('') + (S.perm.length ? '' : '<div class="msg info">Brak pozycji – dodaj układ warstw stropu, dachu lub ściany.</div>');
  return listLayout('perm', phead('Obciążenia stałe G', 'PN-EN 1991-1-1 · rozdz. 5 · zał. A', 'Każdy układ to przegroda złożona z warstw. Wybierz materiał – ciężar objętościowy podstawia się z bazy (możesz go zmienić), wpisz grubość. Dla elementów w rozstawie (krokwie, legary) użyj trybu γ·b·h/a. Elementy liniowe (belki, ściany na stropie) liczone są w kN/m.'), left, permSide());
}

/* =====================================================================
   Q – UŻYTKOWE
   ===================================================================== */
const PART_LIST = [[0.25, 'g-k 1×12,5 mm na profilach'], [0.5, 'g-k 2×12,5 mm na profilach'], [0.8, 'płyty gipsowe pełne 8 cm'], [1.33, 'pustak ceramiczny 8 cm + tynk cw 2×1,5 cm'], [1.75, 'BK600 12 cm + tynk 2×1 cm'], [2.09, 'silikat 8 cm + tynk cw 2×1,5 cm'], [2.85, 'silikat 12 cm + tynk 2×1,5 cm']];
function impForm(it) {
  const o = 'imp.' + it.id;
  let h = fTxt(o, 'name', 'Nazwa');
  h += fSel(o, 'kind', 'Rodzaj', Object.entries(IMP_T), { full: true, rr: true });
  if (it.kind === 'cat') {
    h += fSel(o, 'cat', 'Kategoria użytkowania', [...EC.CAT_ORDER.map(k => [k, EC.CAT[k].n])], { full: true, rr: true });
    const c = EC.CAT[it.cat] || EC.CAT.A1;
    if (it.cat === 'I') h += fSel(o, 'like', 'Kategoria odniesienia (taras)', ['A1', 'A3', 'B', 'C1', 'C2', 'C3', 'C4', 'C5', 'D1', 'D2'].map(k => [k, EC.CAT[k].n]), { full: true, rr: true });
    h += hint(c.d);
    h += fNum(o, 'qk', 'obciążenie równomierne', 'kN/m²', { sym: 'q<sub>k</sub>', list: catList(c.rq), hint: 'zakres wg normy: ' + c.rq + ' kN/m²' });
    h += fNum(o, 'Qk', 'obciążenie skupione', 'kN', { sym: 'Q<sub>k</sub>', hint: 'zakres wg normy: ' + c.rQ + ' kN' });
    if (['A', 'B', 'C', 'D', 'I'].includes(c.g)) {
      h += fChk(o, 'useAA', 'redukcja ze względu na pole powierzchni α<sub>A</sub> (elementy stropu)');
      if (it.useAA) h += fNum(o, 'Aarea', 'pole obciążone', 'm²', { sym: 'A' });
      h += fChk(o, 'useAN', 'redukcja ze względu na liczbę kondygnacji α<sub>n</sub> (słupy, ściany)');
      if (it.useAN) h += fNum(o, 'nst', 'liczba kondygnacji nad elementem', '', { sym: 'n' });
    }
    if (c.g === 'E') {
      h += sub('Sprawdzenie składowanego materiału (zał. A)');
      h += fSel(o, 'storeM', 'Materiał składowany', [['', '— wybierz —'], ...MATDB.MATS.filter(m => m.grp === 'skl' || m.grp === 'grn').map(m => [m.k, m.n + ' – ' + F(m.g, 1) + ' kN/m³'])], { full: true, rr: true });
      h += fNum(o, 'storeG', 'ciężar objętościowy', 'kN/m³', { sym: 'γ' }) + fNum(o, 'storeH', 'wysokość składowania', 'm', { sym: 'h' });
    }
  } else if (it.kind === 'part') {
    h += fSel(o, 'cat', 'Kategoria stropu (ψ)', ['A1', 'B', 'C1', 'C3', 'D1'].map(k => [k, EC.CAT[k].n]), { full: true });
    h += fSel(o, 'wmode', 'Ciężar ścianki', [['calc', 'oblicz: g [kN/m²] × wysokość'], ['val', 'podaj ciężar na m długości']], { rr: true, full: true });
    if (it.wmode === 'calc') h += fNum(o, 'wg', 'ciężar ścianki na m²', 'kN/m²', { sym: 'g', list: PART_LIST }) + fNum(o, 'wh', 'wysokość ścianki', 'm', { sym: 'h' });
    else h += fNum(o, 'w', 'ciężar ścianki na m długości', 'kN/m', { sym: 'G<sub>k</sub>' });
  } else if (it.kind === 'barrier') {
    h += fSel(o, 'bcat', 'Kategoria powierzchni', Object.entries(EC.BARRIER).map(([k, v]) => [k, v.n + ' (' + v.r + ')']), { full: true, rr: true });
    h += fNum(o, 'qk', 'obciążenie poziome', 'kN/m', { sym: 'q<sub>k</sub>' });
  } else if (it.kind === 'fork') {
    h += fSel(o, 'fl', 'Klasa wózka', Object.entries(EC.FORK).map(([k, v]) => [k, k + ' – udźwig ' + v.cap + ' kN, ciężar całk. ' + v.gross + ' kN']), { full: true, rr: true });
    h += fSel(o, 'tyre', 'Ogumienie', [['pneu', 'pneumatyczne – φ = 1,40'], ['solid', 'pełne – φ = 2,00']], { full: true });
    h += fNum(o, 'Qax', 'obciążenie osi (puste = tabl. 6.6)', 'kN', { opt: true, sym: 'Q<sub>k</sub>', ph: String((EC.FORK[it.fl] || EC.FORK.FL1).Qax) });
  } else if (it.kind === 'constr') {
    h += fNum(o, 't', 'grubość betonowanej płyty', 'm', { sym: 't' }) + fNum(o, 'gc', 'ciężar świeżego betonu', 'kN/m³', { sym: 'γ', list: [[26, 'żelbet świeży'], [25, 'beton świeży']] }) + fNum(o, 'qcc', 'ciężar deskowania', 'kN/m²', { sym: 'Q<sub>cc</sub>', list: [[0.3, 'deskowanie systemowe lekkie'], [0.5, 'typowe'], [0.8, 'ciężkie']] });
  } else {
    h += fNum(o, 'qk', 'wartość charakterystyczna', '', { sym: 'q<sub>k</sub>' });
    h += fSel(o, 'unit', 'Jednostka', [['kN/m²', 'kN/m²'], ['kN/m', 'kN/m'], ['kN', 'kN']]);
    h += fNum(o, 'p0', '', '', { sym: 'ψ<sub>0</sub>' }) + fNum(o, 'p1', '', '', { sym: 'ψ<sub>1</sub>' }) + fNum(o, 'p2', '', '', { sym: 'ψ<sub>2</sub>' });
  }
  return h;
}
function catList(rq) { const m = String(rq).match(/[\d,]+/g); return (m || []).map(x => [pnum(x), '']).filter(x => isNum(x[0])); }
function resImp(it) {
  const r = R.imp[it.id];
  if (!r) return '';
  let h = '<div class="kvs">';
  if (it.kind === 'fork') h += kv('Q<sub>k</sub> (oś)', r.Qk, 'kN', '', 1) + kv('Q<sub>k,dyn</sub> = φ·Q<sub>k</sub>', r.Qdyn, 'kN', 'hl', 1) + kv('Q<sub>d</sub>', r.Qd, 'kN', 'd', 1);
  else {
    h += kv('q<sub>k</sub> – charakterystyczne', r.qk, r.unit, 'hl', 3) + kv('q<sub>d</sub> = γ<sub>Q</sub>·q<sub>k</sub>', r.qd, r.unit, 'd', 3);
    if (it.kind === 'cat' && isNum(it.Qk)) h += kv('Q<sub>k</sub> – skupione', it.Qk, 'kN', '', 1) + kv('Q<sub>d</sub>', r.Qd, 'kN', 'd', 1);
    if (it.kind === 'part') h += kv('ciężar ścianki', r.wline, 'kN/m', '', 2);
    if (it.kind === 'constr') h += kv('poza obszarem roboczym', r.Qcf + 0.75, 'kN/m²', '', 3);
  }
  h += `<div class="kv"><span class="k">ψ<sub>0</sub> / ψ<sub>1</sub> / ψ<sub>2</sub></span><span class="v">${(r.psi || []).map(x => F(x, 1)).join(' / ')}</span></div></div>`;
  if (it.kind === 'cat' && EC.CAT[it.cat] && !['H', 'E'].includes(EC.CAT[it.cat].g)) h += noteHTML('Q<sub>k</sub> sprawdza się oddzielnie (bez łączenia z q<sub>k</sub>) – na kwadracie 50×50 mm, o ile norma nie stanowi inaczej (6.3.1.2(5)).');
  return h + warnHTML(r.warn) + stepsHTML(r.steps);
}
function impSide() {
  const id = activeOf('imp', 'imp');
  const it = itemOf('imp', id);
  if (!it) return box('Wyniki', '<div class="note">Dodaj obciążenie użytkowe.</div>');
  return box(`<span class="chip Q">${symOf('imp', id)}</span> ${esc(it.name)}`, resImp(it));
}
function impTab() {
  const left = addBar('imp', IMP_T) + S.imp.map((it, i) => itemBox('imp', it, i, impForm(it))).join('') + (S.imp.length ? '' : '<div class="msg info">Brak pozycji.</div>');
  return listLayout('imp', phead('Obciążenia użytkowe Q', 'PN-EN 1991-1-1 · rozdz. 6 · PN-EN 1991-1-6', 'Kategorie użytkowania A–K z wartościami zalecanymi (zakresy z tablic normy pokazane przy polach), redukcje α<sub>A</sub> i α<sub>n</sub>, ścianki działowe, bariery, wózki widłowe i obciążenia montażowe. Obciążenia użytkowe tego samego elementu sumuje się jako jedno oddziaływanie (3.3.1(2)).'), left, impSide());
}

/* =====================================================================
   S – ŚNIEG
   ===================================================================== */
function snowSiteForm() {
  const o = 'ss';
  let f = fSel(o, 'zone', 'Strefa obciążenia śniegiem', [[1, 'Strefa 1'], [2, 'Strefa 2'], [3, 'Strefa 3'], [4, 'Strefa 4'], [5, 'Strefa 5']], { numv: true, full: true });
  f += fSel(o, 'zoneB', 'Pas przejściowy – strefa sąsiednia', [[0, 'brak'], [1, 'Strefa 1'], [2, 'Strefa 2'], [3, 'Strefa 3'], [4, 'Strefa 4'], [5, 'Strefa 5']], { numv: true, rr: true, full: true });
  if (+S.ss.zoneB) { f += fSel(o, 'trans', 'W pasie przejściowym przyjmij', [['avg', 'średnią z obu stref'], ['max', 'wartość większą'], ['man', 's_k wpisane ręcznie']], { rr: true, full: true }); if (S.ss.trans === 'man') f += fNum(o, 'skTrans', 'w pasie przejściowym', 'kN/m²', { sym: 's<sub>k</sub>' }); }
  f += fNum(o, 'A', 'wysokość terenu n.p.m.', 'm', { sym: 'A', hint: isNum(S.loc.A) ? 'z lokalizacji: ' + F(S.loc.A, 0) + ' m' : '' });
  f += fSel(o, 'Ce', 'Współczynnik ekspozycji C<sub>e</sub>', [[0.8, '0,8 – teren wystawiony na działanie wiatru'], [1, '1,0 – teren normalny'], [1.2, '1,2 – teren osłonięty']], { numv: true, full: true });
  f += fNum(o, 'Ct', 'współczynnik termiczny', '', { sym: 'C<sub>t</sub>', list: [[1, 'zwykle'], [0.9, ''], [0.8, '']] });
  f += fChk(o, 'skMan', 'podaję s<sub>k</sub> ręcznie');
  if (S.ss.skMan) f += fNum(o, 'skUser', 'obciążenie śniegiem gruntu', 'kN/m²', { sym: 's<sub>k</sub>' });
  return f;
}
function snowSiteRes() {
  const z = R.snowSite;
  let h = `<div class="kvs">${kv('s<sub>k</sub>', z.sk, 'kN/m²', 'hl', 3)}${kv('C<sub>e</sub>·C<sub>t</sub>·s<sub>k</sub>', z.k, 'kN/m²', '', 3)}${kv('ψ<sub>0</sub> / ψ<sub>1</sub> / ψ<sub>2</sub>', z.psi.map(x => F(x, 1)).join(' / '), '')}</div>`;
  h += warnHTML(z.warn) + stepsHTML(z.steps);
  const As = [0, 200, 300, 400, 500, 600, 800, 1000];
  h += `<div class="tw"><table class="t"><thead><tr><th>A [m]</th>${As.map(a => `<th class="r">${a}</th>`).join('')}</tr></thead><tbody>${[1, 2, 3, 4, 5].map(zn => `<tr${zn === +S.ss.zone ? ' class="gov"' : ''}><td>strefa ${zn}</td>${As.map(a => `<td class="num">${F(EC.skZone(zn, a).sk, 2)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  h += noteHTML('W Polsce nie stosuje się wyjątkowego obciążenia śniegiem gruntu ani wyjątkowych zasp (zał. A i B PN-EN 1991-1-3) – rozpatruje się sytuacje trwałe i przejściowe. ' + refLink('1-3:NA', 'Objaśnienie ZK'));
  return h;
}
function snowForm(c) {
  const o = 'snow.' + c.id;
  let h = fTxt(o, 'name', 'Nazwa') + fSel(o, 'type', 'Przypadek', Object.entries(SNOW_T), { full: true, rr: true });
  switch (c.type) {
    case 'mono': h += fNum(o, 'a1', 'kąt nachylenia połaci', '°', { sym: 'α', hint: 'dach płaski: α = 0…5°' }) + fChk(o, 'guard', 'śniegołapy lub attyka przy okapie (μ<sub>1</sub> ≥ 0,8)', { rr: false }); break;
    case 'duo': h += fNum(o, 'a1', 'połać 1', '°', { sym: 'α<sub>1</sub>' }) + fNum(o, 'a2', 'połać 2', '°', { sym: 'α<sub>2</sub>' }) + fChk(o, 'guard', 'śniegołapy lub attyki przy okapach (μ<sub>1</sub> ≥ 0,8)', { rr: false }); break;
    case 'multi': h += hint('Kąty dwóch połaci tworzących kosz między przęsłami.') + fNum(o, 'a1', 'połać przy koszu', '°', { sym: 'α<sub>1</sub>' }) + fNum(o, 'a2', 'połać przy koszu', '°', { sym: 'α<sub>2</sub>' }); break;
    case 'cyl': h += fNum(o, 'h', 'strzałka łuku', 'm', { sym: 'h' }) + fNum(o, 'b', 'rozpiętość', 'm', { sym: 'b' }); break;
    case 'tall': h += hint('Niższy dach płaski przy wyższej budowli (5.3.6): zwiewanie i zsuwanie śniegu z wyższego dachu.') + fNum(o, 'h', 'różnica wysokości dachów', 'm', { sym: 'h' }) + fNum(o, 'b1', 'szerokość wyższej budowli', 'm', { sym: 'b<sub>1</sub>' }) + fNum(o, 'b2', 'szerokość niższego dachu', 'm', { sym: 'b<sub>2</sub>' }) + fNum(o, 'au', 'spadek połaci wyższego dachu', '°', { sym: 'α', hint: '≤ 15° – bez zsuwania' }) + fNum(o, 'bu', 'rzut połaci, z której zsuwa się śnieg', 'm', { sym: 'b<sub>p</sub>' }); break;
    case 'obst': h += hint('Zaspa przy attyce, ściance lub nadbudówce na dachu płaskim (6.2).') + fNum(o, 'h', 'wysokość przeszkody ponad dachem', 'm', { sym: 'h' }) + fNum(o, 'L', 'długość dachu (do schematu)', 'm', { sym: 'L' }); break;
    case 'over': h += hint('Nawis na krawędzi dachu (6.3) – obciążenie liniowe okapu, dodatkowe do obciążenia połaci.') + fNum(o, 'mu', 'współczynnik kształtu połaci', '', { sym: 'μ' }) + fChk(o, 'dman', 'podaję grubość warstwy śniegu d') + (c.dman ? fNum(o, 'd', 'grubość warstwy śniegu', 'm', { sym: 'd' }) : ''); break;
    case 'guard': h += fNum(o, 'a1', 'kąt nachylenia połaci', '°', { sym: 'α' }) + fNum(o, 'b', 'rzut od bariery do kalenicy / następnej bariery', 'm', { sym: 'b' }) + fChk(o, 'muMan', 'podaję μ ręcznie') + (c.muMan ? fNum(o, 'mu', 'współczynnik kształtu', '', { sym: 'μ' }) : ''); break;
  }
  return h;
}
function resSnow(c, rep) {
  const r = R.snow[c.id]; if (!r) return '';
  let h = `<div class="diag">${SVG.snow(r.diag, r.cases)}</div><div class="kvs">`;
  r.vals.slice(0, 5).forEach((v, k) => { h += kv(v.label, v.v, v.unit, v.key === r.def ? 'hl' : '', 3); });
  const dv = r.vals.find(v => v.key === r.def) || r.vals[0];
  if (dv) h += kv('wartość obliczeniowa (' + strip(dv.label).split(' ')[0] + ')', dv.vd, dv.unit, 'd', 3);
  h += '</div>' + warnHTML(r.warn) + noteHTML(r.note) + stepsHTML(r.steps);
  return h;
}
function snowSide() {
  const id = activeOf('snow', 'snow', 'site');
  if (id === 'site') return box('<span class="chip S">s<sub>k</sub></span> Obciążenie śniegiem gruntu', snowSiteRes());
  const c = itemOf('snow', id);
  return box(`<span class="chip S">${symOf('snow', id)}</span> ${esc(c.name)}`, resSnow(c));
}
function snowTab() {
  let left = siteBox('snow', 'site', 'S', 'Lokalizacja – obciążenie śniegiem gruntu s<sub>k</sub>', snowSiteForm(), `s<sub>k</sub> = <b>${F(R.snowSite.sk, 3)}</b> kN/m²`);
  left += addBar('snow', SNOW_T) + S.snow.map((c, i) => itemBox('snow', c, i, snowForm(c))).join('');
  return listLayout('snow', phead('Obciążenie śniegiem S', 'PN-EN 1991-1-3 · ZK PL', 's = μ<sub>i</sub>·C<sub>e</sub>·C<sub>t</sub>·s<sub>k</sub> – na m² rzutu poziomego dachu. Strefa i wysokość A pochodzą z lokalizacji (możesz je zmienić). Dodawaj przypadki: dachy jedno-, dwu- i wielopołaciowe, walcowe, zaspy przy wyższej budowli i attykach, nawisy i bariery przeciwśnieżne.'), left, snowSide());
}

/* =====================================================================
   W – WIATR
   ===================================================================== */
const CPI_M = [['std', '+0,2 / −0,3 – brak danych o otworach'], ['dom', 'ściana dominująca (7.2.9(5))'], ['mu', 'wg współczynnika otworów μ (rys. 7.13)'], ['man', 'podaję c_pi'], ['none', 'pomiń (c_pi = 0)']];
function windSiteForm() {
  const o = 'ws', w = S.ws;
  let f = fSel(o, 'zone', 'Strefa obciążenia wiatrem', [[1, 'Strefa 1'], [2, 'Strefa 2'], [3, 'Strefa 3']], { numv: true, full: true });
  f += fSel(o, 'zoneB', 'Pas przejściowy – strefa sąsiednia', [[0, 'brak'], [1, 'Strefa 1'], [2, 'Strefa 2'], [3, 'Strefa 3']], { numv: true, rr: true, full: true });
  if (+w.zoneB) f += fSel(o, 'trans', 'W pasie przejściowym przyjmij', [['avg', 'średnią z obu stref'], ['max', 'wartość większą']], { full: true });
  f += fNum(o, 'A', 'wysokość terenu n.p.m.', 'm', { sym: 'A' });
  f += fChk(o, 'vbMan', 'podaję v<sub>b,0</sub> ręcznie');
  if (w.vbMan) f += fNum(o, 'vb0User', 'bazowa prędkość wiatru', 'm/s', { sym: 'v<sub>b,0</sub>' });
  f += fSel(o, 'terrain', 'Kategoria terenu', Object.entries(EC.TER_NA).map(([k, v]) => [k, v.n]), { full: true });
  f += fSel(o, 'method', 'Szczytowe ciśnienie prędkości q<sub>p</sub>', [['NA', 'wg ZK PL: q_p = c_e(z)·q_b (tabl. NA.3) – zalecane w Polsce'], ['EN', 'wzory ogólne (4.3)–(4.8), wartości zalecane CEN (jak eurocodeapplied.com)'], ['man', 'podaję q_p ręcznie']], { rr: true, full: true });
  if (w.method === 'EN') f += fNum(o, 'co', 'współczynnik rzeźby terenu', '', { sym: 'c<sub>o</sub>', hint: '1,0 – teren płaski; > 1 wg zał. A.3' }) + fNum(o, 'kI', 'współczynnik turbulencji', '', { sym: 'k<sub>I</sub>' }) + fNum(o, 'rho', 'gęstość powietrza', 'kg/m³', { sym: 'ρ' });
  if (w.method === 'man') f += fNum(o, 'qpUser', 'szczytowe ciśnienie prędkości', 'kN/m²', { sym: 'q<sub>p</sub>' });
  f += fNum(o, 'cdir', 'współczynnik kierunkowy', '', { sym: 'c<sub>dir</sub>', hint: '1,0 – bezpiecznie (wartości kierunkowe – ZK, tabl. NA.2)' });
  f += fNum(o, 'cseason', 'współczynnik sezonowy', '', { sym: 'c<sub>season</sub>' });
  f += fNum(o, 'cscd', 'współczynnik konstrukcyjny', '', { sym: 'c<sub>s</sub>c<sub>d</sub>', hint: '1,0 dla budynków h < 15 m i elementów o f > 5 Hz (6.2)' });
  return f;
}
function windSiteRes() {
  const wb = R.windBase;
  let h = `<div class="kvs">${kv('v<sub>b,0</sub>', wb.vb0, 'm/s', '', 2)}${kv('v<sub>b</sub>', wb.vb, 'm/s', '', 2)}${kv('q<sub>b</sub>', wb.qb, 'kN/m²', 'hl', 3)}${kv('ψ<sub>0</sub>/ψ<sub>1</sub>/ψ<sub>2</sub>', EC.PSI.wind.map(x => F(x, 1)).join(' / '), '')}</div>`;
  h += stepsHTML(wb.steps);
  const zs = [2, 5, 8, 10, 12, 15, 20, 25, 30, 40, 50];
  const cmp = EC.qpCompare(S.ws, zs);
  h += `<div class="lsub">Profil q<sub>p</sub>(z) – kategoria terenu ${esc(S.ws.terrain)}; porównanie metod</div><div class="tw"><table class="t"><thead><tr><th>z [m]</th>${zs.map(z => `<th class="r">${z}</th>`).join('')}</tr></thead><tbody>`;
  h += `<tr${S.ws.method === 'NA' ? ' class="gov"' : ''}><td>q<sub>p</sub> ZK (NA.3)</td>${cmp.map(c => `<td class="num">${F(c.na, 3)}</td>`).join('')}</tr>`;
  h += `<tr${S.ws.method === 'EN' ? ' class="gov"' : ''}><td>q<sub>p</sub> CEN (4.8)</td>${cmp.map(c => `<td class="num">${F(c.en, 3)}</td>`).join('')}</tr>`;
  h += `<tr><td>różnica ZK/CEN</td>${cmp.map(c => `<td class="num">${Fs(c.d * 100, 1)}%</td>`).join('')}</tr>`;
  h += `<tr><td>c<sub>e</sub>(z) ZK</td>${cmp.map(c => `<td class="num">${F(c.ceNA, 3)}</td>`).join('')}</tr></tbody></table></div>`;
  h += `<div class="msg info">Kalkulatory oparte na wartościach zalecanych CEN (np. eurocodeapplied.com – nie obsługuje polskiego ZK) liczą q<sub>p</sub> wzorami ogólnymi (4.3)–(4.8). Polski Załącznik krajowy stosuje uproszczony współczynnik ekspozycji c<sub>e</sub>(z) z tabl. NA.3 – dla kategorii III i IV oraz małych wysokości daje wartości wyższe (do ok. +28%). W projektach w Polsce obowiązuje ZK. ${refLink('1-4:4.5NA', 'Szczegóły')}</div>`;
  return h;
}
function windForm(c) {
  const o = 'wind.' + c.id;
  let h = fTxt(o, 'name', 'Nazwa') + fSel(o, 'type', 'Element', Object.entries(WIND_T), { full: true, rr: true });
  const bld = ['walls', 'flat', 'mono', 'duo', 'hip'].includes(c.type);
  if (bld) {
    const ridge = ['mono', 'duo', 'hip'].includes(c.type);
    h += sub('Wymiary budynku');
    h += fNum(o, 'h', c.type === 'flat' ? 'wysokość do dachu (bez attyki)' : ridge ? 'wysokość do kalenicy / wyższej krawędzi' : 'wysokość budynku', 'm', { sym: 'h' });
    h += fNum(o, 'b', ridge ? (c.type === 'mono' ? 'długość budynku (wzdłuż okapów)' : 'długość budynku (wzdłuż kalenicy)') : 'długość budynku', 'm', { sym: 'L' });
    h += fNum(o, 'd', ridge ? 'szerokość budynku (w kierunku spadku)' : 'szerokość budynku', 'm', { sym: 'B', hint: 'Kierunki wiatru przełączasz na schemacie: θ = 0° – wiatr prostopadły do L (b = L, d = B); θ = 90° – równoległy do L (b = B, d = L)' + (c.type === 'mono' ? '; θ = 180° – na wyższą krawędź' : '') + '.' });
    if (ridge) h += fNum(o, 'a', c.type === 'hip' ? 'połać główna' : 'kąt nachylenia', '°', { sym: c.type === 'hip' ? 'α<sub>0</sub>' : 'α', hint: c.type === 'duo' ? 'ujemny – dach odwrócony (motylkowy)' : '' });
    if (c.type === 'hip') h += fNum(o, 'a90', 'połać boczna', '°', { sym: 'α<sub>90</sub>' });
    if (c.type === 'flat') {
      h += fSel(o, 'eaves', 'Krawędź dachu', [['sharp', 'ostra'], ['par', 'z attyką'], ['cur', 'zaokrąglona'], ['man', 'mansardowa']], { rr: true, full: true });
      if (c.eaves === 'par') h += fNum(o, 'hp', 'wysokość attyki', 'm', { sym: 'h<sub>p</sub>' });
      if (c.eaves === 'cur') h += fNum(o, 'rr', 'promień zaokrąglenia', 'm', { sym: 'r' });
      if (c.eaves === 'man') h += fNum(o, 'am', 'kąt mansardy', '°', { sym: 'α' });
    }
    h += fNum(o, 'Aload', 'pole obciążone (c<sub>pe,1</sub>…c<sub>pe,10</sub>)', 'm²', { sym: 'A', list: [[10, 'konstrukcja nośna (c_pe,10)'], [1, 'mocowania, pokrycie (c_pe,1)'], [2, ''], [5, '']] });
    h += sub('Ciśnienie wewnętrzne c<sub>pi</sub>');
    h += fSel(o, 'cpiMode', 'Sposób wyznaczenia', CPI_M, { rr: true, full: true });
    if (c.cpiMode === 'dom') h += fSel(o, 'cpiFace', 'Ściana dominująca', [['D', 'D – nawietrzna'], ['E', 'E – zawietrzna'], ['A', 'A – boczna, przy narożu'], ['B', 'B – boczna'], ['C', 'C – boczna']], { full: true }) + fNum(o, 'cpiRatio', 'pole otworów ściany dominującej / pozostałych', '×', { hint: '2 → 0,75·c<sub>pe</sub>; ≥ 3 → 0,90·c<sub>pe</sub>' });
    if (c.cpiMode === 'mu') h += fNum(o, 'cpiMuV', 'Σ otworów z c<sub>pe</sub> ≤ 0 / Σ wszystkich', '', { sym: 'μ' });
    if (c.cpiMode === 'man') h += fNum(o, 'cpi1', '', '', { sym: 'c<sub>pi,1</sub>' }) + fNum(o, 'cpi2', '', '', { sym: 'c<sub>pi,2</sub>', opt: true });
  } else if (c.type === 'canopy1' || c.type === 'canopy2') {
    h += fNum(o, 'h', 'wysokość wiaty (z<sub>e</sub>)', 'm', { sym: 'h' }) + fNum(o, 'b', 'długość wiaty', 'm', { sym: 'b' }) + fNum(o, 'd', 'szerokość wiaty (w kierunku wiatru)', 'm', { sym: 'd' }) + fNum(o, 'a', 'kąt nachylenia', '°', { sym: 'α', hint: c.type === 'canopy2' ? 'ujemny – wiata odwrócona (kosz w środku)' : '0–30°' });
    h += fNum(o, 'phi', 'stopień zablokowania pod wiatą', '', { sym: 'φ', list: [[0, 'pusta'], [0.5, ''], [1, 'całkowicie zablokowana po stronie zawietrznej']] });
  } else if (c.type === 'fwall') {
    h += fSel(o, 'mode', 'Element', [['wall', 'ściana wolnostojąca (ogrodzenie, ekran)'], ['par', 'attyka na dachu budynku']], { rr: true, full: true });
    h += fNum(o, 'h', c.mode === 'par' ? 'wysokość attyki' : 'wysokość ściany', 'm', { sym: c.mode === 'par' ? 'h<sub>p</sub>' : 'h' }) + fNum(o, 'l', 'długość', 'm', { sym: 'l' });
    if (c.mode === 'par') h += fNum(o, 'hb', 'wysokość budynku do dachu', 'm', { sym: 'h<sub>bud</sub>' });
    h += fNum(o, 'phi', 'współczynnik wypełnienia (0,8–1,0)', '', { sym: 'φ' }) + fNum(o, 'psis', 'współczynnik osłonięcia', '', { sym: 'ψ<sub>s</sub>', hint: '1,0 – brak osłony (rys. 7.20)' }) + fChk(o, 'ret', 'narożniki zagięte o długości ≥ h', { rr: false });
  } else if (c.type === 'sign') {
    h += fNum(o, 'b', 'szerokość tablicy', 'm', { sym: 'b' }) + fNum(o, 'h', 'wysokość tablicy', 'm', { sym: 'h' }) + fNum(o, 'zg', 'wysokość dolnej krawędzi nad terenem', 'm', { sym: 'z<sub>g</sub>' });
  } else if (c.type === 'force') {
    h += fNum(o, 'zeF', 'wysokość odniesienia', 'm', { sym: 'z<sub>e</sub>' }) + fNum(o, 'cf', 'współczynnik siły', '', { sym: 'c<sub>f</sub>', list: [[2.0, 'pręt prostokątny d/b ≈ 1 (ok.)'], [1.8, 'tablica'], [1.2, 'walec chropowaty (ok.)'], [0.7, 'walec gładki nadkrytyczny (ok.)']], hint: 'wg rozdz. 7.6–7.13 PN-EN 1991-1-4' }) + fNum(o, 'Aref', 'pole odniesienia', 'm²', { sym: 'A<sub>ref</sub>' });
  } else if (c.type === 'fric') {
    h += fNum(o, 'h', 'wysokość budynku', 'm', { sym: 'h' }) + fNum(o, 'b', 'wymiar prostopadły do wiatru', 'm', { sym: 'b' }) + fNum(o, 'd', 'długość w kierunku wiatru', 'm', { sym: 'd' }) + fNum(o, 'cfr', 'współczynnik tarcia', '', { sym: 'c<sub>fr</sub>', list: [[0.01, 'gładka (stal, beton gładki)'], [0.02, 'szorstka (beton szorstki, papa)'], [0.04, 'bardzo szorstka (fałdy, żebra)']] });
  }
  if (bld || c.type === 'canopy1' || c.type === 'canopy2' || c.type === 'fric' || (c.type === 'fwall' && c.mode !== 'par')) {
    h += fChk(o, 'zeUse', 'inna wysokość odniesienia z<sub>e</sub> (np. przewyższenie terenu)');
    if (c.zeUse) h += fNum(o, 'zeMan', 'wysokość odniesienia', 'm', { sym: 'z<sub>e</sub>' });
  }
  return h;
}
const zLabel = z => String(z).replace('Fup', 'F<sub>up</sub>').replace('Flow', 'F<sub>low</sub>');
const BLD_W = ['walls', 'flat', 'mono', 'duo', 'hip'];
const thLbl = th => 'θ = ' + th + '°';
function windDir(c, r) { const ds = r.dirs || []; if (!ds.length) return null; return ds.find(x => x.th === String(c.theta)) || ds[0]; }
function windRowsOf(r, D) { return D ? D.rows : (r.zones || []).filter(z => !z.head); }
function windSelKey(c, r, D) {
  const rows = windRowsOf(r, D);
  if (!rows.length) return '';
  const k = (S.ui.wz || {})[c.id] || '';
  const hit = rows.find(x => x.z === k);
  if (hit) return hit.z;
  const base = String(k).replace(/[₀₉₁₈]+$/, '');
  const byBase = base && rows.find(x => x.base === base);
  if (byBase) return byBase.z;
  const def = String(r.def || '').replace(/[₀₉₁₈]+$/, '');
  return (rows.find(x => x.base === def) || rows[0]).z;
}
function windDiagram(c, r, D, sel) {
  if (D && BLD_W.includes(c.type)) return SVG.wind.bld(c.id, c.type, r, D, sel);
  if (c.type === 'canopy1' || c.type === 'canopy2') return SVG.wind.canopy(c.id, r, r.zones, sel, c.type === 'canopy2');
  if (c.type === 'fwall') return SVG.wind.fwall(c.id, r, c, sel);
  return '';
}
function windDirSeg(c, r, D) {
  if (!r.dirs || r.dirs.length < 2) return '';
  return `<div class="seg wdirs" role="tablist" aria-label="Kierunek wiatru">${r.dirs.map(x => `<button type="button" data-wdir="${c.id}|${x.th}" class="${x === D ? 'on' : ''}" title="${esc(strip(x.head))}">${thLbl(x.th)}</button>`).join('')}</div>`;
}
function windZoneInfo(c, r, D, key) {
  const rows = windRowsOf(r, D);
  const z = rows.find(x => x.z === key);
  if (!z) return '<div class="wzinfo"><div class="note">Kliknij strefę na schemacie lub w tabeli, aby zobaczyć ciśnienia.</div></div>';
  const gQ = S.f.gQ * (S.f.useKFI ? (EC.KFI[S.f.rc] || 1) : 1);
  const v = SVG.wind.govVal(z);
  let h = `<div class="wzinfo"><div class="wzh"><span class="zb ${v < 0 ? 's' : 'p'}">${zLabel(z.base || z.z)}</span><b>Strefa ${zLabel(z.z)}</b>${D ? `<span>${esc(strip(D.head))}</span>` : ''}<span class="hint" style="margin:0">${z.dim || ''}</span></div>`;
  h += '<div class="kvs">' + kv('w<sub>net,max</sub> (charakt.)', z.max.w, 'kN/m²', z.max.w >= 0 ? 'hl' : '', 3) + kv('w<sub>net,min</sub> (charakt.)', z.min.w, 'kN/m²', z.min.w < 0 ? 'hl' : '', 3) + kv('w<sub>d,max</sub> = γ<sub>Q</sub>·w', gQ * z.max.w, 'kN/m²', 'd', 3) + kv('w<sub>d,min</sub> = γ<sub>Q</sub>·w', gQ * z.min.w, 'kN/m²', 'd', 3) + kv('q<sub>p</sub>(z<sub>e</sub>)', r.qp, 'kN/m²', '', 3) + (isNum(z.area) && z.area > 0 ? kv('pole strefy', z.area, 'm²', '', 2) : '') + '</div>';
  if (z.cand && z.cand.length) {
    const cellTxt = k => { const cl = z.cells && z.cells[k]; return cl ? `${Fs(cl[0], 2)} / ${Fs(cl[1], 2)}` : ''; };
    h += `<div class="tw"><table class="t"><thead><tr><th>c<sub>pe,10</sub> / c<sub>pe,1</sub> → c<sub>pe</sub></th><th class="r">c<sub>pi</sub></th><th class="r">w<sub>e</sub></th><th class="r">w<sub>i</sub></th><th class="r">w<sub>net</sub></th><th class="r">w<sub>d</sub></th></tr></thead><tbody>${z.cand.map(x => `<tr${x === z.max || x === z.min ? ' class="gov"' : ''}><td>${cellTxt(x.k)} → <b>${Fs(x.cpe, 3)}</b></td><td class="num">${Fs(x.cpi, 2)}</td><td class="num">${F(x.we, 3)}</td><td class="num">${F(x.wi, 3)}</td><td class="num ${x.w >= 0 ? 'p' : 's'}">${F(x.w, 3)}</td><td class="num">${F(gQ * x.w, 3)}</td></tr>`).join('')}</tbody></table></div>`;
    h += `<div class="note">c<sub>pe</sub> dla pola A = ${F(r.Aload, 1)} m²; w<sub>e</sub> = c<sub>s</sub>c<sub>d</sub>·q<sub>p</sub>·c<sub>pe</sub>, w<sub>i</sub> = q<sub>p</sub>·c<sub>pi</sub>, w<sub>net</sub> = w<sub>e</sub> − w<sub>i</sub>, w<sub>d</sub> = γ<sub>Q</sub>·w<sub>net</sub> [kN/m²]. Wiersze wyróżnione – wartości skrajne; dodatnie – parcie na powierzchnię, ujemne – ssanie.</div>`;
  } else if (r.net) h += `<div class="note">c<sub>p,net</sub> = ${z.cpes.map(x => Fs(x, 2)).join(' / ')} – współczynnik wypadkowy (obie strony elementu); w = c<sub>s</sub>c<sub>d</sub>·${c.type === 'fwall' ? 'ψ<sub>s</sub>·' : ''}c<sub>p,net</sub>·q<sub>p</sub>.</div>`;
  return h + '</div>';
}
function windTable(c, r, rows, sel, clickable) {
  const gQ = S.f.gQ * (S.f.useKFI ? (EC.KFI[S.f.rc] || 1) : 1);
  const tr = z => clickable ? ` data-wz="${c.id}|${esc(z.z)}"${z.z === sel ? ' class="sel"' : ''}` : '';
  if (r.net) return `<div class="tw"><table class="t"><thead><tr><th>Strefa</th><th>Położenie</th><th class="r">c<sub>p,net</sub></th><th class="r">w<sub>k</sub> max</th><th class="r">w<sub>k</sub> min</th><th class="r">w<sub>d</sub> max / min</th></tr></thead><tbody>${rows.map(z => `<tr${tr(z)}><td><b>${z.z}</b></td><td>${z.dim || ''}</td><td class="num">${z.cpes.map(x => Fs(x, 2)).join(' / ')}</td><td class="num p">${F(z.max.w, 3)}</td><td class="num s">${F(z.min.w, 3)}</td><td class="num">${F(gQ * z.max.w, 3)} / ${F(gQ * z.min.w, 3)}</td></tr>`).join('')}</tbody></table></div>`;
  return `<div class="tw"><table class="t"><thead><tr><th>Strefa</th><th>Wymiar / opis</th><th class="r">c<sub>pe</sub></th><th class="r">w<sub>e</sub> [kN/m²]</th><th class="r">w<sub>net,max</sub></th><th class="r">w<sub>net,min</sub></th><th class="r">w<sub>d</sub> max / min</th></tr></thead><tbody>${rows.map(z => z.head ? `<tr class="hd"><td colspan="7">${z.head}</td></tr>` : `<tr${tr(z)}><td><b>${zLabel(z.z)}</b></td><td>${z.dim || ''}</td><td class="num">${z.cpes.map(x => Fs(x, 2)).join(' / ')}</td><td class="num">${z.we.map(x => F(x, 3)).join(' / ')}</td><td class="num ${z.max.w >= 0 ? 'p' : 's'}">${F(z.max.w, 3)}</td><td class="num ${z.min.w >= 0 ? 'p' : 's'}">${F(z.min.w, 3)}</td><td class="num">${F(gQ * z.max.w, 2)} / ${F(gQ * z.min.w, 2)}</td></tr>`).join('')}</tbody></table></div>` + noteHTML('w<sub>net</sub> = c<sub>s</sub>c<sub>d</sub>·q<sub>p</sub>·c<sub>pe</sub> − q<sub>p</sub>·c<sub>pi</sub> dla wszystkich kombinacji c<sub>pe</sub> i c<sub>pi</sub>; dodatnie – parcie, ujemne – ssanie. w<sub>d</sub> = γ<sub>Q</sub>·w<sub>net</sub>, γ<sub>Q</sub> = ' + F(gQ, 2) + '.');
}
function windProfile(D) {
  if (!D || !D.profile || D.profile.length < 2) return '';
  return `<div class="lsub">Ściana nawietrzna D – pasy wg rys. 7.4</div><div class="tw"><table class="t"><thead><tr><th>Pas [m]</th><th class="r">z<sub>e</sub> [m]</th><th class="r">q<sub>p</sub></th><th class="r">w<sub>e,D</sub></th></tr></thead><tbody>${D.profile.map(p => `<tr><td>${F(p.z0, 2)} – ${F(p.z1, 2)}</td><td class="num">${F(p.ze, 2)}</td><td class="num">${F(p.qp, 3)}</td><td class="num p">${F(p.wD, 3)}</td></tr>`).join('')}</tbody></table></div>`;
}
/* schemat + karta strefy (panel boczny i okno powiększenia) */
function windInteractive(c, r, big) {
  const D = windDir(c, r);
  const sel = windSelKey(c, r, D);
  const dg = windDiagram(c, r, D, sel);
  if (!dg) return '';
  let h = `<div class="wtools">${windDirSeg(c, r, D)}<span class="hint" style="margin:0">kliknij strefę – ciśnienia poniżej</span>${big ? '' : `<button type="button" class="btn sm" data-wzoom="${c.id}" title="Otwórz schemat w dużym oknie">⛶ Powiększ</button>`}</div>`;
  h += `<div class="wdiag${big ? ' big' : ''}">${dg}</div>`;
  h += windZoneInfo(c, r, D, sel);
  return h;
}
function windModalHTML(c) {
  const r = R.wind[c.id]; if (!r) return '';
  return `<div class="wmodal" data-wmodal="${c.id}"><div class="mhead"><h3><span class="chip W">${symOf('wind', c.id)}</span> ${esc(c.name)}</h3><button type="button" class="btn" data-act="mclose">Zamknij</button></div>${windInteractive(c, r, true)}</div>`;
}
function resWind(c, rep) {
  const r = R.wind[c.id]; if (!r) return '';
  let h = '';
  if (r.dirs && BLD_W.includes(c.type)) {
    if (rep) {
      h += '<div class="kvs">' + kv('q<sub>p</sub>(z<sub>e</sub>)', r.qp, 'kN/m²', 'hl', 3) + kv('z<sub>e</sub>', r.ze, 'm', '', 2) + kv('L × B × h', F(r.L, 2) + ' × ' + F(r.B, 2) + ' × ' + F(r.h, 2), 'm') + (r.cpi ? kv('c<sub>pi</sub>', r.cpi.vals.map(v => Fs(v, 2)).join(' / '), '') : '') + '</div>' + warnHTML(r.warn);
      r.dirs.forEach(D => {
        h += `<div class="lsub">${D.head} – b = ${F(D.b, 2)} m, d = ${F(D.d, 2)} m, e = ${F(D.e, 2)} m</div>`;
        h += `<div class="wdiag rep">${SVG.wind.bld(c.id, c.type, r, D, '')}</div>`;
        h += windTable(c, r, D.rows, '', false) + windProfile(D);
        if (isNum(D.Fnet)) h += noteHTML('Siła wypadkowa D + E (brak korelacji, f = ' + F(D.fcor, 3) + '): ' + F(D.Fnet, 3) + ' kN/m² rzutu ściany.');
      });
      return h + noteHTML(r.note) + stepsHTML(r.steps);
    }
    const D = windDir(c, r);
    const sel = windSelKey(c, r, D);
    h += windInteractive(c, r);
    h += '<div class="kvs">' + kv('q<sub>p</sub>(z<sub>e</sub>)', r.qp, 'kN/m²', 'hl', 3) + kv('z<sub>e</sub>', r.ze, 'm', '', 2) + kv('b × d (' + thLbl(D.th) + ')', F(D.b, 2) + ' × ' + F(D.d, 2), 'm') + kv('e = min(b; 2h)', D.e, 'm', '', 2) + (r.cpi ? kv('c<sub>pi</sub>', r.cpi.vals.map(v => Fs(v, 2)).join(' / '), '') : '') + (isNum(D.Fnet) ? kv('D + E wypadkowe (f<sub>kor</sub> = ' + F(D.fcor, 2) + ')', D.Fnet, 'kN/m²', '', 3) : '') + '</div>' + warnHTML(r.warn);
    h += `<div class="lsub">Strefy – ${D.head}</div>` + windTable(c, r, D.rows, sel, true) + windProfile(D);
    return h + noteHTML(r.note) + stepsHTML(r.common.concat(D.steps));
  }
  const inter = c.type === 'canopy1' || c.type === 'canopy2' || c.type === 'fwall';
  if (inter) h += rep ? `<div class="wdiag rep">${windDiagram(c, r, null, '')}</div>` : windInteractive(c, r);
  h += '<div class="kvs">' + kv('q<sub>p</sub>(z<sub>e</sub>)', r.qp, 'kN/m²', 'hl', 3) + (isNum(r.ze) ? kv('z<sub>e</sub>', r.ze, 'm', '', 2) : '');
  if (r.cpi) h += kv('c<sub>pi</sub>', r.cpi.vals.map(v => Fs(v, 2)).join(' / '), '');
  if (r.sign) h += kv('F<sub>w</sub>', r.sign.Fw, 'kN', 'd', 2);
  r.vals.filter(v => v.point).forEach(v => { h += kv(v.label, v.v, v.unit, 'd', 2); });
  h += '</div>' + warnHTML(r.warn);
  if (r.zones && r.zones.length) h += windTable(c, r, r.zones, inter && !rep ? windSelKey(c, r, null) : '', inter && !rep);
  return h + noteHTML(r.note) + stepsHTML(r.steps);
}
function windSide() {
  const id = activeOf('wind', 'wind', 'site');
  if (id === 'site') return box('<span class="chip W">q<sub>b</sub></span> Bazowe i szczytowe ciśnienie prędkości', windSiteRes());
  const c = itemOf('wind', id);
  return box(`<span class="chip W">${symOf('wind', id)}</span> ${esc(c.name)}`, resWind(c));
}
function windTab() {
  let left = siteBox('wind', 'site', 'W', 'Lokalizacja – bazowe ciśnienie prędkości q<sub>b</sub>', windSiteForm(), `q<sub>b</sub> = <b>${F(R.windBase.qb, 3)}</b> kN/m² · ${S.ws.method === 'NA' ? 'ZK' : S.ws.method === 'EN' ? 'CEN' : 'ręcznie'}`);
  left += addBar('wind', WIND_T) + S.wind.map((c, i) => itemBox('wind', c, i, windForm(c))).join('');
  return listLayout('wind', phead('Oddziaływanie wiatru W', 'PN-EN 1991-1-4 · ZK PL', 'w<sub>e</sub> = q<sub>p</sub>(z<sub>e</sub>)·c<sub>pe</sub>, w<sub>i</sub> = q<sub>p</sub>(z<sub>i</sub>)·c<sub>pi</sub>, w<sub>net</sub> = w<sub>e</sub> − w<sub>i</sub> (dodatnie – parcie). Ściany, dachy płaskie, jedno-, dwu- i czterospadowe, wiaty, attyki, ściany wolnostojące, tablice, siły i tarcie. q<sub>p</sub> domyślnie wg ZK PL; dla porównania – wzory CEN.'), left, windSide());
}

/* =====================================================================
   T – TERMICZNE
   ===================================================================== */
function thermSiteForm() {
  const o = 'ts';
  let f = fNum(o, 'Tmax', 'maksymalna temperatura powietrza w cieniu', '°C', { sym: 'T<sub>max</sub>', hint: 'z mapy ZK do PN-EN 1991-1-5 dla miejsca budowy' });
  f += fNum(o, 'Tmin', 'minimalna temperatura powietrza w cieniu', '°C', { sym: 'T<sub>min</sub>', hint: 'z mapy ZK do PN-EN 1991-1-5 dla miejsca budowy' });
  f += fNum(o, 'T0', 'temperatura początkowa (scalenia)', '°C', { sym: 'T<sub>0</sub>', list: [[10, 'zał. A.1(3) – wartość zalecana'], [8, ''], [15, '']] });
  f += fChk(o, 'altCorr', 'poprawka wysokościowa T<sub>max</sub>, T<sub>min</sub> (zał. A.1(2) uw.: −1,0 / −0,5 °C na 100 m)');
  return f;
}
function thermSiteRes() {
  const t = R.thermSite;
  return `<div class="kvs">${kv('T<sub>max</sub>', t.Tmax, '°C', '', 1)}${kv('T<sub>min</sub>', t.Tmin, '°C', '', 1)}${kv('T<sub>0</sub>', t.T0, '°C', 'hl', 1)}</div>` + stepsHTML(t.steps) + `<div class="msg warn">Wartości T<sub>max</sub> i T<sub>min</sub> odczytaj z map Załącznika krajowego do PN-EN 1991-1-5 (program nie zawiera map izoterm). ψ dla temperatury: ${EC.PSI.temp.map(x => F(x, 1)).join(' / ')}.</div>`;
}
function thermForm(c) {
  const o = 'therm.' + c.id;
  let h = fTxt(o, 'name', 'Nazwa') + fSel(o, 'type', 'Rodzaj', Object.entries(THERM_T), { full: true, rr: true });
  if (c.type === 'bld') {
    h += fSel(o, 'pos', 'Położenie elementu', [['wall', 'przegroda: wnętrze ↔ zewnętrze'], ['out', 'element w całości na zewnątrz'], ['in', 'element wewnątrz budynku'], ['und', 'element w gruncie (ściana piwnicy)']], { rr: true, full: true });
    if (c.pos === 'und') h += fSel(o, 'depth', 'Głębokość', [['shallow', '< 1 m p.p.t. (tabl. 5.3)'], ['deep', '≥ 1 m p.p.t.']], { full: true });
    else if (c.pos !== 'in') { h += fSel(o, 'orient', 'Ekspozycja na słońce', [['SW', 'płd.-zach. lub poziomo'], ['NE', 'płn.-wsch.']], { full: true }); h += fSel(o, 'abs', 'Powierzchnia (absorpcyjność)', [['0.5', '0,5 – jasna, błyszcząca'], ['0.7', '0,7 – jasna barwna'], ['0.9', '0,9 – ciemna']], { full: true }); }
    if (c.pos !== 'out') h += fNum(o, 'TinS', 'temperatura wewnątrz – lato', '°C', { sym: 'T<sub>1</sub>' }) + fNum(o, 'TinW', 'temperatura wewnątrz – zima', '°C', { sym: 'T<sub>2</sub>', hint: 'tabl. 5.1 (wartości zalecane): lato 20 °C, zima 25 °C' });
  } else if (c.type === 'bridge') {
    h += fSel(o, 'btype', 'Typ pomostu', [['1', 'Typ 1 – stalowy'], ['2', 'Typ 2 – zespolony'], ['3', 'Typ 3 – betonowy']], { rr: true, full: true });
    if (c.btype === '3') h += fSel(o, 'sub3', 'Przekrój', [['slab', 'płyta'], ['beam', 'belka'], ['box', 'skrzynka']], { full: true });
    h += fSel(o, 'surf', 'Nawierzchnia (k<sub>sur</sub>)', Object.entries(EC.KSUR).map(([k, v]) => [k, v.n]), { full: true });
  } else h += fNum(o, 'dT', 'składowa równomierna', 'K', { sym: 'ΔT<sub>u</sub>' }) + fNum(o, 'dT2', 'różnica temperatur powierzchni', 'K', { sym: 'ΔT<sub>M</sub>' });
  h += sub('Skutki w elemencie');
  h += fSel(o, 'mat', 'Materiał (tabl. C.1)', Object.entries(EC.ALPHA).map(([k, v]) => [k, v.n + (k !== 'usr' ? ' – α = ' + v.a + '·10⁻⁶' : '')]), { rr: true, full: true });
  if (c.mat === 'usr') h += fNum(o, 'aT', 'współczynnik rozszerzalności', '10⁻⁶/K', { sym: 'α<sub>T</sub>' });
  h += fNum(o, 'E', 'moduł sprężystości', 'GPa', { sym: 'E' }) + fNum(o, 'L', 'długość elementu / odcinka dylatacyjnego', 'm', { sym: 'L' }) + fNum(o, 'hs', 'grubość / wysokość przekroju', 'm', { sym: 'h' }) + fNum(o, 'restr', 'stopień skrępowania (0–1)', '', { sym: 'k<sub>skr</sub>', list: [[1, 'pełne'], [0.5, ''], [0, 'swobodny']] });
  return h;
}
function resTherm(c) {
  const r = R.therm[c.id]; if (!r) return '';
  let h = `<div class="tw"><table class="t"><thead><tr><th>Stan</th><th class="r">ΔT<sub>u</sub> [K]</th><th class="r">ΔT<sub>M</sub> [K]</th><th class="r">ΔL [mm]</th><th class="r">σ<sub>N</sub> [MPa]</th><th class="r">κ [1/m]</th><th class="r">σ<sub>M</sub> [MPa]</th></tr></thead><tbody>${r.rows.map((x, i) => { const e = r.eff[i] || {}; return `<tr><td>${x.n}</td><td class="num">${Fs(x.dTu, 1)}</td><td class="num">${isNum(x.dTM) ? Fs(x.dTM, 1) : '—'}</td><td class="num">${Fs(e.dL, 2)}</td><td class="num">${F(e.sig, 2)}</td><td class="num">${isNum(e.kap) ? e.kap.toExponential(2).replace('.', ',') : '—'}</td><td class="num">${isNum(e.sigM) ? '±' + F(e.sigM, 2) : '—'}</td></tr>`; }).join('')}</tbody></table></div>`;
  if (r.combos) h += `<div class="lsub">Jednoczesność składowych (6.1.5)</div><div class="tw"><table class="t"><thead><tr><th>Kombinacja</th><th class="r">ΔT<sub>M</sub> [K]</th><th class="r">ΔT<sub>N</sub> [K]</th></tr></thead><tbody>${r.combos.map(([n, m, nn]) => `<tr><td>${n}</td><td class="num">${Fs(m, 1)}</td><td class="num">${Fs(nn, 1)}</td></tr>`).join('')}</tbody></table></div>`;
  return h + warnHTML(r.warn) + stepsHTML(r.steps);
}
function thermSide() {
  const id = activeOf('therm', 'therm', 'site');
  if (id === 'site') return box('<span class="chip T">T</span> Temperatury charakterystyczne', thermSiteRes());
  const c = itemOf('therm', id);
  return box(`<span class="chip T">${symOf('therm', id)}</span> ${esc(c.name)}`, resTherm(c));
}
function thermTab() {
  let left = siteBox('therm', 'site', 'T', 'Klimat – temperatury charakterystyczne', thermSiteForm(), `T<sub>max</sub>/T<sub>min</sub> = <b>${F(R.thermSite.Tmax, 0)}/${F(R.thermSite.Tmin, 0)}</b> °C`);
  left += addBar('therm', THERM_T) + S.therm.map((c, i) => itemBox('therm', c, i, thermForm(c))).join('');
  return listLayout('therm', phead('Oddziaływania termiczne T', 'PN-EN 1991-1-5 · ZK PL', 'Składowa równomierna ΔT<sub>u</sub> = T − T<sub>0</sub> i liniowa ΔT<sub>M</sub> dla elementów budynków (rozdz. 5, tabl. 5.1–5.3) i pomostów (rozdz. 6), z wydłużeniem swobodnym, krzywizną i naprężeniami przy skrępowaniu (zał. C).'), left, thermSide());
}

/* =====================================================================
   Σ – ZESTAWIENIA I KOMBINACJE
   ===================================================================== */
function groupForm(g) {
  const o = 'groups.' + g.id;
  let h = fTxt(o, 'name', 'Nazwa (element)');
  h += fSel(o, 'mode', 'Sposób zestawienia', [['direct', 'bez przeliczeń – strop, stropodach, ściana'], ['proj', 'pionowo, na m² rzutu poziomego (połać dachu)'], ['perp', 'składowe ⟂ i ∥ do połaci, na m² połaci (krokiew, płatew)']], { rr: true, full: true });
  if (g.mode !== 'direct') h += fNum(o, 'alpha', 'kąt nachylenia połaci', '°', { sym: 'α' });
  h += fSel(o, 'unit', 'Wynik', [['area', 'na m² [kN/m²]'], ['line', 'na m bieżący elementu – pasmo zbierania b [kN/m]']], { rr: true, full: true });
  if (g.unit === 'line') h += fNum(o, 'b', 'szerokość pasma zbierania obciążeń', 'm', { sym: 'b', hint: 'rozstaw belek / krokwi, połowa sumy rozpiętości sąsiednich pól' });
  h += sub('Obciążenia stałe G');
  h += S.perm.length ? `<div class="vlist">${S.perm.map((p, i) => { const on = g.perm.includes(p.id); const dis = p.type === 'line' && g.unit !== 'line'; return `<label class="vrow"><input type="checkbox" data-gperm="${g.id}|${p.id}"${on ? ' checked' : ''}${dis ? ' disabled title="Element liniowy – tylko w zestawieniu na m bieżący"' : ''}><span class="chip G">${symOf('perm', p.id)}</span><span class="nm">${esc(p.name)}</span><span class="sumv">${sumVal('perm', p.id)}</span></label>`; }).join('')}</div>` : hint('Brak obciążeń stałych – dodaj w zakładce G.');
  h += sub('Oddziaływania zmienne Q, S, W');
  const cands = varCandidates();
  h += cands.length ? `<div class="vlist">${cands.map(cd => { const v = g.vars.find(x => x.ref === cd.ref); const on = !!v; const key = v ? v.key : (cd.r.def || (cd.keys[0] && cd.keys[0][0])); const ch = cd.col === 'imp' ? 'Q' : cd.col === 'snow' ? 'S' : 'W'; return `<div class="vrow"><input type="checkbox" data-gvar="${g.id}|${cd.ref}"${on ? ' checked' : ''} aria-label="uwzględnij"><span class="chip ${ch}">${cd.sym}</span><span class="nm" title="${esc(cd.c.name)}">${esc(cd.c.name)}</span>${cd.keys.length ? `<select data-gkey="${g.id}|${cd.ref}"${on ? '' : ' disabled'}>${cd.keys.map(([k, l]) => `<option value="${esc(k)}"${k === key ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>` : '<span class="hint">—</span>'}</div>`; }).join('')}</div>` : hint('Brak oddziaływań zmiennych.');
  h += hint('Wiatr: do kombinacji „w dół” program bierze w<sub>net,max</sub> (parcie), a do sprawdzenia odrywania – w<sub>net,min</sub> (ssanie) wybranej strefy. Przypadki śniegu/wiatru tego samego zestawienia traktowane są jako alternatywne (bierze się najniekorzystniejszy).');
  return h;
}
function resGroup(g, rep) {
  const r = R.groups[g.id]; if (!r) return '';
  const u = r.unit, perp = g.mode === 'perp';
  const cb = r.comb;
  let h = '';
  if (!rep) { const pos = r.rows.filter(x => x.n > 0), tot = pos.reduce((a, x) => a + x.n, 0); if (tot > 0) h += `<div class="bars" title="udział składników – wartości charakterystyczne">${pos.map(x => `<span class="${x.ch}" style="width:${(x.n / tot * 100).toFixed(2)}%" title="${esc(x.sym)}: ${F(x.n, 3)} ${u}">${x.n / tot > 0.07 ? esc(x.sym) : ''}</span>`).join('')}</div><div class="hint">udział składników w Σ wartości charakterystycznych = ${F(tot, 3)} ${u}</div>`; }
  h += '<div class="kvs">' + kv('G<sub>k</sub>' + (perp ? ' (⟂)' : ''), r.Gk, u, '', 3) + (cb.uls ? kv('q<sub>Ed</sub> – SGN', cb.uls.v, u, 'hl', 3) : '') + (cb.sls.ch ? kv('q<sub>k</sub> – charakterystyczna', cb.sls.ch.v, u, '', 3) : '') + (cb.sls.fr ? kv('częsta', cb.sls.fr.v, u, '', 3) : '') + (cb.sls.qp ? kv('quasi-stała', cb.sls.qp.v, u, '', 3) : '') + (cb.uplift ? kv('odrywanie STR', cb.uplift.v, u, cb.uplift.v < 0 ? 'd' : '', 3) : '') + (cb.upliftEQU ? kv('odrywanie EQU', cb.upliftEQU.v, u, cb.upliftEQU.v < 0 ? 'd' : '', 3) : '') + '</div>';
  const conv = r.rows.some(x => x.conv);
  h += `<div class="lsub">Składniki – wartości charakterystyczne</div><div class="tw"><table class="t"><thead><tr><th>Symbol</th><th>Obciążenie</th><th class="r">wartość wyjściowa</th>${conv ? '<th>przeliczenie</th>' : ''}<th class="r">${perp ? '⟂ połaci' : 'w zestawieniu'} [${u}]</th>${perp ? `<th class="r">∥ połaci</th>` : ''}<th class="r">ψ<sub>0</sub>/ψ<sub>1</sub>/ψ<sub>2</sub></th></tr></thead><tbody>${r.rows.map(x => `<tr><td><span class="chip ${x.ch}">${x.sym}</span></td><td>${esc(x.name)}</td><td class="num">${F(x.v0, 3)}${x.v0n != null ? ' / ' + F(x.v0n, 3) : ''} ${x.unit0}</td>${conv ? `<td>${x.conv || '—'}</td>` : ''}<td class="num">${F(x.n, 3)}${x.nn != null ? ' / ' + F(x.nn, 3) : ''}</td>${perp ? `<td class="num">${F(x.t, 3)}</td>` : ''}<td class="num">${x.psi ? x.psi.map(p => F(p, 1)).join('/') : '—'}</td></tr>`).join('')}<tr class="tot"><td></td><td>Σ G<sub>k</sub></td><td></td>${conv ? '<td></td>' : ''}<td class="num">${F(r.Gk, 3)}</td>${perp ? `<td class="num">${F(r.Gt, 3)}</td>` : ''}<td></td></tr></tbody></table></div>`;
  h += `<div class="lsub">SGN – kombinacje (PN-EN 1990, ${S.f.rule === '610' ? '6.10' : '6.10a/6.10b'})</div><div class="tw"><table class="t"><thead><tr><th>Kombinacja</th><th>Wyrażenie</th><th class="r">[${u}]</th></tr></thead><tbody>${cb.ulsAll.map(c => `<tr${c.gov ? ' class="gov"' : ''}><td>${c.n}</td><td style="font-family:var(--mono);font-size:12px">${c.ex}</td><td class="num">${F(c.v, 3)}</td></tr>`).join('')}</tbody></table></div>`;
  const sl = cb.sls;
  const slsRows = [['charakterystyczna (6.14b)', sl.ch], ['częsta (6.15b)', sl.fr], ['quasi-stała (6.16b)', sl.qp]].filter(x => x[1]);
  h += `<div class="lsub">SGU – kombinacje miarodajne</div><div class="tw"><table class="t"><thead><tr><th>Kombinacja</th><th>Wyrażenie</th><th class="r">[${u}]</th></tr></thead><tbody>${slsRows.map(([n, c]) => `<tr><td>${n}${c.lead ? ', wiodące ' + c.lead : ''}</td><td style="font-family:var(--mono);font-size:12px">${c.ex}</td><td class="num">${F(c.v, 3)}</td></tr>`).join('')}</tbody></table></div>`;
  if (cb.uplift) h += `<div class="lsub">Odrywanie (ssanie wiatru, ciężar własny korzystny)</div><div class="tw"><table class="t"><tbody>${[cb.uplift, cb.upliftEQU].map(c => `<tr${c.v < 0 ? ' class="gov"' : ''}><td>${c.n}</td><td style="font-family:var(--mono);font-size:12px">${c.ex}</td><td class="num">${F(c.v, 3)}</td></tr>`).join('')}</tbody></table></div>` + (cb.uplift.v < 0 || cb.upliftEQU.v < 0 ? '<div class="msg warn">Wypadkowa skierowana do góry – wymagane zakotwienie / sprawdzenie mocowań na odrywanie.</div>' : '');
  if (perp && r.combT && r.combT.uls) h += `<div class="lsub">Składowe ∥ do połaci (zsuwanie, siły osiowe w krokwi)</div><div class="kvs">${kv('G<sub>k,∥</sub>', r.Gt, u, '', 3)}${kv('q<sub>Ed,∥</sub> – SGN', r.combT.uls.v, u, 'hl', 3)}${kv('q<sub>k,∥</sub> – char.', r.combT.sls.ch ? r.combT.sls.ch.v : NaN, u, '', 3)}</div><div class="note">miarodajna: ${r.combT.uls.n} – ${r.combT.uls.ex}</div>`;
  h += warnHTML(r.warn) + r.notes.map(noteHTML).join('');
  h += noteHTML(refLink('1990:6.10', 'Kombinacje SGN') + ' · ' + refLink('1990:6.5', 'Kombinacje SGU') + ' · ' + refLink('1990:A1.1', 'Współczynniki ψ') + ' · ' + refLink('1990:A1.2', 'Współczynniki γ'));
  return h;
}
function sumSide() {
  const id = activeOf('sum', 'groups');
  const g = itemOf('groups', id);
  if (!g) return box('Wyniki', '<div class="note">Dodaj zestawienie – wybierz obciążenia stałe i oddziaływania zmienne działające na element.</div>');
  return box(`<span class="chip X">${symOf('groups', id)}</span> ${esc(g.name)}`, resGroup(g));
}
function sumTab() {
  const left = `<div class="addbar"><span class="ttl">Dodaj:</span><button type="button" class="btn sm add" data-act="add" data-col="groups" data-type="g">+ Zestawienie (element)</button><button type="button" class="btn sm" data-act="autogroups" title="Tworzy zestawienia dla każdego układu warstw z dopasowanymi oddziaływaniami">⚙ Utwórz zestawienia automatycznie</button></div>` + S.groups.map((g, i) => itemBox('groups', g, i, groupForm(g))).join('') + (S.groups.length ? '' : '<div class="msg info">Brak zestawień.</div>');
  return listLayout('sum', phead('Zestawienia obciążeń i kombinacje', 'PN-EN 1990 · 6.4.3.2, 6.5.3 · zał. A1 · ZK PL', 'Zestawienie zbiera obciążenia działające na element (strop, dach, krokiew, belkę) i tworzy wszystkie kombinacje SGN i SGU, wskazując miarodajną. Obciążenia użytkowe sumuje się jako jedno oddziaływanie; kategorii H nie łączy się ze śniegiem i wiatrem.'), left, sumSide());
}

/* =====================================================================
   PODSUMOWANIE
   ===================================================================== */
function overTab() {
  const sn = R.snowSite, wb = R.windBase;
  let h = phead('Podsumowanie', S.meta.name ? esc(S.meta.name) : '', '');
  h += `<div class="cards"><div class="card S"><div class="ct">Śnieg – grunt</div><div class="cv">${F(sn.sk, 3)}</div><div class="cs">s<sub>k</sub> [kN/m²] · strefa ${S.ss.zone}${+S.ss.zoneB ? '–' + S.ss.zoneB : ''} · A = ${F(S.ss.A, 0)} m</div></div>`;
  h += `<div class="card W"><div class="ct">Wiatr – bazowe</div><div class="cv">${F(wb.qb, 3)}</div><div class="cs">q<sub>b</sub> [kN/m²] · strefa ${S.ws.zone}${+S.ws.zoneB ? '–' + S.ws.zoneB : ''} · v<sub>b,0</sub> = ${F(wb.vb0, 1)} m/s</div></div>`;
  h += `<div class="card W"><div class="ct">Wiatr – szczytowe (10 m)</div><div class="cv">${F(EC.qpAt(10, S.ws, wb).qp, 3)}</div><div class="cs">q<sub>p</sub> [kN/m²] · kat. ${esc(S.ws.terrain)} · ${S.ws.method === 'NA' ? 'ZK tabl. NA.3' : S.ws.method === 'EN' ? 'wzory CEN' : 'ręcznie'}</div></div>`;
  h += `<div class="card T"><div class="ct">Temperatury</div><div class="cv">${F(R.thermSite.Tmax, 0)} / ${F(R.thermSite.Tmin, 0)}</div><div class="cs">T<sub>max</sub> / T<sub>min</sub> [°C] · T<sub>0</sub> = ${F(R.thermSite.T0, 0)} °C</div></div></div>`;
  /* zestawienia */
  h += `<h3 style="margin:6px 0">Zestawienia – wartości miarodajne</h3><div class="tw"><table class="t"><thead><tr><th>Σ</th><th>Element</th><th>Jedn.</th><th class="r">G<sub>k</sub></th><th class="r">q<sub>Ed</sub> (SGN)</th><th>miarodajna</th><th class="r">charakt.</th><th class="r">częsta</th><th class="r">quasi-stała</th><th class="r">odrywanie</th><th></th></tr></thead><tbody>${S.groups.map((g, i) => { const r = R.groups[g.id], c = r.comb; return `<tr><td><span class="chip X">Σ${i + 1}</span></td><td>${esc(g.name)}</td><td>${r.unit}</td><td class="num">${F(r.Gk, 3)}</td><td class="num"><b>${c.uls ? F(c.uls.v, 3) : '—'}</b></td><td><small>${c.uls ? c.uls.n : ''}</small></td><td class="num">${c.sls.ch ? F(c.sls.ch.v, 3) : '—'}</td><td class="num">${c.sls.fr ? F(c.sls.fr.v, 3) : '—'}</td><td class="num">${c.sls.qp ? F(c.sls.qp.v, 3) : '—'}</td><td class="num">${c.uplift ? F(Math.min(c.uplift.v, c.upliftEQU.v), 3) : '—'}</td><td><button type="button" class="btn sm" data-goto="groups|${g.id}">pokaż →</button></td></tr>`; }).join('') || '<tr><td colspan="11">brak zestawień</td></tr>'}</tbody></table></div>`;
  /* pozycje */
  const sec = (col, title) => S[col].length ? `<h3 style="margin:14px 0 6px">${title}</h3><div class="tw"><table class="t"><tbody>${S[col].map((c, i) => `<tr><td style="width:46px"><span class="chip ${CHIP[col]}">${SYM[col]}${i + 1}</span></td><td>${esc(c.name)}</td><td>${sumVal(col, c.id)}</td><td style="width:80px"><button type="button" class="btn sm" data-goto="${col}|${c.id}">pokaż →</button></td></tr>`).join('')}</tbody></table></div>` : '';
  h += sec('perm', 'Obciążenia stałe') + sec('imp', 'Obciążenia użytkowe') + sec('snow', 'Śnieg') + sec('wind', 'Wiatr') + sec('therm', 'Termiczne');
  h += `<h3 style="margin:14px 0 6px">Uwagi i ostrzeżenia (${R.warns.length + R.errs.length})</h3>`;
  h += R.errs.map(w => `<div class="msg err">${w.t} <button type="button" class="lnk" data-goto="${w.col}|${w.id}">pokaż →</button></div>`).join('');
  h += R.warns.map(w => `<div class="msg warn">${w.t} ${w.col ? `<button type="button" class="lnk" data-goto="${w.col}|${w.id}">pokaż →</button>` : ''}</div>`).join('') || '<div class="msg ok">Brak uwag.</div>';
  return h;
}

/* =====================================================================
   BAZA MATERIAŁÓW
   ===================================================================== */
let MAT_Q = '', MAT_G = '';
function matTab() {
  let h = phead('Baza materiałów', 'PN-EN 1991-1-1 zał. A (tabl. A.1–A.12) · PN-EN 1991-1-3 zał. E · dane orientacyjne', `Ciężary objętościowe γ [kN/m³] i powierzchniowe g [kN/m²] (${MATDB.MATS.length - 2} pozycji). Wartości z normy oznaczono źródłem; pozostałe są orientacyjne – przy projektowaniu przyjmij dane z dokumentacji wyrobu. Materiały własne zapisują się w projekcie i są dostępne w układach warstw.`);
  h += `<div class="addbar"><input class="txt" id="matq" placeholder="szukaj: np. silikat, wełna, dachówka…" value="${esc(MAT_Q)}" style="max-width:320px"><select id="matg" style="max-width:300px"><option value="">wszystkie grupy</option>${Object.entries(MATDB.MAT_GROUPS).map(([k, v]) => `<option value="${k}"${k === MAT_G ? ' selected' : ''}>${esc(v)}</option>`).join('')}</select><button type="button" class="btn sm add" data-act="umatAdd">+ materiał własny</button></div>`;
  if (S.umat.length) h += `<details class="grp" open><summary>${CHEV}<h3>Materiały własne (w projekcie)</h3></summary><div class="gbody"><table class="lay"><thead><tr><th>Nazwa</th><th>Wartość</th><th>Jednostka</th><th>Zakres / uwagi</th><th></th></tr></thead><tbody>${S.umat.map(u => `<tr><td><input class="txt" data-o="umat.${esc(u.k)}" data-k="n" data-txt="1" value="${esc(u.n)}"></td><td style="width:110px"><input class="txt" style="text-align:right" data-o="umat.${esc(u.k)}" data-k="g" data-num="1" value="${fin(u.g)}"></td><td style="width:120px"><select data-o="umat.${esc(u.k)}" data-k="u"><option value="v"${u.u !== 'a' ? ' selected' : ''}>kN/m³</option><option value="a"${u.u === 'a' ? ' selected' : ''}>kN/m²</option></select></td><td><input class="txt" data-o="umat.${esc(u.k)}" data-k="note" data-txt="1" value="${esc(u.note || '')}"></td><td><button type="button" class="ibtn" data-act="umatDel" data-k="${esc(u.k)}">✕</button></td></tr>`).join('')}</tbody></table></div></details>`;
  h += `<div id="matlist">${matList()}</div>`;
  return h;
}
function matList() {
  const q = GEO.norm(MAT_Q);
  const L = MATDB.MATS.filter(m => m.grp !== 'usr' && (!MAT_G || m.grp === MAT_G) && (!q || GEO.norm(m.n + ' ' + m.note + ' ' + m.k).includes(q)));
  let cur = '';
  const rows = L.map(m => { let r = ''; if (m.grp !== cur) { cur = m.grp; r += `<tr class="g"><td colspan="6">${esc(MATDB.MAT_GROUPS[m.grp])}</td></tr>`; } return r + `<tr><td>${esc(m.n)}</td><td class="num">${F(m.g, m.g < 1 ? 3 : 2)}</td><td>${m.u === 'a' ? 'kN/m²' : 'kN/m³'}</td><td class="num">${esc(m.r || '')}</td><td>${MATDB.SRC_TXT[m.src] || ''}${m.note ? ' – ' + esc(m.note) : ''}</td><td class="num">${m.phi ? m.phi + '°' : ''}</td></tr>`; }).join('');
  return `<div class="tw"><table class="mtab"><thead><tr><th>Materiał</th><th style="text-align:right">γ / g</th><th>Jedn.</th><th style="text-align:right">Zakres</th><th>Źródło / uwagi</th><th style="text-align:right">φ zsypu</th></tr></thead><tbody>${rows || '<tr><td colspan="6">brak wyników</td></tr>'}</tbody></table></div><div class="note">Pozycji: ${L.length}</div>`;
}

/* ---------- rejestr zakładek ---------- */
const TABS = {
  proj: { render: projTab, side: projSide },
  perm: { render: permTab, side: permSide },
  imp: { render: impTab, side: impSide },
  snow: { render: snowTab, side: snowSide, light: () => { const s = $('#p-snow details[data-id="site"] .sumv'); if (s) s.innerHTML = `s<sub>k</sub> = <b>${F(R.snowSite.sk, 3)}</b> kN/m²`; } },
  wind: { render: windTab, side: windSide, light: () => { const s = $('#p-wind details[data-id="site"] .sumv'); if (s) s.innerHTML = `q<sub>b</sub> = <b>${F(R.windBase.qb, 3)}</b> kN/m²`; } },
  therm: { render: thermTab, side: thermSide },
  sum: { render: sumTab, side: sumSide, light: () => { $$('#p-sum .vrow select').forEach(sel => { /* etykiety wartości aktualne po przeliczeniu */ }); } },
  over: { render: overTab },
  rep: { render: () => repTab() },
  mat: { render: matTab }
};
