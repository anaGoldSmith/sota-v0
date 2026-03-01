

## Thr2 + Thr6 Combo: Bidirectional Support

### Summary
When Thr6 is selected, add an expandable sub-section below the Thr6 row that lets the user add an extra throw. This opens the existing throw dropdown but with only Thr2 selectable -- all other throw types are displayed but greyed out and unclickable. Combined with the existing plan for Thr2-first selection, this enables the combo from both directions.

### How It Works for the User

1. User selects **Thr6** from the throw dropdown (value 0.1)
2. Below the Thr6 rotation specification, a button appears: **"+ Add extra throw type"**
3. Clicking it opens the throw dropdown, but:
   - **Thr2** is selectable (normal styling, clickable)
   - **All other throws** (Thr1, Thr3, Thr4, Thr5, etc.) are displayed in light grey, unclickable
   - "Throw during DB" option is also greyed out
4. Selecting Thr2 adds it as a paired sub-row below Thr6, showing Thr2's name + value (0.1)
5. The throw section total becomes 0.2 (Thr6: 0.1 + Thr2: 0.1)
6. Thr2's auto-added criteria (Cr1V, Cr2H) are added to throw criteria as usual
7. User can remove the Thr2 pairing via an X button

### Technical Changes (all in `src/pages/CreateCustomRisk.tsx`)

**1. New state**
- `extraThrow: DynamicThrow | null` -- stores the paired Thr2 when added via Thr6
- `showExtraThrowDropdown: boolean` -- controls visibility of the extra throw dropdown

**2. UI: Expandable sub-section under Thr6 row**
- After the Thr6 rotation specification block (line ~2461), add:
  - If `extraThrow` is null: a dashed button "+ Add extra throw type"
  - If `extraThrow` is set: a sub-row showing Thr2's symbol, name, value (0.1), and an X remove button
- The "+ Add extra throw type" button sets `showExtraThrowDropdown = true`

**3. Extra throw dropdown**
- Reuse the same dropdown structure as the main throw dropdown (lines 2133-2222)
- For each throw item: if `throwItem.code !== 'Thr2'`, apply `opacity-40 cursor-not-allowed` styling and block clicks
- The "Throw during DB" option is also greyed out
- On selecting Thr2: set `extraThrow` to the Thr2 item, close dropdown, and auto-add Cr1V/Cr2H criteria (reuse existing logic from `handleSelectThrow` for Thr2)

**4. Value calculation update**
- When `selectedThrow?.code === 'Thr6' && extraThrow?.code === 'Thr2'`:
  - `throwValue = 0.1 + 0.1 = 0.2` (or sum both values)
- Display the combined value with a popover breakdown (similar to "Throw during DB" breakdown)

**5. Reset logic**
- When user removes Thr6 (clears selectedThrow): also reset `extraThrow = null`
- When user removes the extra Thr2: set `extraThrow = null` and remove auto-added Cr1V/Cr2H from throwCriteria
- When user changes throw to something other than Thr6: reset `extraThrow = null`

**6. Save/load**
- When saving: if `extraThrow` exists, include both Thr6 and Thr2 components in the risk data
- When loading existing risk: detect Thr6 + Thr2 combo and restore `extraThrow` state

**7. Symmetry with Thr2-first direction**
- When Thr2 is selected first, show "+ Add throw during rotation (Thr6)" sub-section (from the earlier plan)
- Both paths result in the same state: Thr2 + Thr6 paired, total throw value 0.2
- The Thr6 rotation spec UI appears in both cases

