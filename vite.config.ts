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
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
