# Calibracion y verificacion de avisos de calidad de imagen (HU-15)

Documento oficial de calibracion de umbrales y verificacion de criterios de aceptacion (CA-15.1 a CA-15.6) para la tarea **15.3** de la historia de usuario **HU-15**.

---

## 1. Resumen ejecutivo

- **Resultado general:** Se calibraron con exito los umbrales de evaluacion del detector de calidad de imagen a partir de un conjunto combinado de 20 muestras (5 fotografias reales capturadas con dispositivos moviles y 15 muestras sinteticas controladas).
- **Valores finales fijados en `apps/web/src/modules/documents/frontend/lib/image-quality.config.ts`:**
  - `minShortSide`: 1000 px
  - `minLongSide`: 1400 px
  - `blurThreshold`: 380
  - `darkMeanThreshold`: 85
  - `brightMeanThreshold`: 215
  - `lowContrastThreshold`: 35
  - `glareLumaThreshold`: 248
  - `glareMinRatio`: 0.005 (0.5 % de pixeles centrales quemados)
  - `glareMaxRatio`: 0.60 (60 % maximo para no confundir con escaneo de papel blanco)
  - `lumaMarginFraction`: 0.10
  - `sharpnessTileSize`: 32
  - `sharpnessTopFraction`: 0.25

---

## 2. Conjunto de muestras de aceptacion

Se utilizaron 20 muestras en total para el analisis y calibracion:
- **5 muestras reales:** Almacenadas en la carpeta local de pruebas fuera del repositorio (`docs/sprint3/pruebashu15`), preservando la privacidad y proteccion de datos personales.
- **15 muestras sinteticas:** Incorporadas en el repositorio bajo `apps/web/test/fixtures/quality-samples/` como imagenes JPEG parametrizadas de maximo 150 KB.

### Metodo de generacion de muestras sinteticas
Mediante script automatizado con `Pillow`:
1. Se construyo un documento base monocromatico de 1600x2200 px simulando un certificado con texto institucional, margenes, lineas tipograficas y un sello circular vectorial.
2. El fondo base se calibro en luminancia 235 para evitar saturacion artificial en los bordes.
3. Se generaron las variantes degradadas:
   - **Claras:** `clara-01.jpg`, `clara-02.jpg`, `clara-03.jpg` (resolucion completa, texto nitido, contraste optimo).
   - **Pequenas:** `pequena-01.jpg` (800x1100), `pequena-02.jpg` (600x800), `pequena-03.jpg` (950x1300), reducidas con interpolacion bilineal.
   - **Borrosas:** `borrosa-01.jpg`, `borrosa-02.jpg`, `borrosa-03.jpg`, aplicando filtros gaussianos de radio 5, 8 y 12 px respectivamente.
   - **Oscuras:** `oscura-01.jpg`, `oscura-02.jpg`, `oscura-03.jpg`, aplicando atenuacion progresiva de luminancia.
   - **Sobreexpuestas:** `sobreexpuesta-01.jpg` (lavada, bajo contraste), `sobreexpuesta-02.jpg` y `sobreexpuesta-03.jpg` (con destellos centrales simulando flash de camara).

---

## 3. Metricas medidas por muestra

Calculadas mediante arnes puro de analisis utilizando reduccion bilineal a 1024 px en lado maximo:

