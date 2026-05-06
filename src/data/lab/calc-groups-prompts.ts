// Calc Groups Code Lab — 10 prompts where the user reads a calc group
// definition + base measure context and picks the right calc item to apply.
// Mirrors the picker-prompts shape but with code blocks and a fixed 5-option
// vocabulary per prompt (calc items vary by group).

export interface CalcGroupOption {
  id: string;
  label: string;
}

export interface CalcGroupPrompt {
  id: string; // cgl-001..cgl-010
  business: string;
  scenario: string;
  /** Calc group definition shown to the user as code. */
  calcGroupDax: string;
  /** Base measure used as context. */
  baseMeasureDax: string;
  /** The candidate calc-item names; the user picks one of these. */
  options: CalcGroupOption[];
  correctId: string;
  explanation: string;
  whyWrong: Record<string, string>;
  difficulty: 2 | 3 | 4 | 5;
  tags: string[];
}

export const calcGroupPrompts: CalcGroupPrompt[] = [
  {
    id: 'cgl-001',
    business: 'Sales report needs YoY comparison.',
    scenario: 'You have a Time Intelligence calc group below. The CFO wants "Sales Amount last year, same period". Which calc item applies?',
    calcGroupDax:
      'CALCULATIONGROUP "Time Intelligence"\n  CALCULATIONITEM "Current"      = SELECTEDMEASURE()\n  CALCULATIONITEM "MTD"          = TOTALMTD ( SELECTEDMEASURE(), \'Date\'[Date] )\n  CALCULATIONITEM "YTD"          = TOTALYTD ( SELECTEDMEASURE(), \'Date\'[Date] )\n  CALCULATIONITEM "PY"           = CALCULATE ( SELECTEDMEASURE(), SAMEPERIODLASTYEAR(\'Date\'[Date]) )\n  CALCULATIONITEM "PY YTD"       = CALCULATE ( TOTALYTD ( SELECTEDMEASURE(), \'Date\'[Date] ), SAMEPERIODLASTYEAR(\'Date\'[Date]) )',
    baseMeasureDax: '[Sales Amount] = SUMX ( Sales, Sales[Quantity] * Sales[Unit Price] )',
    options: [
      { id: 'current', label: 'Current' },
      { id: 'mtd', label: 'MTD' },
      { id: 'ytd', label: 'YTD' },
      { id: 'py', label: 'PY' },
      { id: 'py-ytd', label: 'PY YTD' }
    ],
    correctId: 'py',
    explanation: 'PY applies SAMEPERIODLASTYEAR to whatever measure is selected — exactly "same period, last year". MTD/YTD trim to the start of period; "PY YTD" is year-to-date last year, not the same period.',
    whyWrong: {
      current: 'Returns the current selection unchanged.',
      mtd: 'Resets the period to the first of the current month — not last year.',
      ytd: 'Resets to the first of the calendar/fiscal year — not last year.',
      'py-ytd': 'Returns YTD shifted to last year (e.g., Jan 1 to today\'s date last year), not the same period.'
    },
    difficulty: 2,
    tags: ['calc-groups', 'time-intelligence']
  },
  {
    id: 'cgl-002',
    business: 'Operations dashboard needs current month accumulation.',
    scenario: 'Same Time Intelligence calc group. The user filters Date[Year]=2024 and wants Sales accumulated from March 1 to March 17 (today). Which calc item?',
    calcGroupDax:
      'CALCULATIONGROUP "Time Intelligence"\n  CALCULATIONITEM "Current"      = SELECTEDMEASURE()\n  CALCULATIONITEM "MTD"          = TOTALMTD ( SELECTEDMEASURE(), \'Date\'[Date] )\n  CALCULATIONITEM "YTD"          = TOTALYTD ( SELECTEDMEASURE(), \'Date\'[Date] )\n  CALCULATIONITEM "PY"           = CALCULATE ( SELECTEDMEASURE(), SAMEPERIODLASTYEAR(\'Date\'[Date]) )',
    baseMeasureDax: '[Sales Amount] = SUMX ( Sales, Sales[Quantity] * Sales[Unit Price] )',
    options: [
      { id: 'current', label: 'Current' },
      { id: 'mtd', label: 'MTD' },
      { id: 'ytd', label: 'YTD' },
      { id: 'py', label: 'PY' }
    ],
    correctId: 'mtd',
    explanation: 'TOTALMTD trims the date filter to start-of-current-month through the latest visible date, which matches "accumulated this month".',
    whyWrong: {
      current: 'Returns whatever the user already filtered, not month-to-date.',
      ytd: 'Accumulates from January 1, not from start of March.',
      py: 'Shifts to last year — wrong period entirely.'
    },
    difficulty: 2,
    tags: ['calc-groups', 'time-intelligence']
  },
  {
    id: 'cgl-003',
    business: 'Currency conversion calc group.',
    scenario: 'You apply this calc group to [Sales Amount]. The user filters Currency[Code] = "EUR". Which calc item produces "Sales Amount in EUR"?',
    calcGroupDax:
      'CALCULATIONGROUP "Currency"\n  CALCULATIONITEM "Reporting"  = SELECTEDMEASURE() * LOOKUPVALUE ( Rates[Rate], Rates[From] = "USD", Rates[To] = SELECTEDVALUE(Currency[Code]) )\n  CALCULATIONITEM "Source"     = SELECTEDMEASURE()\n  CALCULATIONITEM "USD Only"   = CALCULATE ( SELECTEDMEASURE(), Currency[Code] = "USD" )',
    baseMeasureDax: '[Sales Amount] = SUMX ( Sales, Sales[Quantity] * Sales[Unit Price] ) // base currency = USD',
    options: [
      { id: 'reporting', label: 'Reporting' },
      { id: 'source', label: 'Source' },
      { id: 'usd-only', label: 'USD Only' }
    ],
    correctId: 'reporting',
    explanation: 'Reporting multiplies the base measure by the FX rate looked up against SELECTEDVALUE(Currency[Code]). Filter Currency[Code]="EUR" → USD→EUR rate is applied.',
    whyWrong: {
      source: 'Returns the base measure in source currency (USD) regardless of the user filter.',
      'usd-only': 'Forces the calc to USD, ignoring the EUR filter the user applied.'
    },
    difficulty: 3,
    tags: ['calc-groups', 'dynamic-format-strings']
  },
  {
    id: 'cgl-004',
    business: 'Format calc group for currency display.',
    scenario: 'Calc group is applied. The reporting team wants "$1,234.56" formatting (two decimals). Which calc item applies the right format string?',
    calcGroupDax:
      'CALCULATIONGROUP "Format"\n  CALCULATIONITEM "Whole"     = SELECTEDMEASURE() FORMAT STRING = "$#,##0"\n  CALCULATIONITEM "Decimal"   = SELECTEDMEASURE() FORMAT STRING = "$#,##0.00"\n  CALCULATIONITEM "Thousands" = SELECTEDMEASURE() / 1000 FORMAT STRING = "$#,##0K"\n  CALCULATIONITEM "Millions"  = SELECTEDMEASURE() / 1000000 FORMAT STRING = "$#,##0M"',
    baseMeasureDax: '[Sales Amount] = SUMX ( Sales, Sales[Quantity] * Sales[Unit Price] )',
    options: [
      { id: 'whole', label: 'Whole' },
      { id: 'decimal', label: 'Decimal' },
      { id: 'thousands', label: 'Thousands' },
      { id: 'millions', label: 'Millions' }
    ],
    correctId: 'decimal',
    explanation: 'Format string "$#,##0.00" produces "$1,234.56" with two decimals.',
    whyWrong: {
      whole: '"$#,##0" rounds to whole dollars — no decimals.',
      thousands: 'Divides by 1000 and shows "$1K" — wrong magnitude.',
      millions: 'Divides by 1M — collapses too far.'
    },
    difficulty: 2,
    tags: ['calc-groups', 'dynamic-format-strings']
  },
  {
    id: 'cgl-005',
    business: 'Period-over-period growth %.',
    scenario: 'Time Intelligence calc group plus a Variance group. User wants "Sales YoY growth %". Which calc item from the Variance group?',
    calcGroupDax:
      'CALCULATIONGROUP "Variance"\n  CALCULATIONITEM "Δ vs PY"     = SELECTEDMEASURE() - CALCULATE ( SELECTEDMEASURE(), SAMEPERIODLASTYEAR(\'Date\'[Date]) )\n  CALCULATIONITEM "Δ % vs PY"   = DIVIDE ( SELECTEDMEASURE() - CALCULATE ( SELECTEDMEASURE(), SAMEPERIODLASTYEAR(\'Date\'[Date]) ), CALCULATE ( SELECTEDMEASURE(), SAMEPERIODLASTYEAR(\'Date\'[Date]) ) )\n  CALCULATIONITEM "PY Value"    = CALCULATE ( SELECTEDMEASURE(), SAMEPERIODLASTYEAR(\'Date\'[Date]) )',
    baseMeasureDax: '[Sales Amount] = SUMX ( Sales, Sales[Quantity] * Sales[Unit Price] )',
    options: [
      { id: 'delta-py', label: 'Δ vs PY' },
      { id: 'delta-pct-py', label: 'Δ % vs PY' },
      { id: 'py-value', label: 'PY Value' }
    ],
    correctId: 'delta-pct-py',
    explanation: 'DIVIDE((Current - PY), PY) gives the percentage change — "growth %".',
    whyWrong: {
      'delta-py': 'Absolute delta in $ — not a percentage.',
      'py-value': 'Just the prior-year baseline value, not growth.'
    },
    difficulty: 3,
    tags: ['calc-groups', 'time-intelligence']
  },
  {
    id: 'cgl-006',
    business: 'Cross-calc-group precedence.',
    scenario: 'Two calc groups apply: Time Intelligence (precedence 0) and Variance (precedence 10). User selects Time=YTD AND Variance=Δ%. Which calc item is OUTERMOST (outer wraps inner)?',
    calcGroupDax:
      'CALCULATIONGROUP "Time Intelligence" PRECEDENCE 0\n  CALCULATIONITEM "YTD"  = TOTALYTD ( SELECTEDMEASURE(), \'Date\'[Date] )\n\nCALCULATIONGROUP "Variance" PRECEDENCE 10\n  CALCULATIONITEM "Δ %"  = DIVIDE ( SELECTEDMEASURE() - CALCULATE ( SELECTEDMEASURE(), SAMEPERIODLASTYEAR(\'Date\'[Date]) ), CALCULATE ( SELECTEDMEASURE(), SAMEPERIODLASTYEAR(\'Date\'[Date]) ) )',
    baseMeasureDax: '[Sales Amount]',
    options: [
      { id: 'time-ytd', label: 'Time Intelligence YTD (outer wraps Variance)' },
      { id: 'variance-pct', label: 'Variance Δ % (outer wraps Time Intelligence)' }
    ],
    correctId: 'variance-pct',
    explanation: 'HIGHER precedence = OUTER. Variance precedence 10 > Time precedence 0, so Variance wraps Time. Result: Δ% between (YTD this year) and (YTD last year).',
    whyWrong: {
      'time-ytd': 'Time precedence 0 < Variance 10. Lower precedence is INNER, not outer.'
    },
    difficulty: 4,
    tags: ['calc-groups', 'dax-context']
  },
  {
    id: 'cgl-007',
    business: 'No selection on a calc group.',
    scenario: 'A calc group exists with calc items {"Current", "PY"} but the user has NO calc-item filter applied. What does [Sales Amount] return?',
    calcGroupDax:
      'CALCULATIONGROUP "Time Intelligence"\n  CALCULATIONITEM "Current" = SELECTEDMEASURE()\n  CALCULATIONITEM "PY"      = CALCULATE ( SELECTEDMEASURE(), SAMEPERIODLASTYEAR(\'Date\'[Date]) )',
    baseMeasureDax: '[Sales Amount] = SUMX ( Sales, Sales[Quantity] * Sales[Unit Price] )',
    options: [
      { id: 'current-default', label: 'The base measure unchanged (calc group has no effect)' },
      { id: 'sum-of-items', label: 'The sum of all calc-item results' },
      { id: 'first-item', label: 'The first calc item (Current)' },
      { id: 'error', label: 'Error — calc-item selection required' }
    ],
    correctId: 'current-default',
    explanation: 'No calc-item filter = no calc-item applied. The calc group is inert; the base measure is returned unchanged.',
    whyWrong: {
      'sum-of-items': 'Calc groups never sum items together; they apply one at a time.',
      'first-item': 'Order doesn\'t determine a default unless the calc group has a default explicitly defined.',
      error: 'Engine doesn\'t require selection; it just doesn\'t apply the group.'
    },
    difficulty: 3,
    tags: ['calc-groups']
  },
  {
    id: 'cgl-008',
    business: 'Calc item with explicit format override.',
    scenario: 'Calc item "Percentage" returns DIVIDE(SELECTEDMEASURE(), CALCULATE(SELECTEDMEASURE(), ALL(\'Product\'))). The base measure is [Sales Amount] formatted as "$#,##0". After applying Percentage, what format does the matrix cell show?',
    calcGroupDax:
      'CALCULATIONGROUP "Share"\n  CALCULATIONITEM "Percentage" = DIVIDE ( SELECTEDMEASURE(), CALCULATE ( SELECTEDMEASURE(), ALL(\'Product\') ) ) FORMAT STRING = "0.00%"',
    baseMeasureDax: '[Sales Amount]   FORMAT STRING = "$#,##0"',
    options: [
      { id: 'pct', label: '"0.00%" (calc item override)' },
      { id: 'dollar', label: '"$#,##0" (base measure)' },
      { id: 'engine-default', label: 'Engine-default numeric (no format)' }
    ],
    correctId: 'pct',
    explanation: 'Calc-item FORMAT STRING overrides the base measure\'s format when the calc item is applied. Result format is "0.00%".',
    whyWrong: {
      dollar: 'Base format is overridden by the calc-item format string.',
      'engine-default': 'A format string IS specified on the calc item — engine-default doesn\'t apply.'
    },
    difficulty: 3,
    tags: ['calc-groups', 'dynamic-format-strings']
  },
  {
    id: 'cgl-009',
    business: 'Inappropriate calc group target.',
    scenario: 'A Time Intelligence calc group is applied. The user filters \'Date\'[Date] = "2024-03-01" (a SINGLE day) and selects calc item "MTD". What does TOTALMTD return?',
    calcGroupDax:
      'CALCULATIONGROUP "Time Intelligence"\n  CALCULATIONITEM "MTD" = TOTALMTD ( SELECTEDMEASURE(), \'Date\'[Date] )',
    baseMeasureDax: '[Sales Amount]',
    options: [
      { id: 'mtd-march', label: 'Sales from March 1 through March 1 (single day)' },
      { id: 'mtd-extended', label: 'Sales from March 1 through end-of-month (March 31)' },
      { id: 'mtd-base', label: 'Same as base measure — single-day filter overrides MTD' },
      { id: 'error', label: 'Error — TOTALMTD requires a date range' }
    ],
    correctId: 'mtd-march',
    explanation: 'TOTALMTD trims to start-of-month through the LATEST visible date. With Date[Date]=March 1, latest visible is March 1, so result = single day.',
    whyWrong: {
      'mtd-extended': 'TOTALMTD does NOT extend forward — it trims forward to the latest date in the filter.',
      'mtd-base': 'Calc group still applies; the single-day filter just makes MTD trivial.',
      error: 'TOTALMTD accepts any date column; no range required.'
    },
    difficulty: 4,
    tags: ['calc-groups', 'time-intelligence', 'dax-context']
  },
  {
    id: 'cgl-010',
    business: 'Calc group with measure exclusion.',
    scenario: 'A calc group "Variance" should apply to most measures BUT the calc item "Δ %" makes no sense for [Customer Count]. Which DAX expression is the right calc-item body to gracefully fall through?',
    calcGroupDax:
      'CALCULATIONGROUP "Variance"\n  CALCULATIONITEM "Δ %" = <CHOOSE EXPRESSION>',
    baseMeasureDax: '[Sales Amount], [Customer Count] -- both selectable',
    options: [
      { id: 'guard-isvar', label: 'IF ( SELECTEDMEASURENAME() = "Customer Count", SELECTEDMEASURE(), DIVIDE( ... ) )' },
      { id: 'no-guard', label: 'DIVIDE ( SELECTEDMEASURE() - CALCULATE(...), CALCULATE(...) )' },
      { id: 'blank-always', label: 'BLANK()' }
    ],
    correctId: 'guard-isvar',
    explanation: 'Use SELECTEDMEASURENAME() in an IF guard to detect the measure and fall through to the base measure for excluded ones. Pattern is documented in MS Calc Group docs as the standard exclusion idiom.',
    whyWrong: {
      'no-guard': 'Computes Δ% on Customer Count which has no meaningful prior-year comparison; result is garbage.',
      'blank-always': 'Disables the calc item entirely — also breaks Sales Amount.'
    },
    difficulty: 4,
    tags: ['calc-groups', 'dax-context']
  }
];
