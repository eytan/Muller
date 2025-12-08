/**
 * Wine Bandit Application
 * UI logic and interaction handling
 */

const WINES = CONFIG.WINES;
const SPICES = CONFIG.SPICES;

class WineBanditApp {
    constructor() {
        this.model = new BayesianBradleyTerry(WINES.length, SPICES.length);
        this.selectedCells = [];
        this.leaderboardView = 'arms'; // 'arms' or 'factors'
        this.nextButtonSlot = 0; // 0 or 1 for selection
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

        // If both slots are already full, clear both and start fresh
        if (this.selectedCells[0] && this.selectedCells[1]) {
            this.selectedCells[0].cell.classList.remove('selected');
            this.selectedCells[1].cell.classList.remove('selected');
            this.selectedCells = [null, null];
            this.nextButtonSlot = 0;
        }

        // Assign to next button slot
        const targetSlot = this.nextButtonSlot;

        // Assign new selection
        this.selectedCells[targetSlot] = { wine, spice, cell };
        cell.classList.add('selected');

        // Move to next slot
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

        // Update cell labels based on what's selected
        this.updateCellLabels();
    }

    submitComparison(winner) {
        const cell1 = this.selectedCells[0];
        const cell2 = this.selectedCells[1];

        if (!cell1 || !cell2) return;

        // Add animation to winner
        const winnerCell = winner === 1 ? cell1.cell : cell2.cell;
        winnerCell.classList.add('winner');
        setTimeout(() => winnerCell.classList.remove('winner'), 500);

        // Get tasting notes
        const notesField = document.getElementById('tastingNotes');
        const notes = notesField.value.trim();

        // Submit to model
        this.model.addComparison(
            cell1.wine, cell1.spice,
            cell2.wine, cell2.spice,
            winner,
            notes
        );

        // Clear selection and notes
        cell1.cell.classList.remove('selected');
        cell2.cell.classList.remove('selected');
        this.selectedCells = [null, null];
        this.nextButtonSlot = 0;
        notesField.value = '';

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

    computeWinLossCounts() {
        // Compute win/loss counts for each combination
        const counts = {};
        for (let w = 0; w < WINES.length; w++) {
            for (let s = 0; s < SPICES.length; s++) {
                const key = `${w},${s}`;
                counts[key] = { wins: 0, losses: 0 };
            }
        }

        this.model.comparisons.forEach(comp => {
            const key1 = `${comp.wine1},${comp.spice1}`;
            const key2 = `${comp.wine2},${comp.spice2}`;

            if (comp.winner === 1) {
                counts[key1].wins++;
                counts[key2].losses++;
            } else {
                counts[key2].wins++;
                counts[key1].losses++;
            }
        });

        return counts;
    }

    computeFactorWinLossCounts() {
        // Compute win/loss counts for each wine and spice
        const wineCounts = {};
        const spiceCounts = {};

        for (let w = 0; w < WINES.length; w++) {
            wineCounts[w] = { wins: 0, losses: 0 };
        }
        for (let s = 0; s < SPICES.length; s++) {
            spiceCounts[s] = { wins: 0, losses: 0 };
        }

        this.model.comparisons.forEach(comp => {
            if (comp.winner === 1) {
                wineCounts[comp.wine1].wins++;
                wineCounts[comp.wine2].losses++;
                spiceCounts[comp.spice1].wins++;
                spiceCounts[comp.spice2].losses++;
            } else {
                wineCounts[comp.wine2].wins++;
                wineCounts[comp.wine1].losses++;
                spiceCounts[comp.spice2].wins++;
                spiceCounts[comp.spice1].losses++;
            }
        });

        return { wineCounts, spiceCounts };
    }

    updateCellLabels() {
        const cells = document.querySelectorAll('.grid-cell');
        const hasLHS = this.selectedCells.length > 0 && this.selectedCells[0];
        const winLossCounts = this.computeWinLossCounts();

        if (hasLHS) {
            // LHS is selected: show P(each cell > LHS)
            const lhs = this.selectedCells[0];
            const lhsCombo = `${WINES[lhs.wine]}${SPICES[lhs.spice]}`;

            // Compute probability that each cell beats LHS
            const beatLhsProbs = this.model.computeProbabilityBeatReference(lhs.wine, lhs.spice, 1000);

            cells.forEach(cell => {
                const wine = parseInt(cell.dataset.wine);
                const spice = parseInt(cell.dataset.spice);
                const idx = wine * SPICES.length + spice;
                const prob = beatLhsProbs[idx];

                const uncertaintyElem = cell.querySelector('.cell-uncertainty');
                uncertaintyElem.textContent = `${(prob * 100).toFixed(1)}%`;

                // Update tooltip with win/loss counts
                const combo = `${WINES[wine]}${SPICES[spice]}`;
                const key = `${wine},${spice}`;
                const counts = winLossCounts[key];
                cell.title = `${combo}\nScore: ${this.model.getScore(wine, spice).toFixed(2)}\nP(${combo} > ${lhsCombo}): ${(prob * 100).toFixed(1)}%\nWins: ${counts.wins} | Losses: ${counts.losses}`;

                // Grey out cells with no comparison data
                const labelElem = cell.querySelector('.cell-label');
                const scoreElem = cell.querySelector('.cell-score');
                if (counts.wins + counts.losses === 0) {
                    labelElem.style.color = '#777';
                    scoreElem.style.color = '#777';
                    uncertaintyElem.style.color = '#777';
                } else {
                    // Reset to default (will be overridden by global color logic)
                    labelElem.style.color = '';
                    scoreElem.style.color = '';
                    uncertaintyElem.style.color = '';
                }
            });
        } else {
            // Nothing selected: show unconditional P(best) for each cell
            const globalProbs = this.model.computeProbabilityBest(1000);
            cells.forEach(cell => {
                const wine = parseInt(cell.dataset.wine);
                const spice = parseInt(cell.dataset.spice);
                const idx = wine * SPICES.length + spice;
                const prob = globalProbs[idx];

                const uncertaintyElem = cell.querySelector('.cell-uncertainty');
                uncertaintyElem.textContent = `${(prob * 100).toFixed(1)}%`;

                // Update tooltip with win/loss counts
                const combo = `${WINES[wine]}${SPICES[spice]}`;
                const key = `${wine},${spice}`;
                const counts = winLossCounts[key];
                cell.title = `${combo}\nScore: ${this.model.getScore(wine, spice).toFixed(2)}\nP(best): ${(prob * 100).toFixed(1)}%\nWins: ${counts.wins} | Losses: ${counts.losses}`;

                // Grey out cells with no comparison data
                const labelElem = cell.querySelector('.cell-label');
                const scoreElem = cell.querySelector('.cell-score');
                if (counts.wins + counts.losses === 0) {
                    labelElem.style.color = '#777';
                    scoreElem.style.color = '#777';
                    uncertaintyElem.style.color = '#777';
                } else {
                    // Reset to default (will be overridden by global color logic)
                    labelElem.style.color = '';
                    scoreElem.style.color = '';
                    uncertaintyElem.style.color = '';
                }
            });
        }
    }

    getProbabilityColor(prob) {
        // Create 5 distinct color bands from white to deep purple
        // Define 5 color stops matching the darker gradient
        const colors = [
            { r: 255, g: 255, b: 255 },  // 0%: White
            { r: 220, g: 220, b: 245 },  // 25%: Very light purple
            { r: 170, g: 180, b: 240 },  // 50%: Light purple/blue
            { r: 79, g: 96, b: 213 },    // 75%: Darker blue (#4f60d5)
            { r: 93, g: 53, b: 133 }     // 100%: Deep purple (#5d3585)
        ];

        // Determine which band we're in
        let lowerIdx, upperIdx, localProb;
        if (prob <= 0.25) {
            lowerIdx = 0; upperIdx = 1;
            localProb = prob / 0.25;
        } else if (prob <= 0.5) {
            lowerIdx = 1; upperIdx = 2;
            localProb = (prob - 0.25) / 0.25;
        } else if (prob <= 0.75) {
            lowerIdx = 2; upperIdx = 3;
            localProb = (prob - 0.5) / 0.25;
        } else {
            lowerIdx = 3; upperIdx = 4;
            localProb = (prob - 0.75) / 0.25;
        }

        // Interpolate between the two colors
        const lower = colors[lowerIdx];
        const upper = colors[upperIdx];

        const r = Math.round(lower.r + (upper.r - lower.r) * localProb);
        const g = Math.round(lower.g + (upper.g - lower.g) * localProb);
        const b = Math.round(lower.b + (upper.b - lower.b) * localProb);

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
        const winLossCounts = this.computeWinLossCounts();

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

            // Add tooltip with win/loss counts
            const key = `${item.wine},${item.spice}`;
            const counts = winLossCounts[key];
            div.title = `${WINES[item.wine]}${SPICES[item.spice]}\nP(best): ${(prob * 100).toFixed(1)}%\nScore: ${item.score.toFixed(2)}\nWins: ${counts.wins} | Losses: ${counts.losses}`;

            // Grey out items with no comparison data
            if (counts.wins + counts.losses === 0) {
                name.style.color = '#777';
                score.style.color = '#777';
                rank.style.color = '#999';
            }

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
        const { wineCounts, spiceCounts } = this.computeFactorWinLossCounts();

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

            // Add tooltip with win/loss counts
            const counts = wineCounts[item.wine];
            div.title = `Wine ${WINES[item.wine]}\nP(best wine): ${(item.prob * 100).toFixed(1)}%\nEffect: ${item.effect.toFixed(2)}\nWins: ${counts.wins} | Losses: ${counts.losses}`;

            // Grey out wines with no comparison data
            if (counts.wins + counts.losses === 0) {
                name.style.color = '#777';
                score.style.color = '#777';
                rank.style.color = '#999';
            }

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

            // Add tooltip with win/loss counts
            const counts = spiceCounts[item.spice];
            div.title = `Spice ${SPICES[item.spice]}\nP(best spice): ${(item.prob * 100).toFixed(1)}%\nEffect: ${item.effect.toFixed(2)}\nWins: ${counts.wins} | Losses: ${counts.losses}`;

            // Grey out spices with no comparison data
            if (counts.wins + counts.losses === 0) {
                name.style.color = '#777';
                score.style.color = '#777';
                rank.style.color = '#999';
            }

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

        // CSV import
        const importCsv = document.getElementById('importCsv');
        importCsv.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.importCSV(file);
                // Reset file input so same file can be imported again if needed
                e.target.value = '';
            }
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
            cell.colSpan = 3;
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
                pairCounts.set(key, { wins1: 0, wins2: 0, lastTimestamp: comp.timestamp });
            }
            const counts = pairCounts.get(key);
            counts.wins1 += winner1Count;
            counts.wins2 += winner2Count;

