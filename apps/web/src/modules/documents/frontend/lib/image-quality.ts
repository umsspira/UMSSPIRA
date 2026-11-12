import { IMAGE_QUALITY_CONFIG } from "./image-quality.config";
import type {
  ImageQualityConfig,
  ImageQualityMetrics,
  PixelBuffer,
} from "./image-quality.types";

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