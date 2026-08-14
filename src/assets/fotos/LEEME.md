# Fotografías

Deje aquí las fotos con el **identificador como nombre de archivo** y aparecen
solas en todas las pantallas que las usen. No hay que registrar nada ni tocar
ninguna vista: `src/ui/fotos.ts` las recoge en la construcción.

```
ng_cedros.jpg           → Café Los Cedros (ficha y tarjetas)
ng_cedros-portada.jpg   → opcional: portada apaisada de ese comercio
ar_cafe_guayoyo.jpg     → el artículo "Guayoyo grande"
pq_este.jpg             → Parque del Este
```

Sin foto, sigue saliendo la ilustración generada. Formatos: `.jpg`, `.jpeg`,
`.png`, `.webp`. Apaisadas ~1200 px, cuadradas ~600 px, calidad ~80.

El archivo único (`npm run unico`) las incrusta en base64 y no puede pasar de
16 MB, así que conviene no pasarse de peso.
