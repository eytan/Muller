/**
 * Unit Tests for Bayesian Bradley-Terry Model
 * Tests the inference engine's ability to recover true rankings
 */

// Import the model (for Node.js environment)
const { BayesianBradleyTerry } = require('./model.js');

// Test framework
class TestRunner {
    constructor() {
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
    }

    test(name, fn) {
        this.tests.push({ name, fn });
    }

    async run() {
        console.log('\n🧪 Running Bayesian Bradley-Terry Tests\n');
        console.log('='.repeat(60));

        for (const { name, fn } of this.tests) {
            try {
                await fn();
                this.passed++;
                console.log(`✅ ${name}`);
            } catch (error) {
                this.failed++;
                console.log(`❌ ${name}`);
                console.log(`   Error: ${error.message}`);
                if (error.stack) {
                    console.log(`   ${error.stack.split('\n').slice(1, 3).join('\n   ')}`);
                }
            }
        }

        console.log('='.repeat(60));
        console.log(`\nResults: ${this.passed} passed, ${this.failed} failed`);
        console.log(`Total: ${this.tests.length} tests\n`);

        return this.failed === 0;
    }
}

// Assertion helpers
function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

function assertAlmostEqual(a, b, tolerance = 0.1, message) {
    if (Math.abs(a - b) > tolerance) {
        throw new Error(message || `Expected ${a} to be close to ${b} (tolerance: ${tolerance}), diff: ${Math.abs(a - b)}`);
    }
}

function assertArrayAlmostEqual(arr1, arr2, tolerance = 0.1) {
    assert(arr1.length === arr2.length, `Array lengths differ: ${arr1.length} vs ${arr2.length}`);
    for (let i = 0; i < arr1.length; i++) {
        assertAlmostEqual(arr1[i], arr2[i], tolerance, `Arrays differ at index ${i}: ${arr1[i]} vs ${arr2[i]}`);
    }
}

// Simulation helper: generate comparison from ground truth
function simulateComparison(model, trueWineEffects, trueSpiceEffects, numComparisons = 100) {
    const numWines = trueWineEffects.length;
    const numSpices = trueSpiceEffects.length;

    for (let i = 0; i < numComparisons; i++) {
        // Randomly select two different combinations
        const wine1 = Math.floor(Math.random() * numWines);
        const spice1 = Math.floor(Math.random() * numSpices);
        let wine2 = Math.floor(Math.random() * numWines);
        let spice2 = Math.floor(Math.random() * numSpices);

        // Ensure different combinations
        while (wine1 === wine2 && spice1 === spice2) {
            wine2 = Math.floor(Math.random() * numWines);
            spice2 = Math.floor(Math.random() * numSpices);
        }

        // Compute true scores
        const trueScore1 = trueWineEffects[wine1] + trueSpiceEffects[spice1];
        const trueScore2 = trueWineEffects[wine2] + trueSpiceEffects[spice2];

        // Generate outcome based on Bradley-Terry model (with some noise)
        const prob = 1 / (1 + Math.exp(trueScore2 - trueScore1));
        const winner = Math.random() < prob ? 1 : 2;

        model.addComparison(wine1, spice1, wine2, spice2, winner);
    }
}

// Compute ranking correlation (Spearman's rank correlation)
function computeRankCorrelation(true_scores, estimated_scores) {
    const n = true_scores.length;

    // Get ranks
    const getRanks = (arr) => {
        const indexed = arr.map((val, idx) => ({ val, idx }));
        indexed.sort((a, b) => b.val - a.val);
        const ranks = new Array(n);
        indexed.forEach((item, rank) => {
            ranks[item.idx] = rank;
        });
        return ranks;
    };

    const trueRanks = getRanks(true_scores);
    const estRanks = getRanks(estimated_scores);

    // Compute Spearman correlation
    let sumSqDiff = 0;
    for (let i = 0; i < n; i++) {
        sumSqDiff += (trueRanks[i] - estRanks[i]) ** 2;
    }

    return 1 - (6 * sumSqDiff) / (n * (n ** 2 - 1));
}

// Initialize test runner
const runner = new TestRunner();

// Test 1: Basic initialization
runner.test('Model initializes with correct dimensions', () => {
    const model = new BayesianBradleyTerry(3, 4);
    assert(model.numWines === 3, 'Should have 3 wines');
    assert(model.numSpices === 4, 'Should have 4 spices');
    assert(model.numParams === 7, 'Should have 7 parameters total');
    assert(model.params.length === 7, 'Params array should have 7 elements');
    assert(model.comparisons.length === 0, 'Should start with no comparisons');
});

