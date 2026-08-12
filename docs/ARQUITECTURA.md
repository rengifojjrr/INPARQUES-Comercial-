# Arquitectura

Documento breve del núcleo. La fuente funcional es
`investigacion_plataforma_comercial_inparques.pdf`; cada decisión relevante
cita la sección que la respalda.

## 1. Decisión de tecnología

**Vite + TypeScript, sin framework de interfaz.**

El motivo es la restricción principal del encargo: conservar exactamente la
apariencia de los HTML entregados. Un puerto a React o Vue obligaría a
reescribir cada etiqueta como JSX o plantilla, y ahí es donde el diseño se
desvía sin querer. Con TypeScript sobre DOM el marcado original puede montarse
tal cual y recibir comportamiento por encima.

Si al recibir las plantillas resulta que ya usan un framework coherente, se
continúa con ese; la capa de dominio no depende de la interfaz.

- **Router:** basado en hash (`#/ruta`), para que la demo funcione servida
  desde cualquier carpeta estática sin reescritura del servidor.
- **Persistencia:** IndexedDB, con localStorage de respaldo y memoria en las
  pruebas. El backend se elige solo.
- **Dependencias:** tres de desarrollo (TypeScript, Vite, Vitest) y una
  opcional para la verificación en navegador (Playwright). Ninguna en
  producción.

## 2. Capas

```
src/
├── domain/      Reglas. Sin DOM, sin almacenamiento, sin red.
├── data/        Estado, datos iniciales, persistencia y auditoría.
├── adapters/    Integraciones externas, hoy todas simuladas.
├── net/         Conectividad y cola de sincronización.
├── app/         Sesión, registro de vistas y router con guardias.
└── dev/         Índice técnico interno y andamiaje. No es producto.
```

La dirección de dependencia es siempre hacia adentro: `app` conoce `domain`,
`domain` no conoce a nadie. Por eso las reglas se pueden probar sin navegador.

## 3. Modelo de datos

Sigue la tabla «Datos y tableros» (sección 10 del documento) y la jerarquía de
la sección 02:

```
Nacional → región/estado → parque → zona → punto comercial
                                        → negocio legal → local → catálogo
```

| Grupo | Entidades |
| --- | --- |
| Territorio | `Region`, `Parque`, `Zona`, `PuntoComercial` |
| Comercial | `Negocio`, `Local`, `DocumentoExpediente`, `Permiso`, `Contrato`, `CuentaBancaria` |
| Identidad | `User`, `Sesion`, `Invitacion`, `Scope` |
| Oferta | `Articulo`, `Variante`, `Modificador`, `FranjaServicio` |
| Transacción | `Orden`, `ItemOrden`, `Pago`, `Factura`, `Reembolso` |
| Finanzas | `Liquidacion`, `Ajuste`, `TurnoCaja` |
| Control | `Inspeccion`, `Incidencia`, `Disputa`, `Valoracion`, `EventoAuditoria`, `Notificacion` |

Todo vive en un único objeto `DemoState`. Que las tres superficies lean el
mismo estado es lo que hace que un cambio del operador se vea en el visitante
y en INPARQUES sin ningún mecanismo de sincronización entre paneles.

### Los cuatro procesos separados

Sección 04: «Estados que nunca deben confundirse». Son cuatro máquinas
independientes en `domain/state-machines.ts`, cada una con su tabla de
transiciones válidas:

| Proceso | Estados |
| --- | --- |
| Orden | creada → pendiente de aceptación → aceptada → preparando → lista → entregada / cancelada |
| Pago | iniciado → pendiente de verificación → confirmado / fallido → revertido / reembolsado |
| Factura | pendiente → emitida → nota de crédito o débito / anulada |
| Liquidación | calculada → por cobrar o por pagar → conciliada → cerrada |

Una transición inválida lanza `TransicionInvalida`. No se corrige un estado
imposible: se rechaza.

Los datos de demostración incluyen a propósito una orden **lista** con el pago
todavía **pendiente de verificación**, para que la separación sea visible y no
solo teórica.

### Regla monetaria

Sección 07. `usdAVes` y `vesAUsd` exigen siempre una tasa explícita: no existe
ninguna función que tome «la tasa actual» de forma implícita. Cada orden
guarda `tasaBcv` y `tasaBcvFecha`, y esos valores no se recalculan nunca. Hay
una prueba que sube la tasa global y comprueba que el histórico no se mueve.

