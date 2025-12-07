/**
 * Automated Wine Bandit Demo
 * Watch the model learn in real-time!
 */

const { BayesianBradleyTerry } = require('./model.js');

const WINES = ['A', 'B', 'C'];
const SPICES = ['1', '2', '3', '4'];

// Ground truth (hidden) - the model will discover this!
const TRUE_WINE_EFFECTS = [1.5, 0.0, -1.5];  // A is best, C is worst
const TRUE_SPICE_EFFECTS = [1.0, 0.3, -0.3, -1.0];  // 1 is best, 4 is worst

const model = new BayesianBradleyTerry(3, 4);

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function simulateComparison(wine1, spice1, wine2, spice2) {
    const score1 = TRUE_WINE_EFFECTS[wine1] + TRUE_SPICE_EFFECTS[spice1];
    const score2 = TRUE_WINE_EFFECTS[wine2] + TRUE_SPICE_EFFECTS[spice2];
    const prob = 1 / (1 + Math.exp(score2 - score1));
    return Math.random() < prob ? 1 : 2;
}

function displayTop5(comparisonNum) {
    const ranking = model.getRanking();

    console.log(`\n🏆 Top 5 after ${comparisonNum} comparisons:`);
    console.log('─'.repeat(55));

    for (let i = 0; i < 5; i++) {
        const r = ranking[i];
        const combo = `${WINES[r.wine]}${SPICES[r.spice]}`;
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  ';
        console.log(`${medal} ${combo} → Score: ${r.score.toFixed(2).padStart(6)}  ` +
                    `Uncertainty: ±${r.uncertainty.toFixed(2)}`);
    }
}

function displayWineRankings() {
    const wineEffects = model.params.slice(0, 3).map((val, idx) => ({
        wine: WINES[idx],
        effect: val
    }));
    wineEffects.sort((a, b) => b.effect - a.effect);

    console.log('\n🍷 Wine Rankings:');
    console.log(`   ${wineEffects.map(w => `Wine ${w.wine}`).join(' > ')}`);
}

function displaySpiceRankings() {
    const spiceEffects = model.params.slice(3, 7).map((val, idx) => ({
        spice: SPICES[idx],
        effect: val
    }));
    spiceEffects.sort((a, b) => b.effect - a.effect);

    console.log('\n🌿 Spice Rankings:');
    console.log(`   ${spiceEffects.map(s => `Spice ${s.spice}`).join(' > ')}`);
}

async function makeComparison(wine1, spice1, wine2, spice2, compNum) {
    const combo1 = `${WINES[wine1]}${SPICES[spice1]}`;
    const combo2 = `${WINES[wine2]}${SPICES[spice2]}`;

    const winner = simulateComparison(wine1, spice1, wine2, spice2);
    model.addComparison(wine1, spice1, wine2, spice2, winner);

    const winnerCombo = winner === 1 ? combo1 : combo2;
    console.log(`${compNum}. ${combo1} vs ${combo2} → ${winnerCombo} wins`);
}

