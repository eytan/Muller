/**
 * Wine Bandit Application
 * UI logic and interaction handling
 */

const WINES = ['A', 'B', 'C'];
const SPICES = ['1', '2', '3', '4'];

class WineBanditApp {
    constructor() {
        this.model = new BayesianBradleyTerry(WINES.length, SPICES.length);
        this.selectedCells = [];
        this.comparisonMode = 'global'; // 'global' or 'beats'
        this.leaderboardView = 'arms'; // 'arms' or 'factors'
        this.nextButtonSlot = 0; // 0 or 1 for round-robin selection
        this.init();
    }

    init() {
        this.createGrid();
        this.attachEventListeners();
        this.updateDisplay();
        this.updateComparisonTable();
    }

    createGrid() {
        const grid = document.getElementById('grid');

        // Top-left corner (empty)
        const corner = document.createElement('div');
        corner.className = 'grid-header';
        grid.appendChild(corner);

        // Column headers (Spices)
        for (const spice of SPICES) {
            const header = document.createElement('div');
            header.className = 'grid-header';
            header.textContent = `Spice ${spice}`;
            grid.appendChild(header);
        }

        // Rows (Wines)
        for (let w = 0; w < WINES.length; w++) {
            // Row header
            const rowHeader = document.createElement('div');
            rowHeader.className = 'grid-header';
            rowHeader.textContent = `Wine ${WINES[w]}`;
            grid.appendChild(rowHeader);

            // Cells
            for (let s = 0; s < SPICES.length; s++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.dataset.wine = w;
                cell.dataset.spice = s;

                const label = document.createElement('div');
                label.className = 'cell-label';
                label.textContent = `${WINES[w]}${SPICES[s]}`;
                cell.appendChild(label);

                const score = document.createElement('div');
                score.className = 'cell-score';
                score.textContent = '0.00';
                cell.appendChild(score);

                const uncertainty = document.createElement('div');
                uncertainty.className = 'cell-uncertainty';
                uncertainty.textContent = '± 10.00';
                cell.appendChild(uncertainty);

                cell.addEventListener('click', () => this.handleCellClick(w, s, cell));

                grid.appendChild(cell);
            }
        }
    }

