import { IMAGE_QUALITY_CONFIG } from "./image-quality.config";
import {
  computeImageQualityMetrics,
  evaluateImageQuality,
  getAnalysisSize,
} from "./image-quality";
import type { PixelBuffer } from "./image-quality.types";

// Genera una imagen RGBA en escala de grises a partir de una funcion de luz.
function buildImage(
  width: number,
  height: number,
  lumaAt: (x: number, y: number) => number,
): PixelBuffer {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const value = lumaAt(x, y);
      const index = (y * width + x) * 4;
      data[index] = value;
      data[index + 1] = value;
      data[index + 2] = value;
      data[index + 3] = 255;
    }
  }
  return { data, width, height };
}

// Imitacion de texto: franjas finas de alto contraste sobre fondo claro.
function buildTextLikeImage(width: number, height: number): PixelBuffer {
  return buildImage(width, height, (x, y) =>
    (x % 6 < 2 && y % 12 < 8) ? 30 : 235,
  );
}

// Desenfoque simple por promedio de vecinos, repetido varias veces.
function blur(image: PixelBuffer, passes: number): PixelBuffer {
  let current = image;
  for (let pass = 0; pass < passes; pass += 1) {
    const { width, height, data } = current;
    const next = new Uint8ClampedArray(data.length);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        let sum = 0;
        let count = 0;
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            sum += data[(ny * width + nx) * 4];
            count += 1;
          }
        }
        const value = sum / count;
        const index = (y * width + x) * 4;
        next[index] = value;
        next[index + 1] = value;
        next[index + 2] = value;
        next[index + 3] = 255;
      }
    }
    current = { data: next, width, height };
  }
  return current;
}

const ORIGINAL_WIDTH = 3000;
const ORIGINAL_HEIGHT = 2000;

describe("computeImageQualityMetrics", () => {
  it("mide mas nitidez en una imagen enfocada que en una desenfocada", () => {
    const sharp = buildTextLikeImage(400, 300);
    const blurred = blur(sharp, 4);

    const sharpMetrics = computeImageQualityMetrics(sharp, ORIGINAL_WIDTH, ORIGINAL_HEIGHT);
    const blurredMetrics = computeImageQualityMetrics(blurred, ORIGINAL_WIDTH, ORIGINAL_HEIGHT);

    expect(sharpMetrics.sharpness).toBeGreaterThan(blurredMetrics.sharpness * 5);
  });

  it("no considera borrosa una foto nitida con mucho margen blanco", () => {
    const page = buildImage(400, 300, (x, y) => {
      const insideText = x > 140 && x < 260 && y > 100 && y < 200;
      return insideText && x % 6 < 2 && y % 12 < 8 ? 30 : 240;
    });

    const metrics = computeImageQualityMetrics(page, ORIGINAL_WIDTH, ORIGINAL_HEIGHT);

    expect(metrics.sharpness).toBeGreaterThan(IMAGE_QUALITY_CONFIG.blurThreshold);
  });

  it("mide luminosidad media y contraste de la zona central", () => {
    const dark = buildImage(200, 200, () => 20);

    const metrics = computeImageQualityMetrics(dark, ORIGINAL_WIDTH, ORIGINAL_HEIGHT);

    expect(metrics.meanLuma).toBeCloseTo(20, 0);
    expect(metrics.contrast).toBeCloseTo(0, 0);
  });

  it("devuelve nitidez cero si la imagen es demasiado pequena para el laplaciano", () => {
    const tiny = buildImage(2, 2, () => 100);

    const metrics = computeImageQualityMetrics(tiny, 2, 2);

    expect(metrics.sharpness).toBe(0);
  });
});

describe("evaluateImageQuality", () => {
  it("no genera avisos para una imagen clara y grande", () => {
    const clear = buildTextLikeImage(400, 300);
    const metrics = computeImageQualityMetrics(clear, ORIGINAL_WIDTH, ORIGINAL_HEIGHT);

    expect(evaluateImageQuality(metrics)).toEqual([]);
  });

  it("avisa de baja resolucion segun el tamano original", () => {
    const clear = buildTextLikeImage(400, 300);
    const metrics = computeImageQualityMetrics(clear, 640, 480);

    const codes = evaluateImageQuality(metrics).map((warning) => warning.code);

    expect(codes).toContain("LOW_RESOLUTION");
  });

  it("avisa de imagen borrosa", () => {
    const blurred = blur(buildTextLikeImage(400, 300), 8);
    const metrics = computeImageQualityMetrics(blurred, ORIGINAL_WIDTH, ORIGINAL_HEIGHT);

    const codes = evaluateImageQuality(metrics).map((warning) => warning.code);

    expect(codes).toContain("BLURRY");
  });

  it("avisa de imagen oscura", () => {
    const dark = buildImage(400, 300, (x, y) => ((x % 6 < 2 && y % 12 < 8) ? 5 : 45));
    const metrics = computeImageQualityMetrics(dark, ORIGINAL_WIDTH, ORIGINAL_HEIGHT);

    const codes = evaluateImageQuality(metrics).map((warning) => warning.code);

    expect(codes).toContain("TOO_DARK");
  });

  it("avisa de sobreexposicion cuando hay mucha luz y poco contraste", () => {
    const washedOut = buildImage(400, 300, (x, y) => ((x % 6 < 2 && y % 12 < 8) ? 225 : 250));
    const metrics = computeImageQualityMetrics(washedOut, ORIGINAL_WIDTH, ORIGINAL_HEIGHT);

    const codes = evaluateImageQuality(metrics).map((warning) => warning.code);

    expect(codes).toContain("OVEREXPOSED");
  });

  it("avisa de un destello localizado aunque la luz media sea normal", () => {
    const withGlare = buildImage(400, 300, (x, y) => {
      const insideGlare = x > 150 && x < 250 && y > 100 && y < 200;
      if (insideGlare) return 255;
      return (x % 6 < 2 && y % 12 < 8) ? 40 : 150;
    });
    const metrics = computeImageQualityMetrics(withGlare, ORIGINAL_WIDTH, ORIGINAL_HEIGHT);

    const codes = evaluateImageQuality(metrics).map((warning) => warning.code);

    expect(metrics.meanLuma).toBeLessThan(IMAGE_QUALITY_CONFIG.brightMeanThreshold);
    expect(codes).toContain("OVEREXPOSED");
  });

  it("no confunde un fondo blanco limpio con un destello", () => {
    const cleanScan = buildImage(400, 300, (x, y) => ((x % 6 < 2 && y % 12 < 8) ? 30 : 255));
    const metrics = computeImageQualityMetrics(cleanScan, ORIGINAL_WIDTH, ORIGINAL_HEIGHT);

    const codes = evaluateImageQuality(metrics).map((warning) => warning.code);

    expect(codes).not.toContain("OVEREXPOSED");
  });

  it("incluye una recomendacion en cada aviso", () => {
    const dark = buildImage(400, 300, () => 10);
    const metrics = computeImageQualityMetrics(dark, 500, 400);

    const warnings = evaluateImageQuality(metrics);

    expect(warnings.length).toBeGreaterThan(0);
    warnings.forEach((warning) => {
      expect(warning.message).not.toBe("");
      expect(warning.recommendation).not.toBe("");
    });
  });
});

describe("getAnalysisSize", () => {
  it("reduce el lado mayor al maximo conservando la proporcion", () => {
    expect(getAnalysisSize(4000, 3000, 1000)).toEqual({ width: 1000, height: 750 });
  });

  it("no agranda imagenes que ya son pequenas", () => {
    expect(getAnalysisSize(800, 600, 1024)).toEqual({ width: 800, height: 600 });
  });
});