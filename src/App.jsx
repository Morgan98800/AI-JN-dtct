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
          <h2>Result: {result.verdict}</h2>
          <div className="score">Score: <strong>{result.score}%</strong></div>
          {result.reasons && result.reasons.length>0 && (
            <ul>
              {result.reasons.map((r,i)=>(<li key={i}>{r}</li>))}
            </ul>
          )}
          <p className="note">Note: This is a simple heuristic detector and not definitive.</p>
        </section>
      )}
    </div>
  )
}
