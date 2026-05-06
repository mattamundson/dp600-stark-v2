import type { Question, SourceAnchor } from '../../lib/schema';
import { single, multi, order } from './_helpers';

// 25 deep-dive DP-600 questions on Fabric Spark + PySpark notebooks.
// IDs: spkn-001..spkn-025.
// Domain: prepare (all 25).
// Subtopics: notebooks, pyspark, spark-config, high-concurrency,
//   magic-commands, mssparkutils, lakehouse-files, session-management.
// Type mix: 16 single, 7 multi, 2 ordering.
// Difficulty mix: D3/D4/D5 only (no D1/D2 — depth content).
// Code-reading questions: spkn-006, spkn-013, spkn-018, spkn-022.

const SRC_SPKN: Record<string, SourceAnchor> = {
  sparkConfig: { category: 'fabric-spark-notebooks', note: 'Spark session config: %%configure, runtime versions, executor sizing' },
  highConcurrency: { category: 'fabric-spark-notebooks', note: 'High Concurrency Mode: session reuse, isolation trade-offs' },
  magic: { category: 'fabric-spark-notebooks', note: 'Notebook magic commands: %%pyspark, %%spark, %%sql, %%csharp, %run, %pip' },
  mssparkutils: { category: 'fabric-spark-notebooks', note: 'mssparkutils.fs / notebook / credentials APIs' },
  lakehouseFiles: { category: 'fabric-spark-notebooks', note: 'Files/ vs Tables/ paths, V-Order, schema enforcement' },
  delta: { category: 'fabric-spark-notebooks', note: 'Delta read/write modes: overwrite, append, error, ignore' },
  session: { category: 'fabric-spark-notebooks', note: 'Session management: idle timeout, manual stop, scheduled vs interactive' },
  shortcuts: { category: 'fabric-spark-notebooks', note: 'OneLake Shortcuts vs direct abfss:// reads' },
  pysparkPatterns: { category: 'fabric-spark-notebooks', note: 'PySpark code patterns and DataFrame API' },
  sparkTraps: { category: 'fabric-spark-notebooks', note: 'Common Spark traps: collect() OOM, broadcast joins, AQE' }
} satisfies Record<string, SourceAnchor>;

