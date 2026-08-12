import { defineConfig } from 'vite';

// Base relativa: la demo debe poder servirse desde cualquier subcarpeta
// (GitHub Pages, carpeta local, servidor estatico) sin reconfigurar rutas.
export default defineConfig({
  base: './',
  server: { port: 5173, open: false },
  build: {
    outDir: 'dist',
    target: 'es2022',
    sourcemap: true,
    // Las fuentes autohospedadas (Manrope, Material Symbols) deben quedar
    // incrustadas como base64 en el CSS: el empaquetado de un solo archivo
    // (scripts/construir-unico.mjs) solo copia el CSS y el JS generados,
    // sin los binarios de dist/assets, así que una referencia url() a un
    // archivo separado quedaria rota en ese archivo unico.
    assetsInlineLimit: 400_000,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
