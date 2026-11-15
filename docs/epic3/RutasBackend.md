# Rutas Backend - Épica 3 (Radar de Afinidad y NLP)

A continuación se detallan los endpoints desarrollados y estabilizados por la Épica 3 durante los sprints para el motor de NLP y el Radar de Afinidad:

## Módulo Radar (`/api/v1/radar`)
- `GET /api/v1/radar` : Obtiene el porcentaje de afinidad y el vector de radar del titulado autenticado.
- `POST /api/v1/radar/recalculate` : Recalcula el radar del titulado a partir del perfil guardado. Si la entrada efectiva coincide con la del último cálculo, reutiliza el resultado.
- `GET /api/v1/radar/certifications/:area` : Lista las certificaciones relacionadas con el área y señala si tienen respaldo. El archivo se obtiene a través de Perfil.

## Módulo NLP (`/api/v1/nlp`)
- `POST /api/v1/nlp/extract` : Recibe texto plano y extrae las palabras clave (keywords) normalizadas y el conteo (`unmapped`) usando el diccionario cargado en memoria.

## Rutas de otros módulos que utiliza el radar

- `GET /api/v1/perfil/certificaciones/:id/respaldo/enlace` solicita a Perfil un enlace firmado para abrir o descargar el archivo JPG o PDF.
- `GET /api/v1/auth/me` permite verificar los permisos del usuario autenticado durante las pruebas de QA.

## Endpoints de Monitoreo
- `GET /health` : Endpoint de salud para verificar la disponibilidad de la API y la conexión a la base de datos (usado por DevOps y QA para el despliegue).