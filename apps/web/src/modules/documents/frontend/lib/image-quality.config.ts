import type { ImageQualityConfig } from "./image-quality.types";

export const IMAGE_QUALITY_CONFIG: ImageQualityConfig = {
  analysisMaxSide: 1024,
  analysisTimeoutMs: 5000,
  minShortSide: 1000,
  minLongSide: 1400,
  sharpnessTileSize: 32,
  sharpnessTopFraction: 0.25,
  blurThreshold: 380,
  lumaMarginFraction: 0.1,
  darkMeanThreshold: 90,
  brightMeanThreshold: 215,
  lowContrastThreshold: 35,
  glareLumaThreshold: 250,
  glareMinRatio: 0.03,
  glareMaxRatio: 0.5,
};