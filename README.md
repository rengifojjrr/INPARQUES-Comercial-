# INPARQUES Comercial — demo

Demo local y navegable de la plataforma de comercio en parques: PWA de
visitante, portal de comercio y panel institucional sobre **una sola base de
datos** y un solo sistema de rutas y permisos.

Se ejecuta entera en el navegador. No requiere servidor, cuenta externa, clave
de API, tarjeta ni suscripción.

---

## Estado actual — leer antes de ejecutar

**Las plantillas HTML todavía no están en el repositorio.** El repositorio
`rengifojjrr/INPARQUES-Comercial-` estaba vacío al iniciar el trabajo, y la
carpeta `C:\Users\pekas\Downloads\Comercio e INPARQUES` está en un equipo
Windows al que esta sesión no tiene acceso. El único material recibido fue el
documento funcional en PDF.

Por eso lo que hay aquí es **el núcleo funcional**, no la demo terminada:

| Construido | Pendiente de las plantillas |
| --- | --- |
| Modelo de datos, datos de demo y persistencia | Marcado y estilos de cada vista |
| Los 11 roles, permisos y ámbitos | Navegación visual por superficie |
| Router con guardias, 403 y 404 | Componentes compartidos reales |
| Las 4 máquinas de estado separadas | Modales de confirmación con su diseño |
| Auditoría, enmascarado y acciones sensibles | |
| Conectividad, cola de sincronización y conflictos | |
| Adaptadores simulados de banco, fiscal, MFA y mensajería | |
| Índice técnico interno con las 135 rutas | |

**No se diseñó ninguna pantalla de producto.** Las rutas registradas muestran
un andamio neutro con la ficha de la vista; ese andamio se sustituye por el
HTML original cuando llegue, sin tocar el núcleo.

### Cómo entregar las plantillas

Cualquiera de estas vías sirve:

1. Subirlas al repositorio (`git add` + `git push`) en cualquier carpeta.
2. Adjuntarlas en el chat, como se adjuntó el PDF.
3. Comprimirlas en un `.zip` y adjuntarlo.

La ruta de Windows no funciona: esta sesión corre en un contenedor Linux
aislado y no ve el disco local.

---

## Requisitos

- Node.js 20 o superior (probado en 22).
- Un navegador moderno.

## Instalación y ejecución

```bash
npm install     # instala las dependencias
npm run dev     # levanta la demo en http://localhost:5173
```

Para la versión de producción:

```bash
npm run build   # comprueba tipos y construye en dist/
npm run preview # sirve dist/ en http://localhost:4173
```

## Comandos disponibles

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo con recarga en caliente |
| `npm run build` | Comprobación de tipos + construcción de producción |
| `npm run preview` | Sirve la construcción de producción |
| `npm run check` | Solo comprobación de tipos |
| `npm test` | Pruebas automáticas (72 pruebas) |
| `npm run matriz` | Regenera `docs/MATRIZ-COBERTURA.md` desde el registro |
| `npm run verificar` | Verificación en navegador real (requiere `npm run preview` activo) |

## Perfiles de prueba

**La contraseña de todos los perfiles es `demo1234`.** No es un secreto: es
una constante de demostración declarada en `src/app/session.ts`.

| Rol | Correo | Ámbito | MFA |
| --- | --- | --- | --- |
| Superadministrador nacional | `superadmin@demo.inparques.ve` | Nacional | Sí |
| Dirección comercial / concesiones | `concesiones@demo.inparques.ve` | Región Capital | Sí |
| Finanzas / auditoría | `finanzas@demo.inparques.ve` | Nacional | Sí |
| Administrador de parque | `parque.este@demo.inparques.ve` | Parque del Este | Sí |
| Inspector / guardaparque | `inspeccion.este@demo.inparques.ve` | Parque del Este | Sí |
| Soporte / disputas | `soporte@demo.inparques.ve` | Nacional | Sí |
| Propietario legal | `propietario@loscedros.demo.ve` | Café Los Cedros | Sí |
| Administrador de local | `local.jardin@loscedros.demo.ve` | 2 locales | No |
| Operador / cocina | `cocina@loscedros.demo.ve` | Jardín Central | No |
| Contador | `contabilidad@loscedros.demo.ve` | Café Los Cedros | No |
| Visitante | `visitante@demo.ve` | Propio | No |

**Código MFA de demostración: `123456`.** Los perfiles institucionales y el
propietario pasan siempre por el segundo factor.

El visitante también puede comprar **como invitado**, sin cuenta.

## Restablecer la demo

Desde la consola del navegador:

```js
await demoInparques.restablecer();   // vuelve a los datos iniciales
demoInparques.exportar();            // devuelve el estado como JSON
```

Los datos viven en IndexedDB (con localStorage como respaldo). Restablecer
borra lo almacenado y siembra de nuevo.

## Simular conexión y desconexión

Sin desconectar el equipo, desde la consola:

```js
demoInparques.conexion();          // "conectado" | "degradado" | "sin_conexion"
demoInparques.alternarConexion();  // avanza al siguiente modo
demoInparques.cola();              // acciones encoladas
await demoInparques.sincronizar(); // vacía la cola y devuelve conflictos
```

Regla que la demo respeta siempre: **sin conexión no se muestra un pago, una
factura ni una liquidación como confirmados.** Quedan pendientes de
sincronización, y al volver la red la cola se aplica o reporta conflicto.

## Índice técnico de páginas

`http://localhost:5173/#/__mapa`

No es una pantalla de producto y no se enlaza desde ninguna navegación. Lista
las 135 rutas agrupadas por superficie y grupo, con sus roles autorizados, su
HTML de referencia y su estado. Permite filtrar por rol, buscar y exportar la
cobertura en CSV. Incluye un diagnóstico que detecta rutas duplicadas, rutas
que no resuelven y roles sin vistas asignadas.

La misma información en Markdown: [`docs/MATRIZ-COBERTURA.md`](docs/MATRIZ-COBERTURA.md).

## Datos de demostración

Parque piloto **Parque del Este - piloto**, con las zonas Entrada Norte, Lago,
Jardín Central y Área Infantil, y los negocios **Café Los Cedros**, **Juguetes
Orinoco**, **Aventuras del Lago** y **Artesanía Manantial** (en revisión).
Todos los nombres son ficticios.

Los precios se muestran en USD como referencia y en VES como monto pagadero.
Existe una tasa BCV de demostración con fecha y hora, y **cada venta conserva
la tasa que tenía al registrarse**: cambiar la tasa global no recalcula el
histórico.

## Modo demostración

Ninguna integración es real. Banco, facturación, mensajería, MFA, tasa BCV y
almacenamiento de evidencias son adaptadores simulados, cada uno con su
identificador grabado en los registros que produce. El detalle está en
[`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) y en el índice técnico.

Nunca se solicitan ni se almacenan credenciales bancarias reales, números
completos de tarjeta ni documentos sensibles reales.

## Documentación

- [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) — modelo de datos, persistencia, roles, permisos y adaptadores.
- [`docs/MATRIZ-COBERTURA.md`](docs/MATRIZ-COBERTURA.md) — las 135 vistas con ruta, roles y estado.
- [`plantillas-originales/`](plantillas-originales/) — carpeta reservada para los HTML de referencia.