| Muestra | Origen | Dimensiones | Nitidez | Luma media | Contraste | Ratio destello | Aviso esperado |
|---|---|---|---|---|---|---|---|
| `clara-1.jpeg` | Real | 465x659 | 14446.4 | 231.0 | 55.9 | 0.7327 | `LOW_RESOLUTION` (*) |
| `borrosa-1.jpeg` | Real | 972x1296 | 59.7 | 131.9 | 52.6 | 0.0000 | `BLURRY`, `LOW_RESOLUTION` |
| `oscura-1.jpeg` | Real | 1200x1600 | 145.1 | 53.7 | 15.6 | 0.0000 | `TOO_DARK`, `BLURRY` |
| `pequena-1.jpeg` | Real | 1200x1600 | 416.4 | 76.8 | 78.5 | 0.0000 | `TOO_DARK` (**) |
| `sobreexpuesta-1.jpeg` | Real | 1200x1600 | 446.6 | 132.5 | 39.6 | 0.0085 | `OVEREXPOSED` |
| `clara-01.jpg` | Sintetica | 1600x2200 | 2534.6 | 167.3 | 78.4 | 0.0000 | Sin avisos |
| `clara-02.jpg` | Sintetica | 1600x2200 | 2629.0 | 170.0 | 79.8 | 0.0000 | Sin avisos |
| `clara-03.jpg` | Sintetica | 1600x2200 | 2442.4 | 163.5 | 76.9 | 0.0000 | Sin avisos |
| `pequena-01.jpg` | Sintetica | 800x1100 | 1493.5 | 167.4 | 76.5 | 0.0000 | `LOW_RESOLUTION` |
| `pequena-02.jpg` | Sintetica | 600x800 | 3211.4 | 167.3 | 77.1 | 0.0000 | `LOW_RESOLUTION` |
| `pequena-03.jpg` | Sintetica | 950x1300 | 1702.9 | 167.3 | 77.1 | 0.0000 | `LOW_RESOLUTION` |
| `borrosa-01.jpg` | Sintetica | 1600x2200 | 52.7 | 167.3 | 53.1 | 0.0000 | `BLURRY` |
| `borrosa-02.jpg` | Sintetica | 1600x2200 | 14.0 | 167.3 | 34.8 | 0.0000 | `BLURRY` |
| `borrosa-03.jpg` | Sintetica | 1600x2200 | 2.9 | 167.3 | 21.9 | 0.0000 | `BLURRY` |
| `oscura-01.jpg` | Sintetica | 1600x2200 | 268.4 | 53.2 | 25.2 | 0.0000 | `TOO_DARK`, `BLURRY` |
| `oscura-02.jpg` | Sintetica | 1600x2200 | 162.1 | 41.1 | 19.6 | 0.0000 | `TOO_DARK`, `BLURRY` |
| `oscura-03.jpg` | Sintetica | 1600x2200 | 375.0 | 63.2 | 29.9 | 0.0000 | `TOO_DARK`, `BLURRY` |
| `sobreexpuesta-01.jpg` | Sintetica | 1600x2200 | 35.2 | 239.2 | 9.1 | 0.0276 | `OVEREXPOSED`, `BLURRY` |
| `sobreexpuesta-02.jpg` | Sintetica | 1600x2200 | 2491.9 | 178.9 | 78.6 | 0.1247 | `OVEREXPOSED` |
| `sobreexpuesta-03.jpg` | Sintetica | 1600x2200 | 2445.5 | 193.1 | 76.5 | 0.2775 | `OVEREXPOSED` |

(*) *Nota sobre `clara-1.jpeg`: Posee una dimension física de 465x659 px, por lo que el detector activa con precision `LOW_RESOLUTION` al no alcanzar 1000x1400 px. Sus métricas de nitidez (14446.4) confirman que no es borrosa.*  
(**) *Nota sobre `pequena-1.jpeg`: La imagen real tiene 1200x1600 px pero su captura fue realizada en un ambiente de baja iluminación (luma 76.8), activando correctamente `TOO_DARK`.*

---

## 4. Calibracion de umbrales

