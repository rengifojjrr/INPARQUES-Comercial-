# Matriz de cobertura de vistas

> Generado automaticamente por `npm run matriz` desde `src/app/registry.ts`.
> No editar a mano: los cambios se pierden en la siguiente generacion.

## Estado general

| Concepto | Valor |
| --- | --- |
| Rutas registradas | 139 |
| Vistas segun el enunciado | 119 |
| Diferencia por reconciliar | +20 |
| Compartidas | 27 |
| Visitante | 33 |
| Comercio | 39 |
| INPARQUES | 40 |

| Estado | Vistas |
| --- | --- |
| Pendiente de HTML | 0 |
| Implementada | 139 |
| Conectada | 0 |
| Revisada | 0 |
| Bloqueada | 0 |

**Nota sobre la diferencia.** Las plantillas HTML todavia no estan en el
repositorio. Las rutas listadas se derivaron del documento funcional y de los
recorridos descritos en el encargo; la cifra de 119
vistas proviene del enunciado. La reconciliacion solo puede hacerse comparando
esta tabla con los archivos entregados.


## Compartidas (acceso, identidad, estados, conectividad) — 27 vistas


### Acceso

| Ruta | Vista | Roles autorizados | HTML de referencia | Estado |
| --- | --- | --- | --- | --- |
| `/acceso` | Selector de perfiles de demostracion | Publica | — | Implementada |
| `/acceso/visitante` | Ingreso de visitante | Publica | — | Implementada |
| `/acceso/comercio` | Ingreso de comercio | Publica | — | Implementada |
| `/acceso/inparques` | Ingreso institucional | Publica | — | Implementada |
| `/registro/visitante` | Registro de visitante | Publica | — | Implementada |
| `/registro/invitado` | Continuar como invitado | Publica | — | Implementada |
| `/invitacion/comercio` | Invitacion de usuario de comercio | Publica | — | Implementada |
| `/invitacion/comercio/activar` | Activacion de usuario de comercio | Publica | — | Implementada |
| `/invitacion/institucional` | Activacion institucional por invitacion | Publica | — | Implementada |
| `/mfa` | Verificacion de segundo factor | Todos | — | Implementada |
| `/mfa/configurar` | Configuracion de segundo factor | Todos | — | Implementada |
| `/acceso/recuperar` | Recuperacion de acceso | Publica | — | Implementada |
| `/acceso/recuperar/codigo` | Codigo de recuperacion | Publica | — | Implementada |
| `/acceso/recuperar/nueva-clave` | Nueva contrasena | Publica | — | Implementada |

### Cuenta

| Ruta | Vista | Roles autorizados | HTML de referencia | Estado |
| --- | --- | --- | --- | --- |
| `/sesiones` | Mis sesiones activas | Todos | — | Implementada |
| `/notificaciones` | Centro de notificaciones | Todos | — | Implementada |
| `/perfil` | Perfil | Todos | — | Implementada |
| `/perfil/accesibilidad` | Accesibilidad | Todos | — | Implementada |
| `/perfil/privacidad` | Privacidad y datos | Todos | — | Implementada |
| `/ayuda` | Ayuda | Todos | — | Implementada |

### Estados

| Ruta | Vista | Roles autorizados | HTML de referencia | Estado |
| --- | --- | --- | --- | --- |
| `/error/403` | Acceso no autorizado | Todos | — | Implementada |
| `/error/404` | Pagina no encontrada | Todos | — | Implementada |
| `/error/sesion-vencida` | Sesion vencida | Publica | — | Implementada |
| `/error/mantenimiento` | Mantenimiento | Publica | — | Implementada |

### Conectividad

| Ruta | Vista | Roles autorizados | HTML de referencia | Estado |
| --- | --- | --- | --- | --- |
| `/conexion/degradada` | Conexion degradada | Todos | — | Implementada |
| `/conexion/cola` | Cola de sincronizacion | Propietario legal; Administrador de local; Operador / cocina / servicio; Contador; Superadministrador nacional; Dirección comercial / concesiones; Finanzas / auditoría; Administrador de parque; Inspector / guardaparque; Soporte / disputas | — | Implementada |
| `/conexion/conflicto` | Conflicto de sincronizacion | Propietario legal; Administrador de local; Operador / cocina / servicio; Contador; Superadministrador nacional; Dirección comercial / concesiones; Finanzas / auditoría; Administrador de parque; Inspector / guardaparque; Soporte / disputas | — | Implementada |

