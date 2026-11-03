# Martinelli Autos — mejoras CRM, Flota, Caja y Push (rama de prueba)

**No fusionar a main hasta probar con usuarios ficticios y completar Firebase/Netlify.**

## Qué se incluyó
- Botón **Clientes** junto a **PDF** de Flota; menú CRM renombrado a Clientes.
- Alta compartida desde Flota, CRM y la ficha de cada auto, con WhatsApp y selector de auto.
- Comparador del interés y los comentarios con vehículos de la flota; campanita muestra oportunidades de contacto.
- Clientes por propietario: Admin ve todos, Encargado su sucursal, Vendedor solo su cartera. **Las reglas se deben publicar en Firebase Console**.
- Índice de teléfonos/nombres para detectar contactos que ya están registrados sin descargar fichas de otra cartera. Altas por transacción.
- Campo Instagram por vehículo e icono para abrir publicación en la ficha, grilla y lista.
- Caja: interruptor «Tiene factura» con A/B/C. Tipo A: IVA 21 % incluido = total × 21 / 121 (redondeado a pesos); B/C no discrimina IVA.
- Facturación A/B/C: totales separados y desglose de IVA de A.
- Push: suscripción opt-in, service worker y envío programado de oportunidades/recordatorios; **requiere variables de servidor**.

## Activación segura
1. Crear un deploy de prueba desde la rama `mejoras-crm-flota-facturacion-push-2026-11`. Mantener main publicada.
2. En Firebase proyecto `martinelliapp-40269`: **Firestore Database → Rules**. Comparar con `firestore.rules` de esta rama, probar reglas y publicar la versión correspondiente al nuevo frontend (no aplicar reglas sin actualizar primero el frontend).
3. Ingresar como Admin y abrir **Configuración / Usuarios → Indexar clientes anteriores**. Se crean índices auxiliares para los contactos existentes sin borrar ningún cliente. Controlar conflictos con teléfonos repetidos y revisar manualmente.
4. Crear dos usuarios de prueba Vendedor en una misma sucursal. Verificar que cada uno vea solo su cartera. Intentar agregar el mismo teléfono con ambos: el segundo debe ver aviso y no poder guardar; comprobar también el nombre.
5. Cargar un auto Toyota Corolla desde un usuario; otro vendedor con un cliente propio con «interesado en Toyota Corolla» debe ver una oportunidad en la campanita. Comprobar datos en diferentes navegadores abiertos.
6. Caja: simular, sin guardar datos reales, $121.000 tipo A → neto $100.000 + IVA $21.000; B/C no calcula IVA. Probar edición de un movimiento antiguo con factura.
7. Probar Instagram en ficha y flota, y confirmar que enlaces no Instagram se rechazan.
8. Validar en Android, iOS y escritorio; probar respaldos, formularios y ventas antes de fusionar.

## Activar Web Push de verdad
Apple permite Web Push en **iOS 16.4+**, cuando la web app se instaló en la pantalla de inicio. La autorización se solicita al tocar **Activar push**. Sin backend no habrá alertas cuando la app esté cerrada.

En Netlify → **Project configuration → Environment variables**, configurar **solo como secretos del servidor**:
- `VAPID_PUBLIC_KEY` (clave pública VAPID).
- `VAPID_PRIVATE_KEY` (clave privada VAPID).
- `VAPID_SUBJECT` (por ejemplo `mailto:contacto@dominio-real.com`).
- `FIREBASE_SERVICE_ACCOUNT_JSON` (JSON de una cuenta de servicio con permisos mínimos apropiados sobre Firestore, descargado de la consola del proyecto. **Nunca subir a GitHub ni compartir en chat**).

Para generar las claves (en equipo seguro): `npx web-push generate-vapid-keys --json`.
La pública se entrega a `push-public-key`; la privada la usa solo `push-scheduler`. La función programada evalúa cada 10 minutos el stock nuevo y los recordatorios vencidos, y envía al dispositivo registrado. **No es instantánea**.

En Netlify: controlar que en Functions aparezcan `push-public-key` y `push-scheduler`, con el scheduler en modo Scheduled. En un deploy de rama el scheduler no se ejecuta automáticamente; usar **Run now** desde Netlify Functions para probar. Al finalizar, publicar la versión aprobada desde main. El dominio propio necesitará volver a habilitar push en la PWA instalada bajo ese dominio (las suscripciones son por origen).

## Notas y límites
- Esta rama no contiene la emisión de facturas fiscales AFIP/ARCA: solo **clasifica** movimientos internos. Una factura A/B/C real debe emitirse por el sistema fiscal correspondiente. Corroborar tratamiento tributario e IVA con contador, especialmente operaciones de vehículos usados.
- Los filtros de CRM no sustituyen las reglas de Firestore. Publicar código y reglas coordinadamente.
- Los datos antiguos deben indexarse para que la verificación cruzada de duplicados sea completa.
- La búsqueda de coincidencias es una heurística por texto, no un modelo de IA; las alertas pueden requerir revisión humana.
- No se han hecho pruebas funcionales con Firebase de producción ni en un iPhone real desde este entorno.
