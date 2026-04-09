import React, { useState } from 'react'
import detectAI from './aiDetector'

// Helper function: Return CSS risk class based on document score
function getRiskLevel(score) {
  if (score < 25) return 'low'
  if (score < 50) return 'medium'
  if (score < 75) return 'high'
  return 'very_high'
}

// Helper function: Get background color for segment based on AI score
function getSegmentBackground(score) {
  if (score < 25) return 'rgba(16, 185, 129, 0.08)' // Green (human)
  if (score < 50) return 'rgba(245, 158, 11, 0.08)' // Amber (mixed)
  if (score < 75) return 'rgba(239, 68, 68, 0.08)' // Red (AI)
  return 'rgba(220, 38, 38, 0.10)' // Dark red (very AI)
}

// Helper function: Get border color for segment
function getSegmentBorder(score) {
  if (score < 25) return 'rgba(16, 185, 129, 0.4)'
  if (score < 50) return 'rgba(245, 158, 11, 0.4)'
  if (score < 75) return 'rgba(239, 68, 68, 0.4)'
  return 'rgba(220, 38, 38, 0.5)'
}

// Helper function: Get text color for score badge
function getSegmentColor(score) {
  if (score < 25) return '#10b981'
  if (score < 50) return '#f59e0b'
  if (score < 75) return '#ef4444'
  return '#dc2626'
}

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
        <p>Paste text below and click "Analyze" to get a heuristic AI-likelihood score with segment-level heat-map highlighting.</p>
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
          <h2>
            AI Likelihood: <span className={`risk-${getRiskLevel(result.documentScore)}`}>
              {result.documentScore}%
            </span>
          </h2>
          <p style={{ marginTop: '4px', fontSize: '13px', color: 'rgba(230,238,248,0.7)' }}>
            Confidence: <strong>{result.confidenceLevel}</strong>
          </p>
          
          <div className="flags-section">
            <h4>🔍 Global Flags</h4>
            <ul className="flags-list">
              {result.globalFlags.map((flag, i) => (
                <li key={i}>{flag}</li>
              ))}
            </ul>
          </div>

          <div style={{ marginTop: '20px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              🎯 Segment-Level Heat Map
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {result.segments.map((segment, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '4px',
                    background: getSegmentBackground(segment.segmentScore),
                    border: `1px solid ${getSegmentBorder(segment.segmentScore)}`,
                    lineHeight: '1.5',
                    fontSize: '13px'
                  }}
                >
                  <span style={{ display: 'inline-block', marginRight: '8px', fontSize: '11px', fontWeight: 'bold', color: getSegmentColor(segment.segmentScore), opacity: 0.9 }}>
                    [{segment.segmentScore}%]
                  </span>
                  <span>{segment.text}</span>
                  {segment.flags.length > 0 && (
                    <div style={{ marginTop: '4px', fontSize: '11px', color: 'rgba(230,238,248,0.6)', fontStyle: 'italic' }}>
                      {segment.flags.join(' • ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <details style={{ marginTop: '16px' }}>
            <summary>📊 Metadata &amp; Interpretation</summary>
            <div className="metrics-grid">
              <div className="metric-card">
                <h4>Document Stats</h4>
                <ul>
                  <li>Total Words: <strong>{result._metadata.documentWordCount}</strong></li>
                  <li>Total Segments: <strong>{result._metadata.totalSegments}</strong></li>
                  <li>Mean Segment Score: <strong>{result._metadata.meanSegmentScore}%</strong></li>
                </ul>
              </div>

              <div className="metric-card">
                <h4>Macro-Level Features</h4>
                <ul>
                  <li>Sentence Burstiness: <strong>{result._metadata.burstinessScore}%</strong></li>
                  <li>Vocabulary Redundancy: <strong>{result._metadata.redundancyScore}%</strong></li>
                </ul>
              </div>

              <div className="metric-card">
                <h4>What These Mean</h4>
                <ul>
                  <li><strong>Burstiness:</strong> Low = AI (uniform); High = Human (varied)</li>
                  <li><strong>Redundancy:</strong> High = AI (repetitive); Low = Human</li>
                </ul>
              </div>

              <div className="metric-card">
                <h4>Score Interpretation</h4>
                <ul>
                  <li><strong>0-25%:</strong> Very likely human</li>
                  <li><strong>25-50%:</strong> Likely human</li>
                  <li><strong>50-75%:</strong> Likely AI</li>
                  <li><strong>75-100%:</strong> Very likely AI</li>
                </ul>
              </div>
            </div>
          </details>
        </section>
      )}
    </div>
  )
}
