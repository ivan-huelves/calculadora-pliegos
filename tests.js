/* Pruebas del motor. Ejecutar con: node tests.js
   Los valores esperados se han calculado a mano (ver comentarios). */
const assert = require('assert');
const E = require('./engine.js');

let n = 0;
function test(nombre, fn) {
  fn();
  n++;
  console.log('ok  ' + nombre);
}
const casi = (a, b, tol) => assert.ok(Math.abs(a - b) <= (tol || 1e-6), a + ' != ' + b);

// 170 x 240 en pliego 700 x 1000, fibra larga, pinza en lado largo, márgenes por defecto.
// Zona útil: ancho (eje 700) 700-10-8-5 = 677; alto (eje 1000) 1000-2*5 = 990.
test('170x240: solo caben 4 y 8 págs. (3 plegados se quedan 4 mm cortos en el alto)', () => {
  const p = E.planificar({});
  assert.ok(p.ok);
  assert.strictEqual(p.geo.utilAncho, 677);
  assert.strictEqual(p.geo.utilAlto, 990);
  assert.ok(p.encajes[1].cabe && p.encajes[2].cabe);
  assert.ok(!p.encajes[3].cabe && !p.encajes[4].cabe);
  assert.strictEqual(p.encajes[1].n, 3);         // 3 bloques de 4 págs. apilados
  assert.strictEqual(p.encajes[2].n, 1);
  casi(p.encajes[3].faltaAlto, 4);               // 4 filas * (240+6) + 10 = 994 > 990
  assert.strictEqual(p.elegido.k, 2);
  assert.strictEqual(p.elegido.pliegos, 25 * 500); // 200 págs. / 8 = 25 cuadernillos
});

test('170x240: la pista de ahorro propone 170 x 239 y 16 págs. por pliego', () => {
  const p = E.planificar({});
  assert.ok(p.sugerencia);
  assert.strictEqual(p.sugerencia.ancho, 170);
  assert.strictEqual(p.sugerencia.alto, 239);
  assert.strictEqual(p.sugerencia.paginasPorPliego, 16);
  // 12 cuadernillos de 16 + 1 de 8 = 13 formas -> 12*500 + 500 = 6500
  assert.strictEqual(p.sugerencia.pliegosNuevo, 6500);
  casi(p.sugerencia.ahorroPct, 48, 1e-9);
});

test('A5 148x210: caben 32 págs. (4 plegados); 200 págs. = 6 x 32 + 8', () => {
  const p = E.planificar({ paginaAncho: 148, paginaAlto: 210 });
  assert.strictEqual(p.elegido.k, 4);
  assert.deepStrictEqual(p.elegido.cuadernillos.map(c => [c.paginas, c.cantidad]), [[32, 6], [8, 1]]);
  assert.strictEqual(p.encajes[2].n, 4);         // el cuadernillo de 8 se repite 4 veces
  assert.strictEqual(p.elegido.pliegos, 6 * 500 + 125);
  casi(p.principal.desglose.usado, 16 * 148 * 210 / 700000 * 100, 1e-9);
  assert.strictEqual(p.sugerencia, null);        // ya está en el máximo
});

test('Páginas múltiplo de 4: 199 páginas -> 200 impresas, 1 en blanco', () => {
  const p = E.planificar({ paginas: 199, paginaAncho: 148, paginaAlto: 210 });
  assert.strictEqual(p.paginasImpresas, 200);
  assert.strictEqual(p.blancas, 1);
});

test('Resto en potencias de 2: 44 págs. con 32 = 32 + 8 + 4', () => {
  const p = E.planificar({ paginas: 44, paginaAncho: 148, paginaAlto: 210 });
  assert.deepStrictEqual(p.elegido.cuadernillos.map(c => c.paginas), [32, 8, 4]);
});

test('Libros cortos no usan cuadernillos mayores que el libro', () => {
  const p = E.planificar({ paginas: 8, paginaAncho: 148, paginaAlto: 210 });
  assert.strictEqual(p.elegido.k, 2);
  assert.ok(!p.opciones[3].aplica);
});

test('Fibra corta cambia la orientación: A5 pasa a 3 plegados como máximo', () => {
  // fibra corta: el alto de página va a lo largo del eje de 700 mm (útil 677)
  const p = E.planificar({ paginaAncho: 148, paginaAlto: 210, fibra: 'corta' });
  assert.strictEqual(p.geo.ejeFibra, 'x');
  assert.strictEqual(p.geo.utilAlto, 677);
  assert.strictEqual(p.geo.utilAncho, 990);
  assert.ok(p.encajes[3].cabe);
  assert.ok(!p.encajes[4].cabe);                 // 4 filas * 216 + 10 = 874 > 677
  assert.strictEqual(p.elegido.k, 3);
});

test('Fresado ensancha el bloque: +6 mm por cada lomo', () => {
  const a = E.planificar({ paginaAncho: 148, paginaAlto: 210 });
  const b = E.planificar({ paginaAncho: 148, paginaAlto: 210, encuadernacion: 'fresado' });
  casi(b.encajes[4].bloque.w - a.encajes[4].bloque.w, 12); // 4 columnas = 2 lomos
});

test('El desglose suma el 100 % de la superficie', () => {
  [{}, { fibra: 'corta' }, { ladoPinza: 'corto' }, { pinza: 12, tira: 0, seguridad: 3, marcas: 6 }].forEach(extra => {
    const p = E.planificar(Object.assign({ paginaAncho: 148, paginaAlto: 210 }, extra));
    assert.ok(p.ok);
    const suma = p.principal.desglose.partes.reduce((s, x) => s + x.pct, 0);
    casi(suma, 100, 1e-9);
    p.principal.desglose.partes.forEach(x => assert.ok(x.area > -1e-9, x.id));
  });
});

test('Formato demasiado grande: no cabe y dice cuánto falta', () => {
  const p = E.planificar({ paginaAncho: 500, paginaAlto: 700 });
  assert.ok(!p.ok && p.noCabe);
  assert.ok(p.falta.ancho > 0 || p.falta.alto > 0);
});

test('Entradas inválidas devuelven errores', () => {
  assert.ok(!E.planificar({ paginaAncho: NaN }).ok);
  assert.ok(!E.planificar({ paginas: 0 }).ok);
  assert.ok(!E.planificar({ ejemplares: 1.5 }).ok);
  assert.ok(!E.planificar({ pinza: 600, tira: 200 }).ok);
});

test('Plegado manual no seleccionable cae al automático', () => {
  const p = E.planificar({}, 4);
  assert.ok(p.cayoEnAuto);
  assert.strictEqual(p.elegido.k, 2);
});

test('Número de pliegos usa el redondeo hacia arriba por repeticiones', () => {
  const p = E.planificar({ paginaAncho: 148, paginaAlto: 210, paginas: 8, ejemplares: 501 });
  assert.strictEqual(p.elegido.pliegos, Math.ceil(501 / 4));
});

console.log('\n' + n + ' pruebas superadas');
