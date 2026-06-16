// 🕵️ NOOB EXPLAINER: What is a "Detector Ensemble"?
// An "ensemble" is just a group of things working together.
// Instead of relying on ONE detection method, we run MULTIPLE methods
// and combine their results. It's like getting second and third
// opinions from different doctors — more reliable than just one.
//
// Each detector looks for different "tells":
// - Slop detector: Checks for AI-typical vocabulary ("delve", "tapestry")
// - Readability detector: Checks if readability is suspiciously consistent
// - Model attributor: Tries to guess WHICH AI wrote the text
// - The existing 12-metric detector already does most of the work

export type DetectorId = 'built-in' | 'slop' | 'readability-consistency' | 'model-attribution';

export interface EnsembleResult {
  overallScore: number;
  overallVerdict: 'human' | 'ai' | 'mixed';
  detectors: DetectorResult[];
  radarData: RadarDataPoint[];
  modelAttribution?: ModelAttributionResult;
  remediation: RemediationItem[];
}

export interface DetectorResult {
  id: DetectorId;
  name: string;
  score: number;          // 0-100
  weight: number;         // How much this detector counts
  findings: string[];     // What it found
}

export interface RadarDataPoint {
  metric: string;
  value: number;          // 0-100
  ideal: number;          // Target value for human-like text
}

export interface ModelAttributionResult {
  models: Array<{
    name: string;
    confidence: number;   // 0-1
    fingerprint: string;  // What pattern matched
  }>;
  topModel: string;
  topConfidence: number;
}

export interface RemediationItem {
  issue: string;
  severity: 'low' | 'medium' | 'high';
  fix: string;
  affectedPhrases?: string[];
}