// Test 2: Initial scores are zero
runner.test('Initial scores are zero', () => {
    const model = new BayesianBradleyTerry(3, 4);
    for (let w = 0; w < 3; w++) {
        for (let s = 0; s < 4; s++) {
            assert(model.getScore(w, s) === 0, `Score for (${w}, ${s}) should be 0`);
        }
    }
});

// Test 3: Single comparison updates scores
runner.test('Single comparison updates scores', () => {
    const model = new BayesianBradleyTerry(3, 4);

    // Wine 0, Spice 0 beats Wine 1, Spice 1
    model.addComparison(0, 0, 1, 1, 1);

    const score00 = model.getScore(0, 0);
    const score11 = model.getScore(1, 1);

    assert(score00 > score11, 'Winner should have higher score than loser');
});

// Test 4: Recover simple wine preferences
runner.test('Recovers simple wine preferences (one wine clearly better)', () => {
    const model = new BayesianBradleyTerry(3, 4);

    // Ground truth: Wine 0 is much better than others, spices are equal
    const trueWineEffects = [2.0, 0.0, -2.0];
    const trueSpiceEffects = [0.0, 0.0, 0.0, 0.0];

    simulateComparison(model, trueWineEffects, trueSpiceEffects, 100);

    // Check wine effects ordering
    const wine0Effect = model.params[0];
    const wine1Effect = model.params[1];
    const wine2Effect = model.params[2];

    assert(wine0Effect > wine1Effect, 'Wine 0 should be better than Wine 1');
    assert(wine1Effect > wine2Effect, 'Wine 1 should be better than Wine 2');

    // Check relative differences (what actually matters for predictions)
    const diff1 = wine0Effect - wine1Effect;
    const diff2 = wine1Effect - wine2Effect;

    // Differences should be substantial and in the right direction
    assert(diff1 > 1.0, `Wine 0-1 difference should be large (got ${diff1.toFixed(2)})`);
    assert(diff2 > 1.0, `Wine 1-2 difference should be large (got ${diff2.toFixed(2)})`);
});

// Test 5: Recover simple spice preferences
runner.test('Recovers simple spice preferences (one spice clearly better)', () => {
    const model = new BayesianBradleyTerry(3, 4);

    // Ground truth: Wines are equal, Spice 3 is much better
    const trueWineEffects = [0.0, 0.0, 0.0];
    const trueSpiceEffects = [0.0, 0.0, 0.0, 2.0];

    simulateComparison(model, trueWineEffects, trueSpiceEffects, 100);

    // Check spice effects ordering
    const spice3Effect = model.params[3 + 3]; // spice effects start at index 3
    const spice0Effect = model.params[3 + 0];

    assert(spice3Effect > spice0Effect, 'Spice 3 should be better than Spice 0');
    assertAlmostEqual(spice3Effect, 2.0, 0.5, 'Spice 3 effect should be close to 2.0');
});

// Test 6: Recover complex preferences
runner.test('Recovers complex wine and spice preferences', () => {
    const model = new BayesianBradleyTerry(3, 4);

    // Ground truth with variation in both wines and spices
    const trueWineEffects = [1.5, 0.0, -1.5];
    const trueSpiceEffects = [1.0, 0.5, -0.5, -1.0];

    simulateComparison(model, trueWineEffects, trueSpiceEffects, 400);

    // Compute correlation between true and estimated effects
    const estWineEffects = model.params.slice(0, 3);
    const estSpiceEffects = model.params.slice(3, 7);

    const wineCorr = computeRankCorrelation(trueWineEffects, estWineEffects);
    const spiceCorr = computeRankCorrelation(trueSpiceEffects, estSpiceEffects);

    assert(wineCorr >= 0.8, `Wine rank correlation should be high (got ${wineCorr.toFixed(3)})`);
    assert(spiceCorr >= 0.6, `Spice rank correlation should be reasonable (got ${spiceCorr.toFixed(3)})`);
});

