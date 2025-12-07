/**
 * Interactive Wine Bandit Demo
 * Try the Bayesian Bradley-Terry model in your terminal!
 */

const readline = require('readline');
const { BayesianBradleyTerry } = require('./model.js');

const WINES = ['A', 'B', 'C'];
const SPICES = ['1', '2', '3', '4'];

// Ground truth (hidden from user) - you'll discover these through comparisons!
const TRUE_WINE_EFFECTS = [1.5, 0.0, -1.5];  // A is best, C is worst
const TRUE_SPICE_EFFECTS = [1.0, 0.3, -0.3, -1.0];  // 1 is best, 4 is worst

const model = new BayesianBradleyTerry(3, 4);
let comparisonCount = 0;

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function clearScreen() {
    console.log('\x1Bc');
}

function displayGrid() {
    console.log('\n📊 Current Rankings (Score ± Uncertainty)\n');
    console.log('     ' + SPICES.map(s => `Spice ${s}`.padEnd(15)).join(''));
    console.log('     ' + '─'.repeat(60));

    for (let w = 0; w < 3; w++) {
        let row = `Wine ${WINES[w]} `;
        for (let s = 0; s < 4; s++) {
            const score = model.getScore(w, s);
            const unc = model.getUncertainty(w, s);
            const label = `${WINES[w]}${SPICES[s]}`;
            const scoreStr = `${score.toFixed(1)}±${unc.toFixed(1)}`;
            row += `${label}:${scoreStr}`.padEnd(15);
        }
        console.log(row);
    }
}

function displayLeaderboard() {
    const ranking = model.getRanking();

    console.log('\n🏆 Top 5 Leaderboard:');
    console.log('─'.repeat(50));

    for (let i = 0; i < 5; i++) {
        const r = ranking[i];
        const combo = `${WINES[r.wine]}${SPICES[r.spice]}`;
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  ';
        console.log(`${medal} ${(i + 1)}.`.padEnd(6) +
                    `${combo.padEnd(6)} Score: ${r.score.toFixed(2).padStart(6)}  ` +
                    `Uncertainty: ±${r.uncertainty.toFixed(2)}`);
    }

    console.log('\n💡 Bottom 3:');
    for (let i = 9; i < 12; i++) {
        const r = ranking[i];
        const combo = `${WINES[r.wine]}${SPICES[r.spice]}`;
        console.log(`   ${(i + 1)}.`.padEnd(6) +
                    `${combo.padEnd(6)} Score: ${r.score.toFixed(2).padStart(6)}  ` +
                    `Uncertainty: ±${r.uncertainty.toFixed(2)}`);
    }
}

function simulateComparison(wine1, spice1, wine2, spice2) {
    const score1 = TRUE_WINE_EFFECTS[wine1] + TRUE_SPICE_EFFECTS[spice1];
    const score2 = TRUE_WINE_EFFECTS[wine2] + TRUE_SPICE_EFFECTS[spice2];

    // Bradley-Terry: probability that 1 beats 2
    const prob = 1 / (1 + Math.exp(score2 - score1));
    const winner = Math.random() < prob ? 1 : 2;

    return winner;
}

function displayComparison(combo1, combo2, winner) {
    console.log('\n🍷 Comparison:');
    console.log('─'.repeat(50));
    console.log(`  Left:  ${combo1}`);
    console.log(`  Right: ${combo2}`);
    console.log(`\n  Winner: ${winner === 1 ? combo1 + ' 🏆' : combo2 + ' 🏆'}`);
    console.log('─'.repeat(50));
}

function getPerformanceMessage() {
    if (comparisonCount < 10) {
        return '🔍 Keep exploring! Need more data for reliable rankings.';
    } else if (comparisonCount < 30) {
        return '📈 Getting better! Clear patterns emerging.';
    } else if (comparisonCount < 60) {
        return '✅ Good coverage! Rankings becoming reliable.';
    } else {
        return '🎯 Excellent! High-confidence rankings achieved.';
    }
}

