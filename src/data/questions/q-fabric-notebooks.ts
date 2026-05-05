import type { Question } from '../../lib/schema';
import { single, multi, order, SRC } from './_helpers';

// 20 DP-600-style questions covering Microsoft Fabric Notebooks.
// IDs: fbnb-001..fbnb-020.
// Domain: prepare (all 20).
// Subtopics: notebooks, pyspark, spark-config, high-concurrency,
//   magic-commands, mssparkutils, lakehouse-files, session-management.
// Mix: 8 multi-select, 1 ordering, 11 single.
// Code-reading questions: fbnb-007, fbnb-008, fbnb-009 (3 total).
// Ordering: fbnb-019 (Bronze→Silver→Gold notebook pipeline).

export const fabricNotebooks: Question[] = [

  // ── Session model: standard vs High Concurrency ─────────────

  single({
    id: 'fbnb-001', domain: 'prepare', subtopic: 'session-management', difficulty: 2,
    prompt:
      'By default, each Fabric notebook that runs starts its own Spark session. Which statement correctly describes the alternative HIGH CONCURRENCY MODE?',
    options: [
      'High Concurrency Mode gives each notebook a dedicated Spark cluster for better isolation',
      'Up to 50 notebooks can share a single Spark session, reducing cluster startup overhead',
      'High Concurrency Mode disables Delta Lake support to improve throughput',
      'High Concurrency Mode is only available for Scala notebooks'
    ],
    correct: 1,
    explanation:
      'High Concurrency Mode lets up to 50 notebooks share one live Spark session, eliminating per-notebook cold-start time. All notebooks run in isolated execution contexts within the same session — they see separate variables but share the cluster resources.',
    whyWrong: {
      0: 'The opposite is true — High Concurrency shares a session; it does not add isolation via a dedicated cluster.',
      2: 'Delta Lake is fully supported in High Concurrency Mode.',
      3: 'All language kernels (PySpark, SparkSQL, Scala, R) can participate.'
    },
    source: SRC.notebooks,
    tags: ['high-concurrency', 'session'],
    relatedIds: ['fbnb-002']
  }),

  single({
    id: 'fbnb-002', domain: 'prepare', subtopic: 'high-concurrency', difficulty: 3,
    prompt:
      'A data platform team runs 30 similarly-shaped Bronze→Silver ETL notebooks on an overnight schedule. They want to cut cluster cold-start time. Which configuration is MOST appropriate?',
    options: [
      'Pin each notebook to a dedicated Spark cluster via %%configure',
      'Enable High Concurrency Mode so all 30 notebooks share one session',
      'Increase executor memory in each notebook\'s %%configure cell',
      'Use mssparkutils.notebook.run() to chain them serially in one notebook'
    ],
    correct: 1,
    explanation:
      'High Concurrency Mode is designed for exactly this scenario — many notebooks with similar workloads scheduled together. One warm session serves up to 50 notebooks, eliminating repeated cold-start penalties.',
    whyWrong: {
      0: '%%configure scopes Spark settings to a single session; it does not reduce cold-start for many notebooks.',
      2: 'Increasing executor memory changes resource allocation, not cold-start latency.',
      3: 'Chaining serially via mssparkutils.notebook.run() is orchestration — it still pays cold-start per session unless High Concurrency is also enabled.'
    },
    source: SRC.notebooks,
    tags: ['high-concurrency', 'orchestration'],
    relatedIds: ['fbnb-001', 'fbnb-013']
  }),

  multi({
    id: 'fbnb-003', domain: 'prepare', subtopic: 'high-concurrency', difficulty: 4,
    prompt:
      'Which scenarios are APPROPRIATE for enabling High Concurrency Mode?',
    options: [
      'Orchestrated pipeline running 20 similarly-shaped Silver ETL notebooks concurrently',
      'A single notebook with a very large shuffle that needs exclusive cluster resources',
      'A set of daily Bronze-ingest jobs with homogeneous schema and workload',
      'An ad-hoc exploratory notebook where a data scientist needs guaranteed isolation',
      'A scheduled batch of 40 reporting-layer aggregation notebooks'
    ],
    correct: [0, 2, 4],
    explanation:
      'High Concurrency shines when workloads are similar and can share the session pool safely — pipeline-driven ETL, homogeneous batch jobs, and scheduled aggregations. Notebooks that need exclusive resources or isolation (large shuffles, ad-hoc exploration) are better served by a dedicated session.',
    whyWrong: {
      1: 'A large shuffle notebook that needs exclusive resources should have its own session to avoid starving other notebooks.',
      3: 'Ad-hoc exploration benefits from isolation — shared sessions may expose one analyst\'s globals to another.'
    },
    source: SRC.notebooks,
    tags: ['high-concurrency', 'design']
  }),

  // ── Magic commands ───────────────────────────────────────────

  single({
    id: 'fbnb-004', domain: 'prepare', subtopic: 'magic-commands', difficulty: 2,
    prompt:
      'A Fabric notebook is set to PySpark. A data engineer adds the line `%%sparksql` at the top of a cell, then writes a SELECT statement. What happens?',
    options: [
      'The cell fails because you cannot mix languages',
      'The cell executes the SELECT as SparkSQL regardless of the notebook default language',
      'The cell runs PySpark and ignores the magic command',
      '%%sparksql is not a valid magic command; the correct one is %%sql'
    ],
    correct: 1,
    explanation:
      '`%%sparksql` is a cell-level magic that overrides the notebook default language for that cell only. The SELECT runs as SparkSQL even though the notebook default is PySpark.',
    whyWrong: {
      0: 'Magic commands exist precisely to allow per-cell language overrides.',
      2: 'The magic command takes precedence over the notebook default.',
      3: '`%%sparksql` IS the valid Fabric notebook magic. `%%sql` is a Databricks-specific alias that does not apply here.'
    },
    source: SRC.notebooks,
    tags: ['magic-commands', 'sparksql'],
    relatedIds: ['fbnb-005']
  }),

  multi({
    id: 'fbnb-005', domain: 'prepare', subtopic: 'magic-commands', difficulty: 3,
    prompt:
      'Which cell-level magic commands are valid in a Fabric Spark notebook?',
    options: [
      '%%pyspark',
      '%%sparksql',
      '%%scala',
      '%%configure',
      '%%markdown',
      '%%r'
    ],
    correct: [0, 1, 2, 3, 4, 5],
    explanation:
      'All six are valid Fabric notebook magic commands. `%%pyspark`, `%%sparksql`, `%%scala`, and `%%r` switch the cell language. `%%configure` sets session-scoped Spark configuration. `%%markdown` renders Markdown documentation in the cell output.',
    whyWrong: {},
    source: SRC.notebooks,
    tags: ['magic-commands', 'languages']
  }),

  single({
    id: 'fbnb-006', domain: 'prepare', subtopic: 'spark-config', difficulty: 3,
    prompt:
      'A data engineer wants to set `spark.sql.shuffle.partitions` to 64 for an entire notebook session. They add the following cell:\n\n```\n%%configure\n{\n  "conf": {\n    "spark.sql.shuffle.partitions": "64"\n  }\n}\n```\n\nThe setting does NOT take effect. What is the MOST likely reason?',
    options: [
      '%%configure does not support spark.sql.shuffle.partitions',
      'The %%configure cell was not the FIRST executable cell in the notebook',
      'The value must be passed as an integer, not a string',
      '%%configure only works in Scala notebooks'
    ],
    correct: 1,
    explanation:
      '`%%configure` must be placed in the FIRST executable cell of the notebook — before any other code runs. If the Spark session has already started when `%%configure` executes, the settings are ignored. Move the cell to the top of the notebook.',
    whyWrong: {
      0: '`spark.sql.shuffle.partitions` is a valid Spark SQL configuration key accepted by %%configure.',
      2: 'Spark config values are passed as strings in JSON regardless of their logical type.',
      3: '%%configure works in any notebook language (PySpark, Scala, SparkSQL).'
    },
    source: SRC.notebooks,
    tags: ['%%configure', 'spark-config', 'session-management'],
    relatedIds: ['fbnb-005']
  }),

  // ── Code-reading questions ───────────────────────────────────

  single({
    id: 'fbnb-007', domain: 'prepare', subtopic: 'pyspark', difficulty: 4,
    prompt:
      'A Fabric notebook contains the following PySpark code:\n\n```python\ndf = spark.read.format("delta").load("abfss://myworkspace@onelake.dfs.core.windows.net/mylakehouse.Lakehouse/Tables/sales")\ndf2 = df.filter(df.region == "WEST").cache()\ndf2.count()\ndf2.groupBy("product").sum("revenue").show()\n```\n\nWhat does the `.cache()` call on `df2` accomplish?',
    options: [
      'It materialises df2 to a Delta table so later reads avoid recomputation',
      'It pins df2 in Spark\'s distributed memory so the second action (groupBy) avoids re-reading and re-filtering the Delta files',
      'It stores df2 in the Lakehouse Files/ folder as a parquet checkpoint',
      'It has no effect because Delta caching already handles this automatically'
    ],
    correct: 1,
    explanation:
      '`cache()` (which is `persist(StorageLevel.MEMORY_AND_DISK)`) tells Spark to keep the filtered DataFrame in memory after the first action (`count()`). The second action (`groupBy`) reuses the cached data instead of re-reading and re-filtering the Delta files, saving I/O. This is Spark in-memory caching — not Delta caching (which is a separate Spark SQL data-source-level feature).',
    whyWrong: {
      0: '`cache()` keeps data in Spark executors\' memory/disk; it does not write a Delta table.',
      2: 'Cache stores data in executor memory/disk within the Spark session — not in OneLake Files.',
      3: 'Delta caching caches raw Parquet file data at the storage layer; Spark `cache()` caches the in-memory DataFrame. They are complementary, not duplicates.'
    },
    source: SRC.notebooks,
    tags: ['pyspark', 'cache', 'code-reading'],
    relatedIds: ['fbnb-015']
  }),

  single({
    id: 'fbnb-008', domain: 'prepare', subtopic: 'pyspark', difficulty: 4,
    prompt:
      'A Fabric notebook runs the following code against the default Lakehouse:\n\n```python\ndf = spark.table("silver.customer")\ndf.write.format("delta") \\\n    .mode("overwrite") \\\n    .option("overwriteSchema", "true") \\\n    .saveAsTable("gold.customer_dim")\n```\n\nThe write succeeds. Where does `gold.customer_dim` land in OneLake?',
    options: [
      'Files/gold/customer_dim/ as raw Parquet files',
      'Tables/gold/customer_dim/ as a managed Delta table registered in the Lakehouse metastore',
      'A new sub-Lakehouse named "gold" is created automatically',
      'The table is written to the default Spark warehouse path outside OneLake'
    ],
    correct: 1,
    explanation:
      '`saveAsTable()` writes a MANAGED Delta table into the Lakehouse metastore. In Fabric the managed table path resolves to `Tables/<schema>/<tableName>/` within the attached Lakehouse in OneLake. The table is visible in the Lakehouse Tables section and queryable via the SQL endpoint.',
    whyWrong: {
      0: 'Files/ is for unmanaged file paths. `saveAsTable()` writes managed tables under Tables/.',
      2: 'Fabric does not auto-create a new Lakehouse from a schema name — "gold" is a namespace within the existing Lakehouse metastore.',
      3: 'Fabric Spark is configured to use OneLake as the Spark warehouse root; there is no separate external path.'
    },
    source: SRC.notebooks,
    tags: ['pyspark', 'managed-table', 'lakehouse-files', 'code-reading'],
    relatedIds: ['fbnb-010']
  }),

  single({
    id: 'fbnb-009', domain: 'prepare', subtopic: 'pyspark', difficulty: 5,
    prompt:
      'A notebook appends new records to an existing Delta table using:\n\n```python\nnew_df.write.format("delta") \\\n    .mode("append") \\\n    .option("mergeSchema", "true") \\\n    .save("abfss://ws@onelake.dfs.core.windows.net/lh.Lakehouse/Tables/events")\n```\n\n`new_df` has two extra columns not in the existing schema. What is the outcome?',
    options: [
      'The write fails with an AnalysisException because the schemas do not match',
      'The new columns are added to the Delta table schema and all existing rows show NULL for those columns',
      'Only the columns matching the existing schema are written; the two new columns are silently dropped',
      'The write succeeds but `mergeSchema` is only for read operations; the new columns are stored in a sidecar file'
    ],
    correct: 1,
    explanation:
      '`mergeSchema=true` (schema evolution) tells the Delta writer to extend the table schema with any new columns in the incoming DataFrame. Existing rows receive NULL for the new columns. This is the Delta Lake schema evolution mechanism — useful when upstream sources add fields over time.',
    whyWrong: {
      0: 'Without `mergeSchema`, a schema mismatch on append raises AnalysisException. With `mergeSchema=true` it succeeds.',
      2: 'Delta does NOT silently drop columns — schema mismatch either fails or evolves, depending on the option.',
      3: '`mergeSchema` is a write-time option that modifies the table schema. There are no sidecar files for schema drift.'
    },
    source: SRC.notebooks,
    tags: ['pyspark', 'delta', 'schema-evolution', 'code-reading'],
    relatedIds: ['fbnb-008']
  }),

  // ── Lakehouse file paths ─────────────────────────────────────

  multi({
    id: 'fbnb-010', domain: 'prepare', subtopic: 'lakehouse-files', difficulty: 3,
    prompt:
      'Which statements about Lakehouse file paths in a Fabric notebook are TRUE?',
    options: [
      'Tables/ contains managed Delta tables registered in the Lakehouse metastore',
      'Files/ is used for unmanaged files (CSV, JSON, Parquet) not tracked as Delta tables',
      'The abfss:// URI scheme is required to access OneLake from PySpark',
      'spark.table("tablename") reads from Tables/ in the default Lakehouse',
      'Writing to Files/ automatically registers a table in the SQL endpoint'
    ],
    correct: [0, 1, 2, 3],
    explanation:
      'Tables/ holds managed Delta (visible in SQL endpoint); Files/ holds raw unmanaged files. `abfss://` is the correct scheme for OneLake from Spark. `spark.table()` resolves against the metastore, which maps to Tables/ in the default Lakehouse. Writing a file to Files/ does NOT auto-register it — you must either `saveAsTable()` or create an external table.',
    whyWrong: {
      4: 'Files written to Files/ are raw and not auto-registered. Only `saveAsTable()` or explicit DDL registers them in the SQL endpoint.'
    },
    source: SRC.notebooks,
    tags: ['lakehouse-files', 'paths', 'onelake'],
    relatedIds: ['fbnb-008']
  }),

  single({
    id: 'fbnb-011', domain: 'prepare', subtopic: 'lakehouse-files', difficulty: 3,
    prompt:
      'A notebook needs to read a CSV uploaded to the Files/ section of the default Lakehouse. Which path pattern is correct in PySpark?',
    options: [
      '`spark.read.csv("Tables/raw/orders.csv")`',
      '`spark.read.csv("abfss://myworkspace@onelake.dfs.core.windows.net/mylakehouse.Lakehouse/Files/raw/orders.csv")`',
      '`spark.read.csv("/lakehouse/default/Files/raw/orders.csv")`',
      'Both B and C are valid'
    ],
    correct: 3,
    explanation:
      'Fabric notebooks mount the default Lakehouse at `/lakehouse/default/` so the relative POSIX path works. The full `abfss://` URI also works and is required when referencing a non-default Lakehouse. Both are valid approaches.',
    whyWrong: {
      0: '`Tables/` is for Delta tables; CSV files uploaded to Files/ are not there.'
    },
    source: SRC.notebooks,
    tags: ['lakehouse-files', 'pyspark', 'paths'],
    relatedIds: ['fbnb-010']
  }),

  multi({
    id: 'fbnb-012', domain: 'prepare', subtopic: 'lakehouse-files', difficulty: 4,
    prompt:
      'A notebook must JOIN a Delta table from the DEFAULT Lakehouse with a Delta table from a SECOND Lakehouse (attached but not default). Which approaches work?',
    options: [
      'Use spark.table("default_table") for the default and spark.read.format("delta").load("abfss://…/second.Lakehouse/Tables/other_table") for the second',
      'Use spark.table("second_lakehouse.other_table") — Fabric auto-registers attached Lakehouses as catalogs',
      'Create a OneLake Shortcut in the default Lakehouse pointing at the second Lakehouse table, then read via spark.table()',
      'Attached Lakehouses are not reachable from a notebook — a copy activity is required',
      'Use mssparkutils.fs to copy the second table to Files/ before reading'
    ],
    correct: [0, 2],
    explanation:
      'Option A uses the full abfss:// URI for the non-default Lakehouse — always correct. Option C uses a Shortcut so spark.table() can resolve it via the default metastore. Fabric does NOT automatically create catalog aliases for attached Lakehouses (B is incorrect). Attached Lakehouses ARE reachable via abfss:// (D is false). mssparkutils copy (E) works but is wasteful and unnecessary.',
    whyWrong: {
      1: 'Fabric does not auto-create catalog-level aliases like "second_lakehouse.other_table" — you need the abfss:// URI or a Shortcut.',
      3: 'Attached Lakehouses are reachable via their full abfss:// URI.',
      4: 'Copying to Files/ duplicates data and is not the right pattern when abfss:// or Shortcuts work.'
    },
    source: SRC.notebooks,
    tags: ['lakehouse-files', 'multi-lakehouse', 'shortcuts'],
    relatedIds: ['fbnb-010', 'fbnb-011']
  }),

  // ── mssparkutils ─────────────────────────────────────────────

  single({
    id: 'fbnb-013', domain: 'prepare', subtopic: 'mssparkutils', difficulty: 3,
    prompt:
      'A pipeline calls a Fabric notebook as a child via `mssparkutils.notebook.run("child_notebook", timeout=300, arguments={"env": "prod"})`. The child notebook raises an unhandled exception. What happens?',
    options: [
      'The parent notebook silently continues; child failures are fire-and-forget',
      'The parent notebook receives an exception and can handle it in a try/except block',
      'The child notebook restarts automatically up to 3 times',
      'The pipeline is paused and waits for manual intervention'
    ],
    correct: 1,
    explanation:
      '`mssparkutils.notebook.run()` is synchronous — the parent blocks until the child completes or times out. If the child raises an unhandled exception, `notebook.run()` propagates it to the parent as a Python exception, which the parent can catch in a try/except block.',
    whyWrong: {
      0: '`notebook.run()` is synchronous, not fire-and-forget.',
      2: 'There is no automatic retry at the `notebook.run()` level — retries are configured at the pipeline activity level.',
      3: 'The pipeline does not pause awaiting manual intervention; the exception propagates to the activity level.'
    },
    source: SRC.notebooks,
    tags: ['mssparkutils', 'orchestration'],
    relatedIds: ['fbnb-002']
  }),

  multi({
    id: 'fbnb-014', domain: 'prepare', subtopic: 'mssparkutils', difficulty: 3,
    prompt:
      'Which mssparkutils namespaces / capabilities exist in Fabric notebooks?',
    options: [
      'mssparkutils.fs — OneLake file operations (ls, cp, mv, rm)',
      'mssparkutils.credentials — Key Vault secret retrieval',
      'mssparkutils.notebook — notebook orchestration (run, exit)',
      'mssparkutils.sql — direct T-SQL execution against a Fabric Warehouse',
      'mssparkutils.env — reading pipeline parameters passed to the notebook'
    ],
    correct: [0, 1, 2, 4],
    explanation:
      'mssparkutils provides: `fs` for file/OneLake operations, `credentials` for Key Vault secrets, `notebook` for orchestration (`run`, `exit`), and `env` (or widget parameters) for accessing pipeline-injected parameters. There is no `mssparkutils.sql` namespace for T-SQL against a Warehouse — use Spark JDBC or the SQL endpoint for that.',
    whyWrong: {
      3: '`mssparkutils.sql` is not a real namespace. Cross-item T-SQL is reached via JDBC connection or by using spark.read.jdbc() — not through mssparkutils.'
    },
    source: SRC.notebooks,
    tags: ['mssparkutils', 'capabilities']
  }),

  // ── Spark configuration and performance ──────────────────────

  multi({
    id: 'fbnb-015', domain: 'prepare', subtopic: 'spark-config', difficulty: 4,
    prompt:
      'A notebook processes a large shuffle-heavy aggregation. Which Spark configuration changes are likely to IMPROVE performance?',
    options: [
      'Reduce spark.sql.shuffle.partitions from the default 200 to match the cluster core count',
      'Enable spark.sql.adaptive.enabled (Adaptive Query Execution)',
      'Set spark.executor.memory to a value that avoids excessive spill to disk',
      'Disable Delta caching for large tables to free executor memory',
      'Increase spark.default.parallelism to 10,000'
    ],
    correct: [0, 1, 2],
    explanation:
      'Tuning shuffle partitions to cluster size reduces small-task overhead. AQE automatically adjusts join strategies and partition counts at runtime. Sufficient executor memory prevents spill, which is the biggest shuffle perf killer. Disabling Delta caching hurts repeated scans. Setting parallelism to 10,000 on a modest cluster creates huge scheduling overhead.',
    whyWrong: {
      3: 'Delta caching accelerates repeated reads of the same Parquet data — disabling it is a regression for iterative workloads.',
      4: 'Setting parallelism far above cluster capacity creates thousands of tiny tasks with scheduling overhead that slows execution.'
    },
    source: SRC.notebooks,
    tags: ['spark-config', 'performance', 'shuffle'],
    relatedIds: ['fbnb-006']
  }),

  single({
    id: 'fbnb-016', domain: 'prepare', subtopic: 'spark-config', difficulty: 3,
    prompt:
      'What is the difference between `df.cache()` and `df.persist(StorageLevel.DISK_ONLY)` in a Fabric notebook?',
    options: [
      'They are identical — cache() is an alias for persist(DISK_ONLY)',
      'cache() stores data in memory (and spills to disk); persist(DISK_ONLY) writes only to disk, avoiding memory pressure',
      'persist() writes to the Lakehouse Files/ folder permanently; cache() is session-only',
      'cache() is deprecated in Spark 3.x; only persist() should be used'
    ],
    correct: 1,
    explanation:
      '`cache()` is shorthand for `persist(StorageLevel.MEMORY_AND_DISK)` — data lives in memory first, spills to executor disk if memory is insufficient. `persist(DISK_ONLY)` bypasses memory entirely, freeing executor memory at the cost of slower access. Choose DISK_ONLY for very large DataFrames where memory pressure would cause other tasks to spill.',
    whyWrong: {
      0: 'cache() defaults to MEMORY_AND_DISK, not DISK_ONLY.',
      2: 'Neither cache() nor persist() writes to OneLake/Files — they use local executor storage within the Spark session.',
      3: 'cache() is not deprecated; both are valid in Spark 3.x.'
    },
    source: SRC.notebooks,
    tags: ['pyspark', 'cache', 'persist', 'spark-config'],
    relatedIds: ['fbnb-007']
  }),

  // ── Notebook environments and git ────────────────────────────

  multi({
    id: 'fbnb-017', domain: 'prepare', subtopic: 'notebooks', difficulty: 3,
    prompt:
      'Which statements about Fabric notebook ENVIRONMENTS are TRUE?',
    options: [
      'A custom Environment can pin a specific Python version and Spark version',
      'Libraries installed in an Environment are available to all notebooks that attach to it',
      'Installing a library with %pip install in a cell persists it to the Lakehouse permanently',
      'The default runtime uses a Microsoft-managed Spark pool with pre-installed libraries',
      'An Environment must be published before notebooks can attach to it'
    ],
    correct: [0, 1, 3, 4],
    explanation:
      'Environments let you pin Python/Spark versions and install custom libraries that all attached notebooks share. The default runtime uses a managed pool with pre-bundled libraries. An Environment must be published (saved and activated) before notebooks can use it. `%pip install` in a cell installs the library for the current SESSION only — it does not persist after the session ends.',
    whyWrong: {
      2: '`%pip install` in a cell is session-scoped. When the session ends the installation is lost. Use an Environment for permanent library management.'
    },
    source: SRC.notebooks,
    tags: ['environments', 'libraries', 'runtime'],
    relatedIds: ['fbnb-006']
  }),

  single({
    id: 'fbnb-018', domain: 'prepare', subtopic: 'notebooks', difficulty: 3,
    prompt:
      'A team wants to version-control Fabric notebooks in Azure DevOps and review changes via pull requests. Which built-in Fabric feature supports this?',
    options: [
      'Notebooks must be exported as .ipynb and committed manually — no native git integration exists',
      'Fabric workspaces support git integration with Azure DevOps or GitHub; notebooks are committed as source-controlled files and PRs can be raised',
      'Only deployment pipelines can be linked to git; notebooks are excluded',
      'Notebooks are stored as binary .pbix files inside git'
    ],
    correct: 1,
    explanation:
      'Fabric has native git integration at the workspace level for Azure DevOps and GitHub. Notebooks are stored as human-readable source files (.py / notebook JSON). Changes can be committed, PR-reviewed, and merged like any other code artifact.',
    whyWrong: {
      0: 'Native git integration exists — manual export is not required.',
      2: 'Git integration applies to notebooks, Lakehouses, pipelines, and other Fabric items — not deployment pipelines alone.',
      3: 'Notebooks are not .pbix files; they are stored as source in JSON/Python format.'
    },
    source: SRC.notebooks,
    tags: ['git', 'devops', 'governance']
  }),

  // ── Ordering: Bronze → Silver → Gold notebook pipeline ──────

  order({
    id: 'fbnb-019', domain: 'prepare', subtopic: 'notebooks', difficulty: 3,
    prompt:
      'Order these steps to set up a Fabric notebook pipeline that reads from Bronze, transforms to Silver, and writes to Gold.',
    options: [
      'Attach the notebook to the correct Lakehouse and configure the default Lakehouse',
      'Read Bronze Delta table: `df = spark.table("bronze.raw_orders")`',
      'Apply cleansing, type-casting, and de-duplication transformations in PySpark',
      'Write conformed output to Silver: `df_clean.write.format("delta").mode("overwrite").saveAsTable("silver.orders")`',
      'Aggregate to Gold and write: `df_agg.write.format("delta").mode("overwrite").saveAsTable("gold.orders_daily")`',
      'Schedule the notebook via a Data Pipeline with a Notebook Activity'
    ],
    explanation:
      'You must attach the Lakehouse first so `spark.table()` resolves correctly. Then read Bronze, transform to Silver, write Silver, aggregate to Gold, write Gold, and finally wire the notebook into a pipeline for scheduling. Attempting to read before attachment or write before transforming will fail.',
    whyWrong: {},
    source: SRC.notebooks,
    tags: ['medallion', 'ordering', 'pipeline', 'notebooks']
  }),

  // ── Notebook scheduling and parameter passing ────────────────

  multi({
    id: 'fbnb-020', domain: 'prepare', subtopic: 'session-management', difficulty: 4,
    prompt:
      'A Data Pipeline calls a Fabric Notebook Activity with a parameter `run_date = "2025-01-15"`. Which statements about parameter passing are TRUE?',
    options: [
      'The parameter is available inside the notebook via mssparkutils.notebook.run() arguments if called from another notebook',
      'When triggered by a Pipeline Notebook Activity, parameters are injected as notebook widget parameters accessible via mssparkutils.widgets or the standard parameter cell',
      'Parameters passed by a Pipeline are automatically available as Python variables without any notebook-side code',
      'The notebook must declare expected parameters using the "toggle parameter cell" feature so the pipeline can inject values',
      'Pipeline parameters are only accessible via environment variables, not notebook widgets'
    ],
    correct: [1, 3],
    explanation:
      'Pipeline Notebook Activities inject parameters as notebook widgets. The notebook must mark a cell as a "parameter cell" (via the toggle in the UI) to declare expected parameters — those become the injection points. Parameters are then read via the widget API or directly by name in the parameterised cell. They are NOT automatically Python variables (C is false) and NOT environment variables (E is false).',
    whyWrong: {
      0: 'mssparkutils.notebook.run() arguments are for notebook-to-notebook calls, not pipeline-to-notebook calls; the mechanism differs.',
      2: 'Parameters do not become Python variables automatically. The parameter cell and widget API are required.',
      4: 'Parameters are not injected as environment variables — they arrive as notebook widget parameters.'
    },
    source: SRC.notebooks,
    tags: ['session-management', 'pipelines', 'parameters', 'mssparkutils'],
    relatedIds: ['fbnb-013']
  })

];
