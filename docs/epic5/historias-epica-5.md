# Épica 5 · Estudios de Vacantes y Bolsa de Trabajo
## Informe de Historias de Usuario, Reparto y Estado para la PO

**Fecha:** 20 de noviembre de 2026  
**Contexto:** la épica 5 se disolvió el 17/11/2026 por orden de la PO y sus historias pendientes se repartieron como deuda técnica entre los 8 grupos de desarrollo (épicas 1 a 4 y 6 a 9). Base: `epic5-hus-pendientes.pdf` (Saul, 19/11/2026).  
**Esfuerzo total:** 12 Historias de Usuario · 40 Story Points (5 SP por grupo).

---

## 1. Resumen

El flujo básico de la Épica 5 (Estudios de Vacantes y Bolsa de Empleo) ya funcionaba: publicar vacantes, listado, detalle, postulación, mis postulaciones, mis vacantes y gestión de postulantes con etapas. Faltaba el motor de afinidad en el backend, los requisitos técnicos estructurados, la privacidad del postulante con su CV, la ayuda en pantalla y la demo a la PO.

Las 12 historias pendientes se repartieron entre los 8 grupos y se ordenaron en 3 olas según sus dependencias. El estado de cada una se tomó de GitHub (`umsspira/UMSSPIRA`) el 20/11/2026.

---

## 2. Matriz de las 12 Historias de Usuario

