// Additional reference sections for DP-600 Stark V2.
// DO NOT modify content.ts. Import and spread this into refSections where needed.

import type { RefSection } from './content';

export const refSectionsExtras: RefSection[] = [
  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Day-of-exam checklist
  // ─────────────────────────────────────────────────────────────────────────────
  {
    slug: 'day-of-exam-checklist',
    category: 'exam-prep',
    title: 'Day-of-exam checklist',
    paragraphs: [
      '100 minutes / 65 questions = ~92 seconds per question. Every minute spent hunting for a fact you half-remember is a question you cannot answer. This checklist gets you to the start screen in the right mental state.',
    ],
    bullets: [
      'T-60 min: open the Reference sheet trap-focus view and skim Top 10 RLS Traps, Direct Lake decision tree, and DAX perf cheat sheet. Read, do not study.',
      'T-30 min: close all browser tabs except the exam portal. Clear your desktop.',
      'T-15 min: arrive at the test center (or launch the online proctored session). Verify photo ID matches the account name exactly.',
      'T-5 min: mental warm-up — recall 5 traps you know cold (USERPRINCIPALNAME vs USERNAME; multi-role UNION; V-Order fallback; sensitivity labels ≠ row filter; Gen1 not in pipelines).',
      'T-0: read the ENTIRE question stem before reading the options. The discriminating detail is usually in the last sentence.',
      'First pass: answer every question you know in under 60 seconds. Flag everything else. Move on — do not stall.',
      'Second pass: flagged questions only. Apply elimination: kill the two most-wrong distractors first, then discriminate between the remaining two.',
      'Time check at Q33: you should be at ~50 min remaining. If not, speed up on low-confidence items.',
      'Case-study items (if present): read the constraints section first — they bound every answer in that block.',
      'Do not change an answer unless you find a logical flaw in your first read. Gut changes lose more than they gain.',
      'Never leave a question blank — partial credit is impossible; guessing is +EV.',
      'After submit: do not second-guess. Results post within minutes for most delivery modes.',
    ],
    warning:
      'Do not study new material in the last 24 hours — anchor on what you already know. A new card memorised in the final hour displaces two cards you already had cold.',
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Top 10 RLS traps
  // ─────────────────────────────────────────────────────────────────────────────
  {
    slug: 'top-10-rls-traps',
    category: 'security-rls',
    title: 'Top 10 RLS traps — exam',
    paragraphs: [
      'RLS is the highest-density security topic on DP-600: roughly one in four security questions involves a nuance that trips candidates who know the concept but miss the edge case. The ten traps below cover ~90% of wrong answers on past exams.',
    ],
    table: {
      headers: ['#', 'Trap', 'Discriminator', 'Right answer pattern'],
      rows: [
        [
          '1',
          'Model owner / Admin bypass',
          'Tester sees ALL rows even with RLS configured',
          'Test with a non-owner user identity ("View as role" in Power BI Service). Owner always bypasses — by design.',
        ],
        [
          '2',
          'Multi-role UNION (not AND)',
          'User in two roles sees MORE rows than expected',
          'Roles combine via UNION. Consolidate predicates into ONE role with AND logic to get intersection.',
        ],
        [
          '3',
          'LOOKUPVALUE returns BLANK when user not in table',
          'Dynamic RLS grants all-or-nothing access unexpectedly',
          'Wrap LOOKUPVALUE in COALESCE or add an IFERROR branch. BLANK predicate = no filter = all rows visible.',
        ],
        [
          '4',
          'USERPRINCIPALNAME() vs USERNAME()',
          'Cloud workload: RLS filter never matches',
          'Use USERPRINCIPALNAME() for cloud/Entra-backed identities. USERNAME() returns DOMAIN\\user — matches only on-prem.',
        ],
        [
          '5',
          'Warehouse RLS forces Direct Lake to fall back to DirectQuery',
          'Performance degrades after enabling SQL security policy on warehouse',
          'Evaluate SQL RLS early; if perf matters, move the filter to the semantic model layer instead.',
        ],
        [
          '6',
          'Direct Lake on OneLake bypasses SQL endpoint RLS entirely',
          '"SQL RLS configured" + Direct Lake on OneLake = users see data they should not',
          'Enforce row security at the semantic model level OR via OneLake folder ACLs, not SQL RLS.',
        ],
        [
          '7',
          'PATHCONTAINS hierarchy filter',
          'Hierarchy RLS granting access to sub-nodes accidentally grants parent nodes too',
          'PATHCONTAINS([OrgPath], USERPRINCIPALNAME()) matches ANY level; combine with level-depth check if parent visibility is restricted.',
        ],
        [
          '8',
          'Bridge table cross-filter direction',
          'Many-to-many RLS filter does not propagate from bridge table to fact',
          'Cross-filter direction on the bridge relationship must be set to Both (or use CROSSFILTER in the role DAX) for the filter to reach the fact.',
        ],
        [
          '9',
          'RLS membership does not promote across pipeline stages',
          'Promoted report from Test → Prod loses RLS assignments',
          'Deployment pipeline promotes ARTIFACTS, not security role MEMBERSHIPS. Reassign RLS members in each stage workspace manually.',
        ],
        [
          '10',
          '"View as role" vs "Test as user"',
          'QA approves RLS but prod users still see wrong data',
          '"View as role" evaluates DAX with a synthetic UPN; "Test as user" (XMLA or Power BI REST API) evaluates with the actual user token. Use the latter for acceptance testing.',
        ],
      ],
    },
    warning:
      'The meta-pattern: most RLS failures are identity mismatches (wrong function), scope mismatches (wrong layer), or membership mismatches (UNION not AND). When you see an RLS question, ask "which layer, which function, which user context?" before reading the options.',
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Direct Lake decision tree
  // ─────────────────────────────────────────────────────────────────────────────
  {
    slug: 'direct-lake-decision-tree',
    category: 'storage-modes',
    title: 'Direct Lake decision tree',
    paragraphs: [
      'Direct Lake is the default choice for Fabric-native semantic models, but four conditions force a fallback to Import or DirectQuery. Work through the questions below top-to-bottom; the first "No" determines your mode.',
    ],
    bullets: [
      'Is the data source a Fabric Lakehouse, Warehouse, or Mirrored Database? → No: Direct Lake is unavailable. Use Import or DirectQuery.',
      'Are the Delta tables V-Order optimized? → No: queries silently fall back to DirectQuery. Remediate with OPTIMIZE … VORDER=TRUE or fix the writer.',
      'Is the Fabric capacity on an F SKU (not Premium P or Embedded A)? → No: Direct Lake is not available on P/A SKUs. Use Import.',
      'Do you need composite model support (Import + Direct Lake + DirectQuery together)? → Yes + OneLake variant: supported. Yes + SQL variant: NOT supported — pick OneLake variant or restructure the model.',
      'Is SQL endpoint RLS (CREATE SECURITY POLICY) configured? → Yes: Direct Lake on Warehouse falls back to DirectQuery per query. Move RLS to the semantic model layer to stay on Direct Lake.',
      'Do you need zero query fallback (guaranteed Direct Lake perf)? → Yes: set Direct Lake behavior = DirectLakeOnly. Queries fail rather than silently degrade.',
      'Is the table sourced via a shortcut to an external store (ADLS, S3)? → Verify Delta + V-Order on the external source; shortcut does not add V-Order automatically.',
    ],
    table: {
      headers: ['Condition', 'Choose', 'Why'],
      rows: [
        [
          'Fabric Lakehouse / Warehouse / Mirrored DB, V-Ordered Delta, F SKU',
          'Direct Lake',
          'Best latency + freshness combination; no import memory overhead',
        ],
        [
          'Need real-time data <1s; data NOT in Fabric OneLake',
          'DirectQuery',
          'Direct Lake requires Delta in OneLake; DQ queries the source directly',
        ],
        [
          'Static reference / slowly-changing dim; freshness measured in days',
          'Import',
          'Fastest query performance; acceptable freshness lag for slow-changing data',
        ],
        [
          'Large fact + small dims; F SKU; dims change rarely',
          'Composite (Import dims + Direct Lake fact)',
          'Dims cached in VertiPaq; fact served Direct Lake; best of both worlds',
        ],
        [
          'SQL endpoint RLS required AND Direct Lake perf required',
          'Direct Lake + model-level RLS',
          'Warehouse RLS forces DQ fallback; model RLS stays on column-segment path',
        ],
        [
          'Non-V-Order Delta (third-party writer)',
          'DirectQuery OR remediate with OPTIMIZE',
          'Direct Lake silently falls back anyway; make it explicit or fix the source',
        ],
        [
          'KQL Database / Eventhouse source',
          'DirectQuery',
          'Kusto engine is not Delta-Parquet; Direct Lake incompatible',
        ],
        [
          'P/A SKU capacity (not F SKU)',
          'Import or DirectQuery',
          'Direct Lake requires F SKU Fabric capacity',
        ],
      ],
    },
    code: {
      lang: 'text',
      body:
        '// Direct Lake mode-pick pseudocode (top-to-bottom; first match wins)\n' +
        'if source NOT in {Lakehouse, Warehouse, MirroredDB} → DirectQuery\n' +
        'if Delta NOT V-Ordered                              → DirectQuery (or OPTIMIZE first)\n' +
        'if capacity NOT F-SKU                              → Import | DirectQuery\n' +
        'if SQL endpoint RLS enforced + perf SLA            → Direct Lake + MODEL RLS\n' +
        'else                                               → Direct Lake ✓',
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. DAX performance cheat sheet
  // ─────────────────────────────────────────────────────────────────────────────
  {
    slug: 'dax-perf-cheat-sheet',
    category: 'dax-perf',
    title: 'DAX performance cheat sheet',
    paragraphs: [
      'VertiPaq has two execution engines: the Storage Engine (SE) runs multi-threaded columnar scans — microseconds per column segment. The Formula Engine (FE) is single-threaded and interprets row-by-row logic — orders of magnitude slower. Every DAX performance optimization is about pushing work to SE and keeping FE out of the hot path.',
    ],
    bullets: [
      'Use simple aggregators (SUM, AVERAGE, MIN, MAX, COUNTROWS) over single columns — they go straight to SE. Iterator equivalents (SUMX, AVERAGEX) run in FE.',
      'KEEPFILTERS in CALCULATE intersects with existing context instead of replacing it — avoids accidental slicer override AND is cheaper than a full FILTER table scan.',
      'Avoid FILTER(table, [Measure] > X) — measures inside FILTER predicates are non-sargable (FE cannot push them to SE). Replace with a calculated column if the threshold is static.',
      'Cache repeated sub-expressions in VAR — a VAR is evaluated once at declaration time in its row context, then reused. Re-evaluating the same expression 10× in a measure pays 10× FE cost.',
      'SUMX over a filtered table beats nested CALCULATE with a FILTER modifier when the inner table scan is smaller (reduce rows before iterating).',
      'ALL(column) clears one column; ALL(table) clears the whole table. Never use ALL(table) when you only need to clear one column — it wipes related slicer context.',
      'RANKX requires ALL(table) in the first argument to see the full population — without it, the matrix visual filters the table to one row and always returns rank 1.',
      'Context transition (calling a measure inside a row context) costs one FE evaluation per row. On 200M-row tables this dominates. Materialize via ADDCOLUMNS / SUMMARIZE before iterating.',
      'Calculation groups run once and reuse the result across all visuals using the target measure — cheaper than per-measure duplicated time-intelligence logic.',
      'DIVIDE(numerator, denominator, 0) is safer and marginally faster than numerator / denominator — avoids divide-by-zero FE error handling.',
      'Bidirectional cross-filter: never set as model default. Enable per-measure via CROSSFILTER() inside CALCULATE to contain the cost.',
      'STRING operations (CONCATENATE, SEARCH, SUBSTITUTE) are almost always FE work. Keep them out of frequently evaluated measures.',
      'Disable auto date/time tables for large models — they create hidden shadow tables that double date-dimension memory and add implicit relationships.',
      'Measure dependencies: measure A calls measure B calls measure C. Each hop is an FE round-trip. Flatten when the call chain is >3 deep and the measure fires on every cell.',
      'Use Performance Analyzer in Power BI Desktop to find the top-p95 visual; use DAX Studio Server Timings to split SE vs FE milliseconds. Never tune blind.',
    ],
    table: {
      headers: ['Anti-pattern', 'Why slow', 'Fix'],
      rows: [
        [
          'SUMX(BigTable, BigTable[Qty] * BigTable[Price])',
          'FE iterates every row of BigTable even when a predicate could filter first',
          'Add a CALCULATETABLE pre-filter: SUMX(CALCULATETABLE(BigTable, ...), ...) to reduce rows, or use a calculated column for Qty*Price',
        ],
        [
          'FILTER(table, [Measure] > threshold)',
          'Measure evaluation inside FILTER forces FE for every row — non-sargable',
          'Replace [Measure] with a calculated column if threshold is static; use a KEEPFILTERS predicate if threshold is dynamic',
        ],
        [
          'CALCULATE([M], ALL(Product))',
          'ALL(Product) clears ALL columns including those used by other slicers in the same visual',
          'Use ALL(Product[Category]) or ALLEXCEPT(Product, Product[Region]) to scope the clear',
        ],
        [
          'RANKX(Customer, [Total Sales]) in a matrix',
          'Matrix already filters Customer table to 1 row per cell → RANKX sees 1 row → rank always 1',
          'RANKX(ALL(Customer), [Total Sales], , DESC) — ALL removes the cell filter',
        ],
        [
          'Re-evaluating the same expensive expression 3× in a measure',
          'FE evaluates it 3× per cell',
          'VAR _result = <expr> captures once; RETURN uses the cached scalar',
        ],
        [
          'Bidirectional cross-filter on every relationship',
          'Each filter hop fans out exponentially; ambiguous paths raise errors',
          'Set relationships to single-direction; use CROSSFILTER() per-measure only when needed',
        ],
        [
          'Auto date/time tables on a 50M-row fact',
          'Hidden shadow date table per date column doubles memory; cascading implicit relationships',
          'Disable auto date/time in model settings; build ONE explicit marked date dim',
        ],
        [
          'AVERAGEX(Sales, Sales[Amount]) over 100M rows',
          'FE iterates 100M rows when a single AVERAGE() call pushes the same work to SE',
          'AVERAGE(Sales[Amount]) — SE segment scan, milliseconds vs seconds',
        ],
      ],
    },
    warning:
      'The canonical DAX exam trap: SUMX or AVERAGEX over a large table when SUM or AVERAGE would do. The iterator runs in the Formula Engine (single-threaded, slow); the aggregator runs in the Storage Engine (multi-threaded, fast). Check the inner expression first — if it is a single column reference, use the simple aggregator.',
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. Fabric item quick-pick
  // ─────────────────────────────────────────────────────────────────────────────
  {
    slug: 'fabric-item-quick-pick',
    category: 'fabric-architecture',
    title: 'Fabric item quick-pick',
    paragraphs: [
      'Eight Fabric items compete for the same workloads. The exam discriminates between Lakehouse vs Warehouse, Eventhouse vs Lakehouse, and Pipeline vs Dataflow Gen2 most frequently. Use the table to pick the least operationally complex item that satisfies the requirement — over-engineering is a trap answer.',
    ],
    table: {
      headers: ['Workload', 'Use', 'Avoid', 'Why'],
      rows: [
        [
          'Code-first Delta ELT, ML feature engineering, ad-hoc PySpark',
          'Lakehouse + Notebook',
          'Warehouse (no Spark runtime)',
          'Lakehouse gives Spark + SQL endpoint; Warehouse is T-SQL-only',
        ],
        [
          'Multi-table ACID transactions, complex T-SQL DDL/DML, BI-shaped star schema',
          'Warehouse',
          'Lakehouse SQL endpoint',
          'Warehouse has full T-SQL + ACID; Lakehouse SQL endpoint is read-mostly with limited write support',
        ],
        [
          'Streaming ingestion from EventHub / IoT, time-series analytics, sub-second KQL dashboards',
          'Eventhouse (KQL Database)',
          'Lakehouse (no KQL runtime)',
          'Kusto engine built for high-throughput append + time-series aggregation',
        ],
        [
          'Low-code ELT from 100+ connectors, shape and load to Fabric without code',
          'Dataflow Gen2',
          'Notebook (overkill for M-expressible transforms)',
          'Dataflow Gen2 uses Power Query M; no Spark cluster spin-up cost; outputs to Lakehouse / Warehouse natively',
        ],
        [
          'Orchestrate notebooks, dataflows, stored procedures, copy activities on a schedule or trigger',
          'Pipeline',
          'Notebook alone (no built-in conditional branching or retry)',
          'Pipeline = Data Factory orchestrator; handles dependencies, retries, conditional logic, and monitoring',
        ],
        [
          'Trigger an action (Teams alert, Power Automate flow, Eventstream action) when a data condition is met',
          'Reflex (Activator)',
          'Pipeline "Notify" activity (single-run only)',
          'Reflex evaluates multi-run conditions with debounce; Pipeline Notify is stateless per-run',
        ],
        [
          'Replicate an Azure SQL DB / Cosmos DB / Snowflake into Fabric with near-real-time CDC',
          'Mirrored Database',
          'Pipeline COPY (adds latency + CU cost for CDC frequency)',
          'Mirroring is free on compute, near-real-time, and writes V-Ordered Delta — Direct Lake ready',
        ],
        [
          'BI semantic model backed by live Lakehouse / Warehouse data, refreshed continuously',
          'Direct Lake semantic model on Lakehouse/Warehouse',
          'Import semantic model with scheduled refresh',
          'Direct Lake frames on Delta commit; no scheduled refresh job; no stale-data window',
        ],
        [
          'Expose data from ADLS Gen2 or S3 inside a Lakehouse without copying',
          'OneLake Shortcut',
          'Pipeline COPY to Lakehouse',
          'Shortcut is zero-copy and governed by source ACLs; copy adds latency and storage cost',
        ],
        [
          'Python ML training, model tracking, experiment logging',
          'Notebook + ML Experiment / ML Model (MLflow)',
          'Warehouse (no ML runtime)',
          'Spark + MLflow is the native Fabric ML stack; Warehouse has no Python ML support',
        ],
        [
          'Operational real-time dashboard on streaming data',
          'Real-Time Dashboard + Eventhouse',
          'Power BI report on Lakehouse (refresh-bound)',
          'Real-Time Dashboard queries KQL directly; sub-second latency; auto-refresh tiles',
        ],
      ],
    },
    bullets: [
      'Meta-rule 1 — Least operational overhead wins: if a managed Fabric-native item (Mirroring, Dataflow Gen2, Eventhouse) can satisfy the requirement, pick it over a custom notebook or pipeline.',
      'Meta-rule 2 — Use the most native option for the engine: KQL → Eventhouse; T-SQL → Warehouse; PySpark → Lakehouse + Notebook. Cross-engine workarounds always have a catch.',
      'Meta-rule 3 — Direct Lake is the default semantic model mode for Fabric-native sources; Import is the default only when the source is external or non-Delta.',
      'Meta-rule 4 — Pipelines orchestrate; Dataflows transform. If the question is about branching / retry / scheduling, the answer is Pipeline. If it is about shaping / loading data, the answer is Dataflow Gen2.',
      'Meta-rule 5 — Reflex (Activator) is the answer whenever the question involves "trigger an action when a condition is met across multiple data points over time." Pipeline Notify fires once per run and has no state.',
    ],
  },
];
