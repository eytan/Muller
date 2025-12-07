/**
 * Bayesian Bradley-Terry Model with Factorial Structure
 * Uses Laplace Approximation for uncertainty estimation
 */

class BayesianBradleyTerry {
    constructor(numWines = 3, numSpices = 4) {
        this.numWines = numWines;
        this.numSpices = numSpices;
        this.numParams = numWines + numSpices;

        // Prior parameters
        this.priorMean = 0;
        this.priorPrecision = 0.01; // Small precision = large variance (very weak prior)

        // Model parameters (wine effects + spice effects)
        this.params = new Array(this.numParams).fill(0);

        // Uncertainty estimates (standard deviations)
        this.uncertainties = new Array(this.numParams).fill(10.0);

        // Training data
        this.comparisons = [];

        // Optimization settings
        this.learningRate = 0.2;
        this.maxIterations = 3000;
        this.convergenceThreshold = 1e-5;
    }

    /**
     * Get score for a wine-spice combination
     */
    getScore(wineIdx, spiceIdx) {
        return this.params[wineIdx] + this.params[this.numWines + spiceIdx];
    }

    /**
     * Get uncertainty for a wine-spice combination
     */
    getUncertainty(wineIdx, spiceIdx) {
        const wineVar = this.uncertainties[wineIdx] ** 2;
        const spiceVar = this.uncertainties[this.numWines + spiceIdx] ** 2;
        return Math.sqrt(wineVar + spiceVar);
    }

    /**
     * Add a comparison result
     */
    addComparison(wine1, spice1, wine2, spice2, winner) {
        this.comparisons.push({
            wine1, spice1, wine2, spice2, winner
        });
        this.fit();
    }

    /**
     * Sigmoid function
     */
    sigmoid(x) {
        return 1 / (1 + Math.exp(-x));
    }

    /**
     * Compute negative log posterior (loss function)
     */
    computeLoss() {
        let loss = 0;

        // Likelihood term
        for (const comp of this.comparisons) {
            const score1 = this.getScore(comp.wine1, comp.spice1);
            const score2 = this.getScore(comp.wine2, comp.spice2);
            const diff = score1 - score2;

            if (comp.winner === 1) {
                // Winner is combination 1
                loss -= Math.log(this.sigmoid(diff) + 1e-10);
            } else {
                // Winner is combination 2
                loss -= Math.log(this.sigmoid(-diff) + 1e-10);
            }
        }

        // Prior term (L2 regularization)
        for (let i = 0; i < this.numParams; i++) {
            loss += 0.5 * this.priorPrecision * (this.params[i] - this.priorMean) ** 2;
        }

        return loss;
    }

    /**
     * Compute gradient of negative log posterior
     */
    computeGradient() {
        const grad = new Array(this.numParams).fill(0);

        // Gradient from likelihood
        for (const comp of this.comparisons) {
            const score1 = this.getScore(comp.wine1, comp.spice1);
            const score2 = this.getScore(comp.wine2, comp.spice2);
            const diff = score1 - score2;
            const prob = this.sigmoid(diff);

            // Expected winner: 1 if winner=1, 0 if winner=2
            const y = comp.winner === 1 ? 1 : 0;
            const error = prob - y;

            // Gradient for wine and spice effects
            grad[comp.wine1] += error;
            grad[this.numWines + comp.spice1] += error;
            grad[comp.wine2] -= error;
            grad[this.numWines + comp.spice2] -= error;
        }

        // Gradient from prior
        for (let i = 0; i < this.numParams; i++) {
            grad[i] += this.priorPrecision * (this.params[i] - this.priorMean);
        }

        return grad;
    }