async function askQuestion(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

function parseInput(input) {
    input = input.toUpperCase().trim();

    // Check for commands
    if (input === 'Q' || input === 'QUIT') return { type: 'quit' };
    if (input === 'H' || input === 'HELP') return { type: 'help' };
    if (input === 'S' || input === 'STATS') return { type: 'stats' };
    if (input === 'R' || input === 'RANDOM') return { type: 'random' };

    // Parse combination (e.g., "A1" or "B3")
    if (input.length === 2) {
        const wine = WINES.indexOf(input[0]);
        const spice = SPICES.indexOf(input[1]);

        if (wine !== -1 && spice !== -1) {
            return { type: 'combo', wine, spice };
        }
    }

    return { type: 'invalid' };
}

function displayHelp() {
    console.log('\n📚 Commands:');
    console.log('  • Enter combinations like: A1, B3, C2');
    console.log('  • R - Make a random comparison');
    console.log('  • S - Show detailed statistics');
    console.log('  • H - Show this help');
    console.log('  • Q - Quit');
}

function displayStats() {
    console.log('\n📊 Detailed Statistics:');
    console.log('─'.repeat(60));

    console.log('\n🍷 Wine Rankings:');
    const wineEffects = model.params.slice(0, 3).map((val, idx) => ({
        wine: WINES[idx],
        effect: val,
        unc: model.uncertainties[idx]
    }));
    wineEffects.sort((a, b) => b.effect - a.effect);

    wineEffects.forEach((w, i) => {
        console.log(`  ${i + 1}. Wine ${w.wine}: ${w.effect.toFixed(2)} ± ${w.unc.toFixed(2)}`);
    });

    console.log('\n🌿 Spice Rankings:');
    const spiceEffects = model.params.slice(3, 7).map((val, idx) => ({
        spice: SPICES[idx],
        effect: val,
        unc: model.uncertainties[3 + idx]
    }));
    spiceEffects.sort((a, b) => b.effect - a.effect);

    spiceEffects.forEach((s, i) => {
        console.log(`  ${i + 1}. Spice ${s.spice}: ${s.effect.toFixed(2)} ± ${s.unc.toFixed(2)}`);
    });

    console.log(`\n💡 ${getPerformanceMessage()}`);
}

async function makeRandomComparison() {
    const wine1 = Math.floor(Math.random() * 3);
    const spice1 = Math.floor(Math.random() * 4);
    let wine2 = Math.floor(Math.random() * 3);
    let spice2 = Math.floor(Math.random() * 4);

    // Ensure different combinations
    while (wine1 === wine2 && spice1 === spice2) {
        wine2 = Math.floor(Math.random() * 3);
        spice2 = Math.floor(Math.random() * 4);
    }

    const combo1 = `${WINES[wine1]}${SPICES[spice1]}`;
    const combo2 = `${WINES[wine2]}${SPICES[spice2]}`;

    const winner = simulateComparison(wine1, spice1, wine2, spice2);

    displayComparison(combo1, combo2, winner);
    model.addComparison(wine1, spice1, wine2, spice2, winner);
    comparisonCount++;

    console.log(`\n✓ Comparison ${comparisonCount} recorded!`);
}

async function main() {
    clearScreen();

    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║         🍷 Wine Bandit - Interactive Demo 🍷            ║');
    console.log('║    Bayesian Dueling Bandit for Mulled Wine Testing      ║');
    console.log('╚══════════════════════════════════════════════════════════╝');

    console.log('\n🎯 Your Mission:');
    console.log('   Discover the best wine + spice combination through');
    console.log('   pairwise comparisons. The model learns your preferences!');

    displayHelp();

    console.log('\n💡 Tip: Try making 20-30 comparisons to see clear patterns emerge!\n');

    let selectedCombos = [];

    while (true) {
        displayGrid();
        displayLeaderboard();

        console.log(`\n📝 Comparisons made: ${comparisonCount}`);
        console.log(`   ${getPerformanceMessage()}\n`);

        if (selectedCombos.length === 0) {
            console.log('Select first combination (or R for random, H for help, Q to quit):');
        } else {
            console.log(`Selected: ${WINES[selectedCombos[0].wine]}${SPICES[selectedCombos[0].spice]}`);
            console.log('Select second combination:');
        }

        const input = await askQuestion('> ');
        const parsed = parseInput(input);

        if (parsed.type === 'quit') {
            console.log('\n👋 Thanks for trying Wine Bandit!\n');
            if (comparisonCount > 0) {
                displayStats();
                console.log('\n🎉 Final Results:');
                displayLeaderboard();
            }
            rl.close();
            return;
        } else if (parsed.type === 'help') {
            displayHelp();
            await askQuestion('\nPress Enter to continue...');
            clearScreen();
        } else if (parsed.type === 'stats') {
            displayStats();
            await askQuestion('\nPress Enter to continue...');
            clearScreen();
        } else if (parsed.type === 'random') {
            await makeRandomComparison();
            selectedCombos = [];
            await askQuestion('\nPress Enter to continue...');
            clearScreen();
        } else if (parsed.type === 'combo') {
            selectedCombos.push(parsed);

            if (selectedCombos.length === 2) {
                // Make comparison
                const c1 = selectedCombos[0];
                const c2 = selectedCombos[1];

                if (c1.wine === c2.wine && c1.spice === c2.spice) {
                    console.log('\n⚠️  Same combination! Pick two different ones.\n');
                    selectedCombos = [];
                    await askQuestion('Press Enter to continue...');
                    clearScreen();
                    continue;
                }

                const combo1 = `${WINES[c1.wine]}${SPICES[c1.spice]}`;
                const combo2 = `${WINES[c2.wine]}${SPICES[c2.spice]}`;

                const winner = simulateComparison(c1.wine, c1.spice, c2.wine, c2.spice);

                displayComparison(combo1, combo2, winner);
                model.addComparison(c1.wine, c1.spice, c2.wine, c2.spice, winner);
                comparisonCount++;

                console.log(`\n✓ Comparison ${comparisonCount} recorded!`);
                selectedCombos = [];

                await askQuestion('\nPress Enter to continue...');
                clearScreen();
            }
        } else {
            console.log('\n⚠️  Invalid input. Try: A1, B2, C3, or R for random, H for help\n');
            await askQuestion('Press Enter to continue...');
            clearScreen();
        }
    }
}

main().catch(err => {
    console.error('Error:', err);
    rl.close();
});
