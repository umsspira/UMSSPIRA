import { IMAGE_QUALITY_CONFIG } from "./image-quality.config";
import type {
  ImageQualityConfig,
  ImageQualityMetrics,
  ImageQualityResult,
  ImageQualityWarning,
  PixelBuffer,
} from "./image-quality.types";

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png"];

/** Convierte los pixeles RGBA a luminosidad (0 a 255) con la formula Rec. 601. */
export function toLuma(pixels: PixelBuffer): Float32Array {
  const { data, width, height } = pixels;
  const luma = new Float32Array(width * height);
  for (let i = 0, p = 0; i < luma.length; i += 1, p += 4) {
    luma[i] = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
  }
  return luma;
}

/** Luminosidad media y contraste de la zona central, sin los margenes. */
export function measureLighting(
  luma: Float32Array,
  width: number,
  height: number,
  marginFraction: number,
): { meanLuma: number; contrast: number } {
  const startX = Math.floor(width * marginFraction);
  const endX = Math.ceil(width * (1 - marginFraction));
  const startY = Math.floor(height * marginFraction);
  const endY = Math.ceil(height * (1 - marginFraction));

  let sum = 0;
  let sumSquares = 0;
  let count = 0;
  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      const value = luma[y * width + x];
      sum += value;
      sumSquares += value * value;
      count += 1;
    }
  }
  if (count === 0) return { meanLuma: 0, contrast: 0 };

  const meanLuma = sum / count;
  const variance = Math.max(0, sumSquares / count - meanLuma * meanLuma);
  return { meanLuma, contrast: Math.sqrt(variance) };
}

/**
 * Nitidez como varianza del laplaciano, calculada por bloques. Se promedian
 * solo los bloques con mas detalle para que los margenes blancos de un
 * documento no hagan parecer borrosa a una foto nitida.
 */
export function measureSharpness(
  luma: Float32Array,
  width: number,
  height: number,
  tileSize: number,
  topFraction: number,
): number {
  const tileVariances: number[] = [];

  for (let tileY = 0; tileY < height; tileY += tileSize) {
    for (let tileX = 0; tileX < width; tileX += tileSize) {
      const yStart = Math.max(1, tileY);
      const yEnd = Math.min(height - 1, tileY + tileSize);
      const xStart = Math.max(1, tileX);
      const xEnd = Math.min(width - 1, tileX + tileSize);

      let sum = 0;
      let sumSquares = 0;
      let count = 0;
      for (let y = yStart; y < yEnd; y += 1) {
        for (let x = xStart; x < xEnd; x += 1) {
          const index = y * width + x;
          const laplacian =
            luma[index - width] +
            luma[index + width] +
            luma[index - 1] +
            luma[index + 1] -
            4 * luma[index];
          sum += laplacian;
          sumSquares += laplacian * laplacian;
          count += 1;
        }
      }
      if (count === 0) continue;

      const mean = sum / count;
      tileVariances.push(Math.max(0, sumSquares / count - mean * mean));
    }
  }

  if (tileVariances.length === 0) return 0;

  tileVariances.sort((a, b) => b - a);
  const takeCount = Math.max(1, Math.ceil(tileVariances.length * topFraction));
  let total = 0;
  for (let i = 0; i < takeCount; i += 1) total += tileVariances[i];
  return total / takeCount;
}

