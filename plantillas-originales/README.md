# Plantillas originales

Carpeta reservada para los **HTML de referencia** entregados. Está vacía
porque las plantillas todavía no se han recibido.

## Qué va aquí

Los archivos HTML tal como fueron generados, **sin modificar**. Son la fuente
de verdad visual: sirven para comparar cada vista implementada contra su
original y detectar cualquier desviación de color, tipografía, espaciado,
jerarquía o comportamiento responsive.

No se borran ni se editan aunque el código de la aplicación evolucione.

## Cómo entregarlas

1. Subirlas al repositorio en esta carpeta, o
2. adjuntarlas en el chat, o
3. comprimirlas en un `.zip` y adjuntarlo.

La ruta `C:\Users\pekas\Downloads\Comercio e INPARQUES` no es accesible desde
esta sesión: el trabajo corre en un contenedor Linux aislado que no ve el
disco local.

Si los archivos traen CSS, imágenes o fuentes propias, conviene incluirlos
también con la misma estructura de carpetas que tengan en origen.

## Qué ocurre después

1. Se inventaría cada archivo y se asocia a una ruta del registro
   (`src/app/registry.ts`, campo `htmlRef`), creando las entradas que falten.
2. Se compara el inventario real contra las 135 rutas provisionales y se
   reconcilia con la cifra de 119 vistas del encargo.
3. Se monta el marcado original en cada ruta, en lugar del andamio actual.
4. Se conectan botones, formularios, filtros, tablas y modales al núcleo ya
   construido (permisos, estados, auditoría, cola de sincronización).
5. Se revisa vista por vista contra el original en móvil, tablet y escritorio.
