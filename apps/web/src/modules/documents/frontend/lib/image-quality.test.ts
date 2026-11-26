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

  describe("evaluacion de resolucion y formato", () => {
    it("no avisa de baja resolucion para un documento horizontal claro de 1408x768", () => {
      const clear = buildTextLikeImage(400, 300);
      const metrics = computeImageQualityMetrics(clear, 1408, 768);
      const codes = evaluateImageQuality(metrics).map((w) => w.code);
      expect(codes).not.toContain("LOW_RESOLUTION");
    });

    it("no avisa de baja resolucion para un documento vertical A4 de 1000x1400", () => {
      const clear = buildTextLikeImage(400, 300);
      const metrics = computeImageQualityMetrics(clear, 1000, 1400);
      const codes = evaluateImageQuality(metrics).map((w) => w.code);
      expect(codes).not.toContain("LOW_RESOLUTION");
    });

    it("avisa de baja resolucion para una imagen horizontal con lado corto de 550 px", () => {
      const clear = buildTextLikeImage(400, 300);
      const metrics = computeImageQualityMetrics(clear, 1500, 550);
      const codes = evaluateImageQuality(metrics).map((w) => w.code);
      expect(codes).toContain("LOW_RESOLUTION");
    });

    it("evalua correctamente las fronteras de minPixels", () => {
      const clear = buildTextLikeImage(400, 300);
      // 1000 x 800 = 800,000 px exactos (igual a minPixels, short=800>=600, long=1000>=800)
      const exactBoundary = computeImageQualityMetrics(clear, 1000, 800);
      expect(evaluateImageQuality(exactBoundary).map((w) => w.code)).not.toContain("LOW_RESOLUTION");

      // 1000 x 799 = 799,000 px (estrictamente por debajo de minPixels)
      const belowBoundary = computeImageQualityMetrics(clear, 1000, 799);
      expect(evaluateImageQuality(belowBoundary).map((w) => w.code)).toContain("LOW_RESOLUTION");
    });
  });

  it("avisa de imagen borrosa", () => {
    const blurred = blur(buildTextLikeImage(400, 300), 8);
    const metrics = computeImageQualityMetrics(blurred, ORIGINAL_WIDTH, ORIGINAL_HEIGHT);

    const codes = evaluateImageQuality(metrics).map((warning) => warning.code);

    expect(codes).toContain("BLURRY");
  });

  describe("evaluacion de borrosidad y mediana de bloques con contenido", () => {
    it("marca BLURRY un buffer con titulo nitido pero cuerpo de texto desenfocado", () => {
      // Titulo superior nitido (y < 60) y cuerpo de texto suave/desenfocado (y >= 80)
      const mixedDoc = buildImage(400, 300, (x, y) => {
        if (y >= 20 && y < 60) {
          return x % 6 < 2 && y % 12 < 8 ? 30 : 235;
        }
        if (y >= 80 && y < 280) {
          if (Math.floor(y / 16) % 2 === 0) {
            return 235 - 35 * (0.5 + 0.5 * Math.sin(x * 0.4) * Math.sin(y * 0.4));
          }
        }
        return 235;
      });

      const metrics = computeImageQualityMetrics(mixedDoc, ORIGINAL_WIDTH, ORIGINAL_HEIGHT);
      // El promedio del 25% superior es alto por el titulo nitido
      expect(metrics.sharpness).toBeGreaterThan(IMAGE_QUALITY_CONFIG.blurThreshold);
      // Pero la mediana de bloques activos es baja por el cuerpo desenfocado
      expect(metrics.activeTileCount).toBeGreaterThanOrEqual(IMAGE_QUALITY_CONFIG.minActiveTiles);
      expect(metrics.sharpnessMedian).toBeLessThan(IMAGE_QUALITY_CONFIG.blurMedianThreshold);

      const codes = evaluateImageQuality(metrics).map((w) => w.code);
      expect(codes).toContain("BLURRY");
    });

    it("no marca BLURRY un documento nitido con amplios margenes blancos", () => {
      const pageWithMargins = buildImage(400, 300, (x, y) => {
        const insideText = x > 140 && x < 260 && y > 100 && y < 200;
        return insideText && x % 6 < 2 && y % 12 < 8 ? 30 : 240;
      });

      const metrics = computeImageQualityMetrics(pageWithMargins, ORIGINAL_WIDTH, ORIGINAL_HEIGHT);
      expect(metrics.sharpness).toBeGreaterThan(IMAGE_QUALITY_CONFIG.blurThreshold);
      expect(metrics.sharpnessMedian).toBeGreaterThan(IMAGE_QUALITY_CONFIG.blurMedianThreshold);

      const codes = evaluateImageQuality(metrics).map((w) => w.code);
      expect(codes).not.toContain("BLURRY");
    });

    it("no activa la regla de mediana en una pagina casi vacia con pocos bloques activos", () => {
      // Solo 2 bloques con leve trazo (activeTileCount < minActiveTiles) y un sello nitido que supera blurThreshold
      const sparsePage = buildImage(400, 300, (x, y) => {
        // Sello muy nitido en un solo bloque pequeno
        if (x >= 40 && x < 65 && y >= 40 && y < 65) {
          return x % 4 < 2 ? 20 : 240;
        }
        return 245;
      });

      const metrics = computeImageQualityMetrics(sparsePage, ORIGINAL_WIDTH, ORIGINAL_HEIGHT);
      expect(metrics.activeTileCount).toBeLessThan(IMAGE_QUALITY_CONFIG.minActiveTiles);

      const codes = evaluateImageQuality(metrics).map((w) => w.code);
      expect(codes).not.toContain("BLURRY");
    });

    it("evalua con precision las fronteras de blurMedianThreshold y minActiveTiles", () => {
      const baseMetrics = computeImageQualityMetrics(
        buildTextLikeImage(400, 300),
        ORIGINAL_WIDTH,
        ORIGINAL_HEIGHT,
      );

      // En el umbral exacto: sharpnessMedian === 300 (no estrictamente menor) -> no avisa
      const atBoundary = {
        ...baseMetrics,
        sharpness: 1000,
        activeTileCount: 15,
        sharpnessMedian: IMAGE_QUALITY_CONFIG.blurMedianThreshold,
      };
      expect(evaluateImageQuality(atBoundary).map((w) => w.code)).not.toContain("BLURRY");

      // Justo por debajo: sharpnessMedian === 299 -> avisa BLURRY
      const belowBoundary = {
        ...baseMetrics,
        sharpness: 1000,
        activeTileCount: 15,
        sharpnessMedian: IMAGE_QUALITY_CONFIG.blurMedianThreshold - 1,
      };
      expect(evaluateImageQuality(belowBoundary).map((w) => w.code)).toContain("BLURRY");

      // Con mediana baja pero menos bloques activos que el minimo (9 < 10) -> no avisa por regla de mediana
      const fewTiles = {
        ...baseMetrics,
        sharpness: 1000,
        activeTileCount: IMAGE_QUALITY_CONFIG.minActiveTiles - 1,
        sharpnessMedian: 150,
      };
      expect(evaluateImageQuality(fewTiles).map((w) => w.code)).not.toContain("BLURRY");
    });
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

  describe("calibracion con casos de frontera", () => {
    it("no avisa en una imagen con luminosidad media en el borde superior de oscuridad", () => {
      const nearDarkBorder = buildImage(400, 300, () => IMAGE_QUALITY_CONFIG.darkMeanThreshold + 5);
      const metrics = computeImageQualityMetrics(nearDarkBorder, ORIGINAL_WIDTH, ORIGINAL_HEIGHT);
      const codes = evaluateImageQuality(metrics).map((w) => w.code);
      expect(codes).not.toContain("TOO_DARK");
    });

    it("avisa si la luminosidad cae estrictamente por debajo del umbral de oscuridad calibrado", () => {
      const darkBorder = buildImage(400, 300, () => IMAGE_QUALITY_CONFIG.darkMeanThreshold - 2);
      const metrics = computeImageQualityMetrics(darkBorder, ORIGINAL_WIDTH, ORIGINAL_HEIGHT);
      const codes = evaluateImageQuality(metrics).map((w) => w.code);
      expect(codes).toContain("TOO_DARK");
    });

    it("avisa de destello cuando el ratio supera el umbral minimo calibrado", () => {
      // 1.5% de pixeles quemados (255) en zona central, que supera glareMinRatio (0.005 = 0.5%)
      const withSubtleFlash = buildImage(400, 300, (x, y) => {
        const isCenter = x >= 40 && x < 360 && y >= 30 && y < 270;
        return isCenter && x % 20 === 0 && y % 3 === 0 ? 255 : 160;
      });
      const metrics = computeImageQualityMetrics(withSubtleFlash, ORIGINAL_WIDTH, ORIGINAL_HEIGHT);
      expect(metrics.glareRatio).toBeGreaterThanOrEqual(IMAGE_QUALITY_CONFIG.glareMinRatio);
      expect(metrics.glareRatio).toBeLessThanOrEqual(IMAGE_QUALITY_CONFIG.glareMaxRatio);
      const codes = evaluateImageQuality(metrics).map((w) => w.code);
      expect(codes).toContain("OVEREXPOSED");
    });
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