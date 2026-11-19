# Notificaciones Push

Este módulo guarda suscripciones Web Push en la tabla existente `dispositivo`; las claves `p256dh` y `auth` solo se usan internamente durante la entrega y nunca aparecen en las respuestas HTTP.

## Configuración

En `apps/api/.env` se configura `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT` (`mailto:` o `https://`). En `apps/web/.env.local`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY` debe contener exactamente el mismo valor que `VAPID_PUBLIC_KEY`. El par se genera una sola vez con `npx web-push generate-vapid-keys` y la clave privada no sale del backend.

## Flujo

El cliente solicita permiso, crea la suscripción con el Service Worker existente y la registra mediante `POST /api/v1/push-subscriptions`. Al iniciar, compara la suscripción local con `GET /api/v1/push-subscriptions` usando solo el endpoint público y repara registros faltantes sin duplicarlos. Si el permiso se rechaza, solo se intenta eliminar el endpoint del dispositivo actual.

Eventos publicados notifican exclusivamente a inscripciones `CONFIRMADA` cuando cambia el nombre, fecha/horario, ubicación o descripción; cambios de cupo o portada no generan Push. Las cancelaciones se notifican después de persistirse y de invalidar los pases QR.

Cuando el proveedor devuelve HTTP `404` o `410`, se elimina únicamente el endpoint afectado. Un error de entrega nunca revierte una actualización o cancelación de evento.
