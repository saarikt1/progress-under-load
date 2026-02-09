# Phase 6: Core Analytics - Design Document

**Date:** February 9, 2026  
**Status:** Approved

## Overview

Implement exercise analytics with interactive charts showing strength progression. The dashboard will display full charts for the 4 main lifts, and users can browse all exercises to view detailed analytics.

## Requirements

### Core Features

1. **Enhanced Dashboard** - Real data for 4 main lifts (Squat, Bench Press, Deadlift, Overhead Press)
2. **Exercise List Page** - Searchable card grid of all exercises
3. **Exercise Detail Pages** - Two charts per exercise showing progression

### User Experience Goals

- Dashboard as primary analytics view (no need to click through)
- Easy comparison between estimated and actual heavy lifts
- Clear visualization of strength trends over time
- Mobile-responsive design

## Architecture

### Routes

- `/` - Dashboard with 4 main lift charts
- `/exercises` - Exercise list with search
- `/exercises/[id]` - Individual exercise analytics

### API Endpoints

**GET /api/exercises**
- Returns all exercises with summary stats
- Response: `{ exercises: [{ id, display_name, exercise_key, total_sets, last_session, latest_1rm }] }`
- Sorted by total_sets descending

**GET /api/exercises/[id]?period=3m**
- Returns detailed set data for charts
- Query params: `period` (3m | 12m | all)
- Only includes sets where `set_type = 'normal'`

### Technology Stack

- **Charting:** Recharts (React-specific, declarative, TypeScript support)
- **Data fetching:** Next.js API routes with D1 queries
- **State management:** React hooks + URL params for filters

## Main Lift Configuration

Exact exercise_key matching in `lib/constants.ts`:

```typescript
export const MAIN_LIFTS = {
  'Squat': 'squat (barbell)',
  'Bench Press': 'bench press (barbell)',
  'Deadlift': 'deadlift (barbell)',
  'Overhead Press': 'overhead press (barbell)'
}
```

## Dashboard Design

### Global Time Filter

Three options affecting all 4 main lift cards:
- **3 months** (default)
- **12 months**
- **All time**

Implemented as tabs or segmented control at the top of the dashboard.

### Main Lift Cards

Each card displays:
- Exercise name
- Latest estimated 1RM value
- Last session date
- **Full 1RM trend chart** with:
  - Estimated 1RM line (average of 3 formulas)
  - Range band (shaded area showing min/max)
  - Heavy set markers (scatter points for reps ≤ 3)

If no data exists for a lift, show existing "Empty" state.

Cards are clickable and navigate to exercise detail page.

## Exercise List Page

### Layout

- Search box at top (filters by display_name)
- Card grid (responsive: 1-4 columns based on screen size)
- Cards sorted by total sets logged (most frequent exercises first)

### Exercise Card Content

- Exercise display name
- Total sets logged
- Last session date
- Quick preview (latest 1RM or heaviest weight)
- Clickable → navigates to detail page

## Exercise Detail Page

### Chart Tabs

Two tabs for switching between views:

**Tab 1: "One Rep Max" (default)**
- Estimated 1RM trend line (average of Epley, Brzycki, Lombardi)
- Range band showing min/max of the three formulas
- Scatter points overlay for sets with reps ≤ 3 showing actual weight
- Allows comparison between estimated and near-maximal lifts

**Tab 2: "Heaviest Weight"**
- Line chart showing max weight per workout session
- Helps track absolute maximums over time
- Visual consistency with Tab 1

### Chart Features

- X-axis: Date with intelligent spacing
- Y-axis: Weight (kg) with auto-scaling (+10% padding)
- Tooltips on hover showing: date, weight, reps, calculated 1RM
- Responsive sizing
- Time period filter inherited from dashboard or independent

## 1RM Calculation Logic

### Formulas

Calculate for all sets regardless of rep count:

- **Epley:** `weight × (1 + reps/30)`
- **Brzycki:** `weight × (36 / (37 - reps))`
- **Lombardi:** `weight × reps^0.10`

### Processing

For each set with `set_type = 'normal'`:
1. Calculate 1RM using all three formulas
2. Store: `{ min, max, avg }`
3. Range band uses min-max, trend line uses avg
4. Flag sets with reps ≤ 3 as "heavy sets" for overlay markers

### Grouping

For "Heaviest Weight" chart:
- Group sets by workout session (workout_title + date)
- Find maximum weight per session
- Plot as time series

## Data Flow

### Dashboard Load

1. Fetch all 4 main lifts in parallel via `/api/exercises/[id]?period=3m`
2. Calculate 1RM values for each set
3. Render charts simultaneously
4. Empty state if exercise_key doesn't match any data

### Exercise List Load

1. Fetch `/api/exercises`
2. Display cards sorted by total_sets
3. Search filters client-side by display_name

### Exercise Detail Load

1. Get exercise ID from URL params
2. Fetch `/api/exercises/[id]?period=3m`
3. Calculate 1RM values
4. Render selected chart tab
5. Time period can be changed independently

## Edge Cases

1. **No data for exercise** - Show empty state with message
2. **Only warmup sets** - Show "No normal sets logged" message
3. **Insufficient data** - Chart with note about limited data points
4. **Time period with no data** - Empty chart with period-specific message
5. **Very new exercise** - Chart may look sparse but still render

## Performance

- Cache exercise list response (infrequent changes)
- Lazy load detail pages (fetch only when navigating)
- Parallel fetch for dashboard (4 main lifts simultaneously)
- Consider weekly/monthly aggregation for "All Time" view if needed

## Testing Strategy

### Unit Tests

- 1RM calculation functions (all three formulas)
- Data aggregation logic
- Time period filtering

### Integration Tests

- API endpoints with mock database
- Verify correct SQL queries
- Test authentication/authorization

### Component Tests

- Charts render with sample data
- Tooltips work correctly
- Tab switching functions

### Manual Verification

- Import real CSV data
- Verify chart accuracy against known values
- Test all time periods (3m, 12m, all)
- Test responsive design on mobile/tablet/desktop
- Verify main lift matching works correctly

## Success Criteria

- Dashboard shows full charts for all 4 main lifts (if data exists)
- Global time filter affects all dashboard cards
- Exercise list displays and is searchable
- Exercise detail charts accurately show progression
- 1RM estimates match expected values (can verify with calculator)
- Charts are responsive and perform well
- All automated tests pass
