/**
 * Bayesian Bradley-Terry Model with Factorial or Independent Structure
 * Uses Laplace Approximation for uncertainty estimation
 */

class BayesianBradleyTerry {
    constructor(numWines = 3, numSpices = 4, modelType = 'factorial') {
        this.numWines = numWines;
        this.numSpices = numSpices;
        this.modelType = modelType; // 'factorial' or 'independent'

        // Set number of parameters based on model type
        if (modelType === 'factorial') {
            // Factorial: wine effects + spice effects
            this.numParams = numWines + numSpices;
        } else if (modelType === 'independent') {
            // Independent: one parameter per combination
            this.numParams = numWines * numSpices;
        } else {
            throw new Error(`Unknown model type: ${modelType}`);
        }

        // Prior parameters
        this.priorMean = 0;
        this.priorPrecision = 0.01; // Small precision = large variance (very weak prior)

        // Model parameters
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
        if (this.modelType === 'factorial') {
            return this.params[wineIdx] + this.params[this.numWines + spiceIdx];
        } else {
            // Independent: direct indexing
            const idx = wineIdx * this.numSpices + spiceIdx;
            return this.params[idx];
        }
    }

    /**
     * Get uncertainty for a wine-spice combination
     */
    getUncertainty(wineIdx, spiceIdx) {
        if (this.modelType === 'factorial') {
            const wineVar = this.uncertainties[wineIdx] ** 2;
            const spiceVar = this.uncertainties[this.numWines + spiceIdx] ** 2;
            return Math.sqrt(wineVar + spiceVar);
        } else {
            // Independent: direct uncertainty
            const idx = wineIdx * this.numSpices + spiceIdx;
            return this.uncertainties[idx];
        }
    }

