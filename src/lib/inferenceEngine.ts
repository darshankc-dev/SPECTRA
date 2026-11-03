import { CLASSIFIER_WEIGHTS, DECISION_THRESHOLD, MODEL_VERSION } from './modelData';
import { PredictedClass, PredictionResult } from '../types';

function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

export function extractFeaturesFromImageData(img: HTMLImageElement): number[] {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not create canvas 2d context');

  ctx.drawImage(img, 0, 0, 128, 128);
  const imgData = ctx.getImageData(16, 16, 96, 96);
  const data = imgData.data;

  const a: number[][] = [];
  const flatA: number[] = [];

  for (let r = 0; r < 96; r++) {
    const row: number[] = [];
    for (let c = 0; c < 96; c++) {
      const idx = (r * 96 + c) * 4;
      // Pillow L conversion formula: L = 0.299 R + 0.587 G + 0.114 B
      const luma = (0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]) / 255.0;
      row.push(luma);
      flatA.push(luma);
    }
    a.push(row);
  }

  // 1. Mean
  const mean = flatA.reduce((sum, v) => sum + v, 0) / flatA.length;

  // 2. Std
  const variance = flatA.reduce((sum, v) => sum + (v - mean) ** 2, 0) / flatA.length;
  const std = Math.sqrt(variance);

  // Median
  const sortedA = [...flatA].sort((x, y) => x - y);
  const median = quantile(sortedA, 0.5);

  // Residual
  const residual = flatA.map((v) => v - median);
  const sortedRes = [...residual].sort((x, y) => x - y);

  // 3-10: Quantiles at [.01, .05, .1, .25, .75, .9, .95, .99]
  const qVals = [0.01, 0.05, 0.1, 0.25, 0.75, 0.9, 0.95, 0.99].map((q) => quantile(sortedRes, q));

  // 11-15: Fractions below median by [.03, .06, .1, .15, .2]
  const fracVals = [0.03, 0.06, 0.1, 0.15, 0.2].map((v) => {
    const count = residual.filter((r) => r < -v).length;
    return count / residual.length;
  });

  // 16: Mean absolute adjacent differences along axis 0 (rows)
  let diff0Sum = 0;
  let diff0Count = 0;
  for (let r = 0; r < 95; r++) {
    for (let c = 0; c < 96; c++) {
      diff0Sum += Math.abs(a[r + 1][c] - a[r][c]);
      diff0Count++;
    }
  }
  const diff0Mean = diff0Sum / diff0Count;

  // 17: Mean absolute adjacent differences along axis 1 (cols)
  let diff1Sum = 0;
  let diff1Count = 0;
  for (let r = 0; r < 96; r++) {
    for (let c = 0; c < 95; c++) {
      diff1Sum += Math.abs(a[r][c + 1] - a[r][c]);
      diff1Count++;
    }
  }
  const diff1Mean = diff1Sum / diff1Count;

  return [mean, std, ...qVals, ...fracVals, diff0Mean, diff1Mean];
}

export function predictImage(img: HTMLImageElement): Omit<PredictionResult, 'id' | 'createdAt'> {
  const x = extractFeaturesFromImageData(img);
  const { mean, scale, coef, intercept } = CLASSIFIER_WEIGHTS;

  let z = intercept;
  for (let i = 0; i < 17; i++) {
    const standardized = (x[i] - mean[i]) / scale[i];
    z += standardized * coef[i];
  }

  // Clip between -50 and 50
  const clippedZ = Math.max(-50, Math.min(50, z));
  const probability = 1 / (1 + Math.exp(-clippedZ));
  const isDefective = probability >= DECISION_THRESHOLD;
  const predictedClass: PredictedClass = isDefective ? 'Defective' : 'Normal';
  const confidence = isDefective ? probability : 1 - probability;

  return {
    predictedClass,
    confidence,
    defectProbability: probability,
    modelVersion: MODEL_VERSION,
    decisionThreshold: DECISION_THRESHOLD,
  };
}

export function runInferenceOnImage(img: HTMLImageElement): PredictionResult {
  const pred = predictImage(img);
  return {
    ...pred,
    id: Date.now(),
    createdAt: new Date().toISOString(),
  };
}

export function formatPercent(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

export function formatProbability(v: number): string {
  return v.toFixed(4);
}
