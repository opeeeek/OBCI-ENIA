/* =====================================================================
   ObciążeniaEC – raport obliczeń (podgląd, druk / PDF, HTML, CSV)
   ===================================================================== */
'use strict';
const REP_EXTRA = `.rep .kvs{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 8px}.rep .kv{border:1px solid #d9dde3;border-radius:3px;padding:3px 8px;background:#f7f8fa}.rep .kv.hl{border-color:#1d5bb8;background:#e8f0fc}.rep .kv .k{display:block;font-size:8pt;color:#5b6576}.rep .kv .v{font-weight:600;font-family:Consolas,"DejaVu Sans Mono",monospace}.rep .kv .v small{font-weight:400;color:#5b6576;margin-left:3px}.rep .msg{padding:3px 7px;margin:4px 0;font-size:9.5pt;border-left:3px solid #a35d00;background:#fdf1dc}.rep .msg.info{border-color:#5b6576;background:#eef0f3}.rep .msg.ok{border-color:#1d7f3c;background:#e6f4ea}.rep .msg.err{border-color:#c0262d;background:#fde8e8}.rep .note{color:#4a5466;font-size:9pt;margin:4px 0}.rep .lsub{font-weight:650;margin:8px 0 3px;color:#0f3f86}.rep ol.steps{margin:4px 0 8px;padding-left:20px;font-size:9.5pt}.rep ol.steps li{margin-bottom:2px;break-inside:avoid}.rep ol.steps .f{display:block}.rep ol.steps .rf{display:block;color:#5b6576;font-size:8.5pt}.rep .chip{display:inline-block;min-width:22px;padding:0 4px;border-radius:2px;color:#fff;font:600 8.5pt Consolas,monospace;text-align:center}.rep .chip.G{background:#5b6576}.rep .chip.Q{background:#1d5bb8}.rep .chip.S{background:#0f7c8c}.rep .chip.W{background:#6a46b5}.rep .chip.T{background:#b4561b}.rep .chip.X{background:#1b2230}.rep table.t td.p{color:#c0262d}.rep table.t td.s{color:#1d5bb8}.rep .diag{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0}.rep .diag figure{margin:0;flex:1 1 230px;max-width:360px;border:1px solid #d9dde3;padding:4px}.rep .diag figcaption{font-size:8pt;color:#5b6576}.rep .map svg{max-height:380px}.rep svg .zf{stroke:rgba(23,33,43,.35);stroke-width:var(--sw);fill-opacity:.9}.rep svg .wj{fill:none;stroke:#1b2230;stroke-opacity:.35;stroke-width:calc(var(--sw)*.9)}.rep svg .ct circle{fill:#1b2230}.rep svg .ct text{fill:#1b2230;paint-order:stroke;stroke:#fff;stroke-width:calc(var(--sw)*2.6)}.rep svg .mk-c{fill:#c0262d;stroke:#fff;stroke-width:calc(var(--sw)*1.8)}.rep svg .mk-h{fill:#c0262d;fill-opacity:.16;stroke:#c0262d;stroke-width:var(--sw)}.rep .zS1{fill:#F2EDC9}.rep .zS1_2{fill:#DCE5C9}.rep .zS2{fill:#BFDCCF}.rep .zS2_3{fill:#9CCCC8}.rep .zS3{fill:#72B5C0}.rep .zS3_4{fill:#5F9FB1}.rep .zS4{fill:#4E86A2}.rep .zS3_5{fill:#71909B}.rep .zS5{fill:#4B5F70}.rep .lywrap{max-width:600px;margin:4px 0 8px}.rep svg.lysvg text{font:12px Arial,sans-serif;fill:#1b2230}.rep svg .lyb{stroke:#8a94a6;stroke-width:1}.rep svg .lyl{fill:none;stroke:#7a8494;stroke-width:.9}.rep svg.lysvg .lyn{font-weight:600}.rep svg.lysvg .lyv{font-size:11px;fill:#4a5466}.rep svg.lysvg .lygv{font-weight:700;fill:#1b2230}.rep svg.lysvg .lyt{font:11px Consolas,monospace;fill:#7a8494}.rep svg.lysvg .lytot{font-weight:700}.rep svg .lyhit{fill:transparent}.rep .lyfig{margin:0}.rep .lyfig figcaption{font-size:8pt;color:#5b6576}.rep .wdiag{margin:4px 0 8px;max-width:640px}.rep svg.wsvg text{font:12px Arial,sans-serif;fill:#1b2230}.rep svg.wsvg .t2{fill:#5b6576}.rep svg.wsvg .sec{font-weight:700;fill:#0f3f86}.rep svg.wsvg .zl{font-weight:700;font-size:14px;paint-order:stroke;stroke:#fff;stroke-width:3px}.rep svg.wsvg .zv{font:600 11.5px Consolas,monospace;paint-order:stroke;stroke:#fff;stroke-width:3px}.rep svg .dim line,.rep svg .dim path{stroke:#7a8494;stroke-width:.9;fill:none}.rep svg.wsvg .dim text{font-size:11px;fill:#4a5466}.rep svg .bldp{fill:#eef0f3;stroke:#8a94a6}.rep svg .ridge{stroke:#4a5466;stroke-dasharray:7 4;fill:none}.rep svg .wzs{fill:#1d5bb8}.rep svg .wzp{fill:#c0262d}.rep svg .wz0{fill:#eef0f3}.rep svg .wzg rect,.rep svg .wzg path{stroke:#8a94a6;stroke-width:1}.rep svg .wzb{fill:none}.rep svg.wsvg .elab{font-size:10.5px;font-style:italic;fill:#4a5466;paint-order:stroke;stroke:#fff;stroke-width:3px}.rep .zW1{fill:#EFEEDA}.rep .zW1_2{fill:#D5DCBF}.rep .zW2{fill:#A8CEE0}.rep .zW3{fill:#C9AB7B}`;
(function () { const s = document.createElement('style'); s.textContent = REP_EXTRA; document.head.appendChild(s); })();
const REP_DEF = { map: false, steps: true, perm: true, imp: true, snow: true, wind: true, therm: true, groups: true, notes: true };
function repOpts() { return Object.assign({}, REP_DEF, S.ui.rep || {}); }
const deRef = h => h.replace(/<button type="button" class="nref" data-ref="[^"]*">([\s\S]*?)<\/button>/g, '$1');
function repItem(col, c, i, body) { return `<div class="itm"><h3><span class="chip ${CHIP[col]}">${SYM[col]}${i + 1}</span> ${esc(c.name)}</h3>${body}</div>`; }
function buildReport() {
  const o = repOpts();
  const M = S.meta;
  const noSteps = h => o.steps ? h : h.replace(/<ol class="steps">[\s\S]*?<\/ol>/g, '');
  let h = `<h1>Zestawienie obciążeń</h1>`;
  let n = 0;
  const H2 = t => `<h2>${++n}. ${t}</h2>`;
  /* 1. współczynniki */
  h += H2('Współczynniki częściowe i kombinacyjne');
  h += `<table><tbody><tr><th style="width:28%">Kombinacje SGN</th><td>${S.f.rule === '610' ? 'wzór (6.10)' : 'wzory (6.10a) i (6.10b), ξ = ' + F(S.f.xi, 2)}; γ<sub>G,sup</sub> = ${F(S.f.gGsup, 2)}, γ<sub>G,inf</sub> = ${F(S.f.gGinf, 2)}, γ<sub>Q</sub> = ${F(S.f.gQ, 2)}${S.f.useKFI ? '; K<sub>FI</sub> = ' + F(EC.KFI[S.f.rc] || 1, 2) + ' (' + S.f.rc + ')' : ''}</td></tr><tr><th>Równowaga EQU</th><td>γ<sub>G,sup</sub> = ${F(S.f.eqGsup, 2)}, γ<sub>G,inf</sub> = ${F(S.f.eqGinf, 2)}, γ<sub>Q</sub> = ${F(S.f.eqQ, 2)}</td></tr></tbody></table>`;
  const PN = [['A', 'Kat. A'], ['B', 'Kat. B'], ['C', 'Kat. C'], ['D', 'Kat. D'], ['E', 'Kat. E'], ['F', 'Kat. F'], ['G', 'Kat. G'], ['H', 'Kat. H'], ['snow', 'Śnieg ≤ 1000 m'], ['snowHi', 'Śnieg > 1000 m'], ['wind', 'Wiatr'], ['temp', 'Temperatura']];
  h += `<table><thead><tr><th>ψ</th>${PN.map(p => `<th class="r">${p[1]}</th>`).join('')}</tr></thead><tbody>${[0, 1, 2].map(i => `<tr><td>ψ<sub>${i}</sub></td>${PN.map(p => `<td class="num">${F(EC.PSI[p[0]][i], 1)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  if (M.notes) h += `<div class="nt">${esc(M.notes).replace(/\n/g, '<br>')}</div>`;
  /* 2. parametry klimatyczne (bez danych lokalizacyjnych) */
  h += H2('Parametry klimatyczne');
  const ROM = ['', 'I', 'II', 'III', 'IV', 'V'];
  h += `<p>Strefa obciążenia śniegiem ${ROM[+S.ss.zone] || S.ss.zone}${+S.ss.zoneB ? '–' + (ROM[+S.ss.zoneB] || S.ss.zoneB) + ' (pas przejściowy)' : ''}, A = ${F(S.ss.A, 0)} m n.p.m.; strefa obciążenia wiatrem ${ROM[+S.ws.zone] || S.ws.zone}${+S.ws.zoneB ? '–' + (ROM[+S.ws.zoneB] || S.ws.zoneB) + ' (pas przejściowy)' : ''}, kategoria terenu ${esc(S.ws.terrain)}.</p>`;
  const L = S.loc;
  if (o.map && isNum(L.lat)) {
    const m1 = SVG.map('snow', null, L), m2 = SVG.map('wind', null, L);
    h += `<div class="fig"><figure class="map">${m1.svg}<figcaption>Strefy obciążenia śniegiem (PN-EN 1991-1-3/NA)</figcaption></figure><figure class="map">${m2.svg}<figcaption>Strefy obciążenia wiatrem (PN-EN 1991-1-4/NA)</figcaption></figure></div>`;
  }
  h += `<h3>Obciążenie śniegiem gruntu</h3><div class="kvs">${kv('s<sub>k</sub>', R.snowSite.sk, 'kN/m²', 'hl', 3)}${kv('C<sub>e</sub>·C<sub>t</sub>·s<sub>k</sub>', R.snowSite.k, 'kN/m²', '', 3)}</div>${stepsHTML(R.snowSite.steps)}`;
  h += `<h3>Wiatr – bazowe i szczytowe ciśnienie prędkości</h3><div class="kvs">${kv('v<sub>b,0</sub>', R.windBase.vb0, 'm/s', '', 2)}${kv('v<sub>b</sub>', R.windBase.vb, 'm/s', '', 2)}${kv('q<sub>b</sub>', R.windBase.qb, 'kN/m²', 'hl', 3)}</div>${stepsHTML(R.windBase.steps)}`;
  const zs = [2, 5, 10, 15, 20, 30, 50];
  const wb = R.windBase;
  h += `<table><thead><tr><th>z [m]</th>${zs.map(z => `<th class="r">${z}</th>`).join('')}</tr></thead><tbody><tr><td>q<sub>p</sub>(z) [kN/m²] – ${S.ws.method === 'NA' ? 'ZK, tabl. NA.3' : S.ws.method === 'EN' ? 'wzory (4.3)–(4.8)' : 'ręcznie'}, kat. ${esc(S.ws.terrain)}</td>${zs.map(z => `<td class="num">${F(EC.qpAt(z, S.ws, wb).qp, 3)}</td>`).join('')}</tr></tbody></table>`;
  if (S.therm.length) h += `<h3>Temperatury charakterystyczne</h3>${stepsHTML(R.thermSite.steps)}`;
  /* pozycje */
  if (o.perm && S.perm.length) { h += H2('Obciążenia stałe G (PN-EN 1991-1-1)'); S.perm.forEach((p, i) => { h += repItem('perm', p, i, resPerm(p, true)); }); }
  if (o.imp && S.imp.length) { h += H2('Obciążenia użytkowe Q (PN-EN 1991-1-1, PN-EN 1991-1-6)'); S.imp.forEach((c, i) => { h += repItem('imp', c, i, resImp(c)); }); }
  if (o.snow && S.snow.length) { h += H2('Obciążenie śniegiem S (PN-EN 1991-1-3)'); S.snow.forEach((c, i) => { h += repItem('snow', c, i, resSnow(c, true)); }); }
  if (o.wind && S.wind.length) { h += H2('Oddziaływanie wiatru W (PN-EN 1991-1-4)'); S.wind.forEach((c, i) => { h += repItem('wind', c, i, resWind(c, true)); }); }
  if (o.therm && S.therm.length) { h += H2('Oddziaływania termiczne T (PN-EN 1991-1-5)'); S.therm.forEach((c, i) => { h += repItem('therm', c, i, resTherm(c)); }); }
  if (o.groups && S.groups.length) {
    h += H2('Zestawienia obciążeń i kombinacje (PN-EN 1990)');
    h += `<table><thead><tr><th>Σ</th><th>Element</th><th>Jedn.</th><th class="r">G<sub>k</sub></th><th class="r">q<sub>Ed</sub></th><th class="r">charakt.</th><th class="r">częsta</th><th class="r">quasi-st.</th><th class="r">odrywanie</th></tr></thead><tbody>${S.groups.map((g, i) => { const r = R.groups[g.id], c = r.comb; return `<tr><td>Σ${i + 1}</td><td>${esc(g.name)}</td><td>${r.unit}</td><td class="num">${F(r.Gk, 3)}</td><td class="num"><b>${c.uls ? F(c.uls.v, 3) : '—'}</b></td><td class="num">${c.sls.ch ? F(c.sls.ch.v, 3) : '—'}</td><td class="num">${c.sls.fr ? F(c.sls.fr.v, 3) : '—'}</td><td class="num">${c.sls.qp ? F(c.sls.qp.v, 3) : '—'}</td><td class="num">${c.uplift ? F(Math.min(c.uplift.v, c.upliftEQU.v), 3) : '—'}</td></tr>`; }).join('')}</tbody></table>`;
    S.groups.forEach((g, i) => { h += repItem('groups', g, i, `<p class="nt">Sposób: ${g.mode === 'direct' ? 'bez przeliczeń' : g.mode === 'proj' ? 'pionowo, na m² rzutu poziomego' : 'składowe prostopadłe i równoległe do połaci'}${g.mode !== 'direct' ? ', α = ' + F(g.alpha, 1) + '°' : ''}${g.unit === 'line' ? '; pasmo zbierania b = ' + F(g.b, 2) + ' m' : ''}.</p>` + resGroup(g, true)); });
  }
  if (o.notes) {
    h += H2('Uwagi');
    h += (R.warns.filter(w => w.col !== 'loc').map(w => `<div class="w">${w.t}</div>`).join('') || '<p>Brak uwag.</p>');
    h += `<p class="nt">Ciężary materiałów oznaczone jako „orientacyjnie” pochodzą z literatury i danych producentów – w projekcie wykonawczym należy je potwierdzić dokumentacją przyjętych wyrobów. Wartości T<sub>max</sub>, T<sub>min</sub> wprowadzono z map ZK do PN-EN 1991-1-5.</p>`;
  }
  return noSteps(deRef(h));
}
function repTab() {
  const o = repOpts();
  const ch = (k, t) => `<label><input type="checkbox" data-repopt="${k}"${o[k] ? ' checked' : ''}>${t}</label>`;
  return `<div class="reptools"><button type="button" class="btn pri" data-act="print">Drukuj / zapisz PDF</button><button type="button" class="btn" data-act="exporthtml">Zapisz raport HTML…</button><button type="button" class="btn" data-act="csv">Zestawienie CSV…</button><button type="button" class="btn" data-act="save">Zapisz projekt…</button></div>${ART ? '<div class="note" style="text-align:center;margin:-6px 0 10px">W wersji online zapisz raport HTML, otwórz go w przeglądarce i wydrukuj do PDF.</div>' : ''}<div class="repopts">${ch('steps', 'tok obliczeń (wzory z podstawieniem)')}${ch('map', 'mapy stref')}${ch('perm', 'G')}${ch('imp', 'Q')}${ch('snow', 'S')}${ch('wind', 'W')}${ch('therm', 'T')}${ch('groups', 'Σ')}${ch('notes', 'uwagi')}</div><div class="paper"><div class="rep" id="report">${buildReport()}</div></div>`;
}
function repHTMLDoc() {
  const css = $('#repcss').textContent + REP_EXTRA;
  return `<!${"doctype"} html><${"html"} lang="pl"><${"head"}><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Zestawienie obciążeń</title><style>${css}\nbody{margin:0;background:#fff}.wrap{max-width:960px;margin:0 auto;padding:24px 28px}@media print{.wrap{padding:0}.noprint{display:none}}@page{size:A4;margin:14mm 12mm}</style></${"head"}><${"body"}><div class="wrap"><div class="noprint" style="margin-bottom:12px"><button onclick="window.print()">Drukuj / zapisz PDF</button></div><div class="rep">${buildReport()}</div></div></${"body"}></${"html"}>`;
}
function buildCSV() {
  const q = s => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
  const n = x => isNum(x) ? String(+x.toFixed(4)).replace('.', ',') : '';
  const rows = [['Zestawienie obciążeń'], []];
  rows.push(['A [m]', n(S.ss.A), 'sk [kN/m2]', n(R.snowSite.sk), 'qb [kN/m2]', n(R.windBase.qb)]);
  rows.push([]);
  rows.push(['Symbol', 'Zestawienie', 'Jednostka', 'Gk', 'qEd (SGN)', 'kombinacja', 'charakterystyczna', 'częsta', 'quasi-stała', 'odrywanie STR', 'odrywanie EQU']);
  S.groups.forEach((g, i) => { const r = R.groups[g.id], c = r.comb; rows.push(['Σ' + (i + 1), g.name, r.unit, n(r.Gk), n(c.uls && c.uls.v), c.uls ? strip(c.uls.n) : '', n(c.sls.ch && c.sls.ch.v), n(c.sls.fr && c.sls.fr.v), n(c.sls.qp && c.sls.qp.v), n(c.uplift && c.uplift.v), n(c.upliftEQU && c.upliftEQU.v)]); });
  rows.push([]);
  rows.push(['Symbol', 'Pozycja', 'Wartość', 'Jednostka', 'Opis']);
  S.perm.forEach((p, i) => { const r = R.perm[p.id]; rows.push(['G' + (i + 1), p.name, n(r.gk), p.type === 'line' ? 'kN/m' : 'kN/m2', p.type === 'line' ? '' : 'na m2 przegrody; rzut: ' + n(r.gkH)]); });
  S.imp.forEach((c, i) => { const r = R.imp[c.id]; r.vals.forEach(v => rows.push(['Q' + (i + 1), c.name, n(v.v), v.unit, strip(v.label)])); });
  S.snow.forEach((c, i) => { const r = R.snow[c.id]; r.vals.forEach(v => rows.push(['S' + (i + 1), c.name, n(v.v), v.unit, strip(v.label)])); });
  S.wind.forEach((c, i) => { const r = R.wind[c.id]; r.vals.forEach(v => rows.push(['W' + (i + 1), c.name, n(v.v) + (isNum(v.vmin) ? ' / ' + n(v.vmin) : ''), v.unit, strip(v.label)])); });
  S.therm.forEach((c, i) => { const r = R.therm[c.id]; r.rows.forEach(x => rows.push(['T' + (i + 1), c.name, n(x.dTu), 'K', 'ΔTu – ' + x.n])); });
  return '﻿' + rows.map(r => r.map(q).join(';')).join('\r\n');
}
