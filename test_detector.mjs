import { analyzeText } from './src/aiDetector.js'

// Test 1: Pure Human Writing (Should score LOW ~0.05-0.15)
const humanText = `
I just had the weirdest day at work. My boss asked me to rewrite the quarterly report, 
and honestly, I thought it was gonna be boring as hell. But then Sarah from marketing came by 
with this crazy idea about incorporating memes into our presentation. Yeah, memes! 
I was like "are you serious?" but it actually worked. Everyone laughed, the CEO smiled, 
and we got way more engagement than expected. Who would've thought, right?
`

// Test 2: Pure AI Writing (Should score HIGH with new algorithm ~0.50-0.80)
const aiText = `
It is important to note that the paradigm shift in contemporary discourse necessitates 
a nuanced and multifaceted approach. Furthermore, the convergence of technological innovation 
and organizational ecosystems catalyzes unprecedented opportunities for strategic leverage. 
Importantly, this nexus of factors underscores the quintessential imperative for stakeholders 
to delve deeper into the tapestry of market dynamics. Moreover, in conclusion, the juxtaposition 
of these holistic frameworks renders particularly salient the need for robust, scalable solutions 
that embody synergistic principles whilst maintaining granular oversight of operational efficacy.
`

// Test 3: Bible Excerpt (Should score LOW ~0.05-0.15, was HIGH before fix)
const bibleText = `
And the Lord said unto Moses, Go unto Pharaoh and say unto him, Thus saith the Lord God of the Hebrews, 
Let my people go, that they may serve me. For if thou refuse to let them go, behold, I will smite all 
thy borders with frogs. And the river shall bring forth frogs abundantly, which shall go up and come 
into thine house, and into thy bedchamber, and upon thy bed, and into the houses of thy servants, and 
upon thy people, and into thine ovens, and into thy kneadingtroughs. And the frogs shall come up both 
on thee, and upon thy people, and upon all thy servants.
`

// Test 4: Shakespeare Excerpt (Anaphora pattern, should be LOW ~0.05-0.15)
const shakespeareText = `
To be, or not to be, that is the question:
Whether 'tis nobler in the mind to suffer
The slings and arrows of outrageous fortune,
Or to take arms against a sea of troubles
And by opposing end them. To die—to sleep,
No more; and by a sleep to say we end
The heart-ache and the thousand natural shocks
That flesh is heir to: 'tis a consummation
Devoutly to be wish'd. To die, to sleep;
To sleep, perchance to dream—ay, there's the rub:
For in that sleep of death what dreams may come,
When we have shuffled off this mortal coil,
Must give us pause—there's the respect
That makes calamity of so long life.
`

// Test 5: Mixed (Should score MEDIUM ~0.30-0.45)
const mixedText = `
You know, I think it's important to note that technology has fundamentally transformed how we work. 
Like, honestly, five years ago I couldn't've imagined working from home full-time. But here we are! 
Furthermore, the ecosystem of remote tools has evolved significantly. Anyway, my boss said we need 
to leverage our cloud infrastructure more effectively. I get it, but the whole paradigm feels exhausting 
sometimes. Anyway, that's just my two cents.
`

console.log('========================================')
console.log('AI TEXT DETECTOR v2 - TEST SUITE')
console.log('Exponential Scaling + Archaic Bypass')
console.log('========================================\n')

const tests = [
  { name: 'PURE HUMAN TEXT', text: humanText, expect: 'Very Low (0.05-0.15)' },
  { name: 'PURE AI TEXT', text: aiText, expect: 'High (0.50-0.80)' },
  { name: 'BIBLE EXCERPT', text: bibleText, expect: 'Very Low (0.05-0.15) - Archaic Bypass' },
  { name: 'SHAKESPEARE', text: shakespeareText, expect: 'Very Low (0.05-0.15) - Anaphora Detected' },
  { name: 'MIXED TEXT', text: mixedText, expect: 'Medium (0.30-0.45)' }
]

tests.forEach((test, idx) => {
  console.log(`\n[TEST ${idx + 1}] ${test.name}`)
  console.log(`Expected: ${test.expect}`)
  console.log('-'.repeat(50))
  
  const result = analyzeText(test.text)
  
  console.log(`✓ Document Score: ${(result.documentScore * 100).toFixed(1)}%`)
  console.log(`✓ Confidence: ${result.confidenceLevel}`)
  console.log(`✓ Word Count: ${result._metadata.documentWordCount}`)
  
  if (result._metadata.tier1Count > 0) {
    console.log(`✓ Tier 1 Vocab: ${result._metadata.tier1Count} words`)
  }
  if (result._metadata.contractionCount > 0) {
    console.log(`✓ Contractions: ${result._metadata.contractionCount}`)
  }
  if (result._metadata.archaicCount > 0) {
    console.log(`✓ Archaic Words: ${result._metadata.archaicCount}`)
  }
  if (result._metadata.hasAnaphora) {
    console.log(`✓ Anaphora: DETECTED (literary pattern)`)
  }
  
  console.log(`✓ Heuristics: ${result._metadata.heuristicFlagsDetected.join(', ') || 'none'}`)
  
  if (result.globalFlags.length > 0) {
    console.log(`\nGlobal Flags:`)
    result.globalFlags.forEach(flag => {
      console.log(`  • ${flag}`)
    })
  }
})

console.log('\n' + '='.repeat(50))
console.log('TEST COMPLETE')
console.log('='.repeat(50) + '\n')
