// Sprint 5 — DAX Traps and Context Lab (25 Q).
//
// Focused on areas NOT covered by Sprint 4 (which handled iterators):
//   filter context modifiers (ALL family, REMOVEFILTERS, KEEPFILTERS)  6 Q
//   time intelligence                                                  5 Q
//   relationship modifiers (USERELATIONSHIP, CROSSFILTER, TREATAS)    4 Q
//   table-shaping (GROUPBY, SUMMARIZE, ADDCOLUMNS, SELECTCOLUMNS)     5 Q
//   composite-model + filter-introspection DAX                        3 Q
//   performance debugging (VertiPaq Analyzer signals)                 2 Q
//
// IDs dxt-001..dxt-025. Heavy on code-reading.
// Source: learn.microsoft.com/en-us/dax/* + composite-model docs.

import type { Question } from '../../lib/schema';
import { single, multi, SRC } from './_helpers';

export const daxTraps: Question[] = [
  // ── Filter context modifiers (6 Q) ─────────────────────────
  single({
    id: 'dxt-001', domain: 'semantic', subtopic: 'dax-context', difficulty: 4,
    prompt: 'Reading: `CALCULATE([Total Sales], ALL(Date))`. In a 2026-Q1 visual context, what does this return?',
    options: [
      'Q1 2026 Total Sales',
      'Total Sales across ALL dates (the entire history) — Date filter is removed',
      'Total Sales for 2026',
      'BLANK'
    ],
    correct: 1,
    explanation: 'ALL(Date) removes EVERY filter on the Date table — year, quarter, month, day. The entire history is included. Use ALL(Date) to compute "running total" or "share of total across all time".',
    whyWrong: {
      0: 'ALL removes the Date filter; the visual\'s Q1 2026 context is overridden.',
      2: 'ALL removes ALL Date filters — including Year. Result is full history, not 2026.',
      3: 'Valid DAX, returns the unfiltered total.'
    },
    source: SRC.daxFunctions,
    tags: ['dax-context', 'all', 'filter-modifier', 'code-reading']
  }),

  single({
    id: 'dxt-002', domain: 'semantic', subtopic: 'dax-context', difficulty: 5,
    prompt: 'Reading: `CALCULATE([Total Sales], ALLSELECTED(Date))` in a slicer-filtered visual where the slicer set Year=2025-2026 and the matrix shows Q1, Q2, Q3, Q4. The Q2 cell returns:',
    options: [
      'Q2 across 2025-2026 (slicer respected; matrix-quarter filter removed)',
      'Total Sales across ALL history (slicer ignored)',
      'Q2 2025 only',
      'BLANK'
    ],
    correct: 0,
    explanation: 'ALLSELECTED removes filters from the iterating visual\'s context (Q1/Q2/Q3/Q4 matrix split) BUT preserves filters from outside (the year slicer). Result: Q2 across the slicer-selected years. This is the canonical "% of slicer-selected total" denominator pattern.',
    whyWrong: {
      1: 'ALLSELECTED preserves slicer filters — that is the difference from ALL.',
      2: 'Years are 2025-2026 per the slicer; ALLSELECTED honors that.',
      3: 'Valid expression, non-empty result.'
    },
    source: SRC.daxFunctions,
    tags: ['dax-context', 'allselected', 'all', 'slicer-vs-visual', 'code-reading', 'exam-trap'],
    relatedIds: ['dxt-001', 'dxt-003']
  }),

  multi({
    id: 'dxt-003', domain: 'semantic', subtopic: 'dax-context', difficulty: 5,
    prompt: 'When does ALL vs ALLSELECTED produce different results? Select all that apply.',
    options: [
      'ALL ignores slicers; ALLSELECTED preserves slicers — different result whenever slicers are active',
      'In a static report with no slicers and no cross-filters, results are identical',
      'ALLSELECTED in a measure called outside any visual context behaves like ALL',
      'ALL evaluated outside a visual (e.g., a card with no filters) is identical to ALLSELECTED',
      'ALL takes effect at refresh time only; ALLSELECTED is per-query'
    ],
    correct: [0, 1, 2, 3],
    explanation: 'ALL vs ALLSELECTED differ when there is an outer-vs-inner filter context distinction (typically slicers vs visual). Without slicers / cross-filters, they coincide. Outside any visual context, ALLSELECTED has nothing to "select from" and behaves like ALL. (4) is wrong — both take effect per query, not at refresh time.',
    whyWrong: {
      4: 'Both take effect per query. Refresh has no role in CALCULATE filter modifier evaluation.'
    },
    source: SRC.daxFunctions,
    tags: ['dax-context', 'all', 'allselected', 'comparison']
  }),

  single({
    id: 'dxt-004', domain: 'semantic', subtopic: 'dax-context', difficulty: 4,
    prompt: 'Reading: `CALCULATE([Total Sales], KEEPFILTERS(Region[Continent] = "Europe"))`. In a visual filtered to Region[Country] = "France", the result is:',
    options: [
      'Total Sales for Europe (KEEPFILTERS overrides the country filter)',
      'Total Sales for France only — KEEPFILTERS ADDS the Continent filter to the existing Country filter (intersection)',
      'BLANK because France is in Europe so the filters are redundant',
      'Total Sales for the world (KEEPFILTERS removes filters)'
    ],
    correct: 1,
    explanation: 'KEEPFILTERS does NOT replace the existing filter — it adds the new filter as an INTERSECTION. So France ∩ Europe = France (which is in Europe). Without KEEPFILTERS, `Region[Continent] = "Europe"` would override Country and return all of Europe.',
    whyWrong: {
      0: 'KEEPFILTERS preserves existing filters. Without KEEPFILTERS, the country would be overridden.',
      2: 'France IS in Europe → both filters are TRUE → France data is returned, not BLANK.',
      3: 'KEEPFILTERS preserves existing filters; it does not remove anything.'
    },
    source: SRC.daxFunctions,
    tags: ['dax-context', 'keepfilters', 'filter-intersection', 'code-reading', 'exam-trap']
  }),

  multi({
    id: 'dxt-005', domain: 'semantic', subtopic: 'dax-context', difficulty: 4,
    prompt: 'Which behaviors are TRUE about REMOVEFILTERS? Select all that apply.',
    options: [
      'REMOVEFILTERS(table) is functionally equivalent to ALL(table) when used as a filter modifier in CALCULATE',
      'REMOVEFILTERS can target a specific column: REMOVEFILTERS(Date[Year])',
      'REMOVEFILTERS without arguments removes filters from EVERY table in the model',
      'REMOVEFILTERS works as a row-context-removal mechanism inside iterators',
      'REMOVEFILTERS is preferred over ALL when the intent is "clear filters" (ALL also acts as a table function)'
    ],
    correct: [0, 1, 2, 4],
    explanation: 'REMOVEFILTERS = ALL (1), supports column-level (2) or table-level (3) targeting. REMOVEFILTERS() with no args clears EVERY table\'s filters. Stylistically REMOVEFILTERS is preferred when the intent is "clear filters" — ALL is overloaded as both a table function (returning all rows) and a filter modifier, which can confuse readers (5). (4) is wrong — REMOVEFILTERS does not remove row context.',
    whyWrong: {
      3: 'REMOVEFILTERS targets filter context. Row context is established by iterators; remove it by transitioning (CALCULATE) or scoping with VAR.'
    },
    source: SRC.daxFunctions,
    tags: ['dax-context', 'removefilters', 'all', 'filter-modifier']
  }),

  single({
    id: 'dxt-006', domain: 'semantic', subtopic: 'dax-context', difficulty: 5,
    prompt: 'Reading: `CALCULATE([Total Sales], ALLEXCEPT(Customer, Customer[Region]))`. The result in a visual filtered to Customer[Region]="West", Customer[State]="OR":',
    options: [
      'Total Sales for ALL of West (state filter is removed; region kept)',
      'Total Sales for OR only',
      'Total Sales worldwide',
      'BLANK'
    ],
    correct: 0,
    explanation: 'ALLEXCEPT clears every filter on the Customer table EXCEPT for the named columns. Region is preserved (it is the EXCEPT column); State (and any other Customer column) is cleared. Result: full West region, not just Oregon.',
    whyWrong: {
      1: 'ALLEXCEPT keeps Region and clears everything else; OR (state) is cleared.',
      2: 'Region is preserved.',
      3: 'Valid expression.'
    },
    source: SRC.daxFunctions,
    tags: ['dax-context', 'allexcept', 'filter-modifier', 'code-reading', 'exam-trap']
  }),

  // ── Time intelligence (5 Q) ────────────────────────────────
  single({
    id: 'dxt-007', domain: 'semantic', subtopic: 'dax-context', difficulty: 3,
    prompt: 'Reading: `CALCULATE([Total Sales], SAMEPERIODLASTYEAR(Date[Date]))` in a 2026-Q1 visual. Returns:',
    options: [
      '2025-Q1 Total Sales',
      '2026-Q1 Total Sales (same as without the modifier)',
      '2025 full-year Total Sales',
      'BLANK'
    ],
    correct: 0,
    explanation: 'SAMEPERIODLASTYEAR shifts the Date filter back exactly one year while preserving the period (Q1). 2026-Q1 → 2025-Q1.',
    whyWrong: {
      1: 'The whole point is the year shift; not the same period.',
      2: 'Q1 → Q1, not Q1 → full year.',
      3: 'Valid expression with a real result.'
    },
    source: SRC.daxFunctions,
    tags: ['time-intelligence', 'sameperiodlastyear', 'code-reading']
  }),

  multi({
    id: 'dxt-008', domain: 'semantic', subtopic: 'dax-context', difficulty: 4,
    prompt: 'Which prerequisites must be in place for time intelligence functions (SAMEPERIODLASTYEAR, DATEADD, etc.) to work correctly? Select all that apply.',
    options: [
      'A Date table marked as "Mark as date table" in the model',
      'A continuous Date column with no gaps',
      'The Date table joined to the fact via a relationship on the Date column',
      'The Date column must be of TIME data type (not DATE)',
      'No filters can be applied to the Date table at evaluation time'
    ],
    correct: [0, 1, 2],
    explanation: 'Three real prerequisites: marked Date table (1), continuous (no gaps) (2), joined via relationship (3). DATE type is required (not TIME — 4 wrong). Filters CAN be applied; the time intel function shifts them (5 wrong).',
    whyWrong: {
      3: 'DATE data type is required, not TIME.',
      4: 'Filters DO apply; the function shifts them.'
    },
    source: SRC.daxFunctions,
    tags: ['time-intelligence', 'prerequisites', 'date-table']
  }),

  single({
    id: 'dxt-009', domain: 'semantic', subtopic: 'dax-context', difficulty: 4,
    prompt: 'Reading: `CALCULATE([Total Sales], DATEADD(Date[Date], -3, MONTH))` in a 2026-Q1 visual. Returns:',
    options: [
      'Total Sales for Q4 2025 (3 months earlier than Q1 2026)',
      'Total Sales for Q1 2025 (1 year earlier)',
      'Total Sales for Q2 2025',
      'BLANK'
    ],
    correct: 0,
    explanation: 'DATEADD shifts the Date filter by the specified offset. -3 MONTH on Q1 2026 (Jan-Mar 2026) → shifted dates land in Oct-Dec 2025 = Q4 2025.',
    whyWrong: {
      1: 'That would be -12 MONTH or SAMEPERIODLASTYEAR.',
      2: 'Off by one quarter.',
      3: 'Valid expression with real result.'
    },
    source: SRC.daxFunctions,
    tags: ['time-intelligence', 'dateadd', 'code-reading']
  }),

  single({
    id: 'dxt-010', domain: 'semantic', subtopic: 'dax-context', difficulty: 4,
    prompt: 'Reading: `CALCULATE([Total Sales], DATESINPERIOD(Date[Date], LASTDATE(Date[Date]), -7, DAY))`. Returns:',
    options: [
      'Total Sales for the most recent 7 days within the current Date filter',
      'Total Sales for the entire Date table',
      'Total Sales for one day only',
      'An error'
    ],
    correct: 0,
    explanation: 'DATESINPERIOD takes a base date (LASTDATE here = the latest filtered date), an offset (-7), and a unit (DAY). It returns the date range for the last 7 days. Common pattern for "rolling 7-day total".',
    whyWrong: {
      1: 'DATESINPERIOD restricts to the specified window.',
      2: '-7 DAY is a 7-day range.',
      3: 'Valid syntax.'
    },
    source: SRC.daxFunctions,
    tags: ['time-intelligence', 'datesinperiod', 'rolling-window', 'code-reading']
  }),

  single({
    id: 'dxt-011', domain: 'semantic', subtopic: 'dax-context', difficulty: 4,
    prompt: 'A 13-period (4-4-5) retail calendar does NOT match standard months. Which time-intelligence approach works correctly?',
    options: [
      'Standard SAMEPERIODLASTYEAR — works because Date table is auto-detected',
      'Build a custom calendar table with period markers and use CALCULATE with period-shift logic on the period column',
      'Time intelligence is not supported on non-standard calendars',
      'Use FORMAT(Date, "yyyy-mm") to bucket and ignore the calendar mismatch'
    ],
    correct: 1,
    explanation: 'Standard time-intel functions assume a Gregorian calendar. For 4-4-5 (or 13-period), build a custom calendar table with explicit period columns and write CALCULATE expressions using period-shift logic (e.g., `Calendar[PeriodID] = MAX([PeriodID]) - 1`). This is the documented pattern.',
    whyWrong: {
      0: 'Standard functions assume Gregorian; 4-4-5 will produce wrong results.',
      2: 'Time intelligence works — it just requires a custom calendar.',
      3: 'FORMAT bucketing loses fiscal-period semantics.'
    },
    source: SRC.daxFunctions,
    tags: ['time-intelligence', 'custom-calendar', '4-4-5', 'fiscal-period', 'exam-trap']
  }),

  // ── Relationship modifiers (4 Q) ───────────────────────────
  single({
    id: 'dxt-012', domain: 'semantic', subtopic: 'relationships', difficulty: 4,
    prompt: 'A model has TWO relationships from Sales to Date: one ACTIVE on `OrderDate`, one INACTIVE on `ShipDate`. To compute "Sales by Ship Date", which DAX expression is correct?',
    options: [
      'CALCULATE([Total Sales], USERELATIONSHIP(Sales[ShipDate], Date[Date]))',
      'CALCULATE([Total Sales], CROSSFILTER(Sales[ShipDate], Date[Date], Both))',
      'SUMX(Sales, RELATED(Date[Date]))',
      'SWITCH(SELECTEDVALUE(Date[Date]), ...)'
    ],
    correct: 0,
    explanation: 'USERELATIONSHIP activates the inactive relationship for the duration of CALCULATE. The order of arguments is (fact column, dim column). After this CALCULATE, the active relationship is the ShipDate one.',
    whyWrong: {
      1: 'CROSSFILTER changes filter direction, not which relationship is active.',
      2: 'RELATED follows the active relationship — gets OrderDate, not ShipDate.',
      3: 'SWITCH is conditional logic, not a relationship modifier.'
    },
    source: SRC.daxFunctions,
    tags: ['relationships', 'userelationship', 'inactive-relationship', 'code-reading']
  }),

  multi({
    id: 'dxt-013', domain: 'semantic', subtopic: 'relationships', difficulty: 5,
    prompt: 'Which behaviors are TRUE about USERELATIONSHIP? Select all that apply.',
    options: [
      'Only one relationship between two tables can be active at a time',
      'USERELATIONSHIP can ONLY activate inactive relationships, not change which is active model-wide',
      'USERELATIONSHIP scope is the CALCULATE call only',
      'USERELATIONSHIP changes the model definition permanently',
      'USERELATIONSHIP can activate a relationship in a measure, leaving the active relationship for visuals untouched'
    ],
    correct: [0, 1, 2, 4],
    explanation: 'Only one active relationship per pair (1), USERELATIONSHIP can only activate inactive ones (2), scope is the CALCULATE (3), and measures using it do not alter the model (5). (4) is wrong — USERELATIONSHIP is per-query, not permanent.',
    whyWrong: {
      3: 'USERELATIONSHIP is a runtime modifier, not a model edit. The model definition is unchanged.'
    },
    source: SRC.daxFunctions,
    tags: ['relationships', 'userelationship', 'scope', 'inactive-relationship']
  }),

  single({
    id: 'dxt-014', domain: 'semantic', subtopic: 'relationships', difficulty: 4,
    prompt: 'Reading: `CALCULATE([Total Sales], CROSSFILTER(Sales[CustomerKey], Customer[CustomerKey], Both))`. What does this enable?',
    options: [
      'Filtering Sales rows where CustomerKey matches',
      'For the duration of CALCULATE, the relationship between Sales and Customer becomes BIDIRECTIONAL — Customer filters Sales AND Sales filters Customer',
      'Removing the relationship temporarily',
      'Activating an inactive relationship'
    ],
    correct: 1,
    explanation: 'CROSSFILTER changes the filter DIRECTION of an existing relationship for the CALCULATE duration. `Both` makes it bidirectional: filtering on Customer filters Sales (default) AND filtering on Sales also filters Customer. Common use: counting customers who bought a product (filter Product, propagate to Sales, then to Customer).',
    whyWrong: {
      0: 'That is what relationships do by default; CROSSFILTER changes the direction, not whether filtering happens.',
      2: 'CROSSFILTER does not remove the relationship.',
      3: 'USERELATIONSHIP activates inactive relationships; CROSSFILTER changes direction.'
    },
    source: SRC.daxFunctions,
    tags: ['relationships', 'crossfilter', 'bidirectional', 'code-reading']
  }),

  single({
    id: 'dxt-015', domain: 'semantic', subtopic: 'relationships', difficulty: 5,
    prompt: 'Reading: `CALCULATE([Total Sales], TREATAS({"West", "East"}, Region[Code]))`. What does this do?',
    options: [
      'Compares the literal text "West" / "East" — no filter applied',
      'Applies a virtual filter as if Region[Code] IN {"West", "East"} were a real filter — useful when no relationship exists',
      'Throws because TREATAS requires an actual table',
      'Creates a new column on Region'
    ],
    correct: 1,
    explanation: 'TREATAS applies a list (or table) AS IF it were a filter on a column. Used when there is no relationship to leverage — typically in advanced patterns like passing a parameterized filter from a measure into a CALCULATE.',
    whyWrong: {
      0: 'TREATAS specifically wraps the values as a filter context.',
      2: 'TREATAS accepts table-shaped arguments including row constructors / lists.',
      3: 'TREATAS does not modify the model.'
    },
    source: SRC.daxFunctions,
    tags: ['relationships', 'treatas', 'virtual-filter', 'code-reading']
  }),

  // ── Table-shaping (5 Q) ────────────────────────────────────
  single({
    id: 'dxt-016', domain: 'semantic', subtopic: 'dax-context', difficulty: 4,
    prompt: 'Reading: `EVALUATE SUMMARIZE(Sales, Customer[Country], "Total", SUM(Sales[Amount]))`. What does this return?',
    options: [
      'A table with one row per Customer Country and the total Sales for each',
      'A scalar — the grand total',
      'An error — SUMMARIZE cannot use SUM directly',
      'All Sales rows with a Country column added'
    ],
    correct: 0,
    explanation: 'SUMMARIZE groups by the named columns (Country here) and adds named expressions. The result is a table: one row per Country, each with the SUM(Sales[Amount]) for that country.',
    whyWrong: {
      1: 'SUMMARIZE returns a TABLE, not a scalar.',
      2: 'Modern best practice is SUMMARIZECOLUMNS, but SUMMARIZE with SUM (without context-transition awareness) is valid and works.',
      3: 'SUMMARIZE collapses to one row per group.'
    },
    source: SRC.daxFunctions,
    tags: ['dax-context', 'summarize', 'group-by', 'code-reading']
  }),

  multi({
    id: 'dxt-017', domain: 'semantic', subtopic: 'dax-context', difficulty: 4,
    prompt: 'Which differences between SUMMARIZE and SUMMARIZECOLUMNS are TRUE? Select all that apply.',
    options: [
      'SUMMARIZECOLUMNS is the modern preferred function',
      'SUMMARIZE creates row context; expressions need explicit CALCULATE for context transition',
      'SUMMARIZECOLUMNS handles context transition automatically for measures',
      'SUMMARIZE supports filter arguments inline; SUMMARIZECOLUMNS does not',
      'SUMMARIZECOLUMNS is faster in most cases because it does not create row context'
    ],
    correct: [0, 1, 2, 4],
    explanation: 'SUMMARIZECOLUMNS is preferred (1), faster (5), and handles measures cleanly (3). SUMMARIZE creates row context — measures inside need CALCULATE or auto-transition (2). (4) is wrong — SUMMARIZECOLUMNS supports filter arguments via the `FILTER (`tableName`)` and explicit filter parameters; it has filter support, not less.',
    whyWrong: {
      3: 'SUMMARIZECOLUMNS supports filter arguments. The DAX guidance is to PREFER SUMMARIZECOLUMNS over SUMMARIZE in modern code.'
    },
    source: SRC.daxFunctions,
    tags: ['dax-context', 'summarize', 'summarizecolumns', 'best-practice']
  }),

  single({
    id: 'dxt-018', domain: 'semantic', subtopic: 'dax-context', difficulty: 4,
    prompt: 'Reading: `EVALUATE SELECTCOLUMNS(Customer, "Name", Customer[FullName], "City", Customer[City])`. What does this return?',
    options: [
      'A two-column projection of Customer with Name and City',
      'The Customer table with two extra columns added',
      'An error — SELECTCOLUMNS cannot rename columns',
      'A scalar'
    ],
    correct: 0,
    explanation: 'SELECTCOLUMNS projects (selects + renames) columns from a source table. Result: a two-column table. Use ADDCOLUMNS to add columns to the existing table; use SELECTCOLUMNS to project a subset.',
    whyWrong: {
      1: 'ADDCOLUMNS adds columns; SELECTCOLUMNS projects.',
      2: 'Renaming via the alias arguments is the standard pattern.',
      3: 'Returns a TABLE.'
    },
    source: SRC.daxFunctions,
    tags: ['dax-context', 'selectcolumns', 'projection', 'code-reading']
  }),

  single({
    id: 'dxt-019', domain: 'semantic', subtopic: 'dax-context', difficulty: 5,
    prompt: 'Reading: `EVALUATE GROUPBY(Sales, Sales[Region], "Top Customer", MAXX(CURRENTGROUP(), Sales[Amount]))`. What does CURRENTGROUP() refer to here?',
    options: [
      'The entire Sales table',
      'The rows in the current Region group',
      'A single Sales row',
      'The Region table'
    ],
    correct: 1,
    explanation: 'GROUPBY creates a group per Region; CURRENTGROUP() returns the rows in that group. MAXX iterates those grouped rows and returns the max Amount per Region. CURRENTGROUP is what makes GROUPBY useful — it gives you a per-group iterator handle.',
    whyWrong: {
      0: 'CURRENTGROUP scopes to the current group, not the whole table.',
      2: 'It is a row-set, not a single row.',
      3: 'Region is the GROUP-BY key, not what CURRENTGROUP references.'
    },
    source: SRC.daxFunctions,
    tags: ['dax-context', 'groupby', 'currentgroup', 'code-reading', 'advanced']
  }),

  multi({
    id: 'dxt-020', domain: 'semantic', subtopic: 'dax-context', difficulty: 4,
    prompt: 'Which patterns are correctly handled by ADDCOLUMNS + CALCULATE for a per-row measure evaluation? Select all that apply.',
    options: [
      'Adding a "TotalSales" column per Customer: `ADDCOLUMNS(Customer, "TotalSales", CALCULATE([Total Sales]))`',
      'Adding a "TotalSales" column per Customer without CALCULATE: `ADDCOLUMNS(Customer, "TotalSales", [Total Sales])` — works because measure auto-transitions',
      'Adding a "% of Grand Total" column: `ADDCOLUMNS(Customer, "Pct", DIVIDE(CALCULATE([Total Sales]), CALCULATE([Total Sales], ALL(Customer))))`',
      'Adding a "Rank" column: `ADDCOLUMNS(Customer, "Rank", RANKX(ALL(Customer), [Total Sales]))`',
      'Calling [Total Sales] without CALCULATE returns the SAME value for every row (the model-wide total)'
    ],
    correct: [0, 1, 2, 3],
    explanation: 'Four valid patterns: explicit CALCULATE (1), implicit CALCULATE via measure auto-transition (2), ratio with denominator (3), rank with ALL (4). (5) is wrong — measures inside iterators auto-transition; without auto-transition you would get the grand total but that is not what happens here. The trap: writing `[Total Sales]` directly (option 2) DOES auto-transition; the trap is when developers think it does not.',
    whyWrong: {
      4: 'Measures auto-transition inside iterators. The grand-total trap is for people who FORGET that they auto-transition.'
    },
    source: SRC.daxFunctions,
    tags: ['dax-context', 'addcolumns', 'calculate', 'context-transition'],
    relatedIds: ['dxi-002', 'dxi-005']
  }),

  // ── Composite-model + introspection (3 Q) ──────────────────
  single({
    id: 'dxt-021', domain: 'semantic', subtopic: 'composite', difficulty: 4,
    prompt: 'Reading: `IF(SELECTEDVALUE(Country) = BLANK(), "Multiple", SELECTEDVALUE(Country))`. What does this measure return when 3 countries are selected?',
    options: [
      'The first country',
      '"Multiple" — SELECTEDVALUE returns BLANK when more than one value is present',
      'A list of all 3 countries',
      'BLANK'
    ],
    correct: 1,
    explanation: 'SELECTEDVALUE returns the single value if exactly one is in context, or BLANK otherwise. The IF guards on BLANK to display a friendly "Multiple". This is a common KPI title pattern.',
    whyWrong: {
      0: 'No "first" rule — single value or BLANK.',
      2: 'SELECTEDVALUE returns scalar, not list.',
      3: 'IF guards on BLANK and returns "Multiple".'
    },
    source: SRC.daxFunctions,
    tags: ['dax-context', 'selectedvalue', 'introspection', 'code-reading']
  }),

  multi({
    id: 'dxt-022', domain: 'semantic', subtopic: 'dax-context', difficulty: 5,
    prompt: 'Which DAX functions are commonly used for filter-context introspection? Select all that apply.',
    options: [
      'SELECTEDVALUE',
      'HASONEVALUE',
      'ISFILTERED',
      'ISCROSSFILTERED',
      'BLANK',
      'VALUES'
    ],
    correct: [0, 1, 2, 3, 5],
    explanation: 'Five introspection functions: SELECTEDVALUE (single value or blank), HASONEVALUE (true/false), ISFILTERED (any direct filter on column), ISCROSSFILTERED (filter on column or related), VALUES (the unique values in current context). BLANK is a value, not a filter-context introspection function.',
    whyWrong: {
      4: 'BLANK returns/checks an empty value; not a filter-context introspection function.'
    },
    source: SRC.daxFunctions,
    tags: ['dax-context', 'introspection', 'selectedvalue', 'hasonevalue', 'isfiltered']
  }),

  single({
    id: 'dxt-023', domain: 'semantic', subtopic: 'composite', difficulty: 5,
    prompt: 'In a composite model with Direct Lake fact + Import dimension: a calculated column on the Import dim references the fact. What is the result?',
    options: [
      'Works seamlessly — calculated columns can reference any table',
      'A calculated column on the Import dim referencing a Direct Lake table is NOT supported (composite-model limitation)',
      'Works but extremely slow',
      'Only allowed if the dim is also Direct Lake'
    ],
    correct: 1,
    explanation: 'Composite-model rules limit cross-storage-mode references for calculated columns. A calculated column on a higher-storage-mode table (Import) referencing a lower-storage-mode table (Direct Lake) is not supported. Use measures instead, or move the column upstream into the Lakehouse.',
    whyWrong: {
      0: 'Composite-model limitations exist; not all references are allowed.',
      2: 'It is unsupported, not slow.',
      3: 'The constraint is asymmetric and depends on direction.'
    },
    source: SRC.storageModes,
    tags: ['composite', 'direct-lake', 'calculated-column', 'limitations', 'exam-trap']
  }),

  // ── Performance debugging (2 Q) ────────────────────────────
  multi({
    id: 'dxt-024', domain: 'semantic', subtopic: 'dax-perf', difficulty: 5,
    prompt: 'Performance Analyzer shows a measure with high "DAX Query" time. Which next-step diagnostics are useful? Select all that apply.',
    options: [
      'Copy the query to DAX Studio and run with Server Timings on',
      'Decompose the measure to identify the slow sub-expression',
      'Check the formula-engine vs storage-engine time split',
      'Look at VertiPaq Analyzer for column-level cardinality + dictionary size',
      'Restart the Power BI Desktop process'
    ],
    correct: [0, 1, 2, 3],
    explanation: 'DAX Studio (1), decomposition (2), FE/SE split (3), VertiPaq Analyzer (4) are the canonical perf diagnostic stack. Restarting Desktop (5) does nothing for query plan analysis.',
    whyWrong: {
      4: 'Restart is not a diagnostic. The bottleneck is in the query plan, captured by the tools above.'
    },
    source: SRC.daxPerf,
    tags: ['dax-perf', 'diagnostic', 'dax-studio', 'vertipaq-analyzer']
  }),

  single({
    id: 'dxt-025', domain: 'semantic', subtopic: 'dax-perf', difficulty: 5,
    prompt: 'VertiPaq Analyzer shows a single column has 50M unique values, dictionary size of 1.2 GB. Which is the BEST first action to reduce model size?',
    options: [
      'Switch the column to a string data type',
      'Investigate whether the column granularity can be reduced (e.g., truncate timestamps to seconds, drop GUIDs not used in measures)',
      'Move the model to F128',
      'Remove the relationships involving this column'
    ],
    correct: 1,
    explanation: 'High-cardinality columns dominate VertiPaq dictionary size. Reducing granularity (e.g., second-precision timestamps instead of millisecond, hashing or dropping unused GUIDs) is the canonical first move. SKU upgrades increase capacity but do not reduce model size; data type changes rarely help dictionary size at this scale.',
    whyWrong: {
      0: 'String tends to compress WORSE than typed columns at high cardinality.',
      2: 'Capacity upgrade does not reduce model size.',
      3: 'Removing relationships breaks queries; not a size-reduction strategy.'
    },
    source: SRC.daxPerf,
    tags: ['dax-perf', 'vertipaq-analyzer', 'cardinality', 'dictionary-size']
  })
];