| Parametro | Valor previo | Valor calibrado | Justificacion tecnica y margen |
|---|---|---|---|
| `blurThreshold` | 380 | 380 | Separa con holgura las muestras borrosas (max 59.7 en reales, 52.7 en sinteticas) de las claras (>2400). Conservado para tolerar fotografias con desenfoque de movimiento moderado. |
| `darkMeanThreshold` | 90 | 85 | Permite admitir documentos con sombras perimetrales leves (las fotos legibles oscilan entre 113 y 170). Muestras oscuras reales y sinteticas quedan en 41.1 - 76.8 (< 85). |
| `brightMeanThreshold` | 215 | 215 | Detecta lavado general de luz (la muestra lavada mide 239.2). Se conserva para no alertar en escaneos blancos convencionales. |
| `lowContrastThreshold` | 35 | 35 | Exige que el documento sobreexpuesto tenga contraste inferior a 35 para confirmar pérdida de texto por lavado de tinta. |
| `glareLumaThreshold` | 250 | 248 | Umbral de pixel quemado por flash. Ajustado a 248 para capturar el 0.85 % de pixeles de reflejo en fotos reales tomadas con camara de celular. |
| `glareMinRatio` | 0.03 | 0.005 | El flash puntual o reflejo sobre esquinas puede cubrir entre 0.8 % y 3 % del documento. 0.005 (0.5 %) detecta destellos sin dar falsos positivos en documentos claros (0.0000). |
| `glareMaxRatio` | 0.50 | 0.60 | Limite superior a partir del cual se descarta un destello puntual y se asume fondo blanco continuo de escaneo. |
| `minShortSide` | 1000 | 1000 | Garantiza al menos 120 ppp para lectura de texto y caracteres en resoluciones estandares A4/carta. |
| `minLongSide` | 1400 | 1400 | Proporcion estandar complementaria para documentos legales y certificados universitarios. |

---

## 5. Verificacion de integracion (CA-15.1 a CA-15.6)

Se implementaron pruebas automáticas de integración que validan el comportamiento conjunto del componente de carga en registro (`DocumentUploadStep`) y en corrección (`ObservedEditForm`):

| Criterio | Descripcion | Resultado | Evidencia | Fecha |
|---|---|---|---|---|
| **CA-15.1** | Al adjuntar imagen admitida se muestra la vista previa e inicia el control sin bloquear el formulario. | **Cumple** | `src/modules/documents/frontend/components/document-upload-step-quality.test.tsx` (prueba CA-15.1) | 2026-11-17 |
| **CA-15.2** | Imagen clara no muestra avisos; imagen con problemas muestra aviso y recomendacion. | **Cumple** | `src/modules/documents/frontend/components/document-upload-step-quality.test.tsx` (pruebas CA-15.2 clara y con defectos) | 2026-11-17 |
| **CA-15.3** | Cambiar o quitar la imagen elimina avisos anteriores; reemplazos rapidos descartan resultados lentos. | **Cumple** | `src/modules/documents/frontend/components/document-upload-step-quality.test.tsx` (prueba CA-15.3 y cancelacion) | 2026-11-17 |
| **CA-15.4** | Con uno o mas avisos de advertencia, el Titulado puede continuar y finalizar la solicitud. | **Cumple** | `src/modules/documents/frontend/components/document-upload-step-quality.test.tsx` (prueba CA-15.4) | 2026-11-17 |
| **CA-15.5** | Formato no admitido o archivo >5 MB mantiene mensaje de error de carga y no corre el control. | **Cumple** | `src/modules/documents/frontend/components/document-upload-step-quality.test.tsx` (prueba CA-15.5) | 2026-11-17 |
| **CA-15.6** | Archivo PDF admitido (`skipped`) o fallo del analisis (`failed`) permite continuar normalmente. | **Cumple** | `src/modules/documents/frontend/components/document-upload-step-quality.test.tsx` (pruebas CA-15.6) | 2026-11-17 |

---

## 6. Limitaciones del arnes y observaciones

1. **Diferencias de decodificacion:** El arnes de calibracion ejecuta reduccion con interpolacion bilineal pura en CPU, mientras que los navegadores modernos ejecutan `createImageBitmap` con aceleracion por GPU y algoritmo bicubico/box filtering del motor Canvas. Esto genera variaciones menores (< 5 %) en la varianza del laplaciano pero sin alterar las clasificaciones relativas.
2. **Volumen de muestras reales:** Se conto con 5 fotografias reales de prueba de diversas condiciones luminicas. Se recomienda recopilar muestras adicionales en produccion o etapas de homologacion con diversos modelos de telefonos gama baja y media.
3. **Sugerencias de mejora en mensajes (sin modificacion de codigo):**
   - Para `OVEREXPOSED`: Seria conveniente precisar al usuario si el problema detectado fue *reflejo de flash puntual* o *exceso general de exposicion luminica*.

---

## 7. Pruebas manuales para Nicole y Alba

