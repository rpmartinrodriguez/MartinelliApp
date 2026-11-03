# Mejoras de campanita — revisión previa a producción

## Qué cambia
- La campanita abre y cierra manualmente el panel.
- Al tocar el contenido de una notificación, se cierra el panel y se abre el cliente en CRM o la sección de ventas para recompra.
- Botón **✓** en cada aviso: se guarda como **visto** para el usuario autenticado. El aviso desaparece de su bandeja y no vuelve a acumularse en los próximos ingresos.
- Botón **Realizado** en los seguimientos: **modifica el historial del CRM** y marca `completado: true` para ese seguimiento. No debe confundirse con `✓ Visto`.
- Botón **Marcar todas vistas**: oculta de la bandeja todos los avisos pendientes en una operación.
- Unifica avisos de CRM (seguimientos vencidos/para hoy), coincidencias con Flota y recompra (administradores); evita que los diferentes módulos se sobrescriban.
- Las lecturas se sincronizan por usuario y entre dispositivos mediante Firestore.

## Regla de Firestore necesaria
Esta actualización crea una colección nueva: `notificaciones_vistas`, un documento por UID.
**Publicar primero las reglas** de `firestore.rules` que están en esta rama, o agregar y validar únicamente el bloque `match /notificaciones_vistas/{uid}` a las reglas actualmente vigentes. Si todavía no publicás esas reglas, podrás abrir y cerrar la campanita, pero el botón ✓ no podrá persistir la lectura y mostrará un mensaje claro de error.

Archivo de reglas:
https://github.com/rpmartinrodriguez/MartinelliApp/blob/mejora-centro-notificaciones-2026-11/firestore.rules

### Pruebas sugeridas
1. Iniciá sesión con vendedor; comprobá que solo aparecen seguimientos y coincidencias de su cartera.
2. Abrí un aviso; el panel debe minimizarse y abrir la ficha del cliente.
3. Tocá ✓; el aviso deja de aparecer. Recargá el navegador: sigue marcado como visto. Comprobá lo mismo con otro teléfono del mismo usuario.
4. Tocá **Realizado** en seguimiento pendiente; el registro de historial queda `completado: true`.
5. Marcá todas vistas; confirmá que el badge rojo se oculta.
6. Admin ve oportunidades de sus clientes y avisos de recompra; vendedores no ven recompra global.
7. Las notificaciones push del teléfono siguen separadas: no se deshabilitan por marcar un aviso de campanita como visto.

**Estado:** desplegado exclusivamente en la rama de prueba para revisión. No modifica `main` hasta aprobación.
