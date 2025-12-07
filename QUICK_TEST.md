# Quick Verification Guide

This guide helps you verify that the web app delivers the tested performance.

## Automated Tests

Run the full test suite:
```bash
node test.js
```

Expected: **20/20 tests passing** ✅

Run the UI integration test:
```bash
node test-ui-integration.js
```

Expected output:
- ✅ Best combination identified after 50 comparisons
- ✅ Perfect ranking after 100 comparisons
- ✅ Wine rankings correct (A > B > C)
- ✅ Uncertainty decreases with more data

## Manual UI Verification

### Quick Test (5 minutes)

1. **Open the app**: Open `index.html` in your browser

2. **Make 20 comparisons**:
   - Click any two cells to select them
   - Choose which combination you prefer
   - Repeat 20 times (takes ~3 minutes)

3. **Check results**:
   - ✅ Leaderboard should show clear top/bottom rankings
   - ✅ Uncertainty should be lower than initial (started at ±10.00)
   - ✅ Scores should update after each comparison
   - ✅ If you have clear preferences, best should emerge

### Expected Behavior at Different Stages

**After 5 comparisons:**
- Some combinations have non-zero scores
- High uncertainty (±8-9)
- Rankings are tentative

**After 20 comparisons:**
- Clear winner emerging (if preferences are strong)
- Uncertainty around ±7-8
- Bottom tier identifiable

**After 50 comparisons:**
- Reliable top 3 ranking
- Uncertainty around ±6-7
- Most combinations have clear scores

**After 100 comparisons:**
- Full reliable ranking
- Uncertainty around ±5-6
- Confident recommendations

## What to Look For

### ✅ Good Signs

- **Immediate updates**: Scores and uncertainties change after each comparison
- **Monotonic improvement**: Rankings become more stable over time
- **Decreasing uncertainty**: Uncertainty values go down as you add comparisons
- **Sensible rankings**: If you consistently prefer Wine A + Spice 1, it should rank high
- **No crashes**: App handles all comparisons smoothly

### ⚠️ Warning Signs

- **No updates**: Scores don't change after comparisons
- **NaN or Infinity**: Invalid scores appearing
- **Increasing uncertainty**: Uncertainty going up (shouldn't happen)
- **Random rankings**: Rankings completely inconsistent with your choices

## Simulation Test

Want to see it work without manual clicking? Run the integration test:

```bash
node test-ui-integration.js
```

This simulates a user with known preferences and verifies:
1. Model correctly identifies the best combination
2. Rankings improve with more comparisons
3. Uncertainty calibration works
4. Wine and spice effects are recovered correctly

## Performance Validation

The integration test proves:

| Comparisons | Best Identified | Worst Identified | Wine Ranking | Spice Ranking |
|-------------|----------------|------------------|--------------|---------------|
| 20          | Usually ✅      | Sometimes ✅     | Top/bottom ✅ | Top/bottom ✅  |
| 50          | Always ✅       | Usually ✅       | Complete ✅   | Partial ✅     |
| 100         | Always ✅       | Always ✅        | Perfect ✅    | Perfect ✅     |

## Troubleshooting

**Q: Scores aren't updating after comparisons**
- Check browser console for errors
- Verify model.js and app.js are loaded correctly
- Try refreshing the page

**Q: Uncertainty seems too high after many comparisons**
- This is expected due to model identifiability
- Focus on *relative* scores rather than absolute values
- The *differences* in uncertainty should decrease

**Q: Rankings seem random**
- With fewer than 20 comparisons, rankings can be noisy
- Make sure you're making consistent choices
- Try the integration test to see it work with known ground truth

**Q: How do I know it's working correctly?**
- Run `node test-ui-integration.js` - if it passes, the model works
- After 30-50 real comparisons, you should see clear patterns
- The leaderboard should match your intuitive sense of preferences

## Advanced: Viewing Raw Parameters

Open browser console and type:
```javascript
app.model.params
```

This shows:
- First 3 values: Wine effects [A, B, C]
- Last 4 values: Spice effects [1, 2, 3, 4]

Higher values = better preference

Example:
```javascript
[1.5, 0.2, -1.8, 0.9, 0.3, -0.4, -0.8]
//  ^    ^    ^    ^    ^    ^     ^
//  A    B    C    1    2    3     4

// Wine A is best (1.5)
// Wine C is worst (-1.8)
// Spice 1 is best (0.9)
// Spice 4 is worst (-0.8)
```

## Success Criteria

✅ All automated tests pass (20/20)
✅ Integration test shows correct rankings
✅ Manual testing shows sensible results
✅ Uncertainty decreases over time
✅ No errors in browser console

If all these check out, **the app is working correctly!** 🎉