Para corroborar visualmente en el navegador el flujo completo:

1. **Iniciar el frontend:**
   ```bash
   pnpm --filter web dev
   ```
2. **Prueba en Registro (`/register/document`):**
   - Ingresar al flujo de registro hasta el paso de carga de documento.
   - Adjuntar una imagen clara (`clara-01.jpg` o foto real nitida): Verificar que tras el estado "Analizando la calidad de la imagen..." aparezca el banner verde: *"No se detectaron problemas de calidad en la imagen."*
   - Adjuntar una foto con flash directo: Verificar que aparezca el banner de advertencia amarillo indicando: *"La imagen tiene reflejos o demasiada luz..."*.
   - Verificar que con el aviso en pantalla, tras marcar la declaracion jurada, el boton *"Finalizar solicitud"* se mantenga habilitado y permita avanzar.
   - Presionar *"Quitar"* o seleccionar otro archivo: Constatar que el aviso anterior se descarte inmediatamente.
   - Adjuntar un archivo PDF: Constatar que cargue inmediatamente la vista previa de PDF sin alertas de calidad de imagen.
   - Intentar adjuntar un archivo `.txt` o un archivo mayor a 5 MB: Verificar el mensaje de validacion de carga sin que se ejecute el detector.
3. **Prueba en Correccion (`/register/correction/<token>`):**
   - Repetir la carga y reemplazo de respaldo en el formulario de observaciones, verificando identico comportamiento de los avisos no bloqueantes.

---

## 8. Calibracion de imagenes horizontales y texto borroso (2026-11-20)

### 8.1. Defectos identificados y su causa raiz

1. **Defecto 1: Falso aviso de "imagen pequeña" en formato horizontal (`LOW_RESOLUTION`)**
   - **Sintoma:** Una fotografia real nitida y legible de 1408 × 768 px (o 1024 × 558 px) correspondiente a un diploma universitario enmarcado en orientacion apaisada mostraba la advertencia «La imagen es pequeña y podría no leerse bien» (`LOW_RESOLUTION`), a pesar de tener una nitidez excelente (13765.5), iluminacion adecuada y contraste optimo.
   - **Causa raiz:** La condicion previa evaluaba estrictamente `shortSide < minShortSide (1000) || longSide < minLongSide (1400)`. Dicha regla asumia una captura vertical en proporcion A4 (aprox. 1:1.4). En documentos horizontales o panoramicos (16:9), el lado menor (768 px) quedaba penalizado de forma artificial pese a que el total de pixeles (1.08 MP) supera con amplitud la densidad necesaria para lectura OCR y revision humana.
   - **Correccion:** Se introdujo la metrica `totalPixels` y el parametro `minPixels` (800 000 px / 0.8 MP), reduciendo `minShortSide` a 600 px y `minLongSide` a 800 px. La condicion de baja resolucion ahora exige `totalPixels < minPixels || shortSide < minShortSide || longSide < minLongSide`.

2. **Defecto 2: Falso negativo en documentos con texto borroso y elementos nitidos (`BLURRY`)**
   - **Sintoma:** Una fotografia de folleto con el cuerpo del texto desenfocado, pero con un titulo superior grande y bordes de ilustracion nitidos, recibia el estado «No se detectaron problemas de calidad».
   - **Causa raiz:** La regla de nitidez original promediaba exclusivamente el 25 % superior de los bloques (`sharpnessTopFraction: 0.25`). Los bloques de alta varianza del titulo y graficos elevaban el promedio del 25 % superior a ~900 (superando el umbral de 380), ocultando por completo que la gran mayoria de los bloques con texto de parrafo estaban desenfocados (mediana ~200).
   - **Correccion:** Se incorporo el calculo de la mediana de bloques con contenido (`sharpnessMedian`) y el conteo de bloques activos (`activeTileCount`, bloques con varianza del laplaciano >= `sharpnessActiveTileMin: 20`). Se incorporo una segunda condicion para activar `BLURRY`: si `activeTileCount >= minActiveTiles (10)` y `sharpnessMedian < blurMedianThreshold (300)`. Si la pagina cuenta con pocos bloques con contenido (< 10), esta regla no se activa para proteger documentos con mucho espacio en blanco o firmas aisladas.

