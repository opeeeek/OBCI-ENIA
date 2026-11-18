/* =====================================================================
   ObciążeniaEC – schematy wiatru: rzut z wymiarami i strefami, przekrój,
   strefy klikane (data-wz="idPozycji|klucz strefy"), barwy wg ciśnienia
   ===================================================================== */
(function (root) {
'use strict';
const EC = root.EC, SVG = root.SVG;
const { F, Fs, clamp, isNum, rad } = EC;
const esc = SVG.esc;
const W = 720;                       // szerokość obszaru rysunku (jednostki viewBox)
const FT = 13;                       // podstawowy rozmiar czcionki
const sub = s => String(s).replace(/(₀|₉₀|₁₈₀)$/, '').replace(/^Fup$/, 'F<tspan dy="3" font-size="9">up</tspan>').replace(/^Flow$/, 'F<tspan dy="3" font-size="9">low</tspan>');
const fx = v => v.toFixed(1);

/* ---------- linie wymiarowe ---------- */
function dimH(x1, x2, y, txt, up) {
  if (!(x2 - x1 > 0.5)) return '';
  const t = up === false ? y + 15 : y - 5;
  return `<g class="dim"><line x1="${fx(x1)}" y1="${fx(y)}" x2="${fx(x2)}" y2="${fx(y)}"/><line x1="${fx(x1)}" y1="${fx(y - 5)}" x2="${fx(x1)}" y2="${fx(y + 5)}"/><line x1="${fx(x2)}" y1="${fx(y - 5)}" x2="${fx(x2)}" y2="${fx(y + 5)}"/><path d="M${fx(x1 - 3)} ${fx(y + 3)}L${fx(x1 + 3)} ${fx(y - 3)}M${fx(x2 - 3)} ${fx(y + 3)}L${fx(x2 + 3)} ${fx(y - 3)}"/>${x2 - x1 > 22 ? `<text x="${fx((x1 + x2) / 2)}" y="${fx(t)}" text-anchor="middle">${txt}</text>` : ''}</g>`;
}
function dimV(x, y1, y2, txt, left, rot) {
  if (!(y2 - y1 > 0.5)) return '';
  const tx = left === false ? x + 8 : x - 6;
  if (rot) return `<g class="dim"><line x1="${fx(x)}" y1="${fx(y1)}" x2="${fx(x)}" y2="${fx(y2)}"/><line x1="${fx(x - 5)}" y1="${fx(y1)}" x2="${fx(x + 5)}" y2="${fx(y1)}"/><line x1="${fx(x - 5)}" y1="${fx(y2)}" x2="${fx(x + 5)}" y2="${fx(y2)}"/><path d="M${fx(x - 3)} ${fx(y1 + 3)}L${fx(x + 3)} ${fx(y1 - 3)}M${fx(x - 3)} ${fx(y2 + 3)}L${fx(x + 3)} ${fx(y2 - 3)}"/><text transform="translate(${fx(left === false ? x + 15 : x - 6)},${fx((y1 + y2) / 2)}) rotate(-90)" text-anchor="middle">${txt}</text></g>`;
  return `<g class="dim"><line x1="${fx(x)}" y1="${fx(y1)}" x2="${fx(x)}" y2="${fx(y2)}"/><line x1="${fx(x - 5)}" y1="${fx(y1)}" x2="${fx(x + 5)}" y2="${fx(y1)}"/><line x1="${fx(x - 5)}" y1="${fx(y2)}" x2="${fx(x + 5)}" y2="${fx(y2)}"/><path d="M${fx(x - 3)} ${fx(y1 + 3)}L${fx(x + 3)} ${fx(y1 - 3)}M${fx(x - 3)} ${fx(y2 + 3)}L${fx(x + 3)} ${fx(y2 - 3)}"/>${y2 - y1 > 16 ? `<text x="${fx(tx)}" y="${fx((y1 + y2) / 2 + 4)}" text-anchor="${left === false ? 'start' : 'end'}">${txt}</text>` : ''}</g>`;
}
/* łańcuch wymiarowy wzdłuż x (granice w metrach) */
function chainH(xs, X, y, up) {
  let s = '';
  const pts = Array.from(new Set(xs.map(v => +v.toFixed(4)))).sort((a, b) => a - b);
  for (let i = 0; i < pts.length - 1; i++) s += dimH(X(pts[i]), X(pts[i + 1]), y, F(pts[i + 1] - pts[i], 2), up);
  return s;
}
function chainV_(ys, Y, x, left) {
  let s = '';
  const pts = Array.from(new Set(ys.map(v => +v.toFixed(4)))).sort((a, b) => a - b);
  for (let i = 0; i < pts.length - 1; i++) s += dimV(x, Y(pts[i]), Y(pts[i + 1]), F(pts[i + 1] - pts[i], 2), left);
  return s;
}
function windArrows(x1, x2, ys, label) {
  let s = ys.map(y => SVG.arrow(x1, y, x2, y)).join('');
  if (label) s += `<text x="${fx(x1)}" y="${fx(ys[0] - 10)}" class="wlab">${label}</text>`;
  return s;
}
/* ---------- barwy i etykiety stref ---------- */
function govVal(row) { if (!row) return NaN; return Math.abs(row.min.w) >= Math.abs(row.max.w) ? row.min.w : row.max.w; }
function zoneFill(row, maxAbs) {
  const v = govVal(row);
  if (!isNum(v) || maxAbs <= 0) return 'class="wz0"';
  const op = (0.12 + 0.6 * Math.min(Math.abs(v) / maxAbs, 1)).toFixed(2);
  return v < 0 ? `class="wzs" style="fill-opacity:${op}"` : `class="wzp" style="fill-opacity:${op}"`;
}
function zoneLabel(cx, cy, w, h, row, key) {
  const name = sub(row ? row.base : key);
  if (w < 13 || h < 13) return '';
  const v = govVal(row);
  const both = row && row.max.w > 0.0005 && row.min.w < -0.0005;
  const vt = both ? Fs(row.max.w, 2) + ' / ' + Fs(row.min.w, 2) : Fs(v, 2);
  if (w >= (both ? 92 : 46) && h >= 34) return `<text x="${fx(cx)}" y="${fx(cy - 2)}" text-anchor="middle" class="zl">${name}</text><text x="${fx(cx)}" y="${fx(cy + 14)}" text-anchor="middle" class="zv">${vt}</text>`;
  if (w >= 46 && h >= 34) return `<text x="${fx(cx)}" y="${fx(cy - 2)}" text-anchor="middle" class="zl">${name}</text><text x="${fx(cx)}" y="${fx(cy + 14)}" text-anchor="middle" class="zv">${Fs(v, 2)}</text>`;
  if (w >= 30 && h >= 22) return `<text x="${fx(cx)}" y="${fx(cy + 5)}" text-anchor="middle" class="zl" style="font-size:12px">${name}</text>`;
  return `<text x="${fx(cx)}" y="${fx(cy + 4)}" text-anchor="middle" class="zl" style="font-size:10px">${name}</text>`;
}
/* prostokąt strefy (współrzędne w metrach planu) */
function zrect(id, key, rows, X, Y, x0, x1, y0, y1, sel, maxAbs, clip) {
  const a = X(x0), b = X(x1), c = Y(y0), d = Y(y1);
  if (b - a < 0.4 || d - c < 0.4) return '';
  const row = rows[key];
  const on = sel === key ? ' wzsel' : '';
  return `<g data-wz="${esc(id)}|${esc(key)}" class="wzg${on}"${clip ? ` clip-path="url(#${clip})"` : ''}><rect x="${fx(a)}" y="${fx(c)}" width="${fx(b - a)}" height="${fx(d - c)}" ${zoneFill(row, maxAbs)}/>${zoneLabel((a + b) / 2, (c + d) / 2, b - a, d - c, row, key)}<title>${esc(key)}: ${row ? Fs(row.max.w, 3) + ' / ' + Fs(row.min.w, 3) + ' kN/m²' : ''}</title></g>`;
}
function zpoly(id, key, rows, pts, sel, maxAbs, lx, ly) {
  const row = rows[key];
  const on = sel === key ? ' wzsel' : '';
  return `<g data-wz="${esc(id)}|${esc(key)}" class="wzg${on}"><path d="M${pts.map(p => fx(p[0]) + ' ' + fx(p[1])).join('L')}Z" ${zoneFill(row, maxAbs)}/>${isNum(lx) ? zoneLabel(lx, ly, 60, 40, row, key) : ''}<title>${esc(key)}</title></g>`;
}
function badge(id, key, rows, x, y, sel, maxAbs) {
  const row = rows[key];
  const on = sel === key ? ' wzsel' : '';
  return `<g data-wz="${esc(id)}|${esc(key)}" class="wzg${on}"><rect x="${fx(x - 17)}" y="${fx(y - 12)}" width="34" height="24" rx="5" ${zoneFill(row, maxAbs)}/><rect x="${fx(x - 17)}" y="${fx(y - 12)}" width="34" height="24" rx="5" class="wzb"/><text x="${fx(x)}" y="${fx(y + 5)}" text-anchor="middle" class="zl" style="font-size:13px">${sub(row ? row.base : key)}</text><title>${esc(key)}: ${row ? Fs(row.max.w, 3) + ' / ' + Fs(row.min.w, 3) + ' kN/m²' : ''}</title></g>`;
}
function rowsMap(rows) { const m = {}; (rows || []).forEach(r => { if (!r.head) m[r.z] = r; }); return m; }
function maxAbsOf(rows) { let m = 0; (rows || []).forEach(r => { if (r.head) return; m = Math.max(m, Math.abs(r.max.w), Math.abs(r.min.w)); }); return m; }
function legend(y, maxAbs, txt) {
  return (txt ? `<text x="8" y="${fx(y + 10)}" class="t2" style="font-size:11.5px">${txt}</text>` : '') + `<g transform="translate(${W - 238},${y})"><rect x="0" y="0" width="22" height="12" class="wzs" style="fill-opacity:.65"/><text x="27" y="10" class="t2" style="font-size:11px">ssanie</text><rect x="80" y="0" width="22" height="12" class="wzp" style="fill-opacity:.65"/><text x="107" y="10" class="t2" style="font-size:11px">parcie</text><text x="158" y="10" class="t2" style="font-size:11px">w<tspan dy="3" font-size="8">net</tspan><tspan dy="-3"> [kN/m²]</tspan></text></g>`;
}

/* =====================================================================
   BUDYNKI: ściany, dachy płaskie, jedno-, dwu- i czterospadowe
   ===================================================================== */
function zbox(id, key, rows, x, y, w, h, sel, maxAbs, clip) {
  if (w < 0.4 || h < 0.4) return '';
  const row = rows[key];
  const on = sel === key ? ' wzsel' : '';
  return `<g data-wz="${esc(id)}|${esc(key)}" class="wzg${on}"${clip ? ` clip-path="url(#${clip})"` : ''}><rect x="${fx(x)}" y="${fx(y)}" width="${fx(w)}" height="${fx(h)}" ${zoneFill(row, maxAbs)}/>${zoneLabel(x + w / 2, y + h / 2, w, h, row, key)}<title>${esc(key)}: ${row ? Fs(row.max.w, 3) + ' / ' + Fs(row.min.w, 3) + ' kN/m²' : ''}</title></g>`;
}
function bld(id, shape, r, D, sel, opt) {
  opt = opt || {};
  const rows = rowsMap(D.rows), maxAbs = maxAbsOf(D.rows);
  const b = D.b, d = D.d, e = D.e, h = r.h;
  const e10 = Math.min(e / 10, d), e4 = Math.min(e / 4, b / 2), e2 = Math.min(e / 2, d);
  const sfx = (shape === 'walls' || shape === 'flat') ? (D.th === '0' ? '' : '₉₀') : (D.th === '0' ? '₀' : D.th === '90' ? '₉₀' : '₁₈₀');
  const K = z => z + sfx;
  const walls = shape === 'walls';
  const vert = b > d * 1.15;                 // wiatr z góry – rzut szerszy niż wyższy
  const T = walls ? 18 : 0;                  // grubość pasów stref ścian
  const mL = vert ? 104 : 96, mR = vert ? 104 : 136, mT = vert ? 92 : 64;
  const availW = W - mL - mR;
  const Wpl = vert ? b : d, Hpl = vert ? d : b;
  const sc = Math.min(availW / Wpl, (walls ? 300 : 380) / Hpl);
  const x0 = mL + (availW - Wpl * sc) / 2, y0 = mT;
  const pw = Wpl * sc, ph = Hpl * sc;
  const P = (u, v) => vert ? [x0 + v * sc, y0 + u * sc] : [x0 + u * sc, y0 + v * sc];
  const rectUV = (u0, u1, v0, v1) => { const [a1, b1] = P(u0, v0), [a2, b2] = P(u1, v1); return [Math.min(a1, a2), Math.min(b1, b2), Math.abs(a2 - a1), Math.abs(b2 - b1)]; };
  const zr = (key, u0, u1, v0, v1, clip) => { const [x, y, w, hh] = rectUV(u0, u1, v0, v1); return zbox(id, key, rows, x, y, w, hh, sel, maxAbs, clip); };
  const U = m => vert ? y0 + m * sc : x0 + m * sc;   // współrzędna ekranowa wzdłuż wiatru
  const V = m => vert ? x0 + m * sc : y0 + m * sc;   // w poprzek wiatru
  let s = '', defs = '';
  /* strzałki wiatru */
  if (vert) {
    const ax = [0.2, 0.5, 0.8].map(f => x0 + pw * f);
    s += ax.map(x => SVG.arrow(x, 30, x, y0 - T - 12)).join('');
    s += `<text x="8" y="20" class="wlab">wiatr θ = ${D.th}°</text>`;
  } else s += windArrows(8, x0 - T - 12, [0.25, 0.5, 0.75].map(f => y0 + ph * f), 'wiatr θ = ' + D.th + '°');
  const capt = `b = ${F(b, 2)} m · d = ${F(d, 2)} m · e = min(b; 2h) = ${F(e, 2)} m`;
  s += `<rect x="${fx(x0)}" y="${fx(y0)}" width="${fx(pw)}" height="${fx(ph)}" class="bldp"/>`;
  /* łańcuchy wymiarowe: U – wzdłuż wiatru, V – w poprzek */
  const chainU = [], chainV = [0, b];
  const edgeU = (u, txt) => { const inw = u <= 0 ? 13 : -6; if (vert) return `<text x="${fx(x0 + pw / 2)}" y="${fx(U(u) + inw + (u <= 0 ? 0 : 0))}" text-anchor="middle" class="elab">${txt}</text>`; const x = U(u) + (u <= 0 ? 13 : -6); return `<text transform="translate(${fx(x)},${fx(y0 + ph / 2)}) rotate(-90)" text-anchor="middle" class="elab">${txt}</text>`; };
  const edgeV = (v, txt) => { if (vert) { const x = V(v) + (v <= 0 ? 13 : -6); return `<text transform="translate(${fx(x)},${fx(y0 + ph / 2)}) rotate(-90)" text-anchor="middle" class="elab">${txt}</text>`; } return `<text x="${fx(x0 + pw / 2)}" y="${fx(V(v) + (v <= 0 ? 13 : -6))}" text-anchor="middle" class="elab">${txt}</text>`; };
  const ridgeU = u => { const [xa, ya] = P(u, 0), [xb, yb] = P(u, b); return `<line class="ridge" x1="${fx(xa - (vert ? 10 : 0))}" y1="${fx(ya - (vert ? 0 : 10))}" x2="${fx(xb + (vert ? 10 : 0))}" y2="${fx(yb + (vert ? 0 : 10))}"/>`; };
  const ridgeV = v => { const [xa, ya] = P(0, v), [xb, yb] = P(d, v); return `<line class="ridge" x1="${fx(xa - (vert ? 0 : 10))}" y1="${fx(ya - (vert ? 10 : 0))}" x2="${fx(xb + (vert ? 0 : 10))}" y2="${fx(yb + (vert ? 10 : 0))}"/>`; };
  if (walls) {
    s += `<text x="${fx(x0 + pw / 2)}" y="${fx(y0 + ph / 2 + 4)}" text-anchor="middle" class="t2">rzut budynku</text>`;
    const band = (key, x, y, w, hh) => zbox(id, key, rows, x, y, w, hh, sel, maxAbs);
    s += vert ? band(K('D'), x0, y0 - T, pw, T) + band(K('E'), x0, y0 + ph, pw, T) : band(K('D'), x0 - T, y0, T, ph) + band(K('E'), x0 + pw, y0, T, ph);
    let ua = 0;
    D.zl.forEach(([z, l]) => {
      const a = U(ua), len = l * sc;
      s += vert ? band(K(z), x0 - T, a, T, len) + band(K(z), x0 + pw, a, T, len) : band(K(z), a, y0 - T, len, T) + band(K(z), a, y0 + ph, len, T);
      ua += l; chainU.push(ua);
    });
    chainU.unshift(0);
  } else if (shape === 'flat') {
    s += zr(K('F'), 0, e10, 0, e4) + zr(K('F'), 0, e10, b - e4, b) + zr(K('G'), 0, e10, e4, b - e4) + zr(K('H'), e10, e2, 0, b);
    if (d > e / 2) s += zr(K('I'), e2, d, 0, b);
    chainU.push(0, e10, e2, d); chainV.push(e4, b - e4);
  } else if (shape === 'mono' && D.th !== '90') {
    s += zr(K('F'), 0, e10, 0, e4) + zr(K('F'), 0, e10, b - e4, b) + zr(K('G'), 0, e10, e4, b - e4) + zr(K('H'), e10, d, 0, b);
    chainU.push(0, e10, d); chainV.push(e4, b - e4);
    const low = D.th === '0';
    s += edgeU(0, low ? 'krawędź niższa' : 'krawędź wyższa') + edgeU(d, low ? 'krawędź wyższa' : 'krawędź niższa');
  } else if (shape === 'mono') {
    s += zr(K('Fup'), 0, e10, 0, e4) + zr(K('Flow'), 0, e10, b - e4, b) + zr(K('G'), 0, e10, e4, b - e4) + zr(K('H'), e10, e2, 0, b);
    if (d > e / 2) s += zr(K('I'), e2, d, 0, b);
    chainU.push(0, e10, e2, d); chainV.push(e4, b - e4);
    s += edgeV(0, 'krawędź wyższa') + edgeV(b, 'krawędź niższa');
  } else if (shape === 'duo' && D.th === '0') {
    const ur = d / 2, er = Math.min(e / 10, d / 2);
    s += zr(K('F'), 0, er, 0, e4) + zr(K('F'), 0, er, b - e4, b) + zr(K('G'), 0, er, e4, b - e4) + zr(K('H'), er, ur, 0, b) + zr(K('J'), ur, ur + er, 0, b) + zr(K('I'), ur + er, d, 0, b);
    s += ridgeU(ur);
    chainU.push(0, er, ur, ur + er, d); chainV.push(e4, b - e4);
  } else if (shape === 'duo') {
    s += zr(K('F'), 0, e10, 0, e4) + zr(K('F'), 0, e10, b - e4, b) + zr(K('G'), 0, e10, e4, b - e4) + zr(K('H'), e10, e2, 0, b);
    if (d > e / 2) s += zr(K('I'), e2, d, 0, b);
    s += ridgeV(b / 2);
    chainU.push(0, e10, e2, d); chainV.push(e4, b - e4);
  } else if (shape === 'hip') {
    const ext = (r.B / 2) * Math.tan(rad(r.alpha)) / Math.max(Math.tan(rad(r.alpha90)), 1e-6); // zasięg połaci szczytowej wzdłuż L
    let Lw, Lee, Sd1, Sd2, ur1, depth, uLine;
    if (D.th === '0') { const vh = Math.min(ext, b / 2); Lw = [[0, 0], [0, b], [d / 2, b - vh], [d / 2, vh]]; Lee = [[d, 0], [d, b], [d / 2, b - vh], [d / 2, vh]]; Sd1 = [[0, 0], [d, 0], [d / 2, vh]]; Sd2 = [[0, b], [d, b], [d / 2, b - vh]]; ur1 = d / 2; depth = vh; uLine = d / 4; }
    else { const uh = Math.min(ext, d / 2); Lw = [[0, 0], [0, b], [uh, b / 2]]; Lee = [[d, 0], [d, b], [d - uh, b / 2]]; Sd1 = [[0, 0], [d, 0], [d - uh, b / 2], [uh, b / 2]]; Sd2 = [[0, b], [d, b], [d - uh, b / 2], [uh, b / 2]]; ur1 = d - uh; depth = b / 2; uLine = uh / 2; }
    const PP = poly => poly.map(([u, v]) => P(u, v));
    const path = poly => 'M' + PP(poly).map(p => fx(p[0]) + ' ' + fx(p[1])).join('L') + 'Z';
    const cw = 'cw' + id + D.th, cl = 'cl' + id + D.th;
    defs += `<clipPath id="${cw}"><path d="${path(Lw)}"/></clipPath><clipPath id="${cl}"><path d="${path(Lee)}"/></clipPath>`;
    s += zpoly(id, K('N'), rows, PP(Sd1), sel, maxAbs) + zpoly(id, K('N'), rows, PP(Sd2), sel, maxAbs);
    s += zr(K('F'), 0, e10, 0, e4, cw) + zr(K('F'), 0, e10, b - e4, b, cw) + zr(K('G'), 0, e10, e4, b - e4, cw) + zr(K('H'), e10, d, 0, b, cw);
    s += zr(K('J'), ur1, ur1 + e10, 0, b, cl) + zr(K('I'), ur1 + e10, d, 0, b, cl);
    s += `<path class="ridge" d="${path(Lw)}"/><path class="ridge" d="${path(Lee)}"/>`;
    [['M', Math.max(0.22 * d, e10 + 0.06 * d), 0.3], ['L', uLine + 0.05 * d, 0.6], ['K', 0.86 * d, 0.3], ['N', 0.6 * d, 0.62]].forEach(([z, uu, fv]) => {
      const vv = depth * fv;
      const [ax, ay] = P(uu, vv), [bx, by] = P(uu, b - vv);
      s += badge(id, K(z), rows, ax, ay, sel, maxAbs) + badge(id, K(z), rows, bx, by, sel, maxAbs);
    });
    chainU.push(0, e10, d); chainV.push(e4, b - e4);
  }
  /* wymiary rzutu */
  const tU = walls ? T : 0;
  if (vert) {
    s += chainV_(chainU, U, x0 - tU - 16, true);
    s += chainH(chainV, V, y0 + ph + tU + 18, false);
    s += dimH(V(0), V(b), y0 + ph + tU + 46, 'b = ' + F(b, 2) + ' m', false);
    s += dimV(x0 + pw + tU + 18, U(0), U(d), 'd = ' + F(d, 2) + ' m', false, true);
  } else {
    s += chainH(chainU, U, y0 - tU - 14);
    s += chainV_(chainV, V, x0 + pw + tU + 16, false);
    s += dimH(U(0), U(d), y0 + ph + tU + 26, 'd = ' + F(d, 2) + ' m', false);
    s += dimV(x0 + pw + tU + 74, V(0), V(b), 'b = ' + F(b, 2) + ' m', false, true);
  }
  let yy = y0 + ph + tU + (vert ? 92 : 70);
  if (shape === 'hip') { s += `<text x="${fx(mL)}" y="${fx(yy - 6)}" class="t2" style="font-size:11.5px">strefy K, L, M, N na połaciach bocznych zaznaczono poglądowo (rys. 7.9)</text>`; yy += 26; }
  if (walls) {
    /* elewacja ściany bocznej (wiatr z lewej) */
    const se = Math.min(availW / d, 130 / Math.max(h, 0.1)), xs = mL + (availW - d * se) / 2, hh = h * se;
    s += `<text x="${fx(xs)}" y="${fx(yy - 10)}" class="sec">Ściana boczna – strefy A, B, C (wiatr z lewej)</text>`;
    let ua = 0;
    D.zl.forEach(([z, l]) => { s += zbox(id, K(z), rows, xs + ua * se, yy, l * se, hh, sel, maxAbs); ua += l; });
    s += windArrows(8, xs - 26, [yy + hh * 0.35, yy + hh * 0.7]);
    s += `<line class="gnd" x1="${fx(xs - 10)}" y1="${fx(yy + hh)}" x2="${fx(xs + d * se + 10)}" y2="${fx(yy + hh)}"/>`;
    s += dimV(xs + d * se + 16, yy, yy + hh, 'h = ' + F(h, 2) + ' m', false);
    s += chainH([0].concat(D.zl.reduce((acc, [, l]) => acc.concat((acc.length ? acc[acc.length - 1] : 0) + l), [])), m => xs + m * se, yy + hh + 18, false);
    yy += hh + 66;
    /* elewacja ściany nawietrznej D */
    const sw = Math.min(availW / b, 150 / Math.max(h, 0.1)), xw = mL + (availW - b * sw) / 2, hw = h * sw;
    const prof = D.profile || [];
    s += `<text x="${fx(xw)}" y="${fx(yy - 10)}" class="sec">Ściana nawietrzna D – widok od strony wiatru${prof.length > 1 ? ' (pasy wysokości odniesienia wg rys. 7.4)' : ''}</text>`;
    prof.forEach(p => {
      const ya = yy + hw - p.z1 * sw, yb = yy + hw - p.z0 * sw;
      const on = sel === K('D') ? ' wzsel' : '';
      s += `<g data-wz="${esc(id)}|${esc(K('D'))}" class="wzg${on}"><rect x="${fx(xw)}" y="${fx(ya)}" width="${fx(b * sw)}" height="${fx(yb - ya)}" ${zoneFill({ min: { w: p.wD }, max: { w: p.wD } }, maxAbs)}/>${yb - ya > 30 ? `<text x="${fx(xw + b * sw / 2)}" y="${fx((ya + yb) / 2 - 3)}" text-anchor="middle" class="zl" style="font-size:13px">D · z<tspan dy="3" font-size="9">e</tspan><tspan dy="-3"> = ${F(p.ze, 1)} m</tspan></text><text x="${fx(xw + b * sw / 2)}" y="${fx((ya + yb) / 2 + 13)}" text-anchor="middle" class="zv">w<tspan dy="3" font-size="8">e</tspan><tspan dy="-3"> = ${Fs(p.wD, 2)} kN/m²</tspan></text>` : ''}<title>D: z_e = ${F(p.ze, 2)} m, q_p = ${F(p.qp, 3)} kN/m²</title></g>`;
    });
    s += `<line class="gnd" x1="${fx(xw - 10)}" y1="${fx(yy + hw)}" x2="${fx(xw + b * sw + 10)}" y2="${fx(yy + hw)}"/>`;
    s += dimH(xw, xw + b * sw, yy + hw + 18, 'b = ' + F(b, 2) + ' m', false);
    s += chainV_(prof.map(p => p.z0).concat([h]).map(z => h - z), m => yy + m * sw, xw + b * sw + 16, false);
    yy += hw + 40;
    s += legend(yy - 6, maxAbs, capt);
    return wrap(s, defs, yy + 14, opt);
  }
  /* ---------- przekrój wzdłuż kierunku wiatru ---------- */
  const ss = Math.min(availW / d, 120 / Math.max(h, 0.1)), xs = mL + (availW - d * ss) / 2;
  const yT = yy; yy += 26;
  const base = yy + h * ss;
  const Xs = u => xs + u * ss, Ys = z => base - z * ss;
  let sec = '', title = 'Przekrój wzdłuż kierunku wiatru';
  const a = r.alpha || 0, t = Math.tan(rad(Math.abs(a)));
  if (shape === 'flat') {
    const hp = r.hp || 0;
    sec += `<path class="bldp" d="M${fx(Xs(0))} ${fx(Ys(0))}V${fx(Ys(h))}H${fx(Xs(d))}V${fx(Ys(0))}Z"/>`;
    if (hp > 0) sec += `<path class="bldp" d="M${fx(Xs(0))} ${fx(Ys(h))}v${fx(-hp * ss)}h5V${fx(Ys(h))}ZM${fx(Xs(d))} ${fx(Ys(h))}v${fx(-hp * ss)}h-5V${fx(Ys(h))}Z"/><text x="${fx(Xs(0) + 8)}" y="${fx(Ys(h + hp) + 4)}" class="t2" style="font-size:11px">attyka h<tspan dy="3" font-size="8">p</tspan><tspan dy="-3"> = ${F(hp, 2)} m</tspan></text>`;
  } else if (shape === 'mono' && D.th !== '90') {
    const hl = Math.max(h - d * t, 0.3 * h), low = D.th === '0';
    const hL = low ? hl : h, hR = low ? h : hl;
    sec += `<path class="bldp" d="M${fx(Xs(0))} ${fx(Ys(0))}V${fx(Ys(hL))}L${fx(Xs(d))} ${fx(Ys(hR))}V${fx(Ys(0))}Z"/><text x="${fx(Xs(d / 2))}" y="${fx(Ys((hL + hR) / 2) - 8)}" text-anchor="middle" class="t2">α = ${F(a, 1)}°</text>`;
  } else if (shape === 'duo' && D.th === '0') {
    const dz = Math.min((d / 2) * t, 0.7 * h);
    const eav = a >= 0 ? h - dz : h, mid = a >= 0 ? h : h - dz;
    sec += `<path class="bldp" d="M${fx(Xs(0))} ${fx(Ys(0))}V${fx(Ys(eav))}L${fx(Xs(d / 2))} ${fx(Ys(mid))}L${fx(Xs(d))} ${fx(Ys(eav))}V${fx(Ys(0))}Z"/><text x="${fx(Xs(d / 4))}" y="${fx(Ys(Math.max(eav, mid)) - 8)}" text-anchor="middle" class="t2">α = ${F(a, 1)}°</text>`;
  } else if (shape === 'hip' && D.th === '0') {
    const he = Math.max(h - (d / 2) * Math.tan(rad(r.alpha)), 0.3 * h);
    sec += `<path class="bldp" d="M${fx(Xs(0))} ${fx(Ys(0))}V${fx(Ys(he))}L${fx(Xs(d / 2))} ${fx(Ys(h))}L${fx(Xs(d))} ${fx(Ys(he))}V${fx(Ys(0))}Z"/><text x="${fx(Xs(d / 4))}" y="${fx(Ys(he) - 10)}" class="t2">α₀ = ${F(r.alpha, 1)}°</text>`;
  } else {
    const eave = shape === 'hip' ? Math.max(h - (r.B / 2) * Math.tan(rad(r.alpha)), 0.3 * h) : shape === 'duo' ? Math.max(h - (r.B / 2) * t, 0.3 * h) : Math.max(h - r.B * t, 0.3 * h);
    if (shape === 'hip') {
      const ext = Math.min((r.B / 2) * Math.tan(rad(r.alpha)) / Math.max(Math.tan(rad(r.alpha90)), 1e-6), d / 2);
      sec += `<path class="bldp" d="M${fx(Xs(0))} ${fx(Ys(0))}V${fx(Ys(eave))}L${fx(Xs(ext))} ${fx(Ys(h))}H${fx(Xs(d - ext))}L${fx(Xs(d))} ${fx(Ys(eave))}V${fx(Ys(0))}Z"/><text x="${fx(Xs(0) + 6)}" y="${fx(Ys(eave) - 10)}" class="t2">α₉₀ = ${F(r.alpha90, 1)}°</text>`;
    } else sec += `<path class="bldp" d="M${fx(Xs(0))} ${fx(Ys(0))}V${fx(Ys(h))}H${fx(Xs(d))}V${fx(Ys(0))}Z"/><line class="ridge" x1="${fx(Xs(0))}" y1="${fx(Ys(eave))}" x2="${fx(Xs(d))}" y2="${fx(Ys(eave))}"/><text x="${fx(Xs(0) + 6)}" y="${fx(Ys(eave) + 15)}" class="t2" style="font-size:11px">okap${shape === 'mono' ? ' niższy' : ''}</text><text x="${fx(Xs(0) + 6)}" y="${fx(Ys(h) - 5)}" class="t2" style="font-size:11px">${shape === 'duo' ? 'kalenica' : 'krawędź wyższa'}</text>`;
    title = 'Widok z boku – wiatr wzdłuż ' + (shape === 'mono' ? 'krawędzi' : 'kalenicy');
  }
  s += `<text x="${fx(xs)}" y="${fx(yT - 12)}" class="sec">${title}</text>` + sec;
  s += windArrows(8, xs - 26, [Ys(h * 0.3), Ys(h * 0.7)]);
  s += `<line class="gnd" x1="${fx(xs - 14)}" y1="${fx(base)}" x2="${fx(xs + d * ss + 14)}" y2="${fx(base)}"/>`;
  s += dimV(xs + d * ss + 18, Ys(h), Ys(0), 'h = ' + F(h, 2) + ' m', false);
  s += dimH(xs, xs + d * ss, base + 18, 'd = ' + F(d, 2) + ' m', false);
  yy = base + 46;
  s += legend(yy - 6, maxAbs, capt);
  return wrap(s, defs, yy + 14, opt);
}
function wrap(s, defs, H, opt) {
  return `<svg class="wsvg" viewBox="0 0 ${W} ${Math.ceil(H)}" role="img" aria-label="Schemat stref wiatru"${opt.attr ? ' ' + opt.attr : ''}>${defs ? `<defs>${defs}</defs>` : ''}${s}</svg>`;
}

/* =====================================================================
   WIATY – rzut ze strefami A, B, C (D) i przekrój
   ===================================================================== */
function canopy(id, r, rows0, sel, duo) {
  const rows = rowsMap(rows0), maxAbs = maxAbsOf(rows0);
  const b = r.b, d = r.d, h = r.h, a = r.alpha || 0;
  const vert = b > d * 1.15;
  const mL = vert ? 104 : 96, mR = vert ? 104 : 136, y0 = vert ? 92 : 64;
  const availW = W - mL - mR, Wpl = vert ? b : d, Hpl = vert ? d : b;
  const sc = Math.min(availW / Wpl, 320 / Hpl);
  const x0 = mL + (availW - Wpl * sc) / 2, pw = Wpl * sc, ph = Hpl * sc;
  const P = (u, v) => vert ? [x0 + v * sc, y0 + u * sc] : [x0 + u * sc, y0 + v * sc];
  const U = m => vert ? y0 + m * sc : x0 + m * sc, V = m => vert ? x0 + m * sc : y0 + m * sc;
  const zr = (key, u0, u1, v0, v1) => { const [a1, b1] = P(u0, v0), [a2, b2] = P(u1, v1); return zbox(id, key, rows, Math.min(a1, a2), Math.min(b1, b2), Math.abs(a2 - a1), Math.abs(b2 - b1), sel, maxAbs); };
  const d10 = d / 10, b10 = b / 10;
  let s = `<rect x="${fx(x0)}" y="${fx(y0)}" width="${fx(pw)}" height="${fx(ph)}" class="bldp"/>`;
  if (vert) { s += [0.2, 0.5, 0.8].map(f => SVG.arrow(x0 + pw * f, 30, x0 + pw * f, y0 - 12)).join('') + `<text x="8" y="20" class="wlab">wiatr</text>`; }
  else s += windArrows(8, x0 - 12, [0.25, 0.5, 0.75].map(f => y0 + ph * f), 'wiatr');
  if (duo) { s += zr('A', d10, d / 2 - d10 / 2, b10, b - b10) + zr('A', d / 2 + d10 / 2, d - d10, b10, b - b10) + zr('D', d / 2 - d10 / 2, d / 2 + d10 / 2, b10, b - b10); }
  else s += zr('A', d10, d - d10, b10, b - b10);
  s += zr('B', 0, d10, 0, b) + zr('B', d - d10, d, 0, b);
  s += zr('C', d10, d - d10, 0, b10) + zr('C', d10, d - d10, b - b10, b);
  if (duo) { const [xa, ya] = P(d / 2, 0), [xb, yb] = P(d / 2, b); s += `<line class="ridge" x1="${fx(xa)}" y1="${fx(ya)}" x2="${fx(xb)}" y2="${fx(yb)}"/>`; }
  const cu = [0, d10, d - d10, d].concat(duo ? [d / 2 - d10 / 2, d / 2 + d10 / 2] : []), cv = [0, b10, b - b10, b];
  if (vert) {
    s += chainV_(cu, U, x0 - 16, true) + chainH(cv, V, y0 + ph + 18, false);
    s += dimH(V(0), V(b), y0 + ph + 46, 'b = ' + F(b, 2) + ' m', false) + dimV(x0 + pw + 18, U(0), U(d), 'd = ' + F(d, 2) + ' m', false, true);
  } else {
    s += chainH(cu, U, y0 - 14) + chainV_(cv, V, x0 + pw + 16, false);
    s += dimH(U(0), U(d), y0 + ph + 26, 'd = ' + F(d, 2) + ' m', false) + dimV(x0 + pw + 74, V(0), V(b), 'b = ' + F(b, 2) + ' m', false, true);
  }
  let yy = y0 + ph + (vert ? 92 : 70);
  const ss = Math.min(availW / d, 100 / Math.max(h, 0.1)), xs = mL + (availW - d * ss) / 2, base = yy + 24 + h * ss, t = Math.tan(rad(Math.abs(a)));
  const Xs = u => xs + u * ss, Ys = z => base - z * ss;
  const top = h * 0.85;
  let sec = `<line class="roof" x1="${fx(Xs(d * 0.06))}" y1="${fx(Ys(0))}" x2="${fx(Xs(d * 0.06))}" y2="${fx(Ys(top))}"/><line class="roof" x1="${fx(Xs(d * 0.94))}" y1="${fx(Ys(0))}" x2="${fx(Xs(d * 0.94))}" y2="${fx(Ys(top))}"/>`;
  if (duo) { const dz = Math.min((d / 2) * t, 0.5 * h) * (a >= 0 ? 1 : -1); sec += `<path class="roof" d="M${fx(Xs(0))} ${fx(Ys(top))}L${fx(Xs(d / 2))} ${fx(Ys(top + dz))}L${fx(Xs(d))} ${fx(Ys(top))}"/>`; }
  else sec += `<path class="roof" d="M${fx(Xs(0))} ${fx(Ys(top))}L${fx(Xs(d))} ${fx(Ys(top + Math.min(d * t, 0.6 * h)))}"/>`;
  s += `<text x="${fx(xs)}" y="${fx(yy - 12)}" class="sec">Przekrój – α = ${F(a, 1)}°, h = ${F(h, 2)} m</text>` + sec + `<line class="gnd" x1="${fx(xs - 14)}" y1="${fx(base)}" x2="${fx(xs + d * ss + 14)}" y2="${fx(base)}"/>` + windArrows(8, xs - 22, [Ys(h * 0.5)]) + dimV(xs + d * ss + 18, Ys(h), Ys(0), 'h = ' + F(h, 2) + ' m', false);
  yy = base + 34;
  s += `<text x="8" y="${fx(yy - 18)}" class="t2" style="font-size:11.5px">układ stref A–${duo ? 'D' : 'C'} wg rysunku w tabl. ${duo ? '7.7' : '7.6'} PN-EN 1991-1-4 (poglądowo)</text>` + legend(yy, maxAbs, 'b = ' + F(b, 2) + ' m · d = ' + F(d, 2) + ' m');
  return wrap(s, '', yy + 20, {});
}
/* =====================================================================
   ŚCIANA WOLNOSTOJĄCA / ATTYKA – elewacja ze strefami A–D
   ===================================================================== */
function fwall(id, r, c, sel) {
  const rows0 = r.zones || [], rows = rowsMap(rows0), maxAbs = maxAbsOf(rows0);
  const h = Math.max(EC.num(c.h, 1), 0.01), l = Math.max(EC.num(c.l, 10), 0.01);
  const Ls = Math.min(l, 6 * h);
  const mL = 70, mR = 40, y0 = 52;
  const sc = Math.min((W - mL - mR) / Ls, 170 / h);
  const x0 = mL, X = m => x0 + m * sc, Y = m => y0 + (h - m) * sc;
  let s = '';
  r.zones.forEach(z => {
    const m = /([\d,]+)–([\d,]+)/.exec(z.dim);
    const a0 = m ? +m[1].replace(',', '.') : 0, a1 = m ? +m[2].replace(',', '.') : Ls;
    s += zrect(id, z.z, rows, X, mm => Y(h - mm), Math.min(a0, Ls), Math.min(a1, Ls), 0, h, sel, maxAbs);
  });
  if (l > Ls) s += `<text x="${fx(X(Ls) + 6)}" y="${fx(Y(h / 2))}" class="t2">… (l = ${F(l, 2)} m)</text>`;
  s += `<line class="gnd" x1="${fx(x0 - 10)}" y1="${fx(Y(0))}" x2="${fx(X(Ls) + 10)}" y2="${fx(Y(0))}"/>`;
  s += chainH([0, 0.3 * h, 2 * h, 4 * h].filter(v => v <= Ls).concat([Ls]), X, Y(0) + 18, false);
  s += dimV(x0 - 14, Y(h), Y(0), 'h = ' + F(h, 2));
  s += `<text x="${fx(x0)}" y="${fx(y0 - 16)}" class="sec">${c.mode === 'par' ? 'Attyka' : 'Ściana wolnostojąca'} – strefy od swobodnego końca (rys. 7.19)</text>`;
  const yy = Y(0) + 54;
  s += legend(yy - 12, maxAbs);
  return wrap(s, '', yy + 8, {});
}
SVG.wind = { bld, canopy, fwall, govVal };
})(typeof window !== 'undefined' ? window : globalThis);
