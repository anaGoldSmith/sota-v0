

## Plan: Routine Check Feature

### What We're Building

1. **"Rules" button** in the top-left corner of the header — opens a popup dialog showing a table of routine rules (Item Type + Requirements).

2. **"Routine Check" button** next to Save/Cancel — runs validation against the rules and shows results in a dialog.

### Rules to Validate

| Item Type | Requirement |
|-----------|-------------|
| Risks (R) | Maximum 4 |
| DA | Maximum 15 |
| Dance Steps | Minimum 2 |
| DB | Maximum 8 |
| DB - Jumps | At least 1 |
| DB - Rotations | At least 1 |
| DB - Balances | At least 1 |

### Implementation Details

**File: `src/pages/RoutineCalculator.tsx`**

1. **Header changes**: Replace the spacer `<div className="w-10" />` with a "Rules" button (using `BookOpen` or `FileText` icon). This opens a `RulesDialog`.

2. **New state variables**:
   - `showRulesDialog` — boolean for rules popup
   - `showRoutineCheckDialog` — boolean for check results popup

3. **Rules Dialog**: A simple `Dialog` with a table listing each rule (Item Type, Requirement). Static content, no DB queries needed.

4. **Routine Check logic**: A function `runRoutineCheck()` that computes:
   - **Risk count**: `routineElements.filter(el => el.type === 'R' || el.type === 'R/DB').length`
   - **DA count**: Already computed as `countDA` — check if ≤ 15
   - **Steps count**: `routineElements.filter(el => el.type === 'Steps').length` — check if ≥ 2
   - **DB count**: Already computed as `countDB` — check if ≤ 8
   - **DB groups**: Check `dbData.elementType` on DB elements for 'jump', 'rotation', 'balance' presence. For risks with DB components, check `riskData.components` for rotation tags.

5. **Routine Check Dialog**: Shows each rule with a pass/fail indicator (green checkmark or red X), the current count, and the requirement.

6. **"Routine Check" button**: Added between Cancel and Save buttons (or next to them). Uses `ClipboardCheck` icon.

### Changes Summary

- **Single file edit**: `src/pages/RoutineCalculator.tsx`
  - Add `BookOpen` and `ClipboardCheck` imports from lucide-react
  - Add two state booleans
  - Add Rules dialog JSX
  - Add Routine Check validation function + results dialog JSX
  - Add Rules button to header
  - Add Routine Check button next to Save/Cancel