// Test 7: Ranking recovery with many comparisons
runner.test('Accurate ranking recovery with sufficient data', () => {
    const model = new BayesianBradleyTerry(3, 4);

    const trueWineEffects = [1.0, 0.0, -1.0];
    const trueSpiceEffects = [0.8, 0.3, -0.3, -0.8];

    // Simulate many comparisons
    simulateComparison(model, trueWineEffects, trueSpiceEffects, 500);

    // Get all combination scores
    const trueScores = [];
    const estScores = [];

    for (let w = 0; w < 3; w++) {
        for (let s = 0; s < 4; s++) {
            trueScores.push(trueWineEffects[w] + trueSpiceEffects[s]);
            estScores.push(model.getScore(w, s));
        }
    }

    const correlation = computeRankCorrelation(trueScores, estScores);
    assert(correlation > 0.9, `Should have very high correlation with many comparisons (got ${correlation.toFixed(3)})`);
});

// Test 8: Uncertainty decreases with more data
runner.test('Uncertainty decreases with more comparisons', () => {
    const model = new BayesianBradleyTerry(3, 4);

    const trueWineEffects = [1.0, 0.0, -1.0];
    const trueSpiceEffects = [0.5, 0.0, 0.0, -0.5];

    // Initial uncertainty
    const initialUncertainty = model.getUncertainty(0, 0);

    // Add some comparisons
    simulateComparison(model, trueWineEffects, trueSpiceEffects, 50);
    const midUncertainty = model.getUncertainty(0, 0);

    // Add many more comparisons
    simulateComparison(model, trueWineEffects, trueSpiceEffects, 200);
    const finalUncertainty = model.getUncertainty(0, 0);

    assert(midUncertainty < initialUncertainty, 'Uncertainty should decrease after some data');
    assert(finalUncertainty < midUncertainty, 'Uncertainty should continue decreasing with more data');
});

// Test 9: Leaderboard ordering
runner.test('Leaderboard correctly orders combinations', () => {
    const model = new BayesianBradleyTerry(3, 4);

    // Make Wine 0 + Spice 0 clearly the best
    const trueWineEffects = [2.0, 0.0, -2.0];
    const trueSpiceEffects = [1.5, 0.0, -1.0, -1.5];

    simulateComparison(model, trueWineEffects, trueSpiceEffects, 300);

    const ranking = model.getRanking();

    // Best should be Wine 0 + Spice 0 (score = 2.0 + 1.5 = 3.5)
    assert(ranking[0].wine === 0 && ranking[0].spice === 0,
           'Best combination should be Wine 0 + Spice 0');

    // Worst should be Wine 2 + Spice 3 (score = -2.0 + -1.5 = -3.5)
    // But with noise, it might be close to other low-scoring combinations
    // Just check it's in bottom 3
    const lastIdx = ranking.length - 1;
    const worstCombo = ranking.slice(-3).some(r => r.wine === 2 && r.spice === 3);
    assert(worstCombo, 'Wine 2 + Spice 3 should be in bottom 3');

    // Scores should be in descending order
    for (let i = 0; i < ranking.length - 1; i++) {
        assert(ranking[i].score >= ranking[i + 1].score,
               `Ranking should be in descending order at position ${i}`);
    }
});

// Test 10: Reset functionality
runner.test('Reset clears all data', () => {
    const model = new BayesianBradleyTerry(3, 4);

    // Add some comparisons
    model.addComparison(0, 0, 1, 1, 1);
    model.addComparison(0, 1, 2, 2, 1);

    assert(model.comparisons.length > 0, 'Should have comparisons before reset');

    // Reset
    model.reset();

    assert(model.comparisons.length === 0, 'Should have no comparisons after reset');
    assert(model.params.every(p => p === 0), 'All parameters should be zero after reset');

    for (let w = 0; w < 3; w++) {
        for (let s = 0; s < 4; s++) {
            assert(model.getScore(w, s) === 0, `Score for (${w}, ${s}) should be 0 after reset`);
        }
    }
});

// Test 11: Handles contradictory comparisons
runner.test('Handles contradictory comparisons gracefully', () => {
    const model = new BayesianBradleyTerry(3, 4);

    // Add contradictory comparisons
    model.addComparison(0, 0, 1, 1, 1); // (0,0) beats (1,1)
    model.addComparison(1, 1, 0, 0, 1); // (1,1) beats (0,0)

    // Should still produce valid scores
    const score00 = model.getScore(0, 0);
    const score11 = model.getScore(1, 1);

    assert(!isNaN(score00), 'Scores should be valid numbers');
    assert(!isNaN(score11), 'Scores should be valid numbers');
    assert(isFinite(score00), 'Scores should be finite');
    assert(isFinite(score11), 'Scores should be finite');

    // With contradictory evidence, scores should be similar
    assertAlmostEqual(score00, score11, 0.5, 'Contradictory comparisons should lead to similar scores');
});