## Visitante — PWA movil — 33 vistas


### Descubrimiento

| Ruta | Vista | Roles autorizados | HTML de referencia | Estado |
| --- | --- | --- | --- | --- |
| `/v` | Inicio | Publica | — | Implementada |
| `/v/qr` | Escanear QR del parque | Publica | — | Implementada |
| `/v/parques` | Elegir parque | Publica | — | Implementada |
| `/v/parque/:parqueId` | Inicio del parque | Publica | — | Implementada |
| `/v/buscar` | Buscar | Publica | — | Implementada |
| `/v/categorias` | Categorias | Publica | — | Implementada |
| `/v/filtros` | Filtros | Publica | — | Implementada |
| `/v/mapa/:parqueId` | Mapa esquematico de zonas | Publica | — | Implementada |
| `/v/zona/:zonaId` | Zona | Publica | — | Implementada |

### Oferta

| Ruta | Vista | Roles autorizados | HTML de referencia | Estado |
| --- | --- | --- | --- | --- |
| `/v/comercio/:negocioId` | Ficha del comercio | Publica | — | Implementada |
| `/v/comercio/:negocioId/catalogo` | Menu o catalogo | Publica | — | Implementada |
| `/v/articulo/:articuloId` | Detalle y personalizacion | Publica | — | Implementada |
| `/v/servicio/:articuloId` | Reserva de servicio | Publica | — | Implementada |
| `/v/como-llegar/:localId` | Como llegar | Publica | — | Implementada |

### Compra

| Ruta | Vista | Roles autorizados | HTML de referencia | Estado |
| --- | --- | --- | --- | --- |
| `/v/carrito` | Carrito | Publica | — | Implementada |
| `/v/checkout` | Checkout | Publica | — | Implementada |
| `/v/checkout/cumplimiento` | Metodo de cumplimiento | Publica | — | Implementada |
| `/v/checkout/pago` | Seleccion de pago | Publica | — | Implementada |
| `/v/checkout/pago/pago-movil` | Pago Movil | Publica | — | Implementada |
| `/v/checkout/pago/transferencia` | Transferencia | Publica | — | Implementada |
| `/v/checkout/pago/tarjeta` | Tarjeta | Publica | — | Implementada |
| `/v/checkout/pago/efectivo` | Efectivo en el punto | Publica | — | Implementada |
| `/v/checkout/confirmacion` | Confirmacion | Publica | — | Implementada |

### Seguimiento

| Ruta | Vista | Roles autorizados | HTML de referencia | Estado |
| --- | --- | --- | --- | --- |
| `/v/pedido/:ordenId` | Seguimiento del pedido | Publica | — | Implementada |
| `/v/reserva/:ordenId` | Seguimiento de la reserva | Publica | — | Implementada |
| `/v/pedido/:ordenId/qr` | Codigo de retiro | Publica | — | Implementada |

### Cuenta

| Ruta | Vista | Roles autorizados | HTML de referencia | Estado |
| --- | --- | --- | --- | --- |
| `/v/historial` | Historial | Visitante / cliente | — | Implementada |
| `/v/comprobante/:ordenId` | Comprobante de pedido | Publica | — | Implementada |
| `/v/factura/:ordenId` | Factura del comercio | Publica | — | Implementada |
| `/v/valorar/:ordenId` | Valorar | Visitante / cliente | — | Implementada |
| `/v/reclamo/:ordenId` | Abrir reclamo | Publica | — | Implementada |
| `/v/reclamos` | Mis reclamos | Visitante / cliente | — | Implementada |
| `/v/perfil` | Mi perfil | Visitante / cliente | — | Implementada |

## Comercio — portal — 39 vistas


### Panel