## 4. Roles, permisos y ámbito

Tres mecanismos distintos, deliberadamente separados:

1. **Rol** (`domain/roles.ts`) — los once del documento, cada uno con su
   superficie, su nivel de ámbito, si exige MFA, si nace por invitación y si
   puede ver datos bancarios.
2. **Permiso** (`domain/permissions.ts`) — cadenas `modulo:accion`. Se
   consulta con `puede(rol, permiso)`; ninguna pantalla decide por su cuenta
   si un botón se muestra.
3. **Ámbito** (`domain/scope.ts`) — resuelve qué parques, negocios y locales
   alcanza un usuario y filtra las colecciones **antes** de que lleguen a la
   vista. Una tabla que recibe datos ya filtrados no puede filtrar de menos.

### Protección de rutas

`app/registry.ts` declara para cada vista qué roles la ven. `app/router.ts`
evalúa la ruta contra la sesión activa y devuelve uno de cinco resultados:
`ok`, `no_encontrada` (404), `sin_sesion`, `mfa_pendiente` o `prohibida`
(403). Escribir la URL de un módulo prohibido produce 403 con un botón de
regreso al inicio del rol; ocultar el enlace no es el control.

### Datos bancarios

Dos niveles, no uno (`domain/masking.ts`):

- Roles autorizados reciben el número **enmascarado** (últimos cuatro dígitos).
- Inspector, Soporte, Operador y Administrador de parque **no reciben el
  campo**: `proyectarCuenta` devuelve `{ visible: false }` y elimina el objeto,
  en lugar de sustituirlo por asteriscos.

La diferencia importa: un campo presente aunque enmascarado sigue confirmando
que el negocio tiene cuenta en tal banco.

## 5. Acciones sensibles

`domain/sensitive-actions.ts` declara en un solo sitio qué exige cada acción:
confirmación, motivo, evidencia, MFA y segunda aprobación. La interfaz
consulta `requisitosDe()` para armar el modal y `validarAccion()` para
autorizar.

Cubre cambio de cuenta bancaria, reembolsos, ajustes financieros, cierres
excepcionales, suspensión de negocios y permisos, cambios de rol, notas de
crédito, cierre de liquidación y edición de reglas globales.

Dos reglas transversales:

- Un reembolso igual o superior a **50 USD** pasa a exigir doble aprobación y
  MFA automáticamente.
- Nadie puede aprobarse a sí mismo: el aprobador debe tener un rol distinto
  del solicitante.

### Registros que no se borran ni se editan

`ENTIDADES_INMUTABLES` cubre auditoría, cierres, turnos cerrados,
liquidaciones cerradas, facturas emitidas y pagos confirmados. `exigirMutable`
lanza `OperacionProhibida` con el mensaje que indica la vía correcta: ajuste,
reverso, nota de crédito o débito, o nueva versión.

No existe función de borrado en `data/audit.ts`. La ausencia es el control.

## 6. Auditoría

Bitácora append-only con quién, qué cambió, cuándo, desde qué rol y ámbito,
con qué motivo, qué evidencia, si hubo MFA y quién aprobó. Se consulta con
filtros por fecha, rol, usuario, entidad, acción y texto libre.

## 7. Conectividad y cola

Tres modos: `conectado`, `degradado` y `sin_conexion` (sección 06:
«conectividad degradada no es todo offline»).

`conectividad.puedePrometer()` devuelve `false` fuera del modo conectado para
pago confirmado, factura emitida y liquidación conciliada. La interfaz debe
mostrarlos como pendientes de sincronización.

La cola (`net/sync-queue.ts`) admite acciones operativas: aceptar, preparar,
marcar listo, entregar, cambiar disponibilidad, venta de mostrador e
inspección. Cada entrada lleva clave de idempotencia y la versión del registro
al encolar. Al sincronizar:

- si la versión coincide → se aplica;
- si cambió → **conflicto**, con valor esperado y valor actual, resoluble
  descartando o reintentando sobre el estado actual;
- si el registro desapareció → error.

## 8. Adaptadores simulados

Cada integración es una interfaz en `adapters/index.ts` con una implementación
simulada en `adapters/simulados.ts`. Ninguna hace peticiones de red.

