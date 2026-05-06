import type { Question, SourceAnchor } from '../../lib/schema';
import { single, multi, order } from './_helpers';

const SRC: SourceAnchor = {
  category: 'dataflow-gen2-deep',
  note: 'Dataflow Gen2: M language, query folding, fast copy, staging, destinations, refresh'
};

export const dataflowGen2Deep: Question[] = [
  // ── Gen2 vs Gen1 + destinations (5) ──────────────────────────────
  single({
    id: 'dfg-001', domain: 'prepare', subtopic: 'dataflow-gen2', difficulty: 3,
    prompt: 'Which output destinations are SUPPORTED for a Dataflow Gen2 query that you want to land transformed data into for downstream BI / SQL consumption?',
    options: [
      'Lakehouse Tables, Fabric Warehouse, KQL Database, Azure SQL Database (and Azure Data Explorer)',
      'Power BI semantic model only (the Gen1 behavior)',
      'CSV files in OneDrive only',
      'Power Automate flows only'
    ],
    correct: 0,
    explanation: 'Dataflow Gen2 introduces explicit output destinations: Lakehouse, Fabric Warehouse, KQL Database, Azure SQL DB, and ADX. This is the headline shift from Gen1, which only landed data in an internal CDM-folder store accessible via Power BI dataflow connector.',
    whyWrong: {
      1: 'Internal-only output is the Gen1 behavior; Gen2 fixes that with first-class destinations.',
      2: 'CSV-to-OneDrive is not a Gen2 destination type.',
      3: 'Power Automate is not a Dataflow Gen2 destination.'
    },
    source: SRC,
    tags: ['dataflow-gen2', 'destinations', 'gen1-vs-gen2']
  }),
  multi({
    id: 'dfg-002', domain: 'prepare', subtopic: 'dataflow-gen2', difficulty: 4,
    prompt: 'Which statements correctly describe DIFFERENCES between Dataflow Gen1 and Dataflow Gen2?',
    options: [
      'Gen2 supports explicit output destinations (Lakehouse, Warehouse, KQL DB, Azure SQL DB); Gen1 stores output internally in CDM folders',
      'Gen2 introduces fast copy for high-volume bulk movement on supported connectors',
      'Gen2 uses a managed staging Lakehouse to enable folding for transformations the source cannot fold natively',
      'Gen2 removes the Power Query M language and replaces it with T-SQL'
    ],
    correct: [0, 1, 2],
    explanation: 'Gen2 keeps M / Power Query as the authoring language but adds explicit destinations, fast copy, and a managed staging Lakehouse. The transformation language is unchanged.',
    whyWrong: {
      3: 'M is still the Gen2 transformation language; T-SQL did not replace it.'
    },
    source: SRC,
    tags: ['dataflow-gen2', 'gen1-vs-gen2', 'staging']
  }),
  single({
    id: 'dfg-003', domain: 'prepare', subtopic: 'dataflow-gen2', difficulty: 3,
    prompt: 'When a Dataflow Gen2 query has an output destination set to a Lakehouse Table, which write modes are typically available in the destination configuration?',
    options: [
      'Append and Replace (with the table managed as Delta in the Lakehouse)',
      'Insert-only with no truncation option',
      'Merge / Upsert with arbitrary key matching',
      'Streaming insert with sub-second latency'
    ],
    correct: 0,
    explanation: 'Lakehouse table destinations expose Append (add rows) and Replace (truncate-and-load) modes. The underlying storage is Delta. Merge/upsert is not a built-in Gen2 destination mode — that is a notebook / pipeline pattern.',
    whyWrong: {
      1: 'Replace mode (truncate) is supported.',
      2: 'Merge / upsert is not a built-in Gen2 destination write mode.',
      3: 'Dataflow Gen2 is batch / micro-batch, not streaming.'
    },
    source: SRC,
    tags: ['dataflow-gen2', 'destinations', 'lakehouse']
  }),
  single({
    id: 'dfg-004', domain: 'prepare', subtopic: 'dataflow-gen2', difficulty: 4,
    prompt: 'A Dataflow Gen2 query writes to a Warehouse destination. The author needs to control whether the destination table is recreated on every refresh or only changed-rows appended. Where is this configured?',
    options: [
      'On the destination step of the query, where the update method (Append vs Replace) is selected per query',
      'In the Fabric capacity settings (workspace-wide toggle)',
      'Via a T-SQL ALTER TABLE on the Warehouse target',
      'It cannot be configured; Gen2 always replaces the destination'
    ],
    correct: 0,
    explanation: 'The destination step on each query carries the update method (Append / Replace) and column mapping. It is per-query, not capacity-wide, and not derived from the target schema.',
    whyWrong: {
      1: 'Capacity settings do not control per-query write mode.',
      2: 'ALTER TABLE configures the schema, not the dataflow write behavior.',
      3: 'Gen2 supports both Append and Replace; it does not always replace.'
    },
    source: SRC,
    tags: ['dataflow-gen2', 'destinations', 'warehouse']
  }),
  single({
    id: 'dfg-005', domain: 'prepare', subtopic: 'dataflow-staging', difficulty: 4,
    prompt: 'What is the purpose of the MANAGED staging Lakehouse that Dataflow Gen2 provisions when staging is enabled on a query?',
    options: [
      'It persists the query output to a hidden Lakehouse so subsequent transformations can fold against SQL on that staged data, accelerating downstream queries',
      'It is a user-visible Lakehouse where authors copy data manually before each refresh',
      'It is a backup copy of every dataflow run kept indefinitely for auditing',
      'It is a mirror of the source database used for failover'
    ],
    correct: 0,
    explanation: 'The staging Lakehouse is a service-managed, hidden Lakehouse (and a paired Warehouse for SQL endpoint access). When staging is enabled on a query, its output is materialized there so downstream queries can fold against the staged result instead of re-pulling and transforming source data row-by-row.',
    whyWrong: {
      1: 'It is service-managed and hidden; authors do not interact with it directly.',
      2: 'Not a long-term audit store; it is a working buffer for the current refresh.',
      3: 'Not a failover mirror of the source.'
    },
    source: SRC,
    tags: ['dataflow-staging', 'staging-lakehouse']
  }),
  // ── Query folding (5) ────────────────────────────────────────────
  single({
    id: 'dfg-006', domain: 'prepare', subtopic: 'query-folding', difficulty: 3,
    prompt: 'In Power Query, what does QUERY FOLDING mean?',
    options: [
      'Power Query translates the M transformations into the source system\'s native query language (e.g., SQL) and pushes execution down to the source',
      'Power Query collapses identical steps in the M script to reduce cell count',
      'Power Query caches query results across refreshes to avoid recomputation',
      'Power Query merges multiple queries into a single query for visual clarity'
    ],
    correct: 0,
    explanation: 'Query folding is the engine\'s ability to translate M steps (filters, joins, aggregations, projections) into a single native query (most often T-SQL) executed by the source. The M engine does not see the rows row-by-row when folding succeeds — the source returns the already-transformed result.',
    whyWrong: {
      1: 'Folding is about pushdown, not de-duplicating M script steps.',
      2: 'Folding is not a result cache.',
      3: 'Merging queries in the editor is unrelated to folding.'
    },
    source: SRC,
    tags: ['query-folding', 'pushdown']
  }),
  multi({
    id: 'dfg-007', domain: 'prepare', subtopic: 'query-folding', difficulty: 4,
    prompt: 'Which Power Query transformations COMMONLY break (prevent further) query folding against a SQL source?',
    options: [
      'Adding a custom column with a function that has no native SQL equivalent (e.g., Text.Combine on dynamic delimiters)',
      'Merging with a query whose source is a non-foldable file (CSV, Excel)',
      'Using Table.Buffer or List.Buffer to materialize an intermediate result',
      'Filtering rows by a literal value on a column the source supports'
    ],
    correct: [0, 1, 2],
    explanation: 'Custom columns with non-translatable M, merges with non-foldable sources, and explicit Table.Buffer / List.Buffer all force the M engine to take over and break folding from that step forward. Simple value filters on foldable sources fold cleanly.',
    whyWrong: {
      3: 'Literal value filters fold trivially against a SQL source — that is the canonical fold-friendly transform.'
    },
    source: SRC,
    tags: ['query-folding', 'breaks-folding', 'm-language']
  }),
  single({
    id: 'dfg-008', domain: 'prepare', subtopic: 'query-folding', difficulty: 3,
    prompt: 'In the Power Query Online editor, how do you most directly verify whether a particular step still folds back to the source?',
    options: [
      'Right-click the step and select View Native Query — if it\'s available and shows a SQL statement, that step folds',
      'Inspect the M script for the keyword #"Fold"',
      'Run the query twice and compare durations',
      'Open Diagnostics and read the M call stack'
    ],
    correct: 0,
    explanation: 'View Native Query is the canonical folding-verification tool. If the option is grayed out for a step, folding has stopped at or before that step. If it shows a SQL statement, folding is still intact.',
    whyWrong: {
      1: 'There is no #"Fold" keyword in M.',
      2: 'Duration comparison is indirect and noisy.',
      3: 'Diagnostics traces are useful but not the primary fold-check tool.'
    },
    source: SRC,
    tags: ['query-folding', 'view-native-query', 'verification']
  }),
  single({
    id: 'dfg-009', domain: 'prepare', subtopic: 'query-folding', difficulty: 4,
    prompt: 'A Dataflow Gen2 query against Azure SQL DB pulls a 50M-row table, then applies a custom-function column that breaks folding, then filters down to 100K rows. Refresh is slow. Which restructure helps the MOST?',
    options: [
      'Move the row-reducing filter BEFORE the custom-function step so the filter folds and only 100K rows leave the source',
      'Add Table.Buffer immediately after the source to cache rows in the M engine',
      'Switch the destination to KQL DB',
      'Disable staging on the query'
    ],
    correct: 0,
    explanation: 'Step ORDER controls what folds. If the filter precedes the fold-breaking custom column, the filter folds to SQL and only 100K rows ever leave the source. The expensive M-side custom function then runs on 100K rows, not 50M.',
    whyWrong: {
      1: 'Table.Buffer breaks folding entirely — the opposite of what you want.',
      2: 'Destination change does not move work back to the source.',
      3: 'Disabling staging hurts; the issue is row volume, not staging.'
    },
    source: SRC,
    tags: ['query-folding', 'step-order', 'optimization']
  }),
  single({
    id: 'dfg-010', domain: 'prepare', subtopic: 'query-folding', difficulty: 4,
    prompt: 'Which source type can NEVER fold transformations natively (forcing all M transforms to execute in the Power Query engine)?',
    options: [
      'CSV / Excel / JSON files (file-based sources have no query engine to push down to)',
      'Azure SQL Database',
      'Snowflake',
      'Fabric Warehouse'
    ],
    correct: 0,
    explanation: 'File-based sources (CSV, Excel, JSON, Parquet) have no query engine, so transformations cannot be pushed down — the M engine must execute every step in-process. SQL-shaped sources (Azure SQL, Snowflake, Warehouse) all support folding.',
    whyWrong: {
      1: 'Azure SQL DB folds extensively.',
      2: 'Snowflake folds extensively.',
      3: 'Fabric Warehouse folds extensively.'
    },
    source: SRC,
    tags: ['query-folding', 'source-types', 'files']
  }),
  // ── Fast copy (3) ────────────────────────────────────────────────
  multi({
    id: 'dfg-011', domain: 'prepare', subtopic: 'dataflow-fast-copy', difficulty: 4,
    prompt: 'Which conditions enable Dataflow Gen2 FAST COPY to engage on a query?',
    options: [
      'Source connector is on the supported list (e.g., ADLS Gen2, Azure SQL DB, Lakehouse, Warehouse)',
      'Destination is a fast-copy-capable sink (Lakehouse, Warehouse)',
      'The transformation chain is folding-friendly (no row-by-row M custom functions)',
      'Source data volume is very small (under 100 rows)'
    ],
    correct: [0, 1, 2],
    explanation: 'Fast copy bypasses the row-by-row M engine and delegates the bulk movement to the engine layer (similar to a pipeline Copy Activity). It requires connector support on both ends and a chain that does not force row-by-row M execution. It is meant for HIGH volume — small data does not trigger it.',
    whyWrong: {
      3: 'Fast copy targets HIGH-volume movement; small data uses the standard path with negligible difference.'
    },
    source: SRC,
    tags: ['dataflow-fast-copy', 'requirements']
  }),
  single({
    id: 'dfg-012', domain: 'prepare', subtopic: 'dataflow-fast-copy', difficulty: 3,
    prompt: 'What is the PRIMARY performance benefit of fast copy over the standard Power Query path for high-volume movement?',
    options: [
      'It bypasses the row-by-row M engine and uses the engine\'s native bulk copy facility, dramatically reducing per-row overhead',
      'It compresses data in transit using a proprietary algorithm',
      'It runs the M script on the source server instead of the dataflow runtime',
      'It runs queries in parallel on multiple workspaces simultaneously'
    ],
    correct: 0,
    explanation: 'The M engine is row-by-row by design. Fast copy delegates the bulk transfer to a dedicated copy facility (the same primitive used by pipeline Copy Activity), avoiding per-row M overhead — that is where the order-of-magnitude speedup comes from.',
    whyWrong: {
      1: 'Compression is not the headline mechanism.',
      2: 'Folding pushes work to the source; that is a related but distinct concept.',
      3: 'Cross-workspace parallelism is not how fast copy works.'
    },
    source: SRC,
    tags: ['dataflow-fast-copy', 'performance']
  }),
  single({
    id: 'dfg-013', domain: 'prepare', subtopic: 'dataflow-fast-copy', difficulty: 4,
    prompt: 'A Dataflow Gen2 query is INTENDED to use fast copy but the refresh runs slowly. The author confirms the source and destination connectors both support fast copy. Which is the MOST likely cause of fast copy NOT engaging?',
    options: [
      'A non-foldable transformation (e.g., a custom function column or Table.Buffer) sits between source and destination, forcing the row-by-row M path',
      'The destination Lakehouse is in a different workspace from the dataflow',
      'The user authoring the dataflow has Viewer rather than Member role',
      'Fast copy requires Premium per User licensing'
    ],
    correct: 0,
    explanation: 'Fast copy needs an end-to-end fold-friendly chain. Any row-by-row M step (custom column with a non-translatable function, Table.Buffer, certain merges) forces the standard M path and disables fast copy. Cross-workspace destinations and licensing are not the cause.',
    whyWrong: {
      1: 'Cross-workspace destinations work; not the disabling factor.',
      2: 'Authoring requires a different permission level entirely; this would block save, not slow runtime.',
      3: 'Fast copy runs on Fabric capacity; PPU is not a prerequisite.'
    },
    source: SRC,
    tags: ['dataflow-fast-copy', 'troubleshooting']
  }),
  // ── M language (5) ───────────────────────────────────────────────
  single({
    id: 'dfg-014', domain: 'prepare', subtopic: 'm-language', difficulty: 3,
    prompt: 'Read the M expression below. What does it produce?\n\n```\nlet\n    Source = Sales,\n    Filtered = Table.SelectRows(Source, each [Amount] > 100)\nin\n    Filtered\n```',
    options: [
      'A table containing the rows from `Sales` where the `Amount` column is strictly greater than 100',
      'A scalar count of rows in `Sales` where Amount > 100',
      'The `Sales` table with a new column called `Amount > 100` containing booleans',
      'An error — `Table.SelectRows` requires a list of column names'
    ],
    correct: 0,
    explanation: 'Table.SelectRows takes a table and a row-predicate function written with `each [Column] ...`. It returns a table containing only the rows where the predicate is true. The `let / in` block exposes only the `Filtered` value as the query result.',
    whyWrong: {
      1: 'No aggregation; it returns rows, not a count.',
      2: 'No column is added; rows are filtered.',
      3: 'The signature is correct; SelectRows takes a table and a predicate.'
    },
    source: SRC,
    tags: ['m-language', 'table-selectrows', 'code-reading']
  }),
  single({
    id: 'dfg-015', domain: 'prepare', subtopic: 'm-language', difficulty: 4,
    prompt: 'Read the M expression below. What does the resulting table look like?\n\n```\nlet\n    Source = #table(\n        {"Region", "Amount"},\n        {{"East", 100}, {"West", 50}, {"East", 75}}\n    ),\n    Grouped = Table.Group(\n        Source,\n        {"Region"},\n        {{"Total", each List.Sum([Amount]), type number}}\n    )\nin\n    Grouped\n```',
    options: [
      'Two rows: East with Total=175 and West with Total=50',
      'Three rows (one per source row) with a Total column equal to Amount',
      'One row containing the grand total of 225',
      'An error — Table.Group requires a sort step first'
    ],
    correct: 0,
    explanation: 'Table.Group buckets rows by the key list (`{"Region"}`) and computes aggregations per group. East groups two rows (100 + 75 = 175); West groups one (50). The result has one row per distinct key with the named aggregate column.',
    whyWrong: {
      1: 'Grouping collapses rows by key; you do not get one row per source row.',
      2: 'A grand total would require an empty key list, not `{"Region"}`.',
      3: 'No sort prerequisite; Table.Group handles unsorted input.'
    },
    source: SRC,
    tags: ['m-language', 'table-group', 'code-reading']
  }),
  single({
    id: 'dfg-016', domain: 'prepare', subtopic: 'm-language', difficulty: 3,
    prompt: 'In Power Query M, what is the role of the `let / in` syntax?',
    options: [
      '`let` introduces a sequence of named expression bindings; `in` selects which bound name is the result of the block',
      '`let` defines variables that are mutable; `in` mutates them at the end',
      '`let` opens a transaction that `in` commits to the source',
      '`let` declares parameters that the dataflow refresh fills in at runtime'
    ],
    correct: 0,
    explanation: 'M is a functional language. `let` introduces a record of named, immutable bindings; `in` chooses which binding is the value of the block. Bindings are evaluated lazily, in dependency order, not top-to-bottom imperatively.',
    whyWrong: {
      1: 'M values are immutable; bindings are not mutated.',
      2: 'M has no transaction concept built into `let / in`.',
      3: 'Refresh-time parameters are a separate construct (parameters / query parameters).'
    },
    source: SRC,
    tags: ['m-language', 'let-in', 'syntax']
  }),
  multi({
    id: 'dfg-017', domain: 'prepare', subtopic: 'm-language', difficulty: 4,
    prompt: 'Which statements about Power Query M TYPES are TRUE?',
    options: [
      'M has primitive types including text, number, logical, date, datetime, datetimezone, duration, binary, and null',
      'M has structured types: list, record, table, function, type',
      'A column type can be ascribed without changing values via `Value.As` or `Table.TransformColumnTypes`',
      'M is dynamically typed and column types are purely cosmetic in the editor'
    ],
    correct: [0, 1, 2],
    explanation: 'M has a real type system with primitives, structured types, and explicit type ascription. Column types matter at refresh time (especially for fold-friendly translation to source types) and for downstream consumption — they are not cosmetic.',
    whyWrong: {
      3: 'Types are real and load-bearing; downstream destinations and folding both depend on them.'
    },
    source: SRC,
    tags: ['m-language', 'types']
  }),
  single({
    id: 'dfg-018', domain: 'prepare', subtopic: 'm-language', difficulty: 4,
    prompt: 'Read the M expression. What is the value of `Result`?\n\n```\nlet\n    Add = (a as number, b as number) as number => a + b,\n    Result = Add(3, 4)\nin\n    Result\n```',
    options: [
      'The number 7',
      'A function that adds 3 and 4',
      'A list `{3, 4}`',
      'An error — M does not support user-defined functions'
    ],
    correct: 0,
    explanation: 'M supports lambda functions via the `(args) => body` syntax. `Add` is a function that returns the sum of two numbers; calling `Add(3, 4)` returns 7. Type annotations (`as number`) declare expected and return types.',
    whyWrong: {
      1: '`Add(3,4)` invokes the function — the result is the value, not the function itself.',
      2: 'No list construction here.',
      3: 'M fully supports user-defined functions; this is the canonical form.'
    },
    source: SRC,
    tags: ['m-language', 'functions', 'code-reading']
  }),
  // ── Refresh (4) ──────────────────────────────────────────────────
  single({
    id: 'dfg-019', domain: 'prepare', subtopic: 'dataflow-refresh', difficulty: 3,
    prompt: 'Which refresh trigger options does a Dataflow Gen2 support out of the box?',
    options: [
      'Manual refresh, scheduled refresh (defined in the dataflow settings), and pipeline-orchestrated refresh via a Dataflow activity',
      'Manual only; scheduled refresh requires a third-party orchestrator',
      'Streaming continuous refresh as the default mode',
      'Refresh on every source row insert (CDC mode)'
    ],
    correct: 0,
    explanation: 'Gen2 supports manual refresh from the workspace, scheduled refresh (configured in the dataflow settings), and pipeline orchestration via a Dataflow activity (the recommended way to compose dataflows with other items into a single load DAG).',
    whyWrong: {
      1: 'Scheduled refresh is built in; no third party needed.',
      2: 'Gen2 is batch / micro-batch, not streaming-by-default.',
      3: 'Per-row CDC refresh is not how Dataflow Gen2 works; CDC sources flow via Mirroring or Eventstream.'
    },
    source: SRC,
    tags: ['dataflow-refresh', 'triggers']
  }),
  multi({
    id: 'dfg-020', domain: 'prepare', subtopic: 'dataflow-refresh', difficulty: 4,
    prompt: 'Which factors INCREASE the Fabric capacity (CU-second) consumption of a Dataflow Gen2 refresh?',
    options: [
      'Larger source data volume processed per refresh',
      'Refresh frequency (more refreshes per day = more total CU-seconds)',
      'Non-folding transformations that force row-by-row M engine execution',
      'Number of viewers of the workspace'
    ],
    correct: [0, 1, 2],
    explanation: 'CU consumption scales with data volume processed, refresh frequency, and engine path (folding-friendly chains plus fast copy are far cheaper than row-by-row M). Viewer count does not affect refresh cost.',
    whyWrong: {
      3: 'Viewers only consume on read; refresh cost is independent of viewer count.'
    },
    source: SRC,
    tags: ['dataflow-refresh', 'capacity', 'cost']
  }),
  single({
    id: 'dfg-021', domain: 'prepare', subtopic: 'dataflow-refresh', difficulty: 3,
    prompt: 'A Dataflow Gen2 references the output of ANOTHER Dataflow Gen2 (a linked entity). Which refresh sequencing pattern is most reliable for end-to-end freshness?',
    options: [
      'Orchestrate both dataflows in a Data Pipeline using a Dataflow activity, with the upstream dataflow on a Succeeded edge before the downstream one',
      'Schedule both dataflows to refresh at exactly the same time so they overlap',
      'Rely on the downstream dataflow detecting upstream completion automatically',
      'Refresh only the downstream dataflow; the upstream will refresh transitively'
    ],
    correct: 0,
    explanation: 'Pipelines model dependencies explicitly. Putting the upstream dataflow first and the downstream on a Succeeded edge guarantees the downstream sees fresh data. Same-time schedules race; transitive auto-refresh of upstreams is not how dataflows work.',
    whyWrong: {
      1: 'Same-time schedules cause races and stale reads.',
      2: 'No automatic upstream-completion detection across dataflows.',
      3: 'Refreshing downstream does not refresh upstream.'
    },
    source: SRC,
    tags: ['dataflow-refresh', 'orchestration', 'pipelines']
  }),
  order({
    id: 'dfg-022', domain: 'prepare', subtopic: 'dataflow-refresh', difficulty: 4,
    prompt: 'Order the steps of a healthy Dataflow Gen2 daily load against an Azure SQL DB source landing into a Lakehouse table:',
    options: [
      'Author queries in Power Query Online, set fold-friendly step order (filters early), and verify View Native Query shows SQL',
      'Configure the Lakehouse output destination on each query with the chosen update method (Append vs Replace) and column mapping',
      'Enable staging on transformation queries that need folding against intermediate results, and confirm fast copy engages where supported',
      'Configure scheduled refresh (or attach to a parent pipeline) and validate the first refresh succeeds end-to-end'
    ],
    explanation: 'Author with folding awareness first (cheapest fix is at design time). Wire up destinations next so each query knows where to land. Tune staging / fast copy. Finally schedule and validate. Skipping the View Native Query step is the most common reason dataflows are slow in production.',
    source: SRC,
    tags: ['dataflow-refresh', 'workflow', 'authoring']
  }),
  // ── Connectors, errors, editor (3) ───────────────────────────────
  multi({
    id: 'dfg-023', domain: 'prepare', subtopic: 'dataflow-gen2', difficulty: 3,
    prompt: 'Which source connector categories are AVAILABLE to a Dataflow Gen2 author?',
    options: [
      'File: CSV, Parquet, JSON, Excel from Lakehouse, ADLS Gen2, OneDrive, SharePoint',
      'Database: Azure SQL DB, on-prem SQL Server (via gateway), Oracle, PostgreSQL, Snowflake',
      'SaaS: Salesforce, Dynamics 365, Google Analytics, ServiceNow',
      'Direct memory access to another tenant\'s Lakehouse without authentication'
    ],
    correct: [0, 1, 2],
    explanation: 'Dataflow Gen2 inherits the broad Power Query connector library: file-based, relational databases, and SaaS endpoints. On-prem sources flow through an on-premises data gateway. Cross-tenant unauthenticated access is never a thing.',
    whyWrong: {
      3: 'Cross-tenant access requires explicit authentication; "no auth" is not a connector.'
    },
    source: SRC,
    tags: ['dataflow-gen2', 'connectors']
  }),
  single({
    id: 'dfg-024', domain: 'prepare', subtopic: 'dataflow-gen2', difficulty: 3,
    prompt: 'A Dataflow Gen2 query encounters bad rows (type conversion failures) in the source. The author wants the refresh to SUCCEED while bad rows are routed elsewhere for later inspection. Which Power Query feature supports this pattern?',
    options: [
      'Per-step error handling (e.g., `try ... otherwise`, `Table.RemoveRowsWithErrors`, or splitting errors into a separate quarantine query)',
      'A capacity-wide "ignore all errors" toggle',
      'Disabling staging on the query',
      'Fast copy (which silently drops bad rows)'
    ],
    correct: 0,
    explanation: 'M offers `try / otherwise`, `Table.RemoveRowsWithErrors`, and the pattern of branching errored rows into a quarantine query. There is no global "ignore errors" capacity setting, and fast copy does not silently drop rows.',
    whyWrong: {
      1: 'No such global toggle.',
      2: 'Staging is unrelated to error handling.',
      3: 'Fast copy does not silently drop bad rows; it surfaces failures.'
    },
    source: SRC,
    tags: ['dataflow-gen2', 'error-handling', 'quarantine']
  }),
  single({
    id: 'dfg-025', domain: 'prepare', subtopic: 'dataflow-gen2', difficulty: 4,
    prompt: 'Which statement about authoring environments for Dataflow Gen2 is MOST accurate?',
    options: [
      'Dataflow Gen2 is authored in Power Query Online (in the Fabric portal); Power BI Desktop is NOT used to author Gen2 dataflows',
      'Dataflow Gen2 is authored only in Power BI Desktop and published to the service',
      'Dataflow Gen2 is authored only via the REST API; no UI exists',
      'Dataflow Gen2 must be authored in Visual Studio with the Fabric SDK'
    ],
    correct: 0,
    explanation: 'Dataflow Gen2 is a service-side artifact authored in Power Query Online inside the Fabric portal. Power BI Desktop authors local M (queries inside a .pbix), which is a different surface — Desktop does not produce Gen2 dataflows.',
    whyWrong: {
      1: 'Desktop authors local M, not service-side Gen2 dataflows.',
      2: 'A first-class browser UI exists; REST is for automation.',
      3: 'No Visual Studio requirement.'
    },
    source: SRC,
    tags: ['dataflow-gen2', 'authoring', 'power-query-online']
  })
];
