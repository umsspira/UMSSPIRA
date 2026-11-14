# Rutas frontend - Épica 1 (G8)

Fecha de corte: 14/11/2026. Épica: Onboarding y Backoffice Documental.

Rutas verificadas en `apps/web/src/app`. Los grupos `(public)` y `(dashboard)` organizan archivos y no forman parte de la URL. `[token]` representa un segmento dinámico.

| Ruta | Funcionalidad | Acceso / requisito | Archivo |
| --- | --- | --- | --- |
| `/register` | Datos personales y académicos; inicio del borrador. | Público | [page.tsx](../../apps/web/src/app/%28public%29/register/page.tsx) |
| `/register/verify-email` | Verificación y reenvío del código de correo. | Borrador vigente | [page.tsx](../../apps/web/src/app/%28public%29/register/verify-email/page.tsx) |
| `/register/document` | Carga y vista previa del respaldo. | Borrador con correo verificado | [page.tsx](../../apps/web/src/app/%28public%29/register/document/page.tsx) |
| `/register/review` | Resumen editable y entrega de la solicitud. | Borrador vigente | [page.tsx](../../apps/web/src/app/%28public%29/register/review/page.tsx) |
| `/register/confirmation` | Confirmación y descarga de constancia PDF. | Flujo de registro | [page.tsx](../../apps/web/src/app/%28public%29/register/confirmation/page.tsx) |
| `/register/correction` | Solicitud de un nuevo enlace de corrección. | Público | [page.tsx](../../apps/web/src/app/%28public%29/register/correction/page.tsx) |
| `/register/correction/[token]` | Consulta de observaciones, edición, reemplazo y reentrega. | Enlace de corrección válido; no requiere login | [page.tsx](../../apps/web/src/app/%28public%29/register/correction/[token]/page.tsx) |
| `/activate` | Validación de OTP y definición de contraseña. | Solicitud aprobada y credencial de activación | [page.tsx](../../apps/web/src/app/%28public%29/activate/page.tsx) |
| `/login` | Inicio de sesión y acceso a consulta de estado por correo. | Público | [page.tsx](../../apps/web/src/app/%28public%29/login/page.tsx) |
| `/forgot-password` | Solicitud de correo de recuperación. | Público | [page.tsx](../../apps/web/src/app/%28public%29/forgot-password/page.tsx) |
| `/reset-password` | Validación del enlace y nueva contraseña. | Credencial de recuperación válida | [page.tsx](../../apps/web/src/app/%28public%29/reset-password/page.tsx) |
| `/applications` | Bandeja, métricas, filtros, expediente y dictamen. | Administrador con permisos por carrera | [page.tsx](../../apps/web/src/app/%28dashboard%29/applications/page.tsx) |
| `/portal` | Destino del titulado autenticado. | Sesión de titulado | [page.tsx](../../apps/web/src/app/portal/page.tsx) |

## Integración y alcance

- HU-18 se abre desde login y registro: es un formulario integrado, sin página independiente de consulta de estado.
- El expediente y los controles administrativos están integrados en `/applications`; no se documenta una página `/applications/[id]` que no existe en este corte.
- La activación usa la misma ruta `/activate` para sus pasos.
- Las llamadas HTTP pasan por `/api/v1/[...path]`, proxy compartido de Next.js hacia NestJS; el inventario está en [RutasBackend.md](RutasBackend.md).
- El login comparte sesión y redirección por rol con otras épicas. `/companies` pertenece al flujo de empresas de la Épica 4; las subsecciones del portal pertenecen a sus respectivos equipos.
- Los tokens y códigos de los enlaces son credenciales: no incluir ejemplos reales en documentación o capturas.