| Ruta | Vista | Roles autorizados | HTML de referencia | Estado |
| --- | --- | --- | --- | --- |
| `/c` | Inicio del comercio | Propietario legal; Administrador de local; Operador / cocina / servicio; Contador | — | Implementada |
| `/c/mas` | Todos los módulos | Propietario legal; Administrador de local; Operador / cocina / servicio; Contador | — | Implementada |
| `/c/valoraciones` | Valoraciones de clientes | Propietario legal; Administrador de local; Operador / cocina / servicio; Contador | — | Implementada |

### Registro

| Ruta | Vista | Roles autorizados | HTML de referencia | Estado |
| --- | --- | --- | --- | --- |
| `/c/expediente` | Expediente del negocio | Propietario legal; Administrador de local; Contador | — | Implementada |
| `/c/expediente/documentos` | Documentos y vigencias | Propietario legal; Administrador de local | — | Implementada |
| `/c/expediente/documento/:documentoId` | Detalle de documento | Propietario legal; Administrador de local | — | Implementada |
| `/c/permisos` | Permisos y concesiones | Propietario legal; Administrador de local | — | Implementada |
| `/c/contratos` | Contratos | Propietario legal; Contador | — | Implementada |
| `/c/contrato/:contratoId` | Condiciones economicas | Propietario legal; Contador | — | Implementada |
| `/c/cobro` | Configuracion de cobro | Propietario legal; Contador | — | Implementada |
| `/c/cobro/cuenta-bancaria` | Cuenta bancaria | Propietario legal | — | Implementada |
| `/c/equipo` | Equipo y accesos | Propietario legal; Administrador de local | — | Implementada |
| `/c/equipo/invitar` | Invitar integrante | Propietario legal | — | Implementada |
| `/c/equipo/:usuarioId` | Detalle de integrante | Propietario legal; Administrador de local | — | Implementada |

### Oferta

| Ruta | Vista | Roles autorizados | HTML de referencia | Estado |
| --- | --- | --- | --- | --- |
| `/c/catalogo` | Catalogo | Propietario legal; Administrador de local; Operador / cocina / servicio | — | Implementada |
| `/c/catalogo/articulo/:articuloId` | Articulo o servicio | Propietario legal; Administrador de local | — | Implementada |
| `/c/catalogo/articulo/:articuloId/variantes` | Variantes | Propietario legal; Administrador de local | — | Implementada |
| `/c/catalogo/articulo/:articuloId/modificadores` | Modificadores | Propietario legal; Administrador de local | — | Implementada |
| `/c/catalogo/alergenos` | Alergenos | Propietario legal; Administrador de local | — | Implementada |
| `/c/horarios` | Horarios | Propietario legal; Administrador de local | — | Implementada |
| `/c/cupos` | Cupos de servicios | Propietario legal; Administrador de local | — | Implementada |
| `/c/inventario` | Inventario basico | Propietario legal; Administrador de local | — | Implementada |

### Operacion

| Ruta | Vista | Roles autorizados | HTML de referencia | Estado |
| --- | --- | --- | --- | --- |
| `/c/pedidos` | Pedidos | Propietario legal; Administrador de local; Operador / cocina / servicio; Contador | — | Implementada |
| `/c/pedido/:ordenId` | Detalle del pedido | Propietario legal; Administrador de local; Operador / cocina / servicio; Contador | — | Implementada |
| `/c/reservas` | Reservas | Propietario legal; Administrador de local; Operador / cocina / servicio; Contador | — | Implementada |
| `/c/reserva/:ordenId` | Detalle de la reserva | Propietario legal; Administrador de local; Operador / cocina / servicio; Contador | — | Implementada |

### Caja

| Ruta | Vista | Roles autorizados | HTML de referencia | Estado |
| --- | --- | --- | --- | --- |
| `/c/caja` | Caja | Propietario legal; Administrador de local; Operador / cocina / servicio; Contador | — | Implementada |
| `/c/caja/venta-mostrador` | Venta de mostrador | Propietario legal; Administrador de local; Operador / cocina / servicio | — | Implementada |
| `/c/caja/turno/abrir` | Apertura de turno | Propietario legal; Administrador de local; Operador / cocina / servicio | — | Implementada |
| `/c/caja/turno/cerrar` | Cierre de turno | Propietario legal; Administrador de local | — | Implementada |
| `/c/caja/turno/:turnoId` | Detalle del turno | Propietario legal; Administrador de local; Contador | — | Implementada |

