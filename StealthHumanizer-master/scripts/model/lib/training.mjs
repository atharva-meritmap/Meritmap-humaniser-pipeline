import { sha256 } from "../../papers/lib/hash.mjs";

const FEATURE_NAMES = [
  "humanizationSignals.lexicalDensity",
  "humanizationSignals.typeTokenRatio",
  "humanizationSignals.sentenceBurstiness",
  "humanizationSignals.sentenceLeadDiversity",
  "humanizationSignals.contractionRatio",
  "humanizationSignals.transitionRatio",
  "antiPatterns.templateLeadRatio",
  "antiPatterns.transitionLeadRatio",
  "antiPatterns.trigramRepetitionRatio",
  "antiPatterns.hedgingRatio",
  "antiPatterns.passiveVoiceApproxRatio",
];

function getNested(obj, key) {
  return key.split(".").reduce((acc, part) => (acc && part in acc ? acc[part] : 0), obj);
}

function sigmoid(z) {
  return 1 / (1 + Math.exp(-z));
}

function dot(weights, vector) {
  let sum = weights.bias;
  for (let i = 0; i < FEATURE_NAMES.length; i++) {
    sum += (weights.values[i] || 0) * (vector[i] || 0);
  }
  return sum;
}

export function toLabel(value) {
  return value === "human_academic" ? 1 : 0;
}

export function toVector(row) {
  return FEATURE_NAMES.map((name) => Number(getNested(row.features || {}, name)) || 0);
}

export function prepareExamples(rows) {
  return rows.map((row) => ({
    id: row.sampleId,
    pairId: row.pairId,
    domain: row.domain || "unknown",
    label: toLabel(row.label),
    vector: toVector(row),
  }));
}

export function deterministicSplit(examples, seed = "pr4-seed") {
  const train = [];
  const validation = [];
  const test = [];

  for (const example of examples) {
    const bucket = parseInt(sha256(`${seed}|${example.pairId}`).slice(0, 8), 16) % 100;
    if (bucket < 70) train.push(example);
    else if (bucket < 85) validation.push(example);
    else test.push(example);
  }

  if (!train.length || !validation.length || !test.length) {
    const sorted = [...examples].sort((a, b) => a.id.localeCompare(b.id));
    const total = sorted.length;
    const testStart = Math.max(1, Math.floor(total * 0.85));
    const validationStart = Math.max(1, Math.floor(total * 0.7));
    const fallbackTrain = sorted.slice(0, validationStart);
    const fallbackValidation = sorted.slice(validationStart, testStart);
    const fallbackTest = sorted.slice(testStart);
    if (!fallbackTrain.length && sorted.length) fallbackTrain.push(sorted[0]);
    if (!fallbackValidation.length && sorted.length > 1) fallbackValidation.push(sorted[1]);
    if (!fallbackTest.length && sorted.length > 2) fallbackTest.push(sorted[sorted.length - 1]);
    return {
      train: fallbackTrain,
      validation: fallbackValidation,
      test: fallbackTest,
    };
  }
  return { train, validation, test };
}

export function trainBaseline() {
  return {
    kind: "baseline-linear-v1",
    bias: -0.15,
    values: [0.35, 0.35, 0.18, 0.25, 0.14, -0.33, -0.52, -0.24, -0.58, -0.19, -0.22],
    featureNames: FEATURE_NAMES,
  };
}

export async function trainAdvancedLogistic(trainRows, config = {}, onCheckpoint) {
  const learningRate = Number(config.learningRate ?? 0.05);
  const epochs = Number(config.epochs ?? 60);
  const l2 = Number(config.l2 ?? 0.0005);

  const weights = {
    kind: "advanced-logistic-v1",
    bias: 0,
    values: FEATURE_NAMES.map(() => 0),
    featureNames: FEATURE_NAMES,
  };

  for (let epoch = 1; epoch <= epochs; epoch++) {
    let loss = 0;
    for (const row of trainRows) {
      const z = dot(weights, row.vector);
      const prediction = sigmoid(z);
      const error = prediction - row.label;

      weights.bias -= learningRate * error;
      for (let i = 0; i < weights.values.length; i++) {
        const grad = error * row.vector[i] + l2 * weights.values[i];
        weights.values[i] -= learningRate * grad;
      }

      const eps = 1e-9;
      loss += -(row.label * Math.log(prediction + eps) + (1 - row.label) * Math.log(1 - prediction + eps));
    }

    if (typeof onCheckpoint === "function") {
      await onCheckpoint({
        epoch,
        meanLoss: loss / Math.max(trainRows.length, 1),
        weights: {
          bias: weights.bias,
          values: [...weights.values],
        },
      });
    }
  }

  return weights;
}

export function scoreRows(rows, model, threshold = 0.5) {
  return rows.map((row) => {
    const probability = sigmoid(dot(model, row.vector));
    return {
      ...row,
      probability,
      prediction: probability >= threshold ? 1 : 0,
    };
  });
}
