# Wine Bandit - Bayesian Mulled Wine Comparison Tool

A web application for finding the best mulled wine recipe using Bayesian dueling bandits with factorial structure.

## Overview

This app uses a **Bayesian Bradley-Terry model** to learn preferences between different wine and spice combinations through pairwise comparisons. Instead of testing each combination independently, it uses a factorial model that learns wine effects and spice effects separately, allowing for more efficient exploration.

## Model Details

### Factorial Bradley-Terry Model

The model assumes that the quality score for a wine-spice combination decomposes as:

```
score(wine, spice) = wine_effect[wine] + spice_effect[spice]
```

This factorial structure means:
- 3 wines × 4 spices = 12 combinations
- But only 3 + 4 = 7 parameters to estimate
- More efficient learning with fewer comparisons needed

### Inference

**Prior**: Gaussian prior with mean 0 and small precision (0.1), giving weak regularization

**Likelihood**: Bradley-Terry model for pairwise comparisons
```
P(i beats j) = 1 / (1 + exp(score_j - score_i))
```

**Posterior**: We use:
1. **MAP Estimation**: Gradient descent to find the mode of the posterior (maximum a posteriori)
2. **Laplace Approximation**: Use the Hessian at the MAP to approximate posterior uncertainty
   - Posterior covariance ≈ (Hessian)^(-1)
   - This gives us uncertainty estimates for each parameter

### Why This Approach?

- **Fast**: Runs entirely in JavaScript, no server needed
- **Efficient**: Factorial structure means fewer comparisons needed
- **Uncertainty-aware**: Laplace approximation gives confidence intervals
- **No MCMC**: Avoids expensive sampling; gradient descent + Hessian inversion is much faster

## How to Use

1. Open `index.html` in a web browser
2. Click on two cells in the grid to select wine-spice combinations to compare
3. Click one of the winner buttons to record which combination you preferred
4. The model updates immediately with new scores and uncertainties
5. Check the leaderboard to see which combinations are best

## Features

- **Interactive Grid**: 3×4 grid for Wine (A-C) × Spice Mix (1-4)
- **Real-time Updates**: Scores and uncertainties update after each comparison
- **Leaderboard**: Ranked list of all combinations with uncertainty estimates
- **Statistics**: Track number of comparisons and most uncertain combinations
- **Persistence**: All data stays in memory (refresh to reset)

## Files

- `index.html`: Main application UI
- `model.js`: Bayesian Bradley-Terry inference engine
- `app.js`: Application logic and interaction handling
- `README.md`: This file

## Technical Notes

### Optimization

- Uses gradient descent with learning rate 0.1
- Converges when max gradient < 10^(-6)
- Max 1000 iterations (typically converges much faster)

### Uncertainty Estimation

The Laplace approximation works as follows:
1. Find MAP estimate θ* by maximizing log posterior
2. Compute Hessian H of negative log posterior at θ*
3. Approximate posterior as Gaussian: N(θ*, H^(-1))
4. For combination (w,s): uncertainty = sqrt(var(w) + var(s))

### Numerical Stability

- Uses log-space for probabilities (log-sigmoid)
- Adds small epsilon (10^(-10)) to prevent log(0)
- Checks for singular matrices in Hessian inversion
- Falls back to diagonal approximation if needed

## Future Enhancements

Possible extensions:
- Add interaction terms: `score = wine + spice + wine×spice`
- Thompson sampling for suggesting which comparisons to make next
- Export/import data as JSON
- Visualize uncertainty over time
- Add more wines/spices dynamically

## License

MIT