### Finanzas

| Ruta | Vista | Roles autorizados | HTML de referencia | Estado |
| --- | --- | --- | --- | --- |
| `/c/reportes` | Reportes | Propietario legal; Administrador de local; Contador | — | Implementada |
| `/c/conciliacion` | Conciliacion | Propietario legal; Contador | — | Implementada |
| `/c/comprobantes` | Comprobantes | Propietario legal; Contador | — | Implementada |
| `/c/facturas` | Facturas | Propietario legal; Contador | — | Implementada |
| `/c/factura/:facturaId` | Detalle de factura | Propietario legal; Contador | — | Implementada |
| `/c/estado-cuenta` | Estado de cuenta | Propietario legal; Contador | — | Implementada |
| `/c/ajustes` | Solicitudes de ajuste | Propietario legal; Contador | — | Implementada |
| `/c/exportaciones` | Exportaciones | Propietario legal; Contador | — | Implementada |

## INPARQUES — panel institucional — 40 vistas


### Tableros

| Ruta | Vista | Roles autorizados | HTML de referencia | Estado |
| --- | --- | --- | --- | --- |
| `/i` | Dashboard nacional | Superadministrador nacional; Dirección comercial / concesiones; Finanzas / auditoría; Administrador de parque; Inspector / guardaparque; Soporte / disputas | — | Implementada |
| `/i/mas` | Todos los módulos | Superadministrador nacional; Dirección comercial / concesiones; Finanzas / auditoría; Administrador de parque; Inspector / guardaparque; Soporte / disputas | — | Implementada |
| `/i/dashboard/parque/:parqueId` | Dashboard por parque | Superadministrador nacional; Dirección comercial / concesiones; Finanzas / auditoría; Administrador de parque; Inspector / guardaparque; Soporte / disputas | — | Implementada |
| `/i/reportes` | Reportes | Superadministrador nacional; Dirección comercial / concesiones; Finanzas / auditoría; Administrador de parque; Inspector / guardaparque; Soporte / disputas | — | Implementada |

### Territorio

| Ruta | Vista | Roles autorizados | HTML de referencia | Estado |
| --- | --- | --- | --- | --- |
| `/i/territorio` | Estructura territorial | Superadministrador nacional; Dirección comercial / concesiones; Finanzas / auditoría; Administrador de parque; Inspector / guardaparque; Soporte / disputas | — | Implementada |
| `/i/parques` | Parques | Superadministrador nacional; Dirección comercial / concesiones; Finanzas / auditoría; Administrador de parque; Inspector / guardaparque; Soporte / disputas | — | Implementada |
| `/i/parque/:parqueId` | Detalle del parque | Superadministrador nacional; Dirección comercial / concesiones; Finanzas / auditoría; Administrador de parque; Inspector / guardaparque; Soporte / disputas | — | Implementada |
| `/i/zonas` | Zonas | Superadministrador nacional; Dirección comercial / concesiones; Finanzas / auditoría; Administrador de parque; Inspector / guardaparque; Soporte / disputas | — | Implementada |
| `/i/puntos` | Puntos comerciales | Superadministrador nacional; Dirección comercial / concesiones; Finanzas / auditoría; Administrador de parque; Inspector / guardaparque; Soporte / disputas | — | Implementada |

### Concesiones

