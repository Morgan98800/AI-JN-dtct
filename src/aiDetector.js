// src/aiDetector.js
// Segment-Level AI Text Heuristic Detector with Sigmoid Normalization
// Returns { documentScore, confidenceLevel, globalFlags, segments[] } for heat-map highlighting

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
// LEXICAL RARITY: ~1,000 Most Common English Words (Zipf's Law)
// Words NOT in this list are considered "rare" (AI often over-indexes rare words)
// ============================================================================
const COMMON_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for',
  'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his',
  'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my',
  'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if',
  'about', 'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like',
  'time', 'no', 'just', 'him', 'know', 'take', 'people', 'into', 'year',
  'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than', 'then',
  'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back',
  'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way', 'even',
  'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us', 'is',
  'was', 'are', 'been', 'being', 'has', 'had', 'does', 'did', 'am', 'should',
  'seem', 'might', 'may', 'must', 'can', 'could', 'shall', 'might', 'ought',
  'through', 'where', 'why', 'how', 'all', 'each', 'every', 'both', 'either',
  'neither', 'another', 'much', 'many', 'more', 'most', 'such', 'own', 'same',
  'tell', 'boy', 'follow', 'came', 'want', 'show', 'also', 'around', 'form',
  'three', 'small', 'set', 'put', 'end', 'does', 'another', 'well', 'large',
  'must', 'big', 'even', 'such', 'turn', 'here', 'why', 'ask', 'went', 'read',
  'need', 'land', 'different', 'home', 'us', 'move', 'try', 'kind', 'hand',
  'picture', 'again', 'change', 'off', 'play', 'spell', 'away', 'animal',
  'house', 'point', 'page', 'letter', 'mother', 'father', 'children', 'men',
  'women', 'boy', 'girl', 'man', 'woman', 'child', 'person', 'people', 'made',
  'part', 'place', 'high', 'keep', 'last', 'long', 'life', 'live', 'make',
  'mean', 'old', 'open', 'please', 'right', 'said', 'seem', 'side', 'small',
  'still', 'take', 'tell', 'thank', 'their', 'them', 'then', 'there', 'these',
  'they', 'think', 'this', 'those', 'three', 'through', 'time', 'today', 'told',
  'too', 'took', 'top', 'toward', 'tree', 'turn', 'two', 'under', 'until', 'very',
  'wait', 'warm', 'wash', 'water', 'wear', 'week', 'went', 'were', 'when', 'which',
  'while', 'white', 'who', 'whole', 'whom', 'why', 'will', 'with', 'without',
  'word', 'work', 'world', 'would', 'write', 'wrong', 'year', 'yes', 'yet', 'young'
]);

// ============================================================================
// SUBORDINATING CONJUNCTIONS (Syntactic Depth Indicator)
// ============================================================================
const SUBORDINATING_CONJUNCTIONS = new Set([
  'although', 'though', 'whereas', 'while', 'since', 'because', 'if', 'unless',
  'provided', 'as', 'except', 'lest', 'when', 'where', 'why', 'how', 'once',
  'until', 'before', 'after', 'whenever', 'wherever', 'whoever', 'whomever',
  'whatever', 'whichever', 'provide', 'suppose', 'supposing', 'insofar', 'inasmuch'
]);

// ============================================================================
// AI ARTIFACT PATTERNS (Formatting & Preamble Tropes)
// ============================================================================
const AI_PREAMBLE_PATTERNS = [
  /^here\s+is/i,
  /^certainly\s*[!.]/i,
  /^sure[!.]/i,
  /^of\s+course/i,
  /^absolutely/i,
  /^well\s*,/i,
  /^let\s+me/i
];

const AI_FORMATTING_PATTERNS = [
  /\*\*[^*]+:\s*/g,
  /^[-*]\s+\*\*[^*]+\*\*/gm,
  /###\s+/g
];

// ============================================================================
// MATHEMATICAL NORMALIZATION: Sigmoid Curve
// Squashes raw algorithmic weight into strict [0.0, 1.0] probability range
// ============================================================================

/**
 * Sigmoid function: 1 / (1 + e^(-k * (x - midpoint)))
 * @param {number} x - Raw score
 * @param {number} k - Steepness (default 0.8, higher = sharper transition)
 * @param {number} midpoint - Center point (default 0.5)
 * @returns {number} Normalized score [0, 1]
 */
