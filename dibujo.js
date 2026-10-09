/* ============================================================================
   dibujo.js
   Genera el SVG de una cara del pliego a escala real (en milímetros).
   Recibe el resultado de PliegosEngine.planificar() y devuelve una cadena SVG.
   ========================================================================== */
(function (global) {
  'use strict';

  const r2 = function (n) { return Math.round(n * 100) / 100; };

  function rectEl(rc, attrs) {
    return '<rect x="' + r2(rc.x) + '" y="' + r2(rc.y) + '" width="' + r2(rc.w) + '" height="' + r2(rc.h) + '" ' + (attrs || '') + '/>';
  }

  function svgPliego(plan) {
    const e = plan.entrada;
    const geo = plan.geo;
    const enc = plan.principal.encaje;
    const W = e.pliegoAncho;
    const H = e.pliegoAlto;
    const dim = Math.max(W, H);
    const pad = dim * 0.07;
    const fs = dim * 0.024;
    const sw = dim * 0.0016;
    const M = e.marcas;
    const B = e.sangrado;
    const pw = e.paginaAncho;
    const ph = e.paginaAlto;
    const rot = geo.ejeFibra === 'x'; // las páginas quedan giradas 90° dentro del pliego

    // Los bloques se colocan centrados en la zona útil
    const spanW = enc.nAncho * enc.marcoW;
    const spanH = enc.nAlto * enc.marcoH;
    const spanX = rot ? spanH : spanW;
    const spanY = rot ? spanW : spanH;
    const X0 = geo.region.x + (geo.region.w - spanX) / 2;
    const Y0 = geo.region.y + (geo.region.h - spanY) / 2;
    // (bx, by) están en el sistema de la página: bx = ancho, by = alto (a lo largo del lomo)
    const R = function (bx, by, bw, bh) {
      return rot ? { x: X0 + by, y: Y0 + bx, w: bh, h: bw } : { x: X0 + bx, y: Y0 + by, w: bw, h: bh };
    };
    const P = function (bx, by) {
      return rot ? { x: X0 + by, y: Y0 + bx } : { x: X0 + bx, y: Y0 + by };
    };
    const linea = function (bx1, by1, bx2, by2, attrs) {
      const a = P(bx1, by1);
      const b = P(bx2, by2);
      return '<line x1="' + r2(a.x) + '" y1="' + r2(a.y) + '" x2="' + r2(b.x) + '" y2="' + r2(b.y) + '" ' + attrs + '/>';
    };

    const o = [];
    const resumen = 'Cara del pliego de ' + W + ' por ' + H + ' mm con ' + enc.n * enc.cols * enc.rows +
      ' páginas colocadas (' + enc.cols + ' columnas por ' + enc.rows + ' filas' + (enc.n > 1 ? ', ' + enc.n + ' repeticiones' : '') + ')';
    o.push('<svg xmlns="http://www.w3.org/2000/svg" class="pliego-svg" viewBox="' + r2(-pad) + ' ' + r2(-pad) + ' ' + r2(W + 2 * pad) + ' ' + r2(H + 2 * pad) +
      '" role="img" aria-label="' + resumen + '" font-family="\'Space Mono\', monospace">');
    const hach = dim * 0.012;
    o.push('<defs><pattern id="hachado" width="' + r2(hach) + '" height="' + r2(hach) + '" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
      '<rect width="' + r2(hach) + '" height="' + r2(hach) + '" fill="#e6e6e6"/><line x1="0" y1="0" x2="0" y2="' + r2(hach) + '" stroke="#777" stroke-width="' + r2(hach * 0.35) + '"/></pattern></defs>');

    // Pliego
    o.push(rectEl({ x: 0, y: 0, w: W, h: H }, 'fill="#fff" stroke="#999" stroke-width="' + r2(sw) + '"'));
    // Zona útil
    o.push(rectEl(geo.region, 'fill="none" stroke="#c9c9c9" stroke-width="' + r2(sw) + '" stroke-dasharray="' + r2(sw * 4) + ' ' + r2(sw * 3) + '"'));
    // Pinza
    o.push(rectEl(geo.pinza, 'fill="url(#hachado)" stroke="#777" stroke-width="' + r2(sw * 0.6) + '"'));
    // Tira de control (parches)
    if (e.tira > 0) {
      const tonos = ['#222', '#8a8a8a', '#555', '#bdbdbd'];
      const horizontal = geo.ejeCil === 'x';
      const ini = e.seguridad;
      const fin = (horizontal ? W : H) - e.seguridad;
      let i = 0;
      for (let t = ini; t < fin - 1e-6; t += e.tira, i++) {
        const largo = Math.min(e.tira, fin - t);
        const rc = horizontal ? { x: t, y: geo.tira.y, w: largo, h: geo.tira.h } : { x: geo.tira.x, y: t, w: geo.tira.w, h: largo };
        o.push(rectEl(rc, 'fill="' + tonos[i % tonos.length] + '"'));
      }
    }

    // Colocación de las páginas
    const gapEntre = function (i) { return i % 2 === 1 ? enc.bloque.gapLomo : enc.bloque.gapRefile; };
    const xCol = [];
    let acc = 0;
    for (let c = 0; c < enc.cols; c++) {
      if (c > 0) acc += gapEntre(c);
      xCol.push(B + c * pw + acc);
    }
    const bw = enc.bloque.w;
    const bh = enc.bloque.h;
    const marca = 'stroke="#000" stroke-width="' + r2(sw * 0.8) + '" fill="none"';
    const L = M * 0.9;

    for (let iw = 0; iw < enc.nAncho; iw++) {
      for (let ih = 0; ih < enc.nAlto; ih++) {
        const bx0 = iw * enc.marcoW;
        const by0 = ih * enc.marcoH;
        // Espacio para marcas
        o.push(rectEl(R(bx0, by0, enc.marcoW, enc.marcoH), 'fill="#f3f3f3" stroke="#bdbdbd" stroke-width="' + r2(sw * 0.6) + '"'));
        // Bloque con sangrado y separaciones
        o.push(rectEl(R(bx0 + M, by0 + M, bw, bh), 'fill="#c8c8c8"'));
        // Páginas
        for (let rr = 0; rr < enc.rows; rr++) {
          for (let c = 0; c < enc.cols; c++) {
            o.push(rectEl(R(bx0 + M + xCol[c], by0 + M + B + rr * (ph + 2 * B), pw, ph), 'fill="#161616"'));
          }
        }
        // Líneas de plegado: lomo (blanca continua) y cabeza, pie y canal (discontinua)
        for (let i = 1; i < enc.cols; i++) {
          const x = bx0 + M + xCol[i - 1] + pw + gapEntre(i) / 2;
          const lomo = i % 2 === 1;
          o.push(linea(x, by0 + M, x, by0 + M + bh, lomo
            ? 'stroke="#fff" stroke-width="' + r2(sw * 1.2) + '"'
            : 'stroke="#444" stroke-width="' + r2(sw) + '" stroke-dasharray="' + r2(sw * 4) + ' ' + r2(sw * 3) + '"'));
        }
        for (let j = 1; j < enc.rows; j++) {
          const y = by0 + M + j * (ph + 2 * B);
          o.push(linea(bx0 + M, y, bx0 + M + bw, y, 'stroke="#444" stroke-width="' + r2(sw) + '" stroke-dasharray="' + r2(sw * 4) + ' ' + r2(sw * 3) + '"'));
        }
        // Marcas de corte en las cuatro esquinas del bloque
        if (M > 0) {
          const x1 = bx0 + M, x2 = bx0 + M + bw, y1 = by0 + M, y2 = by0 + M + bh;
          [[x1, y1, -1, -1], [x2, y1, 1, -1], [x1, y2, -1, 1], [x2, y2, 1, 1]].forEach(function (c) {
            o.push(linea(c[0], c[1], c[0] + c[2] * L, c[1], marca));
            o.push(linea(c[0], c[1], c[0], c[1] + c[3] * L, marca));
          });
          // Marcas de registro en el centro de cada lado
          const rad = M * 0.28;
          const cruz = M * 0.42;
          [[bx0 + M / 2, by0 + M + bh / 2], [bx0 + M + bw + M / 2, by0 + M + bh / 2],
            [bx0 + M + bw / 2, by0 + M / 2], [bx0 + M + bw / 2, by0 + M + bh + M / 2]].forEach(function (c) {
            const p = P(c[0], c[1]);
            o.push('<circle cx="' + r2(p.x) + '" cy="' + r2(p.y) + '" r="' + r2(rad) + '" ' + marca + '/>');
            o.push('<line x1="' + r2(p.x - cruz) + '" y1="' + r2(p.y) + '" x2="' + r2(p.x + cruz) + '" y2="' + r2(p.y) + '" ' + marca + '/>');
            o.push('<line x1="' + r2(p.x) + '" y1="' + r2(p.y - cruz) + '" x2="' + r2(p.x) + '" y2="' + r2(p.y + cruz) + '" ' + marca + '/>');
          });
        }
      }
    }

    // Cotas
    o.push('<text x="' + r2(W / 2) + '" y="' + r2(-pad * 0.3) + '" text-anchor="middle" font-size="' + r2(fs) + '" fill="#666">' + W + ' mm</text>');
    o.push('<text transform="translate(' + r2(W + pad * 0.65) + ' ' + r2(H / 2) + ') rotate(90)" text-anchor="middle" font-size="' + r2(fs) + '" fill="#666">' + H + ' mm</text>');
    o.push('</svg>');
    return o.join('');
  }

  const API = { svgPliego: svgPliego };
  global.PliegosDibujo = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
