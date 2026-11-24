# Notificaciones Push

Este módulo guarda suscripciones Web Push en la tabla existente `dispositivo`; las claves `p256dh` y `auth` solo se usan internamente durante la entrega y nunca aparecen en las respuestas HTTP.

## Configuración

En `apps/api/.env` se configura `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT` (`mailto:` o `https://`). En `apps/web/.env.local`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY` debe contener exactamente el mismo valor que `VAPID_PUBLIC_KEY`. El par se genera una sola vez con `npx web-push generate-vapid-keys` y la clave privada no sale del backend.

## Flujo

El cliente solicita permiso, crea la suscripción con el Service Worker existente y la registra mediante `POST /api/v1/push-subscriptions`. Al iniciar, compara la suscripción local con `GET /api/v1/push-subscriptions` usando solo el endpoint público y repara registros faltantes sin duplicarlos. Si el permiso se rechaza, solo se intenta eliminar el endpoint del dispositivo actual.

Eventos publicados notifican exclusivamente a inscripciones `CONFIRMADA` cuando cambia el nombre, fecha/horario, ubicación o descripción; cambios de cupo o portada no generan Push. Las cancelaciones se notifican después de persistirse y de invalidar los pases QR.

Las actualizaciones y cancelaciones también se guardan en `notificacion_evento` para mostrarse en la campanita aunque el proveedor Push rechace una suscripción. `GET /api/v1/event-notifications` devuelve hasta 30 avisos y 30 recordatorios recientes del titulado autenticado y `PATCH /api/v1/event-notifications/:id/read` marca uno como leído.

Cuando el proveedor devuelve HTTP `404` o `410`, se elimina únicamente el endpoint afectado. Un error de entrega nunca revierte una actualización o cancelación de evento.

## Centro de notificaciones

Los cambios y recordatorios también se guardan en `notificacion_evento`, aunque la persona no tenga Push activado. La campanita muestra solo cambios y cancelaciones, no recordatorios. Mientras la sesión está activa, un aviso nuevo, incluido un recordatorio, aparece como tarjeta temporal en la esquina inferior derecha. Los reintentos de un recordatorio reutilizan su identificador para no crear tarjetas duplicadas.

Antes de desplegar, aplica las migraciones de notificaciones de eventos y su clave de idempotencia en coordinación con el responsable de la base de datos.