    handleCellClick(wine, spice, cell) {
        // Check if this cell is already assigned to a button
        const existingButtonIdx = this.selectedCells.findIndex(
            sel => sel && sel.wine === wine && sel.spice === spice
        );

        if (existingButtonIdx !== -1) {
            // Deselect this button
            this.selectedCells[existingButtonIdx].cell.classList.remove('selected');
            this.selectedCells[existingButtonIdx] = null;
            this.updateComparisonButtons();
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

        // Update button display and cell labels
        this.updateComparisonButtons();
    }

    updateComparisonButtons() {
        const btn1 = document.getElementById('comparisonBtn1');
        const btn2 = document.getElementById('comparisonBtn2');

        // Update button 1
        if (this.selectedCells[0]) {
            const combo = `${WINES[this.selectedCells[0].wine]}${SPICES[this.selectedCells[0].spice]}`;
            btn1.textContent = combo;
            btn1.classList.remove('empty');
            btn1.onclick = () => this.submitComparison(1);
        } else {
            btn1.textContent = '?';
            btn1.classList.add('empty');
            btn1.onclick = null;
        }

        // Update button 2
        if (this.selectedCells[1]) {
            const combo = `${WINES[this.selectedCells[1].wine]}${SPICES[this.selectedCells[1].spice]}`;
            btn2.textContent = combo;
            btn2.classList.remove('empty');
            btn2.onclick = () => this.submitComparison(2);
        } else {
            btn2.textContent = '?';
            btn2.classList.add('empty');
            btn2.onclick = null;
        }

        // Update cell labels if in beats mode
        if (this.comparisonMode === 'beats') {
            this.updateCellLabels();
        }
    }

    submitComparison(winner) {
        const cell1 = this.selectedCells[0];
        const cell2 = this.selectedCells[1];

        if (!cell1 || !cell2) return;

        // Add animation to winner
        const winnerCell = winner === 1 ? cell1.cell : cell2.cell;
        winnerCell.classList.add('winner');
        setTimeout(() => winnerCell.classList.remove('winner'), 500);

        // Submit to model
        this.model.addComparison(
            cell1.wine, cell1.spice,
            cell2.wine, cell2.spice,
            winner
        );

        // Clear selection
        cell1.cell.classList.remove('selected');
        cell2.cell.classList.remove('selected');
        this.selectedCells = [null, null];
        this.nextButtonSlot = 0;

        // Update display, buttons, and comparison table
        this.updateDisplay();
        this.updateComparisonButtons();
        this.updateComparisonTable();
    }

    updateDisplay() {
        // Always compute global P(best) for colors and leaderboard
        const globalProbabilities = this.model.computeProbabilityBest(1000);

        // Update grid cells with colors and labels
        const cells = document.querySelectorAll('.grid-cell');
        cells.forEach(cell => {
            const wine = parseInt(cell.dataset.wine);
            const spice = parseInt(cell.dataset.spice);
            const idx = wine * SPICES.length + spice;

            const score = this.model.getScore(wine, spice);
            const globalProb = globalProbabilities[idx];

            // Update score display
            const scoreElem = cell.querySelector('.cell-score');
            scoreElem.textContent = score.toFixed(2);

            // Color cell by global probability (white -> dark blue/purple)
            const color = this.getProbabilityColor(globalProb);
            cell.style.backgroundColor = color;

            // Set text color for contrast
            if (globalProb > 0.5) {
                cell.style.color = 'white';
            } else {
                cell.style.color = '#333';
            }
        });

        // Update cell labels based on mode
        this.updateCellLabels();

        // Update leaderboard with global probabilities
        this.updateLeaderboard(globalProbabilities);

        // Update stats
        this.updateStats();
    }

    updateCellLabels() {
        const cells = document.querySelectorAll('.grid-cell');
        const hasBothSelections = this.selectedCells.length > 1 &&
                                  this.selectedCells[0] && this.selectedCells[1];

        if (this.comparisonMode === 'beats' && hasBothSelections) {
            // In beats mode with both cells selected, show P(X > Y)
            const cell1 = this.selectedCells[0];
            const cell2 = this.selectedCells[1];
            const combo1 = `${WINES[cell1.wine]}${SPICES[cell1.spice]}`;
            const combo2 = `${WINES[cell2.wine]}${SPICES[cell2.spice]}`;

            // Compute probability that cell1 beats cell2
            const prob1beats2 = this.model.computeProbabilityBeatReference(cell2.wine, cell2.spice, 1000);
            const idx1 = cell1.wine * SPICES.length + cell1.spice;
            const p = prob1beats2[idx1];

            cells.forEach(cell => {
                const uncertaintyElem = cell.querySelector('.cell-uncertainty');
                uncertaintyElem.textContent = `P(${combo1} > ${combo2}) = ${(p * 100).toFixed(1)}%`;
            });
        } else {
            // In global mode, show P(best) for each cell
            const globalProbs = this.model.computeProbabilityBest(1000);
            cells.forEach(cell => {
                const wine = parseInt(cell.dataset.wine);
                const spice = parseInt(cell.dataset.spice);
                const idx = wine * SPICES.length + spice;
                const prob = globalProbs[idx];

                const uncertaintyElem = cell.querySelector('.cell-uncertainty');
                uncertaintyElem.textContent = `${(prob * 100).toFixed(1)}%`;

                // Update tooltip
                cell.title = `${WINES[wine]}${SPICES[spice]}\nScore: ${this.model.getScore(wine, spice).toFixed(2)}\nP(best): ${(prob * 100).toFixed(1)}%`;
            });
        }
    }

    getProbabilityColor(prob) {
        // White (0%) -> Dark Blue/Purple (100%)
        // Using the app's purple theme
        const r = Math.round(255 - (255 - 102) * prob);  // 255 -> 102
        const g = Math.round(255 - (255 - 126) * prob);  // 255 -> 126
        const b = Math.round(255 - (255 - 234) * prob);  // 255 -> 234

        return `rgb(${r}, ${g}, ${b})`;
    }

    updateLeaderboard(probabilities) {
        if (this.leaderboardView === 'arms') {
            this.renderArmsView(probabilities);
        } else {
            this.renderFactorsView();
        }
    }

    renderArmsView(probabilities) {
        const leaderboardList = document.getElementById('leaderboardList');
        leaderboardList.innerHTML = '';

        const ranking = this.model.getRanking();

        ranking.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'leaderboard-item';

            const idx = item.wine * SPICES.length + item.spice;
            const prob = probabilities[idx];

            const rank = document.createElement('span');
            rank.className = 'leaderboard-rank';
            rank.textContent = `#${index + 1}`;

            const name = document.createElement('span');
            name.className = 'leaderboard-name';
            name.textContent = `${WINES[item.wine]}${SPICES[item.spice]}`;

            const score = document.createElement('span');
            score.className = 'leaderboard-score';
            score.textContent = `${(prob * 100).toFixed(1)}% (${item.score.toFixed(2)})`;

            div.appendChild(rank);
            div.appendChild(name);
            div.appendChild(score);

            leaderboardList.appendChild(div);
        });
    }

    renderFactorsView() {
        const leaderboardList = document.getElementById('leaderboardList');
        leaderboardList.innerHTML = '';

        // Compute factor probabilities
        const wineProbs = this.model.computeProbabilityBestWine(1000);
        const spiceProbs = this.model.computeProbabilityBestSpice(1000);

        // Wine section
        const wineSection = document.createElement('div');
        wineSection.className = 'factor-section';

        const wineTitle = document.createElement('h3');
        wineTitle.textContent = 'Wine Rankings';
        wineSection.appendChild(wineTitle);

        // Sort wines by effect
        const wineEffects = this.model.params.slice(0, 3).map((effect, idx) => ({
            wine: idx,
            effect: effect,
            prob: wineProbs[idx]
        }));
        wineEffects.sort((a, b) => b.effect - a.effect);

        wineEffects.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'leaderboard-item';

            const rank = document.createElement('span');
            rank.className = 'leaderboard-rank';
            rank.textContent = `#${index + 1}`;

            const name = document.createElement('span');
            name.className = 'leaderboard-name';
            name.textContent = `Wine ${WINES[item.wine]}`;

            const score = document.createElement('span');
            score.className = 'leaderboard-score';
            score.textContent = `${(item.prob * 100).toFixed(1)}% (${item.effect.toFixed(2)})`;

            div.appendChild(rank);
            div.appendChild(name);
            div.appendChild(score);

            wineSection.appendChild(div);
        });

        leaderboardList.appendChild(wineSection);

        // Spice section
        const spiceSection = document.createElement('div');
        spiceSection.className = 'factor-section';

        const spiceTitle = document.createElement('h3');
        spiceTitle.textContent = 'Spice Mix Rankings';
        spiceSection.appendChild(spiceTitle);

        // Sort spices by effect
        const spiceEffects = this.model.params.slice(3, 7).map((effect, idx) => ({
            spice: idx,
            effect: effect,
            prob: spiceProbs[idx]
        }));
        spiceEffects.sort((a, b) => b.effect - a.effect);

        spiceEffects.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'leaderboard-item';

            const rank = document.createElement('span');
            rank.className = 'leaderboard-rank';
            rank.textContent = `#${index + 1}`;

            const name = document.createElement('span');
            name.className = 'leaderboard-name';
            name.textContent = `Spice ${SPICES[item.spice]}`;

            const score = document.createElement('span');
            score.className = 'leaderboard-score';
            score.textContent = `${(item.prob * 100).toFixed(1)}% (${item.effect.toFixed(2)})`;

            div.appendChild(rank);
            div.appendChild(name);
            div.appendChild(score);

            spiceSection.appendChild(div);
        });

        leaderboardList.appendChild(spiceSection);
    }

    updateStats() {
        const numComparisons = document.getElementById('numComparisons');
        numComparisons.textContent = this.model.comparisons.length;

        const ranking = this.model.getRanking();
        if (ranking.length > 0) {
            const mostUncertain = ranking.reduce((max, item) =>
                item.uncertainty > max.uncertainty ? item : max
            );

            const mostUncertainElem = document.getElementById('mostUncertain');
            mostUncertainElem.textContent =
                `${WINES[mostUncertain.wine]}${SPICES[mostUncertain.spice]} (± ${mostUncertain.uncertainty.toFixed(2)})`;
        }
    }

    attachEventListeners() {
        const resetBtn = document.getElementById('resetBtn');
        resetBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to reset all data?')) {
                this.reset();
            }
        });

        const modeToggle = document.getElementById('modeToggle');
        modeToggle.addEventListener('click', () => {
            this.comparisonMode = this.comparisonMode === 'global' ? 'beats' : 'global';
            modeToggle.textContent = this.comparisonMode === 'global' ? 'Global Best' : 'Beats Selected';

            // Only update cell labels, not the entire display
            this.updateCellLabels();
        });

        // View toggle tabs
        const viewBestArm = document.getElementById('viewBestArm');
        const viewFactors = document.getElementById('viewFactors');

        viewBestArm.addEventListener('click', () => {
            this.leaderboardView = 'arms';
            viewBestArm.classList.add('active');
            viewFactors.classList.remove('active');
            this.updateDisplay();
        });

        viewFactors.addEventListener('click', () => {
            this.leaderboardView = 'factors';
            viewFactors.classList.add('active');
            viewBestArm.classList.remove('active');
            this.updateDisplay();
        });

        // CSV export
        const exportCsv = document.getElementById('exportCsv');
        exportCsv.addEventListener('click', (e) => {
            e.preventDefault();
            this.exportCSV();
        });
    }

    reset() {
        this.model.reset();
        if (this.selectedCells.length > 0) {
            this.selectedCells.forEach(sel => {
                if (sel && sel.cell) {
                    sel.cell.classList.remove('selected');
                }
            });
        }
        this.selectedCells = [null, null];
        this.nextButtonSlot = 0;
        this.updateDisplay();
        this.updateComparisonButtons();
        this.updateComparisonTable();
    }

    updateComparisonTable() {
        const tbody = document.getElementById('comparisonTableBody');
        tbody.innerHTML = '';

        if (this.model.comparisons.length === 0) {
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 2;
            cell.textContent = 'No comparisons yet';
            cell.style.textAlign = 'center';
            cell.style.color = '#999';
            row.appendChild(cell);
            tbody.appendChild(row);
            return;
        }

        // Aggregate comparisons by pair (lexicographically sorted)
        const pairCounts = new Map();

        this.model.comparisons.forEach(comp => {
            const combo1 = `${WINES[comp.wine1]}${SPICES[comp.spice1]}`;
            const combo2 = `${WINES[comp.wine2]}${SPICES[comp.spice2]}`;

            // Sort lexicographically to ensure X vs Y and Y vs X are the same key
            let key, winner1Count, winner2Count;
            if (combo1 < combo2) {
                key = `${combo1} vs ${combo2}`;
                winner1Count = comp.winner === 1 ? 1 : 0;
                winner2Count = comp.winner === 2 ? 1 : 0;
            } else {
                key = `${combo2} vs ${combo1}`;
                winner1Count = comp.winner === 2 ? 1 : 0;
                winner2Count = comp.winner === 1 ? 1 : 0;
            }

            if (!pairCounts.has(key)) {
                pairCounts.set(key, { wins1: 0, wins2: 0, combo1, combo2 });
            }
            const counts = pairCounts.get(key);
            counts.wins1 += winner1Count;
            counts.wins2 += winner2Count;
        });

        // Sort keys lexicographically
        const sortedKeys = Array.from(pairCounts.keys()).sort();

        sortedKeys.forEach(key => {
            const counts = pairCounts.get(key);
            const [combo1, combo2] = key.split(' vs ');

            const row = document.createElement('tr');

            const compCell = document.createElement('td');
            compCell.textContent = key;
            row.appendChild(compCell);

            const winsCell = document.createElement('td');
            winsCell.textContent = `${counts.wins1}-${counts.wins2}`;
            row.appendChild(winsCell);

            tbody.appendChild(row);
        });
    }

    exportCSV() {
        if (this.model.comparisons.length === 0) {
            alert('No comparisons to export');
            return;
        }

        // Sort comparisons lexicographically
        const sortedComparisons = this.model.comparisons.map(comp => {
            const combo1 = `${WINES[comp.wine1]}${SPICES[comp.spice1]}`;
            const combo2 = `${WINES[comp.wine2]}${SPICES[comp.spice2]}`;

            // Ensure lexicographic order
            if (combo1 <= combo2) {
                return {
                    lhs: combo1,
                    rhs: combo2,
                    lhs_won: comp.winner === 1 ? 1 : 0
                };
            } else {
                return {
                    lhs: combo2,
                    rhs: combo1,
                    lhs_won: comp.winner === 2 ? 1 : 0
                };
            }
        });

        // Sort by lhs, then rhs
        sortedComparisons.sort((a, b) => {
            if (a.lhs !== b.lhs) return a.lhs.localeCompare(b.lhs);
            return a.rhs.localeCompare(b.rhs);
        });

        // Generate CSV
        let csv = 'lhs,rhs,lhs_won\n';
        sortedComparisons.forEach(comp => {
            csv += `${comp.lhs},${comp.rhs},${comp.lhs_won}\n`;
        });

        // Download CSV
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'wine_bandit_comparisons.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new WineBanditApp();
});