| ID | Historia de Usuario | SP | Grupo | Ola | Depende de | Estado (20/11/2026) | Alcance principal |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- | :--- |
| **HU-09** | Requisitos técnicos estructurados en la vacante | 3 | Épica 6 | 1 | Ninguna | En `dev` (PR #921) | Endpoint para escribir `vacante_requisito_tecnico` con Zod y permisos, nombre normalizado, campo de requisitos al publicar y editar la vacante, y seeds con requisitos. |
| **HU-10** | Servicio de matching en backend | 5 | Épica 1 | 1 | HU-09 | Sin PR | Cálculo de la afinidad en el servidor con el servicio NLP, contrato `comparison[]` en `packages/shared-types`, `porcentaje_match` guardado con su fecha, endpoint por lote y fallos controlados. |
| **HU-11** | Similitud avanzada del motor | 5 | Épica 2 | 2 | HU-10 | Sin PR | Requisitos procesados con el mismo NLP que el perfil, pesos de coincidencia exacta y parcial, medida de similitud documentada, conjunto de prueba con métrica mínima y versionado del algoritmo. |
| **HU-12** | Recálculo automático de afinidad | 3 | Épica 7 | 2 | HU-10 | Sin PR | Recálculo al guardar el perfil, al editar, pausar o cerrar una vacante y al postularse, con hash de entrada y actualización en vivo de las pantallas. |
| **HU-13** | Editar vacante validada | 2 | Épica 6 | 3 | HU-09 | En `dev` (PR #910) | Validación Zod del PATCH, protección contra doble envío en el backend, edición por los miembros activos de la empresa y recálculo de la afinidad al guardar. |
| **HU-14** | Ciclo de vida de la vacante con permisos | 3 | Épica 8 | 1 | Ninguna | Sin PR | Permisos y verificación de empresa en `PATCH /vacantes/:id/cerrar`, un solo vocabulario de estados entre módulos, regla única para vacantes pausadas o cerradas y pruebas negativas de autorización. |
| **HU-15** | Comparación real postulante-vacante | 5 | Épica 4 | 2 | HU-09, HU-10 | Sin PR | Desglose `comparison[]` real por postulante, habilidades reales del perfil, pantalla de postulantes sin datos de ejemplo y pestaña «Coincidencia técnica» con datos reales. |
| **HU-16** | Privacidad del titulado y CV | 3 | Épica 9 | 3 | Ninguna | **Completa en `epic9`** (PR #928, #925, #935 y #923) | Política de datos del postulante con proyección única, subida y reemplazo del CV en PDF guardado en PostgreSQL, sección «Currículum (CV)» en el perfil y «Descargar CV» solo para la empresa de la vacante. |
| **HU-17** | Suite de pruebas de Épica 5 | 5 | Épica 3 | 1 | HU-10 (para las pruebas del matching) | En revisión (PR #924) | Pruebas e2e de la API de postulación y postulantes, integración del matching con Postgres, regresión del motor y pruebas web pendientes, todo en verde en el CI. |
| **HU-18** | Rendimiento y accesibilidad | 2 | Épica 7 | 3 | HU-10 | Sin PR | Listado de 50 vacantes en menos de 3 segundos con el endpoint por lote, tabla de vacantes adaptada al móvil y datos del radar y del desglose accesibles para lectores de pantalla. |
| **HU-19** | Datos de prueba y ambiente de demo | 2 | Épica 8 | 2 | HU-09 | Sin PR | Seeds de demostración con requisitos, perfiles y postulaciones; `NEXT_PUBLIC_USE_MOCK=false` por defecto; base de datos de producción al día y lista de control antes de la demo. Bloquea a la HU-20. |
| **HU-20** | Documentación y demo a la PO | 2 | Épica 9 | 3 | HU-19 | En curso: T20.2 fusionada (PR #934), T20.3 en revisión (PR #936), T20.1 con rama y sin PR, T20.4 después de la demo | Página «Ayuda · Bolsa de trabajo» con los pasos del titulado y del reclutador, ventana «¿Cómo se calcula?» junto a cada porcentaje de afinidad, ejemplos comprobables y demo en vivo a la PO. |

---

## 3. Distribución de Carga por Grupo (40 SP)

```
Épica 1  █████  (5 SP: HU-10)
Épica 2  █████  (5 SP: HU-11)
Épica 3  █████  (5 SP: HU-17)
Épica 4  █████  (5 SP: HU-15)
Épica 6  █████  (5 SP: HU-09 [3] + HU-13 [2])
Épica 7  █████  (5 SP: HU-12 [3] + HU-18 [2])
Épica 8  █████  (5 SP: HU-14 [3] + HU-19 [2])
Épica 9  █████  (5 SP: HU-16 [3] + HU-20 [2])
```

---

## 4. Olas de Trabajo y Dependencias

1. **Ola 1 (cimientos):**
   - **HU-09 (Épica 6):** requisitos técnicos estructurados.
   - **HU-10 (Épica 1):** motor de matching en el backend.
   - **HU-14 (Épica 8):** ciclo de vida y cierre seguro de vacantes.
   - **HU-17 (Épica 3):** suite de pruebas.

2. **Ola 2 (consumen el matching y preparan los datos):**
   - **HU-11 (Épica 2):** similitud avanzada y pesos.
   - **HU-12 (Épica 7):** recálculo automático.
   - **HU-15 (Épica 4):** comparación real postulante-vacante.
   - **HU-19 (Épica 8):** datos de prueba y ambiente de demo.

3. **Ola 3 (cierre, calidad y demo):**
   - **HU-13 (Épica 6):** edición de vacantes validada.
   - **HU-16 (Épica 9):** privacidad del titulado y CV.
   - **HU-18 (Épica 7):** rendimiento y accesibilidad.
   - **HU-20 (Épica 9):** ayuda, «¿Cómo se calcula?» y demo de punta a punta.

---

## 5. Deuda Técnica Heredada

| Ítem | Problema heredado | Prioridad | Se resuelve con | Estado (20/11/2026) |
| :---: | :--- | :---: | :--- | :--- |
| **1** | `PATCH /vacantes/:id/cerrar` sin verificación de empresa ni permisos. | Alta (seguridad) | HU-14 (Épica 8) | Pendiente |
| **2** | `porcentaje_match` sin motor que lo calcule ni lo guarde. | Alta | HU-10 (Épica 1) | Pendiente |
| **3** | `NEXT_PUBLIC_USE_MOCK` activo por defecto en `applicants.ts`: la pantalla de postulantes mostraba datos de ejemplo. | Alta | HU-15 (Épica 4) | En `epic9` ya está apagado por defecto (PR #923); falta en el resto de las ramas |
| **4** | Migraciones pendientes en la base de producción que rompen `/job-postings`. | Alta | HU-19 (Épica 8) | Pendiente |
| **5** | Tabla `vacante_requisito_tecnico` sin escritura ni seeds. | Media | HU-09 (Épica 6) | En `dev` (PR #921) |
| **6** | Estados de la vacante distintos entre módulos. | Media | HU-14 (Épica 8) | Pendiente |
| **7** | Módulo `vacantes` fuera de la convención del repo (sin arquitectura hexagonal ni Zod, respuestas sin `{ data }`). | Media | HU-13, HU-14 y HU-15 | En curso: HU-13 en `dev` |
| **8** | `HUXX.md` sin renombrar, enlace roto en el README de job-postings y `affinity-summary-card.tsx` sin usar. | Baja | HU-20 · T20.3 (Épica 9) | Resuelto en el PR #936 |

---

## 6. Tasks de la Épica 9

- **HU-16 (Privacidad del titulado y CV), completa:**
  - **T16.1 (Paul Rodrigo Larico Viscarra):** política de datos y proyección única del postulante (`docs/epic5/politica-datos-postulante.md`). Fusionada (PR #928).
  - **T16.2 (Diego Montaño):** `PUT /api/v1/perfil/cv`, `GET /api/v1/perfil/cv` y `GET /api/v1/vacantes/:idVacante/postulantes/:idPostulacion/cv`. Fusionada (PR #925).
  - **T16.3 (Natalie Saravia):** sección «Currículum (CV)» en `/profile` con la ventana «¿Qué datos ve la empresa?». Fusionada (PR #935).
  - **T16.4 (Dadier Cadima):** «Descargar CV» y pestaña «Perfil» en el detalle del postulante. Fusionada (PR #923).
- **HU-20 (Documentación y demo a la PO), en curso:**
  - **T20.1 (Miguel Angel Vargas):** ventana «¿Cómo se calcula?» y pestaña «Cómo funciona la afinidad». Rama creada, sin PR; depende de la HU-10 y la HU-11.
  - **T20.2 (Paul Rodrigo Larico Viscarra):** página `/ayuda/bolsa-de-trabajo` con las pestañas del titulado y del reclutador. Fusionada (PR #934).
  - **T20.3 (Alex Saavedra):** este informe y la limpieza de la documentación. En revisión (PR #936).
  - **T20.4 (Juan Carlos Anagua):** guion, ensayo, demo en vivo a la PO y acta. Depende de la HU-19 y del resto de las HU.
