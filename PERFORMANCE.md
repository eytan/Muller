# Performance Analysis Across Sample Sizes

This document summarizes the Bayesian Bradley-Terry model's performance with different numbers of pairwise comparisons.

## TL;DR

- **20 comparisons**: Can identify clear winners and losers
- **50 comparisons**: Reasonable rankings (60%+ correlation)
- **100+ comparisons**: High accuracy rankings (80%+ correlation)

## Detailed Performance by Sample Size

### 20 Comparisons (Test 16)

**What works:**
- ✅ Identifies the best combination when preferences are clear (large effect sizes)
- ✅ Identifies worst combinations (bottom 25%)
- ✅ Useful for quick initial exploration

**Limitations:**
- Rank correlations vary widely depending on signal strength
- Uncertainty estimates are high
- May not distinguish between middle-tier options well

**Best use case:** Quick screening to find obvious winners/losers

### 30 Comparisons (Test 20)

**What works:**
- ✅ Reliably identifies the best wine when wine effects are strong
- ✅ Reliably identifies the worst wine
- ✅ Good balance between speed and accuracy for clear signals

**Best use case:** Finding the best wine when wines differ substantially

### 50 Comparisons (Test 17)

**What works:**
- ✅ Wine rank correlation ≥ 60%
- ✅ Spice rank correlation ≥ 40%
- ✅ Top combination appears in top 3 rankings
- ✅ Uncertainty estimates become more reliable
- ✅ Can distinguish between tiers of quality

**Limitations:**
- Finer distinctions (e.g., between similar spices) may still be noisy
- Parameter estimates have moderate uncertainty

**Best use case:** General-purpose exploration with reasonable accuracy

### 100 Comparisons (Tests 4-14)

**What works:**
- ✅ Wine rank correlation ≥ 80%
- ✅ Spice rank correlation ≥ 60-80%
- ✅ Reliable identification of best and worst combinations
- ✅ Good uncertainty quantification
- ✅ Converged parameter estimates
- ✅ Handles complex preference patterns

**Limitations:**
- Some variance in exact parameter values (identifiability)
- Very subtle differences may require more data

**Best use case:** Comprehensive ranking with high confidence

### 500+ Comparisons (Tests 7, 15)

**What works:**
- ✅ Rank correlation ≥ 90%
- ✅ Very accurate parameter estimates
- ✅ Tight uncertainty bounds
- ✅ Reliable relative effect sizes
- ✅ Can detect subtle preferences

**Best use case:** Research-grade accuracy, final verification

## Progressive Improvement (Test 18)

The model demonstrates progressive improvement as data accumulates:

```
20 comparisons  → Initial rankings
50 comparisons  → Solidified top/bottom tiers
100 comparisons → Accurate full ranking
500 comparisons → Research-grade precision
```

Rankings are **monotonically improving** (modulo sampling noise), meaning more data always helps.

## Uncertainty Calibration (Test 19)

The Laplace approximation properly reflects epistemic uncertainty:

- **20 comparisons**: High uncertainty (reflects true ignorance)
- **100 comparisons**: Moderate uncertainty
- **500+ comparisons**: Low uncertainty

This makes the model suitable for **uncertainty-aware decision making**.

## Factorial Structure Benefits (Test 12)

The factorial model (score = wine_effect + spice_effect) is particularly efficient:

- **12 combinations** but only **7 parameters** to estimate
- Learns faster than independent models
- Automatically shares information across combinations
- With 50 comparisons, achieves 70%+ rank correlation for both wines and spices

## Recommendations

| Comparisons | Use Case | Expected Accuracy |
|------------|----------|-------------------|
| 20-30 | Quick screening, find clear winners | Best/worst identification |
| 50-75 | General exploration | 60-70% rank correlation |
| 100-200 | Reliable rankings | 80%+ rank correlation |
| 500+ | Research/final verification | 90%+ rank correlation |

## Robustness

The model handles challenging scenarios:

- ✅ **Contradictory comparisons** (Test 11): Averages conflicting evidence
- ✅ **Extreme preferences** (Test 13): Maintains numerical stability
- ✅ **Noisy data**: Bradley-Terry likelihood naturally handles noise
- ✅ **Sparse coverage**: Factorial structure shares information

## Technical Notes

- **Convergence**: Gradient descent typically converges in <500 iterations
- **Optimization**: Momentum-based with adaptive learning rate
- **Uncertainty**: Laplace approximation (Hessian inverse)
- **Prior**: Very weak Gaussian (precision = 0.01)

## Example Workflow

1. **Exploration (20 comparisons)**: Test each wine with multiple spices, identify obvious winners
2. **Refinement (30 more comparisons)**: Focus on promising combinations
3. **Validation (50 more comparisons)**: Get reliable full ranking

Total: ~100 comparisons for high-quality results.