    /**
     * Add a comparison result
     */
    addComparison(wine1, spice1, wine2, spice2, winner, notes = '', timestamp = null) {
        this.comparisons.push({
            wine1, spice1, wine2, spice2, winner, notes,
            timestamp: timestamp || new Date().toISOString()
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

            if (this.modelType === 'factorial') {
                // Gradient for wine and spice effects
                grad[comp.wine1] += error;
                grad[this.numWines + comp.spice1] += error;
                grad[comp.wine2] -= error;
                grad[this.numWines + comp.spice2] -= error;
            } else {
                // Independent: gradient for each arm
                const idx1 = comp.wine1 * this.numSpices + comp.spice1;
                const idx2 = comp.wine2 * this.numSpices + comp.spice2;
                grad[idx1] += error;
                grad[idx2] -= error;
            }
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

            let indices1, indices2;

            if (this.modelType === 'factorial') {
                // Indices of parameters involved
                const idx1Wine = comp.wine1;
                const idx1Spice = this.numWines + comp.spice1;
                const idx2Wine = comp.wine2;
                const idx2Spice = this.numWines + comp.spice2;

                indices1 = [idx1Wine, idx1Spice];
                indices2 = [idx2Wine, idx2Spice];
            } else {
                // Independent: single index per arm
                const idx1 = comp.wine1 * this.numSpices + comp.spice1;
                const idx2 = comp.wine2 * this.numSpices + comp.spice2;

                indices1 = [idx1];
                indices2 = [idx2];
            }

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
     * Generate random normal sample (Box-Muller transform)
     */
    randomNormal() {
        const u1 = Math.random();
        const u2 = Math.random();
        return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    }

    /**
     * Cholesky decomposition: find L such that L*L^T = A
     * Returns lower triangular matrix L
     */
    choleskyDecomposition(A) {
        const n = A.length;
        const L = Array(n).fill(null).map(() => Array(n).fill(0));

        for (let i = 0; i < n; i++) {
            for (let j = 0; j <= i; j++) {
                let sum = 0;
                for (let k = 0; k < j; k++) {
                    sum += L[i][k] * L[j][k];
                }

                if (i === j) {
                    const val = A[i][i] - sum;
                    L[i][j] = Math.sqrt(Math.max(val, 1e-10)); // Ensure positive
                } else {
                    L[i][j] = (A[i][j] - sum) / Math.max(L[j][j], 1e-10);
                }
            }
        }

        return L;
    }

    /**
     * Compute probability that each combination is best using Monte Carlo sampling
     * Returns array of probabilities (one per combination)
     */
    computeProbabilityBest(numSamples = 1000) {
        const numCombos = this.numWines * this.numSpices;

        // If no data, return uniform probabilities
        if (this.comparisons.length === 0) {
            return Array(numCombos).fill(1 / numCombos);
        }

        // Get covariance matrix from Hessian
        const H = this.computeHessian();
        const covMatrix = this.invertMatrix(H);

        // Cholesky decomposition for sampling
        let L;
        try {
            L = this.choleskyDecomposition(covMatrix);
        } catch (e) {
            // If Cholesky fails, fall back to diagonal approximation
            L = Array(this.numParams).fill(null).map((_, i) =>
                Array(this.numParams).fill(null).map((_, j) =>
                    i === j ? Math.sqrt(Math.max(covMatrix[i][i], 0)) : 0
                )
            );
        }

        // Count how many times each combination is best
        const counts = Array(numCombos).fill(0);

        for (let sample = 0; sample < numSamples; sample++) {
            // Sample from N(0, I)
            const z = Array(this.numParams).fill(0).map(() => this.randomNormal());

            // Transform to N(params, covMatrix) using params + L*z
            const sampledParams = Array(this.numParams);
            for (let i = 0; i < this.numParams; i++) {
                let sum = this.params[i];
                for (let j = 0; j < this.numParams; j++) {
                    sum += L[i][j] * z[j];
                }
                sampledParams[i] = sum;
            }

            // Find which combination has max score in this sample
            let maxScore = -Infinity;
            let maxIdx = 0;

            let idx = 0;
            for (let w = 0; w < this.numWines; w++) {
                for (let s = 0; s < this.numSpices; s++) {
                    const score = sampledParams[w] + sampledParams[this.numWines + s];
                    if (score > maxScore) {
                        maxScore = score;
                        maxIdx = idx;
                    }
                    idx++;
                }
            }

            counts[maxIdx]++;
        }

        // Convert counts to probabilities
        return counts.map(c => c / numSamples);
    }

    /**
     * Compute probability that each combination beats a reference combination
     * Returns array of probabilities
     */
    computeProbabilityBeatReference(refWine, refSpice, numSamples = 1000) {
        const numCombos = this.numWines * this.numSpices;

        // If no data, return 0.5 for all (except reference which is 0)
        if (this.comparisons.length === 0) {
            return Array(numCombos).fill(0.5).map((p, i) => {
                const w = Math.floor(i / this.numSpices);
                const s = i % this.numSpices;
                return (w === refWine && s === refSpice) ? 0 : 0.5;
            });
        }

        // Get covariance matrix
        const H = this.computeHessian();
        const covMatrix = this.invertMatrix(H);

        // Cholesky decomposition
        let L;
        try {
            L = this.choleskyDecomposition(covMatrix);
        } catch (e) {
            L = Array(this.numParams).fill(null).map((_, i) =>
                Array(this.numParams).fill(null).map((_, j) =>
                    i === j ? Math.sqrt(Math.max(covMatrix[i][i], 0)) : 0
                )
            );
        }

        // Count how many times each combination beats reference
        const counts = Array(numCombos).fill(0);

        for (let sample = 0; sample < numSamples; sample++) {
            const z = Array(this.numParams).fill(0).map(() => this.randomNormal());

            const sampledParams = Array(this.numParams);
            for (let i = 0; i < this.numParams; i++) {
                let sum = this.params[i];
                for (let j = 0; j < this.numParams; j++) {
                    sum += L[i][j] * z[j];
                }
                sampledParams[i] = sum;
            }

            // Reference score
            const refScore = sampledParams[refWine] + sampledParams[this.numWines + refSpice];

            // Check each combination
            let idx = 0;
            for (let w = 0; w < this.numWines; w++) {
                for (let s = 0; s < this.numSpices; s++) {
                    const score = sampledParams[w] + sampledParams[this.numWines + s];
                    if (score > refScore) {
                        counts[idx]++;
                    }
                    idx++;
                }
            }
        }

        // Convert to probabilities
        return counts.map(c => c / numSamples);
    }

    /**
     * Compute probability that each wine is the best wine
     * Returns array of probabilities for each wine
     */
    computeProbabilityBestWine(numSamples = 1000) {
        if (this.comparisons.length === 0) {
            return Array(this.numWines).fill(1 / this.numWines);
        }

        const H = this.computeHessian();
        const covMatrix = this.invertMatrix(H);

        let L;
        try {
            L = this.choleskyDecomposition(covMatrix);
        } catch (e) {
            L = Array(this.numParams).fill(null).map((_, i) =>
                Array(this.numParams).fill(null).map((_, j) =>
                    i === j ? Math.sqrt(Math.max(covMatrix[i][i], 0)) : 0
                )
            );
        }

        const counts = Array(this.numWines).fill(0);

        for (let sample = 0; sample < numSamples; sample++) {
            const z = Array(this.numParams).fill(0).map(() => this.randomNormal());

            const sampledParams = Array(this.numParams);
            for (let i = 0; i < this.numParams; i++) {
                let sum = this.params[i];
                for (let j = 0; j < this.numParams; j++) {
                    sum += L[i][j] * z[j];
                }
                sampledParams[i] = sum;
            }

            // Find which wine has max effect
            const wineEffects = sampledParams.slice(0, this.numWines);
            const maxIdx = wineEffects.indexOf(Math.max(...wineEffects));
            counts[maxIdx]++;
        }

        return counts.map(c => c / numSamples);
    }

    /**
     * Compute probability that each spice is the best spice
     * Returns array of probabilities for each spice
     */
    computeProbabilityBestSpice(numSamples = 1000) {
        if (this.comparisons.length === 0) {
            return Array(this.numSpices).fill(1 / this.numSpices);
        }

        const H = this.computeHessian();
        const covMatrix = this.invertMatrix(H);

        let L;
        try {
            L = this.choleskyDecomposition(covMatrix);
        } catch (e) {
            L = Array(this.numParams).fill(null).map((_, i) =>
                Array(this.numParams).fill(null).map((_, j) =>
                    i === j ? Math.sqrt(Math.max(covMatrix[i][i], 0)) : 0
                )
            );
        }

        const counts = Array(this.numSpices).fill(0);

        for (let sample = 0; sample < numSamples; sample++) {
            const z = Array(this.numParams).fill(0).map(() => this.randomNormal());

            const sampledParams = Array(this.numParams);
            for (let i = 0; i < this.numParams; i++) {
                let sum = this.params[i];
                for (let j = 0; j < this.numParams; j++) {
                    sum += L[i][j] * z[j];
                }
                sampledParams[i] = sum;
            }

            // Find which spice has max effect
            const spiceEffects = sampledParams.slice(this.numWines, this.numWines + this.numSpices);
            const maxIdx = spiceEffects.indexOf(Math.max(...spiceEffects));
            counts[maxIdx]++;
        }

        return counts.map(c => c / numSamples);
    }

    /**
     * Compute decision consistency: average predicted probability of actual winner
     * Returns a value between 0 and 1 (higher = more consistent decisions)
     */
    computeDecisionConsistency() {
        if (this.comparisons.length === 0) {
            return 1.0; // Perfect consistency with no data
        }

        let totalProb = 0;
        for (const comp of this.comparisons) {
            const score1 = this.getScore(comp.wine1, comp.spice1);
            const score2 = this.getScore(comp.wine2, comp.spice2);
            const diff = score1 - score2;

            // Probability that combo 1 wins
            const prob1 = this.sigmoid(diff);

            // Add the probability of the actual winner
            if (comp.winner === 1) {
                totalProb += prob1;
            } else {
                totalProb += (1 - prob1);
            }
        }

        return totalProb / this.comparisons.length;
    }

    /**
     * Estimate decision noise parameter (σ) via calibration
     * Returns the scale parameter for the logistic model
     * Higher σ = more noise/inconsistency in decisions
     *
     * NOTE: The fitted scores already assume σ=1, so we estimate the "effective" σ
     * by finding the scale that makes predictions well-calibrated.
     */
    estimateNoiseParameter() {
        if (this.comparisons.length === 0) {
            return 1.0; // Default noise level
        }

        // Compute squared prediction errors
        let sumSquaredError = 0;
        let sumAbsDiff = 0;
        let count = 0;

        for (const comp of this.comparisons) {
            const score1 = this.getScore(comp.wine1, comp.spice1);
            const score2 = this.getScore(comp.wine2, comp.spice2);
            const diff = score1 - score2;

            // Predicted probability that combo 1 wins (with σ=1)
            const predProb = this.sigmoid(diff);

            // Actual outcome (1 if combo1 won, 0 otherwise)
            const actual = comp.winner === 1 ? 1 : 0;

            // Brier score component
            sumSquaredError += (predProb - actual) ** 2;

            // Also track absolute score differences for scaling
            sumAbsDiff += Math.abs(diff);
            count++;
        }

        // Estimate σ based on prediction error
        // Higher error => higher noise
        // We use a calibration-based approach:
        const brierScore = sumSquaredError / count;
        const avgAbsDiff = sumAbsDiff / count;

        // If Brier score is high (close to 0.25 = random), σ is high
        // If Brier score is low (close to 0 = perfect), σ is low
        // Map Brier score [0, 0.25] to σ [0.3, 3.0] approximately
        // Use average abs diff as a scale factor

        // Estimate σ based on both Brier score and score magnitude
        // High Brier + low avgDiff => very high noise (scores are compressed)
        // Low Brier + high avgDiff => low noise (scores are well-separated)

        // Compute inverse relationship: σ ∝ brierScore / avgDiff
        // But also account for baseline noise
        const brierRatio = Math.min(brierScore / 0.15, 1.0); // Normalize to [0,1]

        if (avgAbsDiff < 0.1) {
            // Scores are very compressed => high noise
            return Math.min(3.0, 1.0 + brierRatio * 2.0);
        }

        // σ ≈ (brierScore / (avgAbsDiff/2))^0.7 * scalingFactor
        // This gives higher σ when prediction error is high relative to score separation
        const rawSigma = Math.pow(brierScore / Math.max(avgAbsDiff * 0.4, 0.1), 0.7) * 2.0;

        // Clamp to reasonable range
        return Math.max(0.2, Math.min(4.0, rawSigma));
    }

    /**
     * Reset the model
     */
    reset() {
        this.params = new Array(this.numParams).fill(0);
        this.uncertainties = new Array(this.numParams).fill(10.0);
        this.comparisons = [];
    }

    /**
     * Switch model type and refit
     */
    switchModelType(newModelType) {
        if (newModelType === this.modelType) {
            return; // Already using this model type
        }

        this.modelType = newModelType;

        // Update number of parameters
        if (newModelType === 'factorial') {
            this.numParams = this.numWines + this.numSpices;
        } else {
            this.numParams = this.numWines * this.numSpices;
        }

        // Reset parameters and refit
        this.params = new Array(this.numParams).fill(0);
        this.uncertainties = new Array(this.numParams).fill(10.0);

        if (this.comparisons.length > 0) {
            this.fit();
        }
    }

    /**
     * Compute log-likelihood of the current model
     * (Higher is better)
     */
    computeLogLikelihood() {
        if (this.comparisons.length === 0) {
            return 0;
        }

        let ll = 0;
        for (const comp of this.comparisons) {
            const score1 = this.getScore(comp.wine1, comp.spice1);
            const score2 = this.getScore(comp.wine2, comp.spice2);
            const diff = score1 - score2;

            const prob = this.sigmoid(diff);

            if (comp.winner === 1) {
                ll += Math.log(Math.max(prob, 1e-10));
            } else {
                ll += Math.log(Math.max(1 - prob, 1e-10));
            }
        }

        return ll;
    }
}

// Export for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BayesianBradleyTerry };
}
