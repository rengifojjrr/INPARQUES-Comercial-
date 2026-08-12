# INPARQUES Comercial — demo

Demo local y navegable de la plataforma de comercio en parques: PWA de
visitante, portal de comercio y panel institucional sobre **una sola base de
datos** y un solo sistema de rutas y permisos.

Se ejecuta entera en el navegador. No requiere servidor, cuenta externa, clave
de API, tarjeta ni suscripción.

## Enlace para probar

**https://claude.ai/code/artifact/debdfa1c-77b9-49c2-9548-41f9b4d3a948**

Se abre desde el teléfono sin instalar nada. Empieza en el selector de
perfiles: toque cualquiera de los 11 roles para entrar.

---

## Estado — leer antes de revisar

**Las plantillas HTML del cliente todavía no se han recibido.** El repositorio
`rengifojjrr/INPARQUES-Comercial-` estaba vacío al iniciar el trabajo, y la
carpeta `C:\Users\pekas\Downloads\Comercio e INPARQUES` está en un equipo
Windows al que esta sesión no tiene acceso. El único material recibido fue el
documento funcional en PDF.

Por eso **el aspecto de las pantallas es provisional**, construido para que
hubiera algo que recorrer. Todo lo demás —rutas, permisos, estados, datos,
auditoría, conectividad— responde al documento funcional y está probado.

Cuando lleguen las plantillas se sustituye la capa visual sin tocar el núcleo:
el marcado vive en `src/ui/vistas/`, separado de la lógica.

### Cómo entregar las plantillas

1. Subirlas al repositorio (`git add` + `git push`) en cualquier carpeta.
2. Adjuntarlas en el chat, como se adjuntó el PDF.
3. Comprimirlas en un `.zip` y adjuntarlo.

La ruta de Windows no funciona: esta sesión corre en un contenedor Linux
aislado que no ve el disco local.

---

## Perfiles de prueba

Desde el selector inicial se entra con un toque. Si prefiere el formulario,
**la contraseña de todos los perfiles es `demo1234`** y el **código de
verificación es `123456`**. No son secretos: son constantes de demostración
declaradas en `src/app/session.ts`.

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

1. **Compra completa.** Visitante → Café Los Cedros → agregar → carrito →
   checkout → Pago Móvil (referencia `123456`) → confirmación. El pago queda
   **pendiente de verificación**, no confirmado.
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
7. **Datos bancarios.** El Propietario ve la cuenta enmascarada; el Inspector
   no recibe el campo en absoluto.
8. **Acción sensible.** Cobro → Cambiar cuenta bancaria: exige motivo,
   evidencia, verificación y segunda aprobación.
9. **Sin conexión.** Perfil → Conexión. Opere sin red y vea la cola.
10. **Auditoría.** Como Finanzas, `#/i/auditoria` muestra todo lo anterior.

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
| `npm test` | 78 pruebas automáticas |
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
- [`plantillas-originales/`](plantillas-originales/) — carpeta reservada para los HTML de referencia.
