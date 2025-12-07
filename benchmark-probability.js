/**
 * Benchmark probability computation performance
 */

const { BayesianBradleyTerry } = require('./model.js');

// Create a model with some data
const model = new BayesianBradleyTerry(3, 4);

// Add some comparisons
const trueWineEffects = [1.5, 0.0, -1.5];
const trueSpiceEffects = [1.0, 0.3, -0.3, -1.0];

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

console.log('Benchmarking Probability Computation\n');
console.log('Model has 50 comparisons, 7 parameters, 12 combinations\n');

// Test different sample sizes
const sampleSizes = [100, 500, 1000, 2000, 5000];

for (const numSamples of sampleSizes) {
    const start = Date.now();
    const probs = model.computeProbabilityBest(numSamples);
    const elapsed = Date.now() - start;

    // Find combination with max probability
    const maxProb = Math.max(...probs);
    const maxIdx = probs.indexOf(maxProb);
    const wine = Math.floor(maxIdx / 4);
    const spice = maxIdx % 4;
    const wines = ['A', 'B', 'C'];
    const spices = ['1', '2', '3', '4'];

    console.log(`${numSamples} samples:`);
    console.log(`  Time: ${elapsed}ms`);
    console.log(`  Best: ${wines[wine]}${spices[spice]} (P=${(maxProb * 100).toFixed(1)}%)`);
    console.log(`  Throughput: ${(numSamples / elapsed * 1000).toFixed(0)} samples/sec\n`);
}

// Test beat reference
console.log('Testing P(beats reference) computation:\n');
const start = Date.now();
const beatProbs = model.computeProbabilityBeatReference(0, 0, 1000);
const elapsed = Date.now() - start;
console.log(`1000 samples: ${elapsed}ms\n`);

// Recommendation
console.log('Recommendation:');
if (sampleSizes.some(n => n === 1000)) {
    const idx = sampleSizes.indexOf(1000);
    console.log(`  Use 1000 samples for good balance of speed and accuracy`);
    console.log(`  Expected latency: ~${elapsed}ms per update (acceptable for UI)`);
}
