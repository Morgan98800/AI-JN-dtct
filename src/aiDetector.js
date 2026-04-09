// src/aiDetector.js
// Advanced production-grade AI text heuristic detector
// Returns { score, riskLevel, flags, metrics } with tiered vocabulary analysis and burstiness detection

// ============================================================================
// TIER 1: HIGH AI CORRELATION VOCABULARY (RLHF-trained 2024-2026 over-indexed)
// ============================================================================
const TIER_1_VOCABULARY = new Set([
  'delve', 'tapestry', 'beacon', 'testament', 'multifaceted', 'fostering',
  'intricate', 'demystify', 'realm', 'symphony', 'nuanced', 'convergence',
  'landscape', 'paradigm', 'venerable', 'veneer', 'unprecedented', 'catalyze',
  'granular', 'holistic', 'leverage', 'synergistic', 'strategic', 'ecosystem',
  'innovative', 'crucial', 'paramount', 'quintessential', 'epitome',
  'burgeoning', 'nascent', 'ubiquitous', 'perspicacious', 'sagacious',
  'resonate', 'elucidate', 'obfuscate', 'juxtapose', 'infrastructure',
  'scalability', 'robust', 'seamless', 'stakeholder', 'plethora', 'nexus'
]);

// ============================================================================
// TIER 2: RLHF STRUCTURAL CONNECTORS (Repetitive transitional framing)
// ============================================================================
const TIER_2_CONNECTORS = new Set([
  'it is important to note', 'furthermore', 'moreover', 'in conclusion',
  'ultimately', 'as we navigate', 'in this context', 'on the other hand',
  'conversely', 'consequently', 'therefore', 'thus', 'hence', 'in addition',
  'additionally', 'it is worth noting', 'it should be noted', 'in essence',
  'essentially', 'in effect', 'in reality', 'in fact', 'indeed', 'notably',
  'significantly', 'as we move forward', 'first and foremost', 'at the end of the day',
  'it is crucial', 'it is essential', 'it is vital'
]);

// ============================================================================
// TIER 3: RLHF HEDGE WORDS & SAFETY PADDING
// ============================================================================
const TIER_3_HEDGES = new Set([
  'crucial to remember', 'complex and nuanced', 'worth noting',
  'important to recognize', 'both positive and negative', 'that said',
  'while it is true', 'on one hand', 'to some extent', 'in some cases',
  'arguably', 'admittedly', 'critically'
]);

// ============================================================================
// HUMAN SIGNALS (Strong Reducers)
// ============================================================================
const HUMAN_CONTRACTIONS = /\b(I'm|don't|can't|won't|it's|we're|they're|isn't|aren't|wasn't|weren't|haven't|hasn't|hadn't|didn't|shouldn't|wouldn't|couldn't|Here's|That's|What's|Who's|y'all|ain't|'em|'bout|gonna|wanna|gotta)\b/gi;

const HUMAN_SLANG = new Set([
  'yeah', 'yep', 'nope', 'kinda', 'sorta', 'you know', 'like', 'actually',
  'literally', 'basically', 'totally', 'super', 'pretty much', 'I mean',
  'honestly', 'frankly', 'to be honest', 'to be fair', 'anyway', 'stuff'
]);

