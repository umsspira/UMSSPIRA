export type ImageQualityWarningCode =
  | "LOW_RESOLUTION"
  | "BLURRY"
  | "TOO_DARK"
  | "OVEREXPOSED";
export interface ImageQualityWarning {
  code: ImageQualityWarningCode;
  /** Texto corto que se muestra al Titulado. */
  message: string;
  /** Indicacion concreta para mejorar la imagen. */
  recommendation: string;
}
/** Medidas calculadas sobre la imagen. Sirven para calibrar los umbrales. */
export interface ImageQualityMetrics {
  /** Dimensiones de la imagen original, antes de reducirla. */
  originalWidth: number;
  originalHeight: number;
  /** Luminosidad media de la zona central, de 0 (negro) a 255 (blanco). */
  meanLuma: number;
  /** Desviacion estandar de la luminosidad: mide el contraste. */
  contrast: number;
  /** Fraccion de pixeles centrales casi blancos (destellos o luz excesiva). */
  glareRatio: number;
  /** Nitidez: varianza del laplaciano en los bloques con mas detalle. */
  sharpness: number;
}
export type ImageQualityStatus =
  | "idle"
  | "analyzing"
  | "done"
  | "skipped"
  | "failed";
export interface ImageQualityResult {
  status: ImageQualityStatus;
  warnings: ImageQualityWarning[];
  metrics: ImageQualityMetrics | null;
}
/** Pixeles RGBA, el mismo formato que devuelve ImageData. */
export interface PixelBuffer {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}
export interface ImageQualityConfig {
  /** Lado maximo de la imagen reducida que se analiza. */
  analysisMaxSide: number;
  /** Tiempo maximo del analisis antes de declararlo fallido. */
  analysisTimeoutMs: number;
  /** Resolucion minima de la imagen original, en pixeles. */
  minShortSide: number;
  minLongSide: number;
  /** Lado de cada bloque con el que se mide la nitidez. */
  sharpnessTileSize: number;
  /** Fraccion de bloques con mas detalle que se promedia. */
  sharpnessTopFraction: number;
  /** Por debajo de este valor la imagen se considera borrosa. */
  blurThreshold: number;
  /** Margen que se ignora al medir la luz (fraccion por lado). */
  lumaMarginFraction: number;
  /** Por debajo de esta luminosidad media la imagen esta oscura. */
  darkMeanThreshold: number;
  /** Por encima de esta luminosidad media y con poco contraste esta sobreexpuesta. */
  brightMeanThreshold: number;
  /** Contraste maximo para considerar la imagen lavada por exceso de luz. */
  lowContrastThreshold: number;
  /** Luminosidad desde la cual un pixel se cuenta como destello. */
  glareLumaThreshold: number;
  /** Fraccion minima de pixeles con destello para avisar. */
  glareMinRatio: number;
  /** Por encima de esta fraccion se asume papel blanco, no un destello. */
  glareMaxRatio: number;
}