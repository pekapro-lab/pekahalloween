# 🎃 PekaHalloween

Shooter de scroll lateral estilo arcade hecho con **Three.js**: un niño defiende el botín de Halloween a caramelazos contra hordas de monstruos.

**Jugar:** https://pekapro-lab.github.io/pekahalloween/

## Niveles
1. **El Cementerio** — zombis, murciélagos, fantasmas, esqueletos y calabazones. Jefe: *Rey Calabaza*.
2. **La Mansión Encantada** — armaduras poseídas, arañas, libros voladores y velas. Jefe: *Señor Espectro*.
3. **El Pantano de la Bruja** — brujas en escoba, ranas y momias. Jefe: *Bruja Suprema*.

## Controles
- **Teclado:** ←→ / A D mover · ↑ / W apuntar arriba · Espacio / K saltar · J / Z disparar · L / X bomba · P / Esc pausa
- **Mando:** stick o cruceta, A saltar, X/RB/RT disparar, B/Y/LT bomba, Start pausa
- **Móvil:** joystick y botones táctiles (horizontal o vertical)

## Desarrollo
```bash
npm install
npm run dev     # servidor local
npm run build   # genera dist/ (objetivo es2020 / chrome87)
```
Todo (modelos, texturas, música y efectos) se genera por código: sin recursos externos. El sonido usa WebAudio con un limitador.
Se publica automáticamente en GitHub Pages con GitHub Actions al hacer push a `main`.

Hecho por **Pekapro** 🎮
