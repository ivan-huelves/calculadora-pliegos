/* ============================================================================
   engine.js
   Motor de cálculo de la calculadora de pliegos para libros (sin dependencias).

   Modelo (todo en milímetros):
   - Un cuadernillo con k plegados tiene 2^k hojas por cara y 2^(k+1) páginas
     (tiro y retiro): 1 plegado = 4 págs., 2 = 8, 3 = 16, 4 = 32.
   - El último plegado es el lomo y debe ir paralelo a la fibra. Por eso el
     alto de la página (lado del lomo) queda siempre alineado con la fibra del
     pliego y no se contemplan piezas giradas a contrafibra.
   - En el pliego hay que reservar: pinza, tira de control, margen de seguridad
     en los bordes libres, marcas alrededor de cada bloque y sangrado.
   - Entre dos páginas que se refilan (cabeza, pie y canal) queda una
     separación de 2 x sangrado. En el lomo cosido no hay separación; en la
     rústica fresada se pierden unos 3 mm por página.
   - Si sobran páginas (el libro no es múltiplo del cuadernillo), el resto se
     reparte en cuadernillos menores (potencias de 2) que pueden repetirse
     varias veces en el mismo pliego y cortarse después.
   ========================================================================== */
(function (global) {
  'use strict';

  const MAX_PLEGADOS = 4;
  const FRESADO_MM = 3;
  const EPS = 1e-6;

  // [a, b]: veces que se divide el eje del ancho (columnas = 2^a) y el del alto (filas = 2^b).
  // a >= 1 porque el último plegado (el lomo) divide siempre el ancho.
  const DISPOSICIONES = {
    1: [[1, 0]],
    2: [[1, 1]],
    3: [[2, 1], [1, 2]],
    4: [[2, 2]]
  };

  const DEFECTOS = {
    paginaAncho: 170,
    paginaAlto: 240,
    paginas: 200,
    ejemplares: 500,
    pliegoAncho: 700,
    pliegoAlto: 1000,
    fibra: 'larga',          // 'larga' | 'corta' (paralela al lado largo o corto del pliego)
    ladoPinza: 'largo',      // 'largo' | 'corto' (lado del pliego donde están las pinzas)
    encuadernacion: 'cosido', // 'cosido' | 'fresado'
    pinza: 10,
    tira: 8,
    seguridad: 5,
    marcas: 5,
    sangrado: 3
  };

  const CAMPOS_NUM = ['paginaAncho', 'paginaAlto', 'pliegoAncho', 'pliegoAlto', 'pinza', 'tira',
    'seguridad', 'marcas', 'sangrado', 'paginas', 'ejemplares'];

  function aNumero(v) {
    if (typeof v === 'number') return v;
    return parseFloat(String(v).replace(',', '.'));
  }

  function normalizar(entrada) {
    const e = Object.assign({}, DEFECTOS, entrada || {});
    CAMPOS_NUM.forEach(function (c) { e[c] = aNumero(e[c]); });
    e.fibra = e.fibra === 'corta' ? 'corta' : 'larga';
    e.ladoPinza = e.ladoPinza === 'corto' ? 'corto' : 'largo';
    e.encuadernacion = e.encuadernacion === 'fresado' ? 'fresado' : 'cosido';
    return e;
  }

  function validar(e) {
    const errores = [];
    const pos = function (v) { return Number.isFinite(v) && v > 0; };
    const noNeg = function (v) { return Number.isFinite(v) && v >= 0; };
    if (!pos(e.paginaAncho) || !pos(e.paginaAlto)) {
      errores.push('Indica un ancho y un alto de página mayores que 0.');
    }
    if (!Number.isInteger(e.paginas) || e.paginas < 1) {
      errores.push('Indica un número de páginas entero (1 o más).');
    }
    if (!Number.isInteger(e.ejemplares) || e.ejemplares < 1) {
      errores.push('Indica una tirada entera (1 ejemplar o más).');
    }
    if (!pos(e.pliegoAncho) || !pos(e.pliegoAlto)) {
      errores.push('Indica un ancho y un alto de pliego mayores que 0.');
    }
    if (!['pinza', 'tira', 'seguridad', 'marcas', 'sangrado'].every(function (c) { return noNeg(e[c]); })) {
      errores.push('Los márgenes técnicos deben ser números iguales o mayores que 0.');
    }
    return errores;
  }

  /* Geometría del pliego: dónde están la pinza, la tira y la zona útil, y qué
     eje del pliego es el de la fibra. Sistema de coordenadas: x a la derecha, y hacia abajo. */
  function geometria(e) {
    const W = e.pliegoAncho;
    const H = e.pliegoAlto;
    const largoEsX = W >= H;
    // Eje a lo largo del cual corre la fibra (y, por tanto, el alto de las páginas)
    const ejeFibra = ((e.fibra === 'larga') === largoEsX) ? 'x' : 'y';
    // Eje a lo largo del cual se extiende el borde de pinza
    const ejeCil = ((e.ladoPinza === 'largo') === largoEsX) ? 'x' : 'y';
    let pinza, tira, region;
    if (ejeCil === 'x') { // borde de pinza horizontal (abajo)
      pinza = { x: 0, y: H - e.pinza, w: W, h: e.pinza };
      tira = { x: 0, y: H - e.pinza - e.tira, w: W, h: e.tira };
      region = { x: e.seguridad, y: e.seguridad, w: W - 2 * e.seguridad, h: H - e.pinza - e.tira - e.seguridad };
    } else { // borde de pinza vertical (izquierda)
      pinza = { x: 0, y: 0, w: e.pinza, h: H };
      tira = { x: e.pinza, y: 0, w: e.tira, h: H };
      region = { x: e.pinza + e.tira, y: e.seguridad, w: W - e.pinza - e.tira - e.seguridad, h: H - 2 * e.seguridad };
    }
    return {
      largoEsX: largoEsX,
      ejeFibra: ejeFibra,
      ejeCil: ejeCil,
      cil: ejeCil === 'x' ? W : H,   // longitud del borde de pinza
      pinza: pinza,
      tira: tira,
      region: region,
      // Espacio útil medido en los ejes de la página (ancho = perpendicular al lomo, alto = a lo largo del lomo)
      utilAncho: ejeFibra === 'y' ? region.w : region.h,
      utilAlto: ejeFibra === 'y' ? region.h : region.w
    };
  }

  /* Tamaño de un bloque de cols x filas páginas (por cara), incluyendo sangrado y separaciones. */
  function bloque(cols, rows, e) {
    const gapLomo = e.encuadernacion === 'fresado' ? 2 * FRESADO_MM : 0;
    const gapRefile = 2 * e.sangrado;
    const lomos = cols / 2;
    const canales = cols / 2 - 1;
    return {
      w: cols * e.paginaAncho + lomos * gapLomo + canales * gapRefile + 2 * e.sangrado,
      h: rows * (e.paginaAlto + gapRefile),
      gapLomo: gapLomo,
      gapRefile: gapRefile
    };
  }

  /* Mejor disposición (y repeticiones) para un cuadernillo de k plegados. */
  function mejorEncaje(k, e, geo) {
    const areaPliego = e.pliegoAncho * e.pliegoAlto;
    let mejor = null;
    DISPOSICIONES[k].forEach(function (par) {
      const cols = Math.pow(2, par[0]);
      const rows = Math.pow(2, par[1]);
      const bl = bloque(cols, rows, e);
      const marcoW = bl.w + 2 * e.marcas;
      const marcoH = bl.h + 2 * e.marcas;
      const nAncho = Math.floor((geo.utilAncho + EPS) / marcoW);
      const nAlto = Math.floor((geo.utilAlto + EPS) / marcoH);
      const n = nAncho * nAlto;
      const cabe = n >= 1;
      const cand = {
        k: k, cols: cols, rows: rows, bloque: bl, marcoW: marcoW, marcoH: marcoH,
        nAncho: nAncho, nAlto: nAlto, n: n, cabe: cabe,
        paginasPorBloque: 2 * cols * rows,
        faltaAncho: Math.max(0, marcoW - geo.utilAncho),
        faltaAlto: Math.max(0, marcoH - geo.utilAlto),
        usoPliego: cabe ? (n * cols * rows * e.paginaAncho * e.paginaAlto) / areaPliego * 100 : null
      };
      if (!mejor) {
        mejor = cand;
      } else if (cand.cabe && (!mejor.cabe || cand.n > mejor.n)) {
        mejor = cand;
      } else if (!cand.cabe && !mejor.cabe &&
        (cand.faltaAncho + cand.faltaAlto) < (mejor.faltaAncho + mejor.faltaAlto)) {
        mejor = cand;
      }
    });
    return mejor;
  }

  /* Reparte las páginas en cuadernillos completos de k plegados y un resto en potencias de 2. */
  function distribuir(totalPaginas, k) {
    const P = Math.pow(2, k + 1);
    const completos = Math.floor(totalPaginas / P);
    const resto = totalPaginas - completos * P; // múltiplo de 4
    const restos = [];
    let m = resto / 4;
    for (let j = 1; j <= k - 1; j++) {
      if (m & 1) restos.push(Math.pow(2, j + 1));
      m = m >> 1;
    }
    return { P: P, completos: completos, restos: restos }; // restos en orden ascendente
  }

  function evaluarOpcion(k, e, totalPaginas, encajes, areaPliego) {
    const enc = encajes[k];
    const d = distribuir(totalPaginas, k);
    const cuadernillos = [];
    if (d.completos > 0) cuadernillos.push({ paginas: d.P, k: k, cantidad: d.completos });
    d.restos.slice().reverse().forEach(function (p) {
      cuadernillos.push({ paginas: p, k: Math.round(Math.log2(p)) - 1, cantidad: 1 });
    });
    const cabe = enc.cabe && cuadernillos.every(function (c) { return encajes[c.k].cabe; });
    const aplica = d.P <= totalPaginas;
    let pliegos = null;
    if (cabe) {
      pliegos = cuadernillos.reduce(function (s, c) {
        return s + c.cantidad * Math.ceil(e.ejemplares / encajes[c.k].n);
      }, 0);
    }
    return {
      k: k,
      paginasPorPliego: d.P,
      encaje: enc,
      cabe: cabe,
      aplica: aplica,
      seleccionable: cabe && aplica,
      cuadernillos: cuadernillos,
      numCuadernillos: cuadernillos.reduce(function (s, c) { return s + c.cantidad; }, 0),
      pliegos: pliegos,
      papelM2: pliegos != null ? pliegos * areaPliego / 1e6 : null,
      usoTrabajo: pliegos ? (e.ejemplares * totalPaginas * e.paginaAncho * e.paginaAlto) / (2 * pliegos * areaPliego) * 100 : null
    };
  }

  /* Reparto de la superficie del pliego (en %) para una disposición dada. */
  function desglose(e, geo, enc) {
    const total = e.pliegoAncho * e.pliegoAlto;
    const contenido = enc.n * enc.cols * enc.rows * e.paginaAncho * e.paginaAlto;
    const bloques = enc.n * enc.bloque.w * enc.bloque.h;
    const marcos = enc.n * enc.marcoW * enc.marcoH;
    const zonaUtil = geo.region.w * geo.region.h;
    const pinzaA = e.pinza * geo.cil;
    const tiraA = e.tira * geo.cil;
    const seguridadA = total - pinzaA - tiraA - zonaUtil;
    const partes = [
      { id: 'paginas', area: contenido },
      { id: 'sangrado', area: bloques - contenido },
      { id: 'marcas', area: marcos - bloques },
      { id: 'pinza', area: pinzaA },
      { id: 'tira', area: tiraA },
      { id: 'seguridad', area: seguridadA },
      { id: 'sobrante', area: zonaUtil - marcos }
    ];
    partes.forEach(function (p) { p.pct = p.area / total * 100; });
    return { total: total, partes: partes, usado: contenido / total * 100, sinUsar: 100 - contenido / total * 100 };
  }

  /* Pista de ahorro: ¿qué formato máximo permitiría el siguiente plegado? */
  function sugerirAhorro(e, geo, totalPaginas, base) {
    const kBase = base.principal.k;
    for (let k2 = kBase + 1; k2 <= MAX_PLEGADOS; k2++) {
      if (Math.pow(2, k2 + 1) > totalPaginas) break;
      if (base.encajes[k2].cabe) continue;
      const gapLomo = e.encuadernacion === 'fresado' ? 2 * FRESADO_MM : 0;
      const gapRefile = 2 * e.sangrado;
      let mejor = null;
      DISPOSICIONES[k2].forEach(function (par) {
        const cols = Math.pow(2, par[0]);
        const rows = Math.pow(2, par[1]);
        const pwMax = (geo.utilAncho - 2 * e.marcas - (cols / 2) * gapLomo - (cols / 2 - 1) * gapRefile - 2 * e.sangrado) / cols;
        const phMax = (geo.utilAlto - 2 * e.marcas) / rows - gapRefile;
        const nuevoAncho = Math.min(e.paginaAncho, Math.floor(pwMax + EPS));
        const nuevoAlto = Math.min(e.paginaAlto, Math.floor(phMax + EPS));
        if (nuevoAncho < 1 || nuevoAlto < 1) return;
        const rA = (e.paginaAncho - nuevoAncho) / e.paginaAncho;
        const rH = (e.paginaAlto - nuevoAlto) / e.paginaAlto;
        if (Math.max(rA, rH) > 0.2) return;
        const coste = rA + rH;
        if (!mejor || coste < mejor.coste) {
          mejor = { coste: coste, ancho: nuevoAncho, alto: nuevoAlto, cols: cols, rows: rows };
        }
      });
      if (!mejor) continue;
      const e2 = Object.assign({}, e, { paginaAncho: mejor.ancho, paginaAlto: mejor.alto });
      const plan2 = planificar(e2, 'auto', { sugerencia: false });
      if (!plan2.ok || plan2.principal.k < k2) continue;
      if (plan2.elegido.pliegos >= base.elegido.pliegos) continue;
      const actual = base.elegido.pliegos;
      const nuevo = plan2.elegido.pliegos;
      const area = e.pliegoAncho * e.pliegoAlto;
      return {
        k: plan2.principal.k,
        paginasPorPliego: Math.pow(2, plan2.principal.k + 1),
        ancho: mejor.ancho,
        alto: mejor.alto,
        reduccionAncho: e.paginaAncho - mejor.ancho,
        reduccionAlto: e.paginaAlto - mejor.alto,
        pliegosActual: actual,
        pliegosNuevo: nuevo,
        ahorroPct: (actual - nuevo) / actual * 100,
        ahorroM2: (actual - nuevo) * area / 1e6
      };
    }
    return null;
  }

  /* Función principal.
     plegados: 'auto' o un entero de 1 a 4.
     opciones.sugerencia = false evita calcular la pista de ahorro (uso interno). */
  function planificar(entrada, plegados, opciones) {
    const conSugerencia = !opciones || opciones.sugerencia !== false;
    const e = normalizar(entrada);
    const errores = validar(e);
    if (errores.length) return { ok: false, errores: errores };
    const geo = geometria(e);
    if (geo.region.w <= 0 || geo.region.h <= 0) {
      return { ok: false, errores: ['Los márgenes técnicos ocupan todo el pliego. Reduce la pinza, la tira o el margen de seguridad.'] };
    }

    const totalPaginas = Math.ceil(e.paginas / 4) * 4;
    const areaPliego = e.pliegoAncho * e.pliegoAlto;
    const encajes = {};
    for (let k = 1; k <= MAX_PLEGADOS; k++) encajes[k] = mejorEncaje(k, e, geo);
    const lista = [];
    for (let k = 1; k <= MAX_PLEGADOS; k++) lista.push(evaluarOpcion(k, e, totalPaginas, encajes, areaPliego));

    const base = {
      entrada: e, geo: geo, paginasLibro: e.paginas, paginasImpresas: totalPaginas,
      blancas: totalPaginas - e.paginas, encajes: encajes, opciones: lista
    };

    let elegido = null;
    const pedido = plegados === 'auto' || plegados == null ? 'auto' : parseInt(plegados, 10);
    if (pedido !== 'auto' && lista[pedido - 1] && lista[pedido - 1].seleccionable) elegido = lista[pedido - 1];
    const cayoEnAuto = pedido !== 'auto' && !elegido;
    if (!elegido) {
      for (let k = MAX_PLEGADOS; k >= 1; k--) {
        if (lista[k - 1].seleccionable) { elegido = lista[k - 1]; break; }
      }
    }
    if (!elegido) {
      const e1 = encajes[1];
      return Object.assign(base, {
        ok: false,
        noCabe: true,
        falta: { ancho: e1.faltaAncho, alto: e1.faltaAlto },
        errores: ['El formato de página no cabe en el pliego con estos márgenes técnicos y esta fibra (ni siquiera un cuadernillo de 4 páginas).']
      });
    }

    const kPrincipal = elegido.cuadernillos[0].k;
    const enc = encajes[kPrincipal];
    const res = Object.assign(base, {
      ok: true,
      elegido: elegido,
      automatico: pedido === 'auto',
      cayoEnAuto: cayoEnAuto,
      principal: { k: kPrincipal, encaje: enc, desglose: desglose(e, geo, enc) },
      sugerencia: null
    });
    if (conSugerencia) res.sugerencia = sugerirAhorro(e, geo, totalPaginas, res);
    return res;
  }

  const API = {
    MAX_PLEGADOS: MAX_PLEGADOS,
    FRESADO_MM: FRESADO_MM,
    DEFECTOS: DEFECTOS,
    normalizar: normalizar,
    validar: validar,
    geometria: geometria,
    planificar: planificar
  };
  global.PliegosEngine = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
