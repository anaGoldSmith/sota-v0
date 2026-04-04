

## Relocate Rotational Element Control in DA Edit Mode

### Problem
The "Rotational Element" bar with the Change button sits **below** the apparatus table, which is 500px tall with scrolling. Users editing a DA with a rotation criterion may never see it.

### Analysis of Options

**Option A — Inside the Cr7R cell**: The criterion cells are tiny (70px wide), and the table has sticky headers + scrolling. Fitting a button or label inside a data cell would break the table layout and look cramped. Not recommended.

**Option B — In the header below the Cr7R column symbol**: The header row is sticky (always visible). We can add a small clickable element beneath the rotation symbol in the Cr7R column header **only when editing a DA with a rotational element**. This keeps it always visible and contextually placed. However, the header cells are also narrow (70px), so fitting a full element name is tricky.

**Recommended: Option B (adapted)** — Place a compact indicator in the sticky header area, but implement it as a **banner row below the sticky header** or as part of the existing dialog layout **above the table** (between search/collapsibles and the table itself). Since the rotational element bar is already rendered in the right place structurally (line 949), the real fix is ensuring it appears **above** the table, not below it.

Looking at the code: the rotational element bar (lines 949-967) is rendered **after** `<ApparatusTable>` (line 937-947), which means it appears below the 500px scrollable table. Simply moving it **before** the `<ApparatusTable>` component will place it above the table where it's always visible without scrolling.

### Plan

**File**: `src/components/routine/ApparatusSelectionDialog.tsx`

1. Move the rotational element display block (lines 949-967) to **before** the `<ApparatusTable>` component (before line 937), so it sits between any info sections and the table itself. This ensures it is always visible at the top of the content area without needing to scroll past the table.

This is the simplest, most effective fix — no changes to the table component needed.

