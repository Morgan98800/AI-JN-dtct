// src/aiDetector.js
// Pure frontend heuristic AI-text detector for use in React + Vite.
// Exports a single named function: analyzeText(inputText)

const DISCOURSE_MARKERS = [
  'however',
  'moreover',
  'in conclusion',
  'on the other hand',
  'overall',
  'firstly',
  'secondly',
  'furthermore',
  'consequently',
  'nevertheless'
];

function splitSentences(text) {
  return text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(Boolean);
}

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[\u2018\u2019\u201C\u201D]/g, "'")
    .replace(/[^a-z0-9'\-]+/gi, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stddev(arr) {
  if (!arr.length) return 0;
  const m = mean(arr);
  const v = arr.reduce((s, x) => s + (x - m) ** 2, 0) / arr.length;
  return Math.sqrt(v);
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export function analyzeText(inputText) {
  const text = (inputText || '').toString();
  const warnings = [
    'This is a heuristic estimate and cannot prove whether AI was used.'
  ];

  if (!text.trim()) {
    warnings.push('No text provided; no decision can be made.');
    return {
      score: 0.0,
      level: 'low',
      summary:
        'No content to analyze. Provide text for a heuristic estimate. This tool cannot make a determination from empty input.',
      signals: {
        stylometry: 'No sentences to measure.',
        discourse: 'No discourse structure detected.',
        lexical: 'No lexical data.'
      },
      warnings
    };
  }

  const charCount = text.length;
  const sentences = splitSentences(text);
  const sentenceCount = sentences.length;
  const words = tokenize(text);
  const wordCount = words.length;
  const uniqueWords = new Set(words);
  const ttr = wordCount ? uniqueWords.size / wordCount : 0; // type-token ratio
  const repetitiveness = 1 - ttr;

  const sentLengths = sentences.map(s => tokenize(s).length || 0);
  const avgSentLen = sentLengths.length ? mean(sentLengths) : 0;
  const sentStd = sentLengths.length ? stddev(sentLengths) : 0;

  const lower = text.toLowerCase();
  let discourseMatches = 0;
  for (const m of DISCOURSE_MARKERS) {
    const re = new RegExp(`\\b${m.replace(/\\s+/g, '\\s+')}\\b`, 'gi');
    const found = lower.match(re);
    if (found) discourseMatches += found.length;
  }
  const discourseDensity = wordCount ? discourseMatches / wordCount : 0;

  const hasDigits = /\d/.test(text);
  const hasYear = /\b(19|20)\d{2}\b/.test(text);
  const firstPerson = /\b(i|we|my|our|mine|us)\b/i.test(text);

  const lowSentenceVar = sentStd > 0 && sentStd < 4;
  const longAvgSentence = avgSentLen >= 18;
  const veryLongAvgSentence = avgSentLen > 30;
  const lowLexicalDiversity = ttr < 0.45;
  const manyConnectors = discourseDensity > 0.012;
  const repetitive = repetitiveness > 0.25;

  let score = 0.5; // base

  const aiFlags = [
    lowSentenceVar && longAvgSentence,
    lowLexicalDiversity,
    manyConnectors,
    veryLongAvgSentence,
    repetitive
  ].filter(Boolean).length;

  if (aiFlags >= 2) {
    score += 0.08 * aiFlags;
  } else {
    score += 0.03 * aiFlags;
  }

  if (lowSentenceVar && longAvgSentence) score += 0.06;
  if (lowLexicalDiversity) score += 0.07;
  if (manyConnectors) score += 0.05;
  if (veryLongAvgSentence) score += 0.04;
  if (repetitive) score += Math.min(0.06, repetitiveness * 0.18);

  const concreteDetails = hasDigits || hasYear;
  if (firstPerson && concreteDetails) {
    score -= 0.12;
  } else if (firstPerson) {
    score -= 0.06;
  }

  if (sentStd > 12) {
    score -= 0.07;
  }

  const shortText = charCount < 300;
  if (shortText) {
    warnings.push('Text is very short; detection is unreliable.');
  }

  if (wordCount < 400) {
    const cap = 0.8;
    score = Math.min(score, cap);
    if (score >= 0.7) {
      warnings.push('Text length limits confidence; high scores are tentative for shorter texts.');
    }
  }

  score = clamp(Number(score), 0, 1);

  if (shortText) {
    score = clamp(score, 0.2, 0.6);
  }

  let level = 'medium';
  if (score < 0.35) level = 'low';
  else if (score > 0.7) level = 'high';
  else level = 'medium';

  const stylometry = `Average sentence length ≈ ${avgSentLen.toFixed(1)} words (σ ≈ ${sentStd.toFixed(
    1
  )}). ${lowSentenceVar ? 'Sentence lengths are fairly uniform.' : 'Sentence lengths vary.'}`;

  const discourse = `${discourseMatches} discourse marker(s) found; density ≈ ${(discourseDensity * 100).toFixed(
    2
  )}%. ${manyConnectors ? 'Transitions are smooth and academic-sounding.' : 'Transitions are more varied or informal.'}`;

  const lexical = `Type-token ratio ≈ ${ttr.toFixed(2)} (${uniqueWords.size} unique of ${wordCount}). ${
    lowLexicalDiversity ? 'Vocabulary is somewhat repetitive or generic.' : 'Vocabulary shows reasonable variety.'
  } ${repetitive ? 'Repetition detected.' : ''}`;

  const summaryParts = [];
  if (level === 'high') {
    summaryParts.push(
      `The heuristic score indicates the text is more AI-like: it shows multiple features commonly found in AI-generated writing.`
    );
  } else if (level === 'medium') {
    summaryParts.push(`The text contains a mix of signals; it could be human-written, AI-assisted, or edited.`);
  } else {
    summaryParts.push(
      `The text appears predominantly human-like based on the observed stylistic cues.`
    );
  }

  summaryParts.push(
    `Sentences are ${avgSentLen.toFixed(1)} words on average with σ=${sentStd.toFixed(1)}, and lexical diversity is ${ttr.toFixed(
      2
    )}.`
  );

  if (shortText) {
    summaryParts.push(`Because the text is short (${charCount} chars), the estimate is especially unreliable.`);
  } else {
    summaryParts.push(`This is a probabilistic, rule-based estimate — not definitive evidence of AI use.`);
  }

  const summary = summaryParts.join(' ');

  if (!warnings.includes('Human-written texts can sometimes look AI-like, and vice versa.')) {
    warnings.push('Human-written texts can sometimes look AI-like, and vice versa.');
  }

  if (firstPerson && manyConnectors) {
    warnings.push('Mixed personal voice and formal connectors suggest editing or hybrid content.');
  }

  return {
    score: Number(score.toFixed(3)),
    level,
    summary,
    signals: {
      stylometry,
      discourse,
      lexical
    },
    warnings
  };
}
