

## Problem

Symbol images uploaded as screenshots have white backgrounds. When these symbols are placed on non-white backgrounds (muted grey rows, expanded sub-tables, selection dialog cells, etc.), the white rectangle around each symbol is clearly visible and looks bad.

## Proposed Solution

Rather than trying to programmatically remove white backgrounds (which is complex and unreliable), the simplest and most effective fix is to **ensure all areas where symbols appear have a white background**. This aligns with the nature of the content (gymnastics scoring tables) where a clean white table look is appropriate.

### Changes needed:

**1. Routine Calculator main table rows** (`src/pages/RoutineCalculator.tsx`)
- Sub-rows (`bg-muted/20`) → white background
- Expanded breakdown rows (`bg-muted/10`) → white background
- Breakdown sub-table headers (`bg-muted/30`) → light white/very subtle tint
- Alternating rows in breakdowns (`bg-secondary/10`) → white or very light border separator instead

**2. Selection dialog table cells** (Jump, Rotation, Balance selection dialogs)
- Empty cells use `bg-muted/30` → keep (no symbols there)
- Symbol container divs use `bg-muted/50` → change to `bg-white`
- Selected cells with `bg-primary/20` → these are light enough, symbols look fine

**3. Apparatus Table** (`src/components/routine/ApparatusTable.tsx`)
- Collapsible child rows use `bg-muted/30` → change to white with subtle left-border indent indicator
- Selected rows `bg-primary/10` → keep (very light, acceptable)

**4. Technical Elements Selection Dialog** (`src/components/routine/TechnicalElementsSelectionDialog.tsx`)
- Any symbol containers with non-white backgrounds → white

### Files to modify:
- `src/pages/RoutineCalculator.tsx` — expanded breakdown tables, sub-rows
- `src/components/routine/JumpSelectionDialog.tsx` — symbol container bg
- `src/components/routine/RotationSelectionDialog.tsx` — symbol container bg
- `src/components/routine/BalanceSelectionDialog.tsx` — symbol container bg
- `src/components/routine/ApparatusTable.tsx` — collapsible child row bg
- `src/components/routine/TechnicalElementsSelectionDialog.tsx` — symbol containers

