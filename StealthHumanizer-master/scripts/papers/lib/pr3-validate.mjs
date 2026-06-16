function ratio(part, total) {
  return total > 0 ? part / total : 0;
}

function pushCheck(checks, name, passed, details) {
  checks.push({
    name,
    passed,
    details,
  });
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function collectClassCounts(rows) {
  const counts = new Map();
  for (const row of rows) {
    counts.set(row.label, (counts.get(row.label) || 0) + 1);
  }
  return counts;
}

export function validateBenchmarkRows(rows, config = {}) {
  const checks = [];
  const allowedLabels = Array.isArray(config.allowedLabels) && config.allowedLabels.length
    ? config.allowedLabels
    : ["human_academic", "ai_transformed"];
  const allowedSet = new Set(allowedLabels);
  const maxClassImbalance = typeof config.maxClassImbalance === "number" ? config.maxClassImbalance : 0.1;

  const invalidLabels = rows.filter((row) => !allowedSet.has(row.label));
  pushCheck(checks, "label_allowlist", invalidLabels.length === 0, {
    invalidCount: invalidLabels.length,
    allowedLabels,
  });

  const pairMap = new Map();
  for (const row of rows) {
    if (!pairMap.has(row.pairId)) pairMap.set(row.pairId, []);
    pairMap.get(row.pairId).push(row.label);
  }

  let incompletePairs = 0;
  let duplicateLabelPairs = 0;
  for (const labels of pairMap.values()) {
    const unique = new Set(labels);
    if (unique.size !== allowedSet.size) incompletePairs += 1;
    if (labels.length !== unique.size) duplicateLabelPairs += 1;
  }
  pushCheck(checks, "pair_completeness", incompletePairs === 0 && duplicateLabelPairs === 0, {
    pairCount: pairMap.size,
    incompletePairs,
    duplicateLabelPairs,
  });

  const textHashOwners = new Map();
  let leakedHashes = 0;
  for (const row of rows) {
    const owner = textHashOwners.get(row.textHash);
    if (!owner) {
      textHashOwners.set(row.textHash, row.pairId);
    } else if (owner !== row.pairId) {
      leakedHashes += 1;
    }
  }
  pushCheck(checks, "cross_pair_text_leakage", leakedHashes === 0, {
    leakedHashes,
  });

  const numericViolations = [];
  for (const row of rows) {
    const signals = row.features?.humanizationSignals || {};
    const antiPatterns = row.features?.antiPatterns || {};
    for (const [name, value] of Object.entries({ ...signals, ...antiPatterns })) {
      if (!isFiniteNumber(value)) {
        numericViolations.push({ sampleId: row.sampleId, name, value });
      }
    }
  }
  pushCheck(checks, "feature_integrity", numericViolations.length === 0, {
    invalidFeatureCount: numericViolations.length,
  });

  const classCounts = collectClassCounts(rows);
  const sortedCounts = [...classCounts.values()].sort((a, b) => a - b);
  const minCount = sortedCounts[0] || 0;
  const maxCount = sortedCounts[sortedCounts.length - 1] || 0;
  const imbalance = maxCount > 0 ? 1 - ratio(minCount, maxCount) : 1;
  pushCheck(checks, "class_balance", classCounts.size === allowedSet.size && imbalance <= maxClassImbalance, {
    classCounts: Object.fromEntries(classCounts.entries()),
    maxClassImbalance,
    observedImbalance: imbalance,
  });

  const passed = checks.every((check) => check.passed);
  return {
    passed,
    generatedAt: new Date().toISOString(),
    thresholds: {
      allowedLabels,
      maxClassImbalance,
    },
    stats: {
      rowCount: rows.length,
      pairCount: pairMap.size,
      classCounts: Object.fromEntries(classCounts.entries()),
    },
    checks,
  };
}
