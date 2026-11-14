# BUG-12 — Análisis del acceso a enlaces de corrección

## 1. Problema reportado

Se reportó que un titulado no podía acceder a la corrección de su solicitud observada mediante un enlace sin iniciar sesión.

El comportamiento esperado es permitir el acceso mediante un token de corrección válido, sin requerir una cuenta activada.

## 2. Hallazgos

Durante la revisión del código se identificaron las siguientes situaciones:

- La ruta actual de corrección es `/register/correction/[token]`.
- El backend genera nuevos enlaces utilizando `CORRECTION_URL_PATH = '/register/correction'`.
- El reporte del bug menciona la ruta anterior `/applications/correct/{token}`, que también aparece en algunos datos de prueba.
- El middleware protege `/applications/:path*`, por lo que un enlace con la estructura antigua podía redirigir al inicio de sesión cuando no existía una sesión activa.
- La página de corrección con un token de formato inválido redirigía a `/login`.
- La página base `/register/correction` también redirigía a `/login`, aunque existe un formulario para solicitar un nuevo enlace.

No se ha confirmado que el despliegue actual continúe generando enlaces con la ruta antigua. Se identificó una incompatibilidad potencial con ese formato y una redirección incorrecta para tokens inválidos.

## 3. Solución implementada

Se realizaron los siguientes cambios:

- Se agregó una redirección HTTP 307 desde `/applications/correct/{token}` hacia `/register/correction/{token}` para mantener compatibilidad con enlaces antiguos.
- Los enlaces con tokens de formato inválido muestran un mensaje de error en lugar de redirigir al login.
- La ruta `/register/correction` permite solicitar un nuevo enlace sin autenticación.
- Se reutilizó el componente existente para informar sobre enlaces inválidos o vencidos.
- Se añadieron pruebas unitarias para comprobar las redirecciones y la protección de otras rutas.

La validación de vigencia y autorización del token continúa realizándose en el backend.

## 4. Verificaciones realizadas

- Pruebas unitarias del middleware: satisfactorias.
- Compilación de Next.js: satisfactoria.
- Acceso con un enlace válido en ventana de incógnito: satisfactorio.
- Presentación de errores para enlaces inválidos: satisfactoria.
- Solicitud de un nuevo enlace: satisfactoria.
- Protección de `/applications` sin sesión: conservada.

## 5. Conclusión

BUG-12 corrige las redirecciones que impedían acceder correctamente al flujo público de subsanación y mantiene compatibilidad con enlaces antiguos.

Los cambios se limitan al flujo de corrección del frontend. No se modificaron las reglas de autenticación de otras rutas ni el mecanismo de validación de tokens del backend.