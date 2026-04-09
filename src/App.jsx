import React, { useState } from 'react'
import detectAI from './aiDetector'

export default function App(){
  const [text, setText] = useState('')
  const [result, setResult] = useState(null)

  function runDetect(){
    const r = detectAI(text)
    setResult(r)
  }

  return (
    <div className="container">
      <header>
        <h1>AI Text Detector</h1>
        <p>Paste text below and click "Analyze" to get a heuristic AI-likelihood score.</p>
      </header>

      <textarea
        placeholder="Paste or type text to analyze..."
        value={text}
        onChange={(e)=>setText(e.target.value)}
      />

      <div className="controls">
        <button onClick={runDetect}>Analyze</button>
        <button onClick={() => { setText(''); setResult(null) }}>Clear</button>
      </div>

      {result && (
        <section className="result">
          <h2>Risk Level: <span className={`risk-${result.riskLevel}`}>{result.riskLevel.toUpperCase()}</span></h2>
          <div className="score">
            <strong>{result.score}%</strong> AI likelihood
          </div>
          
          <div className="flags-section">
            <h4>⚡ Analysis Flags</h4>
            <ul className="flags-list">
              {result.flags.map((flag, i) => (
                <li key={i}>{flag}</li>
              ))}
            </ul>
          </div>

          <details>
            <summary>📊 Detailed Metrics</summary>
            
            <div className="metrics-grid">
              <div className="metric-card">
                <h4>Text Structure</h4>
                <ul>
                  <li>Words: <strong>{result.metrics.wordCount}</strong></li>
                  <li>Sentences: <strong>{result.metrics.sentenceCount}</strong></li>
                  <li>Paragraphs: <strong>{result.metrics.paragraphCount}</strong></li>
                  <li>Avg. Sentence Length: <strong>{result.metrics.avgSentenceLength}</strong> words</li>
                </ul>
              </div>

              <div className="metric-card">
                <h4>Pattern Analysis</h4>
                <ul>
                  <li>Burstiness (Variance): <strong>{result.metrics.burstinessScore}</strong></li>
                  <li>Lexical Diversity: <strong>{Math.round(result.metrics.lexicalDiversity * 100)}%</strong></li>
                </ul>
              </div>

              <div className="metric-card">
                <h4>AI Tier Scores</h4>
                <ul>
                  <li>Tier 1 Vocab: <strong>{Math.round(result.metrics.tier1VocabScore * 100)}%</strong></li>
                  <li>Tier 2 Connectors: <strong>{Math.round(result.metrics.tier2ConnectorScore * 100)}%</strong></li>
                  <li>Tier 3 Hedges: <strong>{Math.round(result.metrics.tier3HedgeScore * 100)}%</strong></li>
                </ul>
              </div>

              <div className="metric-card">
                <h4>Human Signals</h4>
                <ul>
                  <li>Contractions: <strong>{result.metrics.contractionCount}</strong></li>
                  <li>Slang Words: <strong>{result.metrics.slangWordsDetected.length}</strong></li>
                  <li>Concrete Details: <strong>{result.metrics.concreteDetails.total}</strong></li>
                </ul>
              </div>
            </div>
          </details>
        </section>
      )}
    </div>
  )
}
