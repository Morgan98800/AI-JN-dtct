# AI Text Detector

A fast, frontend-only heuristic detector that estimates whether text was produced by AI or is predominantly human-written. Features **segment-level heat-map highlighting** to identify which parts are AI-like. Runs entirely in the browser with no network requests.

## Live Demo

**Visit:** https://ai-jn-dtct.surge.sh

## Features

- **Document-Level Score (0–100%)**
  - 0–25%: Very likely human-written
  - 25–50%: Likely human-written
  - 50–75%: Likely AI-generated
  - 75–100%: Very likely AI-generated

- **Segment-Level Heat-Map Highlighting** ✨
  - Each sentence color-coded by AI likelihood:
    - 🟢 **Green** (0–25%): Human signals detected
    - 🟡 **Amber** (25–50%): Mixed indicators
    - 🔴 **Red** (50–75%): AI-like patterns
    - 🔴 **Dark Red** (75–100%): Strong AI indicators
  - Inline score badges `[85%]` on each segment
  - Per-segment flags explaining what triggered the score

- **Sigmoid-Normalized Scoring**
  - Raw algorithmic weights from 0.0–1.0 + Sigmoid curve (not linear addition)
  - Smooth, principled probability distribution
  - No artificial caps or arbitrary thresholds
  - Eliminates "weirdness" from simple +/- heuristics

- **Tiered Vocabulary Analysis**
  - **Tier 1**: RLHF over-indexed AI terms (40+ words: "delve", "tapestry", "paradigm", etc.)
  - **Tier 2**: Structural connectors (25+ phrases: "it is important to note", "furthermore")
  - **Tier 3**: Safety padding/hedges (13+ phrases: "complex and nuanced")

- **Macro-Document Context**
  - **Burstiness Score**: Sentence length variance (low = AI uniformity; high = human variety)
  - **Redundancy Index**: Vocabulary overlap between consecutive segments (high = AI repetition)
  - **Readability Variance**: Flesch-Kincaid grade level consistency (zero variance = AI uniformity)
  - Global flags explaining document-level patterns

- **Advanced NLP Heuristics** ✨
  - **Lexical Rarity (Zipf Index)**: Ratio of "rare words" (not in top 1000 common English words). AI artificially inflates rare words; humans use natural distribution.
  - **Syntactic Depth Proxy**: Measures subordinating conjunctions and internal commas relative to sentence length. AI uses long sentences with shallow clause depth; humans vary.
  - **Flesch-Kincaid Readability**: Grade-level estimation per segment. Tracks variance—zero variance = AI (uniform difficulty); high variance = human (intentional style changes).
  - **AI Artifact Detection**: Scans for "helpful assistant" formatting tropes:
    - Preambles: "Here is...", "Certainly!", "Sure!", "Of course"
    - Formatting: **Concept:** patterns, perfect bullet-point lists, excessive heading markup
    - Penalties applied for suspicious structural regularity

- **Human Signal Detection**
  - Contractions ("I'm", "don't", "can't") — strong human indicator
  - Slang and informal language ("yeah", "kinda", "basically")
  - First-person phrasing ("I think", "I found", "in my opinion")
  - Concrete details (years, dates, specific numbers)

- **Context-Aware Warnings**
  - Reliability caveats for short texts (<150 words)
  - False-positive risk on formal human writing
  - Confidence level displayed (Low/Medium/High)

## How It Works

The detector uses a **production-grade heuristic pipeline** with segment-level analysis and mathematical normalization:

### 1. Text Segmentation (Robust Tokenization)
- Splits input into individual sentences
- Handles abbreviations (Dr., e.g., etc.) to prevent incorrect boundaries
- Each segment is analyzed independently before document-level scoring

### 2. Per-Segment Feature Extraction

For each sentence, the detector calculates:

| Feature | AI Signal | Human Signal |
|---------|-----------|--------------|
| **Tier 1 Vocabulary** | "delve", "tapestry", "multifaceted" (40+ terms) | — |
| **Tier 2 Connectors** | "it is important to note", "furthermore" (25+ phrases) | — |
| **Tier 3 Hedges** | Safety padding, "complex and nuanced" | — |
| **Contractions** | — | "I'm", "don't", "can't" (strong reducer) |
| **Slang/Informal** | — | "yeah", "kinda", "basically" |
| **First-Person** | — | "I think", "I found", "in my opinion" |
| **Concrete Details** | — | Years, dates, specific numbers |
| **Punctuation** | High em-dash (—) and colon (:) usage | Lower density |
| **Lexical Rarity** | High % of rare words (Zipf >45%) | Natural word distribution |
| **Syntactic Depth** | Long sentences, shallow clause depth | Varied clause complexity |
| **Readability Variance** | Zero variance (uniform grade levels) | Mixed (intentional style shifts) |
| **AI Artifacts** | **Bold:** patterns, preambles, bullet lists | Organic formatting |

### 3. Macro-Document Features
- **Sentence Burstiness**: Standard deviation of sentence lengths
  - Low variance (uniform) → AI-like (typical coefficient of variation 0.15–0.25)
  - High variance (mixed) → Human-like (typical 0.50+)