    /**
     * Compute Hessian matrix (for Laplace approximation)
     */
    computeHessian() {
        const H = Array(this.numParams).fill(null).map(() =>
            Array(this.numParams).fill(0)
        );

        // Hessian from likelihood
        for (const comp of this.comparisons) {
            const score1 = this.getScore(comp.wine1, comp.spice1);
            const score2 = this.getScore(comp.wine2, comp.spice2);
            const diff = score1 - score2;
            const prob = this.sigmoid(diff);
            const variance = prob * (1 - prob);

            // Indices of parameters involved
            const idx1Wine = comp.wine1;
            const idx1Spice = this.numWines + comp.spice1;
            const idx2Wine = comp.wine2;
            const idx2Spice = this.numWines + comp.spice2;

            const indices1 = [idx1Wine, idx1Spice];
            const indices2 = [idx2Wine, idx2Spice];

            // Add to Hessian (second derivative of log-likelihood)
            for (const i of indices1) {
                for (const j of indices1) {
                    H[i][j] += variance;
                }
                for (const j of indices2) {
                    H[i][j] -= variance;
                }
            }
            for (const i of indices2) {
                for (const j of indices1) {
                    H[i][j] -= variance;
                }
                for (const j of indices2) {
                    H[i][j] += variance;
                }
            }
        }

        // Hessian from prior (diagonal)
        for (let i = 0; i < this.numParams; i++) {
            H[i][i] += this.priorPrecision;
        }

        return H;
    }

    /**
     * Invert a matrix using Gaussian elimination
     */
    invertMatrix(A) {
        const n = A.length;
        const result = Array(n).fill(null).map(() => Array(n).fill(0));
        const augmented = A.map((row, i) => {
            const newRow = [...row];
            for (let j = 0; j < n; j++) {
                newRow.push(i === j ? 1 : 0);
            }
            return newRow;
        });

        // Forward elimination
        for (let i = 0; i < n; i++) {
            // Find pivot
            let maxRow = i;
            for (let k = i + 1; k < n; k++) {
                if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
                    maxRow = k;
                }
            }
            [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

            // Make diagonal 1
            const pivot = augmented[i][i];
            if (Math.abs(pivot) < 1e-10) {
                // Singular matrix, return diagonal approximation
                for (let j = 0; j < n; j++) {
                    result[j][j] = 1 / (A[j][j] + 1e-6);
                }
                return result;
            }

            for (let j = 0; j < 2 * n; j++) {
                augmented[i][j] /= pivot;
            }

            // Eliminate column
            for (let k = 0; k < n; k++) {
                if (k !== i) {
                    const factor = augmented[k][i];
                    for (let j = 0; j < 2 * n; j++) {
                        augmented[k][j] -= factor * augmented[i][j];
                    }
                }
            }
        }

        // Extract inverse
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                result[i][j] = augmented[i][n + j];
            }
        }

        return result;
    }

    /**
     * Fit the model using MAP estimation with adaptive gradient descent
     */
    fit() {
        if (this.comparisons.length === 0) {
            return;
        }

        // Adaptive gradient descent with momentum
        const velocity = new Array(this.numParams).fill(0);
        const momentum = 0.9;
        let learningRate = this.learningRate;

        for (let iter = 0; iter < this.maxIterations; iter++) {
            const grad = this.computeGradient();

            // Update with momentum
            let maxGrad = 0;
            for (let i = 0; i < this.numParams; i++) {
                velocity[i] = momentum * velocity[i] - learningRate * grad[i];
                this.params[i] += velocity[i];
                maxGrad = Math.max(maxGrad, Math.abs(grad[i]));
            }

            // Adaptive learning rate decay
            if (iter % 100 === 0 && iter > 0) {
                learningRate *= 0.95;
            }

            // Check convergence
            if (maxGrad < this.convergenceThreshold) {
                break;
            }
        }

        // Laplace approximation for uncertainties
        const H = this.computeHessian();
        const covMatrix = this.invertMatrix(H);

        // Extract standard deviations
        for (let i = 0; i < this.numParams; i++) {
            this.uncertainties[i] = Math.sqrt(Math.max(0, covMatrix[i][i]));
        }
    }

    /**
     * Get all combinations sorted by score
     */
    getRanking() {
        const combinations = [];

        for (let w = 0; w < this.numWines; w++) {
            for (let s = 0; s < this.numSpices; s++) {
                combinations.push({
                    wine: w,
                    spice: s,
                    score: this.getScore(w, s),
                    uncertainty: this.getUncertainty(w, s)
                });
            }
        }

        // Sort by score (descending)
        combinations.sort((a, b) => b.score - a.score);

        return combinations;
    }

    /**
     * Reset the model
     */
    reset() {
        this.params = new Array(this.numParams).fill(0);
        this.uncertainties = new Array(this.numParams).fill(10.0);
        this.comparisons = [];
    }
}

// Export for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BayesianBradleyTerry };
}
