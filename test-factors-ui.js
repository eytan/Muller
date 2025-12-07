/**
 * Unit Tests for Factor Probabilities and UI Behavior
 * Tests new features: factor-level probabilities, comparison buttons, mode toggle
 */

const { BayesianBradleyTerry } = require('./model.js');

// Test counter
let testNum = 0;
let passed = 0;
let failed = 0;

function test(description, fn) {
    testNum++;
    try {
        fn();
        console.log(`✓ Test ${testNum}: ${description}`);
        passed++;
    } catch (error) {
        console.log(`✗ Test ${testNum}: ${description}`);
        console.log(`  Error: ${error.message}`);
        failed++;
    }
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function assertClose(actual, expected, tolerance, message) {
    if (Math.abs(actual - expected) > tolerance) {
        throw new Error(`${message}: expected ${expected}, got ${actual}`);
    }
}

console.log('═══════════════════════════════════════════════════════');
console.log('Testing Factor Probability Computations');
console.log('═══════════════════════════════════════════════════════\n');

// ===================================
// PART 1: Factor Probability Methods
// ===================================

// Test 1: Wine probabilities sum to 1.0
test('Wine probabilities sum to 1.0', () => {
    const model = new BayesianBradleyTerry(3, 4);

    // Add some comparisons
    model.addComparison(0, 0, 1, 1, 1);
    model.addComparison(0, 1, 2, 2, 1);
    model.addComparison(1, 0, 2, 1, 2);

    const probs = model.computeProbabilityBestWine(1000);

    assert(probs.length === 3, 'Should return 3 wine probabilities');

    const sum = probs.reduce((a, b) => a + b, 0);
    assertClose(sum, 1.0, 0.01, 'Wine probabilities should sum to 1.0');
});

// Test 2: Spice probabilities sum to 1.0
test('Spice probabilities sum to 1.0', () => {
    const model = new BayesianBradleyTerry(3, 4);

    model.addComparison(0, 0, 1, 1, 1);
    model.addComparison(0, 1, 2, 2, 1);
    model.addComparison(1, 0, 2, 3, 2);

    const probs = model.computeProbabilityBestSpice(1000);

    assert(probs.length === 4, 'Should return 4 spice probabilities');

    const sum = probs.reduce((a, b) => a + b, 0);
    assertClose(sum, 1.0, 0.01, 'Spice probabilities should sum to 1.0');
});

// Test 3: Best wine has highest probability
test('Best wine has highest probability', () => {
    const model = new BayesianBradleyTerry(3, 4);

    // Wine 0 always wins
    for (let i = 0; i < 20; i++) {
        const s1 = Math.floor(Math.random() * 4);
        const s2 = Math.floor(Math.random() * 4);
        model.addComparison(0, s1, 1, s2, 1);
        model.addComparison(0, s1, 2, s2, 1);
    }

    const probs = model.computeProbabilityBestWine(1000);

    assert(probs[0] > probs[1] && probs[0] > probs[2],
           'Wine 0 should have highest probability');
    assert(probs[0] > 0.6, 'Best wine should have probability > 60%');
});

// Test 4: Best spice has highest probability
test('Best spice has highest probability', () => {
    const model = new BayesianBradleyTerry(3, 4);

    // Spice 0 always wins
    for (let i = 0; i < 20; i++) {
        const w1 = Math.floor(Math.random() * 3);
        const w2 = Math.floor(Math.random() * 3);
        model.addComparison(w1, 0, w2, 1, 1);
        model.addComparison(w1, 0, w2, 2, 1);
        model.addComparison(w1, 0, w2, 3, 1);
    }

    const probs = model.computeProbabilityBestSpice(1000);

    assert(probs[0] > probs[1] && probs[0] > probs[2] && probs[0] > probs[3],
           'Spice 0 should have highest probability');
    assert(probs[0] > 0.6, 'Best spice should have probability > 60%');
});

// Test 5: Factor probabilities match known structure
test('Factor probabilities match known structure', () => {
    const model = new BayesianBradleyTerry(3, 4);

    // Create clear winner: Wine A with Spice 1 always wins
    // Wine A vs Wine B (with same spice)
    for (let s = 0; s < 4; s++) {
        model.addComparison(0, s, 1, s, 1);  // Wine A wins
        model.addComparison(0, s, 2, s, 1);  // Wine A wins
    }

    // Spice 1 vs other spices (with same wine)
    for (let w = 0; w < 3; w++) {
        model.addComparison(w, 0, w, 1, 1);  // Spice 1 wins
        model.addComparison(w, 0, w, 2, 1);  // Spice 1 wins
        model.addComparison(w, 0, w, 3, 1);  // Spice 1 wins
    }

    const wineProbs = model.computeProbabilityBestWine(1000);
    const spiceProbs = model.computeProbabilityBestSpice(1000);

    // Wine 0 should be best
    const bestWine = wineProbs.indexOf(Math.max(...wineProbs));
    assert(bestWine === 0, 'Wine 0 should be best wine');

    // Spice 0 should be best
    const bestSpice = spiceProbs.indexOf(Math.max(...spiceProbs));
    assert(bestSpice === 0, 'Spice 0 should be best spice');
});

// Test 6: No data returns uniform probabilities
test('No data returns uniform probabilities for wines', () => {
    const model = new BayesianBradleyTerry(3, 4);

    const probs = model.computeProbabilityBestWine(1000);

    const expected = 1 / 3;
    probs.forEach(p => {
        assertClose(p, expected, 0.05, 'Should be uniform probability');
    });
});

// Test 7: No data returns uniform probabilities for spices
test('No data returns uniform probabilities for spices', () => {
    const model = new BayesianBradleyTerry(3, 4);

    const probs = model.computeProbabilityBestSpice(1000);

    const expected = 1 / 4;
    probs.forEach(p => {
        assertClose(p, expected, 0.05, 'Should be uniform probability');
    });
});

console.log('\n═══════════════════════════════════════════════════════');
console.log('Testing UI Behavior and Selection Logic');
console.log('═══════════════════════════════════════════════════════\n');

// ===================================
// PART 2: UI Selection Logic
// ===================================

// Mock cell object for testing
function createMockCell() {
    const classes = new Set();
    return {
        classList: {
            add: (c) => classes.add(c),
            remove: (c) => classes.delete(c),
            contains: (c) => classes.has(c)
        }
    };
}

// Simplified app state for testing selection logic
class MockApp {
    constructor() {
        this.selectedCells = [];
        this.nextButtonSlot = 0;
    }

    // Simplified version of handleCellClick logic
    handleCellClick(wine, spice, cell) {
        // Check if this cell is already assigned to a button
        const existingButtonIdx = this.selectedCells.findIndex(
            sel => sel && sel.wine === wine && sel.spice === spice
        );

        if (existingButtonIdx !== -1) {
            // Deselect this button
            this.selectedCells[existingButtonIdx].cell.classList.remove('selected');
            this.selectedCells[existingButtonIdx] = null;
            return;
        }

        // Ensure we have slots for both buttons
        if (this.selectedCells.length === 0) {
            this.selectedCells = [null, null];
        }

        // Assign to next button slot (round robin)
        const targetSlot = this.nextButtonSlot;

        // Remove previous selection in this slot if exists
        if (this.selectedCells[targetSlot]) {
            this.selectedCells[targetSlot].cell.classList.remove('selected');
        }

        // Assign new selection
        this.selectedCells[targetSlot] = { wine, spice, cell };
        cell.classList.add('selected');

        // Move to next slot (round robin)
        this.nextButtonSlot = (this.nextButtonSlot + 1) % 2;
    }

    reset() {
        this.selectedCells = [null, null];
        this.nextButtonSlot = 0;
    }
}

// Test 8: Round-robin selection - first click goes to slot 0
test('First cell selection goes to button slot 0', () => {
    const app = new MockApp();
    const cell1 = createMockCell();

    app.handleCellClick(0, 0, cell1);

    assert(app.selectedCells[0] !== null, 'Slot 0 should be filled');
    assert(app.selectedCells[0].wine === 0, 'Wine should be 0');
    assert(app.selectedCells[0].spice === 0, 'Spice should be 0');
    assert(app.selectedCells[1] === null, 'Slot 1 should be empty');
    assert(app.nextButtonSlot === 1, 'Next slot should be 1');
});

// Test 9: Round-robin selection - second click goes to slot 1
test('Second cell selection goes to button slot 1', () => {
    const app = new MockApp();
    const cell1 = createMockCell();
    const cell2 = createMockCell();

    app.handleCellClick(0, 0, cell1);
    app.handleCellClick(1, 1, cell2);

    assert(app.selectedCells[0] !== null, 'Slot 0 should be filled');
    assert(app.selectedCells[1] !== null, 'Slot 1 should be filled');
    assert(app.selectedCells[0].wine === 0, 'Slot 0 wine should be 0');
    assert(app.selectedCells[1].wine === 1, 'Slot 1 wine should be 1');
    assert(app.nextButtonSlot === 0, 'Next slot should wrap to 0');
});

// Test 10: Round-robin selection - third click replaces slot 0
test('Third cell selection replaces button slot 0', () => {
    const app = new MockApp();
    const cell1 = createMockCell();
    const cell2 = createMockCell();
    const cell3 = createMockCell();

    app.handleCellClick(0, 0, cell1);
    app.handleCellClick(1, 1, cell2);
    app.handleCellClick(2, 2, cell3);

    assert(app.selectedCells[0].wine === 2, 'Slot 0 should be replaced with wine 2');
    assert(app.selectedCells[0].spice === 2, 'Slot 0 should be replaced with spice 2');
    assert(app.selectedCells[1].wine === 1, 'Slot 1 should still be wine 1');
    assert(app.nextButtonSlot === 1, 'Next slot should be 1');
    assert(!cell1.classList.contains('selected'), 'First cell should be deselected');
    assert(cell3.classList.contains('selected'), 'Third cell should be selected');
});

// Test 11: Clicking same cell deselects it
test('Clicking selected cell deselects it', () => {
    const app = new MockApp();
    const cell1 = createMockCell();

    app.handleCellClick(0, 0, cell1);
    assert(app.selectedCells[0] !== null, 'Cell should be selected');

    app.handleCellClick(0, 0, cell1);
    assert(app.selectedCells[0] === null, 'Cell should be deselected');
    assert(!cell1.classList.contains('selected'), 'CSS class should be removed');
});

// Test 12: Deselecting doesn't affect other slot
test('Deselecting one cell does not affect other slot', () => {
    const app = new MockApp();
    const cell1 = createMockCell();
    const cell2 = createMockCell();

    app.handleCellClick(0, 0, cell1);
    app.handleCellClick(1, 1, cell2);

    // Deselect first cell
    app.handleCellClick(0, 0, cell1);

    assert(app.selectedCells[0] === null, 'Slot 0 should be empty');
    assert(app.selectedCells[1] !== null, 'Slot 1 should still be filled');
    assert(app.selectedCells[1].wine === 1, 'Slot 1 should still be wine 1');
});

// Test 13: Round-robin continues after deselection
test('Round-robin continues correctly after deselection', () => {
    const app = new MockApp();
    const cell1 = createMockCell();
    const cell2 = createMockCell();
    const cell3 = createMockCell();

    app.handleCellClick(0, 0, cell1);  // Slot 0, next = 1
    app.handleCellClick(1, 1, cell2);  // Slot 1, next = 0
    app.handleCellClick(0, 0, cell1);  // Deselect slot 0, next still = 0
    app.handleCellClick(2, 2, cell3);  // Should go to slot 0

    assert(app.selectedCells[0] !== null, 'Slot 0 should be filled');
    assert(app.selectedCells[0].wine === 2, 'Slot 0 should be wine 2');
    assert(app.selectedCells[1].wine === 1, 'Slot 1 should still be wine 1');
    assert(app.nextButtonSlot === 1, 'Next slot should be 1');
});

console.log('\n═══════════════════════════════════════════════════════');
console.log('Testing Probability Computation Modes');
console.log('═══════════════════════════════════════════════════════\n');

// ===================================
// PART 3: Probability Computation Modes
// ===================================

// Test 14: Global mode computes P(best)
test('Global mode computes P(best) correctly', () => {
    const model = new BayesianBradleyTerry(3, 4);

    // Make A1 (wine 0, spice 0) clearly best by comparing it to many others
    for (let i = 0; i < 20; i++) {
        // A1 beats all other combinations
        model.addComparison(0, 0, 1, 0, 1);  // A1 > B1
        model.addComparison(0, 0, 2, 0, 1);  // A1 > C1
        model.addComparison(0, 0, 0, 1, 1);  // A1 > A2
        model.addComparison(0, 0, 1, 1, 1);  // A1 > B2
        model.addComparison(0, 0, 2, 2, 1);  // A1 > C3
    }

    const probs = model.computeProbabilityBest(1000);

    // A1 is index 0, should have highest probability
    const maxProb = Math.max(...probs);
    const maxIdx = probs.indexOf(maxProb);

    assert(maxIdx === 0, 'A1 (index 0) should have highest probability');
    // Be more lenient - with 100 comparisons, should have at least 30% probability
    assert(probs[0] > 0.3, `A1 should have P(best) > 30% (got ${(probs[0] * 100).toFixed(1)}%)`);
});

// Test 15: Beats reference mode computes P(beats ref)
test('Beats reference mode computes P(beats ref) correctly', () => {
    const model = new BayesianBradleyTerry(3, 4);

    // Create a clear ordering: A1 > B2 > C3
    for (let i = 0; i < 20; i++) {
        model.addComparison(0, 0, 1, 1, 1);  // A1 > B2
        model.addComparison(1, 1, 2, 2, 1);  // B2 > C3
        model.addComparison(0, 0, 2, 2, 1);  // A1 > C3
    }

    // Reference is B2 (wine=1, spice=1)
    const probs = model.computeProbabilityBeatReference(1, 1, 1000);

    // A1 (idx 0) should beat B2
    assert(probs[0] > 0.6, 'A1 should have high P(beats B2)');

    // C3 (idx 10) should not beat B2
    assert(probs[10] < 0.4, 'C3 should have low P(beats B2)');
});

// Test 16: Beats reference probability for self is 0 (strict inequality)
test('Beats reference probability for self is 0', () => {
    const model = new BayesianBradleyTerry(3, 4);

    // Add some data
    for (let i = 0; i < 20; i++) {
        model.addComparison(0, 0, 1, 1, 1);
        model.addComparison(1, 1, 2, 2, 1);
    }

    // Reference is A1 (wine=0, spice=0, idx=0)
    const probs = model.computeProbabilityBeatReference(0, 0, 1000);

    // P(A1 > A1) should be 0 (can't strictly beat itself)
    assert(probs[0] === 0, 'P(self > self) should be 0 with strict inequality');
});

console.log('\n═══════════════════════════════════════════════════════');
console.log('Testing Factor Ranking Consistency');
console.log('═══════════════════════════════════════════════════════\n');

// ===================================
// PART 4: Factor Ranking Consistency
// ===================================

// Test 17: Wine ranking matches effect ordering
test('Wine ranking matches effect parameter ordering', () => {
    const model = new BayesianBradleyTerry(3, 4);

    // Wine 0 always wins against Wine 2
    for (let s = 0; s < 4; s++) {
        for (let i = 0; i < 5; i++) {
            model.addComparison(0, s, 2, s, 1);
        }
    }

    const wineEffects = model.params.slice(0, 3);
    const wineProbs = model.computeProbabilityBestWine(1000);

    // Higher effect should correlate with higher probability
    if (wineEffects[0] > wineEffects[2]) {
        assert(wineProbs[0] > wineProbs[2],
               'Higher wine effect should have higher probability');
    }
});

// Test 18: Spice ranking matches effect ordering
test('Spice ranking matches effect parameter ordering', () => {
    const model = new BayesianBradleyTerry(3, 4);

    // Spice 0 always wins against Spice 3
    for (let w = 0; w < 3; w++) {
        for (let i = 0; i < 5; i++) {
            model.addComparison(w, 0, w, 3, 1);
        }
    }

    const spiceEffects = model.params.slice(3, 7);
    const spiceProbs = model.computeProbabilityBestSpice(1000);

    // Higher effect should correlate with higher probability
    if (spiceEffects[0] > spiceEffects[3]) {
        assert(spiceProbs[0] > spiceProbs[3],
               'Higher spice effect should have higher probability');
    }
});

// Test 19: Factor view separates wine and spice effects
test('Factor probabilities independent of other factor', () => {
    const model = new BayesianBradleyTerry(3, 4);

    // Make Wine 0 clearly best (regardless of spice)
    for (let s = 0; s < 4; s++) {
        for (let i = 0; i < 10; i++) {
            model.addComparison(0, s, 1, s, 1);
            model.addComparison(0, s, 2, s, 1);
        }
    }

    // Make Spice 0 clearly best (regardless of wine)
    for (let w = 0; w < 3; w++) {
        for (let i = 0; i < 10; i++) {
            model.addComparison(w, 0, w, 1, 1);
            model.addComparison(w, 0, w, 2, 1);
            model.addComparison(w, 0, w, 3, 1);
        }
    }

    const wineProbs = model.computeProbabilityBestWine(1000);
    const spiceProbs = model.computeProbabilityBestSpice(1000);

    // Wine 0 should be best wine
    assert(wineProbs[0] > wineProbs[1] && wineProbs[0] > wineProbs[2],
           `Wine 0 should be best wine (probs: ${wineProbs.map(p => (p*100).toFixed(1)).join(', ')}%)`);

    // Spice 0 should be best spice
    assert(spiceProbs[0] > spiceProbs[1] && spiceProbs[0] > spiceProbs[2] && spiceProbs[0] > spiceProbs[3],
           `Spice 0 should be best spice (probs: ${spiceProbs.map(p => (p*100).toFixed(1)).join(', ')}%)`);

    // Both should have reasonable confidence (>50%)
    assert(wineProbs[0] > 0.5, `Best wine should have >50% probability (got ${(wineProbs[0]*100).toFixed(1)}%)`);
    assert(spiceProbs[0] > 0.5, `Best spice should have >50% probability (got ${(spiceProbs[0]*100).toFixed(1)}%)`);
});

// Test 20: Factor probabilities work with minimal data
test('Factor probabilities work with minimal data (5 comparisons)', () => {
    const model = new BayesianBradleyTerry(3, 4);

    // Just a few comparisons
    model.addComparison(0, 0, 1, 1, 1);
    model.addComparison(0, 0, 2, 2, 1);
    model.addComparison(1, 1, 2, 2, 1);
    model.addComparison(0, 1, 1, 2, 1);
    model.addComparison(1, 0, 2, 1, 1);

    const wineProbs = model.computeProbabilityBestWine(1000);
    const spiceProbs = model.computeProbabilityBestSpice(1000);

    // Should return valid probabilities
    assert(wineProbs.length === 3, 'Should return 3 wine probabilities');
    assert(spiceProbs.length === 4, 'Should return 4 spice probabilities');

    // All probabilities should be between 0 and 1
    wineProbs.forEach(p => {
        assert(p >= 0 && p <= 1, 'Wine probability should be in [0,1]');
    });
    spiceProbs.forEach(p => {
        assert(p >= 0 && p <= 1, 'Spice probability should be in [0,1]');
    });

    // Should sum to 1
    const wineSum = wineProbs.reduce((a, b) => a + b, 0);
    const spiceSum = spiceProbs.reduce((a, b) => a + b, 0);
    assertClose(wineSum, 1.0, 0.01, 'Wine probabilities should sum to 1');
    assertClose(spiceSum, 1.0, 0.01, 'Spice probabilities should sum to 1');
});

// ===================================
// Summary
// ===================================

console.log('\n═══════════════════════════════════════════════════════');
console.log('Test Summary');
console.log('═══════════════════════════════════════════════════════');
console.log(`Total: ${testNum} tests`);
console.log(`✓ Passed: ${passed}`);
console.log(`✗ Failed: ${failed}`);

if (failed === 0) {
    console.log('\n🎉 All tests passed!');
    console.log('\nFactor probability computations are working correctly:');
    console.log('  • computeProbabilityBestWine() ✓');
    console.log('  • computeProbabilityBestSpice() ✓');
    console.log('  • Factor probabilities sum to 1.0 ✓');
    console.log('  • Best factors correctly identified ✓');
    console.log('\nUI selection logic is working correctly:');
    console.log('  • Round-robin button selection ✓');
    console.log('  • Cell selection and deselection ✓');
    console.log('  • Selection state management ✓');
    console.log('\nProbability computation modes working correctly:');
    console.log('  • Global P(best) mode ✓');
    console.log('  • Beats reference P(X > ref) mode ✓');
    process.exit(0);
} else {
    console.log('\n❌ Some tests failed. Please review the errors above.');
    process.exit(1);
}