- **Vocabulary Redundancy**: Jaccard similarity between consecutive segments
  - High overlap (>40%) → AI-like (repetitive)
  - Low overlap (<20%) → Human-like (varied)
- **Readability Variance**: Flesch-Kincaid grade level consistency across segments
  - Zero variance (<0.10 CV) → AI-like (uniform difficulty)
  - High variance (>0.35 CV) → Human-like (intentional style variation)

### 4. Sigmoid Normalization (Mathematical Smoothing)
Instead of linear addition ("add 10 for this word, subtract 5 for a contraction"):
- Combine all segment scores and macro-features into a **raw algorithmic weight** (0.0–1.0)
- Pass through Sigmoid curve: `1 / (1 + e^(-0.8 * (x - 0.5)))`
- Result: smooth, principled probability distribution
  - Eliminates arbitrary caps and thresholds
  - No more "balloons to 110%" or "crashes to 0%"
  - Properly handles mixed-signal documents

### 5. Confidence & Safety Measures
- **Short Text Protection**: Confidence capped for <150 words
- **Formal Writing Protection**: Conservative score caps if strong human signals + formal structure detected
- **Per-Segment Explanation**: Flags on each segment explain what triggered its score

## API Output Schema

The `analyzeText(text)` function returns:

```javascript
{
  documentScore: 72,                    // 0–100 final probability (Sigmoid-normalized)
  confidenceLevel: "High",              // Low/Medium/High based on word count
  globalFlags: [
    "Low Sentence Variance",            // Macro-level observations
    "High Repetition Index",
    "Strong AI Detection Signals"
  ],
  segments: [                           // Heat-map data: each sentence scored
    {
      text: "The rapid advancement of technology is a multifaceted tapestry.",
      segmentScore: 85,                 // 0–100 per-segment score
      flags: ["Tier 1 Vocab: advancement technology"]  // Why it scored high
    },
    {
      text: "I personally think we should focus on the numbers from 2024.",
      segmentScore: 18,
      flags: ["First-person phrasing", "Human signal: contractions"]
    }
  ],
  _metadata: {                          // Debugging / advanced inspection
    totalSegments: 42,
    burstinessScore: 35,                // 0–100 (low = uniform = AI)
    redundancyScore: 62,                // 0–100 (high = repetitive = AI)
    readabilityVarianceScore: 28,       // 0–100 (low = uniform difficulty = AI)
    documentWordCount: 1248,
    meanSegmentScore: 48
  }
}
```

---

## Installation & Development

### Prerequisites
- Node.js 16+
- npm

### Setup

```bash
git clone https://github.com/Morgan98800/AI-JN-dtct.git
cd AI-JN-dtct
npm install
```

### Run Locally

```bash
npm run dev
```

Then open http://localhost:5173 in your browser.

### Build for Production

```bash
npm run build
npm run preview
```

## Project Structure

```
src/
  App.jsx           # Main React component with UI
  aiDetector.js     # Core heuristic detection logic
  main.jsx          # React entry point
  styles.css        # Styling
```

## Limitations ⚠️

- **Not definitive proof**: This is a probabilistic heuristic, not a trained ML model. Use for screening, not accusation.
- **False positives**: Can incorrectly flag formal human writing (academic papers, professional reports) as AI-like. The constraint applies conservative caps to mitigate.
- **False negatives**: Sophisticated human writing, lightly edited AI text, or domain-specific jargon may not be reliably detected.
- **Short texts (<150 words)**: Confidence is inherently low; statistical reliability requires more data.
- **Language**: Optimized for English. Other languages may have higher error rates.
- **Mixed content**: Documents with both AI-generated and human-written sections will show mixed segment scores (this is expected).
- **No network validation**: Cannot detect if text originated from APIs; focuses on linguistic patterns only.

### Key Improvements in This Version

- ✅ **No arbitrary scoring**: Sigmoid normalization replaces linear addition
- ✅ **Transparent per-segment analysis**: See which sentences drive the overall score
- ✅ **Heat-map highlighting**: Color-coded visual feedback for mixed documents
- ✅ **Robust tokenization**: Handles abbreviations correctly
- ✅ **Macro-level context**: Burstiness, redundancy, and readability variance scoring
- ✅ **Advanced NLP heuristics**: Lexical rarity (Zipf), syntactic depth, readability variance, AI artifact detection
- ✅ **Better accuracy on formal text**: Conservative bias protections reduce false positives

## For Production Use

For serious AI detection needs, consider:
- [OpenAI API](https://openai.com) moderation endpoint
- [Turnitin](https://www.turnitin.com)
- [GPTZero](https://gptzero.me)
- Trained ML models for your specific domain

## Technical Stack

- **Frontend**: React 18 + Vite
- **Runtime**: Pure JavaScript (no external ML libraries)
- **Algorithms**: 
  - Segment-level feature extraction (per-sentence analysis)
  - Sigmoid normalization for score smoothing
  - Burstiness calculation (coefficient of variation)
  - Redundancy indexing (Jaccard similarity)
- **Deployment**: Surge (static hosting)
- **Bundle Size**: ~50 KB gzipped

## License

MIT

---

**Questions or feedback?** Open an issue or reach out to the author.

