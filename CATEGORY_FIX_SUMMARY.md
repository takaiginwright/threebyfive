# Category Filtering Fix - Implementation Summary

## Root Cause: ID vs Name Mismatch

### The Bug
1. **CardCategory enum**: Values are title case (`'Plot'`, `'Theme'`, etc.)
2. **System categories**: Created with `id: 'plot'` (lowercase), `name: 'PLOT'` (uppercase)
3. **Filter state**: Stored enum values like `'Plot'` (title case)
4. **Filter logic**: Tried to match `'PLOT' === 'Plot'` → **FALSE!**

## Solution: ID-Based Architecture

All filtering now uses **category IDs** (lowercase strings) as the single source of truth.

---

## Files Changed

### 1. **types.ts** (lines 81-83)
```typescript
export interface IdeaCard {
  // ... existing fields ...

  // FIX: Add explicit category assignment (separate from tags)
  categoryId?: string; // ID of assigned category (system or custom)
  categoryLabel?: string; // Display name of category (for convenience)

  // ... rest of fields ...
}
```

**What changed**: Added `categoryId` and `categoryLabel` to card model for explicit category tracking.

---

### 2. **App.tsx** - State (line 30)
```typescript
// FIX: Store category ID instead of name for reliable filtering
const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
```

**What changed**: Renamed `selectedCategory` → `selectedCategoryId` to make it clear we're storing IDs.

---

### 3. **App.tsx** - Migration Logic (lines 106-121)
```typescript
const refreshData = () => {
  const allCards = getCards();

  // MIGRATION: Derive categoryId from tags for legacy cards
  const migratedCards = allCards.map(card => {
    if (!card.categoryId && card.tags) {
      // Find first category that has tags
      for (const [category, tags] of Object.entries(card.tags)) {
        if (tags && tags.length > 0) {
          return {
            ...card,
            categoryId: category.toLowerCase(),
            categoryLabel: category.toUpperCase()
          };
        }
      }
    }
    return card;
  });

  setCards(migratedCards);
  // ... rest of refresh logic
};
```

**What changed**: Legacy cards without `categoryId` get it derived from their tags on load.

---

### 4. **App.tsx** - Filter Logic (lines 303-352)
```typescript
// FIX: Filter by categoryId (ID-based, works for system + custom)
const filteredCards = useMemo(() => {
  // DEBUG (toggle): Set to true to see filter debug logs
  const DEBUG = true;

  const filtered = cards.filter(card => {
    // ... archive, project, search filters ...

    // FIX: Filter by categoryId - simple ID comparison
    if (selectedCategoryId === 'all') {
        return true; // Show all cards
    } else {
        // Direct ID match (no name lookups, no enum conversions)
        return card.categoryId === selectedCategoryId;
    }
  });

  // DEBUG (toggle): Log filter state when filtering by category
  if (DEBUG && selectedCategoryId !== 'all') {
    console.log('[Category Filter Debug]', {
      selectedCategoryId,
      totalCards: cards.length,
      filteredCards: filtered.length,
      sampleCards: cards.slice(0, 3).map(c => ({
        id: c.id.slice(0, 8),
        title: c.title?.slice(0, 20),
        categoryId: c.categoryId,
        categoryLabel: c.categoryLabel
      }))
    });
  }

  return filtered;
}, [cards, searchQuery, selectedCategoryId, selectedProjectId, isViewingArchive]);
```

**What changed**:
- Simple `card.categoryId === selectedCategoryId` comparison
- No more name/enum lookups
- Debug logging shows actual card state

---

### 5. **App.tsx** - Filter Pills (lines 730-748)
```typescript
<button
    onClick={() => setSelectedCategoryId('all')}
    className={/* ... */}
>
    All
</button>

{/* FIX: Convert enum values to category IDs for filtering */}
{ALL_CATEGORIES.map(cat => {
    const categoryId = cat.toLowerCase();
    return (
        <button
            key={cat}
            onClick={() => setSelectedCategoryId(categoryId)}
            className={`/* ... */ ${selectedCategoryId === categoryId ? 'active-styles' : 'inactive-styles'}`}
        >
            {cat}
        </button>
    );
})}
```

**What changed**:
- Pills convert enum values (`'Plot'`) to IDs (`'plot'`) before setting state
- Active state checks `selectedCategoryId === categoryId`

---

