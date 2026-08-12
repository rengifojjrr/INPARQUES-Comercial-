# Matriz de cobertura de vistas

> Generado automaticamente por `npm run matriz` desde `src/app/registry.ts`.
> No editar a mano: los cambios se pierden en la siguiente generacion.

## Estado general

| Concepto | Valor |
| --- | --- |
| Rutas registradas | 135 |
| Vistas segun el enunciado | 119 |
| Diferencia por reconciliar | +16 |
| Compartidas | 27 |
| Visitante | 33 |
| Comercio | 37 |
| INPARQUES | 38 |

| Estado | Vistas |
| --- | --- |
| Pendiente de HTML | 135 |
| Implementada | 0 |
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
| `/acceso` | Selector de perfiles de demostracion | Publica | — | Pendiente de HTML |
| `/acceso/visitante` | Ingreso de visitante | Publica | — | Pendiente de HTML |
| `/acceso/comercio` | Ingreso de comercio | Publica | — | Pendiente de HTML |
| `/acceso/inparques` | Ingreso institucional | Publica | — | Pendiente de HTML |
| `/registro/visitante` | Registro de visitante | Publica | — | Pendiente de HTML |
| `/registro/invitado` | Continuar como invitado | Publica | — | Pendiente de HTML |
| `/invitacion/comercio` | Invitacion de usuario de comercio | Publica | — | Pendiente de HTML |
| `/invitacion/comercio/activar` | Activacion de usuario de comercio | Publica | — | Pendiente de HTML |
| `/invitacion/institucional` | Activacion institucional por invitacion | Publica | — | Pendiente de HTML |
| `/mfa` | Verificacion de segundo factor | Todos | — | Pendiente de HTML |
| `/mfa/configurar` | Configuracion de segundo factor | Todos | — | Pendiente de HTML |
| `/acceso/recuperar` | Recuperacion de acceso | Publica | — | Pendiente de HTML |
| `/acceso/recuperar/codigo` | Codigo de recuperacion | Publica | — | Pendiente de HTML |
| `/acceso/recuperar/nueva-clave` | Nueva contrasena | Publica | — | Pendiente de HTML |

### Cuenta

| Ruta | Vista | Roles autorizados | HTML de referencia | Estado |
| --- | --- | --- | --- | --- |
| `/sesiones` | Mis sesiones activas | Todos | — | Pendiente de HTML |
| `/notificaciones` | Centro de notificaciones | Todos | — | Pendiente de HTML |
| `/perfil` | Perfil | Todos | — | Pendiente de HTML |
| `/perfil/accesibilidad` | Accesibilidad | Todos | — | Pendiente de HTML |
| `/perfil/privacidad` | Privacidad y datos | Todos | — | Pendiente de HTML |
| `/ayuda` | Ayuda | Todos | — | Pendiente de HTML |

### Estados

| Ruta | Vista | Roles autorizados | HTML de referencia | Estado |
| --- | --- | --- | --- | --- |
| `/error/403` | Acceso no autorizado | Todos | — | Pendiente de HTML |
| `/error/404` | Pagina no encontrada | Todos | — | Pendiente de HTML |
| `/error/sesion-vencida` | Sesion vencida | Publica | — | Pendiente de HTML |
| `/error/mantenimiento` | Mantenimiento | Publica | — | Pendiente de HTML |

### Conectividad

| Ruta | Vista | Roles autorizados | HTML de referencia | Estado |
| --- | --- | --- | --- | --- |
| `/conexion/degradada` | Conexion degradada | Todos | — | Pendiente de HTML |
| `/conexion/cola` | Cola de sincronizacion | Propietario legal; Administrador de local; Operador / cocina / servicio; Contador; Superadministrador nacional; Direccion comercial / concesiones; Finanzas / auditoria; Administrador de parque; Inspector / guardaparque; Soporte / disputas | — | Pendiente de HTML |
| `/conexion/conflicto` | Conflicto de sincronizacion | Propietario legal; Administrador de local; Operador / cocina / servicio; Contador; Superadministrador nacional; Direccion comercial / concesiones; Finanzas / auditoria; Administrador de parque; Inspector / guardaparque; Soporte / disputas | — | Pendiente de HTML |

## Visitante — PWA movil — 33 vistas


