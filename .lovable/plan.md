

## Fix Type 2 DA Breakdown Values

**What changes**: In the routine calculator's DA breakdown table, for Type 2 (paired) DAs, update the Value column so each base row shows its individual contribution instead of the total DA value on both rows.

### Current behavior
- Base 1 row: shows total DA value (e.g., 0.4)
- Base 2 row: shows total DA value (e.g., 0.4)
- Total row: shows total DA value (e.g., 0.4)

### New behavior
- Base 1 row (higher-value base): shows its base value (e.g., 0.3)
- Base 2 row (lower-value base): shows the extra bonus (0.1)
- Total row: shows total DA value (unchanged)

### Technical details

**File**: `src/pages/RoutineCalculator.tsx` (lines ~2800-2857)

1. Determine which combo has the higher base value and display them in order (higher first as Base 1).
2. **Base 1 value**: `Math.max(combo1.element.value, combo2.element.value)` 
3. **Base 2 value**: `0.1` (the fixed extra bonus)
4. Swap combo1/combo2 display order if combo2 has the higher value, so Base 1 always shows the dominant element.