/** Calcula las metricas de calidad de una imagen ya reducida. */
export function computeImageQualityMetrics(
  pixels: PixelBuffer,
  originalWidth: number,
  originalHeight: number,
  config: ImageQualityConfig = IMAGE_QUALITY_CONFIG,
): ImageQualityMetrics {
  const luma = toLuma(pixels);
  const { meanLuma, contrast } = measureLighting(
    luma,
    pixels.width,
    pixels.height,
    config.lumaMarginFraction,
  );
  const sharpness = measureSharpness(
    luma,
    pixels.width,
    pixels.height,
    config.sharpnessTileSize,
    config.sharpnessTopFraction,
  );
  return { originalWidth, originalHeight, meanLuma, contrast, sharpness };
}
/** Convierte las metricas en avisos para el Titulado. Cero avisos si todo esta bien. */
export function evaluateImageQuality(
  metrics: ImageQualityMetrics,
  config: ImageQualityConfig = IMAGE_QUALITY_CONFIG,
): ImageQualityWarning[] {
  const warnings: ImageQualityWarning[] = [];

  const shortSide = Math.min(metrics.originalWidth, metrics.originalHeight);
  const longSide = Math.max(metrics.originalWidth, metrics.originalHeight);
  if (shortSide < config.minShortSide || longSide < config.minLongSide) {
    warnings.push({
      code: "LOW_RESOLUTION",
      message: "La imagen es pequeña y podría no leerse bien.",
      recommendation:
        "Acércate al documento, toma la foto con buena luz o sube el archivo original sin reducirlo.",
    });
  }

  if (metrics.sharpness < config.blurThreshold) {
    warnings.push({
      code: "BLURRY",
      message: "La imagen parece borrosa.",
      recommendation:
        "Sostén firme el celular, enfoca el documento y vuelve a tomar la foto.",
    });
  }

  if (metrics.meanLuma < config.darkMeanThreshold) {
    warnings.push({
      code: "TOO_DARK",
      message: "La imagen está muy oscura.",
      recommendation:
        "Busca un lugar con más luz, sin sombras sobre el documento, y vuelve a tomarla.",
    });
  } else if (
    metrics.meanLuma > config.brightMeanThreshold &&
    metrics.contrast < config.lowContrastThreshold
  ) {
    warnings.push({
      code: "OVEREXPOSED",
      message: "La imagen tiene demasiada luz y el texto podría perderse.",
      recommendation:
        "Evita el flash y la luz directa sobre el documento, y vuelve a tomarla.",
    });
  }

  return warnings;
}

/** Reduce las dimensiones para que el lado mayor no supere maxSide. */
export function getAnalysisSize(
  width: number,
  height: number,
  maxSide: number,
): { width: number; height: number } {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export const SKIPPED_RESULT: ImageQualityResult = {
  status: "skipped",
  warnings: [],
  metrics: null,
};

export const FAILED_RESULT: ImageQualityResult = {
  status: "failed",
  warnings: [],
  metrics: null,
};

export const IDLE_RESULT: ImageQualityResult = {
  status: "idle",
  warnings: [],
  metrics: null,
};



interface DecodedImage {
  pixels: PixelBuffer;
  originalWidth: number;
  originalHeight: number;
}

/** Decodifica el archivo y lo reduce en un canvas. Solo corre en el navegador. */
async function decodeImageFile(
  file: File,
  maxSide: number,
): Promise<DecodedImage> {
  if (typeof createImageBitmap !== "function") {
    throw new Error("El navegador no admite createImageBitmap");
  }

  const bitmap = await createImageBitmap(file);
  try {
    const target = getAnalysisSize(bitmap.width, bitmap.height, maxSide);
    const canvas = document.createElement("canvas");
    canvas.width = target.width;
    canvas.height = target.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("No se pudo crear el contexto 2D");

    context.drawImage(bitmap, 0, 0, target.width, target.height);
    const imageData = context.getImageData(0, 0, target.width, target.height);
    return {
      pixels: {
        data: imageData.data,
        width: imageData.width,
        height: imageData.height,
      },
      originalWidth: bitmap.width,
      originalHeight: bitmap.height,
    };
  } finally {
    bitmap.close();
  }
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException("Analisis cancelado", "AbortError");
}

/**
 * Analiza un archivo sin enviarlo al servidor. Los PDF y los formatos no
 * admitidos devuelven "skipped". Los errores se propagan al llamador.
 */
export async function analyzeImageFile(
  file: File,
  options: { config?: ImageQualityConfig; signal?: AbortSignal } = {},
): Promise<ImageQualityResult> {
  const config = options.config ?? IMAGE_QUALITY_CONFIG;
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return SKIPPED_RESULT;

  const decoded = await decodeImageFile(file, config.analysisMaxSide);
  throwIfAborted(options.signal);

  // Cede el control para que la vista previa se pinte antes del calculo.
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  throwIfAborted(options.signal);

  const metrics = computeImageQualityMetrics(
    decoded.pixels,
    decoded.originalWidth,
    decoded.originalHeight,
    config,
  );
  return {
    status: "done",
    warnings: evaluateImageQuality(metrics, config),
    metrics,
  };
}