# AI Text Detector

Simple React + Vite app that heuristically estimates whether a piece of text was produced by AI.

Quick start

1. Install dependencies

```bash
cd website\ for\ Jana
npm install
```

2. Run dev server

```bash
npm run dev
```

3. Open the address shown by Vite (usually http://localhost:5173)

Notes
- This uses a small heuristic detector in `src/aiDetector.js` and is not a definitive classifier.
- For production-ready detection consider remote APIs or trained models.
