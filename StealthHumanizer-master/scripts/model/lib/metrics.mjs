function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function safeDivide(numerator, denominator) {
  return denominator > 0 ? numerator / denominator : 0;
}

function aucRoc(rows) {
  const sorted = [...rows].sort((a, b) => b.probability - a.probability);
  let tp = 0;
  let fp = 0;
  const positives = rows.filter((r) => r.label === 1).length;
  const negatives = rows.filter((r) => r.label === 0).length;
  if (positives === 0 || negatives === 0) return 0.5;

  let prevTpr = 0;
  let prevFpr = 0;
  let auc = 0;

  for (const row of sorted) {
    if (row.label === 1) tp += 1;
    else fp += 1;
    const tpr = safeDivide(tp, positives);
    const fpr = safeDivide(fp, negatives);
    auc += (fpr - prevFpr) * (tpr + prevTpr) * 0.5;
    prevTpr = tpr;
    prevFpr = fpr;
  }
  return clamp(auc, 0, 1);
}

function expectedCalibrationError(rows, bins = 10) {
  if (!rows.length) return 0;
  let ece = 0;
  for (let i = 0; i < bins; i++) {
    const lower = i / bins;
    const upper = (i + 1) / bins;
    const binRows = rows.filter((row) => row.probability >= lower && row.probability < upper);
    if (!binRows.length) continue;
    const confidence = binRows.reduce((sum, row) => sum + row.probability, 0) / binRows.length;
    const accuracy = binRows.reduce((sum, row) => sum + (row.prediction === row.label ? 1 : 0), 0) / binRows.length;
    ece += (binRows.length / rows.length) * Math.abs(confidence - accuracy);
  }
  return ece;
}

function brierScore(rows) {
  if (!rows.length) return 0;
  return rows.reduce((sum, row) => sum + (row.probability - row.label) ** 2, 0) / rows.length;
}

function domainBreakdown(rows) {
  const byDomain = new Map();
  for (const row of rows) {
    const domain = row.domain || "unknown";
    if (!byDomain.has(domain)) byDomain.set(domain, []);
    byDomain.get(domain).push(row);
  }
  return [...byDomain.entries()]
    .map(([domain, bucket]) => {
      const accuracy = safeDivide(
        bucket.reduce((sum, row) => sum + (row.prediction === row.label ? 1 : 0), 0),
        bucket.length
      );
      return {
        domain,
        count: bucket.length,
        accuracy,
      };
    })
    .sort((a, b) => b.count - a.count || a.domain.localeCompare(b.domain));
}

export function computeClassificationMetrics(rows) {
  const tp = rows.filter((row) => row.prediction === 1 && row.label === 1).length;
  const tn = rows.filter((row) => row.prediction === 0 && row.label === 0).length;
  const fp = rows.filter((row) => row.prediction === 1 && row.label === 0).length;
  const fn = rows.filter((row) => row.prediction === 0 && row.label === 1).length;

  const accuracy = safeDivide(tp + tn, rows.length);
  const precision = safeDivide(tp, tp + fp);
  const recall = safeDivide(tp, tp + fn);
  const f1 = safeDivide(2 * precision * recall, precision + recall);

  return {
    count: rows.length,
    confusion: { tp, tn, fp, fn },
    accuracy,
    precision,
    recall,
    f1,
    auroc: aucRoc(rows),
    calibrationError: expectedCalibrationError(rows, 10),
    brier: brierScore(rows),
    domainRobustness: domainBreakdown(rows),
  };
}
