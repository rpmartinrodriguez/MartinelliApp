# Martinelli Autos — Android, prueba 2

Esta versión reemplaza el inicio TWA silencioso de la primera APK por una
**pantalla Android nativa con botones visibles** y apertura automática en Chrome
Custom Tabs. Si el arranque integrado falla, se puede abrir el mismo sitio en
el navegador. La web que abre es:

https://martinelli-autos.netlify.app/

**No contiene una copia de los datos** ni crea una base Firebase nueva. Abre la
misma versión oficial que se usa en PC y en la web.

## Instalación

- Nombre: Martinelli Autos (Prueba 2)
- Identificador Android: `com.martinelliautos.prueba2`
- Android mínimo: 7.0 (API 24).
- Con Chrome actualizado se abre en vista integrada; si no funciona,
  tocar "Abrir directamente en el navegador".
- Es una **APK debug firmada para pruebas**, no una aplicación lista para
  distribuir indefinidamente.
- La nueva APK tiene **otro identificador**: puede instalarse al lado de
  "Martinelli Autos (Prueba)" de la primera versión. Conviene desinstalar la
  primera para no confundirlas.
- Si se recompila en otro servidor con distinta firma debug, para actualizar
  la misma versión de prueba podría ser necesario desinstalarla primero.

## Lo que aún requiere validación

- Inicio de sesión y carga de Flota, CRM y Caja desde Android.
- Notificaciones push en el modo Chrome Custom Tabs: todavía no están
  confirmadas. La delegación de notificaciones nativas en una TWA requiere
  configuración/verificación del dominio con un certificado de firma **estable**.
- Pantalla completa real: la asociación `assetlinks.json` y un paquete firmado
  permanentemente se abordarán después de probar el arranque en el celular.

## Crear el instalador

Entrar a GitHub → Actions → Android APK de prueba → elegir esta rama.
La automatización crea el artefacto
`Martinelli-Autos-Android-APK-prueba-2` con `app-debug.apk`.

No modificar Firestore ni el dominio para probar. Sin Internet no se
garantiza la sincronización.
