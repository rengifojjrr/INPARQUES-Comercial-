# Mapeo de páginas Stitch por rol

El cliente entregó 125 carpetas repartidas en tres lotes (`50/`, `los 25/` y
`stitch_inparques_comercial_portal_visitante/`). De esas, 119 son pantallas de
producto reales con `code.html` + `screen.png`; las 6 restantes son
colateral de marketing (tarjeta social, banner, encabezado de correo,
copy de lanzamiento) y `DESIGN.md`, que no son pantallas de la aplicación.

Los 119 `code.html` comparten **exactamente** el mismo bloque
`tailwind.config` (colores, spacing, radios, tipografía) — verificado
programáticamente comparando los 119 archivos, no a simple vista. Es un solo
sistema de diseño, documentado también en `50/ecological_institutionalism/DESIGN.md`.

No existe entre las 119 una pantalla literal de "selector de perfiles de
demostración": eso es específico de esta demo y se construyó reutilizando los
mismos componentes (tarjetas, tipografía, espaciado) de las páginas reales,
no un patrón que Stitch haya generado.

## Identidad de portal → rol real

Cada página se identifica por su `<title>`, su `<h1>` y, cuando tiene barra
lateral fija, por el conjunto de rótulos de navegación (que es el criterio
más confiable: dos páginas con la barra lateral idéntica pertenecen al mismo
rol). Con eso se agrupan las 119 páginas en once identidades de portal, una
por rol:

| Identidad de portal (título / h1) | Rol |
| --- | --- |
| "INPARQUES Comercial" (sin barra lateral, layout móvil) | `visitante.cliente` |
| "Portal de Concesionarios" | `comercio.propietario` |
| "Portal Admin" / "Gestión de Parques" (nav: Inicio, Zonas y puntos, Negocios, Operación, Horarios, Incidencias, Inspecciones, Desempeño, Usuarios locales) — **cuidado**: esta identidad de portal cubre tanto pantallas de `comercio.admin_local` como de `inparques.admin_parque`; se distinguen por el contenido, no por el rótulo | `comercio.admin_local` / `inparques.admin_parque` (ver nota) |
| "Operaciones Parque" | `comercio.operador` |
| "Park Commerce Finance" / "Finance Portal" | `comercio.contador` |
| "Inparques Ranger" | `inparques.inspector` |
| "INPARQUES Control Panel" (nav en inglés: National Home, Territorial Structure, Parks, Businesses, Users/Roles, Global Rules, Integrations, Audit, Security, Configuration) | `inparques.superadmin` |
| "Gestión Comercial" (nav: Resumen Comercial, Solicitudes, Expedientes, Contratos y Permisos, Puntos Comerciales, Condiciones Económicas, Prórrogas, Inspecciones, Reportes) | `inparques.direccion_comercial` |
| "INPARQUES" + nav financiero (Financial Overview, Sales, Reconciliation, Fees/Commissions, Accounts Receivable, Daily Closings, Refunds, Adjustments, Audit, Exports) | `inparques.finanzas` |
| "INPARQUES" / "Support & Dispute Portal" + nav de soporte (Inbox, Assigned Cases, Orders, Disputes, Requested Refunds, SLA, Knowledge Base, Reports) | `inparques.soporte` |

> Nota sobre "Portal Admin": Stitch generó tanto la vista del **administrador
> de local de un comercio** como la del **administrador de parque de
> INPARQUES** bajo una estética de portal muy similar ("Gestión de Parques" /
> "Portal Admin"). Se distinguen por el contenido de cada pantalla (una
> gestiona un local propio; la otra, todos los negocios de un parque), no por
> el rótulo de cabecera. Cada página se clasifica leyendo su contenido antes
> de asignarla.

## Página de inicio real por rol (11 confirmadas)

Estas 11 páginas se identificaron con alta confianza por nombre de carpeta,
`<title>` y `<h1>`, y son la base de la pantalla de inicio de cada perfil de
demostración:

| Rol | Carpeta | Título original |
| --- | --- | --- |
| `visitante.cliente` | `50/p_gina_2_inicio_del_parque` | INPARQUES Comercial - Inicio |
| `comercio.propietario` | `50/p_gina_1_inicio_y_estado_de_habilitaci_n` | Portal de Concesionarios - Dashboard |
| `comercio.admin_local` | `50/p_gina_1_resumen_operativo` | Parques Nacionales - Resumen Operativo |
| `comercio.operador` | `50/p_gina_1_turno_operativo` | Inicio de Turno |
| `comercio.contador` | `los 25/resumen_financiero_contador` | Resumen Financiero - Park Commerce Finance |
| `inparques.superadmin` | `50/p_gina_1_dashboard_nacional` | INPARQUES Control Panel - National Dashboard |
| `inparques.direccion_comercial` | `50/p_gina_1_resumen_comercial` | Resumen Comercial - Parques Nacionales |
| `inparques.finanzas` | `50/p_gina_1_dashboard_financiero_nacional` | INPARQUES - Dashboard Financiero Nacional |
| `inparques.admin_parque` | `50/p_gina_1_dashboard_del_parque` | Parques Nacionales Admin - Dashboard |
| `inparques.inspector` | `50/p_gina_1_jornada_de_inspecci_n` | Jornada de Inspección - Inparques Ranger |
| `inparques.soporte` | `50/p_gina_1_bandeja_de_soporte` | Bandeja de Soporte - INPARQUES |