| Adaptador | Identificador | Comportamiento en la demo |
| --- | --- | --- |
| Banco | `banco.simulado` | Pago Móvil y transferencia nacen **pendientes de verificación**; nunca se acepta la captura como prueba final. Idempotencia por clave. Una referencia de solo ceros fuerza el fallo. |
| Efectivo | `caja.local` | Se confirma en el punto, no por el banco. |
| Facturación | `fiscal.simulado` | Documento de prueba emitido por el comercio, nunca por INPARQUES. |
| Mensajería | `mensajeria.simulada` | No envía nada: registra en una bandeja local. |
| Tasa BCV | `tasa.simulada` | Valor de demostración con fecha y hora. |
| MFA | `mfa.simulado` | Único código válido: `123456`. |
| Evidencias | `archivos.simulado` | Guarda en memoria del navegador. |

Sustituir un simulador por un proveedor real es implementar la misma interfaz;
el resto del sistema no cambia.

## 9. Capa de interfaz

Las plantillas del cliente no llegaron, así que la capa visual es **provisional**
y está deliberadamente aislada para poder sustituirla:

| Archivo | Responsabilidad |
| --- | --- |
| `ui/estilos.css` | Tokens de color, tipografía y espacio; mobile-first |
| `ui/componentes.ts` | Piezas reutilizables (tarjeta, tabla, insignia, hoja) |
| `ui/shell.ts` | Cabecera, barra inferior y lateral por superficie |
| `ui/vistas/*.ts` | Una función por pantalla; devuelve marcado |
| `ui/acciones.ts` | Un único escuchador delegado: `data-accion` |
| `ui/operaciones.ts` | Donde las tres superficies escriben el mismo estado |

Las vistas no escriben el estado directamente: llaman a `operaciones.ts`, que
respeta las máquinas de estado y deja auditoría. Por eso lo que hace el
operador aparece en el visitante sin ningún mecanismo de sincronización.

Decisiones de teléfono, que el encargo pedía explícitamente:

- Acciones principales en barra inferior y hojas que suben desde abajo, dentro
  del alcance del pulgar.
- Áreas táctiles de 44 px mínimo; la barra inferior mide 60 px.
- Entradas a 16 px, que es lo que impide el zoom automático de iOS al enfocar.
- `env(safe-area-inset-*)` para el notch y el indicador inferior.
- Tablas con `overflow-x: auto` en su propia caja: el cuerpo nunca rueda en
  horizontal.
- Zoom del navegador permitido: no hay `maximum-scale` ni `user-scalable=no`.

## 10. Pruebas

`npm test` — 78 pruebas en cinco archivos:

| Archivo | Cubre |
| --- | --- |
| `permisos.test.ts` | Los 11 roles, MFA obligatorio, invitación, enmascarado bancario, rutas sin duplicar, emparejamiento con parámetros, módulos prohibidos por rol |
| `carrito.test.ts` | Un solo comercio por carrito, modal de conflicto, agotados, stock, modificadores obligatorios, totales |
| `estados-y-controles.test.ts` | Las cuatro máquinas de estado, acciones sensibles, inmutabilidad, auditoría, regla monetaria, ámbitos, coherencia de los datos iniciales |
| `conectividad.test.ts` | Modos de conexión, cola, idempotencia, conflictos, adaptadores simulados |
| `cobertura-vistas.test.ts` | Que ninguna ruta quede sin vista ni ninguna vista sin ruta |

`npm run verificar` — 58 comprobaciones en Chromium real a 390 × 844, con
`isMobile` y `hasTouch` activos: entrada con los 11 perfiles, compra completa
de principio a fin, modal de un solo comercio, avance del pedido reflejado en
el visitante, disponibilidad cruzada, venta de mostrador, siete rutas
prohibidas, enmascarado bancario, aprobación de expediente, auditoría,
inmutabilidad de cierres, cola sin conexión, índice técnico, ausencia de
desbordamiento en móvil, tablet y escritorio, y consola limpia.

## 11. Lo que falta

El aspecto. Cuando lleguen las plantillas:

1. Colocarlas en `plantillas-originales/` sin modificarlas.
2. Asociar cada archivo a su entrada del registro (`htmlRef`) y crear las
   entradas que falten.
3. Sustituir el marcado de `ui/vistas/` por el original, conservando los
   atributos `data-accion` que ya conectan cada control con su operación.
4. Avanzar el estado de cada vista a `conectada` y luego a `revisada`, y
   regenerar la matriz con `npm run matriz`.

El núcleo no cambia en ninguno de esos pasos.
