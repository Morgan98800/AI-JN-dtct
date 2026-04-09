// Simple heuristic AI text detector
// Exports detectAI(text) => { score: 0-100, verdict: 'Likely human'|'Unclear'|'Likely AI', reasons:[] }

const AI_PHRASES = [
  'as an ai',
  'i am an ai',
  'i am a language model',
  'i do not have',
  "i'm an ai",
  'as a language model',
  'i do not have access',
]

const STOPWORDS = new Set([
  'the','be','to','of','and','a','in','that','have','i','it','for','not','on','with','he','as','you','do','at'
])

function entropy(text){
  if(!text || text.length===0) return 0
  const freq = {}
  for(const ch of text) freq[ch]=(freq[ch]||0)+1
  const len = text.length
  let e = 0
  for(const k in freq){
    const p = freq[k]/len
    e -= p * Math.log2(p)
  }
  // normalize by max possible entropy for seen alphabet
  return e
}

export function detectAI(input){
  const text = (input||'').trim()
  if(!text) return {score:0, verdict:'No text', reasons:[]}

  const lower = text.toLowerCase()
  const words = lower.split(/\s+/).filter(Boolean)
  const sentences = lower.split(/[.!?]+/).filter(s=>s.trim().length>0)
  const uniqueWords = new Set(words)

  const reasons = []

  // Strong indicator: explicit AI phrases
  let aiPhraseScore = 0
  for(const p of AI_PHRASES){
    if(lower.includes(p)){
      aiPhraseScore = 95
      reasons.push('Contains explicit AI-related phrasing')
      break
    }
  }

  // Repetitiveness: more repeated words -> modest AI signal
  const repetitiveness = words.length ? (1 - (uniqueWords.size / words.length)) : 0
  const repetScore = Math.min(40, repetitiveness * 100)
  if(repetitiveness > 0.25) reasons.push('Text shows measurable repetition')

  // Stopword ratio: humans often use more common filler words
  const stopCount = words.reduce((acc,w)=> acc + (STOPWORDS.has(w) ? 1 : 0), 0)
  const stopRatio = words.length ? stopCount / words.length : 0
  if(stopRatio < 0.15) reasons.push('Low usage of common stopwords (more formal wording)')

  // Entropy: low entropy can indicate repetitive/templated text
  const ent = entropy(lower)
  if(ent < 3.5) reasons.push('Low character-level entropy (repetitive or templated)')

  // Average sentence length
  const avgSentLen = sentences.length ? (words.length / sentences.length) : words.length
  if(avgSentLen > 30) reasons.push('Very long sentences (formal/AI-like)')

  // Compose final score
  // Start from phrase score (dominant) or combine heuristics otherwise
  let score = aiPhraseScore > 0 ? aiPhraseScore : 0
  if(aiPhraseScore === 0){
    // combine: repetScore (0-40), inverted stopRatio -> (0-30), entropy effect (0-20), sentence length (0-10)
    const stopScore = (1 - Math.min(1, stopRatio)) * 30
    const entScore = Math.max(0, (4.5 - ent)) / 1.5 * 20 // lower entropy -> higher score
    const sentScore = Math.min(10, Math.max(0, (avgSentLen - 15) / 15 * 10))
    score = repetScore + stopScore + entScore + sentScore
  }

  // clamp
  score = Math.max(0, Math.min(100, Math.round(score)))

  let verdict = 'Unclear'
  if(score >= 70) verdict = 'Likely AI'
  else if(score >= 40) verdict = 'Unclear'
  else verdict = 'Likely human'

  return { score, verdict, reasons }
}

export default detectAI
