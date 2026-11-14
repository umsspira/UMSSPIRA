# Rutas Backend - Épica 3 (Radar de Afinidad y NLP)

A continuación se detallan los endpoints desarrollados y estabilizados por la Épica 3 durante los sprints para el motor de NLP y el Radar de Afinidad:

## Módulo Radar (`/api/v1/radar`)
- `GET /api/v1/radar` : Obtiene el porcentaje de afinidad y el vector de radar del titulado autenticado.
- `POST /api/v1/radar/recalculate` : Fuerza el recálculo del radar del titulado leyendo las fuentes actualizadas de su perfil.
- `GET /api/v1/radar/certifications/:area` : Obtiene la lista de certificaciones y sus respaldos (PDF/JPG) correspondientes a un área específica del radar.

## Módulo NLP (`/api/v1/nlp`)
- `POST /api/v1/nlp/extract` : Recibe texto plano y extrae las palabras clave (keywords) normalizadas y el conteo (`unmapped`) usando el diccionario cargado en memoria.

## Endpoints de Monitoreo
- `GET /health` : Endpoint de salud para verificar la disponibilidad de la API y la conexión a la base de datos (usado por DevOps y QA para el despliegue).