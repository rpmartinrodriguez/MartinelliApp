# Cierre de clientes CRM — Martinelli Autos

## Dos resultados de cierre
- **Vendido:** al confirmar un cierre de venta de Flota, elegí explícitamente el **cliente del CRM** en el selector dentro de «Datos comprador». El formulario registra `clienteCrmId` y `autoId` en la venta; después de vender la unidad, cierra solamente la ficha elegida y registra el ID de la venta, auto, fecha y responsable. No se cierran otros interesados por la misma unidad ni homónimos.
- **Frío / sin venta:** desde la ficha de CRM tocá «Cerrar cliente sin venta (Frío)», registrá un motivo y confirmá. No borra la ficha, ni la fecha de alta, ni sus seguimientos. Permite reactivarlo si vuelve a consultar.

## CRM
- Filtro «Clientes activos» por defecto para la cartera diaria. «Clientes cerrados» muestra las operaciones vendidas o sin venta; «Todos los clientes» conserva el listado completo.
- Los cerrados quedan excluidos de las coincidencias nuevas de Flota, campanita de seguimientos y las notificaciones programadas.
- Los datos de cierre se almacenan en el mismo documento `consultas/{id}`: `cierreCRM.estado`, `fecha`, `motivo`, `autoId`, `ventaId`, `usuarioId`, `fuente`, más un evento en `historial`.
- Respeta permisos de Firestore: solo Admin o vendedor propietario de la ficha puede editarla; un encargado solo puede cerrar sus propios clientes si no es Admin.
- No se altera el cálculo automático de temperatura por antigüedad. Pasar automáticamente a «Frío» por el transcurso de los días **no equivale a cerrar** una ficha. El cierre es una decisión explícita.
- Las ventas registradas sin elegir un cliente del CRM permanecen válidas pero no cierran clientes automáticamente.

## Verificación antes de fusionar
1. Desde CRM, cerrá un cliente como Frío: desaparece de Activos, aparece en Cerrados y se conserva todo el historial. Reactivalo: vuelve a Activos.
2. Confirmá una venta seleccionando el ID de cliente correspondiente: comprobar que `ventas.clienteCrmId`, `ventas.autoId`, `consultas.cierreCRM.ventaId` y `consultas.cierreCRM.autoId` sean correctos. El cliente pasa a Vendido, sin afectar otros interesados.
3. Confirmá una venta con comprador nuevo y selector vacío: no debe cerrarse ningún cliente CRM.
4. Un vendedor no debe poder cerrar fichas de otro vendedor.
5. Verificá que el vehículo asociado cambia a Vendido y que las notificaciones de Flota y la Caja continúan funcionando.

**Precaución:** la Deploy Preview usa la misma base Firebase del proyecto salvo que se haya configurado otra: no ejecutar ventas ficticias ni cerrar clientes reales para hacer pruebas.
