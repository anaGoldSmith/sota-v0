

## Problem

The "Routine Elements" column currently displays all acrobatic element names joined by " + " in a single string. With many elements, this creates an excessively long row that breaks the layout (as shown in the screenshot).

## Approach: Truncate with count indicator

Display at most **2 element names** in the main row, followed by a "+N more" indicator if there are additional elements. The full list is already available in the expandable dropdown.

**Example outputs:**
- 1 element: `Chaine`
- 2 elements: `Chaine + Walkover forward`
- 3 elements: `Chaine + Walkover forward (+1 more)`
- 5 elements: `Chaine + Walkover forward (+3 more)`

This keeps the row compact while still giving context about what's in it. The user can expand the row to see the full breakdown.

## Technical changes

**Single file: `src/pages/RoutineCalculator.tsx`**

1. **Line ~476** — Replace the direct `element.dbData?.name` render for Acro type with truncation logic:
   - Parse `acroDetails` from `originalData` to get element names
   - Show first 2 names joined by " + "
   - If more than 2, append a muted "(+N more)" text
   - Fall back to `element.dbData?.name` if no `acroDetails` available

No changes needed to the data model — `acroDetails` and full `combinedName` are still stored as-is for the dropdown breakdown and edit flow.