| Ruta | Vista | Roles autorizados | HTML de referencia | Estado |
| --- | --- | --- | --- | --- |
| `/i/negocios` | Directorio de negocios | Superadministrador nacional; Dirección comercial / concesiones; Finanzas / auditoría; Administrador de parque; Inspector / guardaparque; Soporte / disputas | — | Implementada |
| `/i/negocio/:negocioId` | Detalle del negocio | Superadministrador nacional; Dirección comercial / concesiones; Finanzas / auditoría; Administrador de parque; Inspector / guardaparque; Soporte / disputas | — | Implementada |
| `/i/solicitudes` | Solicitudes y expedientes | Superadministrador nacional; Dirección comercial / concesiones; Administrador de parque | — | Implementada |
| `/i/expediente/:negocioId` | Expediente | Superadministrador nacional; Dirección comercial / concesiones; Administrador de parque | — | Implementada |
| `/i/revision-documental/:negocioId` | Revision documental | Superadministrador nacional; Dirección comercial / concesiones; Administrador de parque | — | Implementada |
| `/i/aprobaciones` | Aprobaciones | Superadministrador nacional; Dirección comercial / concesiones | — | Implementada |
| `/i/permisos` | Permisos y concesiones | Superadministrador nacional; Dirección comercial / concesiones; Inspector / guardaparque; Administrador de parque | — | Implementada |
| `/i/contratos` | Contratos | Superadministrador nacional; Dirección comercial / concesiones; Finanzas / auditoría | — | Implementada |
| `/i/canones` | Canones y comisiones | Superadministrador nacional; Dirección comercial / concesiones; Finanzas / auditoría | — | Implementada |
| `/i/vencimientos` | Vencimientos | Superadministrador nacional; Dirección comercial / concesiones; Administrador de parque | — | Implementada |

### Control

| Ruta | Vista | Roles autorizados | HTML de referencia | Estado |
| --- | --- | --- | --- | --- |
| `/i/inspecciones` | Inspecciones | Superadministrador nacional; Inspector / guardaparque; Administrador de parque | — | Implementada |
| `/i/inspeccion/:inspeccionId` | Detalle de inspeccion | Superadministrador nacional; Inspector / guardaparque; Administrador de parque | — | Implementada |
| `/i/incidencias` | Incidencias | Superadministrador nacional; Inspector / guardaparque; Administrador de parque | — | Implementada |
| `/i/operacion` | Operacion del parque | Superadministrador nacional; Administrador de parque | — | Implementada |

### Finanzas

| Ruta | Vista | Roles autorizados | HTML de referencia | Estado |
| --- | --- | --- | --- | --- |
| `/i/contabilidad` | Contabilidad | Superadministrador nacional; Finanzas / auditoría | — | Implementada |
| `/i/conciliacion` | Conciliacion | Superadministrador nacional; Finanzas / auditoría | — | Implementada |
| `/i/cuentas-por-cobrar` | Cuentas por cobrar | Superadministrador nacional; Finanzas / auditoría | — | Implementada |
| `/i/cierres` | Cierres | Superadministrador nacional; Finanzas / auditoría | — | Implementada |
| `/i/reembolsos` | Reembolsos | Superadministrador nacional; Finanzas / auditoría; Soporte / disputas | — | Implementada |
| `/i/ajustes` | Ajustes | Superadministrador nacional; Finanzas / auditoría | — | Implementada |

### Soporte

| Ruta | Vista | Roles autorizados | HTML de referencia | Estado |
| --- | --- | --- | --- | --- |
| `/i/disputas` | Disputas | Superadministrador nacional; Soporte / disputas | — | Implementada |
| `/i/valoraciones` | Valoraciones y moderacion | Superadministrador nacional; Soporte / disputas; Dirección comercial / concesiones | — | Implementada |
| `/i/disputa/:disputaId` | Detalle de disputa | Superadministrador nacional; Soporte / disputas | — | Implementada |
| `/i/sla` | SLA de soporte | Superadministrador nacional; Soporte / disputas | — | Implementada |

### Administracion

| Ruta | Vista | Roles autorizados | HTML de referencia | Estado |
| --- | --- | --- | --- | --- |
| `/i/auditoria` | Bitacora de auditoria | Superadministrador nacional; Finanzas / auditoría; Dirección comercial / concesiones | — | Implementada |
| `/i/usuarios` | Usuarios | Superadministrador nacional; Dirección comercial / concesiones | — | Implementada |
| `/i/roles` | Roles y permisos | Superadministrador nacional | — | Implementada |
| `/i/ambitos` | Ambitos | Superadministrador nacional | — | Implementada |
| `/i/sesiones` | Sesiones | Superadministrador nacional | — | Implementada |
| `/i/reglas` | Reglas globales | Superadministrador nacional | — | Implementada |
| `/i/integraciones` | Integraciones | Superadministrador nacional | — | Implementada |
