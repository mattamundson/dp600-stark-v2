// Sprint 6 — Calculation Groups in Power BI / Fabric Semantic Models (25 Q).
//
// Topics:
//   Calculation group fundamentals + SELECTEDMEASURE()           clcg-001..005
//   Dynamic Format Strings                                        clcg-006..008
//   Time intelligence patterns via calc groups                    clcg-009..012
//   Variance / comparison / currency conversion patterns          clcg-013..016
//   Precedence, conflict resolution, multi-group interactions     clcg-017..019
//   Limitations, RLS interactions, Direct Lake                    clcg-020..022
//   Tool requirements + calc groups vs alternatives              clcg-023..025
//
// Type mix: 16 single, 7 multi, 1 ordering, 1 scenario-single
// Code-reading questions: clcg-003, clcg-005, clcg-007, clcg-011,
//                         clcg-014, clcg-018, clcg-021  (7 total)
//
// IDs: clcg-001..clcg-025.
// Source: learn.microsoft.com/en-us/power-bi/transform-model/calculation-groups
//         + SQLBI calc-groups guide + Tabular Editor docs.

import type { Question } from '../../lib/schema';
import { single, multi, order, SRC } from './_helpers';

export const calcGroups: Question[] = [
  // ── Fundamentals + SELECTEDMEASURE (5 Q) ──────────────────────

  single({
    id: 'clcg-001', domain: 'semantic', subtopic: 'calc-groups', difficulty: 2,
    prompt: 'What is a calculation group in a Power BI / Fabric semantic model?',
    options: [
      'A folder that organizes related measures in the Fields pane',
      'A special table containing calculation items, each of which applies a DAX expression to a currently-evaluated measure via SELECTEDMEASURE()',
      'A DAX function that groups calculation results by a column',
      'A set of measures that share the same format string'
    ],
    correct: 1,
    explanation: 'A calculation group is a special table added to the semantic model whose rows (calculation items) each carry a DAX expression referencing SELECTEDMEASURE(). When a visual evaluates a measure, the applicable calculation item\'s expression wraps that measure automatically — enabling a single set of items to modify any measure in the model.',
    whyWrong: {
      0: 'Display folders organize measures visually but do not modify their evaluation logic.',
      2: 'GROUPBY / SUMMARIZE are DAX table functions, not a model-level feature.',
      3: 'Shared format strings exist separately; they describe how values are displayed, not calculation logic.'
    },
    source: SRC.semanticModel,
    tags: ['calc-groups', 'foundation', 'selectedmeasure']
  }),

  single({
    id: 'clcg-002', domain: 'semantic', subtopic: 'calc-groups', difficulty: 2,
    prompt: 'What does SELECTEDMEASURE() return inside a calculation item expression?',
    options: [
      'The name of the currently-selected slicer value',
      'A reference to the measure that is currently being evaluated by the calculation item — it is a placeholder for "whichever measure is in context"',
      'The value of the first measure in the model alphabetically',
      'A table of all measures in the model'
    ],
    correct: 1,
    explanation: 'SELECTEDMEASURE() is the mechanism that makes calculation groups generic. At evaluation time it resolves to the specific measure the visual is requesting — so a single calculation item like `CALCULATE(SELECTEDMEASURE(), DATESYTD(Date[Date]))` becomes a YTD wrapper for ANY measure it is applied to.',
    whyWrong: {
      0: 'SELECTEDMEASURE() has nothing to do with slicers.',
      2: 'It resolves to the measure in context for the current cell, not alphabetically.',
      3: 'SELECTEDMEASURE() returns a scalar value, not a table.'
    },
    source: SRC.semanticModel,
    tags: ['calc-groups', 'selectedmeasure', 'foundation']
  }),

  single({
    id: 'clcg-003', domain: 'semantic', subtopic: 'calc-groups', difficulty: 3,
    prompt: 'Reading: A calculation item named "YTD" contains:\n```dax\nCALCULATE(\n    SELECTEDMEASURE(),\n    DATESYTD(Date[Date])\n)\n```\nA visual places [Total Sales] on rows and the "YTD" calculation item on columns. What does the YTD column cell return?',
    options: [
      'Year-to-date Total Sales — the calculation item wraps [Total Sales] with DATESYTD',
      'Total Sales for all time — DATESYTD is ignored when a calc item is applied',
      'An error because SELECTEDMEASURE() cannot be used with CALCULATE',
      'BLANK because the Date table filter is removed by DATESYTD'
    ],
    correct: 0,
    explanation: 'The calculation item\'s expression replaces the measure evaluation for that cell. SELECTEDMEASURE() resolves to [Total Sales] at runtime, and the DATESYTD filter accumulates from January 1 to the current date within the existing filter context. The cell returns year-to-date Total Sales.',
    whyWrong: {
      1: 'The entire point of calc items is to wrap the measure with the item\'s expression; DATESYTD is fully active.',
      2: 'SELECTEDMEASURE() inside CALCULATE is exactly the canonical pattern — no error.',
      3: 'DATESYTD restricts to a YTD range; it does not blank data unless no dates fall in range.'
    },
    source: SRC.semanticModel,
    tags: ['calc-groups', 'selectedmeasure', 'time-intelligence', 'code-reading']
  }),

  multi({
    id: 'clcg-004', domain: 'semantic', subtopic: 'calc-groups', difficulty: 3,
    prompt: 'Which statements about SELECTEDMEASURENAME() are TRUE? Select all that apply.',
    options: [
      'SELECTEDMEASURENAME() returns the display name of the measure currently being evaluated as a text string',
      'It can be used inside a calculation item expression to apply different logic depending on which measure is being evaluated',
      'SELECTEDMEASURENAME() and SELECTEDMEASURE() can be used in the same calculation item expression',
      'SELECTEDMEASURENAME() returns a table of all measure names in the model',
      'A common use is: IF(SELECTEDMEASURENAME() = "Total Costs", SELECTEDMEASURE() * -1, SELECTEDMEASURE()) to invert cost measures'
    ],
    correct: [0, 1, 2, 4],
    explanation: 'SELECTEDMEASURENAME() returns the string name (A), enabling conditional logic per measure (B). Both functions can coexist in one expression (C). The cost-inversion pattern (E) is a real exam scenario. (D) is wrong — it returns a scalar string, not a table.',
    whyWrong: {
      3: 'SELECTEDMEASURENAME() returns a single text scalar — the name of the measure currently in context.'
    },
    source: SRC.semanticModel,
    tags: ['calc-groups', 'selectedmeasurename', 'conditional-logic']
  }),

  single({
    id: 'clcg-005', domain: 'semantic', subtopic: 'dax-context', difficulty: 4,
    prompt: 'Reading: A calculation item expression:\n```dax\nIF(\n    SELECTEDMEASURENAME() = "Gross Margin %",\n    SELECTEDMEASURE(),\n    DIVIDE(SELECTEDMEASURE(), [Total Sales])\n)\n```\nA visual evaluates [Total Revenue] through this item. What does it return?',
    options: [
      'Total Revenue divided by Total Sales — the ELSE branch fires because the measure name is not "Gross Margin %"',
      'The raw Total Revenue value — the IF condition is TRUE',
      'BLANK — DIVIDE returns BLANK when denominator is empty',
      'An error — SELECTEDMEASURENAME() cannot be compared with a string literal'
    ],
    correct: 0,
    explanation: 'SELECTEDMEASURENAME() resolves to "Total Revenue" at runtime. That is not equal to "Gross Margin %", so the ELSE branch executes: DIVIDE([Total Revenue], [Total Sales]). The IF gates special handling of a specific measure while applying generic logic to all others.',
    whyWrong: {
      1: 'The IF condition is FALSE (name is "Total Revenue"), so the ELSE branch fires.',
      2: 'DIVIDE would only return BLANK if [Total Sales] is 0 or BLANK; that is a data condition, not a calculation-group characteristic.',
      3: 'Comparing SELECTEDMEASURENAME() to a string literal is the canonical usage — no error.'
    },
    source: SRC.semanticModel,
    tags: ['calc-groups', 'selectedmeasurename', 'conditional-logic', 'code-reading']
  }),

  // ── Dynamic Format Strings (3 Q) ──────────────────────────────

  single({
    id: 'clcg-006', domain: 'semantic', subtopic: 'dynamic-format-strings', difficulty: 3,
    prompt: 'A calculation group item named "% vs PY" should display values as percentages. Which mechanism enables the calculation item to control the format string independently of the base measure\'s format?',
    options: [
      'Setting the measure\'s Format property to "Percentage" in Model view',
      'Adding a Format String Expression to the calculation item — a DAX expression returning a format string that overrides the base measure format when the item is active',
      'Wrapping SELECTEDMEASURE() in FORMAT() inside the item expression',
      'Calculation items cannot override format strings — the base measure format always applies'
    ],
    correct: 1,
    explanation: 'Each calculation item has a separate Format String Expression property (set in Tabular Editor) that is a DAX expression returning a format string such as `"0.00%"`. When the item is active, its format overrides the base measure\'s format, enabling a single item to display values differently (e.g., as percentages for a growth item vs currency for a total item).',
    whyWrong: {
      0: 'Setting the measure format affects all contexts; it does not change per-item.',
      2: 'FORMAT() returns a text string, converting the numeric value — this changes the data type, not the format of a numeric result.',
      3: 'Dynamic format strings via Format String Expression are explicitly supported for calculation items.'
    },
    source: SRC.semanticModel,
    tags: ['calc-groups', 'dynamic-format-strings', 'format-string-expression']
  }),

  single({
    id: 'clcg-007', domain: 'semantic', subtopic: 'dynamic-format-strings', difficulty: 4,
    prompt: 'Reading: A calculation item\'s Format String Expression is:\n```dax\nIF(\n    SELECTEDMEASURENAME() IN {\"Gross Margin %\", \"Conversion Rate\"},\n    \"0.00%\",\n    \"$#,0.00\"\n)\n```\nThe calculation item is applied to [Total Revenue]. What format string is used?',
    options: [
      '"0.00%" — the IN list matches Total Revenue',
      '"$#,0.00" — Total Revenue is not in the IN list, so the ELSE branch fires',
      'No format is applied — Format String Expression is ignored for non-percentage measures',
      'An error — Format String Expressions cannot use IF'
    ],
    correct: 1,
    explanation: '"Total Revenue" is not in the set {"Gross Margin %", "Conversion Rate"}, so the ELSE branch fires and the format string "$#,0.00" is used. This pattern applies currency formatting to monetary measures and percentage formatting to ratio measures — all within a single calculation item.',
    whyWrong: {
      0: '"Total Revenue" is not "Gross Margin %" or "Conversion Rate".',
      2: 'Format String Expressions are fully evaluated; they are not ignored.',
      3: 'IF is valid inside Format String Expressions — DAX logic applies.'
    },
    source: SRC.semanticModel,
    tags: ['calc-groups', 'dynamic-format-strings', 'selectedmeasurename', 'code-reading']
  }),

  multi({
    id: 'clcg-008', domain: 'semantic', subtopic: 'dynamic-format-strings', difficulty: 4,
    prompt: 'Which behaviors are TRUE about Format String Expressions in calculation items? Select all that apply.',
    options: [
      'The Format String Expression is a DAX expression evaluated at query time that returns a text string',
      'If a calculation item has no Format String Expression, the base measure\'s format is preserved',
      'SELECTEDMEASURENAME() and SELECTEDMEASURE() are both valid inside a Format String Expression',
      'Format String Expressions can include any DAX logic, including IF, SWITCH, and IN',
      'Format String Expressions affect the data type returned — e.g., setting "0%" converts the value to text'
    ],
    correct: [0, 1, 2, 3],
    explanation: 'Format String Expressions are runtime DAX expressions (A), default to the base measure format when absent (B), can reference both SELECTED* functions (C), and support full DAX logic (D). (E) is wrong — Format String Expressions control HOW the numeric value is displayed; they do not change the underlying data type.',
    whyWrong: {
      4: 'The Format String Expression is a display instruction, not a type cast. The value remains numeric; the format tells the client how to render it.'
    },
    source: SRC.semanticModel,
    tags: ['calc-groups', 'dynamic-format-strings', 'format-string-expression', 'data-type']
  }),

  // ── Time intelligence patterns (4 Q) ─────────────────────────

  multi({
    id: 'clcg-009', domain: 'semantic', subtopic: 'time-intelligence', difficulty: 3,
    prompt: 'A time-intelligence calculation group is designed to replace 6 sets of duplicate YTD/MTD/QTD/PY/YoY%/MAT measures. Which calculation items belong in this group? Select all that apply.',
    options: [
      'YTD — `CALCULATE(SELECTEDMEASURE(), DATESYTD(Date[Date]))`',
      'PY — `CALCULATE(SELECTEDMEASURE(), SAMEPERIODLASTYEAR(Date[Date]))`',
      'YoY% — `DIVIDE(SELECTEDMEASURE() - CALCULATE(SELECTEDMEASURE(), SAMEPERIODLASTYEAR(Date[Date])), CALCULATE(SELECTEDMEASURE(), SAMEPERIODLASTYEAR(Date[Date])))`',
      'MAT — `CALCULATE(SELECTEDMEASURE(), DATESINPERIOD(Date[Date], LASTDATE(Date[Date]), -12, MONTH))`',
      'Total — `SELECTEDMEASURE()` (the identity item, returns the base value unchanged)'
    ],
    correct: [0, 1, 2, 3, 4],
    explanation: 'All five are valid calculation items for a time-intelligence group. The identity item (E) is the "no modification" baseline, typically named "Actual" or "Total". YTD (A), PY (B), YoY% (C), and MAT (D) are the primary time period patterns. The power is that all five apply to every measure in the model without duplicating measure code.',
    whyWrong: {},
    source: SRC.semanticModel,
    tags: ['calc-groups', 'time-intelligence', 'ytd', 'py', 'yoy', 'mat', 'measure-reuse']
  }),

  single({
    id: 'clcg-010', domain: 'semantic', subtopic: 'time-intelligence', difficulty: 3,
    prompt: 'A time-intelligence calculation group has a "MAT" (Moving Annual Total) item:\n```dax\nCALCULATE(\n    SELECTEDMEASURE(),\n    DATESINPERIOD(Date[Date], LASTDATE(Date[Date]), -12, MONTH)\n)\n```\nThe visual is filtered to 2026-06. What date range does MAT aggregate over?',
    options: [
      'Jan 2026 – Jun 2026 (YTD)',
      'Jul 2025 – Jun 2026 (12 months ending on the last date in the filter)',
      '2025 full year',
      'Jan 2025 – Jun 2026 (18 months)'
    ],
    correct: 1,
    explanation: 'LASTDATE(Date[Date]) in a 2026-06 context is 2026-06-30. DATESINPERIOD shifts back 12 months from that anchor: 2025-07-01 to 2026-06-30. This is the canonical Moving Annual Total — the rolling 12-month window ending on the latest date in context.',
    whyWrong: {
      0: 'YTD uses DATESYTD; MAT uses a rolling 12-month window.',
      2: 'Full 2025 would be a fixed calendar year; MAT is a rolling window.',
      3: '-12 MONTH means exactly 12 months back, not 18.'
    },
    source: SRC.semanticModel,
    tags: ['calc-groups', 'time-intelligence', 'mat', 'datesinperiod']
  }),

  single({
    id: 'clcg-011', domain: 'semantic', subtopic: 'time-intelligence', difficulty: 4,
    prompt: 'Reading: A YoY% calculation item:\n```dax\nVAR _curr = SELECTEDMEASURE()\nVAR _py = CALCULATE(\n    SELECTEDMEASURE(),\n    SAMEPERIODLASTYEAR(Date[Date])\n)\nRETURN\n    IF(ISBLANK(_py), BLANK(), DIVIDE(_curr - _py, _py))\n```\nThe visual filters to a product launched in 2026 with no 2025 data. The YoY% cell returns:',
    options: [
      '100% — any value divided by zero gives 100%',
      'BLANK — _py is BLANK for new products with no prior-year data; the IF guard returns BLANK explicitly',
      'An error — ISBLANK cannot be applied to a measure result',
      'Infinity — DIVIDE with zero denominator returns infinity'
    ],
    correct: 1,
    explanation: 'For a product with no 2025 data, SAMEPERIODLASTYEAR returns no rows and _py evaluates to BLANK. The IF(ISBLANK(_py), BLANK(), ...) guard fires and returns BLANK explicitly — the correct behavior for a new product where YoY% is not meaningful. DIVIDE already returns BLANK on a zero denominator, but the guard makes intent explicit and also handles the truly missing data case.',
    whyWrong: {
      0: 'DIVIDE does not return 100% for a zero denominator — it returns BLANK.',
      2: 'ISBLANK() is valid on any expression including measure results.',
      3: 'DAX DIVIDE returns BLANK (not infinity) on zero/BLANK denominator by design.'
    },
    source: SRC.semanticModel,
    tags: ['calc-groups', 'time-intelligence', 'yoy', 'isblank', 'code-reading'],
    relatedIds: ['clcg-009']
  }),

  multi({
    id: 'clcg-012', domain: 'semantic', subtopic: 'time-intelligence', difficulty: 4,
    prompt: 'Which prerequisites must be satisfied for a time-intelligence calculation group to work correctly? Select all that apply.',
    options: [
      'A Date table must be marked as "Mark as date table" in the model',
      'The Date column used in the calculation items must be continuous with no gaps',
      'The fact table must have a relationship to the Date table on the Date column',
      'All measures in the model must be in the same display folder',
      'The calculation group must be created in Tabular Editor — the Power BI Desktop UI does not support creating calculation groups natively'
    ],
    correct: [0, 1, 2, 4],
    explanation: 'The same three Date table prerequisites required by all time intelligence functions (A, B, C) apply here. Additionally, as of the current release, calculation groups can only be created via Tabular Editor (or XMLA-based tools) — the Power BI Desktop UI does not expose a "create calculation group" surface (E). Display folders (D) are unrelated.',
    whyWrong: {
      3: 'Display folders affect the Fields pane organization only. Calculation groups work across all measures regardless of folder structure.'
    },
    source: SRC.semanticModel,
    tags: ['calc-groups', 'time-intelligence', 'prerequisites', 'tabular-editor']
  }),

  // ── Variance / comparison / currency conversion (4 Q) ─────────

  multi({
    id: 'clcg-013', domain: 'semantic', subtopic: 'measure-reuse', difficulty: 3,
    prompt: 'A "Comparison" calculation group is designed to handle Actual vs Budget, variance, and variance %. Which calculation items would this group contain? Select all that apply.',
    options: [
      '"Actual" — identity item: `SELECTEDMEASURE()`',
      '"Budget" — `CALCULATE(SELECTEDMEASURE(), Budget[Scenario] = "Budget")`',
      '"Variance" — `SELECTEDMEASURE() - CALCULATE(SELECTEDMEASURE(), Budget[Scenario] = "Budget")`',
      '"Variance %" — `DIVIDE(SELECTEDMEASURE() - CALCULATE(SELECTEDMEASURE(), Budget[Scenario] = \"Budget\"), CALCULATE(SELECTEDMEASURE(), Budget[Scenario] = \"Budget\"))`',
      '"Grand Total" — `CALCULATE(SELECTEDMEASURE(), REMOVEFILTERS())`'
    ],
    correct: [0, 1, 2, 3],
    explanation: 'A Comparison group contains Actual (identity), Budget (filtered scenario), Variance (difference), and Variance % (ratio). "Grand Total" (E) belongs in a different group (e.g., an aggregation-level group) — mixing scope-changing items with scenario-selection items in one group creates ambiguity and precedence issues.',
    whyWrong: {
      4: '"Grand Total" changes the filter scope rather than switching scenarios. It is a different conceptual category and should be in a separate calculation group to avoid unexpected interaction with the comparison items.'
    },
    source: SRC.semanticModel,
    tags: ['calc-groups', 'measure-reuse', 'variance', 'actual-vs-budget']
  }),

  single({
    id: 'clcg-014', domain: 'semantic', subtopic: 'measure-reuse', difficulty: 4,
    prompt: 'Reading: A "Currency" calculation group has an item named "EUR":\n```dax\nSELECTEDMEASURE() *\n    LOOKUPVALUE(\n        ExchangeRates[Rate],\n        ExchangeRates[ToCurrency], \"EUR\",\n        ExchangeRates[Date], MAX(Date[Date])\n    )\n```\nA visual evaluates [Total Revenue] (stored in USD) through the "EUR" item. What does it return?',
    options: [
      'Total Revenue in USD — LOOKUPVALUE is evaluated separately and does not affect SELECTEDMEASURE()',
      'Total Revenue converted to EUR using the exchange rate for the latest date in the current filter context',
      'An error — LOOKUPVALUE cannot be used inside a calculation item',
      'BLANK — the currency group cannot locate a date without explicit Date context'
    ],
    correct: 1,
    explanation: 'The EUR item multiplies SELECTEDMEASURE() (which resolves to [Total Revenue]) by the exchange rate looked up from an ExchangeRates table using the latest date in the current filter. MAX(Date[Date]) provides the date anchor within the existing filter context. This is the canonical currency conversion pattern — one calculation item per target currency, applied to all monetary measures.',
    whyWrong: {
      0: 'The multiplication with the exchange rate is the entire point; it directly scales SELECTEDMEASURE().',
      2: 'LOOKUPVALUE is fully supported inside calculation item expressions.',
      3: 'MAX(Date[Date]) resolves against the current filter context; it is not BLANK unless the Date table is completely unfiltered and has no rows.'
    },
    source: SRC.semanticModel,
    tags: ['calc-groups', 'measure-reuse', 'currency-conversion', 'lookupvalue', 'code-reading']
  }),

  single({
    id: 'clcg-015', domain: 'semantic', subtopic: 'measure-reuse', difficulty: 3,
    prompt: 'A team has 12 measures (Revenue, Cost, Margin, Units, ...) and needs YTD, PY, and YoY% variants of each. Without calculation groups, how many measures would be required? With one time-intelligence calculation group (3 items + identity), how many measures are required?',
    options: [
      'Without: 36 measures; With calc group: 12 measures (the original 12 × 1 identity item)',
      'Without: 48 measures; With calc group: 12 measures',
      'Without: 36 measures; With calc group: 15 measures (12 base + 3 calc items)',
      'Without: 12 measures; With calc group: 3 measures'
    ],
    correct: 0,
    explanation: '12 measures × 3 time variants = 36 measures without calc groups. With a 3-item calculation group, you keep the original 12 measures and the items are applied automatically — 12 measures total. This is the "measure explosion" problem that calculation groups solve. (Note: the group itself has 4 items including identity, but the measure count is 12.)',
    whyWrong: {
      1: '48 would imply 4 variants; 3 variants × 12 = 36.',
      2: 'Calc items are not measures — you count the base measures only.',
      3: '12 base measures are still needed; the group does not eliminate base measures.'
    },
    source: SRC.semanticModel,
    tags: ['calc-groups', 'measure-reuse', 'measure-explosion', 'exam-trap']
  }),

  single({
    id: 'clcg-016', domain: 'semantic', subtopic: 'measure-reuse', difficulty: 4,
    prompt: 'A model has two calculation groups: "Time Intelligence" and "Currency Conversion". Both are active. When [Total Revenue] is placed in a visual with "YTD" from the Time group and "EUR" from the Currency group active simultaneously, what happens?',
    options: [
      'An error — only one calculation group can be active per visual',
      'The item with the higher Precedence property applies; the other is ignored',
      'Both items apply in precedence order: the higher-precedence item\'s SELECTEDMEASURE() resolves to the result of the lower-precedence item (nested application)',
      'The items apply in alphabetical order regardless of precedence setting'
    ],
    correct: 2,
    explanation: 'When multiple calculation groups are active simultaneously, the Precedence property determines order. The higher-precedence item wraps the lower-precedence item: SELECTEDMEASURE() inside the outer item resolves to the full expression of the inner item. For example, if Currency > Time in precedence, the Currency item\'s SELECTEDMEASURE() resolves to the YTD result, effectively computing EUR YTD Revenue.',
    whyWrong: {
      0: 'Multiple calculation groups can be simultaneously active — that is a key design scenario.',
      1: 'The lower-precedence item is not ignored; it is evaluated first and its result becomes the input for the higher-precedence item.',
      3: 'Precedence is a numeric property explicitly set on each calculation group — not alphabetical.'
    },
    source: SRC.semanticModel,
    tags: ['calc-groups', 'measure-reuse', 'precedence', 'multi-group']
  }),

  // ── Precedence and conflict resolution (3 Q) ──────────────────

  order({
    id: 'clcg-017', domain: 'semantic', subtopic: 'calc-groups', difficulty: 4,
    prompt: 'Arrange the following steps in the correct order of evaluation when a cell in a Power BI visual involves a calculation group item, from outermost to innermost:',
    options: [
      'The base measure expression (e.g., SUM(Sales[Amount])) is evaluated in the innermost context',
      'The highest-precedence calculation item\'s expression is evaluated; its SELECTEDMEASURE() resolves to the result of the next step',
      'The visual\'s filter context is established (slicers, row/column filters)',
      'Lower-precedence calculation item expressions are evaluated in precedence order, each wrapping the next'
    ],
    shuffled: [
      'The base measure expression (e.g., SUM(Sales[Amount])) is evaluated in the innermost context',
      'The visual\'s filter context is established (slicers, row/column filters)',
      'The highest-precedence calculation item\'s expression is evaluated; its SELECTEDMEASURE() resolves to the result of the next step',
      'Lower-precedence calculation item expressions are evaluated in precedence order, each wrapping the next'
    ],
    explanation: 'Evaluation order: (1) Filter context established → (2) Highest-precedence item\'s expression evaluated, SELECTEDMEASURE() points inward → (3) Lower-precedence items evaluated in order → (4) Base measure evaluated at the innermost level. This nesting is why precedence matters: the outer item sees the complete result of all inner items.',
    source: SRC.semanticModel,
    tags: ['calc-groups', 'precedence', 'evaluation-order', 'dax-context']
  }),

  multi({
    id: 'clcg-018', domain: 'semantic', subtopic: 'calc-groups', difficulty: 5,
    prompt: 'Reading: Two calculation groups exist — "Time" (Precedence=10) and "Scope" (Precedence=20). The Scope group has an item "All Products":\n```dax\nCALCULATE(SELECTEDMEASURE(), REMOVEFILTERS(Product))\n```\nThe Time group has "PY":\n```dax\nCALCULATE(SELECTEDMEASURE(), SAMEPERIODLASTYEAR(Date[Date]))\n```\nBoth items are active in a visual filtered to Product="Widget" and Date=2026-Q1. What does the cell return? Select all TRUE statements.',
    options: [
      'Scope (Precedence=20) is the outer wrapper; its SELECTEDMEASURE() resolves to the PY Time item result',
      'The cell returns Total Sales (all products) for 2025-Q1 — product filter removed by Scope, year shifted by Time',
      'The cell returns Total Sales (all products) for 2026-Q1 — Time is ignored because Scope has higher precedence',
      'If precedence were reversed (Time=20, Scope=10), the cell would return Widget-only sales for 2025-Q1',
      'Precedence determines nesting, not which item "wins" — both items contribute to the final result'
    ],
    correct: [0, 1, 4],
    explanation: 'Scope (20) wraps Time (10): Scope\'s SELECTEDMEASURE() resolves to the PY result first, then Scope removes the Product filter. Final: all products, PY (2025-Q1). Statements A, B, E are correct. C is wrong — Time is not ignored, it runs inside Scope. D describes the reversed-precedence scenario: Time outer (Widget only after REMOVEFILTERS does nothing on an already-matched product), Scope inner (all products YTD) — actually this would be all products for 2025-Q1 too; the REMOVE happens inside the PY wrapper.',
    whyWrong: {
      2: 'Higher precedence means outer wrapper, not "wins and ignores the other." Both items evaluate; Time runs inside Scope.',
      3: 'With Time outer: Time\'s SELECTEDMEASURE() resolves to the Scope (all products) result. Then Time applies SAMEPERIODLASTYEAR to that — still 2025-Q1 all products. The result is the same in this particular example, but the conceptual framing in option D is wrong.'
    },
    source: SRC.semanticModel,
    tags: ['calc-groups', 'precedence', 'multi-group', 'dax-context', 'code-reading']
  }),

  single({
    id: 'clcg-019', domain: 'semantic', subtopic: 'calc-groups', difficulty: 4,
    prompt: 'What happens when two items from DIFFERENT calculation groups both have Precedence=10?',
    options: [
      'An error is thrown at model save time — duplicate precedence across groups is forbidden',
      'The engine applies them in alphabetical order of group name when precedences are equal',
      'Behavior is undefined / non-deterministic — equal precedence across groups should be avoided by assigning distinct values',
      'The item defined first in the model wins'
    ],
    correct: 2,
    explanation: 'The Precedence property is compared across ALL calculation groups to establish nesting order. Ties produce non-deterministic or implementation-dependent behavior. Best practice: assign unique Precedence values across all calculation groups in the model. Common convention: Time=10, Scope=20, Currency=30, Comparison=40.',
    whyWrong: {
      0: 'Tabular Editor will save the model even with equal precedence; the issue manifests at query time, not save time.',
      1: 'Alphabetical fallback is not guaranteed by the spec.',
      3: 'Definition order is not a documented tiebreaker.'
    },
    source: SRC.semanticModel,
    tags: ['calc-groups', 'precedence', 'conflict-resolution', 'best-practice']
  }),

  // ── Limitations, RLS, Direct Lake (3 Q) ────────────────────────

  multi({
    id: 'clcg-020', domain: 'semantic', subtopic: 'calc-groups', difficulty: 4,
    prompt: 'Which are known limitations of calculation groups? Select all that apply.',
    options: [
      'Calculation items cannot be used as CALCULATE filter arguments — e.g., `CALCULATE([Measure], CalcGroup[Item] = "YTD")` is not valid DAX',
      'Calculation groups cannot be created through the Power BI Desktop UI; Tabular Editor or an XMLA-based tool is required',
      'A model can contain at most one calculation group',
      'Calculation groups are not supported in Direct Lake mode semantic models on Microsoft Fabric',
      'Row context from calculated columns is preserved inside calculation item expressions — but implicit measures called without SELECTEDMEASURE() do not benefit from the item'
    ],
    correct: [0, 1, 4],
    explanation: 'A: Calculation items cannot be used as CALCULATE filter predicates — this is a documented DAX restriction. B: Power BI Desktop still lacks a native UI for calculation groups (as of current release). E: Row context is preserved; the item applies only when SELECTEDMEASURE() is the entry point. C is wrong — multiple calculation groups are allowed. D is wrong — calculation groups ARE supported in Direct Lake mode.',
    whyWrong: {
      2: 'Multiple calculation groups are fully supported; many models have separate Time, Currency, and Scenario groups.',
      3: 'Calculation groups are supported in Direct Lake mode semantic models on Fabric.'
    },
    source: SRC.semanticModel,
    tags: ['calc-groups', 'limitations', 'direct-lake', 'tabular-editor']
  }),

  single({
    id: 'clcg-021', domain: 'semantic', subtopic: 'calc-groups', difficulty: 4,
    prompt: 'Reading: A calculation item expression:\n```dax\nCALCULATE(\n    SELECTEDMEASURE(),\n    DATESYTD(Date[Date])\n)\n```\nThe model also has an RLS role that filters `Sales[Region] = USERPRINCIPALNAME()`. A user with Region="West" views a matrix with this YTD item active. Which statement is TRUE?',
    options: [
      'The RLS filter is overridden by the calculation item — the user sees YTD for all regions',
      'The RLS filter and the calculation item are additive: the user sees YTD sales for the West region only',
      'RLS is incompatible with calculation groups — one must be disabled',
      'The YTD item is bypassed when RLS is active; the base measure value is shown instead'
    ],
    correct: 1,
    explanation: 'RLS filters are applied before any query context reaches the measure or calculation item. The calculation item modifies the Date filter context (adding YTD), but it has no ability to remove or override the RLS-established filter on Sales[Region]. The result is the intersection: YTD sales for West region only. RLS and calculation groups are designed to work together.',
    whyWrong: {
      0: 'RLS filter contexts are enforced at the security layer before DAX evaluation — CALCULATE and SELECTEDMEASURE() cannot escape them.',
      2: 'RLS and calculation groups are fully compatible.',
      3: 'Calculation items are not bypassed; they evaluate normally within the RLS-constrained context.'
    },
    source: SRC.rls,
    tags: ['calc-groups', 'rls', 'dax-context', 'security', 'code-reading']
  }),

  single({
    id: 'clcg-022', domain: 'semantic', subtopic: 'calc-groups', difficulty: 3,
    prompt: 'A semantic model is in Direct Lake mode on Microsoft Fabric. A developer wants to add a calculation group for time intelligence. Which statement is TRUE?',
    options: [
      'Calculation groups are not supported in Direct Lake mode; the model must be converted to Import',
      'Calculation groups are supported in Direct Lake mode; they are created via Tabular Editor connected to the XMLA endpoint',
      'Calculation groups require falling back to DirectQuery mode when active in a visual',
      'Calculation groups in Direct Lake are only supported for F64 SKUs or higher'
    ],
    correct: 1,
    explanation: 'Calculation groups are a semantic model feature — they run in the Analysis Services engine layer, not in the storage layer. Direct Lake uses the same engine as Import for query processing after data is loaded from OneLake. Calculation groups work in Direct Lake mode and are created via Tabular Editor or XMLA endpoint (since Power BI Desktop does not expose the creation UI).',
    whyWrong: {
      0: 'Calculation groups are supported in Direct Lake — the engine layer is identical.',
      2: 'Calculation groups do not trigger a Direct Lake fallback to DirectQuery; they are engine-layer features.',
      3: 'There is no SKU restriction for calculation groups in Direct Lake mode.'
    },
    source: SRC.directLake,
    tags: ['calc-groups', 'direct-lake', 'fabric', 'xmla']
  }),

  // ── Tool requirements + alternatives (3 Q) ────────────────────

  single({
    id: 'clcg-023', domain: 'semantic', subtopic: 'calc-groups', difficulty: 2,
    prompt: 'A Power BI developer needs to create a calculation group in a Fabric semantic model. Which tool is required?',
    options: [
      'Power BI Desktop — use the Modeling tab → New Calculation Group',
      'DAX Studio — write a CREATE CALCULATION GROUP statement',
      'Tabular Editor (version 2 or 3) connected to the model via XMLA endpoint, or the Power BI web model explorer (where available)',
      'Power Query editor — add a new query of type Calculation Group'
    ],
    correct: 2,
    explanation: 'Calculation groups must be created using Tabular Editor (the industry-standard tool for advanced semantic model authoring) connected via the XMLA endpoint. As of current Power BI Desktop releases, there is no native "New Calculation Group" UI. Power BI web-based model editing in Fabric has progressively added support — but Tabular Editor remains the primary and reliable path.',
    whyWrong: {
      0: 'Power BI Desktop does not have a "New Calculation Group" UI as of the current release.',
      1: 'DAX Studio is a query and performance tool; it does not have a CREATE CALCULATION GROUP statement for DDL changes.',
      3: 'Power Query is for data transformation; it has no concept of calculation groups.'
    },
    source: SRC.xmla,
    tags: ['calc-groups', 'tabular-editor', 'xmla', 'tooling']
  }),

  multi({
    id: 'clcg-024', domain: 'semantic', subtopic: 'calc-groups', difficulty: 4,
    prompt: 'A report author is deciding between calculation groups, separate measures, and field parameters for a "show YTD / PY / YoY%" toggle. Which guidelines are TRUE? Select all that apply.',
    options: [
      'Calculation groups are best when the same time-period logic should apply to multiple measures — avoids measure explosion',
      'Separate measures (e.g., [Revenue YTD], [Cost YTD]) are simpler to understand for one-off calculations but scale poorly across many measures',
      'Field parameters create a slicer-driven selection of measures; they do not modify measure calculation logic — they select which measure to display',
      'Calculation groups require Tabular Editor; if the author has no access to Tabular Editor, separate measures are the fallback',
      'Field parameters can replicate calculation group time-intelligence behavior without any model changes'
    ],
    correct: [0, 1, 2, 3],
    explanation: 'Calc groups shine when N measures × M time periods would explode the model (A). Separate measures are the fallback when calc groups are unavailable or the team lacks tooling access (B, D). Field parameters select WHICH measure to show — they do not modify HOW the measure calculates (C). (E) is wrong: field parameters only swap which measure is displayed; they cannot inject a YTD filter into the calculation.',
    whyWrong: {
      4: 'Field parameters swap the displayed measure; they do not modify calculation logic. A YTD field parameter would only work if separate YTD measures exist — it does not create the YTD logic itself.'
    },
    source: SRC.semanticModel,
    tags: ['calc-groups', 'measure-reuse', 'field-parameters', 'comparison', 'design-decision']
  }),

  single({
    id: 'clcg-025', domain: 'semantic', subtopic: 'calc-groups', difficulty: 5,
    prompt: 'A model has a calculation group with a "None" item set as the default (Ordinal=0) that returns SELECTEDMEASURE() unchanged. A developer notices that existing visuals that did NOT previously reference the calculation group now return BLANK for all measures. What is the most likely cause?',
    options: [
      'The calculation group\'s "None" item is overriding the filter context — remove the default item',
      'The model has "Calculation Group Precedence" set to override implicit measures. The calculation group\'s implicit filter (applied when no item is selected) is filtering out all rows. Check the group\'s implicit filter DAX.',
      'Setting any calculation group on a model requires every visual to explicitly select an item from that group. If no item is selected, the engine applies an empty / null item and the measure returns BLANK.',
      'This is a known bug in Power BI Desktop that is fixed by refreshing the visual'
    ],
    correct: 2,
    explanation: 'This is the most important calculation group deployment trap: once a calculation group exists in a model, every measure evaluation in a visual context must have an active calculation item from that group (or be explicitly excluded via the group\'s filter). Visuals that do not have an item from the calculation group on them effectively receive no item — and the engine returns BLANK for measures that the group covers. The fix: ensure visuals always include a selection from the group (including a "None/Actual" identity item) or configure group membership to not cover those measures.',
    whyWrong: {
      0: 'The "None" identity item is correct design; the problem is that it is not being applied in the blank visuals.',
      1: 'There is no "Calculation Group Precedence override" property that behaves this way.',
      3: 'This is not a bug — it is by-design behavior. Refreshing does nothing.'
    },
    source: SRC.semanticModel,
    tags: ['calc-groups', 'exam-trap', 'implicit-filter', 'deployment', 'blank-result'],
    relatedIds: ['clcg-016', 'clcg-017']
  })
];