export const sparkNotebooksDeep: Question[] = [

  // ── Spark session configuration ─────────────────────────────

  single({
    id: 'spkn-001', domain: 'prepare', subtopic: 'spark-config', difficulty: 3,
    prompt:
      'A data engineer needs to read the currently effective value of `spark.sql.shuffle.partitions` from inside a running PySpark cell. Which call returns it?',
    options: [
      'spark.conf.get("spark.sql.shuffle.partitions")',
      'spark.config.read("spark.sql.shuffle.partitions")',
      'sc.getConf().get("spark.sql.shuffle.partitions")',
      'mssparkutils.spark.getConf("spark.sql.shuffle.partitions")'
    ],
    correct: 0,
    explanation:
      '`spark.conf.get("<key>")` returns the runtime value of any Spark SQL configuration. It reflects whatever has been set so far in the session, including values applied via %%configure or `spark.conf.set()` calls.',
    whyWrong: {
      1: 'There is no `spark.config.read()` API. The correct method is `spark.conf.get()`.',
      2: '`sc.getConf().get()` reads from the SparkContext config — older API that does not see runtime SQL conf changes made via spark.conf.set().',
      3: 'mssparkutils does not expose Spark configuration. It is for filesystem, notebook orchestration, and credentials.'
    },
    source: SRC_SPKN.sparkConfig,
    tags: ['spark-config', 'spark-conf', 'pyspark']
  }),

  single({
    id: 'spkn-002', domain: 'prepare', subtopic: 'spark-config', difficulty: 3,
    prompt:
      'A team wants to pin a notebook to a specific Fabric Spark runtime version (for example, Runtime 1.3 = Spark 3.5 + Delta 3.2 + Python 3.11) so that all sessions for that notebook are reproducible. Where is the runtime version selected?',
    options: [
      'In a %%configure cell at the top of the notebook',
      'On the notebook\'s attached Environment item',
      'In the workspace-level capacity settings',
      'It is auto-selected per session by the Fabric scheduler and cannot be pinned'
    ],
    correct: 1,
    explanation:
      'The Spark runtime version (Spark + Delta + Python combo) is selected on the Environment that the notebook attaches to. Pinning the Environment pins the runtime, giving reproducibility across sessions and across team members.',
    whyWrong: {
      0: '%%configure tunes per-session Spark settings (executor cores, memory, conf keys) — it does not pick the runtime version.',
      2: 'Capacity settings control SKU and pool sizing, not the Spark runtime channel.',
      3: 'Runtime versions are explicitly pinnable via Environments — they are not auto-selected.'
    },
    source: SRC_SPKN.sparkConfig,
    tags: ['spark-config', 'environments', 'runtime'],
    relatedIds: ['spkn-003']
  }),

  multi({
    id: 'spkn-003', domain: 'prepare', subtopic: 'spark-config', difficulty: 4,
    prompt:
      'Which Spark configuration keys can validly be set in a `%%configure` cell to size the executor pool for a notebook session?',
    options: [
      '"driverCores": 4',
      '"driverMemory": "28g"',
      '"executorCores": 4',
      '"executorMemory": "28g"',
      '"numExecutors": 8',
      '"spark.shuffle.localDir": "/tmp"'
    ],
    correct: [0, 1, 2, 3, 4],
    explanation:
      '`%%configure` accepts driver/executor sizing keys at the top level of the JSON: driverCores, driverMemory, executorCores, executorMemory, numExecutors. Spark configuration keys (those starting with `spark.`) belong inside a nested `"conf": { ... }` object, not at the top level.',
    whyWrong: {
      5: '`spark.shuffle.localDir` is a `spark.*` key — it must go inside the nested `"conf": {}` block, not at the top level of the %%configure JSON.'
    },
    source: SRC_SPKN.sparkConfig,
    tags: ['spark-config', '%%configure', 'executor-sizing']
  }),

  // ── High Concurrency Mode ────────────────────────────────────

  single({
    id: 'spkn-004', domain: 'prepare', subtopic: 'high-concurrency', difficulty: 4,
    prompt:
      'A team enables High Concurrency Mode to share one Spark session across 30 ETL notebooks. One notebook does `spark.conf.set("spark.sql.shuffle.partitions", "16")` mid-run. What is the effect on the OTHER 29 notebooks sharing the session?',
    options: [
      'No effect — High Concurrency isolates Spark conf per notebook context',
      'All 29 other notebooks immediately see shuffle.partitions = 16 because they share the underlying Spark session',
      'The notebook setting the conf is killed because High Concurrency forbids spark.conf.set',
      'Spark queues the change and applies it only after all current jobs finish'
    ],
    correct: 1,
    explanation:
      'High Concurrency Mode shares the underlying SparkSession (and its `SparkConf`) across notebooks. A `spark.conf.set()` call mutates that shared state — every other notebook in the session will see the new value on its next query. This is a key trade-off: avoid mutating shared SQL conf in HC sessions, or use %%configure on a dedicated session for tunable workloads.',
    whyWrong: {
      0: 'HC uses isolated EXECUTION CONTEXTS (variables, imports) but the SparkSession and SparkConf are shared.',
      2: 'spark.conf.set is allowed in HC — it just has cross-notebook side effects.',
      3: 'Spark conf changes apply immediately to subsequent jobs, not after a queued drain.'
    },
    source: SRC_SPKN.highConcurrency,
    tags: ['high-concurrency', 'spark-config', 'shared-session']
  }),

  multi({
    id: 'spkn-005', domain: 'prepare', subtopic: 'high-concurrency', difficulty: 4,
    prompt:
      'Which characteristics of High Concurrency Mode in Fabric notebooks are TRUE?',
    options: [
      'Up to 50 notebooks can attach to a single shared Spark session',
      'Notebook-local Python variables are isolated between attached notebooks',
      'A library installed via %pip install in one HC notebook is automatically available in the other 49',
      'The Environment library set is shared across all HC-attached notebooks',
      'Each HC-attached notebook gets its own driver process for isolation'
    ],
    correct: [0, 1, 3],
    explanation:
      'HC shares one SparkSession across up to 50 notebooks but isolates each notebook\'s Python execution context (variables, imports). The Environment\'s pre-installed libraries are shared (because they are installed into the session\'s Python). Session-scoped %pip installs in one notebook are NOT propagated to peer notebooks. There is one driver per HC session, not per notebook.',
    whyWrong: {
      2: '%pip in one HC notebook installs into the shared Python interpreter, but Fabric scopes the install to the calling notebook context — peer notebooks do not see it. Use the Environment for shared libraries.',
      4: 'HC pools share a single driver process — that is what makes them efficient. Per-notebook driver isolation is the OPPOSITE of HC.'
    },
    source: SRC_SPKN.highConcurrency,
    tags: ['high-concurrency', 'isolation', 'libraries']
  }),

  // ── Code-reading: PySpark patterns ───────────────────────────

  single({
    id: 'spkn-006', domain: 'prepare', subtopic: 'pyspark', difficulty: 4,
    prompt:
      'Given this PySpark snippet, what does it produce?\n\n```python\ndf = spark.read.format("delta").load("Tables/sales")\nresult = df.write.format("delta") \\\n    .mode("overwrite") \\\n    .saveAsTable("sales_copy")\n```',
    options: [
      'A new managed Delta table `sales_copy` registered in the default Lakehouse metastore, with the contents of `sales`',
      'An unmanaged Parquet copy in the Files/ folder of the default Lakehouse',
      'An in-memory DataFrame `result` containing the rows of `sales`; nothing is persisted',
      'An error — saveAsTable cannot be used with mode("overwrite")'
    ],
    correct: 0,
    explanation:
      '`saveAsTable("sales_copy")` writes a managed Delta table into the attached default Lakehouse metastore. With `mode("overwrite")`, any existing `sales_copy` is replaced. The variable `result` is `None` because `write` is an action that returns nothing.',
    whyWrong: {
      1: 'saveAsTable lands in Tables/ as a managed Delta table, not Files/ as Parquet.',
      2: 'Spark write actions are eagerly persisted — they are not in-memory only.',
      3: 'mode("overwrite") is fully supported by saveAsTable — it replaces the existing table.'
    },
    source: SRC_SPKN.pysparkPatterns,
    tags: ['pyspark', 'code-reading', 'delta', 'saveAsTable']
  }),

  multi({
    id: 'spkn-007', domain: 'prepare', subtopic: 'pyspark', difficulty: 4,
    prompt:
      'Which `mode()` values are valid for `df.write.format("delta")` in Fabric Spark?',
    options: [
      '"overwrite" — replaces the entire table',
      '"append" — adds new rows to the existing table',
      '"error" (also "errorifexists") — fails if the table already exists',
      '"ignore" — silently does nothing if the table already exists',
      '"merge" — performs an upsert based on a key column',
      '"replaceWhere" — partition-level overwrite'
    ],
    correct: [0, 1, 2, 3],
    explanation:
      'Spark DataFrameWriter supports four save modes: overwrite, append, error (errorifexists is the alias and also the default), and ignore. `merge` is NOT a save mode — Delta merges are performed via the `DeltaTable.merge()` API or `MERGE INTO` SQL. `replaceWhere` is an `option()`, not a `mode()`, used to overwrite specific partitions.',
    whyWrong: {
      4: 'There is no `mode("merge")`. Use `DeltaTable.forName(...).merge(source, condition)` or `MERGE INTO` SQL.',
      5: 'replaceWhere is passed as `.option("replaceWhere", "<predicate>")`, not as a mode.'
    },
    source: SRC_SPKN.delta,
    tags: ['pyspark', 'delta', 'write-modes']
  }),

  // ── Magic commands ───────────────────────────────────────────

  multi({
    id: 'spkn-008', domain: 'prepare', subtopic: 'magic-commands', difficulty: 3,
    prompt:
      'Which magic commands switch a single cell\'s LANGUAGE in a Fabric Spark notebook (overriding the default kernel)?',
    options: [
      '%%pyspark',
      '%%spark',
      '%%sql',
      '%%csharp',
      '%run',
      '%pip'
    ],
    correct: [0, 1, 2, 3],
    explanation:
      'Fabric notebooks support four language magics that switch the cell kernel: %%pyspark (Python), %%spark (Scala), %%sql (Spark SQL), and %%csharp (.NET for Spark). `%run` executes another notebook in the current context. `%pip` is for package management, not language switching.',
    whyWrong: {
      4: '%run runs another notebook inline (sharing variables) — it does not change the cell\'s language.',
      5: '%pip manages session-scoped Python packages — not a language magic.'
    },
    source: SRC_SPKN.magic,
    tags: ['magic-commands', 'languages']
  }),

  single({
    id: 'spkn-009', domain: 'prepare', subtopic: 'magic-commands', difficulty: 3,
    prompt:
      'A PySpark notebook calls `%run ./helpers/utils` at the top. The notebook `utils` defines a function `clean_phone(s)`. After the %run, the calling notebook can directly invoke `clean_phone("...")`. What does this demonstrate?',
    options: [
      '%run executes the target notebook in a separate process and serialises results back via pickle',
      '%run executes the target notebook IN THE CURRENT context, so its top-level definitions become available as if defined locally',
      '%run is equivalent to mssparkutils.notebook.run() and respects timeout/parameters',
      '%run only works for notebooks in the same workspace; cross-workspace calls require an absolute path'
    ],
    correct: 1,
    explanation:
      '`%run` does inline execution — it is conceptually a Python `exec()` of the target notebook in the calling notebook\'s namespace. Top-level functions, variables, and imports become visible to the caller. This is fundamentally different from `mssparkutils.notebook.run()`, which spawns a separate notebook execution and only returns a string `exit()` value.',
    whyWrong: {
      0: '%run is in-process inline execution, not a separate process with serialisation.',
      2: '%run and mssparkutils.notebook.run() are very different. %run is inline; notebook.run() is a child execution with isolated context and returns only what `exit()` passes back.',
      3: '%run paths are workspace-relative; cross-workspace execution uses notebook.run() with the workspaceId argument, not %run.'
    },
    source: SRC_SPKN.magic,
    tags: ['magic-commands', 'run', 'orchestration'],
    relatedIds: ['spkn-014']
  }),

  single({
    id: 'spkn-010', domain: 'prepare', subtopic: 'magic-commands', difficulty: 3,
    prompt:
      'A data engineer adds `%pip install great-expectations==0.18.0` in cell 3 of a notebook. The session is then idle for 25 minutes and times out. The next morning the notebook is reopened and rerun starting from cell 4. What happens?',
    options: [
      'great-expectations is still available because %pip installs persist to the workspace',
      'great-expectations is NOT available — %pip installs are session-scoped and the session was lost',
      'The notebook fails to reopen because cell 3 was never re-executed',
      'great-expectations is rolled into the attached Environment automatically'
    ],
    correct: 1,
    explanation:
      '%pip installs into the current session\'s Python interpreter only. When the session ends (timeout, manual stop, capacity restart), the installation is gone. Restarting from cell 4 means cell 3 never reran, so the package is missing. For persistent libraries, install them on the attached Environment instead.',
    whyWrong: {
      0: '%pip is session-scoped, not workspace-scoped.',
      2: 'Notebooks always reopen successfully regardless of prior cell state — they do not require any cell to be in a specific state.',
      3: 'Fabric does not auto-promote %pip installs into Environment libraries.'
    },
    source: SRC_SPKN.magic,
    tags: ['magic-commands', 'pip', 'session-management', 'environments'],
    relatedIds: ['spkn-005']
  }),

  // ── mssparkutils ─────────────────────────────────────────────

  multi({
    id: 'spkn-011', domain: 'prepare', subtopic: 'mssparkutils', difficulty: 4,
    prompt:
      'Which mssparkutils.fs methods are valid for working with OneLake paths from a Fabric notebook?',
    options: [
      'mssparkutils.fs.ls("Files/raw")',
      'mssparkutils.fs.cp(src, dst, recurse=True)',
      'mssparkutils.fs.mv(src, dst)',
      'mssparkutils.fs.mkdirs("Files/staging/2026")',
      'mssparkutils.fs.put("Files/log.txt", "hello", overwrite=True)',
      'mssparkutils.fs.compact("Tables/sales")'
    ],
    correct: [0, 1, 2, 3, 4],
    explanation:
      'mssparkutils.fs supports filesystem-style operations against OneLake: ls, cp (recursive copy), mv, mkdirs, put (write small string content), rm, head, mount/unmount. `compact` is NOT an mssparkutils.fs method — Delta compaction (OPTIMIZE) is invoked via `DeltaTable.optimize()` or the SQL `OPTIMIZE` command.',
    whyWrong: {
      5: 'mssparkutils.fs has no `compact` method. Delta file compaction is performed via `OPTIMIZE` (SQL) or `DeltaTable.forPath(...).optimize().executeCompaction()` (Python).'
    },
    source: SRC_SPKN.mssparkutils,
    tags: ['mssparkutils', 'fs', 'onelake']
  }),

  single({
    id: 'spkn-012', domain: 'prepare', subtopic: 'mssparkutils', difficulty: 4,
    prompt:
      'A pipeline orchestrator notebook needs to fan out 10 child notebooks IN PARALLEL, each with different parameters. Which mssparkutils API is the BEST fit?',
    options: [
      'A `for` loop calling mssparkutils.notebook.run() 10 times sequentially',
      'mssparkutils.notebook.runMultiple(toRun=[...]) — runs the list of notebooks concurrently with a DAG of dependencies',
      'mssparkutils.fs.cp() to copy each notebook to a temp location and run',
      'There is no built-in fan-out — the orchestrator must call a Data Pipeline ForEach activity'
    ],
    correct: 1,
    explanation:
      '`mssparkutils.notebook.runMultiple()` accepts a list of notebook descriptors (path, args, dependencies, timeout) and executes them concurrently in the same Spark session, respecting the declared DAG of dependencies. A serial for-loop with `notebook.run()` would be 10x slower; a Pipeline ForEach activity works but is heavier than the in-notebook DAG.',
    whyWrong: {
      0: 'A serial for-loop runs the children one at a time — no parallelism. Wastes orchestration time when notebooks are independent.',
      2: 'mssparkutils.fs.cp() is for file copies, not notebook execution.',
      3: 'runMultiple is exactly the built-in fan-out primitive for in-notebook orchestration.'
    },
    source: SRC_SPKN.mssparkutils,
    tags: ['mssparkutils', 'orchestration', 'parallel', 'runMultiple'],
    relatedIds: ['spkn-009']
  }),

  // ── Code-reading: credentials ────────────────────────────────

  single({
    id: 'spkn-013', domain: 'prepare', subtopic: 'mssparkutils', difficulty: 4,
    prompt:
      'A notebook needs an Azure Storage SAS token from a Key Vault to read from a non-OneLake account. Given this snippet, what does it return?\n\n```python\ntoken = mssparkutils.credentials.getSecret(\n    "https://my-kv.vault.azure.net/",\n    "storage-sas"\n)\n```',
    options: [
      'The plaintext value of the secret named "storage-sas" in the specified Key Vault, fetched using the notebook user\'s identity',
      'A bearer token that must be exchanged at the Key Vault REST API for the actual secret',
      'A pointer to the secret that must be re-resolved by Spark on each call',
      'An error because mssparkutils requires a service principal, not the user identity'
    ],
    correct: 0,
    explanation:
      '`mssparkutils.credentials.getSecret(vaultUri, secretName)` fetches the plaintext secret value from Azure Key Vault. Authentication uses the notebook user\'s identity by default (via the workspace identity broker), so the user must have GET permission on the Key Vault secrets. Use `mssparkutils.credentials.getToken(audience)` for OAuth bearer tokens (e.g., to call other Azure REST APIs).',
    whyWrong: {
      1: 'getSecret returns the plaintext secret directly — no exchange step.',
      2: 'No re-resolution; the call returns the secret value at call time.',
      3: 'mssparkutils supports user-identity auth, not only service principals.'
    },
    source: SRC_SPKN.mssparkutils,
    tags: ['mssparkutils', 'credentials', 'key-vault', 'code-reading']
  }),

  // ── Lakehouse files & schema ────────────────────────────────

  multi({
    id: 'spkn-014', domain: 'prepare', subtopic: 'lakehouse-files', difficulty: 4,
    prompt:
      'Which statements about V-Order in Fabric Spark Delta writes are TRUE?',
    options: [
      'V-Order is a Parquet-level write-time optimization that improves Direct Lake and Power BI scan performance',
      'V-Order is enabled by default for Delta writes in Fabric Spark notebooks',
      'V-Order can be disabled per-write via `.option("parquet.vorder.enabled", "false")`',
      'V-Order trades a small extra CPU cost on write for faster compressed reads',
      'V-Order is required for Delta tables — disabling it corrupts the table'
    ],
    correct: [0, 1, 2, 3],
    explanation:
      'V-Order is Fabric\'s Parquet write-time optimization (sort + dictionary encoding tweaks) that produces files that read faster in Direct Lake / VertiPaq. It is on by default in Fabric Spark, can be disabled per-write or session-wide for write-heavy workloads where read perf is less critical, and adds a small CPU overhead on write. Disabling it produces standard Parquet — the table remains valid Delta.',
    whyWrong: {
      4: 'V-Order is a write-time optimization. Disabling it produces standard Parquet files inside the Delta table — the table is still valid and readable. It does not corrupt anything.'
    },
    source: SRC_SPKN.lakehouseFiles,
    tags: ['lakehouse-files', 'v-order', 'delta']
  }),

  single({
    id: 'spkn-015', domain: 'prepare', subtopic: 'lakehouse-files', difficulty: 4,
    prompt:
      'A notebook tries to append a DataFrame with a STRING column `customer_id` to an existing Delta table where `customer_id` is INT. No `mergeSchema` option is set. What happens?',
    options: [
      'The write succeeds; Delta auto-casts STRING to INT',
      'The write fails with an AnalysisException for a schema/type mismatch — Delta enforces the existing schema',
      'The write succeeds and the column type changes to STRING for new rows only',
      'The write succeeds but with a warning logged to the driver'
    ],
    correct: 1,
    explanation:
      'Delta Lake schema enforcement rejects appends where the incoming column types do not match the existing schema. An AnalysisException is thrown. Fix options: (a) cast the incoming DataFrame column to INT, (b) `overwriteSchema=true` to replace the schema entirely, or (c) `mergeSchema=true` only adds NEW columns — it does not change existing column types.',
    whyWrong: {
      0: 'Delta does not auto-cast across types. Schema enforcement is the default and intentional.',
      2: 'Per-row type drift is not allowed in Delta — column types are table-wide.',
      3: 'A warning is not the behavior — an exception is raised so the bad data does not land.'
    },
    source: SRC_SPKN.lakehouseFiles,
    tags: ['lakehouse-files', 'delta', 'schema-enforcement']
  }),

  multi({
    id: 'spkn-016', domain: 'prepare', subtopic: 'lakehouse-files', difficulty: 4,
    prompt:
      'A notebook needs to read a Parquet dataset stored in a NON-OneLake ADLS Gen2 account. Which approaches are valid?',
    options: [
      'spark.read.parquet("abfss://container@account.dfs.core.windows.net/path/")',
      'Create a OneLake Shortcut in a Lakehouse pointing at the ADLS path, then read from the shortcut path under Files/ or Tables/',
      'spark.read.parquet("https://account.blob.core.windows.net/container/path/")',
      'mssparkutils.fs.mount("abfss://...", "/mnt/extdata"), then spark.read.parquet("/mnt/extdata/path/")',
      'Reading non-OneLake ADLS is forbidden in Fabric — copy the data into OneLake first'
    ],
    correct: [0, 1, 3],
    explanation:
      'Direct abfss:// reads work if the workspace identity (or an explicit credential) has permission. OneLake Shortcuts surface external ADLS data as if it were native Lakehouse content — preferred for repeated reads. mssparkutils.fs.mount() mounts an external path under /mnt/ for POSIX-style access. https:// blob URLs are not the Spark-supported scheme for ADLS Gen2 (use abfss://). External reads are absolutely permitted.',
    whyWrong: {
      2: 'https:// is the Blob REST URL — Spark on Fabric expects abfss:// for ADLS Gen2 hierarchical namespace access.',
      4: 'External ADLS reads are explicitly supported — no requirement to copy into OneLake first.'
    },
    source: SRC_SPKN.shortcuts,
    tags: ['lakehouse-files', 'shortcuts', 'adls', 'abfss']
  }),

  // ── Session management ──────────────────────────────────────

  single({
    id: 'spkn-017', domain: 'prepare', subtopic: 'session-management', difficulty: 3,
    prompt:
      'A user opens a Fabric notebook interactively, runs 5 cells, then walks away from the laptop for 45 minutes. They return to find the next cell execution is slow (~90 seconds). What is the MOST likely explanation?',
    options: [
      'OneLake throttled the workspace because of inactivity',
      'The Spark session timed out (default ~20 minutes idle), so the next execution is paying the cold-start of a new session',
      'The Lakehouse was placed in maintenance mode by Fabric',
      'The notebook auto-saved a checkpoint, which always takes 90 seconds'
    ],
    correct: 1,
    explanation:
      'Interactive Fabric Spark sessions have a default idle timeout (around 20 minutes for standard mode). After timeout, the next cell execution must spin up a fresh session — the cold-start cost shows up as ~30–120 seconds depending on pool warm state and runtime size. Sessions can be kept alive longer in High Concurrency or by tuning session timeout in the Environment.',
    whyWrong: {
      0: 'OneLake does not throttle on user inactivity.',
      2: 'Lakehouses are not put into "maintenance mode" by Fabric without notice.',
      3: 'Notebook autosave is metadata-light and does not cause 90s cell execution times.'
    },
    source: SRC_SPKN.session,
    tags: ['session-management', 'idle-timeout', 'cold-start']
  }),

  // ── Code-reading: AQE & shuffle ──────────────────────────────

  single({
    id: 'spkn-018', domain: 'prepare', subtopic: 'pyspark', difficulty: 5,
    prompt:
      'A notebook joins a 2 GB fact table with a 12 MB dimension table. The engineer adds the following BEFORE the join:\n\n```python\nfrom pyspark.sql.functions import broadcast\nresult = fact_df.join(broadcast(dim_df), "customer_id")\n```\n\nWhy might this hint be useful even when AQE is enabled?',
    options: [
      'broadcast() is the only way to perform any join in Spark — without it, joins fail',
      'It explicitly forces a broadcast hash join, eliminating the shuffle for fact_df and avoiding an AQE plan revision',
      'broadcast() materialises both DataFrames to driver memory before the join',
      'broadcast() is deprecated in Fabric Spark — AQE now picks join strategies automatically with no hints needed'
    ],
    correct: 1,
    explanation:
      'Wrapping the small side with `broadcast()` forces a broadcast hash join from the start — Spark ships the 12 MB dim to every executor and avoids the costly shuffle of the 2 GB fact. AQE can pick broadcast at runtime if statistics show the side is small enough (default threshold `spark.sql.autoBroadcastJoinThreshold` = 10 MB), but an explicit hint guarantees it without waiting for AQE\'s decision.',
    whyWrong: {
      0: 'Joins absolutely work without broadcast() — broadcast is an optimization hint.',
      2: 'broadcast() ships the small side to every executor; only the small side is materialised on the driver briefly. The fact_df is NOT materialised.',
      3: 'broadcast() is not deprecated. AQE\'s automatic decisions and explicit hints coexist; hints win when present.'
    },
    source: SRC_SPKN.sparkTraps,
    tags: ['pyspark', 'broadcast-join', 'aqe', 'code-reading'],
    relatedIds: ['spkn-019']
  }),

  multi({
    id: 'spkn-019', domain: 'prepare', subtopic: 'pyspark', difficulty: 4,
    prompt:
      'Which Spark traps are commonly responsible for driver Out-Of-Memory errors in a Fabric notebook?',
    options: [
      'Calling `df.collect()` on a multi-million-row DataFrame to bring all rows to the driver',
      'Calling `df.toPandas()` on a multi-GB DataFrame, materialising it on the driver',
      'Calling `df.show(20)` to display a sample of the first 20 rows',
      'Building a very large Python list as a broadcast variable on the driver',
      'Repeatedly calling `df.cache()` then `df.unpersist()` in a loop'
    ],
    correct: [0, 1, 3],
    explanation:
      'Driver OOMs come from operations that pull data ONTO the driver: collect(), toPandas() on large DataFrames, and constructing huge broadcast variables locally. show(N) only fetches the first N rows — fine for any size table. cache/unpersist cycles affect executor memory, not the driver.',
    whyWrong: {
      2: 'show(20) fetches at most 20 rows to the driver — negligible memory regardless of DataFrame size.',
      4: 'cache/unpersist operate on executor storage memory, not the driver. Cycling them does not OOM the driver.'
    },
    source: SRC_SPKN.sparkTraps,
    tags: ['pyspark', 'driver-oom', 'collect', 'toPandas']
  }),

  // ── Ordering: setting up a notebook session correctly ──────

  order({
    id: 'spkn-020', domain: 'prepare', subtopic: 'spark-config', difficulty: 4,
    prompt:
      'A team needs to start a new Fabric notebook session with custom Spark settings, install a non-Environment library, and then read a Delta table. Order the steps so the configuration takes effect.',
    options: [
      'Attach the notebook to the target Environment (selects runtime + base libraries)',
      'Set the default Lakehouse on the notebook so spark.table() resolves correctly',
      'Place a %%configure cell as the FIRST executable cell with the desired conf JSON',
      'Run %pip install <library> in a subsequent cell to add the session-scoped package',
      'Read the Delta table via spark.read.format("delta") or spark.table()'
    ],
    explanation:
      'Environment attachment and Lakehouse selection are notebook-level metadata that must be set BEFORE the first cell runs. %%configure must be the FIRST executable cell — Spark settings cannot change after the session starts. %pip installs into the live session after it boots. Only then is it safe to read.',
    whyWrong: {},
    source: SRC_SPKN.sparkConfig,
    tags: ['ordering', 'spark-config', 'session-setup', 'environments']
  }),

  // ── Cross-workspace shortcut vs direct path ─────────────────

  single({
    id: 'spkn-021', domain: 'prepare', subtopic: 'lakehouse-files', difficulty: 4,
    prompt:
      'A team in Workspace B needs to read a Delta table that physically lives in Workspace A\'s Lakehouse. Which option is the BEST PRACTICE for repeated production reads?',
    options: [
      'Use the full abfss:// URI of Workspace A from notebooks in Workspace B',
      'Create a OneLake Shortcut in Workspace B\'s Lakehouse that points at Workspace A\'s Tables/<table>/, then read it as a local table',
      'Copy the table into Workspace B with mssparkutils.fs.cp() each morning',
      'Mount Workspace A under /mnt/wsA in every Workspace B notebook'
    ],
    correct: 1,
    explanation:
      'OneLake Shortcuts are the canonical way to surface another workspace\'s data in your Lakehouse without copying. The shortcut appears as a regular Tables/ entry in Workspace B and respects the source\'s ACLs. Production reads benefit from the metastore registration (so spark.table() works) and from no per-read cross-workspace URI handling.',
    whyWrong: {
      0: 'Direct abfss:// works but is brittle: every notebook hardcodes the path, no metastore registration, refactors are painful.',
      2: 'Daily copies double-store the data and introduce a freshness lag. Use shortcuts for live reads.',
      3: 'Mounts are session-scoped — every session pays the mount cost and you lose metastore integration.'
    },
    source: SRC_SPKN.shortcuts,
    tags: ['lakehouse-files', 'shortcuts', 'cross-workspace']
  }),

  // ── Code-reading: time-travel ───────────────────────────────

  single({
    id: 'spkn-022', domain: 'prepare', subtopic: 'pyspark', difficulty: 4,
    prompt:
      'A notebook runs the following query against a Delta table:\n\n```python\ndf = spark.read.format("delta") \\\n    .option("versionAsOf", 12) \\\n    .load("Tables/orders")\nprint(df.count())\n```\n\nWhat does this code do?',
    options: [
      'Reads the Delta table as it existed at version 12 of its transaction log (Delta time-travel) and prints the row count',
      'Reads only the most recent 12 versions of changed rows in the table',
      'Restores the Delta table to version 12 and prints the row count of the restored state',
      'Errors because versionAsOf is only valid in SQL, not the DataFrame API'
    ],
    correct: 0,
    explanation:
      '`versionAsOf` is Delta time-travel: read the table snapshot at the specified transaction-log version. The table itself is unchanged on disk — this is a read-only point-in-time view. Use `timestampAsOf` to read by wall-clock time instead.',
    whyWrong: {
      1: 'versionAsOf does not "diff" — it reads the full snapshot at version 12.',
      2: 'Reading does not restore. Restoration requires `RESTORE TABLE ... TO VERSION AS OF 12` (SQL) or `DeltaTable.restoreToVersion(12)`.',
      3: 'versionAsOf is fully supported in both SQL and the DataFrame API.'
    },
    source: SRC_SPKN.pysparkPatterns,
    tags: ['pyspark', 'delta', 'time-travel', 'code-reading']
  }),

  // ── AQE behavior ─────────────────────────────────────────────

  multi({
    id: 'spkn-023', domain: 'prepare', subtopic: 'spark-config', difficulty: 5,
    prompt:
      'Which behaviors of Adaptive Query Execution (AQE) are TRUE in Fabric Spark?',
    options: [
      'AQE can dynamically coalesce post-shuffle partitions to avoid many tiny tasks',
      'AQE can switch a sort-merge join to a broadcast-hash join at runtime if statistics show one side is small',
      'AQE can dynamically re-optimize join order based on collected runtime statistics',
      'AQE skews join handling can split a heavy partition into several smaller subpartitions to balance task load',
      'AQE replaces the need to ever set spark.sql.shuffle.partitions explicitly'
    ],
    correct: [0, 1, 3],
    explanation:
      'AQE re-optimizes plans BETWEEN stages using actual runtime statistics. It coalesces small post-shuffle partitions, can promote sort-merge joins to broadcast-hash joins when stats reveal a small side, and handles skew by splitting hot partitions. AQE does NOT change join ORDER mid-plan (that is cost-based optimisation done up-front). Setting shuffle.partitions still matters as a starting point — AQE can only coalesce DOWN, not up.',
    whyWrong: {
      2: 'AQE re-optimizes execution strategies (join algorithm, partition counts, skew handling) but does not reorder joins after execution starts. Join order is decided by the cost-based optimizer at planning time.',
      4: 'AQE coalesces partitions DOWN from the configured shuffle.partitions count — it cannot increase. So setting a sensible starting value still matters.'
    },
    source: SRC_SPKN.sparkTraps,
    tags: ['spark-config', 'aqe', 'shuffle']
  }),

  // ── Notebook scheduling vs interactive ──────────────────────

  multi({
    id: 'spkn-024', domain: 'prepare', subtopic: 'session-management', difficulty: 4,
    prompt:
      'Which differences between INTERACTIVE notebook sessions and SCHEDULED Pipeline-triggered notebook runs in Fabric are TRUE?',
    options: [
      'Interactive sessions stay alive across cell executions; scheduled runs spin up a fresh session, execute, and tear down',
      'Scheduled runs always use the user\'s identity at scheduling time — there is no service-principal option',
      'Scheduled runs receive parameters via the Pipeline\'s Notebook Activity arguments, mapped to the notebook\'s parameter cell',
      'Interactive sessions show real-time cell output; scheduled runs persist output as Snapshots viewable later in the Monitoring hub',
      'Scheduled notebook runs cannot use High Concurrency Mode — only interactive sessions can'
    ],
    correct: [0, 2, 3],
    explanation:
      'Interactive sessions are persistent and conversational; scheduled runs are headless and tear down after completion. Pipeline parameters land in the parameter cell of the target notebook. Scheduled-run output is captured as a Snapshot (full notebook + outputs) viewable in the Monitoring hub. Scheduled runs CAN use HC sessions — High Concurrency benefits scheduled fan-out the most. Scheduled runs can use service principal or workspace identity, not just the scheduler\'s user identity.',
    whyWrong: {
      1: 'Scheduled runs can authenticate via service principal, workspace identity, or the configured connection — not strictly the scheduler user.',
      4: 'High Concurrency is fully usable for scheduled runs and is in fact the recommended pattern for fan-out batch jobs.'
    },
    source: SRC_SPKN.session,
    tags: ['session-management', 'scheduling', 'pipelines']
  }),

  // ── Ordering: investigating a slow notebook job ─────────────

  order({
    id: 'spkn-025', domain: 'prepare', subtopic: 'spark-config', difficulty: 4,
    prompt:
      'A scheduled Fabric notebook job runs 4x slower this week than last week. Order the diagnostic steps to investigate, from FIRST to LAST.',
    options: [
      'Open the Monitoring hub and find the recent slow run; capture the elapsed time vs the prior baseline',
      'Open the Spark UI for the slow run and identify the longest-running stage',
      'Inspect that stage\'s tasks for skew, spill, or excessive shuffle bytes',
      'Compare the input data size and partition count to the prior run to see if upstream data grew or schema changed',
      'Apply a targeted fix (broadcast hint, repartition, %%configure tuning) and re-run to confirm'
    ],
    explanation:
      'Diagnose top-down: confirm the regression is real (Monitoring), find WHERE the time is spent (Spark UI longest stage), find WHY the stage is slow (task-level skew/spill/shuffle), validate the underlying cause (input data delta), then apply a targeted fix and verify. Skipping straight to a fix without identifying the cause typically wastes a session.',
    whyWrong: {},
    source: SRC_SPKN.sparkTraps,
    tags: ['ordering', 'troubleshooting', 'spark-ui', 'monitoring']
  })

];
