#!/usr/bin/env node
/**
 * Generate a realistic mock corpus of academic papers for development/testing.
 * Produces JSONL output mimicking Q1 journal paper writing patterns.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const DOMAINS = [
  'Computer Science', 'Medicine', 'Physics', 'Engineering',
  'Biology', 'Chemistry', 'Psychology', 'Economics',
  'Mathematics', 'Environmental Science', 'Materials Science', 'Neuroscience',
];

const JOURNALS = {
  'Computer Science': ['Nature Machine Intelligence', 'IEEE TPAMI', 'JMLR', 'ACM Computing Surveys'],
  'Medicine': ['The Lancet', 'NEJM', 'BMJ', 'JAMA'],
  'Physics': ['Physical Review Letters', 'Nature Physics', 'Science', 'PRL'],
  'Engineering': ['IEEE Trans', 'Engineering with Computers', 'Journal of Mechanical Design'],
  'Biology': ['Nature', 'Cell', 'Science', 'PNAS'],
  'Chemistry': ['JACS', 'Angewandte Chemie', 'Nature Chemistry', 'Chemical Reviews'],
  'Psychology': ['Psychological Bulletin', 'JPSP', 'Psychological Review', 'Trends in Cognitive Sciences'],
  'Economics': ['American Economic Review', 'QJE', 'Econometrica', 'Journal of Finance'],
  'Mathematics': ['Annals of Mathematics', 'Inventiones', 'JAMS', 'Advances in Mathematics'],
  'Environmental Science': ['Nature Climate Change', 'Environmental Science & Technology', 'Global Change Biology'],
  'Materials Science': ['Nature Materials', 'Advanced Materials', 'Acta Materialia', 'Nano Letters'],
  'Neuroscience': ['Nature Neuroscience', 'Neuron', 'Journal of Neuroscience', 'Brain'],
};

const DOMAIN_VOCAB = {
  'Computer Science': ['algorithm', 'neural network', 'deep learning', 'computational', 'optimization', 'architecture', 'benchmark', 'dataset', 'model', 'classification', 'regression', 'embedding', 'transformer', 'attention mechanism', 'training', 'inference', 'gradient', 'parameter', 'overfitting', 'generalization'],
  'Medicine': ['patients', 'clinical', 'treatment', 'diagnosis', 'therapy', 'randomized', 'cohort', 'outcome', 'mortality', 'intervention', 'placebo', 'efficacy', 'adverse', 'symptoms', 'prognosis', 'biomarker', 'pharmacological', 'comorbidity', 'remission', 'trial'],
  'Physics': ['particle', 'quantum', 'energy', 'field', 'interaction', 'measurement', 'symmetry', 'equation', 'observable', 'state', 'Hamiltonian', 'momentum', 'spectrum', 'coupling', 'perturbation', 'scattering', 'condensed matter', 'topological', 'phase transition', 'lattice'],
  'Engineering': ['system', 'design', 'performance', 'efficiency', 'simulation', 'fabrication', 'structural', 'material', 'thermal', 'mechanical', 'analysis', 'optimization', 'prototype', 'manufacturing', 'reliability', 'load', 'stress', 'deformation', 'interface', 'integration'],
  'Biology': ['gene', 'protein', 'cell', 'organism', 'species', 'evolution', 'mutation', 'expression', 'regulation', 'pathway', 'signaling', 'metabolism', 'genome', 'phenotype', 'ecosystem', 'biodiversity', 'adaptation', 'transcription', 'membrane', 'receptor'],
  'Chemistry': ['reaction', 'molecule', 'synthesis', 'compound', 'catalyst', 'binding', 'solvent', 'yield', 'structure', 'spectroscopy', 'polymer', 'nanoparticle', 'oxidation', 'reduction', 'crystal', 'kinetics', 'mechanism', 'ligand', 'substrate', 'configuration'],
  'Psychology': ['cognitive', 'behavior', 'perception', 'memory', 'attention', 'emotion', 'social', 'development', 'processing', 'individual', 'group', 'experiment', 'participants', 'measure', 'effect', 'variable', 'correlation', 'significance', 'theory', 'paradigm'],
  'Economics': ['market', 'firm', 'investment', 'growth', 'policy', 'trade', 'price', 'demand', 'supply', 'equilibrium', 'welfare', 'productivity', 'capital', 'labor', 'regulation', 'incentive', 'efficiency', 'consumption', 'revenue', 'institution'],
  'Mathematics': ['theorem', 'proof', 'convergence', 'bound', 'inequality', 'function', 'operator', 'space', 'dimension', 'topology', 'metric', 'continuous', 'discrete', 'algebraic', 'geometric', 'polynomial', 'integral', 'series', 'vector', 'matrix'],
  'Environmental Science': ['climate', 'carbon', 'emission', 'temperature', 'biodiversity', 'ecosystem', 'pollution', 'sustainability', 'forest', 'ocean', 'atmosphere', 'precipitation', 'drought', 'habitat', 'conservation', 'renewable', 'resilience', 'adaptation', 'mitigation', 'warming'],
  'Materials Science': ['property', 'strength', 'conductivity', 'elasticity', 'composite', 'ceramic', 'alloy', 'polymer', 'thin film', 'nanostructure', 'characterization', 'diffraction', 'microstructure', 'fracture', 'deformation', 'coating', 'substrate', 'thermal', 'optical', 'magnetic'],
  'Neuroscience': ['neuron', 'synapse', 'cortex', 'brain', 'circuit', 'plasticity', 'firing', 'stimulus', 'response', 'dopamine', 'serotonin', 'receptor', 'hippocampus', 'prefrontal', 'motor', 'sensory', 'cognitive', 'neural', 'glial', 'dendrite'],
};

// Sentence templates with variable lengths
const SENTENCE_TEMPLATES = {
  short: [
    'This is not obvious.',
    'The results surprised us.',
    'That makes sense.',
    'But here is the catch.',
    'So what changed?',
    'Nobody expected this.',
    'We checked twice.',
    'It just works.',
    'The gap is real.',
    'Think about it.',
    'Simple enough.',
    'Not quite.',
    'Here is why.',
    'We disagree.',
    'A fair point.',
    'Interesting question.',
    'Let us see.',
    'Wait, actually.',
    'Hold on.',
    'Right.',
  ],
  medium: [
    (d, v) => `When we ran the ${pick(v)} analysis, the ${pick(v)} values were significantly higher than expected.`,
    (d, v) => `Previous work in ${d} has focused mainly on ${pick(v)} without considering ${pick(v)}.`,
    (d, v) => `The relationship between ${pick(v)} and ${pick(v)} turned out to be more complex than we initially thought.`,
    (d, v) => `One thing that stood out was how ${pick(v)} affected the overall ${pick(v)} performance.`,
    (d, v) => `Our approach differs because we treat ${pick(v)} as a dynamic variable rather than a fixed parameter.`,
    (d, v) => `The data from these ${pick(v)} experiments paint a somewhat different picture from earlier studies.`,
    (d, v) => `There is a real tension here between ${pick(v)} accuracy and computational cost.`,
    (d, v) => `In practice, most ${d.toLowerCase()} researchers run into this same ${pick(v)} problem.`,
    (d, v) => `What we found was that ${pick(v)} matters way more than ${pick(v)} in most cases.`,
    (d, v) => `The control group showed baseline ${pick(v)} levels, which is consistent with prior findings.`,
  ],
  long: [
    (d, v) => `Although the initial ${pick(v)} results were promising, we noticed that the ${pick(v)} performance degraded substantially when we introduced ${pick(v)} noise into the system, which suggests that the model is more sensitive to input perturbations than the original paper claimed.`,
    (d, v) => `To address this limitation, we developed a new ${pick(v)} framework that combines ${pick(v)} with ${pick(v)}, and while this increased the computational overhead by roughly thirty percent, the improvement in ${pick(v)} accuracy more than justified the tradeoff in our view.`,
    (d, v) => `The key insight here is that ${pick(v)} and ${pick(v)} are not independent variables as most ${d.toLowerCase()} literature assumes — they interact in ways that create feedback loops, and these loops can either stabilize or destabilize the entire ${pick(v)} system depending on the initial conditions.`,
    (d, v) => `One of the reviewers raised a good point about our ${pick(v)} methodology: we did not control for ${pick(v)} effects, and when we went back and re-ran the analysis with those controls in place, the main effect shrunk but remained statistically significant at the p less than 0.01 level.`,
    (d, v) => `What makes this ${pick(v)} finding particularly interesting is that it runs counter to the prevailing ${d.toLowerCase()} consensus, which holds that ${pick(v)} is primarily determined by ${pick(v)} factors, whereas our data suggests environmental variables play an equally important role.`,
  ],
  veryLong: [
    (d, v) => `Before diving into the results, it is worth setting the stage: the field of ${d} has spent the better part of the last decade arguing about whether ${pick(v)} or ${pick(v)} is the more important driver of ${pick(v)}, and while both sides have produced compelling evidence, nobody has — to our knowledge — actually tested both simultaneously in a single controlled experiment, which is exactly what we set out to do here.`,
  ],
};

// Some AI-sounding templates to mix in
const AI_TEMPLATES = [
  (d, v) => `It is important to note that the ${pick(v)} plays a crucial role in facilitating ${pick(v)} optimization.`,
  (d, v) => `Furthermore, the implementation of ${pick(v)} methodologies has demonstrated unprecedented improvements in the landscape of ${d.toLowerCase()}.`,
  (d, v) => `In today's rapidly evolving world, the synergy between ${pick(v)} and ${pick(v)} represents a transformative paradigm shift.`,
  (d, v) => `The multifaceted nature of ${pick(v)} requires a comprehensive and robust approach to fully leverage its potential.`,
  (d, v) => `To summarize, the groundbreaking results underscore the seamless integration of ${pick(v)} within the contemporary landscape of ${d.toLowerCase()}.`,
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randNormal(mean, std) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return num * std + mean;
}

function generateParagraph(domain, vocab, isAI = false) {
  const sentences = [];
  const targetSentences = Math.floor(randNormal(5, 2)); // 3-7 sentences per paragraph
  let sentenceCount = 0;

  while (sentenceCount < targetSentences) {
    // Natural burstiness: occasional very short or very long sentences
    const r = Math.random();
    let sentence;

    if (isAI && Math.random() < 0.3) {
      // Mix in some AI-sounding text
      sentence = pick(AI_TEMPLATES)(domain, vocab);
    } else if (r < 0.12) {
      // Very short sentence (2-6 words)
      sentence = pick(SENTENCE_TEMPLATES.short);
    } else if (r < 0.5) {
      // Medium sentence (15-25 words)
      sentence = pick(SENTENCE_TEMPLATES.medium)(domain, vocab);
    } else if (r < 0.85) {
      // Long sentence (25-40 words)
      sentence = pick(SENTENCE_TEMPLATES.long)(domain, vocab);
    } else {
      // Very long sentence (40+ words)
      sentence = pick(SENTENCE_TEMPLATES.veryLong)(domain, vocab);
    }

    sentences.push(sentence);
    sentenceCount++;
  }

  return sentences.join(' ');
}

function generatePaper(id) {
  const domain = pick(DOMAINS);
  const vocab = DOMAIN_VOCAB[domain];
  const journals = JOURNALS[domain];
  const year = 2019 + Math.floor(Math.random() * 6);
  const journal = pick(journals);
  const isAIPaper = Math.random() < 0.08; // 8% AI-sounding

  // 3-8 paragraphs
  const numParagraphs = Math.floor(randNormal(5, 1.5));
  const paragraphs = [];

  for (let i = 0; i < Math.max(3, Math.min(8, numParagraphs)); i++) {
    paragraphs.push(generateParagraph(domain, vocab, isAIPaper));
  }

  return {
    id: `mock-${String(id).padStart(4, '0')}`,
    text: paragraphs.join('\n\n'),
    domain,
    year,
    journal,
    source: 'mock',
    wordCount: paragraphs.join(' ').split(/\s+/).length,
  };
}

// ==================== MAIN ====================

const COUNT = parseInt(process.argv[2] || '500', 10);
const OUTPUT = resolve(process.argv[2] && !process.argv[2].match(/^\d+$/)
  ? process.argv[2]
  : 'data/papers/corpus/mock-corpus.jsonl');

mkdirSync(resolve(OUTPUT, '..'), { recursive: true });

console.log(`Generating ${COUNT} mock papers...`);

const lines = [];
for (let i = 1; i <= COUNT; i++) {
  const paper = generatePaper(i);
  lines.push(JSON.stringify(paper));
  if (i % 100 === 0) console.log(`  ${i}/${COUNT}`);
}

writeFileSync(OUTPUT, lines.join('\n') + '\n');
console.log(`\nDone! Wrote ${COUNT} papers to ${OUTPUT}`);
