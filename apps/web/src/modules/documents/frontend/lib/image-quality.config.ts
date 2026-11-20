import type { ImageQualityConfig } from "./image-quality.types";

export const IMAGE_QUALITY_CONFIG: ImageQualityConfig = {
  analysisMaxSide: 1024,
  analysisTimeoutMs: 5000,
  minPixels: 800000,
  minShortSide: 600,
  minLongSide: 800,
  sharpnessTileSize: 32,
  sharpnessTopFraction: 0.25,
  blurThreshold: 380,
  sharpnessActiveTileMin: 20,
  minActiveTiles: 10,
  blurMedianThreshold: 300,
  lumaMarginFraction: 0.1,
  darkMeanThreshold: 85,
  brightMeanThreshold: 215,
  lowContrastThreshold: 35,
  glareLumaThreshold: 248,
  glareMinRatio: 0.005,
  glareMaxRatio: 0.6,
};