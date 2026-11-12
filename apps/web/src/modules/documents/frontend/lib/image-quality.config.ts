import type { ImageQualityConfig } from "./image-quality.types";

export const IMAGE_QUALITY_CONFIG: ImageQualityConfig = {
  analysisMaxSide: 1024,
  analysisTimeoutMs: 5000,
  minShortSide: 800,
  minLongSide: 1000,
  sharpnessTileSize: 32,
  sharpnessTopFraction: 0.25,
  blurThreshold: 350,
  lumaMarginFraction: 0.1,
  darkMeanThreshold: 85,
  brightMeanThreshold: 200,
  lowContrastThreshold: 40,
};