### Descubrimiento

| Ruta | Vista | Roles autorizados | HTML de referencia | Estado |
| --- | --- | --- | --- | --- |
| `/v` | Inicio | Publica | — | Pendiente de HTML |
| `/v/qr` | Escanear QR del parque | Publica | — | Pendiente de HTML |
| `/v/parques` | Elegir parque | Publica | — | Pendiente de HTML |
| `/v/parque/:parqueId` | Inicio del parque | Publica | — | Pendiente de HTML |
| `/v/buscar` | Buscar | Publica | — | Pendiente de HTML |
| `/v/categorias` | Categorias | Publica | — | Pendiente de HTML |
| `/v/filtros` | Filtros | Publica | — | Pendiente de HTML |
| `/v/mapa/:parqueId` | Mapa esquematico de zonas | Publica | — | Pendiente de HTML |
| `/v/zona/:zonaId` | Zona | Publica | — | Pendiente de HTML |

### Oferta

| Ruta | Vista | Roles autorizados | HTML de referencia | Estado |
| --- | --- | --- | --- | --- |
| `/v/comercio/:negocioId` | Ficha del comercio | Publica | — | Pendiente de HTML |
| `/v/comercio/:negocioId/catalogo` | Menu o catalogo | Publica | — | Pendiente de HTML |
| `/v/articulo/:articuloId` | Detalle y personalizacion | Publica | — | Pendiente de HTML |
| `/v/servicio/:articuloId` | Reserva de servicio | Publica | — | Pendiente de HTML |
| `/v/como-llegar/:localId` | Como llegar | Publica | — | Pendiente de HTML |

### Compra

| Ruta | Vista | Roles autorizados | HTML de referencia | Estado |
| --- | --- | --- | --- | --- |
| `/v/carrito` | Carrito | Publica | — | Pendiente de HTML |
| `/v/checkout` | Checkout | Publica | — | Pendiente de HTML |
| `/v/checkout/cumplimiento` | Metodo de cumplimiento | Publica | — | Pendiente de HTML |
| `/v/checkout/pago` | Seleccion de pago | Publica | — | Pendiente de HTML |
| `/v/checkout/pago/pago-movil` | Pago Movil | Publica | — | Pendiente de HTML |
| `/v/checkout/pago/transferencia` | Transferencia | Publica | — | Pendiente de HTML |
| `/v/checkout/pago/tarjeta` | Tarjeta | Publica | — | Pendiente de HTML |
| `/v/checkout/pago/efectivo` | Efectivo en el punto | Publica | — | Pendiente de HTML |
| `/v/checkout/confirmacion` | Confirmacion | Publica | — | Pendiente de HTML |

### Seguimiento

| Ruta | Vista | Roles autorizados | HTML de referencia | Estado |
| --- | --- | --- | --- | --- |
| `/v/pedido/:ordenId` | Seguimiento del pedido | Publica | — | Pendiente de HTML |
| `/v/reserva/:ordenId` | Seguimiento de la reserva | Publica | — | Pendiente de HTML |
| `/v/pedido/:ordenId/qr` | Codigo de retiro | Publica | — | Pendiente de HTML |

### Cuenta

| Ruta | Vista | Roles autorizados | HTML de referencia | Estado |
| --- | --- | --- | --- | --- |
| `/v/historial` | Historial | Visitante / cliente | — | Pendiente de HTML |
| `/v/comprobante/:ordenId` | Comprobante de pedido | Publica | — | Pendiente de HTML |
| `/v/factura/:ordenId` | Factura del comercio | Publica | — | Pendiente de HTML |
| `/v/valorar/:ordenId` | Valorar | Visitante / cliente | — | Pendiente de HTML |
| `/v/reclamo/:ordenId` | Abrir reclamo | Publica | — | Pendiente de HTML |
| `/v/reclamos` | Mis reclamos | Visitante / cliente | — | Pendiente de HTML |
| `/v/perfil` | Mi perfil | Visitante / cliente | — | Pendiente de HTML |

## Comercio — portal — 37 vistas


### Panel

| Ruta | Vista | Roles autorizados | HTML de referencia | Estado |
| --- | --- | --- | --- | --- |
| `/c` | Inicio del comercio | Propietario legal; Administrador de local; Operador / cocina / servicio; Contador | — | Pendiente de HTML |