const HUMAN_FIRST_PERSON = /\b(I think|I believe|I found|I discovered|I experienced|we discovered|I personally|in my opinion|from my perspective|based on my experience)\b/gi;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[\u2018\u2019\u201C\u201D]/g, "'")
    .replace(/[^a-z0-9'\-\s]/gi, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function splitSentences(text) {
  return text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

function splitParagraphs(text) {
  return text.split(/\n\n+/).map(p => p.trim()).filter(p => p.length > 0);
}

function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stddev(arr) {
  if (!arr.length) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, x) => s + Math.pow(x - m, 2), 0) / arr.length);
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function countPhraseOccurrences(text, phrase) {
  const escapedPhrase = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escapedPhrase.replace(/\s+/g, '\\s+')}\\b`, 'gi');
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

/**
 * Advanced Burstiness Score
 * Human writing: high variance (10-15+)
 * AI writing: low variance (3-8)
 */
function calculateBurstinessScore(sentenceLengths) {
  if (sentenceLengths.length < 3) return 0.5;
  
  const variance = stddev(sentenceLengths);
  const meanLen = mean(sentenceLengths);
  const cv = meanLen > 0 ? variance / meanLen : 0;
  
  if (cv < 0.25) return 0.8; // very AI-like (uniform)
  if (cv < 0.4) return 0.5; // neutral
  if (cv < 0.6) return 0.3; // human-like (varied)
  return 0.1; // very human-like (highly varied)
}

/**
 * Paragraph Uniformity Score
 */
function calculateParagraphUniformityScore(paragraphs) {
  if (paragraphs.length < 3) return 0.5;

  const paragraphLengths = paragraphs.map(p => tokenize(p).length);
  const variance = stddev(paragraphLengths);
  const meanLen = mean(paragraphLengths);
  const cv = meanLen > 0 ? variance / meanLen : 0;
  
  if (cv < 0.25) return 0.75; // AI-like
  if (cv < 0.4) return 0.5; // neutral
  return 0.2; // human-like
}

/**
 * Type-Token Ratio (Lexical Diversity)
 */
function calculateLexicalDiversity(words) {
  if (!words.length) return 0;
  const uniqueWords = new Set(words);
  return uniqueWords.size / words.length;
}

/**
 * Count vocabulary matches
 */
function countVocabularyMatches(words, vocabularySet) {
  let count = 0;
  for (const word of words) {
    if (vocabularySet.has(word)) count++;
  }
  return count;
}

/**
 * Count connector occurrences
 */
function countConnectorMatches(text, connectorSet) {
  let count = 0;
  for (const connector of connectorSet) {
    count += countPhraseOccurrences(text, connector);
  }
  return count;
}

/**
 * Analyze concrete details (human signal)
 */
function analyzeConcreteDetails(text) {
  const years = (text.match(/\b(19|20)\d{2}\b/g) || []).length;
  const dates = (text.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\b/gi) || []).length;
  const times = (text.match(/\b([0-1]?[0-9]|2[0-3]):[0-5][0-9]\b/g) || []).length;
  const percents = (text.match(/\d+%|%\d+/g) || []).length;
  const money = (text.match(/\$\d+|£\d+|€\d+|\d+\s?(USD|GBP|EUR)/gi) || []).length;
  
  return { years, dates, times, percents, money, total: years + dates + times + percents + money };
}

// ============================================================================
// MAIN EXPORT: analyzeText(inputText)
// ============================================================================

export function analyzeText(inputText) {
  const text = (inputText || '').toString();
  const flags = [];
  
  if (!text.trim()) {
    return {
      score: 0,
      riskLevel: 'low',
      flags: ['No text provided; cannot analyze.'],
      metrics: {
        wordCount: 0, sentenceCount: 0, paragraphCount: 0,
        avgSentenceLength: 0, burstinessScore: 0, lexicalDiversity: 0,
        tier1Score: 0, tier2Score: 0, tier3Score: 0, contractionCount: 0
      }
    };
  }

  // ========================================================================
  // BASIC METRICS
  // ========================================================================
  const words = tokenize(text);
  const wordCount = words.length;
  const sentences = splitSentences(text);
  const sentenceCount = sentences.length;
  const paragraphs = splitParagraphs(text);
  const paragraphCount = paragraphs.length;

  const sentenceLengths = sentences.map(s => tokenize(s).length || 0).filter(l => l > 0);
  const avgSentenceLength = sentenceLengths.length ? mean(sentenceLengths) : 0;

  // ========================================================================
  // ADVANCED METRICS
  // ========================================================================
  const burstinessScore = calculateBurstinessScore(sentenceLengths);
  const paragraphUniformityScore = calculateParagraphUniformityScore(paragraphs);
  const lexicalDiversity = calculateLexicalDiversity(words);
  
  const tier1Count = countVocabularyMatches(words, TIER_1_VOCABULARY);
  const tier1Density = wordCount ? tier1Count / wordCount : 0;
  const tier1Score = Math.min(1, tier1Density * 10);
  
  const tier2Count = countConnectorMatches(text, TIER_2_CONNECTORS);
  const tier2Density = wordCount ? tier2Count / wordCount : 0;
  const tier2Score = Math.min(0.7, tier2Density * 20);
  
  const tier3Count = countConnectorMatches(text, TIER_3_HEDGES);
  const tier3Density = wordCount ? tier3Count / wordCount : 0;
  const tier3Score = Math.min(0.5, tier3Density * 15);
  
  const contractionMatches = text.match(HUMAN_CONTRACTIONS) || [];
  const contractionCount = contractionMatches.length;
  const contractionDensity = wordCount ? contractionCount / wordCount : 0;
  
  const slangMatches = Array.from(HUMAN_SLANG).filter(slang => {
    const regex = new RegExp(`\\b${slang}\\b`, 'gi');
    return regex.test(text);
  });
  const slangScore = slangMatches.length > 0 ? 0.1 * slangMatches.length : 0;
  
  const firstPersonMatches = text.match(HUMAN_FIRST_PERSON) || [];
  const firstPersonCount = firstPersonMatches.length;
  const firstPersonScore = Math.min(0.3, firstPersonCount * 0.05);
  
  const concreteDetails = analyzeConcreteDetails(text);
  const concreteScore = Math.min(0.25, concreteDetails.total / 10);

  // ========================================================================
  // AI SCORE CALCULATION
  // ========================================================================
  let aiScore = 0.5;

  aiScore += burstinessScore * 0.20;
  aiScore += paragraphUniformityScore * 0.15;
  aiScore += (1 - lexicalDiversity) * 0.15;
  aiScore += tier1Score * 0.15;
  aiScore += tier2Score * 0.20;
  aiScore += tier3Score * 0.10;

  aiScore -= contractionDensity * 0.15;
  aiScore -= Math.min(0.15, slangScore);
  aiScore -= firstPersonScore;
  aiScore -= concreteScore;

  // ========================================================================
  // CONSERVATIVE BIAS & PROTECTIONS
  // ========================================================================

  if (wordCount < 300) {
    aiScore = Math.min(aiScore, 0.6);
    flags.push('Text too short for high confidence (< 300 words)');
  }

  if (tier2Count > 3 && burstinessScore < 0.3 && concreteDetails.total > 5 && contractionCount > 2) {
    aiScore = Math.min(aiScore, 0.35);
    flags.push('Formal human writing detected with connections');
  }

  if (burstinessScore < 0.2 && concreteDetails.total > 8) {
    aiScore = Math.min(aiScore, 0.25);
    flags.push('Strong human signals: high sentence variance + concrete details');
  }

  if (contractionCount > 5 && slangMatches.length > 2) {
    aiScore = Math.min(aiScore, 0.30);
    flags.push('Informal conversational style detected');
  }

  if (wordCount > 500 && tier2Count > 8 && burstinessScore > 0.4 && lexicalDiversity > 0.55) {
    aiScore = Math.min(aiScore, 0.45);
    flags.push('Formal academic writing detected');
  }

  aiScore = clamp(aiScore, 0, 1);

  // ========================================================================
  // DETERMINE RISK LEVEL
  // ========================================================================
  let riskLevel = 'low';

  if (aiScore < 0.25) {
    riskLevel = 'low';
  } else if (aiScore < 0.5) {
    riskLevel = 'medium';
  } else if (aiScore < 0.75) {
    riskLevel = 'high';
  } else {
    riskLevel = 'very_high';
  }

  if (riskLevel === 'very_high') {
    flags.push('Strong indicators of AI-generated content');
  } else if (riskLevel === 'high') {
    flags.push('Multiple AI-like characteristics detected');
  } else if (riskLevel === 'medium') {
    flags.push('Mixed signals; text may contain AI-assisted sections');
  }

  if (!flags.find(f => f.includes('heuristic'))) {
    flags.push('This is a heuristic estimate; not definitive proof');
  }

  // ========================================================================
  // RETURN STRUCTURE
  // ========================================================================
  return {
    score: Math.round(aiScore * 100),
    riskLevel,
    flags,
    metrics: {
      wordCount,
      sentenceCount,
      paragraphCount,
      avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
      burstinessScore: Math.round(burstinessScore * 100) / 100,
      lexicalDiversity: Math.round(lexicalDiversity * 100) / 100,
      tier1VocabScore: Math.round(tier1Score * 100) / 100,
      tier2ConnectorScore: Math.round(tier2Score * 100) / 100,
      tier3HedgeScore: Math.round(tier3Score * 100) / 100,
      contractionCount,
      slangWordsDetected: slangMatches,
      concreteDetails
    }
  };
}

export default analyzeText;
