# Martinelli Autos — Reglas Firestore, Push y novedades de Flota

**Estado: rama de prueba. No cambiar Firebase de producción ni fusionar main sin validar.**

## Lo que quedó preparado

- **Clientes**: clasificación por antigüedad de la fecha original de registro, sin alterarla: día 0 al 7 = Caliente; día 8 al 15 = Tibio; día 16 en adelante = Frío. Los clientes vendidos continúan en estado Vendido.
- **Caja**: Ingreso o Egreso con dos opciones tipo radio, fondo verde o rojizo; nueva operación abre con fecha local de hoy, editable. Al editar se conserva la fecha del movimiento.
- **Instagram**: el enlace HTTPS de Instagram se registra en cada vehículo y se abre desde el icono negro en grilla, lista y ficha.
- **Flota**: historial de nuevos vehículos, cambios de ficha/estado/precio y eliminaciones. Al entrar o regresar a la PWA aparecen en una ventana flotante, **solo cambios de Flota**; «Entendido, cerrar» o «Ver Flota». La fecha de última lectura se guarda por UID en Firestore.
- **Push**: botón «Activar push» dentro de Notificaciones. Se requiere configurar el servidor antes de que aparezca habilitado; envío periódico de coincidencias y seguimientos.

## IMPORTANTE: coordinar reglas y código

La **versión principal actual** de Martinelli consulta todas las fichas de CRM al iniciar. Las reglas nuevas restringen esas consultas por vendedor. **Si publicás las reglas nuevas sin actualizar el código de main, el inicio de sesión de vendedores y encargados podría fallar**.

Antes de publicarlas:
1. [Abrir las reglas completas de esta rama](https://github.com/rpmartinrodriguez/MartinelliApp/blob/mejoras-crm-flota-facturacion-push-2026-11/firestore.rules).
2. Probar la versión de prueba en un **proyecto Firebase de ensayo separado**, o coordinar la publicación de las reglas con la actualización del código en `main` y la validación de roles.
3. Verificar acceso de Admin/Encargado/Vendedor y lectura/escritura de CRM, Caja, Flota y notificaciones.
4. Solo cuando esté comprobado: ir a [Firebase Console](https://console.firebase.google.com/) → proyecto `martinelliapp-40269` → Firestore Database → Rules, pegar **todo el archivo** y publicar. **No reemplazar solo fragmentos ni mezclar reglas viejas y nuevas sin revisar.**

Colecciones nuevas:
- `crm_indices`: índices para localizar teléfono/nombre repetido sin ver fichas ajenas.
- `flota_novedades`: solo avisos relativos a Flota, sin datos sensibles de clientes.
- `flota_lecturas`: última lectura por usuario.
- `push_subscriptions`: suscripción push por dispositivo y usuario.
- `push_envios`: control de envíos, de uso exclusivo del servidor.

Al pasar a producción, en **Configuración / Usuarios → Indexar clientes anteriores** (Admin), realizar la indexación de contactos históricos para detectar duplicados con teléfonos que ya existían.

## Cómo activar las notificaciones push

1. En un equipo de confianza, generar claves VAPID con Node.js: `npx web-push generate-vapid-keys --json`. **La clave privada no va al repositorio ni por chat**.
2. Entrar en [Netlify](https://app.netlify.com/) → sitio `martinelli-autos` → Project configuration → Environment variables → Add a variable. Definir:
   - `VAPID_PUBLIC_KEY` = clave pública.
   - `VAPID_PRIVATE_KEY` = clave privada, con carácter secreto y alcance de Functions si tu plan ofrece esos controles.
   - `VAPID_SUBJECT` = contacto real en formato `mailto:correo@tudominio.com`.
   - `FIREBASE_SERVICE_ACCOUNT_JSON` = JSON íntegro de cuenta de servicio para el proyecto Firebase correspondiente, **solo como secreto del servidor**. Obtener en Firebase → Project settings → Service accounts → Generate new private key; guardar ese archivo con extremo cuidado.
3. En Netlify, activar contexto apropiado para las variables según dónde se pruebe (Deploy previews/Production), guardar y hacer un nuevo deploy. Confirmar que las Functions `push-public-key` y `push-scheduler` aparecen.
4. En Deploy Preview el scheduler **no se ejecuta automáticamente**. Desde Netlify → Functions → `push-scheduler` → **Run now** para prueba manual; en Production corre según `*/10 * * * *` UTC.
5. En iPhone con iOS 16.4+ instalar Martinelli desde Safari → Compartir → **Agregar a inicio**, abrir el icono, iniciar sesión y tocar campanita → **Activar push**. Aceptar el permiso de notificaciones. En Android la PWA también necesita permiso.
6. Las suscripciones pertenecen al dominio exacto: al cambiar de `martinelli-autos.netlify.app` a un dominio propio, cada dispositivo deberá autorizar push nuevamente bajo el nuevo origen.
7. Confirmar prueba de notificación a un dispositivo registrado. El servidor envía cuando identifica un vehículo recientemente incorporado que coincide con la búsqueda del cliente o seguimientos pendientes. Puede haber demoras de hasta unos 10 minutos por el scheduler; no garantiza entrega si el dispositivo está sin datos.

**Seguridad:** nunca subir `FIREBASE_SERVICE_ACCOUNT_JSON`, su archivo de clave privada ni `VAPID_PRIVATE_KEY` a GitHub o al frontend.

## Pruebas de aceptación
- Cliente con fecha hoy, -7, -8, -15, -16 días: Caliente, Caliente, Tibio, Tibio, Frío, respectivamente. Revisar que nunca cambie la fecha original.
- Caja: nuevo ingreso verde y fecha de hoy; egreso rojo; editar un asiento con fecha vieja, preservarla; comprobante A total 121.000 → IVA 21.000.
- Instagram: enlace válido visible en lista, grilla y modal del vehículo; click abre publicación; URL ajena se rechaza.
- Flota: un usuario registra un auto, otro entra después y ve el aviso; lo cierra y no se repite; otro cambio debe crear un aviso nuevo. No mostrar actividades de CRM o Caja en esa ventana.
- Con distintos usuarios, comprobar que vendedor no puede ver clientes de otros y detecta teléfono repetido sin revelar datos privados.
- Push: suscripción iPhone PWA y Android, función programada y recepción con app cerrada.

Referencia oficial: [Web Push en iOS (Apple)](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers) y [Scheduled Functions (Netlify)](https://docs.netlify.com/build/functions/scheduled-functions/).
