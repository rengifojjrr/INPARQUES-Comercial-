/**
 * Configuración de Tailwind extraída literalmente de las 119 páginas de
 * Stitch entregadas por el cliente (carpetas "50", "los 25" y
 * "stitch_inparques_comercial_portal_visitante"). Los 119 archivos definían
 * el mismo bloque `tailwind.config` byte a byte (verificado programáticamente
 * comparando los 119 JSON), así que este archivo es una copia fiel de ese
 * bloque, no una reinterpretación.
 *
 * Antes se cargaba vía CDN (`cdn.tailwindcss.com`), prohibido en tiempo de
 * ejecución (bloqueado por CSP y además una dependencia de red evitable).
 * Aquí se compila de verdad, sin cambiar un solo valor de token.
 */

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        primary: '#005131',
        surface: '#fbf9f3',
        'secondary-container': '#c0edd4',
        'surface-variant': '#e4e2dd',
        'surface-container-high': '#eae8e2',
        'on-error': '#ffffff',
        'error-container': '#ffdad6',
        'on-secondary-fixed': '#002114',
        'on-surface': '#1b1c18',
        'on-primary-container': '#99e9b9',
        'on-tertiary-container': '#cadbd2',
        'on-tertiary-fixed': '#0f1e19',
        'surface-container': '#f0eee8',
        'inverse-surface': '#30312d',
        'on-primary': '#ffffff',
        'outline-variant': '#bfc9c0',
        'surface-bright': '#fbf9f3',
        'tertiary-fixed': '#d5e7dd',
        'on-surface-variant': '#3f4942',
        'surface-container-highest': '#e4e2dd',
        'primary-container': '#176b45',
        'on-primary-fixed': '#002111',
        outline: '#6f7a71',
        tertiary: '#3a4942',
        'surface-tint': '#186c45',
        'on-background': '#1b1c18',
        'on-secondary': '#ffffff',
        'on-tertiary-fixed-variant': '#3a4a43',
        'surface-container-lowest': '#ffffff',
        'on-secondary-fixed-variant': '#264e3c',
        'primary-fixed-dim': '#88d7a8',
        'on-primary-fixed-variant': '#005232',
        'inverse-primary': '#88d7a8',
        'surface-container-low': '#f5f3ed',
        'tertiary-container': '#516159',
        'on-tertiary': '#ffffff',
        'secondary-fixed-dim': '#a4d0b8',
        error: '#ba1a1a',
        'on-error-container': '#93000a',
        'secondary-fixed': '#c0edd4',
        'on-secondary-container': '#446d59',
        secondary: '#3e6753',
        'primary-fixed': '#a4f4c3',
        'surface-dim': '#dcdad4',
        'inverse-on-surface': '#f3f1eb',
        background: '#fbf9f3',
        'tertiary-fixed-dim': '#b9cbc1',
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        full: '9999px',
      },
      spacing: {
        xl: '32px',
        'touch-target': '44px',
        sm: '12px',
        base: '4px',
        md: '16px',
        xxl: '48px',
        lg: '24px',
        xs: '8px',
      },
      fontFamily: {
        'label-sm': ['Manrope'],
        'body-lg': ['Manrope'],
        'body-md': ['Manrope'],
        'headline-md': ['Manrope'],
        'headline-lg-mobile': ['Manrope'],
        'headline-lg': ['Manrope'],
        'label-md': ['Manrope'],
        'display-lg': ['Manrope'],
      },
      fontSize: {
        'label-sm': ['12px', { lineHeight: '16px', fontWeight: '700' }],
        'body-lg': ['18px', { lineHeight: '28px', fontWeight: '400' }],
        'body-md': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'headline-md': ['24px', { lineHeight: '32px', fontWeight: '600' }],
        'headline-lg-mobile': ['24px', { lineHeight: '32px', fontWeight: '700' }],
        'headline-lg': ['32px', { lineHeight: '40px', letterSpacing: '-0.01em', fontWeight: '700' }],
        'label-md': ['14px', { lineHeight: '20px', letterSpacing: '0.01em', fontWeight: '600' }],
        'display-lg': ['48px', { lineHeight: '56px', letterSpacing: '-0.02em', fontWeight: '800' }],
      },
    },
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/container-queries')],
};