### Registro

| Ruta | Vista | Roles autorizados | HTML de referencia | Estado |
| --- | --- | --- | --- | --- |
| `/c/expediente` | Expediente del negocio | Propietario legal; Administrador de local; Contador | — | Pendiente de HTML |
| `/c/expediente/documentos` | Documentos y vigencias | Propietario legal; Administrador de local | — | Pendiente de HTML |
| `/c/expediente/documento/:documentoId` | Detalle de documento | Propietario legal; Administrador de local | — | Pendiente de HTML |
| `/c/permisos` | Permisos y concesiones | Propietario legal; Administrador de local | — | Pendiente de HTML |
| `/c/contratos` | Contratos | Propietario legal; Contador | — | Pendiente de HTML |
| `/c/contrato/:contratoId` | Condiciones economicas | Propietario legal; Contador | — | Pendiente de HTML |
| `/c/cobro` | Configuracion de cobro | Propietario legal; Contador | — | Pendiente de HTML |
| `/c/cobro/cuenta-bancaria` | Cuenta bancaria | Propietario legal | — | Pendiente de HTML |
| `/c/equipo` | Equipo y accesos | Propietario legal; Administrador de local | — | Pendiente de HTML |
| `/c/equipo/invitar` | Invitar integrante | Propietario legal | — | Pendiente de HTML |
| `/c/equipo/:usuarioId` | Detalle de integrante | Propietario legal; Administrador de local | — | Pendiente de HTML |

### Oferta

| Ruta | Vista | Roles autorizados | HTML de referencia | Estado |
| --- | --- | --- | --- | --- |
| `/c/catalogo` | Catalogo | Propietario legal; Administrador de local; Operador / cocina / servicio | — | Pendiente de HTML |
| `/c/catalogo/articulo/:articuloId` | Articulo o servicio | Propietario legal; Administrador de local | — | Pendiente de HTML |
| `/c/catalogo/articulo/:articuloId/variantes` | Variantes | Propietario legal; Administrador de local | — | Pendiente de HTML |
| `/c/catalogo/articulo/:articuloId/modificadores` | Modificadores | Propietario legal; Administrador de local | — | Pendiente de HTML |
| `/c/catalogo/alergenos` | Alergenos | Propietario legal; Administrador de local | — | Pendiente de HTML |
| `/c/horarios` | Horarios | Propietario legal; Administrador de local | — | Pendiente de HTML |
| `/c/cupos` | Cupos de servicios | Propietario legal; Administrador de local | — | Pendiente de HTML |
| `/c/inventario` | Inventario basico | Propietario legal; Administrador de local | — | Pendiente de HTML |

### Operacion

| Ruta | Vista | Roles autorizados | HTML de referencia | Estado |
| --- | --- | --- | --- | --- |
| `/c/pedidos` | Pedidos | Propietario legal; Administrador de local; Operador / cocina / servicio; Contador | — | Pendiente de HTML |
| `/c/pedido/:ordenId` | Detalle del pedido | Propietario legal; Administrador de local; Operador / cocina / servicio; Contador | — | Pendiente de HTML |
| `/c/reservas` | Reservas | Propietario legal; Administrador de local; Operador / cocina / servicio; Contador | — | Pendiente de HTML |
| `/c/reserva/:ordenId` | Detalle de la reserva | Propietario legal; Administrador de local; Operador / cocina / servicio; Contador | — | Pendiente de HTML |

### Caja

| Ruta | Vista | Roles autorizados | HTML de referencia | Estado |
| --- | --- | --- | --- | --- |
| `/c/caja` | Caja | Propietario legal; Administrador de local; Operador / cocina / servicio; Contador | — | Pendiente de HTML |
| `/c/caja/venta-mostrador` | Venta de mostrador | Propietario legal; Administrador de local; Operador / cocina / servicio | — | Pendiente de HTML |
| `/c/caja/turno/abrir` | Apertura de turno | Propietario legal; Administrador de local; Operador / cocina / servicio | — | Pendiente de HTML |
| `/c/caja/turno/cerrar` | Cierre de turno | Propietario legal; Administrador de local | — | Pendiente de HTML |
| `/c/caja/turno/:turnoId` | Detalle del turno | Propietario legal; Administrador de local; Contador | — | Pendiente de HTML |

