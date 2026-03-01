

## Dive Leap + Roll Forward Validation Rules

### Summary
Update the Dive Leap business logic so that "Dive Leap" (which inherently includes a forward roll) can form a valid risk when paired with a "Roll forward" element, and add a helpful prompt dialog when a user selects Dive Leap.

### New Business Rules

**1. Dive Leap + Roll Forward = Valid Risk (R2)**
- When Dive Leap is in the **Throw section** (Thr6 spec) and the user adds "Roll forward" as the first rotation entry in the **Rotations section**, the risk is valid (R2: dive leap roll + roll forward).
- When Dive Leap is in the **Rotations section** as the first entry and is immediately followed by a "Roll forward" (as single, two-base, or series), the risk is valid.
- **Exception**: If Dive Leap is preceded by a "Throw during rotation" or "Throw during DB" (i.e., Dive Leap is NOT the first rotation overall), Dive Leap does NOT count as a valid rotation. In this case, the user must have two base rotations or a series independently (the existing warning dialog handles this).

**2. Dive Leap Prompt Dialog**
- When a user selects "Dive Leap" as a pre-acrobatic element **only in the Throw section (Thr6) or as the first entry in the Rotations section** (and not when dive leap follows a throw-during-rotation/DB), show a confirmation dialog:
  > "You are about to add a dive leap that already includes a forward roll. To make the risk valid, would you like to add another roll forward?"
  - **"Yes, add"**: Adds the Dive Leap AND automatically adds a single rotation entry with "Roll forward" pre-acrobatic element to the Rotations section.
  - **"No"**: Adds only the Dive Leap and returns the user to the risk constructor.

### Technical Changes

**File: `src/pages/CreateCustomRisk.tsx`**

1. **Add state for Dive Leap prompt dialog**
   - `showDiveLeapPrompt` (boolean) and `pendingDiveLeapContext` (to track where the dive leap was selected: throw spec or rotation entry ID).

2. **Intercept Dive Leap selection**
   - In the Throw section's pre-acrobatic dialog `onSelect` handler (for Thr6 rotation spec): when "Dive Leap" is selected, show the prompt dialog instead of immediately applying.
   - In `handleSelectPreAcrobaticElement`: when "Dive Leap" is selected for a rotation entry that will be at position 0 (first rotation) and no throw-during-rotation/DB exists, show the prompt dialog.

3. **"Yes, add" handler**
   - Apply the pending Dive Leap selection.
   - Find "Roll forward" from the `preAcrobaticElements` array (by name match).
   - Auto-add a new single rotation entry (`type: 'one'`, `specificationType: 'pre-acrobatic'`, `selectedPreAcrobaticElement: rollForward`).

4. **Update `validateRotationConfiguration`**
   - Add a specific check: if Dive Leap is in Throw and the first rotation entry in Rotations is "Roll forward" (any type: one/two/series), return valid.
   - If Dive Leap is in Rotations (first position) and immediately followed by "Roll forward" (any type), return valid.
   - Keep existing logic: if Dive Leap follows a rotation-based throw, it doesn't count (existing warning dialog path).

5. **Dive Leap prompt dialog UI**
   - New `<Dialog>` component with the message text, "Yes, add" and "No" buttons.

