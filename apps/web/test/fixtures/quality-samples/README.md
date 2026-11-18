# Muestras sinteticas de calidad de imagen (HU-15)

Este directorio contiene muestras sinteticas controladas para calibrar y verificar el detector de calidad de imagen de documentos (HU-15).

## Descripcion de muestras y avisos esperados

| Archivo | Descripcion | Resolucion | Aviso esperado |
|---|---|---|---|
| `clara-01.jpg` | Documento sintetico nitido con tipografia y sello vectorial | 1600x2200 | Ninguno (Sin avisos) |
| `clara-02.jpg` | Documento nitido con ligera mayor luminancia | 1600x2200 | Ninguno (Sin avisos) |
| `clara-03.jpg` | Documento nitido con ligero ruido de fondo | 1600x2200 | Ninguno (Sin avisos) |
| `pequena-01.jpg` | Documento nitido escalado por debajo de limites | 800x1100 | `LOW_RESOLUTION` |
| `pequena-02.jpg` | Documento nitido en baja resolucion extrema | 600x800 | `LOW_RESOLUTION` |
| `pequena-03.jpg` | Documento nitido cerca del limite inferior | 950x1300 | `LOW_RESOLUTION` |
| `borrosa-01.jpg` | Desenfoque gaussiano suave (radio 5) | 1600x2200 | `BLURRY` |
| `borrosa-02.jpg` | Desenfoque gaussiano medio (radio 8) | 1600x2200 | `BLURRY` |
| `borrosa-03.jpg` | Desenfoque gaussiano intenso (radio 12) | 1600x2200 | `BLURRY` |
| `oscura-01.jpg` | Iluminacion muy reducida (luma media < 90) | 1600x2200 | `TOO_DARK` |
| `oscura-02.jpg` | Iluminacion deficiente extrema | 1600x2200 | `TOO_DARK` |
| `oscura-03.jpg` | Iluminacion atenuada cercana al umbral | 1600x2200 | `TOO_DARK` |
| `sobreexpuesta-01.jpg` | Imagen lavada por exceso de luz (alto brillo, bajo contraste) | 1600x2200 | `OVEREXPOSED` |
| `sobreexpuesta-02.jpg` | Reflejo central simulando destello de flash | 1600x2200 | `OVEREXPOSED` |
| `sobreexpuesta-03.jpg` | Destello amplio de flash cubriendo zona de texto | 1600x2200 | `OVEREXPOSED` |

## Metodo de generacion

Generadas sinteticamente mediante script en memoria (`Pillow`):
1. Se crea un lienzo base monocromatico de 1600x2200 px con estructura geometrica simulando un certificado/titulo universitario con encabezado, bloques de parrafos y sello.
2. Se generan variantes degradadas aplicando transformaciones parametricas (reescalado, desenfoque gaussiano, escalado de luminancia y mascara circular de destello).
3. Se comprimen en formato JPEG a 70% de calidad optimizada para mantener el peso de cada archivo por debajo de 150 KB.
