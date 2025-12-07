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
        this.init();
    }

    init() {
        this.createGrid();
        this.attachEventListeners();
        this.updateDisplay();
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
        const cellId = `${wine}-${spice}`;

        // Check if already selected
        const existingIndex = this.selectedCells.findIndex(
            sel => sel.wine === wine && sel.spice === spice
        );

        if (existingIndex !== -1) {
            // Deselect
            this.selectedCells.splice(existingIndex, 1);
            cell.classList.remove('selected');
        } else {
            // Select (max 2)
            if (this.selectedCells.length < 2) {
                this.selectedCells.push({ wine, spice, cell });
                cell.classList.add('selected');
            } else {
                // Deselect first and select new
                this.selectedCells[0].cell.classList.remove('selected');
                this.selectedCells.shift();
                this.selectedCells.push({ wine, spice, cell });
                cell.classList.add('selected');
            }
        }

        this.updateSubmitButton();
    }

    updateSubmitButton() {
        const btn = document.getElementById('submitBtn');

        if (this.selectedCells.length === 2) {
            btn.disabled = false;
            btn.textContent = 'Click to Submit Winner';
            btn.onclick = () => this.showWinnerSelection();
        } else {
            btn.disabled = true;
            btn.textContent = `Select ${2 - this.selectedCells.length} more combination(s)`;
        }
    }

    showWinnerSelection() {
        if (this.selectedCells.length !== 2) return;

        const btn = document.getElementById('submitBtn');
        const cell1 = this.selectedCells[0];
        const cell2 = this.selectedCells[1];

        const label1 = `${WINES[cell1.wine]}${SPICES[cell1.spice]}`;
        const label2 = `${WINES[cell2.wine]}${SPICES[cell2.spice]}`;

        btn.textContent = `Winner: ${label1} | ${label2}`;

        // Create temporary buttons for winner selection
        btn.onclick = null;

        let clickCount = 0;
        const clickHandler = (winner) => {
            clickCount++;
            if (clickCount === 1) {
                this.submitComparison(winner);
            }
        };

        // Change button to show both options
        btn.style.display = 'none';

        const controls = document.querySelector('.controls');
        const btnContainer = document.createElement('div');
        btnContainer.style.display = 'flex';
        btnContainer.style.gap = '20px';
        btnContainer.style.justifyContent = 'center';

        const btn1 = document.createElement('button');
        btn1.textContent = `✓ ${label1} Wins`;
        btn1.style.flex = '1';
        btn1.style.maxWidth = '300px';
        btn1.onclick = () => {
            clickHandler(1);
            controls.removeChild(btnContainer);
            btn.style.display = 'block';
        };

        const btn2 = document.createElement('button');
        btn2.textContent = `✓ ${label2} Wins`;
        btn2.style.flex = '1';
        btn2.style.maxWidth = '300px';
        btn2.onclick = () => {
            clickHandler(2);
            controls.removeChild(btnContainer);
            btn.style.display = 'block';
        };

        btnContainer.appendChild(btn1);
        btnContainer.appendChild(btn2);
        controls.appendChild(btnContainer);
    }

    submitComparison(winner) {
        if (this.selectedCells.length !== 2) return;

        const cell1 = this.selectedCells[0];
        const cell2 = this.selectedCells[1];

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
        this.selectedCells.forEach(sel => sel.cell.classList.remove('selected'));
        this.selectedCells = [];

        // Update display
        this.updateDisplay();
        this.updateSubmitButton();
    }

    updateDisplay() {
        // Update grid cells with scores and uncertainties
        const cells = document.querySelectorAll('.grid-cell');
        cells.forEach(cell => {
            const wine = parseInt(cell.dataset.wine);
            const spice = parseInt(cell.dataset.spice);

            const score = this.model.getScore(wine, spice);
            const uncertainty = this.model.getUncertainty(wine, spice);

            const scoreElem = cell.querySelector('.cell-score');
            const uncertaintyElem = cell.querySelector('.cell-uncertainty');

            scoreElem.textContent = score.toFixed(2);
            uncertaintyElem.textContent = `± ${uncertainty.toFixed(2)}`;
        });

        // Update leaderboard
        this.updateLeaderboard();

        // Update stats
        this.updateStats();
    }

    updateLeaderboard() {
        const leaderboardList = document.getElementById('leaderboardList');
        leaderboardList.innerHTML = '';

        const ranking = this.model.getRanking();

        ranking.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'leaderboard-item';

            const rank = document.createElement('span');
            rank.className = 'leaderboard-rank';
            rank.textContent = `#${index + 1}`;

            const name = document.createElement('span');
            name.className = 'leaderboard-name';
            name.textContent = `${WINES[item.wine]}${SPICES[item.spice]}`;

            const score = document.createElement('span');
            score.className = 'leaderboard-score';
            score.textContent = item.score.toFixed(2);

            const uncertainty = document.createElement('div');
            uncertainty.className = 'leaderboard-uncertainty';
            uncertainty.textContent = `Uncertainty: ± ${item.uncertainty.toFixed(2)}`;

            div.appendChild(rank);
            div.appendChild(name);
            div.appendChild(score);
            div.appendChild(uncertainty);

            leaderboardList.appendChild(div);
        });
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
    }

    reset() {
        this.model.reset();
        this.selectedCells.forEach(sel => sel.cell.classList.remove('selected'));
        this.selectedCells = [];
        this.updateDisplay();
        this.updateSubmitButton();
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new WineBanditApp();
});
