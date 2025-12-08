/**
 * Wine Bandit Configuration
 *
 * Customize the wines and spice mixes for your tasting experiment.
 *
 * WINES: Array of wine labels (letters). Supported: 1-6 wines.
 * SPICES: Array of spice mix labels (numbers or names). Supported: 1-6 spices.
 *
 * Examples:
 *   WINES: ['A', 'B', 'C'] - 3 wines labeled A, B, C
 *   WINES: ['A', 'B', 'C', 'D', 'E', 'F'] - 6 wines
 *   SPICES: ['1', '2', '3', '4'] - 4 spice mixes
 *   SPICES: ['Cinnamon', 'Nutmeg', 'Clove'] - 3 named spice mixes
 */

const CONFIG = {
    // Wine labels (1-6 supported)
    WINES: ['A', 'B', 'C'],

    // Spice mix labels (1-6 supported)
    SPICES: ['1', '2', '3', '4']
};

// Validation
if (CONFIG.WINES.length < 1 || CONFIG.WINES.length > 6) {
    throw new Error('CONFIG.WINES must have 1-6 items');
}
if (CONFIG.SPICES.length < 1 || CONFIG.SPICES.length > 6) {
    throw new Error('CONFIG.SPICES must have 1-6 items');
}

// Export for use in app
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
