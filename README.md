# INPARQUES Comercial — demo

Demo navegable de la plataforma de comercio en parques nacionales: PWA de
visitante, portal de comercio y panel institucional sobre **una sola base de
datos** y un solo sistema de rutas y permisos.

Se ejecuta entera en el navegador. No requiere servidor, cuenta externa, clave
de API, tarjeta ni suscripción.

## Probar la beta

### → **https://rengifojjrr.github.io/INPARQUES-Comercial-/**

Enlace público, ya en línea: se abre en teléfono o computadora sin instalar
nada. Se republica solo con GitHub Pages en cada empuje a la rama, según
[`.github/workflows/pages.yml`](.github/workflows/pages.yml).

Para usar sin conexión o mandar por correo, la misma demo en un solo archivo:
[`inparques-demo.html`](https://rengifojjrr.github.io/INPARQUES-Comercial-/inparques-demo.html).

Verá la pantalla de acceso:
**pulse una de las cuentas de prueba**, se cargan sus credenciales, y pulse
**Ingresar** para entrar a la versión de ese rol.

| Superficie | Cuentas de prueba disponibles desde la pantalla de acceso |
| --- | --- |
| Visitante | Visitante |
| Comercio | Propietario · Administrador de local · Operador · Contador |
| INPARQUES | Superadmin · Dirección comercial · Finanzas · Administrador de parque · Inspector · Soporte |

Contraseña de todos los perfiles: **`demo1234`**.
Código de verificación en dos pasos: **`123456`**.
No son secretos: son constantes de demostración declaradas en
`src/app/session.ts`. El visitante también puede **entrar como invitado**, sin
cuenta.

---

## Estado

Las 119 pantallas de Stitch están portadas en las tres superficies: el
recorrido completo del visitante, el portal de comercio entero y el panel
institucional entero, con datos reales del almacén y el control de acceso por
rol y ámbito funcionando.

Detalle de qué página de Stitch corresponde a cada ruta, y qué queda
pendiente, en [`docs/MAPEO-PAGINAS-STITCH.md`](docs/MAPEO-PAGINAS-STITCH.md).

## Perfiles de prueba

Correos completos, por si quiere escribirlos a mano en vez de usar los chips
de la pantalla de acceso.

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

El visitante también puede **comprar como invitado**, sin cuenta.

## Qué probar

Recorridos que atraviesan las tres superficies y demuestran las reglas:

1. **Compra completa.** Entre con la cuenta *Visitante* → Café Los Cedros →
   agregar → carrito → checkout → Pago Móvil (referencia `123456`) →
   confirmación. El pago queda **pendiente de verificación**, no confirmado.
2. **Un comercio por carrito.** Con algo de Café Los Cedros en el carrito,
   intente agregar un juguete de Orinoco: aparece el modal para conservar o
   vaciar.
3. **Lo que hace el comercio se ve en el visitante.** Entre como Operador,
   acepte el pedido y márquelo listo; vuelva al visitante y véalo cambiado.
4. **Disponibilidad.** Como Administrador de local, marque un artículo como
   agotado en Catálogo; el visitante ya no puede pedirlo.
5. **Venta de mostrador.** Caja → Venta de mostrador. Aparece en la caja, en
   el cierre y en los reportes, junto con las ventas de la aplicación.
6. **Rutas prohibidas.** Como Operador, escriba `#/i/contabilidad` en la
   barra de direcciones: recibe un 403 con vuelta a su inicio.
7. **Lo ajeno no se toca.** Como Operador de Café Los Cedros, escriba el
   pedido de otro comercio (`#/c/pedido/or_1004`): recibe un 403, y el estado
   del pedido no se mueve. Igual el visitante con el pedido de otro, que
   además lleva el código de retiro.
8. **Cancelar, reclamar y valorar.** Haga un pedido y cancélelo antes de que
   el comercio lo acepte. Acéptelo con el Operador y verá que ya solo queda
   el reclamo. Un pedido entregado se valora una sola vez.
9. **Responder y moderar.** El comercio responde en `#/c/valoraciones`;
   Soporte retira una valoración con motivo en `#/i/valoraciones`, y queda en
   la bitácora sin borrarse.
10. **Mapa del parque.** Visitante → Explorar → mapa: las zonas y los puntos
   comerciales son clicables y abren la ficha del comercio que los ocupa.
11. **Datos bancarios.** El Propietario ve la cuenta enmascarada; el Inspector
   no recibe el campo en absoluto.
12. **Acción sensible.** Cobro → Cambiar cuenta bancaria: exige motivo,
   evidencia, verificación y segunda aprobación. Nadie firma su propia
   solicitud, ni siquiera un superadministrador.
13. **Sin conexión.** Perfil → Conexión. Opere sin red, **recargue la
   página**, y la cola sigue ahí.
14. **Auditoría.** Como Finanzas, `#/i/auditoria` muestra todo lo anterior.

## Ejecutar en local

```bash
npm install     # instala las dependencias
npm run dev     # http://localhost:5173
```

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Comprobación de tipos + construcción |
| `npm run preview` | Sirve la construcción en el puerto 4173 |
| `npm run unico` | Empaqueta todo en un solo HTML en `dist-unico/` |
| `npm test` | 105 pruebas automáticas |
| `npm run matriz` | Regenera `docs/MATRIZ-COBERTURA.md` |
| `npm run verificar` | 58 comprobaciones en navegador real (requiere `preview` activo) |

## Restablecer la demo

Perfil → **Restablecer datos**. O desde la consola del navegador:

```js
await demoInparques.restablecer();   // vuelve a los datos iniciales
demoInparques.exportar();            // estado completo en JSON
```

Los datos viven en IndexedDB, con localStorage de respaldo.

## Simular conexión y desconexión

Perfil → **Conexión** alterna entre conectado, degradado y sin conexión. O:

```js
demoInparques.alternarConexion();
demoInparques.cola();
await demoInparques.sincronizar();
```

Regla que la demo respeta siempre: **sin conexión no se muestra un pago, una
factura ni una liquidación como confirmados.** Quedan pendientes, y al volver
la red la cola se aplica o reporta conflicto.

## Índice técnico de páginas

`#/__mapa` — no es una pantalla de producto y no se enlaza desde ninguna
navegación. Lista las 137 rutas agrupadas por superficie y grupo, con roles
autorizados, HTML de referencia y estado. Filtra por rol, busca, exporta CSV y
diagnostica rutas duplicadas o roles sin vistas.

También en Markdown: [`docs/MATRIZ-COBERTURA.md`](docs/MATRIZ-COBERTURA.md).

## Datos de demostración

Parque piloto **Parque del Este - piloto**, con las zonas Entrada Norte, Lago,
Jardín Central y Área Infantil, y los negocios **Café Los Cedros**, **Juguetes
Orinoco**, **Aventuras del Lago** y **Artesanía Manantial** (en revisión).
Todos los nombres son ficticios.

Los precios se muestran en USD como referencia y en VES como monto pagadero.
**Cada venta conserva la tasa que tenía al registrarse**: cambiar la tasa
global no recalcula el histórico.

## Modo demostración

Ninguna integración es real. Banco, facturación, mensajería, MFA, tasa BCV y
almacenamiento de evidencias son adaptadores simulados, cada uno con su
identificador grabado en los registros que produce. Detalle en
[`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) y en `#/i/integraciones`.

Nunca se solicitan ni se almacenan credenciales bancarias reales, números
completos de tarjeta ni documentos sensibles reales.

## Documentación

- [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) — modelo de datos, persistencia, roles, permisos y adaptadores.
- [`docs/MATRIZ-COBERTURA.md`](docs/MATRIZ-COBERTURA.md) — las 137 vistas con ruta, roles y estado.
- [`docs/MAPEO-PAGINAS-STITCH.md`](docs/MAPEO-PAGINAS-STITCH.md) — qué página de Stitch corresponde a cada ruta.
- `50/`, `los 25/`, `stitch_inparques_comercial_portal_visitante/` — los HTML originales de referencia.