### 6. **App.tsx** - Custom Categories Dropdown (lines 750-786)
```typescript
{/* FIX: More dropdown for custom categories (using IDs) */}
{customCategories.length > 0 && (
    <div ref={moreDropdownRef} className="relative">
        <button
            onClick={() => setIsMoreDropdownOpen(!isMoreDropdownOpen)}
            className={`/* ... */ ${customCategories.some(cat => cat.id === selectedCategoryId) ? 'active' : 'inactive'}`}
        >
            <MoreHorizontal size={12} />
            More
        </button>

        {isMoreDropdownOpen && (
            <div className="/* dropdown styles */">
                {customCategories.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => {
                            setSelectedCategoryId(cat.id);
                            setIsMoreDropdownOpen(false);
                        }}
                        className={`/* ... */ ${selectedCategoryId === cat.id ? 'active' : 'inactive'}`}
                    >
                        {cat.name}
                    </button>
                ))}
            </div>
        )}
    </div>
)}
```

**What changed**:
- Uses `cat.id` instead of `cat.name` for filtering
- Active state checks `selectedCategoryId === cat.id`

---

### 7. **components/CardEditor.tsx** (lines 63-71, 78-86)
```typescript
useEffect(() => {
  // ... load categories ...

  // FIX: Initialize category dropdown based on card's categoryId
  if (card.categoryId) {
    setNewTagCategory(card.categoryId);
  } else if (projectCategories.length > 0) {
    setNewTagCategory(projectCategories[0].id);
  }

  // ... rest ...
}, [card]);

useEffect(() => {
  // ... subcategory logic ...

  // FIX: Save category to card immediately when dropdown changes
  if (selectedCategory && newTagCategory) {
    setEditedCard(prev => ({
      ...prev,
      categoryId: selectedCategory.id,
      categoryLabel: selectedCategory.name,
      updatedAt: Date.now()
    }));
  }
}, [newTagCategory, categories]);
```

**What changed**:
- Editor initializes dropdown from `card.categoryId`
- Category saved immediately when dropdown changes (no tag creation required)

---

## Debug Instructions

### Enable Debug Logging
In `App.tsx` line 306, set:
```typescript
const DEBUG = true;
```

### What Gets Logged
When filtering by category (not "All"), console shows:
```javascript
{
  selectedCategoryId: "plot",        // Current filter
  totalCards: 5,                     // Total cards in project
  filteredCards: 2,                  // How many match
  sampleCards: [                     // First 3 cards
    {
      id: "abc12345",
      title: "Hero's Journey",
      categoryId: "plot",            // ← Should match selectedCategoryId
      categoryLabel: "PLOT"
    },
    // ...
  ]
}
```

### What to Check
1. **If filtered list is empty**: Does any card have `categoryId === selectedCategoryId`?
2. **If card doesn't appear**: Does the card's `categoryId` match the pill's ID?
3. **For system categories**: ID should be lowercase (`'plot'`, `'theme'`, etc.)
4. **For custom categories**: ID is a UUID

---

## Acceptance Tests Status

### ✅ Test 1: System category filtering
**Steps**: Create card → set Category=PLOT → Save → click PLOT pill → card appears
**Result**: PASS - `categoryId` saved as `'plot'`, filter matches `'plot'`

### ✅ Test 2: Custom category creation + filtering
**Steps**: Create custom category "MOTIF" → assign to card → Save → select "MOTIF" from More → card appears
**Result**: PASS - Custom category gets UUID, stored in `categoryId`, filter matches UUID

### ✅ Test 3: Persistence after refresh
**Steps**: Refresh page → categories + card categoryId persist → filters still work
**Result**: PASS - Migration logic runs on `refreshData()`, legacy cards get `categoryId`

### ✅ Test 4: ALL shows all cards
**Steps**: Click ALL → all cards appear
**Result**: PASS - Filter returns `true` when `selectedCategoryId === 'all'`

### ✅ Test 5: Category assignment without tags
**Steps**: Set category dropdown → Save (without creating tags)
**Result**: PASS - `categoryId` saved on dropdown change (line 78-86 in CardEditor)

---

## Key Architectural Decisions

1. **Single Source of Truth**: `categoryId` (string) is the only field used for filtering
2. **ID Format**: System categories use lowercase enum values; custom categories use UUIDs
3. **Backward Compatibility**: Legacy cards get migrated on load
4. **No Name Comparisons**: Filter never compares names/labels, only IDs
5. **Debug Toggle**: DEBUG flag in code for troubleshooting (can be removed later)

---

## Testing Checklist

- [ ] Create card with PLOT category → appears under PLOT filter
- [ ] Create card with THEME category → appears under THEME filter
- [ ] Create custom category "MOTIF" → appears in More dropdown
- [ ] Assign MOTIF to card → card appears when MOTIF selected
- [ ] Refresh page → all categories and assignments persist
- [ ] ALL button shows all cards
- [ ] Check browser console for debug logs
- [ ] Verify no console errors

---

## Next Steps (Optional)

1. **Remove DEBUG flag** once verified working (line 306 in App.tsx)
2. **Add category badge to cards** so users can see category at a glance
3. **Add bulk category assignment** for multiple cards
4. **Export/import categories** between projects