function sigmoid(x, k = 0.8, midpoint = 0.5) {
  const exponent = -k * (x - midpoint);
  // Guard against overflow
  if (exponent > 100) return 0;
  if (exponent < -100) return 1;
  return 1 / (1 + Math.exp(exponent));
}

// ============================================================================
// TOKENIZATION & SEGMENTATION (Robust, handles abbreviations)
// ============================================================================

/**
 * Robust sentence tokenizer handling abbreviations (Dr., e.g., etc.)
 * @param {string} text - Input text
 * @returns {string[]} Array of sentences
 */
function tokenizeSentences(text) {
  if (!text || !text.trim()) return [];
  
  // Protect abbreviations from splitting
  const abbreviations = ['Dr.', 'Mr.', 'Mrs.', 'Ms.', 'Prof.', 'Sr.', 'Jr.', 'e.g.', 'i.e.', 'etc.', 'vs.', 'Inc.', 'Ltd.', 'Co.'];
  let safeguardedText = text;
  const placeholders = {};
  
  abbreviations.forEach((abbr, idx) => {
    const placeholder = `__ABBR_${idx}__`;
    placeholders[placeholder] = abbr;
    safeguardedText = safeguardedText.replace(new RegExp(abbr.replace(/\./g, '\\.'), 'g'), placeholder);
  });
  
  // Split on sentence boundaries
  let sentences = safeguardedText.split(/(?<=[.!?])\s+(?=[A-Z])/);
  
  // Restore abbreviations and clean
  sentences = sentences.map(s => {
    Object.entries(placeholders).forEach(([placeholder, original]) => {
      s = s.replace(placeholder, original);
    });
    return s.trim();
  }).filter(s => s.length > 0);
  
  return sentences;
}

/**
 * Tokenize text into words (cleaned)
 * @param {string} text - Input text
 * @returns {string[]} Array of words
 */
