/* ============================================================================
   app.js
   Interfaz de la calculadora: lee los campos, llama al motor y pinta el resultado.
   ========================================================================== */
(function () {
  'use strict';

  const E = window.PliegosEngine;
  const D = window.PliegosDibujo;
  const $ = function (id) { return document.getElementById(id); };
  const fmt = function (n, dec) {
    const d = dec || 0;
    return Number(n).toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: 'always' });
  };
  // Milímetros: sin decimales si el valor es entero
  const fmtMm = function (n) { return fmt(n, Math.abs(n - Math.round(n)) < 1e-9 ? 0 : 1); };

  const PRESETS_PLIEGO = [
    { id: '320x450', grupo: 'SRA', nombre: '32 × 45 cm (SRA3)', w: 320, h: 450 },
    { id: '450x640', grupo: 'SRA', nombre: '45 × 64 cm (SRA2)', w: 450, h: 640 },
    { id: '640x900', grupo: 'SRA', nombre: '64 × 90 cm (SRA1)', w: 640, h: 900 },
    { id: '500x700', grupo: 'Otros formatos', nombre: '50 × 70 cm', w: 500, h: 700 },
    { id: '700x1000', grupo: 'Otros formatos', nombre: '70 × 100 cm', w: 700, h: 1000 },
    { id: '720x1020', grupo: 'Otros formatos', nombre: '72 × 102 cm', w: 720, h: 1020 },
    { id: 'custom', nombre: 'Personalizado', w: null, h: null }
  ];
  const PRESETS_PAGINA = [
    { id: '150x240', grupo: 'Libros de lectura', nombre: '150 × 240', w: 150, h: 240 },
    { id: '152x228', grupo: 'Libros de lectura', nombre: '152 × 228', w: 152, h: 228 },
    { id: '135x225', grupo: 'Libros de lectura', nombre: '135 × 225', w: 135, h: 225 },
    { id: '140x216', grupo: 'Libros de lectura', nombre: '140 × 216', w: 140, h: 216 },
    { id: '120x200', grupo: 'Libros de lectura', nombre: '120 × 200', w: 120, h: 200 },
    { id: '110x190', grupo: 'Libros de lectura', nombre: '110 × 190', w: 110, h: 190 },
    { id: '110x170', grupo: 'Libros de lectura', nombre: '110 × 170', w: 110, h: 170 },
    { id: '104x170', grupo: 'Libros de lectura', nombre: '104 × 170', w: 104, h: 170 },
    { id: '200x300', grupo: 'Libros con imágenes', nombre: '200 × 300', w: 200, h: 300 },
    { id: '190x297', grupo: 'Libros con imágenes', nombre: '190 × 297', w: 190, h: 297 },
    { id: '210x280', grupo: 'Libros con imágenes', nombre: '210 × 280', w: 210, h: 280 },
    { id: '175x280', grupo: 'Libros con imágenes', nombre: '175 × 280', w: 175, h: 280 },
    { id: '240x270', grupo: 'Libros con imágenes', nombre: '240 × 270', w: 240, h: 270 },
    { id: '180x270', grupo: 'Libros con imágenes', nombre: '180 × 270', w: 180, h: 270 },
    { id: '200x265', grupo: 'Libros con imágenes', nombre: '200 × 265', w: 200, h: 265 },
    { id: '175x240', grupo: 'Libros con imágenes', nombre: '175 × 240', w: 175, h: 240 },
    { id: '260x235', grupo: 'Formatos horizontales', nombre: '260 × 235', w: 260, h: 235 },
    { id: '220x148', grupo: 'Formatos horizontales', nombre: '220 × 148', w: 220, h: 148 },
    { id: '225x260', grupo: 'Formatos cuadrados o casi', nombre: '225 × 260', w: 225, h: 260 },
    { id: '230x230', grupo: 'Formatos cuadrados o casi', nombre: '230 × 230', w: 230, h: 230 },
    { id: '210x210', grupo: 'Formatos cuadrados o casi', nombre: '210 × 210', w: 210, h: 210 },
    { id: '297x420', grupo: 'Serie A', nombre: '297 × 420 (A3)', w: 297, h: 420 },
    { id: '210x297', grupo: 'Serie A', nombre: '210 × 297 (A4)', w: 210, h: 297 },
    { id: '148x210', grupo: 'Serie A', nombre: '148 × 210 (A5)', w: 148, h: 210 },
    { id: '105x148', grupo: 'Serie A', nombre: '105 × 148 (A6)', w: 105, h: 148 },
    { id: '74x105', grupo: 'Serie A', nombre: '74 × 105 (A7)', w: 74, h: 105 },
    { id: 'custom', nombre: 'Personalizado', w: null, h: null }
  ];

  const estado = { plegados: 'auto', fibra: 'larga' };

  const NUMERICOS = ['paginaAncho', 'paginaAlto', 'paginas', 'ejemplares', 'pliegoAncho', 'pliegoAlto',
    'pinza', 'tira', 'seguridad', 'marcas', 'sangrado'];

  /* ---------- Lectura y escritura del formulario ---------- */
  function leerEntrada() {
    const entrada = {};
    NUMERICOS.forEach(function (id) {
      const v = $(id).value.replace(',', '.');
      entrada[id] = v === '' ? NaN : Number(v);
    });
    entrada.fibra = estado.fibra;
    entrada.encuadernacion = $('encuadernacion').value;
    entrada.ladoPinza = $('ladoPinza').value;
    return entrada;
  }

  function escribirDefectos() {
    const d = E.DEFECTOS;
    NUMERICOS.forEach(function (id) { $(id).value = d[id]; });
    // Valores iniciales de la interfaz (presets de las listas)
    $('paginaAncho').value = 150;
    $('paginaAlto').value = 240;
    $('ejemplares').value = 300;
    $('pliegoAncho').value = 700;
    $('pliegoAlto').value = 1000;
    $('encuadernacion').value = d.encuadernacion;
    $('ladoPinza').value = d.ladoPinza;
  }

  function rellenarPresets(selectId, lista) {
    let html = '';
    let grupo = null;
    lista.forEach(function (p) {
      if (p.grupo !== grupo) {
        if (grupo) html += '</optgroup>';
        if (p.grupo) html += '<optgroup label="' + p.grupo + '">';
        grupo = p.grupo;
      }
      html += '<option value="' + p.id + '">' + p.nombre + '</option>';
    });
    if (grupo) html += '</optgroup>';
    $(selectId).innerHTML = html;
  }

  function sincronizarPreset(selectId, lista, wId, hId) {
    const w = Number($(wId).value);
    const h = Number($(hId).value);
    const hallado = lista.filter(function (p) { return p.w === w && p.h === h; })[0];
    $(selectId).value = hallado ? hallado.id : 'custom';
  }

  function aplicarPreset(selectId, lista, wId, hId) {
    const p = lista.filter(function (x) { return x.id === $(selectId).value; })[0];
    if (p && p.w) {
      $(wId).value = p.w;
      $(hId).value = p.h;
    }
  }

  function marcarSegmento(contenedorId, valor) {
    Array.prototype.forEach.call($(contenedorId).querySelectorAll('button'), function (b) {
      const activo = b.getAttribute('data-valor') === String(valor);
      b.classList.toggle('activo', activo);
      b.setAttribute('aria-checked', activo ? 'true' : 'false');
    });
  }

  /* ---------- Piezas de la interfaz ---------- */
  const NOMBRES = {
    paginas: 'Páginas (contenido)',
    sangrado: 'Sangrado y separaciones',
    marcas: 'Marcas de corte y registro',
    pinza: 'Pinza',
    tira: 'Tira de control',
    seguridad: 'Márgenes de seguridad',
    sobrante: 'Sobrante sin aprovechar'
  };
  const FONDOS = {
    paginas: '#161616',
    sangrado: '#c8c8c8',
    marcas: '#f3f3f3',
    pinza: 'repeating-linear-gradient(45deg, #e6e6e6 0 3px, #777 3px 4px)',
    tira: 'linear-gradient(90deg, #222 25%, #8a8a8a 25% 50%, #555 50% 75%, #bdbdbd 75%)',
    seguridad: '#fff',
    sobrante: '#fff'
  };

  function leyenda() {
    return ['paginas', 'sangrado', 'marcas', 'tira', 'pinza', 'sobrante'].map(function (id) {
      return '<li><span class="muestra" style="background:' + FONDOS[id] + '"></span>' + NOMBRES[id] + '</li>';
    }).join('');
  }

  function textoCuadernillos(cuadernillos) {
    return cuadernillos.map(function (c) {
      return c.cantidad + ' de ' + c.paginas + ' págs.';
    }).join(' + ');
  }

  function textoDisposicion(enc) {
    return enc.cols + ' × ' + enc.rows + (enc.n > 1 ? ' (×' + enc.n + ' repetido)' : '');
  }

  function plural(n, uno, varios) { return n === 1 ? uno : varios; }

  /* ---------- Renderizado ---------- */
  function renderResultado(plan) {
    const cont = $('resultado');
    if (!plan.ok) {
      let html = '<p class="aviso aviso-error">' + plan.errores.join('<br>') + '</p>';
      if (plan.noCabe && plan.falta) {
        const f = [];
        if (plan.falta.ancho > 0.05) f.push(fmtMm(plan.falta.ancho) + ' mm en el ancho');
        if (plan.falta.alto > 0.05) f.push(fmtMm(plan.falta.alto) + ' mm en el alto');
        if (f.length) html += '<p class="nota">Con la disposición más favorable faltan ' + f.join(' y ') + '. Prueba con otro pliego, con otra fibra o reduce el formato.</p>';
      }
      cont.innerHTML = html;
      return;
    }
    const el = plan.elegido;
    const enc = plan.principal.encaje;
    const d = plan.principal.desglose;
    const filas = [
      ['Páginas del libro', fmt(plan.paginasLibro)],
      ['Páginas a imprimir', fmt(plan.paginasImpresas) + (plan.blancas ? ' <small>(+' + plan.blancas + ' en blanco)</small>' : '')],
      ['Plegados', plan.principal.k + ' <small>(' + (enc.cols * enc.rows * 2) + ' págs. por pliego)</small>'],
      ['Cuadernillos por ejemplar', '<span>' + textoCuadernillos(el.cuadernillos) + '</span>'],
      ['Pliegos totales', fmt(el.pliegos)],
      ['Papel total', fmt(el.papelM2, 1) + ' m²']
    ];
    let html = filas.map(function (f) {
      return '<div class="res-fila"><span class="etq">' + f[0] + '</span><span class="val">' + f[1] + '</span></div>';
    }).join('');
    html += '<div class="res-porc">' +
      '<div><div class="etq">% Utilizado</div><div class="num">' + fmt(d.usado, 1) + '</div><div class="sub">del pliego</div></div>' +
      '<div><div class="etq">% Sin usar</div><div class="num">' + fmt(d.sinUsar, 1) + '</div><div class="sub">del pliego</div></div>' +
      '</div>';
    if (Math.abs(el.usoTrabajo - d.usado) > 0.05) {
      html += '<p class="nota" style="text-align:center">Aprovechamiento global del trabajo: ' + fmt(el.usoTrabajo, 1) + ' %</p>';
    }

    const avisos = [];
    if (plan.blancas > 0) avisos.push('Se añaden ' + plan.blancas + ' ' + plural(plan.blancas, 'página', 'páginas') + ' en blanco para llegar a un múltiplo de 4.');
    if (plan.cayoEnAuto) avisos.push('El plegado elegido ya no cabe o no se puede usar con este libro, así que se aplica el automático.');
    if (enc.n > 1) avisos.push('El cuadernillo principal se repite ' + enc.n + ' veces en el pliego y se corta después de imprimir.');
    if (plan.principal.k >= 4) avisos.push('Con 32 páginas por pliego el papel debe ser fino. Con papel grueso conviene bajar a 16 o menos.');
    if (plan.entrada.encuadernacion === 'fresado') avisos.push('Rústica fresada: se han reservado 3 mm por página en el lado del lomo.');
    if (avisos.length) html += '<ul class="avisos">' + avisos.map(function (a) { return '<li>' + a + '</li>'; }).join('') + '</ul>';
    cont.innerHTML = html;
  }

  function renderDibujo(plan) {
    if (!plan.ok) {
      $('dibujo').innerHTML = '<p class="aviso aviso-error">No hay una disposición posible con estos datos.</p>';
      $('leyenda').innerHTML = '';
      $('pie-dibujo').textContent = '';
      return;
    }
    $('dibujo').innerHTML = D.svgPliego(plan);
    $('leyenda').innerHTML = leyenda();
    const g = plan.geo;
    const fibra = g.ejeFibra === 'y' ? 'vertical' : 'horizontal';
    const pinza = g.ejeCil === 'x' ? 'inferior' : 'izquierdo';
    $('pie-dibujo').textContent = 'Se muestra una cara del pliego (tiro). El reverso (retiro) lleva las otras páginas con el mismo esquema. ' +
      'Fibra ' + fibra + ', pinza en el borde ' + pinza + '. Las líneas blancas son plegados de lomo y las discontinuas, cortes de cabeza, pie y canal.';
  }

  function renderTabla(plan) {
    const tabla = $('tabla');
    if (!plan.opciones) { tabla.innerHTML = ''; return; }
    const area = plan.entrada.pliegoAncho * plan.entrada.pliegoAlto;
    let html = '<thead><tr><th>Plegados</th><th class="num">Págs. por pliego</th><th>Disposición</th><th class="num">Cuadernillos</th><th class="num">Pliegos totales</th><th class="num">% utilizado</th></tr></thead><tbody>';
    plan.opciones.forEach(function (o) {
      const enc = o.encaje;
      const activa = plan.ok && plan.elegido.k === o.k;
      const etiqueta = activa ? '<span class="etiqueta">' + (plan.automatico ? 'auto' : 'elegido') + '</span>' : '';
      const clases = [];
      if (o.seleccionable) clases.push('sel'); else clases.push('inactiva');
      if (activa) clases.push('activa');
      html += '<tr class="' + clases.join(' ') + '"' + (o.seleccionable ? ' data-k="' + o.k + '" tabindex="0"' : '') + '>';
      html += '<td>' + o.k + etiqueta + '</td><td class="num">' + o.paginasPorPliego + '</td>';
      if (!o.cabe) {
        const f = [];
        if (enc.faltaAncho > 0.05) f.push(fmtMm(enc.faltaAncho) + ' mm de ancho');
        if (enc.faltaAlto > 0.05) f.push(fmtMm(enc.faltaAlto) + ' mm de alto');
        html += '<td colspan="4">No cabe <small>(faltan ' + (f.join(' y ') || 'unos milímetros') + ')</small></td>';
      } else if (!o.aplica) {
        html += '<td colspan="4">El libro tiene menos páginas que un cuadernillo de ' + o.paginasPorPliego + '</td>';
      } else {
        const uso = enc.n * enc.cols * enc.rows * plan.entrada.paginaAncho * plan.entrada.paginaAlto / area * 100;
        html += '<td>' + textoDisposicion(enc) + '</td><td class="num">' + o.numCuadernillos + '</td><td class="num">' + fmt(o.pliegos) + '</td><td class="num">' + fmt(uso, 1) + '</td>';
      }
      html += '</tr>';
    });
    html += '</tbody>';
    tabla.innerHTML = html;
  }

  function renderDesglose(plan) {
    const cont = $('desglose');
    if (!plan.ok) { cont.innerHTML = '<p class="nota">Sin datos.</p>'; return; }
    const partes = plan.principal.desglose.partes;
    let html = '<div class="barra" role="img" aria-label="Reparto de la superficie del pliego">';
    partes.forEach(function (p) {
      if (p.pct > 0) html += '<span title="' + NOMBRES[p.id] + ': ' + fmt(p.pct, 1) + ' %" style="width:' + p.pct + '%;background:' + FONDOS[p.id] + '"></span>';
    });
    html += '</div>';
    partes.forEach(function (p) {
      html += '<div class="des-fila"><span class="muestra" style="background:' + FONDOS[p.id] + '"></span><span>' + NOMBRES[p.id] + '</span><span class="val">' + fmt(p.pct, 1) + ' %</span></div>';
    });
    cont.innerHTML = html;
  }

  function renderAhorro(plan) {
    const sec = $('ahorro');
    const s = plan.ok ? plan.sugerencia : null;
    if (!s) { sec.hidden = true; sec.innerHTML = ''; return; }
    const cambios = [];
    if (s.reduccionAncho > 0) cambios.push(fmtMm(s.reduccionAncho) + ' mm menos de ancho');
    if (s.reduccionAlto > 0) cambios.push(fmtMm(s.reduccionAlto) + ' mm menos de alto');
    sec.hidden = false;
    sec.innerHTML = '<h2 id="t-ahorro">Pista de ahorro</h2>' +
      '<p>Con un formato de <strong>' + fmtMm(s.ancho) + ' × ' + fmtMm(s.alto) + ' mm</strong> (' + cambios.join(' y ') + ') cabrían <strong>' + s.paginasPorPliego +
      ' páginas por pliego</strong> (' + s.k + ' plegados). Harían falta <strong>' + fmt(s.pliegosNuevo) + ' pliegos</strong> en lugar de ' + fmt(s.pliegosActual) +
      ': un ahorro del <strong>' + fmt(s.ahorroPct, 0) + ' %</strong> del papel (' + fmt(s.ahorroM2, 1) + ' m²).</p>' +
      '<button type="button" class="btn" id="probar" data-w="' + s.ancho + '" data-h="' + s.alto + '">Probar este formato</button>';
  }

  function actualizar() {
    const plan = E.planificar(leerEntrada(), estado.plegados);
    renderResultado(plan);
    renderDibujo(plan);
    renderTabla(plan);
    renderDesglose(plan);
    renderAhorro(plan);

    // Botones de plegados: solo los seleccionables están activos
    const habilitados = {};
    if (plan.opciones) plan.opciones.forEach(function (o) { habilitados[o.k] = o.seleccionable; });
    Array.prototype.forEach.call($('seg-plegados').querySelectorAll('button'), function (b) {
      const v = b.getAttribute('data-valor');
      b.disabled = v !== 'auto' && !habilitados[v];
    });
    if (plan.ok && plan.cayoEnAuto) estado.plegados = 'auto';
    marcarSegmento('seg-plegados', estado.plegados);
    window.__ultimoPlan = plan; // útil para depurar en la consola
  }

  /* ---------- Eventos ---------- */
  function iniciar() {
    rellenarPresets('paginaPreset', PRESETS_PAGINA);
    rellenarPresets('pliegoPreset', PRESETS_PLIEGO);
    escribirDefectos();
    sincronizarPreset('paginaPreset', PRESETS_PAGINA, 'paginaAncho', 'paginaAlto');
    sincronizarPreset('pliegoPreset', PRESETS_PLIEGO, 'pliegoAncho', 'pliegoAlto');
    marcarSegmento('seg-fibra', estado.fibra);

    NUMERICOS.forEach(function (id) {
      $(id).addEventListener('input', function () {
        if (id === 'paginaAncho' || id === 'paginaAlto') sincronizarPreset('paginaPreset', PRESETS_PAGINA, 'paginaAncho', 'paginaAlto');
        if (id === 'pliegoAncho' || id === 'pliegoAlto') sincronizarPreset('pliegoPreset', PRESETS_PLIEGO, 'pliegoAncho', 'pliegoAlto');
        actualizar();
      });
    });
    $('paginaPreset').addEventListener('change', function () {
      aplicarPreset('paginaPreset', PRESETS_PAGINA, 'paginaAncho', 'paginaAlto');
      actualizar();
    });
    $('pliegoPreset').addEventListener('change', function () {
      aplicarPreset('pliegoPreset', PRESETS_PLIEGO, 'pliegoAncho', 'pliegoAlto');
      actualizar();
    });
    ['encuadernacion', 'ladoPinza'].forEach(function (id) { $(id).addEventListener('change', actualizar); });

    $('seg-fibra').addEventListener('click', function (ev) {
      const b = ev.target.closest('button');
      if (!b) return;
      estado.fibra = b.getAttribute('data-valor');
      marcarSegmento('seg-fibra', estado.fibra);
      actualizar();
    });
    $('seg-plegados').addEventListener('click', function (ev) {
      const b = ev.target.closest('button');
      if (!b || b.disabled) return;
      estado.plegados = b.getAttribute('data-valor');
      actualizar();
    });

    const elegirFila = function (ev) {
      const tr = ev.target.closest('tr[data-k]');
      if (!tr) return;
      if (ev.type === 'keydown' && ev.key !== 'Enter' && ev.key !== ' ') return;
      ev.preventDefault();
      estado.plegados = tr.getAttribute('data-k');
      actualizar();
    };
    $('tabla').addEventListener('click', elegirFila);
    $('tabla').addEventListener('keydown', elegirFila);

    $('ahorro').addEventListener('click', function (ev) {
      const b = ev.target.closest('#probar');
      if (!b) return;
      $('paginaAncho').value = b.getAttribute('data-w');
      $('paginaAlto').value = b.getAttribute('data-h');
      sincronizarPreset('paginaPreset', PRESETS_PAGINA, 'paginaAncho', 'paginaAlto');
      actualizar();
    });

    actualizar();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