## Estado de la integración

**Fase 1 (completa):** infraestructura compartida (Tailwind compilado con los
tokens reales, tipografía Manrope y subconjunto de Material Symbols
autohospedados) + pantalla de entrada con los 11 perfiles + la pantalla de
inicio real de los 11 roles, con su HTML original, con datos reales del
store (nada de números de maqueta) y respetando el control de acceso por
ámbito ya existente en la app (`domain/scope.ts`).

Dos correcciones técnicas se repitieron en varios roles y quedaron resueltas
de forma reutilizable en `src/ui/stitch-shell.ts` (`conCajonMovil`) en vez de
una por una:

- El cajón lateral móvil no se ocultaba porque el `<aside>` de Stitch trae
  `hidden md:flex` (su propia estrategia, incompleta, para no romper el
  layout en móvil). `hidden` fija `display:none`, que gana sobre cualquier
  `transform`. Ahora `conCajonMovil` quita `hidden`/`(sm|md|lg|xl):flex`
  automáticamente.
- `inparques.inspector` traía `<body class="... md:hidden ...">`: sin
  versión de escritorio en absoluto, la pantalla quedaba en blanco en
  cualquier ventana ≥768px. Se quitó esa clase y el contenido se centra en
  una columna de ancho móvil en pantallas grandes en lugar de desaparecer.

Varios roles institucionales (dirección comercial, admin de parque,
soporte) tienen en su barra lateral original enlaces a rutas que el
control de acceso de esta app (`app/registry.ts`) no les permite abrir
(p. ej. "Inspecciones" o "Usuarios" son de otros roles, "Ajustes" es
finanzas, no configuración general). En esos casos el enlace se llevó a la
página accesible más cercana en vez de a un enlace que daría 403; queda
anotado con un comentario en cada archivo.

**Fase 2 (en curso):** las pantallas interiores de cada rol (catálogo, caja,
expedientes, disputas, reportes, etc.), que hasta ahora seguían usando la
vista genérica anterior en vez del HTML real de Stitch. Se portan
progresivamente reutilizando la misma infraestructura ya construida en la
fase 1 (fuentes, Tailwind, `conCajonMovil`, `avatar`/`marcadorFoto` en vez
de fotos generadas por IA) — portar cada pantalla adicional es un trabajo
mecánico, no una reconstrucción desde cero.

Avance de fase 2:

- **Completo:** recorrido de compra del visitante de punta a punta (ficha
  del comercio, catálogo, producto, servicio, carrito, checkout, métodos de
  pago, seguimiento de pedido/reserva) — `src/ui/vistas/stitch-visitante-compra.ts`.
- **Completo:** interior de `comercio.propietario` — expediente (fusiona
  `50/p_gina_2_mis_negocios` y `50/p_gina_3_detalle_del_negocio`, adaptado a
  "un local = una tarjeta" porque el modelo de datos da un solo negocio por
  propietario), documentos, permisos, contratos, cobro y cuenta bancaria,
  equipo, catálogo — `src/ui/vistas/stitch-comercio-interior.ts`. No hay
  página de Stitch dedicada a "Permisos" ni "Contratos" para este rol (la
  única carpeta con esos nombres es del portal de
  `inparques.direccion_comercial`, con otra barra lateral); esas dos vistas
  se armaron con el mismo lenguaje visual de las páginas de propietario ya
  confirmadas.
- **Completo:** operación diaria del comercio (pedidos, reservas, caja,
  venta de mostrador, apertura y cierre de turno) —
  `src/ui/vistas/stitch-comercio-operacion.ts`. Stitch generó dos vistas
  distintas del mismo módulo de pedidos: el tablero kanban de escritorio
  (`50/p_gina_2_centro_de_pedidos_tablero`) y la cola móvil por pestañas
  (`50/p_gina_2_cola_de_pedidos`, del portal "Operaciones Parque"). Se
  respetan ambas: el operador ve la cola, los demás roles ven el tablero.
- **Completo:** finanzas del comercio (reportes, conciliación, comprobantes,
  facturas, estado de cuenta, ajustes, exportaciones) —
  `src/ui/vistas/stitch-comercio-finanzas.ts`, del portal "Park Commerce
  Finance". La barra lateral de ese portal está en inglés en el original y
  se conserva tal cual: es el rótulo real, no una traducción pendiente.
- **Completo:** territorio y registro de INPARQUES (estructura territorial,
  parques, ficha del parque, zonas, puntos, directorio de negocios,
  expediente del negocio, usuarios, roles, ámbitos, sesiones, reglas
  globales, integraciones, auditoría) —
  `src/ui/vistas/stitch-inparques-interior.ts`. Estas rutas las comparten
  varios roles institucionales; cada uno conserva la barra lateral que
  Stitch le dibujó, y el control de acceso por rol de `app/registry.ts`
  sigue devolviendo 403 donde corresponde.
- **Pendiente:** catálogo avanzado del comercio (variantes, modificadores,
  alérgenos, horarios, cupos, inventario); módulos de concesiones,
  operación, finanzas y soporte de INPARQUES (solicitudes, revisión
  documental, aprobaciones, permisos, contratos, cánones, inspecciones,
  incidencias, contabilidad, conciliación, cuentas por cobrar, cierres,
  reembolsos, disputas, SLA); interior de `inparques.inspector`, que en el
  original es una superficie móvil sin barra lateral y necesita su propia
  envoltura.