function tokenizeWords(text) {
  return text
    .toLowerCase()
    .replace(/[\u2018\u2019\u201C\u201D]/g, "'")
    .replace(/[^a-z0-9'\-\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Calculate statistics for numeric array
 */
function arrayStats(arr) {
  if (!arr.length) return { mean: 0, stddev: 0 };
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((s, x) => s + Math.pow(x - mean, 2), 0) / arr.length;
  const stddev = Math.sqrt(variance);
  return { mean, stddev };
}

// ============================================================================
// ADVANCED FEATURE EXTRACTORS (Lexical Rarity, Syntactic Depth, Readability)
// ============================================================================

/**
 * Calculate lexical rarity: ratio of words NOT in top 1000 common words
 * AI text often artificially inflates rare words despite poor vocabulary diversity
 * @param {string[]} words - Tokenized words
 * @returns {number} Rarity score (0-1, higher = more rare words = more AI-like)
 */
function calculateLexicalRarity(words) {
  if (!words.length) return 0;
  let rareCount = 0;
  for (const word of words) {
    if (!COMMON_WORDS.has(word)) {
      rareCount++;
    }
  }
  return rareCount / words.length;
}

/**
 * Estimate syllable count using regex approximation
 * Used for Flesch-Kincaid readability scoring
 * @param {string} word - Single word
 * @returns {number} Estimated syllable count
 */
function estimateSyllables(word) {
  word = word.toLowerCase();
  if (word.length <= 3) return 1;
  
  // Count vowel groups
  let syllables = 0;
  let previousWasVowel = false;
  const vowels = 'aeiouy';
  
  for (let i = 0; i < word.length; i++) {
    const isVowel = vowels.includes(word[i]);
    if (isVowel && !previousWasVowel) {
      syllables++;
    }
    previousWasVowel = isVowel;
  }
  
  // Adjust for silent 'e'
  if (word.endsWith('e')) {
    syllables--;
  }
  if (word.endsWith('le') && word.length > 2 && !vowels.includes(word[word.length - 3])) {
    syllables++;
  }
  
  return Math.max(1, syllables);
}

/**
 * Calculate Flesch-Kincaid Grade Level (simplified)
 * Higher grade = harder to read. AI tends toward very uniform grade levels.
 * @param {string} segmentText - Text to analyze
 * @returns {number} Grade level (0-18+)
 */
function calculateFleschKincaid(segmentText) {
  const words = tokenizeWords(segmentText);
  const sentences = segmentText.split(/[.!?]+/).filter(s => s.trim().length);
  
  if (!words.length || !sentences.length) return 0;
  
  let totalSyllables = 0;
  for (const word of words) {
    totalSyllables += estimateSyllables(word);
  }
  
  // FK = 0.39 * (words/sentences) + 11.8 * (syllables/words) - 15.59
  const fk = 0.39 * (words.length / sentences.length) + 
             11.8 * (totalSyllables / words.length) - 15.59;
  
  return Math.max(0, Math.min(18, fk));
}

/**
 * Calculate syntactic depth: ratio of subordinating conjunctions and comma clauses
 * AI tends toward shallow syntax (simple clause structures) despite long sentences
 * @param {string} segmentText - Text to analyze
 * @returns {number} Syntactic depth score (0-1)
 */
function calculateSyntacticDepth(segmentText) {
  const words = tokenizeWords(segmentText);
  if (!words.length) return 0;
  
  // Count subordinating conjunctions
  let subordinateCount = 0;
  for (const conj of SUBORDINATING_CONJUNCTIONS) {
    const regex = new RegExp(`\\b${conj}\\b`, 'gi');
    const matches = segmentText.match(regex);
    if (matches) subordinateCount += matches.length;
  }
  
  // Count comma clauses (internal commas suggesting clausal depth)
  const internalCommas = (segmentText.match(/,/g) || []).length - 1; // -1 for trailing commas
  
  const totalDepthMarkers = subordinateCount + Math.max(0, internalCommas);
  
  // Normalize: depth is good, so return as a ratio
  // AI tends toward LOW syntactic depth despite long sentences: penalize
  return totalDepthMarkers / Math.max(1, words.length);
}

/**
 * Detect "helpful assistant" formatting/preamble artifacts
 * Heavy penalty for AI-specific tropes
 * @param {string} text - Full text or segment
 * @returns {number} Artifact score (0-1, higher = more AI-like)
 */
function detectAIFormatArtifacts(text) {
  let artifactScore = 0;
  
  // Check preamble patterns
  const lines = text.split('\n');
  if (lines.length > 0) {
    for (const pattern of AI_PREAMBLE_PATTERNS) {
      if (pattern.test(lines[0])) {
        artifactScore += 0.20; // Heavy penalty
      }
    }
  }
  
  // Check formatting patterns
  let formatMatches = 0;
  for (const pattern of AI_FORMATTING_PATTERNS) {
    const matches = text.match(pattern) || [];
    formatMatches += matches.length;
  }
  
  // Penalize excessive **Concept:** patterns
  if (formatMatches > 3) {
    artifactScore += Math.min(0.25, formatMatches * 0.05);
  }
  
  // Check for perfect bullet-point lists
  const bulletPoints = (text.match(/^[-*]\s+/gm) || []).length;
  const lines_ = text.split('\n').filter(l => l.trim());
  if (bulletPoints > 3 && (bulletPoints / lines_.length) > 0.5) {
    artifactScore += 0.15; // Suspiciously regular structure
  }
  
  return Math.min(1, artifactScore);
}

// ============================================================================
// SEGMENT-LEVEL FEATURE EXTRACTION
// ============================================================================

/**
 * Analyze a single segment (sentence/paragraph)
 * @param {string} segmentText - The segment to analyze
 * @param {string[]} documentWords - All words from document (for diversity context)
 * @returns {object} rawScore and flags for this segment
 */
function analyzeSegment(segmentText, documentWords = []) {
  const flags = [];
  let rawScore = 0.5; // Neutral baseline
  
  if (!segmentText || segmentText.trim().length === 0) {
    return { rawScore: 0, flags, wordCount: 0 };
  }
  
  const words = tokenizeWords(segmentText);
  const wordCount = words.length;
  
  if (wordCount === 0) {
    return { rawScore: 0, flags, wordCount: 0 };
  }
  
  // --- LEXICAL FLAGS: Tier 1, 2, 3 Vocabularies ---
  let tier1Count = 0;
  let tier2Count = 0;
  let tier3Count = 0;
  
  for (const word of words) {
    if (TIER_1_VOCABULARY.has(word)) {
      tier1Count++;
    }
  }
  
  // Connector phrases
  for (const connector of TIER_2_CONNECTORS) {
    const regex = new RegExp(`\\b${connector.replace(/\s+/g, '\\s+')}\\b`, 'gi');
    const matches = segmentText.match(regex);
    if (matches) {
      tier2Count += matches.length;
    }
  }
  
  for (const hedge of TIER_3_HEDGES) {
    const regex = new RegExp(`\\b${hedge.replace(/\s+/g, '\\s+')}\\b`, 'gi');
    const matches = segmentText.match(regex);
    if (matches) {
      tier3Count += matches.length;
    }
  }
  
  // Tier 1: Strong AI signal
  if (tier1Count > 0) {
    rawScore += (tier1Count / wordCount) * 0.25;
    flags.push(`Tier 1 Vocab: ${Math.min(tier1Count, 3)} words`);
  }
  
  // Tier 2: Structural connector signal
  if (tier2Count > 0) {
    rawScore += (tier2Count / wordCount) * 0.20;
    flags.push(`Tier 2 Connector: ${tier2Count} transition(s)`);
  }
  
  // Tier 3: Hedge/safety padding signal
  if (tier3Count > 0) {
    rawScore += (tier3Count / wordCount) * 0.10;
    flags.push(`Tier 3 Hedge: safety padding detected`);
  }
  
  // --- STRUCTURAL METRICS ---
  const sentenceLength = words.length;
  
  // Punctuation density (em-dash and colons are more AI-like)
  const emDashCount = (segmentText.match(/—/g) || []).length;
  const colonCount = (segmentText.match(/:/g) || []).length;
  const punctScore = (emDashCount * 0.06) + (colonCount * 0.04);
  rawScore += Math.min(punctScore, 0.15);
  
  if (emDashCount > 1 || colonCount > 2) {
    flags.push('Higher punctuation density detected');
  }
  
  // --- HUMAN MODIFIERS (Reducers) ---
  
  // Contractions: Strong human signal
  const contractions = (segmentText.match(HUMAN_CONTRACTIONS) || []).length;
  if (contractions > 0) {
    rawScore -= (contractions / wordCount) * 0.20;
    flags.push(`Human signal: ${contractions} contraction(s)`);
  }
  
  // Slang/informal words
  let slangCount = 0;
  for (const slang of HUMAN_SLANG) {
    const regex = new RegExp(`\\b${slang}\\b`, 'gi');
    const matches = segmentText.match(regex);
    if (matches) slangCount += matches.length;
  }
  if (slangCount > 0) {
    rawScore -= (slangCount / wordCount) * 0.15;
    flags.push(`Informal style: ${slangCount} slang word(s)`);
  }
  
  // First-person pronouns/phrasing
  const firstPerson = (segmentText.match(HUMAN_FIRST_PERSON) || []).length;
  if (firstPerson > 0) {
    rawScore -= 0.15;
    flags.push('First-person phrasing detected');
  }
  
  // Concrete details (dates, years, specific numbers)
  const years = (segmentText.match(/\b(19|20)\d{2}\b/g) || []).length;
  const dates = (segmentText.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\b/gi) || []).length;
  const specificNumbers = (segmentText.match(/\b\d{1,}\b/g) || []).length;
  const concreteCount = years + dates + (specificNumbers > 0 ? 1 : 0);
  
  if (concreteCount > 0) {
    rawScore -= Math.min(concreteCount * 0.08, 0.20);
    if (years > 0) flags.push(`Concrete year(s): ${years}`);
    if (dates > 0) flags.push(`Specific date(s): ${dates}`);
  }
  
  // --- NEW FEATURE 1: LEXICAL RARITY (Zipf Index) ---
  const rarity = calculateLexicalRarity(words);
  if (rarity > 0.45) {
    // High rare word density suggests AI (artificially inflating rare words)
    rawScore += rarity * 0.15;
    flags.push(`High lexical rarity: ${Math.round(rarity * 100)}% rare words`);
  } else if (rarity < 0.25) {
    // Very low rarity (all common words) suggests human
    rawScore -= 0.05;
    flags.push('Low lexical rarity: common vocabulary');
  }
  
  // --- NEW FEATURE 2: SYNTACTIC DEPTH (Clause Complexity) ---
  const syntacticDepth = calculateSyntacticDepth(segmentText);
  if (syntacticDepth < 0.05 && wordCount > 15) {
    // Long sentence but shallow syntax = AI (simple clauses strung together)
    rawScore += 0.12;
    flags.push('Shallow syntax: long sentences, simple clauses');
  } else if (syntacticDepth > 0.15) {
    // Rich syntactic complexity = human (varied clause structures)
    rawScore -= 0.10;
    flags.push('Complex syntax: varied clause structures');
  }
  
  // --- NEW FEATURE 3: READABILITY VARIANCE (Flesch-Kincaid) ---
  const fk = calculateFleschKincaid(segmentText);
  if (fk < 4) {
    // Very easy readability (grade 4 or lower) = unusual, could be AI simplifying
    rawScore += 0.08;
  } else if (fk > 14) {
    // Very complex reading level (college+) = human academic writing
    rawScore -= 0.08;
  }
  
  // --- NEW FEATURE 4: AI FORMATTING ARTIFACTS ---
  const artifactScore = detectAIFormatArtifacts(segmentText);
  if (artifactScore > 0.1) {
    rawScore += artifactScore * 0.20; // Heavily penalize artifacts
    flags.push('AI formatting artifacts detected');
  }
  
  // Clamp per-segment score
  rawScore = Math.max(0, Math.min(rawScore, 1));
  
  return {
    rawScore,
    wordCount,
    flags,
    metrics: {
      tier1Count,
      tier2Count,
      tier3Count,
      contractionCount: contractions,
      slangCount,
      firstPersonCount: firstPerson
    }
  };
}

// ============================================================================
// MACRO-DOCUMENT CONTEXT (Cross-Segment Features)
// ============================================================================

/**
 * Calculate burstiness (sentence length variance)
 * Low variance = AI-like; High variance = Human-like
 */
function calculateBurstiness(sentences) {
  if (sentences.length < 2) return 0.5;
  
  const lengths = sentences.map(s => tokenizeWords(s).length).filter(l => l > 0);
  if (lengths.length < 2) return 0.5;
  
  const stats = arrayStats(lengths);
  const cv = stats.mean > 0 ? stats.stddev / stats.mean : 0;
  
  // Lower CV → more AI-like (uniform sentence lengths)
  if (cv < 0.20) return 0.80;
  if (cv < 0.35) return 0.60;
  if (cv < 0.55) return 0.40;
  return 0.15; // High variance = very human-like
}

/**
 * Calculate redundancy index (vocabulary overlap between consecutive segments)
 * High overlap = more AI-like (repetition of root nouns/verbs)
 */
function calculateRedundancy(segments) {
  if (segments.length < 2) return 0;
  
  let totalOverlap = 0;
  let pairCount = 0;
  
  for (let i = 0; i < segments.length - 1; i++) {
    const words1 = new Set(tokenizeWords(segments[i]));
    const words2 = new Set(tokenizeWords(segments[i + 1]));
    
    let intersection = 0;
    for (const word of words1) {
      if (words2.has(word)) intersection++;
    }
    
    const union = new Set([...words1, ...words2]).size;
    const jaccard = union > 0 ? intersection / union : 0;
    totalOverlap += jaccard;
    pairCount++;
  }
  
  const avgOverlap = pairCount > 0 ? totalOverlap / pairCount : 0;
  
  // Average Jaccard similarity; higher = more repetitive (AI-like)
  if (avgOverlap > 0.40) return 0.75; // Very repetitive
  if (avgOverlap > 0.30) return 0.50; // Moderate
  return 0.20; // Low repetition (human-like)
}

/**
 * Calculate readability variance (Flesch-Kincaid scores across document)
 * Zero or near-zero variance = AI (uniform reading difficulty)
 * High variance = Human (mix of simple and complex writing)
 */
function calculateReadabilityVariance(segments) {
  if (segments.length < 2) return 0.5;
  
  const fkScores = segments.map(seg => calculateFleschKincaid(seg));
  const stats = arrayStats(fkScores);
  
  // CV of readability levels
  const cv = stats.mean > 0 ? stats.stddev / stats.mean : 0;
  
  // Extremely uniform readability = AI (all segments same difficulty)
  if (cv < 0.10) return 0.70; // Very AI-like
  if (cv < 0.20) return 0.50; // Moderate
  if (cv < 0.35) return 0.30; // More human-like
  return 0.10; // High variance = very human-like (intentional style variation)
}

// ============================================================================
// MAIN EXPORT: analyzeText(inputText)
// ============================================================================

/**
 * Complete segment-level AI text analysis with Sigmoid normalization
 * @param {string} inputText - Text to analyze
 * @returns {object} { documentScore, confidenceLevel, globalFlags, segments[] }
 */
export function analyzeText(inputText) {
  const text = (inputText || '').toString().trim();
  
  if (!text) {
    return {
      documentScore: 0,
      confidenceLevel: 'Low',
      globalFlags: ['No text provided'],
      segments: []
    };
  }
  
  // Segment the text
  const sentences = tokenizeSentences(text);
  
  if (sentences.length === 0) {
    return {
      documentScore: 0,
      confidenceLevel: 'Low',
      globalFlags: ['Unable to parse text into segments'],
      segments: []
    };
  }
  
  const allWords = tokenizeWords(text);
  const documentWordCount = allWords.length;
  
  // ========================================================================
  // SEGMENT-LEVEL ANALYSIS
  // ========================================================================
  const segments = sentences.map(sentence => {
    const analysis = analyzeSegment(sentence, allWords);
    return {
      text: sentence,
      segmentScore: analysis.rawScore,
      flags: analysis.flags,
      wordCount: analysis.wordCount,
      metrics: analysis.metrics
    };
  });
  
  // ========================================================================
  // MACRO-DOCUMENT FEATURES
  // ========================================================================
  const burstinessScore = calculateBurstiness(sentences);
  const redundancyScore = calculateRedundancy(sentences);
  const readabilityVarianceScore = calculateReadabilityVariance(sentences);
  
  // Calculate mean segment score
  const meanSegmentScore = segments.length > 0
    ? segments.reduce((sum, seg) => sum + seg.segmentScore, 0) / segments.length
    : 0.5;
  
  // ========================================================================
  // RAW ALGORITHMIC WEIGHT (before Sigmoid)
  // Combine segment scores with macro-level features
  // ========================================================================
  let rawWeight = meanSegmentScore;
  
  // Burstiness: Low variance = AI-like, so add positive contribution
  rawWeight += burstinessScore * 0.20;
  
  // Redundancy: High overlap = AI-like, so add positive contribution
  rawWeight += redundancyScore * 0.15;
  
  // Readability Variance: Zero variance = AI-like (uniform difficulty)
  rawWeight += readabilityVarianceScore * 0.10;
  
  // Conservative adjustments
  if (documentWordCount < 150) {
    rawWeight = Math.min(rawWeight, 0.55); // Short text = less confidence
  }
  
  if (documentWordCount > 2000) {
    rawWeight = Math.max(rawWeight, 0.30); // Very long text biases human
  }
  
  // ========================================================================
  // SIGMOID NORMALIZATION: Convert raw weight to [0, 1] probability
  // midpoint=0.5 means 50% of cases hit around 0.5 score
  // k=0.8 controls transition sharpness
  // ========================================================================
  const documentScore = sigmoid(rawWeight, 0.8, 0.5);
  
  // ========================================================================
  // CONFIDENCE LEVEL & GLOBAL FLAGS
  // ========================================================================
  let confidenceLevel = 'Low';
  const globalFlags = [];
  
  if (burstinessScore < 0.30) {
    globalFlags.push('Low Sentence Variance');
  }
  if (redundancyScore > 0.50) {
    globalFlags.push('High Repetition Index');
  }
  if (readabilityVarianceScore > 0.50) {
    globalFlags.push('Uniform Readability (low variance)');
  }
  if (segments.some(s => s.segmentScore > 0.75)) {
    globalFlags.push('High-Risk Segments Detected');
  }
  if (documentWordCount > 500) {
    confidenceLevel = 'High';
  } else if (documentWordCount > 250) {
    confidenceLevel = 'Medium';
  } else {
    confidenceLevel = 'Low';
  }
  
  if (documentScore > 0.75) {
    globalFlags.push('Strong AI Detection Signals');
  } else if (documentScore > 0.50) {
    globalFlags.push('Mixed Indicators');
  } else {
    globalFlags.push('Strong Human Signals');
  }
  
  globalFlags.push('Heuristic estimate; not definitive proof');
  
  // ========================================================================
  // RETURN SEGMENT-LEVEL SCHEMA FOR REACT HEAT-MAP
  // ========================================================================
  return {
    documentScore: Math.round(documentScore * 100),
    confidenceLevel,
    globalFlags,
    segments: segments.map(seg => ({
      text: seg.text,
      segmentScore: Math.round(seg.segmentScore * 100),
      flags: seg.flags
    })),
    // Optional: metadata for debugging
    _metadata: {
      totalSegments: segments.length,
      burstinessScore: Math.round(burstinessScore * 100),
      redundancyScore: Math.round(redundancyScore * 100),
      readabilityVarianceScore: Math.round(readabilityVarianceScore * 100),
      documentWordCount,
      meanSegmentScore: Math.round(meanSegmentScore * 100)
    }
  };
}

export default analyzeText;