### Finanzas

| Ruta | Vista | Roles autorizados | HTML de referencia | Estado |
| --- | --- | --- | --- | --- |
| `/c/reportes` | Reportes | Propietario legal; Administrador de local; Contador | — | Pendiente de HTML |
| `/c/conciliacion` | Conciliacion | Propietario legal; Contador | — | Pendiente de HTML |
| `/c/comprobantes` | Comprobantes | Propietario legal; Contador | — | Pendiente de HTML |
| `/c/facturas` | Facturas | Propietario legal; Contador | — | Pendiente de HTML |
| `/c/factura/:facturaId` | Detalle de factura | Propietario legal; Contador | — | Pendiente de HTML |
| `/c/estado-cuenta` | Estado de cuenta | Propietario legal; Contador | — | Pendiente de HTML |
| `/c/ajustes` | Solicitudes de ajuste | Propietario legal; Contador | — | Pendiente de HTML |
| `/c/exportaciones` | Exportaciones | Propietario legal; Contador | — | Pendiente de HTML |

## INPARQUES — panel institucional — 38 vistas


### Tableros

| Ruta | Vista | Roles autorizados | HTML de referencia | Estado |
| --- | --- | --- | --- | --- |
| `/i` | Dashboard nacional | Superadministrador nacional; Direccion comercial / concesiones; Finanzas / auditoria; Administrador de parque; Inspector / guardaparque; Soporte / disputas | — | Pendiente de HTML |
| `/i/dashboard/parque/:parqueId` | Dashboard por parque | Superadministrador nacional; Direccion comercial / concesiones; Finanzas / auditoria; Administrador de parque; Inspector / guardaparque; Soporte / disputas | — | Pendiente de HTML |
| `/i/reportes` | Reportes | Superadministrador nacional; Direccion comercial / concesiones; Finanzas / auditoria; Administrador de parque; Inspector / guardaparque; Soporte / disputas | — | Pendiente de HTML |

### Territorio

| Ruta | Vista | Roles autorizados | HTML de referencia | Estado |
| --- | --- | --- | --- | --- |
| `/i/territorio` | Estructura territorial | Superadministrador nacional; Direccion comercial / concesiones; Finanzas / auditoria; Administrador de parque; Inspector / guardaparque; Soporte / disputas | — | Pendiente de HTML |
| `/i/parques` | Parques | Superadministrador nacional; Direccion comercial / concesiones; Finanzas / auditoria; Administrador de parque; Inspector / guardaparque; Soporte / disputas | — | Pendiente de HTML |
| `/i/parque/:parqueId` | Detalle del parque | Superadministrador nacional; Direccion comercial / concesiones; Finanzas / auditoria; Administrador de parque; Inspector / guardaparque; Soporte / disputas | — | Pendiente de HTML |
| `/i/zonas` | Zonas | Superadministrador nacional; Direccion comercial / concesiones; Finanzas / auditoria; Administrador de parque; Inspector / guardaparque; Soporte / disputas | — | Pendiente de HTML |
| `/i/puntos` | Puntos comerciales | Superadministrador nacional; Direccion comercial / concesiones; Finanzas / auditoria; Administrador de parque; Inspector / guardaparque; Soporte / disputas | — | Pendiente de HTML |

### Concesiones

