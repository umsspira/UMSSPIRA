# Nota Técnica para HU-11 y Product Owner (PO)
## Retiro de equivalencia provisional Java/JavaScript en cálculo de afinidad laboral

**Fecha:** 20 de noviembre de 2026  
**Historia de Usuario:** HU-10 (Servicio de matching en backend)  
**Destinatarios:** Equipo de HU-11 (Similitud avanzada del motor) y Product Owner  

---

### 1. Contexto del cambio

En la implementación anterior del frontend (`apps/web/src/shared/services/job-posting-affinity.ts`), el cálculo de afinidad contenía una regla manual provisional de coincidencia de substrings:

```typescript
word === 'java' && skillWord === 'javascript'
```

Esta regla provocaba que candidatos con conocimientos en «Java» cumplieran automáticamente requisitos de «JavaScript» (y en algunos casos por inclusión de subcadenas a la inversa), inflando de forma artificial el porcentaje de afinidad laboral.

Con la finalización de **HU-10** (T10.6), el cálculo en el cliente fue eliminado y sustituido en su totalidad por el endpoint de backend `POST /api/v1/affinity/batch`, que aplica la política canónica del motor de matching.

---

### 2. Impacto esperado en los porcentajes

- **Java NO cumple JavaScript ni viceversa**: En HU-10, ambas tecnologías se tratan como términos técnicos independientes y estrictamente disjuntos.
- **Descenso de porcentajes en perfiles existentes**: Los egresados cuyo perfil registraba «Java» frente a vacantes de «JavaScript» experimentarán una reducción en su porcentaje de afinidad respecto a lo que visualizaban con el motor de frontend antiguo.
- **Claridad de estados**:
  - `ready` con `0 %` refleja con precisión un perfil completo que no cumple los requisitos técnicos.
  - Se distingue de `profile-incomplete` (sin porcentaje) y `no-requirements` (vacante sin requisitos técnicos).

---

### 3. Transición hacia HU-11

La **HU-11** (*Similitud avanzada del motor*) incorporará de forma estructurada:
1. Normalización y procesamiento NLP de los requisitos técnicos de las vacantes a través del catálogo de palabras clave y la tabla `alias_palabra_clave`.
2. Ponderación diferenciada para coincidencias exactas (100 %) y coincidencias similares/parciales (50 %).
3. Stemming liviano para términos técnicos en español e inglés sin unificar tecnologías distintas (respetando la regla de no fusionar tokens como `java` y `javascript`).

Esta nota queda documentada para que el PO y el equipo de HU-11 puedan defender ante los usuarios y evaluadores la variación en los porcentajes tras la integración del motor centralizado.
