/* ObciążeniaEC – rysunki SVG (schematy obciążeń, strefy wiatru, przekroje warstw, mapa stref) */
(function (root) {
'use strict';
const EC = root.EC;
const { F, clamp, isNum, rad } = EC;
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const strip = s => String(s == null ? '' : s).replace(/<sub>(.*?)<\/sub>/g, '$1').replace(/<sup>(.*?)<\/sup>/g, '^$1').replace(/<[^>]+>/g, '');
function arrow(x1, y1, x2, y2) {
  const a = Math.atan2(y2 - y1, x2 - x1), s = 5;
  const p1 = [x2 - s * Math.cos(a - 0.45), y2 - s * Math.sin(a - 0.45)], p2 = [x2 - s * Math.cos(a + 0.45), y2 - s * Math.sin(a + 0.45)];
  return `<line class="arr" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/><path class="arrh" d="M${x2.toFixed(1)} ${y2.toFixed(1)}L${p1[0].toFixed(1)} ${p1[1].toFixed(1)}L${p2[0].toFixed(1)} ${p2[1].toFixed(1)}Z"/>`;
}
const fig = (svg, cap) => `<figure>${svg}<figcaption>${cap}</figcaption></figure>`;

/* ---------- śnieg ---------- */
function snow(d, cases) {
  if (!d) return '';
  const X0 = 22, X1 = 278, GY = 124, Wd = X1 - X0;
  let roof = '', top = 80, yb, lx0 = X0, lx1 = X1, mapX = null, extra = '';
  const tn = a => Math.tan(rad(clamp(a || 0, 0, 80)));
  if (d.shape === 'mono') { const r = clamp(tn(d.a1) * 70, 2, 44); roof = `<path class="bld" d="M${X0} ${GY}V104L${X1} ${104 - r}V${GY}Z"/>`; top = 104 - r; }
  else if (d.shape === 'duo') {
    const t1 = tn(d.a1), t2 = tn(d.a2);
    const xr = t1 + t2 > 0 ? X0 + Wd * t2 / (t1 + t2) : (X0 + X1) / 2;
    const hr = clamp(t1 + t2 > 0 ? Wd * t1 * t2 / (t1 + t2) * 0.4 : 0, 3, 44);
    roof = `<path class="bld" d="M${X0} ${GY}V106L${xr.toFixed(1)} ${(106 - hr).toFixed(1)}L${X1} 106V${GY}Z"/>`; top = 106 - hr;
    mapX = f => f <= 0.5 ? X0 + (xr - X0) * f / 0.5 : xr + (X1 - xr) * (f - 0.5) / 0.5;
  } else if (d.shape === 'multi') {
    const q = Wd / 4;
    roof = `<path class="bld" d="M${X0} ${GY}V108L${X0 + q} 82L${X0 + 2 * q} 108L${X0 + 3 * q} 82L${X1} 108V${GY}Z"/>`; top = 82;
  } else if (d.shape === 'cyl') {
    const r = clamp((d.h / Math.max(d.b, 0.1)) * 150, 6, 44);
    roof = `<path class="bld" d="M${X0} ${GY}V108Q${(X0 + X1) / 2} ${108 - 2 * r} ${X1} 108V${GY}Z"/>`; top = 108 - r;
  } else if (d.shape === 'tall') {
    roof = `<path class="bld" d="M${X0} ${GY}V30H${X0 + 64}V${GY}Z"/><path class="bld" d="M${X0 + 64} ${GY}V100H${X1}V${GY}Z"/>`;
    lx0 = X0 + 64; yb = 98; extra = `<text x="${X0 + 32}" y="76" text-anchor="middle" class="t2">wyższy</text>`;
  } else if (d.shape === 'obst') {
    roof = `<path class="bld" d="M${X0} ${GY}V80H${X0 + 6}V100H${X1}V${GY}Z"/>`;
    lx0 = X0 + 6; yb = 98; extra = `<text x="${X0 + 10}" y="76" class="t2">attyka</text>`;
  } else if (d.shape === 'over') {
    return fig(`<svg viewBox="0 0 300 132" role="img" aria-label="Nawis śnieżny"><path class="bld" d="M30 ${GY}V92L230 80V${GY}Z"/><path class="ld" d="M30 92L230 80L230 70L30 82Z"/><path class="ld" d="M230 70C246 70 256 78 254 90C252 100 240 102 236 94C232 88 236 82 230 80Z"/>${arrow(262, 66, 248, 84)}<text x="262" y="60">s<tspan dy="2" font-size="8">e</tspan></text><text x="110" y="64" class="t2">warstwa śniegu d</text><line class="gnd" x1="10" y1="${GY}" x2="290" y2="${GY}"/></svg>`, 'Nawis na krawędzi dachu – obciążenie liniowe s<sub>e</sub> [kN/m]');
  } else if (d.shape === 'guard') {
    const a = clamp(d.a1 || 30, 5, 70), x1 = 50, y1 = 112, L = 230, x2 = x1 + L * Math.cos(rad(a)) * 0.95, y2 = y1 - Math.min(L * Math.sin(rad(a)), 96);
    const ca = Math.cos(rad(a)), sa = Math.sin(rad(a));
    const gx = x1 + 30 * ca, gy = y1 - 30 * sa;
    return fig(`<svg viewBox="0 0 300 132" role="img" aria-label="Bariera przeciwśnieżna"><line class="roof" x1="${x1}" y1="${y1}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/><line class="roof" x1="${gx.toFixed(1)}" y1="${gy.toFixed(1)}" x2="${(gx - 10 * sa).toFixed(1)}" y2="${(gy - 10 * ca).toFixed(1)}" style="stroke-width:3"/><path class="ld" d="M${gx.toFixed(1)} ${gy.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}L${(x2 - 8 * sa).toFixed(1)} ${(y2 - 8 * ca).toFixed(1)}L${(gx - 8 * sa).toFixed(1)} ${(gy - 8 * ca).toFixed(1)}Z"/>${arrow(gx + 70 * ca - 14 * sa, gy - 70 * sa - 14 * ca, gx + 18 * ca - 14 * sa, gy - 18 * sa - 14 * ca)}<text x="${(gx + 50 * ca - 26 * sa).toFixed(1)}" y="${(gy - 50 * sa - 26 * ca).toFixed(1)}">F<tspan dy="2" font-size="8">s</tspan></text><text x="${x1 + 40}" y="${y1 + 10}" class="t2">α = ${F(a, 0)}°</text><line class="gnd" x1="${x1}" y1="${y1}" x2="${x1 + 120}" y2="${y1}"/></svg>`, 'Bariera przeciwśnieżna – siła F<sub>s</sub> [kN/m]');
  }
  if (yb === undefined) yb = top - 6;
  if (!mapX) mapX = f => lx0 + (lx1 - lx0) * f;
  let vmax = 0; cases.forEach(c => c.segs.forEach(s => { vmax = Math.max(vmax, num0(s.v0), num0(s.v1)); }));
  if (vmax <= 0) vmax = 1;
  const Hm = Math.min(36, yb - 20);
  return cases.map(c => {
    let polys = '', labs = '';
    c.segs.forEach(s => {
      const v0 = num0(s.v0), v1 = num0(s.v1);
      const xa = mapX(s.x0), xc = mapX(s.x1), ha = v0 / vmax * Hm, hc = v1 / vmax * Hm;
      polys += `<path class="ld" d="M${xa.toFixed(1)} ${yb.toFixed(1)}V${(yb - ha).toFixed(1)}L${xc.toFixed(1)} ${(yb - hc).toFixed(1)}V${yb.toFixed(1)}Z"/>`;
      if (Math.abs(v0 - v1) < 1e-6) labs += `<text x="${((xa + xc) / 2).toFixed(1)}" y="${(yb - ha - 4).toFixed(1)}" text-anchor="middle">${F(v0, 2)}</text>`;
      else {
        if (v0 > 0.001) labs += `<text x="${(xa + 3).toFixed(1)}" y="${(yb - ha - 4).toFixed(1)}">${F(v0, 2)}</text>`;
        if (v1 > 0.001) labs += `<text x="${(xc - 3).toFixed(1)}" y="${(yb - hc - 4).toFixed(1)}" text-anchor="end">${F(v1, 2)}</text>`;
      }
    });
    return fig(`<svg viewBox="0 0 300 132" role="img" aria-label="${esc(strip(c.label))}">${roof}${extra}<line class="gnd" x1="10" y1="${GY}" x2="290" y2="${GY}"/>${polys}${labs}</svg>`, c.label + ' – współczynniki μ');
  }).join('');
}
const num0 = x => isNum(x) ? x : 0;

/* ---------- wiatr: rzut ścian ---------- */
function walls(g) {
  const W = 300, H = 196, sc = Math.min(190 / g.d, 116 / g.b);
  const w = g.d * sc, h = g.b * sc, x0 = 78 + (190 - w) / 2, y0 = 40 + (116 - h) / 2;
  let s = `<rect class="bld" x="${x0.toFixed(1)}" y="${y0.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}"/>`;
  for (let i = 0; i < 3; i++) { const y = y0 + h * (i + 1) / 4; s += arrow(14, y, x0 - 24, y); }
  s += `<text x="14" y="${(y0 - 6).toFixed(1)}" class="t2">wiatr</text>`;
  s += `<rect class="zp" x="${(x0 - 7).toFixed(1)}" y="${y0.toFixed(1)}" width="7" height="${h.toFixed(1)}"/><text x="${(x0 - 12).toFixed(1)}" y="${(y0 + h / 2 + 3).toFixed(1)}" text-anchor="end">D</text>`;
  s += `<rect class="zs" x="${(x0 + w).toFixed(1)}" y="${y0.toFixed(1)}" width="7" height="${h.toFixed(1)}"/><text x="${(x0 + w + 11).toFixed(1)}" y="${(y0 + h / 2 + 3).toFixed(1)}">E</text>`;
  let x = x0;
  g.zl.forEach(([z, L], i) => {
    const lw = L * sc;
    s += `<rect class="zs" x="${x.toFixed(1)}" y="${(y0 - 7).toFixed(1)}" width="${lw.toFixed(1)}" height="7" style="fill-opacity:${(0.6 - i * 0.18).toFixed(2)}"/><rect class="zs" x="${x.toFixed(1)}" y="${(y0 + h).toFixed(1)}" width="${lw.toFixed(1)}" height="7" style="fill-opacity:${(0.6 - i * 0.18).toFixed(2)}"/>`;
    if (lw > 9) s += `<text x="${(x + lw / 2).toFixed(1)}" y="${(y0 - 11).toFixed(1)}" text-anchor="middle">${z}</text><text x="${(x + lw / 2).toFixed(1)}" y="${(y0 + h + 18).toFixed(1)}" text-anchor="middle">${z}</text>`;
    x += lw;
  });
  return fig(`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Rzut – strefy ścian">${s}</svg>`, `Rzut budynku – strefy ścian A–E (rys. 7.5); d = ${F(g.d, 1)} m wzdłuż wiatru, b = ${F(g.b, 1)} m, e = ${F(g.e, 2)} m`);
}
/* ---------- wiatr: rzut dachu ---------- */
function roofPlan(g, kind) {
  const W = 300, H = 196, sc = Math.min(200 / g.d, 130 / g.b);
  const w = g.d * sc, h = g.b * sc, x0 = 70 + (200 - w) / 2, y0 = 30 + (130 - h) / 2;
  const e = g.e, X = m => x0 + clamp(m, 0, g.d) * sc, Y = m => y0 + clamp(m, 0, g.b) * sc;
  const R = (zx0, zx1, zy0, zy1, cls, lab) => { const a = X(zx0), b = X(zx1), c = Y(zy0), d = Y(zy1); if (b - a < 0.5 || d - c < 0.5) return ''; return `<rect class="${cls}" x="${a.toFixed(1)}" y="${c.toFixed(1)}" width="${(b - a).toFixed(1)}" height="${(d - c).toFixed(1)}"/>` + (b - a > 9 && d - c > 9 ? `<text x="${((a + b) / 2).toFixed(1)}" y="${((c + d) / 2 + 3).toFixed(1)}" text-anchor="middle">${lab}</text>` : ''); };
  let s = '';
  const e10 = e / 10, e4 = e / 4;
  s += R(0, e10, 0, e4, 'zs', 'F') + R(0, e10, g.b - e4, g.b, 'zs', 'F') + R(0, e10, e4, g.b - e4, 'zs', 'G');
  if (kind === 'flat') s += R(e10, e / 2, 0, g.b, 'zn', 'H') + R(e / 2, g.d, 0, g.b, 'zn', 'I');
  else if (kind === 'duo') { s += R(e10, g.d / 2, 0, g.b, 'zn', 'H') + R(g.d / 2, g.d / 2 + e10, 0, g.b, 'zn', 'J') + R(g.d / 2 + e10, g.d, 0, g.b, 'zn', 'I'); s += `<line class="gnd" x1="${X(g.d / 2).toFixed(1)}" y1="${(y0 - 4).toFixed(1)}" x2="${X(g.d / 2).toFixed(1)}" y2="${(y0 + h + 4).toFixed(1)}"/>`; }
  else s += R(e10, g.d, 0, g.b, 'zn', 'H');
  s = `<rect class="bld" x="${x0.toFixed(1)}" y="${y0.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}"/>` + s;
  for (let i = 0; i < 3; i++) { const y = y0 + h * (i + 1) / 4; s += arrow(14, y, x0 - 10, y); }
  s += `<text x="12" y="${(y0 - 6).toFixed(1)}" class="t2">θ = 0°</text><text x="${x0.toFixed(1)}" y="${H - 8}" class="t2">d = ${F(g.d, 1)} m · b = ${F(g.b, 1)} m · e = ${F(e, 2)} m</text>`;
  const cap = kind === 'flat' ? 'Rzut dachu płaskiego – strefy F, G, H, I (rys. 7.6)' : kind === 'duo' ? 'Rzut dachu dwuspadowego, θ = 0° – strefy F–J (rys. 7.8); linia przerywana – kalenica' : 'Rzut dachu jednospadowego, θ = 0° – strefy F, G, H (rys. 7.7)';
  return fig(`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Strefy dachu">${s}</svg>`, cap);
}
/* ---------- ściana wolnostojąca ---------- */
function fwall(g) {
  const W = 300, H = 120, L = Math.min(g.l, 6 * g.h), sc = Math.min(260 / L, 60 / g.h);
  const x0 = 20, y0 = 90 - g.h * sc;
  let s = '';
  g.zl.forEach(([z, a0, a1], i) => {
    const xa = x0 + Math.min(a0, L) * sc, xb = x0 + Math.min(a1, L) * sc;
    if (xb - xa < 0.5) return;
    s += `<rect class="zs" x="${xa.toFixed(1)}" y="${y0.toFixed(1)}" width="${(xb - xa).toFixed(1)}" height="${(g.h * sc).toFixed(1)}" style="fill-opacity:${(0.55 - i * 0.12).toFixed(2)}"/>`;
    if (xb - xa > 10) s += `<text x="${((xa + xb) / 2).toFixed(1)}" y="${(y0 + g.h * sc / 2 + 3).toFixed(1)}" text-anchor="middle">${z}</text>`;
  });
  s += `<line class="gnd" x1="10" y1="90" x2="290" y2="90"/><text x="${x0}" y="106" class="t2">swobodny koniec →</text>`;
  return fig(`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Strefy ściany">${s}</svg>`, `Ściana / attyka – strefy A–D od swobodnego końca (rys. 7.19), h = ${F(g.h, 2)} m`);
}
/* ---------- przekrój warstw ---------- */
const LCOL = { bet: '#b8bec8', mur: '#d9a38f', met: '#8d99ae', drw: '#d6b77c', kam: '#a8a29a', tyn: '#e4dccb', pos: '#c9b79c', izo: '#f2e27a', hyd: '#4a4f57', plt: '#d5dbe3', grn: '#b39b76', naw: '#6b6f75', pok: '#b5523b', str: '#a9b0ba', scn: '#cfd6df', ele: '#e0e4ea', skl: '#c7c1b0', inn: '#9cc7e6', usr: '#cccccc' };
function layers(p, R, user) {
  const rows = R.rows || [];
  if (!rows.length) return '';
  const tv = rows.map(x => x.mode === 'v' ? Math.max(num0(x.L.t), 0) : x.mode === 'rib' ? Math.max(num0(x.L.h), 0) : 0.6);
  const tot = tv.reduce((a, b) => a + b, 0) || 1;
  const sc = Math.min(130 / tot, 9);
  let y = 10, s = '';
  const centers = [];
  rows.forEach((x, i) => {
    const m = EC.matOf(x.L.m, user);
    const h = Math.max(tv[i] * sc, 2.5);
    const col = LCOL[m.grp] || '#cccccc';
    if (x.mode === 'rib') {
      s += `<rect x="40" y="${y.toFixed(1)}" width="150" height="${h.toFixed(1)}" fill="none" class="lyr" stroke-dasharray="3 2"/>`;
      for (let k = 0; k < 3; k++) s += `<rect x="${(52 + k * 50).toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(6, num0(x.L.b) / Math.max(num0(x.L.a), 1) * 50).toFixed(1)}" height="${h.toFixed(1)}" fill="${col}" class="lyr"/>`;
    } else s += `<rect x="40" y="${y.toFixed(1)}" width="150" height="${h.toFixed(1)}" fill="${col}" class="lyr"${x.mode === 'a' ? ' stroke-dasharray="2 2"' : ''}/>`;
    centers.push({ c: y + h / 2, m, x, i });
    y += h;
  });
  /* etykiety bez nakładania: minimalny odstęp 12 */
  const ly = centers.map(o => o.c);
  for (let i = 1; i < ly.length; i++) if (ly[i] < ly[i - 1] + 12) ly[i] = ly[i - 1] + 12;
  const H = Math.max(y, ly.length ? ly[ly.length - 1] + 8 : y) + 8;
  centers.forEach((o, i) => {
    const nm = o.m.n.length > 34 ? o.m.n.slice(0, 33) + '…' : o.m.n;
    s += `<path d="M190 ${o.c.toFixed(1)}L200 ${o.c.toFixed(1)}L206 ${ly[i].toFixed(1)}L212 ${ly[i].toFixed(1)}" fill="none" class="lyr"/>`;
    s += `<text x="215" y="${(ly[i] + 3.5).toFixed(1)}">${i + 1}. ${esc(nm)}</text>`;
    s += `<text x="34" y="${(ly[i] + 3.5).toFixed(1)}" text-anchor="end" class="t2">${o.x.mode === 'v' ? F(o.x.L.t, 1) : o.x.mode === 'rib' ? F(o.x.L.h, 0) : 'g'}</text>`;
  });
  return `<figure style="max-width:520px">${`<svg viewBox="0 0 420 ${H.toFixed(0)}" role="img" aria-label="Przekrój przez warstwy">${s}</svg>`}<figcaption>Przekrój przegrody – grubości w cm (warstwy o ciężarze powierzchniowym „g” – symbolicznie)${R.alpha > 0 ? `; nachylenie α = ${F(R.alpha, 1)}°` : ''}</figcaption></figure>`;
}
/* ---------- wiata ---------- */
function canopy(duo, a) {
  const W = 300, H = 120, x0 = 40, x1 = 260, yb = 96, t = Math.tan(rad(clamp(Math.abs(a), 0, 40)));
  let s = `<line class="gnd" x1="10" y1="${yb + 14}" x2="290" y2="${yb + 14}"/><line class="roof" x1="${x0 + 10}" y1="${yb + 14}" x2="${x0 + 10}" y2="60"/><line class="roof" x1="${x1 - 10}" y1="${yb + 14}" x2="${x1 - 10}" y2="60"/>`;
  if (duo) { const hm = (x1 - x0) / 2 * t * 0.5 * Math.sign(a || 1); s += `<path class="roof" d="M${x0} 60L${(x0 + x1) / 2} ${(60 - hm).toFixed(1)}L${x1} 60"/>`; }
  else { const hm = (x1 - x0) * t * 0.4; s += `<path class="roof" d="M${x0} 60L${x1} ${(60 - hm).toFixed(1)}"/>`; }
  for (let i = 0; i < 3; i++) s += arrow(4, 46 + i * 12, 30, 46 + i * 12);
  return fig(`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Wiata">${s}</svg>`, `Wiata ${duo ? 'dwuspadowa' : 'jednospadowa'}, α = ${F(a, 1)}° – strefy wg ${duo ? 'tabl. 7.7' : 'tabl. 7.6'}`);
}
/* ---------- wykres składników zestawienia ---------- */
function stack(parts, unit) {
  const tot = parts.reduce((a, p) => a + Math.max(p.v, 0), 0);
  if (!(tot > 0)) return '';
  let x = 10, s = '';
  const W = 280;
  parts.forEach(p => {
    const w = Math.max(p.v, 0) / tot * W;
    if (w <= 0) return;
    s += `<rect x="${x.toFixed(1)}" y="18" width="${w.toFixed(1)}" height="22" style="fill:var(--c${p.c || 'G'})" fill-opacity=".85"/>`;
    if (w > 26) s += `<text x="${(x + w / 2).toFixed(1)}" y="33" text-anchor="middle" style="fill:#fff;font-weight:600">${esc(p.sym)}</text>`;
    x += w;
  });
  return fig(`<svg viewBox="0 0 300 50" role="img" aria-label="Udział obciążeń">${s}<text x="10" y="12" class="t2">wartości charakterystyczne – udział składników (Σ = ${F(tot, 2)} ${unit})</text></svg>`, 'Udział składników zestawienia');
}

/* ---------- mapa stref ---------- */
const GEO = (function () {
  const K = Math.cos(52 * Math.PI / 180);
  function decode(txt, scale) {
    return txt.split(';').map(feat => {
      const i = feat.indexOf(':');
      const code = feat.slice(0, i);
      const rings = feat.slice(i + 1).split('/').map(ring => { let x = 0, y = 0; return ring.split(' ').map(p => { const c = p.indexOf(','); x += +p.slice(0, c); y += +p.slice(c + 1); return [x / scale, y / scale]; }); });
      return { code, rings };
    });
  }
  let SN = null, WN = null, WJ = null, TW = null, GM = null;
  const snow = () => SN || (SN = decode(GEO_SNOW, 1000));
  const wind = () => WN || (WN = decode(GEO_WIND, 1000));
  const woj = () => WJ || (WJ = GEO_WOJ.split('/').map(ring => { let x = 0, y = 0; return ring.split(' ').map(p => { const c = p.indexOf(','); x += +p.slice(0, c); y += +p.slice(c + 1); return [x / 100, y / 100]; }); }));
  function inRing(x, y, r) { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const xi = r[i][0], yi = r[i][1], xj = r[j][0], yj = r[j][1]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; }
  function distRing(x, y, r) { let bd = Infinity; const px = x * K, py = y; for (let i = 0; i < r.length - 1; i++) { const ax = r[i][0] * K, ay = r[i][1], bx = r[i + 1][0] * K, by = r[i + 1][1]; const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy || 1e-12; const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L)); const d = Math.hypot(ax + t * dx - px, ay + t * dy - py); if (d < bd) bd = d; } return bd * 111.2; }
  function zoneIn(feats, x, y) {
    for (const f of feats) if (inRing(x, y, f.rings[0]) && !f.rings.slice(1).some(h => inRing(x, y, h))) return { code: f.code, exact: true };
    let best = null, bd = Infinity;
    for (const f of feats) { const d = distRing(x, y, f.rings[0]); if (d < bd) { bd = d; best = f.code; } }
    return bd < 8 ? { code: best, exact: false, dist: bd } : null;
  }
  function parse(code) { if (!code) return null; const m = /^[SW](\d)(?:-(\d))?$/.exec(code); return m ? { zone: +m[1], zoneB: m[2] ? +m[2] : 0, code } : null; }
  const ROM = ['', 'I', 'II', 'III', 'IV', 'V'];
  function label(code) { const p = parse(code); if (!p) return '—'; return p.zoneB ? ROM[p.zone] + '–' + ROM[p.zoneB] + ' (pas przejściowy)' : ROM[p.zone]; }
  function at(lon, lat) { const s = zoneIn(snow(), lon, lat), w = zoneIn(wind(), lon, lat); return { snow: s && s.code, wind: w && w.code, approx: !!((s && !s.exact) || (w && !w.exact)), outside: !s && !w }; }
  const norm = s => String(s || '').toLowerCase().replace(/ł/g, 'l').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  function towns() { return TW || (TW = GEO_TOWNS.split('\n').map(l => { const a = l.split('|'); return { kind: 'miasto', n: a[0], pow: GEO_POW[+a[1]], woj: GEO_WOJL[+a[2]], lon: +a[3], lat: +a[4], A: +a[5], k: norm(a[0]) }; })); }
  const GT = { 1: 'gmina miejska', 2: 'gmina wiejska', 3: 'gmina miejsko-wiejska' };
  function gminy() {
    if (GM) return GM;
    const tn = new Set(towns().map(t => t.k + '|' + t.woj));
    GM = GEO_GMINY.split('\n').map(l => { const a = l.split('|'); return { kind: GT[a[1]] || 'gmina', t: a[1], n: a[0], pow: GEO_POW[+a[2]], woj: GEO_WOJL[+a[3]], lon: +a[4], lat: +a[5], A: null, s: a[6] ? a[6].split(',').map(z => 'S' + z) : [], w: a[7] ? a[7].split(',').map(z => 'W' + z) : [], k: norm(a[0]) }; }).filter(g => !(g.t === '1' && tn.has(g.k + '|' + g.woj)));
    return GM;
  }
  function search(q, limit) {
    const k = norm(q); if (k.length < 2) return [];
    const res = [];
    const score = e => e.k === k ? 0 : e.k.startsWith(k) ? 1 : (' ' + e.k).includes(' ' + k) ? 2 : e.k.includes(k) ? 3 : 9;
    towns().forEach(e => { const s = score(e); if (s < 9) res.push([s, 0, e]); });
    gminy().forEach(e => { const s = score(e); if (s < 9) res.push([s, 1, e]); });
    res.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2].n.length - b[2].n.length || a[2].n.localeCompare(b[2].n, 'pl'));
    return res.slice(0, limit || 12).map(r => r[2]);
  }
  return { snow, wind, woj, at, parse, label, search, towns, gminy, norm, K };
})();
const MAP_W = 634, MAP_H = 610;
const mx = lon => (lon - 14.0) * GEO.K * 100, my = lat => (55.05 - lat) * 100;
const ilon = x => x / (GEO.K * 100) + 14.0, ilat = y => 55.05 - y / 100;
const CITIES = [['Warszawa', 21.012, 52.230], ['Kraków', 19.945, 50.065], ['Gdańsk', 18.647, 54.352], ['Wrocław', 17.038, 51.108], ['Poznań', 16.925, 52.406], ['Szczecin', 14.553, 53.429], ['Białystok', 23.169, 53.133], ['Lublin', 22.568, 51.247], ['Rzeszów', 21.999, 50.041], ['Katowice', 19.024, 50.265], ['Łódź', 19.456, 51.759], ['Olsztyn', 20.480, 53.778], ['Zakopane', 19.950, 49.299], ['Suwałki', 22.931, 54.112], ['Koszalin', 16.170, 54.190], ['Zielona Góra', 15.506, 51.935]];
const MAP_CACHE = {};
function ringPath(r) { return r.map((p, i) => (i ? 'L' : 'M') + mx(p[0]).toFixed(1) + ' ' + my(p[1]).toFixed(1)).join('') + 'Z'; }
function mapLayer(layer) {
  if (MAP_CACHE[layer]) return MAP_CACHE[layer];
  const feats = layer === 'wind' ? GEO.wind() : GEO.snow();
  let s = feats.map(f => `<path class="zf z${f.code.replace('-', '_')}${f.code.includes('-') ? ' zb' : ''}" d="${f.rings.map(ringPath).join('')}" fill-rule="evenodd"/>`).join('');
  s += `<path class="wj" d="${GEO.woj().map(ringPath).join('')}"/>`;
  return (MAP_CACHE[layer] = s);
}
const SNOW_LEG = [['S1', 'I'], ['S1-2', 'I–II'], ['S2', 'II'], ['S2-3', 'II–III'], ['S3', 'III'], ['S3-4', 'III–IV'], ['S4', 'IV'], ['S3-5', 'III–V'], ['S5', 'V']];
const WIND_LEG = [['W1', 'I'], ['W1-2', 'I–II'], ['W2', 'II'], ['W3', 'III']];
function map(layer, view, mark, opts) {
  opts = opts || {};
  const vb = view || { x: 0, y: 0, w: MAP_W, h: MAP_H };
  const sc = vb.w / MAP_W;
  let mk = '';
  if (mark && isNum(mark.lat) && isNum(mark.lon)) {
    const X = mx(mark.lon), Y = my(mark.lat), r = 6 * sc;
    mk = `<g class="mk"><circle cx="${X.toFixed(1)}" cy="${Y.toFixed(1)}" r="${(r * 2.6).toFixed(2)}" class="mk-h"/><circle cx="${X.toFixed(1)}" cy="${Y.toFixed(1)}" r="${r.toFixed(2)}" class="mk-c"/></g>`;
  }
  const cities = CITIES.map(([n, lo, la]) => `<g class="ct"><circle cx="${mx(lo).toFixed(1)}" cy="${my(la).toFixed(1)}" r="${(2.2 * sc).toFixed(2)}"/><text x="${(mx(lo) + 4 * sc).toFixed(1)}" y="${(my(la) + 3 * sc).toFixed(1)}" style="font-size:${(11 * sc).toFixed(2)}px">${n}</text></g>`).join('');
  const svg = `<svg ${opts.attr || ''} viewBox="${vb.x.toFixed(1)} ${vb.y.toFixed(1)} ${vb.w.toFixed(1)} ${vb.h.toFixed(1)}" role="img" aria-label="Mapa stref" style="--sw:${(1 * sc).toFixed(3)}px">${mapLayer(layer)}${cities}${mk}</svg>`;
  const leg = (layer === 'wind' ? WIND_LEG : SNOW_LEG).map(([c, t]) => `<span class="lg"><i class="z${c.replace('-', '_')}"></i>${t}</span>`).join('');
  return { svg, leg };
}
function zoomView(cx, cy, z) {
  const w = MAP_W / z, h = MAP_H / z;
  return { x: Math.max(-40, Math.min(MAP_W - w + 40, cx - w / 2)), y: Math.max(-40, Math.min(MAP_H - h + 40, cy - h / 2)), w, h };
}

root.SVG = { arrow, snow, walls, roofPlan, fwall, layers, canopy, stack, map, zoomView, GEO, mx, my, ilon, ilat, MAP_W, MAP_H, esc, strip };
root.GEO = GEO;
})(typeof window !== 'undefined' ? window : globalThis);
