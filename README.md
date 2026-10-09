# Calculadora de pliegos para libros

Herramienta didáctica (web estática, sin dependencias ni paso de compilación) para entender cómo se imprime un libro en pliegos: cuántas páginas caben en cada pliego, cuántos pliegos necesita una tirada y cuánto papel se aprovecha.

## Qué calcula

- Páginas por pliego según el número de plegados (1 = 4 págs., 2 = 8, 3 = 16, 4 = 32; tiro y retiro).
- Total de páginas redondeado a múltiplo de 4, reparto en cuadernillos completos y resto.
- Pliegos totales de la tirada, papel total (m²), % utilizado y % sin usar.
- Descuento de pinza, tira de control, margen de seguridad, marcas de corte y registro, sangrado y separaciones entre páginas.
- La fibra fija la orientación de las páginas (paralela al lomo), así que no aparecen piezas giradas a contrafibra.
- Pista de ahorro: qué formato máximo permitiría el siguiente plegado y cuánto papel se ahorraría.

## Uso en local

Abre `index.html` en el navegador (doble clic). No hace falta servidor. Si quieres uno:

```bash
python3 -m http.server 8000
```

y entra en <http://localhost:8000>.

## Publicar en GitHub Pages

1. Copia estos archivos a la raíz de tu repositorio (o a una carpeta, por ejemplo `pliegos/`).
2. Haz `commit` y `push`.
3. En GitHub: **Settings > Pages > Build and deployment > Deploy from a branch**, elige la rama `main` y la carpeta `/ (root)`.
4. La web quedará en `https://TU-USUARIO.github.io/TU-REPO/` (o en `.../pliegos/` si usaste una carpeta).

## Archivos

| Archivo | Función |
| --- | --- |
| `index.html` | Estructura de la página |
| `style.css` | Estética (Space Mono, tarjetas blancas, tooltips negros) |
| `engine.js` | Motor de cálculo, sin DOM |
| `dibujo.js` | Genera el SVG del pliego a escala |
| `app.js` | Interfaz: lee los campos y pinta resultados |
| `tests.js` | Pruebas del motor con casos calculados a mano |

## Pruebas

```bash
node tests.js
```

## Cambiar valores por defecto

Están en `DEFECTOS` (al principio de `engine.js`): formato, páginas, tirada, pliego y márgenes técnicos. Los formatos y pliegos predefinidos están en `PRESETS_PAGINA` y `PRESETS_PLIEGO` (al principio de `app.js`).

## Simplificaciones (para comentar en clase)

- No incluye el desplazamiento por plegado (creep) de los libros gruesos, la cubierta, las guardas ni las hojas de ajuste.
- Los cuadernillos de 4 a 32 páginas siguen el esquema de plegado en ángulo recto (y paralelo en el caso de 16 págs.); la imposición exacta (numeración de páginas) la decide la imprenta.
- Los márgenes por defecto son orientativos y varían según la máquina y el taller.

© 2026 Iván Huelves Illas. Licencia CC BY-NC-SA 4.0 (https://creativecommons.org/licenses/by-nc-sa/4.0/)