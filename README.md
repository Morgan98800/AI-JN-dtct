# AI Text Detector

A fast, frontend-only heuristic detector that estimates whether a piece of text was produced by AI or is predominantly human-written. Runs entirely in the browser with no network requests.

## Live Demo

**Visit:** https://ai-jn-dtct.surge.sh

## Features

- **Percentage Score (0–100%)**
  - 0–20%: Mostly human-like
  - 20–60%: Mixed/uncertain signals
  - 60–100%: Strong AI-like patterns

- **Detailed Analysis Signals**
  - **Text Metrics**: word count, sentence count, length variation
  - **Lexical**: vocabulary diversity, repeated phrases, AI buzzwords detected
  - **Style**: formality level, first-person usage, personal detail density
  - **Discourse**: connector density, structural patterns
  - **Segment Scores**: per-paragraph AI likelihood for longer texts (>300 words)

- **Context-Aware Warnings**
  - Reliability caveats for short texts
  - False-positive risk on formal human writing
  - Notes on mixed/inconsistent patterns

## How It Works

The detector uses **rule-based heuristics** to analyze:

1. **Sentence Structure**
   - Very uniform lengths + long sentences → AI-like
   - High variation, mixed short/long → human-like

2. **Vocabulary**
   - Low diversity, generic phrases → AI-like
   - High diversity, concrete details → human-like

3. **Formality & Language**
   - Many discourse connectors ("however", "moreover") → AI-like
   - Contractions, slang, first-person pronouns → human-like

4. **Text Patterns**
   - Overused academic buzzwords ("crucial", "leverage", "synergy")
   - Personal details (dates, places, numbers)
   - Structural regularity (paragraph patterns)

### Conservative Bias
The detector is designed to avoid **false positives** (marking human text as AI):
- Short texts (<300 words) are restricted to medium confidence
- Strong human signals cap the AI score at 0.7
- Highly formal, polished texts get a warning about false-positive risk

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

- **Not definitive proof**: This is a probabilistic heuristic, not a trained ML model.
- **False positives**: Can incorrectly flag formal human writing as AI-like.
- **False negatives**: Sophisticated human writing or edited AI text may not be detected.
- **Short texts unreliable**: <300 words give low confidence scores.
- **No network checking**: Cannot detect if text was retrieved from remote APIs.
- **Limited language support**: Optimized for English; other languages may have higher error rates.

## For Production Use

For serious AI detection needs, consider:
- [OpenAI API](https://openai.com) moderation endpoint
- [Turnitin](https://www.turnitin.com)
- [GPTZero](https://gptzero.me)
- Trained ML models for your specific domain

## Technical Stack

- **Frontend**: React 18 + Vite
- **Runtime**: Pure JavaScript (no external ML libraries)
- **Deployment**: Surge (static hosting)

## License

MIT

---

**Questions or feedback?** Open an issue or reach out to the author.