| Ruta | Vista | Roles autorizados | HTML de referencia | Estado |
| --- | --- | --- | --- | --- |
| `/i/negocios` | Directorio de negocios | Superadministrador nacional; Direccion comercial / concesiones; Finanzas / auditoria; Administrador de parque; Inspector / guardaparque; Soporte / disputas | — | Pendiente de HTML |
| `/i/negocio/:negocioId` | Detalle del negocio | Superadministrador nacional; Direccion comercial / concesiones; Finanzas / auditoria; Administrador de parque; Inspector / guardaparque; Soporte / disputas | — | Pendiente de HTML |
| `/i/solicitudes` | Solicitudes y expedientes | Superadministrador nacional; Direccion comercial / concesiones; Administrador de parque | — | Pendiente de HTML |
| `/i/expediente/:negocioId` | Expediente | Superadministrador nacional; Direccion comercial / concesiones; Administrador de parque | — | Pendiente de HTML |
| `/i/revision-documental/:negocioId` | Revision documental | Superadministrador nacional; Direccion comercial / concesiones; Administrador de parque | — | Pendiente de HTML |
| `/i/aprobaciones` | Aprobaciones | Superadministrador nacional; Direccion comercial / concesiones | — | Pendiente de HTML |
| `/i/permisos` | Permisos y concesiones | Superadministrador nacional; Direccion comercial / concesiones; Inspector / guardaparque; Administrador de parque | — | Pendiente de HTML |
| `/i/contratos` | Contratos | Superadministrador nacional; Direccion comercial / concesiones; Finanzas / auditoria | — | Pendiente de HTML |
| `/i/canones` | Canones y comisiones | Superadministrador nacional; Direccion comercial / concesiones; Finanzas / auditoria | — | Pendiente de HTML |
| `/i/vencimientos` | Vencimientos | Superadministrador nacional; Direccion comercial / concesiones; Administrador de parque | — | Pendiente de HTML |

### Control

| Ruta | Vista | Roles autorizados | HTML de referencia | Estado |
| --- | --- | --- | --- | --- |
| `/i/inspecciones` | Inspecciones | Superadministrador nacional; Inspector / guardaparque; Administrador de parque | — | Pendiente de HTML |
| `/i/inspeccion/:inspeccionId` | Detalle de inspeccion | Superadministrador nacional; Inspector / guardaparque; Administrador de parque | — | Pendiente de HTML |
| `/i/incidencias` | Incidencias | Superadministrador nacional; Inspector / guardaparque; Administrador de parque | — | Pendiente de HTML |
| `/i/operacion` | Operacion del parque | Superadministrador nacional; Administrador de parque | — | Pendiente de HTML |

### Finanzas

| Ruta | Vista | Roles autorizados | HTML de referencia | Estado |
| --- | --- | --- | --- | --- |
| `/i/contabilidad` | Contabilidad | Superadministrador nacional; Finanzas / auditoria | — | Pendiente de HTML |
| `/i/conciliacion` | Conciliacion | Superadministrador nacional; Finanzas / auditoria | — | Pendiente de HTML |
| `/i/cuentas-por-cobrar` | Cuentas por cobrar | Superadministrador nacional; Finanzas / auditoria | — | Pendiente de HTML |
| `/i/cierres` | Cierres | Superadministrador nacional; Finanzas / auditoria | — | Pendiente de HTML |
| `/i/reembolsos` | Reembolsos | Superadministrador nacional; Finanzas / auditoria; Soporte / disputas | — | Pendiente de HTML |
| `/i/ajustes` | Ajustes | Superadministrador nacional; Finanzas / auditoria | — | Pendiente de HTML |

### Soporte

| Ruta | Vista | Roles autorizados | HTML de referencia | Estado |
| --- | --- | --- | --- | --- |
| `/i/disputas` | Disputas | Superadministrador nacional; Soporte / disputas | — | Pendiente de HTML |
| `/i/disputa/:disputaId` | Detalle de disputa | Superadministrador nacional; Soporte / disputas | — | Pendiente de HTML |
| `/i/sla` | SLA de soporte | Superadministrador nacional; Soporte / disputas | — | Pendiente de HTML |

### Administracion

| Ruta | Vista | Roles autorizados | HTML de referencia | Estado |
| --- | --- | --- | --- | --- |
| `/i/auditoria` | Bitacora de auditoria | Superadministrador nacional; Finanzas / auditoria; Direccion comercial / concesiones | — | Pendiente de HTML |
| `/i/usuarios` | Usuarios | Superadministrador nacional; Direccion comercial / concesiones | — | Pendiente de HTML |
| `/i/roles` | Roles y permisos | Superadministrador nacional | — | Pendiente de HTML |
| `/i/ambitos` | Ambitos | Superadministrador nacional | — | Pendiente de HTML |
| `/i/sesiones` | Sesiones | Superadministrador nacional | — | Pendiente de HTML |
| `/i/reglas` | Reglas globales | Superadministrador nacional | — | Pendiente de HTML |
| `/i/integraciones` | Integraciones | Superadministrador nacional | — | Pendiente de HTML |