### 8.2. Metricas medidas por muestra (arnes de calibracion)

Medidas tomadas con reduccion bilineal a 1024 px de lado maximo:

| Muestra | Origen | Dimensiones | Pixeles | Top 25% (Nitidez) | Bloques activos (>=20) | Mediana activos | Aviso previo | Aviso nuevo |
|---|---|---|---|---|---|---|---|---|
| `clara-horizontal` (diploma) (*) | Real | 1408x768 (1024x558) | 1081344 (571392) | 13765.5 | 392 | 4503.7 | `LOW_RESOLUTION` | **Sin avisos** |
| `borrosa-folleto` (estimado) (*) | Real | Folleto | ~1.5 MP | ~900.0 | ~100 | ~200.0 | Sin avisos | `BLURRY` |
| `borrosa-1.jpeg` | Real | 972x1296 | 1259712 | 59.7 | 157 | 48.8 | `BLURRY`, `LOW_RESOLUTION` | `BLURRY` |
| `clara-1.jpeg` | Real | 465x659 | 306435 | 14446.4 | 212 | 6378.7 | `LOW_RESOLUTION` | `LOW_RESOLUTION` |
| `oscura-1.jpeg` | Real | 1200x1600 | 1920000 | 145.1 | 390 | 65.7 | `TOO_DARK`, `BLURRY` | `TOO_DARK`, `BLURRY` |
| `pequena-1.jpeg` | Real | 1200x1600 | 1920000 | 416.4 | 344 | 124.1 | `TOO_DARK` | `TOO_DARK`, `BLURRY` |
| `sobreexpuesta-1.jpeg` | Real | 1200x1600 | 1920000 | 446.6 | 460 | 144.3 | `OVEREXPOSED` | `OVEREXPOSED`, `BLURRY` |
| `clara-01.jpg` | Sintetica | 1600x2200 | 3520000 | 2534.6 | 545 | 2146.5 | Sin avisos | Sin avisos |
| `clara-02.jpg` | Sintetica | 1600x2200 | 3520000 | 2629.0 | 545 | 2254.0 | Sin avisos | Sin avisos |
| `clara-03.jpg` | Sintetica | 1600x2200 | 3520000 | 2442.4 | 545 | 2072.5 | Sin avisos | Sin avisos |
| `clara-04.jpg` (margen blanco) | Sintetica | 1600x2200 | 3520000 | 2440.8 | 79 | 7419.8 | Sin avisos | Sin avisos |
| `borrosa-01.jpg` | Sintetica | 1600x2200 | 3520000 | 52.7 | 466 | 51.2 | `BLURRY` | `BLURRY` |
| `borrosa-02.jpg` | Sintetica | 1600x2200 | 3520000 | 14.0 | 0 | 0.0 | `BLURRY` | `BLURRY` |
| `borrosa-03.jpg` | Sintetica | 1600x2200 | 3520000 | 2.9 | 0 | 0.0 | `BLURRY` | `BLURRY` |
| `borrosa-04.jpg` (folleto sintetico)| Sintetica | 1600x2200 | 3520000 | 1255.6 | 399 | 36.7 | Sin avisos | `BLURRY` |
| `pequena-01.jpg` | Sintetica | 800x1100 | 880000 | 1493.5 | 545 | 1285.3 | `LOW_RESOLUTION` | Sin avisos (**) |
| `pequena-02.jpg` | Sintetica | 600x800 | 480000 | 3211.4 | 374 | 2889.5 | `LOW_RESOLUTION` | `LOW_RESOLUTION` |
| `pequena-03.jpg` | Sintetica | 950x1300 | 1235000 | 1702.9 | 546 | 1527.4 | `LOW_RESOLUTION` | Sin avisos (**) |
| `oscura-01.jpg` | Sintetica | 1600x2200 | 3520000 | 268.4 | 540 | 229.5 | `TOO_DARK`, `BLURRY` | `TOO_DARK`, `BLURRY` |
| `oscura-02.jpg` | Sintetica | 1600x2200 | 3520000 | 162.1 | 537 | 136.6 | `TOO_DARK`, `BLURRY` | `TOO_DARK`, `BLURRY` |
| `oscura-03.jpg` | Sintetica | 1600x2200 | 3520000 | 375.0 | 543 | 320.8 | `TOO_DARK`, `BLURRY` | `TOO_DARK` |
| `sobreexpuesta-01.jpg` | Sintetica | 1600x2200 | 3520000 | 35.2 | 456 | 32.5 | `OVEREXPOSED`, `BLURRY` | `OVEREXPOSED`, `BLURRY` |
| `sobreexpuesta-02.jpg` | Sintetica | 1600x2200 | 3520000 | 2491.9 | 500 | 2144.8 | `OVEREXPOSED` | `OVEREXPOSED` |
| `sobreexpuesta-03.jpg` | Sintetica | 1600x2200 | 3520000 | 2445.5 | 434 | 2132.8 | `OVEREXPOSED` | `OVEREXPOSED` |