// Test 12: Factorial structure efficiency
runner.test('Factorial structure learns efficiently', () => {
    const model = new BayesianBradleyTerry(3, 4);

    // Ground truth
    const trueWineEffects = [1.0, 0.0, -1.0];
    const trueSpiceEffects = [0.8, 0.0, -0.4, -0.8];

    // With factorial structure, should learn well with fewer comparisons
    simulateComparison(model, trueWineEffects, trueSpiceEffects, 50);

    const estWineEffects = model.params.slice(0, 3);
    const estSpiceEffects = model.params.slice(3, 7);

    const wineCorr = computeRankCorrelation(trueWineEffects, estWineEffects);
    const spiceCorr = computeRankCorrelation(trueSpiceEffects, estSpiceEffects);

    // Should get decent correlation even with limited data
    assert(wineCorr > 0.7, `Should learn wine rankings with limited data (got ${wineCorr.toFixed(3)})`);
    assert(spiceCorr > 0.7, `Should learn spice rankings with limited data (got ${spiceCorr.toFixed(3)})`);
});

// Test 13: Numerical stability
runner.test('Maintains numerical stability with extreme scores', () => {
    const model = new BayesianBradleyTerry(3, 4);

    // Create very clear preferences
    const trueWineEffects = [5.0, 0.0, -5.0];
    const trueSpiceEffects = [3.0, 0.0, 0.0, -3.0];

    simulateComparison(model, trueWineEffects, trueSpiceEffects, 100);

    // All parameters should be finite and non-NaN
    for (let i = 0; i < model.numParams; i++) {
        assert(isFinite(model.params[i]), `Parameter ${i} should be finite`);
        assert(!isNaN(model.params[i]), `Parameter ${i} should not be NaN`);
    }

    // All scores should be finite
    for (let w = 0; w < 3; w++) {
        for (let s = 0; s < 4; s++) {
            const score = model.getScore(w, s);
            assert(isFinite(score), `Score for (${w}, ${s}) should be finite`);
            assert(!isNaN(score), `Score for (${w}, ${s}) should not be NaN`);
        }
    }
});

// Test 14: Convergence test
runner.test('Gradient descent converges', () => {
    const model = new BayesianBradleyTerry(3, 4);

    const trueWineEffects = [1.0, 0.0, -1.0];
    const trueSpiceEffects = [0.5, 0.0, 0.0, -0.5];

    // Add comparisons
    simulateComparison(model, trueWineEffects, trueSpiceEffects, 100);

    // Compute gradient at solution
    const grad = model.computeGradient();
    const maxGrad = Math.max(...grad.map(Math.abs));

    // Gradient should be small at convergence
    assert(maxGrad < 0.01, `Gradient should be small at convergence (got ${maxGrad.toFixed(6)})`);
});

// Test 15: Parameter estimation accuracy
runner.test('Parameter estimates capture relative ordering with sufficient data', () => {
    const model = new BayesianBradleyTerry(3, 4);

    const trueWineEffects = [1.0, 0.0, -1.0];
    const trueSpiceEffects = [0.8, 0.3, -0.3, -0.8];

    // Lots of data for accurate estimation
    simulateComparison(model, trueWineEffects, trueSpiceEffects, 800);

    const estWineEffects = model.params.slice(0, 3);
    const estSpiceEffects = model.params.slice(3, 7);

    // Check rank correlation (what matters for predictions)
    const wineCorr = computeRankCorrelation(trueWineEffects, estWineEffects);
    const spiceCorr = computeRankCorrelation(trueSpiceEffects, estSpiceEffects);

    assert(wineCorr >= 0.8, `Wine parameters should be highly correlated with truth (got ${wineCorr.toFixed(3)})`);
    assert(spiceCorr >= 0.6, `Spice parameters should correlate with truth (got ${spiceCorr.toFixed(3)})`);

    // Check that relative differences are preserved for wines (clearer signal)
    const trueDiff = trueWineEffects[0] - trueWineEffects[2]; // Should be 2.0
    const estDiff = estWineEffects[0] - estWineEffects[2];

    assertAlmostEqual(estDiff, trueDiff, 0.7, 'Relative wine differences should be preserved');
});

// Run all tests
runner.run().then(success => {
    process.exit(success ? 0 : 1);
});