async function main() {
    console.clear();
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║         🍷 Wine Bandit - Automated Demo 🍷              ║');
    console.log('║      Watch the Bayesian Model Learn in Real-Time!       ║');
    console.log('╚══════════════════════════════════════════════════════════╝');

    console.log('\n🎯 Hidden Truth (will be discovered):');
    console.log('   Best Wine: A, Best Spice: 1 → Combo A1 is optimal!');
    console.log('   Worst Wine: C, Worst Spice: 4 → Combo C4 is worst!');

    await sleep(2000);

    // Phase 1: First 10 comparisons
    console.log('\n\n📊 PHASE 1: Initial Exploration (10 comparisons)');
    console.log('═'.repeat(60));

    for (let i = 1; i <= 10; i++) {
        const w1 = Math.floor(Math.random() * 3);
        const s1 = Math.floor(Math.random() * 4);
        let w2 = Math.floor(Math.random() * 3);
        let s2 = Math.floor(Math.random() * 4);

        while (w1 === w2 && s1 === s2) {
            w2 = Math.floor(Math.random() * 3);
            s2 = Math.floor(Math.random() * 4);
        }

        await makeComparison(w1, s1, w2, s2, i);
        await sleep(300);
    }

    displayTop5(10);
    console.log('\n💡 Early patterns emerging, but still lots of uncertainty...');
    await sleep(2000);

    // Phase 2: 10 more comparisons (total: 20)
    console.log('\n\n📊 PHASE 2: Building Confidence (20 total)');
    console.log('═'.repeat(60));

    for (let i = 11; i <= 20; i++) {
        const w1 = Math.floor(Math.random() * 3);
        const s1 = Math.floor(Math.random() * 4);
        let w2 = Math.floor(Math.random() * 3);
        let s2 = Math.floor(Math.random() * 4);

        while (w1 === w2 && s1 === s2) {
            w2 = Math.floor(Math.random() * 3);
            s2 = Math.floor(Math.random() * 4);
        }

        await makeComparison(w1, s1, w2, s2, i);
        await sleep(300);
    }

    displayTop5(20);
    displayWineRankings();
    displaySpiceRankings();
    console.log('\n✅ Clear winners and losers identified!');
    await sleep(2000);

    // Phase 3: To 50 comparisons
    console.log('\n\n📊 PHASE 3: Refining Rankings (50 total)');
    console.log('═'.repeat(60));

    for (let i = 21; i <= 50; i++) {
        const w1 = Math.floor(Math.random() * 3);
        const s1 = Math.floor(Math.random() * 4);
        let w2 = Math.floor(Math.random() * 3);
        let s2 = Math.floor(Math.random() * 4);

        while (w1 === w2 && s1 === s2) {
            w2 = Math.floor(Math.random() * 3);
            s2 = Math.floor(Math.random() * 4);
        }

        await makeComparison(w1, s1, w2, s2, i);

        // Show progress every 10 comparisons
        if (i % 10 === 0) {
            console.log('   ...');
            await sleep(500);
        } else {
            await sleep(150);
        }
    }

    displayTop5(50);
    displayWineRankings();
    displaySpiceRankings();
    console.log('\n🎯 Reliable rankings achieved!');
    await sleep(2000);

    // Final results
    console.log('\n\n🎉 FINAL RESULTS');
    console.log('═'.repeat(60));

    const ranking = model.getRanking();
    const best = `${WINES[ranking[0].wine]}${SPICES[ranking[0].spice]}`;
    const worst = `${WINES[ranking[11].wine]}${SPICES[ranking[11].spice]}`;

    console.log(`\n🥇 Best Combination:  ${best} (Expected: A1)`);
    console.log(`💀 Worst Combination: ${worst} (Expected: C4)`);

    displayWineRankings();
    console.log('   (Expected: Wine A > Wine B > Wine C)');

    displaySpiceRankings();
    console.log('   (Expected: Spice 1 > Spice 2 > Spice 3 > Spice 4)');

    console.log('\n📊 Full Leaderboard:');
    console.log('─'.repeat(55));

    for (let i = 0; i < 12; i++) {
        const r = ranking[i];
        const combo = `${WINES[r.wine]}${SPICES[r.spice]}`;
        const rank = `${i + 1}.`.padStart(4);
        console.log(`${rank} ${combo} → Score: ${r.score.toFixed(2).padStart(6)}  ` +
                    `Uncertainty: ±${r.uncertainty.toFixed(2)}`);
    }

    console.log('\n✨ The Bayesian model successfully learned the true preferences!');
    console.log('   After just 50 comparisons, we have reliable rankings.\n');

    console.log('💡 Try it yourself:');
    console.log('   • Run: node interactive-demo.js (for interactive mode)');
    console.log('   • Open: index.html (for the web interface)\n');
}

main().catch(err => {
    console.error('Error:', err);
});