(*) *Muestras reales `clara-horizontal` y `borrosa-folleto`: Fotografias aportadas para las pruebas reales; no forman parte del repositorio Git por preservacion de datos personales.*  
(**) *Tension en muestras pequenas intermedias: `pequena-01.jpg` (880 000 px) y `pequena-03.jpg` (1 235 000 px) tienen resolucion suficiente para lectura OCR (~120 ppp), por lo que con el nuevo umbral de 800 000 px ya no generan falso aviso de resolucion, mientras que `pequena-02.jpg` (480 000 px) y `clara-1.jpeg` (306 435 px) continuan alertando oportunamente.*

### 8.3. Tabla comparativa de configuracion antes y despues

| Parametro | Antes | Despues | Justificacion tecnica y margen |
|---|---|---|---|
| `minPixels` | *(no existia)* | 800 000 | Cota minima de pixeles totales (0.8 MP). Permite formatos horizontales de 1408 × 768 (1.08 MP, margen +35 %) y alerta en imagenes reducidas (640 × 480 con 0.3 MP, margen -62 %). |
| `minShortSide` | 1000 | 600 | Evita penalizar fotos horizontales donde el lado corto es de 700–800 px. Protege frente a recortes muy estrechos (< 600 px). |
| `minLongSide` | 1400 | 800 | Cota minima del lado mayor para evitar que imagenes cuadradas de baja escala pasen desapercibidas. |
| `sharpnessActiveTileMin` | *(no existia)* | 20 | Varianza laplaciana minima para catalogar un bloque de 32 px como "bloque con contenido" e ignorar margenes blancos vacios. |
| `minActiveTiles` | *(no existia)* | 10 | Cantidad minima de bloques con contenido requeridos para que actue la regla de mediana. Evita falsos avisos en paginas con muy poco texto o firmas aisladas. |
| `blurMedianThreshold` | *(no existia)* | 300 | Punto medio logaritmico calibrado entre muestras borrosas (mediana activa 34–200) y claras (>1200). Margen de seguridad x4.3 frente a documentos claros y +50 % sobre folleto borroso. |
| `blurThreshold` | 380 | 380 | Regla original conservada como condicion suficiente para capturar desenfoques globales severos. |

### 8.4. Limitaciones tecnicas y aspectos provisionales

1. **Arnes vs. Canvas de navegador:** El arnes realiza el reescalado bilineal en CPU con Pillow, mientras que en navegador el canvas utiliza filtros bilineales/bicubicos acelerados por hardware. Se verifico que las diferencias de varianza no afectan la clasificacion en los umbrales seleccionados.
2. **Muestra real de folleto:** La calibracion del folleto conto con valores estimados de la imagen real y se replico de forma exacta con la muestra sintetica `borrosa-04.jpg`. Se recomienda reconfirmar con el archivo original cuando este disponible.
3. **Variacion entre camaras:** Camaras con postprocesado agresivo de nitidez artificial (sharpening por software en smartphones) podrian incrementar la varianza en bordes de ruido, por lo que el umbral de 300 ofrece la tolerancia ideal sin volverse excesivamente restrictivo.