            // Update to most recent timestamp
            if (comp.timestamp > counts.lastTimestamp) {
                counts.lastTimestamp = comp.timestamp;
            }
        });

        // Sort keys lexicographically
        const sortedKeys = Array.from(pairCounts.keys()).sort();

        sortedKeys.forEach(key => {
            const counts = pairCounts.get(key);

            const row = document.createElement('tr');

            const compCell = document.createElement('td');
            compCell.textContent = key;
            row.appendChild(compCell);

            const winsCell = document.createElement('td');
            winsCell.textContent = `${counts.wins1}-${counts.wins2}`;
            row.appendChild(winsCell);

            const timestampCell = document.createElement('td');
            const date = new Date(counts.lastTimestamp);
            timestampCell.textContent = date.toLocaleString();
            timestampCell.style.fontSize = '0.9em';
            timestampCell.style.color = '#666';
            row.appendChild(timestampCell);

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
                    lhs_won: comp.winner === 1 ? 1 : 0,
                    notes: comp.notes || '',
                    timestamp: comp.timestamp
                };
            } else {
                return {
                    lhs: combo2,
                    rhs: combo1,
                    lhs_won: comp.winner === 2 ? 1 : 0,
                    notes: comp.notes || '',
                    timestamp: comp.timestamp
                };
            }
        });

        // Sort by lhs, then rhs
        sortedComparisons.sort((a, b) => {
            if (a.lhs !== b.lhs) return a.lhs.localeCompare(b.lhs);
            return a.rhs.localeCompare(b.rhs);
        });

        // Generate CSV
        let csv = 'lhs,rhs,lhs_won,notes,timestamp\n';
        sortedComparisons.forEach(comp => {
            // Escape quotes in notes and wrap in quotes if contains comma or quote
            let notes = comp.notes.replace(/"/g, '""');
            if (notes.includes(',') || notes.includes('"') || notes.includes('\n')) {
                notes = `"${notes}"`;
            }
            csv += `${comp.lhs},${comp.rhs},${comp.lhs_won},${notes},${comp.timestamp}\n`;
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

    importCSV(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const csv = e.target.result;
                const lines = csv.split('\n').filter(line => line.trim());

                if (lines.length < 2) {
                    alert('CSV file is empty or invalid');
                    return;
                }

                // Parse header
                const header = lines[0].toLowerCase().trim();
                if (!header.includes('lhs') || !header.includes('rhs') || !header.includes('lhs_won')) {
                    alert('CSV must have columns: lhs, rhs, lhs_won, notes');
                    return;
                }

                // Reset model
                this.model.reset();
                this.selectedCells = [null, null];
                this.nextButtonSlot = 0;

                // Parse each row
                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line) continue;

                    // Simple CSV parser (handles quoted fields)
                    const row = this.parseCSVRow(line);

                    if (row.length < 3) continue;

                    const lhs = row[0].trim();
                    const rhs = row[1].trim();
                    const lhsWon = parseInt(row[2].trim());
                    const notes = row.length > 3 ? row[3] : '';
                    const timestamp = row.length > 4 ? row[4].trim() : null;

                    // Parse combo strings (e.g., "A1" -> wine=0, spice=0)
                    const lhsParsed = this.parseCombo(lhs);
                    const rhsParsed = this.parseCombo(rhs);

                    if (!lhsParsed || !rhsParsed) {
                        console.warn(`Skipping invalid row: ${line}`);
                        continue;
                    }

                    // Add comparison (winner is 1 if lhs won, 2 if rhs won)
                    const winner = lhsWon === 1 ? 1 : 2;
                    this.model.addComparison(
                        lhsParsed.wine, lhsParsed.spice,
                        rhsParsed.wine, rhsParsed.spice,
                        winner,
                        notes,
                        timestamp
                    );
                }

                // Update display
                this.updateDisplay();
                this.updateComparisonButtons();
                this.updateComparisonTable();

                alert(`Successfully imported ${this.model.comparisons.length} comparisons`);
            } catch (error) {
                alert(`Error importing CSV: ${error.message}`);
                console.error(error);
            }
        };

        reader.readAsText(file);
    }

    parseCSVRow(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    // Escaped quote
                    current += '"';
                    i++;
                } else {
                    // Toggle quotes
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                // End of field
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }

        result.push(current);
        return result;
    }

    parseCombo(combo) {
        // Parse "A1" -> {wine: 0, spice: 0}
        if (!combo || combo.length < 2) return null;

        const wineLetter = combo[0].toUpperCase();
        const spiceNumber = combo.substring(1);

        const wineIdx = WINES.indexOf(wineLetter);
        const spiceIdx = SPICES.indexOf(spiceNumber);

        if (wineIdx === -1 || spiceIdx === -1) return null;

        return { wine: wineIdx, spice: spiceIdx };
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new WineBanditApp();
});
