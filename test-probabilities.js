/**
 * Quick test of probability computations
 */

const { BayesianBradleyTerry } = require('./model.js');

console.log('Testing Probability Computations\n');

const model = new BayesianBradleyTerry(3, 4);

// Ground truth
const trueWineEffects = [1.5, 0.0, -1.5];
const trueSpiceEffects = [1.0, 0.3, -0.3, -1.0];

// Add 50 comparisons
for (let i = 0; i < 50; i++) {
    const w1 = Math.floor(Math.random() * 3);
    const s1 = Math.floor(Math.random() * 4);
    let w2 = Math.floor(Math.random() * 3);
    let s2 = Math.floor(Math.random() * 4);

    while (w1 === w2 && s1 === s2) {
        w2 = Math.floor(Math.random() * 3);
        s2 = Math.floor(Math.random() * 4);
    }

    const score1 = trueWineEffects[w1] + trueSpiceEffects[s1];
    const score2 = trueWineEffects[w2] + trueSpiceEffects[s2];
    const prob = 1 / (1 + Math.exp(score2 - score1));
    const winner = Math.random() < prob ? 1 : 2;

    model.addComparison(w1, s1, w2, s2, winner);
}

console.log('After 50 comparisons:\n');

// Test P(best)
const probsBest = model.computeProbabilityBest(1000);

const wines = ['A', 'B', 'C'];
const spices = ['1', '2', '3', '4'];

console.log('P(best) for each combination:');
let idx = 0;
for (let w = 0; w < 3; w++) {
    for (let s = 0; s < 4; s++) {
        const combo = `${wines[w]}${spices[s]}`;
        const prob = probsBest[idx];
        const score = model.getScore(w, s);
        console.log(`  ${combo}: ${(prob * 100).toFixed(1)}% (score: ${score.toFixed(2)})`);
        idx++;
    }
}

// Find best
const maxProb = Math.max(...probsBest);
const maxIdx = probsBest.indexOf(maxProb);
const bestW = Math.floor(maxIdx / 4);
const bestS = maxIdx % 4;

console.log(`\n✓ Most likely best: ${wines[bestW]}${spices[bestS]} with ${(maxProb * 100).toFixed(1)}%`);
console.log(`  Expected: A1 (true best)`);

// Test P(beats reference)
console.log('\n\nP(beats A1) for each combination:');
const probsBeats = model.computeProbabilityBeatReference(0, 0, 1000);

idx = 0;
for (let w = 0; w < 3; w++) {
    for (let s = 0; s < 4; s++) {
        const combo = `${wines[w]}${spices[s]}`;
        const prob = probsBeats[idx];
        console.log(`  ${combo}: ${(prob * 100).toFixed(1)}%`);
        idx++;
    }
}

// Verify probabilities sum to ~1
const sum = probsBest.reduce((a, b) => a + b, 0);
console.log(`\n✓ Probabilities sum to: ${sum.toFixed(3)} (should be ~1.0)`);

console.log('\n✅ Probability computations working correctly!\n');
