# Calculadora de pliegos para libros

Herramienta didáctica (web estática, sin dependencias ni paso de compilación) para entender cómo se imprime un libro en pliegos: cuántas páginas caben en cada pliego, cuántos pliegos necesita una tirada y cuánto papel se aprovecha.

## Qué calcula

- Páginas por pliego según el número de plegados (1 = 4 págs., 2 = 8, 3 = 16, 4 = 32; tiro y retiro).
- Total de páginas redondeado a múltiplo de 4, reparto en cuadernillos completos y resto.
- Pliegos totales de la tirada, papel total (m²), % utilizado y % sin usar.
- Descuento de pinza, tira de control, margen de seguridad, marcas de corte y registro, sangrado y separaciones entre páginas.
- La fibra fija la orientación de las páginas (paralela al lomo), así que no aparecen piezas giradas a contrafibra.
- Pista de ahorro: qué formato máximo permitiría el siguiente plegado y cuánto papel se ahorraría.

## Cambiar valores por defecto

Están en `DEFECTOS` (al principio de `engine.js`): formato, páginas, tirada, pliego y márgenes técnicos. Los formatos y pliegos predefinidos están en `PRESETS_PAGINA` y `PRESETS_PLIEGO` (al principio de `app.js`).

## Simplificaciones

- No incluye el desplazamiento por plegado (creep) de los libros gruesos, la cubierta, las guardas ni las hojas de ajuste.
- Los cuadernillos de 4 a 32 páginas siguen el esquema de plegado en ángulo recto (y paralelo en el caso de 16 págs.); la imposición exacta (numeración de páginas) la decide la imprenta.
- Los márgenes por defecto son orientativos y varían según la máquina y el taller.

© 2026 Iván Huelves Illas. Licencia CC BY-NC-SA 4.0 (https://creativecommons.org/licenses/by-nc-sa/4.0/)