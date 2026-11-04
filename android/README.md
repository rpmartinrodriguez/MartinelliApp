# Martinelli Autos — APK de prueba para Android

Esta carpeta empaqueta la PWA oficial mediante **Trusted Web Activity (TWA)**.
La APK NO contiene una copia de Firestore, NO crea una base de datos nueva y NO modifica los datos de producción.

- Sitio que abre: https://martinelli-autos.netlify.app/
- Proyecto Android: `com.martinelliautos.prueba`
- Compilación de prueba: GitHub Actions genera `app-debug.apk`.
- En teléfonos con Chrome u otro navegador compatible, abre la web real. Los datos se sincronizan como en la PWA.
- Los cambios web publicados en Netlify se muestran sin reconstruir la APK, salvo cambios nativos/manifest/icono.
- Las notificaciones push dependen de la autorización del navegador y el sitio y deben probarse en un dispositivo real.

## Diferencia importante con una versión TWA verificada

Para quitar por completo la barra del navegador, Android requiere que
`https://martinelli-autos.netlify.app/.well-known/assetlinks.json`
publique la huella SHA-256 del certificado que firma la APK. **Esta rama
no toca producción** y por eso **la APK de prueba puede mostrar barra de Chrome**.
No es un fallo del inicio de sesión ni una base de datos distinta.

La APK debug usa la firma de prueba generada en GitHub Actions. Si volvés a
compilar con otra clave, puede que debas desinstalar la anterior antes de
instalar una nueva. No emplear esta APK debug como una distribución permanente.

## Crear APK de prueba

En GitHub, en el repositorio `rpmartinrodriguez/MartinelliApp`, entrar a
**Actions → Android APK de prueba → Run workflow**, elegir esta rama.
Al terminar, descargar el artefacto `Martinelli-Autos-Android-APK-prueba`
y extraer el archivo `app-debug.apk`.

No instalar versiones de terceros ni compartir credenciales de Firebase.
