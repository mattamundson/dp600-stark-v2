import type { Question } from '../../lib/schema';
import { multi, order, single, SRC } from './_helpers';

export const qPrepareBlueprintFill: Question[] = [

  // ═══════════════════════════════════════════════════════════════
  // NOTEBOOKS  pbf-001 … pbf-008
  // ═══════════════════════════════════════════════════════════════

  single({
    id: 'pbf-001', domain: 'prepare', subtopic: 'notebooks', difficulty: 3,
    prompt: 'A data engineer runs `%%configure -f {"executorMemory": "8g"}` in the third cell of a Spark notebook that already has an active session. What actually happens?',
    options: [
      'The Spark session is restarted immediately with the new executor memory',
      'The configuration is silently ignored because %%configure only takes effect before the Spark session starts',
      'An error is thrown that stops execution of all subsequent cells',
      'The setting is queued and applied on the next notebook execution'
    ],
    correct: 1,
    explanation: '`%%configure` with `-f` (force) configures the Livy session request that launches Spark. Once a session is already running, the magic is silently accepted but has NO effect on the live session. You must configure BEFORE the session starts, or stop and restart the session.',
    whyWrong: {
      0: 'The session is NOT restarted. Livy does not interrupt a running session because of a mid-notebook %%configure.',
      2: 'No error is raised — the cell succeeds but the config is not applied, which is the dangerous trap.',
      3: 'There is no queuing mechanism; the setting is discarded entirely for the current session.'
    },
    source: SRC.notebooks,
    tags: ['notebooks', 'configure-magic', 'spark-session', 'exam-trap']
  }),

  single({
    id: 'pbf-002', domain: 'prepare', subtopic: 'notebooks', difficulty: 3,
    prompt: 'A notebook in a Fabric Lakehouse workspace needs to read from a second Lakehouse in the SAME workspace. The team does not want to hardcode storage paths. Which approach is BEST?',
    options: [
      'Use `mssparkutils.fs.ls("abfss://...")` with the raw ABFSS path',
      'Mount the second Lakehouse using `mssparkutils.fs.mount()` and reference the mount point',
      'Attach the second Lakehouse as an additional Lakehouse on the notebook, then reference it by name via `notebookutils.lakehouse.get()`',
      'Create a OneLake shortcut inside the default Lakehouse pointing to the second Lakehouse tables'
    ],
    correct: 2,
    explanation: 'Fabric notebooks support attaching multiple Lakehouses to a single notebook. Once attached, `notebookutils.lakehouse.get()` returns the Lakehouse metadata including the OneLake path — no hardcoded ABFSS URLs needed. This is the idiomatic Fabric pattern.',
    whyWrong: {
      0: 'Hardcoding ABFSS paths works but violates the "no hardcoded paths" constraint and breaks when workspaces are promoted across environments.',
      1: '`mssparkutils.fs.mount()` is supported but is the older Azure Synapse pattern; attaching a Lakehouse is the native Fabric idiom and avoids credential management.',
      3: 'A shortcut solves storage sharing but does not eliminate hardcoded paths from the notebook code — you still need to reference the shortcut location.'
    },
    source: SRC.notebooks,
    tags: ['notebooks', 'mssparkutils', 'notebookutils', 'multi-lakehouse']
  }),

  single({
    id: 'pbf-003', domain: 'prepare', subtopic: 'notebooks', difficulty: 4,
    prompt: 'A Fabric notebook must run a SQL query against the DEFAULT Lakehouse and return results as a Spark DataFrame without writing any intermediate files. Which cell approach is correct?',
    options: [
      '%%sql cell followed by a PySpark read of the resulting temp view',
      'spark.sql("SELECT ...") called in a %%pyspark cell, assigned to a DataFrame variable',
      'notebookutils.data.connect() to the Lakehouse, then execute raw SQL',
      'mssparkutils.notebook.run() chaining a SQL-only notebook'
    ],
    correct: 1,
    explanation: '`spark.sql("SELECT ...")` in a `%%pyspark` cell executes the query via the Spark SQL engine against the default Lakehouse and returns a DataFrame directly — no files written, no temp views needed.',
    whyWrong: {
      0: 'A `%%sql` cell displays results as a table in the notebook UI but does NOT return a Python DataFrame variable you can pass to downstream PySpark code.',
      2: '`notebookutils.data.connect()` is used for JDBC/ODBC style connections, not for Lakehouse Spark SQL; it adds unnecessary complexity.',
      3: 'Chaining a notebook via `mssparkutils.notebook.run()` returns a string output, not a Spark DataFrame.'
    },
    source: SRC.notebooks,
    tags: ['notebooks', 'spark-sql', 'pyspark', 'magic-commands']
  }),

  multi({
    id: 'pbf-004', domain: 'prepare', subtopic: 'notebooks', difficulty: 4,
    prompt: 'Which statements about Fabric Spark notebook RUNTIMES are TRUE?',
    options: [
      'A workspace can have multiple runtime versions installed simultaneously for different notebooks',
      'The default runtime is based on Apache Spark and is updated by Microsoft periodically',
      'Switching the runtime version of a running notebook session takes effect immediately without restart',
      'Custom library installations via `%pip install` or environment libraries persist between notebook sessions by default',
      'Fabric Runtime 1.2 uses Spark 3.4'
    ],
    correct: [0, 1, 4],
    explanation: 'Multiple runtime versions can co-exist across notebooks in a workspace. Runtimes are Microsoft-managed and evolve (Fabric Runtime 1.1 = Spark 3.3; Runtime 1.2 = Spark 3.4). Switching runtime requires a session restart. `%pip install` installs last only for the current session unless libraries are pinned in an Environment item.',
    whyWrong: {
      2: 'Changing runtime requires stopping and restarting the Spark session — it does NOT take effect mid-session.',
      3: '`%pip install` in a notebook cell is session-scoped only. For persistence across sessions you must use a Fabric Environment item with the library pinned.'
    },
    source: SRC.notebooks,
    tags: ['notebooks', 'runtime', 'spark-version', 'libraries']
  }),

  single({
    id: 'pbf-005', domain: 'prepare', subtopic: 'notebooks', difficulty: 3,
    prompt: 'A Fabric notebook needs to call another notebook and pass a parameter value, then capture the return value in the calling notebook. Which utility provides this?',
    options: [
      'mssparkutils.notebook.run("NotebookName", timeout, {"param": "value"})',
      'spark.read.notebook("NotebookName")',
      'notebookutils.session.chain("NotebookName")',
      'A pipeline Notebook activity is the only supported way to pass parameters between notebooks'
    ],
    correct: 0,
    explanation: '`mssparkutils.notebook.run()` (also accessible as `notebookutils.notebook.run()`) allows one notebook to call another with parameters and capture the exit value. It is the standard Fabric pattern for notebook chaining within code.',
    whyWrong: {
      1: '`spark.read.notebook()` is not a valid API — Spark DataFrameReader cannot read another notebook.',
      2: '`notebookutils.session.chain()` does not exist in the Fabric SDK.',
      3: 'Pipeline Notebook activity supports parameters but the question asks about doing it from within notebook code — `mssparkutils.notebook.run()` handles this without a pipeline.'
    },
    source: SRC.notebooks,
    tags: ['notebooks', 'mssparkutils', 'notebook-chaining', 'parameters']
  }),

  single({
    id: 'pbf-006', domain: 'prepare', subtopic: 'notebooks', difficulty: 4,
    prompt: 'A Fabric notebook\'s Spark job runs much slower than expected. The team notices thousands of small output Parquet files in the Lakehouse. Which Spark configuration helps resolve this by merging small files during write?',
    options: [
      'spark.sql.shuffle.partitions set to 1',
      'spark.databricks.delta.optimizeWrite.enabled set to true (Optimize Write)',
      'spark.executor.cores set to the maximum',
      'spark.sql.files.maxPartitionBytes set to 1 KB'
    ],
    correct: 1,
    explanation: 'Fabric Spark supports Optimize Write (`spark.databricks.delta.optimizeWrite.enabled = true`), which coalesces small files during the Delta write operation. This reduces the small-file problem without a separate OPTIMIZE run.',
    whyWrong: {
      0: 'Setting `shuffle.partitions` to 1 creates a single huge partition, which can cause OOM and kills parallelism — not a fix for small files.',
      2: 'More executor cores speeds compute but does not reduce output file count.',
      3: 'Setting `maxPartitionBytes` to 1 KB makes the problem WORSE by forcing even smaller input splits.'
    },
    source: SRC.notebooks,
    tags: ['notebooks', 'spark', 'optimize-write', 'small-files']
  }),

  multi({
    id: 'pbf-007', domain: 'prepare', subtopic: 'notebooks', difficulty: 4,
    prompt: 'Which capabilities are available via `mssparkutils.fs` in a Fabric notebook?',
    options: [
      'List files in a OneLake path',
      'Copy or move files between OneLake paths',
      'Stream real-time events from Eventstream into a DataFrame',
      'Read secrets from Azure Key Vault',
      'Mount an ADLS Gen2 account as a local path'
    ],
    correct: [0, 1, 4],
    explanation: '`mssparkutils.fs` provides file-system operations: ls, cp, mv, mkdir, rm, and mount. Eventstream ingestion is not part of `mssparkutils.fs`. Key Vault secrets use `mssparkutils.credentials`, not `mssparkutils.fs`.',
    whyWrong: {
      2: 'Eventstream ingestion is handled by a separate Fabric item (Eventstream) and Spark Structured Streaming — not by `mssparkutils.fs`.',
      3: 'Key Vault secret retrieval uses `mssparkutils.credentials.getSecret()`, not `mssparkutils.fs`.'
    },
    source: SRC.notebooks,
    tags: ['notebooks', 'mssparkutils', 'fs-api']
  }),

  order({
    id: 'pbf-008', domain: 'prepare', subtopic: 'notebooks', difficulty: 3,
    prompt: 'Order these steps to run a parameterized Fabric Spark notebook that reads from a Lakehouse, transforms data, and writes a Delta table — from FIRST to LAST.',
    options: [
      'Attach the source Lakehouse to the notebook as the default or additional Lakehouse',
      'Define a Parameters cell with the target table name variable',
      'Read source data using spark.read or spark.sql against the attached Lakehouse',
      'Apply transformation logic (filter, join, aggregate) producing a result DataFrame',
      'Write the result DataFrame to the Lakehouse Delta table using df.write.format("delta").saveAsTable()'
    ],
    explanation: 'Attach first so the Lakehouse context is available. Define parameters before they are referenced. Then read → transform → write. The write cannot succeed before the transformation produces the DataFrame.',
    whyWrong: {},
    source: SRC.notebooks,
    tags: ['notebooks', 'ordering', 'lakehouse', 'delta-write']
  }),

  // ═══════════════════════════════════════════════════════════════
  // DATAFLOW GEN2  pbf-009 … pbf-017
  // ═══════════════════════════════════════════════════════════════

  single({
    id: 'pbf-009', domain: 'prepare', subtopic: 'dataflow-gen2', difficulty: 3,
    prompt: 'A Dataflow Gen2 is refreshed successfully every morning, but no data appears in the connected Lakehouse table. What is the MOST LIKELY cause?',
    options: [
      'Dataflow Gen2 requires a pipeline activity to trigger the write',
      'No output destination was configured on the query — the dataflow transforms data in memory but writes nowhere',
      'The Lakehouse table must be pre-created before the dataflow can write to it',
      'Dataflow Gen2 only writes to Power BI semantic models, not Lakehouses'
    ],
    correct: 1,
    explanation: 'In Dataflow Gen2 every query must have an output destination configured explicitly; without one, the transformation runs and produces no persisted output. This is the single most common Gen2 trap — the refresh says "success" but the Lakehouse table is empty because no destination was set.',
    whyWrong: {
      0: 'Dataflow Gen2 can write directly to Lakehouse on its own schedule; a pipeline is optional.',
      2: 'Dataflow Gen2 can auto-create the Lakehouse table if it does not already exist.',
      3: 'False — Dataflow Gen2 supports Lakehouse, Warehouse, KQL Database, Azure SQL DB, and others as destinations.'
    },
    source: SRC.dataflow,
    tags: ['dataflow-gen2', 'output-destination', 'exam-trap']
  }),

  single({
    id: 'pbf-010', domain: 'prepare', subtopic: 'dataflow-gen2', difficulty: 3,
    prompt: 'What is the PRIMARY difference between Dataflow Gen1 and Dataflow Gen2 in Microsoft Fabric?',
    options: [
      'Gen2 uses DAX instead of M for transformations',
      'Gen2 supports output destinations to Fabric items (Lakehouse, Warehouse, KQL DB) and has a staging Lakehouse for scalable compute; Gen1 only loads into a Power BI dataset',
      'Gen2 requires a Premium capacity; Gen1 is available on shared',
      'Gen2 supports M but Gen1 does not support query folding'
    ],
    correct: 1,
    explanation: 'The headline Gen2 innovations are: (a) configurable output destinations beyond Power BI datasets and (b) an internal staging Lakehouse that allows Spark-scale compute for large volumes. Gen1 could only load into Power BI datasets.',
    whyWrong: {
      0: 'Both use Power Query M — DAX is never the transformation language.',
      2: 'Fabric Dataflow Gen2 runs on Fabric capacity; it is not specifically Premium-gated beyond the capacity requirement.',
      3: 'Both Gen1 and Gen2 support query folding where the connector supports it.'
    },
    source: SRC.dataflow,
    tags: ['dataflow-gen2', 'gen1-vs-gen2', 'output-destination', 'staging']
  }),

  single({
    id: 'pbf-011', domain: 'prepare', subtopic: 'dataflow-gen2', difficulty: 4,
    prompt: 'A Dataflow Gen2 pulls from an Azure SQL DB source and applies several filter and select steps. The query runs slowly despite the source being on-prem with low latency. What should be investigated FIRST?',
    options: [
      'Whether query folding is enabled — if the filter and select steps fold back to the SQL source, the database handles them efficiently',
      'Whether the staging Lakehouse is in the correct region',
      'Whether the dataflow uses DAX-computed columns',
      'Whether the output destination table has a clustered index'
    ],
    correct: 0,
    explanation: 'Query folding is the mechanism where Power Query M steps are translated into native source queries (SQL in this case). If folding is broken — e.g. by a step that cannot fold — the engine pulls ALL rows into the mashup engine and filters locally, causing slowness. Always check query folding first when a connector-backed dataflow is slow.',
    whyWrong: {
      1: 'Region alignment for the staging Lakehouse is relevant to network latency but is not the first-order diagnostic for slow transformation.',
      2: 'Dataflow Gen2 does not use DAX-computed columns; it uses M. DAX is irrelevant here.',
      3: 'The output destination index affects read performance downstream, not the dataflow refresh itself.'
    },
    source: SRC.dataflow,
    tags: ['dataflow-gen2', 'query-folding', 'performance']
  }),

  multi({
    id: 'pbf-012', domain: 'prepare', subtopic: 'dataflow-gen2', difficulty: 4,
    prompt: 'Which of the following are valid output DESTINATIONS for a Dataflow Gen2 query in Microsoft Fabric?',
    options: [
      'Fabric Lakehouse (Delta table)',
      'Fabric Warehouse (managed table)',
      'KQL Database (Eventhouse)',
      'Power BI semantic model (import mode dataset)',
      'OneLake shortcut endpoint'
    ],
    correct: [0, 1, 2, 3],
    explanation: 'Dataflow Gen2 supports Lakehouse, Warehouse, KQL Database, and Azure SQL DB as destinations. Power BI semantic model (dataset) is also a supported destination, maintaining backward compatibility with Gen1 workflows. OneLake shortcuts are not destinations — they are read-side virtual references.',
    whyWrong: {
      4: 'OneLake shortcuts are read-side references, not write destinations. You cannot configure a dataflow to "write to a shortcut".'
    },
    source: SRC.dataflow,
    tags: ['dataflow-gen2', 'output-destination', 'destinations-list']
  }),

  single({
    id: 'pbf-013', domain: 'prepare', subtopic: 'dataflow-gen2', difficulty: 4,
    prompt: 'A Dataflow Gen2 author uses Power Query Online to create a parameter named `SourceSchema` and wants to change its value per environment (Dev/Test/Prod) at refresh time from a pipeline. Which Fabric feature enables this?',
    options: [
      'Deploy the dataflow to each environment and hardcode the parameter per environment',
      'Pass the parameter value via the pipeline\'s Dataflow activity using the "Parameters" configuration',
      'Use a pipeline Lookup activity to fetch the parameter from a config table, then pass it to the dataflow via a Web activity',
      'Parameters in Dataflow Gen2 cannot be overridden at runtime from a pipeline'
    ],
    correct: 1,
    explanation: 'Data Factory pipeline Dataflow Gen2 activity supports parameter binding — you configure key/value pairs in the activity\'s Parameters section that override Power Query parameters at refresh time. This enables single-dataflow, multi-environment patterns without duplicating the dataflow artifact.',
    whyWrong: {
      0: 'Hardcoding per environment defeats the purpose of parameters and creates duplication.',
      2: 'A Lookup + Web chained activity is unnecessary complexity — the Dataflow activity itself has built-in parameter support.',
      3: 'Incorrect — pipeline Dataflow activities DO support runtime parameter overrides for Gen2.'
    },
    source: SRC.dataflow,
    tags: ['dataflow-gen2', 'parameters', 'pipeline-integration']
  }),

  single({
    id: 'pbf-014', domain: 'prepare', subtopic: 'dataflow-gen2', difficulty: 4,
    prompt: 'Which Dataflow Gen2 feature allows large-scale transformations to run on Spark compute rather than the Power Query mashup engine alone?',
    options: [
      'Compute offload to Azure Synapse Analytics',
      'The internal Fabric staging Lakehouse backed by Spark',
      'Direct Lake compute sharing',
      'Fusion query in Fabric Warehouse'
    ],
    correct: 1,
    explanation: 'Dataflow Gen2 uses an internal staging Lakehouse as a Spark compute layer for heavy transforms. The mashup engine stages intermediate results there, enabling distributed Spark execution for data volumes that would overwhelm the in-memory mashup engine.',
    whyWrong: {
      0: 'Azure Synapse Analytics is a separate product; Fabric Dataflow Gen2 does not offload to it.',
      2: 'Direct Lake compute sharing is a Power BI concept for reading semantic model data; it is not a Dataflow compute mechanism.',
      3: 'Fusion query is a Fabric Warehouse optimization; it does not apply to Dataflow Gen2.'
    },
    source: SRC.dataflow,
    tags: ['dataflow-gen2', 'staging-lakehouse', 'spark-compute']
  }),

  multi({
    id: 'pbf-015', domain: 'prepare', subtopic: 'dataflow-gen2', difficulty: 4,
    prompt: 'Which statements about Dataflow Gen2 REFRESH HISTORY and MONITORING are TRUE?',
    options: [
      'Refresh history is visible in the Monitoring Hub for the Fabric workspace',
      'Each refresh shows start time, end time, status, and error details per query',
      'Dataflow Gen2 refresh logs can be exported to Azure Monitor automatically via a built-in connector',
      'A failed refresh always rolls back any partial writes to the output destination',
      'You can view the refresh history directly from the Dataflow Gen2 item in the workspace'
    ],
    correct: [0, 1, 4],
    explanation: 'Monitoring Hub shows Dataflow Gen2 refresh history with per-query granularity (start, end, status, errors). History is also accessible from the item in the workspace. Automatic Azure Monitor export via a built-in connector does not exist out-of-the-box. Failed refreshes do not guarantee rollback of partial writes — destination atomicity depends on the connector.',
    whyWrong: {
      2: 'There is no out-of-the-box built-in Azure Monitor export from Dataflow Gen2 refresh history — you would need to build this manually (e.g., via a pipeline + API).',
      3: 'Refresh failures do not guarantee atomic rollback. If a query partially wrote rows before failing, those rows may remain in the destination.'
    },
    source: SRC.dataflow,
    tags: ['dataflow-gen2', 'monitoring', 'refresh-history']
  }),

  order({
    id: 'pbf-016', domain: 'prepare', subtopic: 'dataflow-gen2', difficulty: 3,
    prompt: 'Order these steps to create a Dataflow Gen2 that loads a CSV from ADLS Gen2 into a Fabric Lakehouse Delta table — first to last.',
    options: [
      'Create a new Dataflow Gen2 item in the Fabric workspace',
      'Add a new data source using the ADLS Gen2 connector and authenticate',
      'Apply Power Query M transformation steps (type casting, column selection, filter)',
      'Configure an output destination pointing to the Lakehouse and target table name',
      'Publish the dataflow and trigger or schedule a refresh'
    ],
    explanation: 'Create the item → connect the source → transform → set destination → publish and refresh. The destination must be configured before publishing; without it the refresh produces no output.',
    whyWrong: {},
    source: SRC.dataflow,
    tags: ['dataflow-gen2', 'ordering', 'setup']
  }),

  single({
    id: 'pbf-017', domain: 'prepare', subtopic: 'dataflow-gen2', difficulty: 5,
    prompt: 'A Dataflow Gen2 retrieves data from an OData feed and applies ten Power Query steps. The last three steps use custom M functions that introduce local sorting. An analyst reports that after migrating from Dataflow Gen1, the same query runs 4× slower in Gen2. What is the MOST likely technical explanation?',
    options: [
      'Gen2 uses a newer, slower version of Power Query',
      'The custom M functions that sort locally broke query folding; Gen1 ran the full query on the source, Gen2 must materialize all rows before sorting',
      'Gen2 always uses Spark regardless of data volume, which adds overhead for small datasets',
      'Gen2 caches results in OneLake, which slows the first run'
    ],
    correct: 1,
    explanation: 'Local-sort M functions are not foldable. In Gen1 the pipeline may have been entirely foldable to the OData source; the non-foldable sort broke the fold boundary, causing Gen2 to pull all rows into the mashup engine. Gen2 then also stages to the Spark layer, adding overhead. Refactoring to push sorting downstream or use native source ORDER BY restores folding.',
    whyWrong: {
      0: 'Gen2 uses the same Power Query engine as Gen1 for M transformation; the version is not slower.',
      2: 'Gen2 uses the mashup engine first and stages to Spark only for large volumes; it does not always use Spark for small queries.',
      3: 'Gen2 caching in OneLake is a staging mechanism, not a persistent result cache that adds latency to first runs.'
    },
    source: SRC.dataflow,
    tags: ['dataflow-gen2', 'query-folding', 'performance', 'migration']
  }),

  // ═══════════════════════════════════════════════════════════════
  // T-SQL WAREHOUSE  pbf-018 … pbf-025
  // ═══════════════════════════════════════════════════════════════

  single({
    id: 'pbf-018', domain: 'prepare', subtopic: 'tsql-warehouse', difficulty: 3,
    prompt: 'A Fabric Warehouse engineer wants to bulk-load a Parquet file from ADLS Gen2 into a Warehouse table using T-SQL. Which statement is correct?',
    options: [
      'Use BULK INSERT with a format file',
      'Use COPY INTO to load directly from ADLS Gen2 or OneLake paths',
      'Use BCP utility from the Azure portal',
      'Fabric Warehouse does not support bulk load from cloud storage — use a pipeline Copy activity instead'
    ],
    correct: 1,
    explanation: 'Fabric Warehouse supports `COPY INTO` for loading Parquet, CSV, and ORC files from ADLS Gen2 or OneLake paths. It is the idiomatic T-SQL bulk-load command in Polaris.',
    whyWrong: {
      0: 'BULK INSERT with a format file is a SQL Server feature not supported in Fabric Warehouse (Polaris).',
      2: 'BCP is a command-line client tool for SQL Server; it is not available against Fabric Warehouse.',
      3: 'COPY INTO IS supported — a pipeline Copy activity also works but is not the only option.'
    },
    source: SRC.tsql,
    tags: ['tsql', 'copy-into', 'bulk-load', 'warehouse']
  }),

  single({
    id: 'pbf-019', domain: 'prepare', subtopic: 'tsql-warehouse', difficulty: 4,
    prompt: 'A team runs a nightly ELT job in Fabric Warehouse that involves five sequential CTAS steps building on each other. The final step is slow. A DBA suggests adding statistics. Which T-SQL command creates statistics in Fabric Warehouse?',
    options: [
      'CREATE STATISTICS stat_name ON table_name (column_name)',
      'UPDATE STATISTICS table_name WITH FULLSCAN',
      'sp_updatestats',
      'Statistics are managed automatically in Polaris; manual creation is not supported'
    ],
    correct: 0,
    explanation: '`CREATE STATISTICS` is supported in Fabric Warehouse and is the correct command to create column-level statistics that the Polaris optimizer uses for cardinality estimates. Single-column and multi-column statistics are both supported.',
    whyWrong: {
      1: '`UPDATE STATISTICS` updates existing statistics but cannot create new ones on columns that have no statistics yet.',
      2: '`sp_updatestats` is a SQL Server system stored procedure; it is not available in Fabric Warehouse.',
      3: 'Polaris does create some automatic statistics, but manual `CREATE STATISTICS` IS supported and often needed for complex join columns.'
    },
    source: SRC.tsql,
    tags: ['tsql', 'statistics', 'polaris', 'performance']
  }),

  single({
    id: 'pbf-020', domain: 'prepare', subtopic: 'tsql-warehouse', difficulty: 4,
    prompt: 'A Fabric Warehouse query runs a three-way JOIN between tables in: (1) the local Warehouse, (2) a Lakehouse SQL endpoint in the same workspace, and (3) another Warehouse in the same workspace. Which T-SQL syntax enables cross-item querying?',
    options: [
      'Linked servers with OPENROWSET',
      'Three-part naming: [workspace_name].[item_name].[schema].[table]',
      'Four-part naming: [workspace_name].[item_name].[schema].[table]',
      'Cross-item queries are not supported; you must copy the data first'
    ],
    correct: 1,
    explanation: 'Fabric Warehouse supports three-part naming (`[item_name].[schema].[table]`) for cross-item queries within the same workspace. You reference the Lakehouse SQL endpoint or another Warehouse by item name without specifying the workspace separately.',
    whyWrong: {
      0: 'Linked servers and OPENROWSET are SQL Server features not available in Fabric Warehouse.',
      2: 'Four-part naming (with server prefix) is a SQL Server pattern for linked servers; Fabric uses three-part naming across items in-workspace.',
      3: 'Cross-item queries ARE supported within a workspace via three-part naming — no data copy required.'
    },
    source: SRC.tsql,
    tags: ['tsql', 'cross-warehouse', 'three-part-name', 'warehouse']
  }),

  multi({
    id: 'pbf-021', domain: 'prepare', subtopic: 'tsql-warehouse', difficulty: 4,
    prompt: 'Which T-SQL features are NOT supported in the Fabric Warehouse (Polaris) engine?',
    options: [
      'Cursors',
      'CLR (Common Language Runtime) functions',
      'CREATE TABLE AS SELECT (CTAS)',
      'MERGE statement',
      'Temporary tables (local #temp)'
    ],
    correct: [0, 1],
    explanation: 'Cursors and CLR functions are not supported in Polaris. CTAS is the canonical ELT pattern. MERGE is supported. Local temp tables (#temp) are supported. This is a frequently tested boundary.',
    whyWrong: {
      2: 'CTAS IS supported — it is the primary ELT building block in Polaris.',
      3: 'MERGE IS supported in Fabric Warehouse as of GA.',
      4: 'Local temp tables (#tablename) ARE supported in Fabric Warehouse for session-scoped staging.'
    },
    source: SRC.tsql,
    tags: ['tsql', 'polaris', 'unsupported-features', 'exam-trap']
  }),

  single({
    id: 'pbf-022', domain: 'prepare', subtopic: 'tsql-warehouse', difficulty: 3,
    prompt: 'What is V-Order in the context of Fabric Warehouse and Lakehouse, and what does it directly improve?',
    options: [
      'V-Order is a compression algorithm that reduces Parquet file sizes on disk',
      'V-Order is a physical write-time optimization that sorts and encodes Delta-Parquet files to maximize VertiPaq engine read speed for Direct Lake semantic models',
      'V-Order is the T-SQL query execution plan produced by the Polaris optimizer',
      'V-Order is a data validation order enforced on CTAS operations'
    ],
    correct: 1,
    explanation: 'V-Order is a Microsoft proprietary write-time optimization applied to Delta-Parquet files. It sorts, encodes, and compresses data in a way optimized for VertiPaq (the in-memory engine behind Direct Lake and Power BI Import). V-Order is enabled by default in Fabric and accelerates Direct Lake column-segment loading.',
    whyWrong: {
      0: 'V-Order is not a general-purpose compression algorithm — it is specifically targeted at VertiPaq read patterns.',
      2: 'The Polaris optimizer produces execution plans, but V-Order is not a query plan concept — it is a file-write format.',
      3: '"Data validation order" is a meaningless phrase in this context; V-Order has nothing to do with validation.'
    },
    source: SRC.tsql,
    tags: ['tsql', 'v-order', 'direct-lake', 'warehouse']
  }),

  single({
    id: 'pbf-023', domain: 'prepare', subtopic: 'tsql-warehouse', difficulty: 4,
    prompt: 'A Fabric Warehouse currently has a SQL endpoint consumed by downstream reports. The data team wants to grant a report author read access to one schema only, preventing access to other schemas. Which SQL construct enables this?',
    options: [
      'Row-level security on every table in the protected schema',
      'GRANT SELECT ON SCHEMA::reporting TO [user] and DENY SELECT ON SCHEMA::staging TO [user]',
      'Object-level security using sensitivity labels',
      'Create a new Warehouse per schema and assign workspace roles separately'
    ],
    correct: 1,
    explanation: 'Fabric Warehouse supports standard T-SQL schema-level GRANT and DENY. Granting SELECT on the target schema and denying it on others achieves schema-scoped read access within a single Warehouse.',
    whyWrong: {
      0: 'Row-level security controls which ROWS a user sees within a table, not which schemas or tables they can access — this addresses a different security dimension.',
      2: 'Sensitivity labels (Microsoft Purview) are classification metadata; they do not enforce query-time access restrictions in the Warehouse SQL engine.',
      3: 'Creating a Warehouse per schema is a drastic overengineer and loses cross-schema three-part-name querying.'
    },
    source: SRC.tsql,
    tags: ['tsql', 'warehouse', 'permissions', 'schema-security']
  }),

  single({
    id: 'pbf-024', domain: 'prepare', subtopic: 'tsql-warehouse', difficulty: 4,
    prompt: 'A Fabric Warehouse query fails with "The SQL endpoint of the Lakehouse does not support this operation." The team was attempting to run an INSERT INTO on a Lakehouse SQL endpoint table from a Warehouse T-SQL session. Why?',
    options: [
      'INSERT INTO requires the COPY INTO syntax when targeting a Lakehouse',
      'The Lakehouse SQL endpoint is READ-ONLY; DML operations such as INSERT, UPDATE, and DELETE are not permitted through it',
      'The INSERT requires a linked-server definition to the Lakehouse',
      'Lakehouse tables must first be promoted to Warehouse tables before DML is allowed'
    ],
    correct: 1,
    explanation: 'The Lakehouse SQL analytics endpoint is read-only — it exposes Delta tables for SELECT queries only. DML (INSERT, UPDATE, DELETE, MERGE) against a Lakehouse table via its SQL endpoint is not supported. To write to a Lakehouse from T-SQL you must use Spark (notebook) or a pipeline.',
    whyWrong: {
      0: 'COPY INTO is a Warehouse-side bulk load from cloud storage; it does not enable writes to a Lakehouse SQL endpoint.',
      2: 'Linked servers are not available in Fabric Warehouse; and even if they were, the Lakehouse SQL endpoint is still read-only.',
      3: '"Promoting" Lakehouse tables to Warehouse tables is not a Fabric concept; they are different item types.'
    },
    source: SRC.tsql,
    tags: ['tsql', 'lakehouse-sql-endpoint', 'read-only', 'dml']
  }),

  order({
    id: 'pbf-025', domain: 'prepare', subtopic: 'tsql-warehouse', difficulty: 4,
    prompt: 'Order the steps to implement a nightly ELT pattern in Fabric Warehouse using T-SQL best practices — from FIRST to LAST.',
    options: [
      'Truncate or drop the staging table from the previous run',
      'Load raw data into the staging table using COPY INTO from OneLake',
      'Apply CTAS to build the transformed production table from staging',
      'Update statistics on the join columns of the new production table',
      'Grant SELECT on the production schema to the report user'
    ],
    explanation: 'Clean staging first → load raw → transform via CTAS → update statistics (optimizer now has fresh stats for the next query) → grant access. Granting access before data is ready is operationally risky.',
    whyWrong: {},
    source: SRC.tsql,
    tags: ['tsql', 'elt', 'ordering', 'warehouse']
  }),

  // ═══════════════════════════════════════════════════════════════
  // MIRRORING  pbf-026 … pbf-033
  // ═══════════════════════════════════════════════════════════════

  single({
    id: 'pbf-026', domain: 'prepare', subtopic: 'mirroring', difficulty: 3,
    prompt: 'Which of the following is a supported CDC source for Fabric Mirrored Databases as of GA?',
    options: [
      'MySQL on-premises',
      'Azure Cosmos DB (NoSQL API)',
      'MongoDB Atlas (cloud)',
      'Oracle Database on-premises'
    ],
    correct: 1,
    explanation: 'Azure Cosmos DB (NoSQL API) is a supported Fabric mirroring source at GA alongside Azure SQL DB and Snowflake. MySQL on-prem, MongoDB Atlas, and Oracle on-prem are NOT currently supported mirroring sources.',
    whyWrong: {
      0: 'MySQL on-premises is not a supported Fabric mirroring source at GA.',
      2: 'MongoDB Atlas is not a supported Fabric mirroring source at GA.',
      3: 'Oracle on-premises is not a supported Fabric mirroring source at GA.'
    },
    source: SRC.mirroring,
    tags: ['mirroring', 'supported-sources', 'cosmos-db']
  }),

  single({
    id: 'pbf-027', domain: 'prepare', subtopic: 'mirroring', difficulty: 3,
    prompt: 'In what format does Fabric Mirroring store replicated data in OneLake?',
    options: [
      'CSV files in a raw zone',
      'Delta-Parquet (Delta Lake format)',
      'Avro files with a schema registry entry',
      'Proprietary columnar format readable only by Fabric'
    ],
    correct: 1,
    explanation: 'Mirrored data lands in OneLake as Delta-Parquet (Delta Lake format). This is why it is immediately queryable via the SQL analytics endpoint, Direct Lake semantic models, and Spark notebooks — the same open format used by Lakehouses.',
    whyWrong: {
      0: 'CSV is a raw ingest format; Mirroring uses the structured Delta format, not CSV.',
      2: 'Avro is used in some streaming pipelines; Mirroring does not use Avro.',
      3: 'Delta-Parquet is an open standard; it is not proprietary to Fabric.'
    },
    source: SRC.mirroring,
    tags: ['mirroring', 'delta-format', 'onelake']
  }),

  single({
    id: 'pbf-028', domain: 'prepare', subtopic: 'mirroring', difficulty: 4,
    prompt: 'A team configured a Mirrored Database for Snowflake. After 48 hours they notice that five tables in the Snowflake source were not selected during mirroring setup and now contain 2 months of history. How can these tables be added to the existing mirror?',
    options: [
      'Mirroring table selection is fixed at setup; you must delete and recreate the mirror to add tables',
      'Open the mirrored database configuration and add the missing tables; Fabric performs an initial snapshot for the new tables and then continues CDC',
      'Create a separate Mirrored Database item targeting only the missing tables and merge via Union in Dataflow Gen2',
      'Use a pipeline Copy activity to backfill the missing tables, then enable CDC via T-SQL'
    ],
    correct: 1,
    explanation: 'Fabric Mirroring allows adding tables to an existing mirror after initial setup. When new tables are added, the mirror runs an initial snapshot for those tables, then integrates them into the ongoing CDC stream. This avoids a full mirror rebuild.',
    whyWrong: {
      0: 'Incorrect — Fabric mirroring supports post-setup table addition without rebuilding the mirror.',
      2: 'Creating a separate mirror and unioning via Dataflow works but is unnecessary complexity given native table-addition support.',
      3: 'Pipeline Copy + manual CDC via T-SQL is not how Fabric Mirroring works; the mirror manages its own CDC integration.'
    },
    source: SRC.mirroring,
    tags: ['mirroring', 'table-selection', 'incremental-tables']
  }),

  multi({
    id: 'pbf-029', domain: 'prepare', subtopic: 'mirroring', difficulty: 4,
    prompt: 'Which security model statements about Fabric Mirrored Databases are CORRECT?',
    options: [
      'Users with workspace Viewer role can query the mirrored SQL endpoint',
      'Source-side credentials are stored as a Fabric connection in the connection hub',
      'The mirrored copy in OneLake inherits source-side row-level security automatically',
      'Workspace-level sensitivity labels on the mirrored database item propagate to the replicated Delta files',
      'Object-level permissions can be granted on the mirrored SQL endpoint independent of source-side permissions'
    ],
    correct: [0, 1, 4],
    explanation: 'Workspace Viewer can query the mirrored SQL endpoint (standard workspace role access). Source credentials are stored in the Fabric connection hub. Fabric-side object permissions on the SQL endpoint are independent of source-side grants. Source RLS does NOT replicate to Fabric — you must re-implement it on the Fabric SQL endpoint. Sensitivity labels on the item do not automatically propagate to the underlying Delta files.',
    whyWrong: {
      2: 'Source-side RLS is NOT automatically replicated. If Snowflake has row-level policies, they do not transfer to the Fabric SQL endpoint — you must re-create them.',
      3: 'Sensitivity labels on the Fabric item are metadata; they do not automatically apply to the individual Delta files stored in OneLake.'
    },
    source: SRC.mirroring,
    tags: ['mirroring', 'security', 'rls', 'permissions']
  }),

  single({
    id: 'pbf-030', domain: 'prepare', subtopic: 'mirroring', difficulty: 4,
    prompt: 'A Mirrored Database for Azure SQL DB is showing increasing replication lag over several hours but has not stopped. The source database is under heavy write load. Which action is MOST appropriate first?',
    options: [
      'Restart the mirrored database from the Fabric portal to force a resync',
      'Check the Azure SQL DB CDC log retention setting; if the source log is filling faster than Fabric can read, increase log retention or reduce source write rate',
      'Disable V-Order on the OneLake Delta files to reduce write overhead',
      'Reduce the number of tables in the mirror to lower CDC overhead'
    ],
    correct: 1,
    explanation: 'Mirroring lag under heavy write load usually means Fabric cannot consume CDC events as fast as the source produces them. The first diagnostic is the source-side CDC log size and retention. If the log retention is too short, events expire before Fabric reads them, which forces a reseed. Increasing retention or reducing source load unblocks replication.',
    whyWrong: {
      0: 'Restarting the mirror triggers a full reseed (snapshot + replay), which is destructive and expensive — investigate the root cause first.',
      2: 'V-Order affects VertiPaq read performance, not CDC ingestion write overhead. Disabling it would harm downstream query speed without helping replication lag.',
      3: 'Reducing tables reduces CDC volume modestly but does not address the underlying log-retention or consumption-rate mismatch.'
    },
    source: SRC.mirroring,
    tags: ['mirroring', 'replication-lag', 'troubleshooting', 'cdc']
  }),

  single({
    id: 'pbf-031', domain: 'prepare', subtopic: 'mirroring', difficulty: 3,
    prompt: 'How does Fabric Mirroring differ from an OneLake Shortcut when both reference an Azure SQL DB?',
    options: [
      'Mirroring is read-write; Shortcut is read-only',
      'Mirroring continuously replicates (Delta copy in OneLake); Shortcut to SQL DB would create a live virtual reference that queries the source on each read — but SQL DB is not a Shortcut target',
      'Shortcut is faster for large result sets; Mirroring is faster for schema changes',
      'They are functionally identical; Mirroring is just a premium-tier Shortcut'
    ],
    correct: 1,
    explanation: 'Mirroring creates a physical Delta replica in OneLake via CDC. Azure SQL DB is NOT a supported Shortcut target — Shortcuts work for cloud storage (ADLS, S3, GCS, OneLake). For SQL DB, Mirroring is the correct zero-copy-like pattern; for cloud file stores, Shortcuts are zero-copy. They solve different problems for different source types.',
    whyWrong: {
      0: 'Both the mirrored copy and a shortcut target are read-only from the Fabric side; the difference is not read-write vs read-only.',
      2: 'Speed is not the relevant differentiator — source type and replication vs live query is what differs.',
      3: 'They are architecturally different: Mirroring is a CDC replica; Shortcuts are virtual file-store references. SQL DB is not a Shortcut target.'
    },
    source: SRC.mirroring,
    tags: ['mirroring', 'shortcut', 'comparison', 'azure-sql-db']
  }),

  order({
    id: 'pbf-032', domain: 'prepare', subtopic: 'mirroring', difficulty: 4,
    prompt: 'Order these events in the Fabric Mirrored Database (Azure SQL DB) startup sequence — from FIRST to LAST.',
    options: [
      'Fabric authenticates to Azure SQL DB using the stored connection credentials',
      'A full initial snapshot of selected tables is copied to OneLake as Delta',
      'CDC change tracking begins reading the source transaction log',
      'The mirrored SQL analytics endpoint becomes available for queries',
      'A Direct Lake semantic model is connected to the mirrored Delta tables'
    ],
    explanation: 'Authentication unlocks the connection → snapshot lands the baseline data → CDC starts tracking ongoing changes → SQL endpoint surfaces once Delta is ready → Direct Lake connects to the queryable Delta. Connecting Direct Lake before the SQL endpoint is available would fail.',
    whyWrong: {},
    source: SRC.mirroring,
    tags: ['mirroring', 'startup-sequence', 'ordering']
  }),

  single({
    id: 'pbf-033', domain: 'prepare', subtopic: 'mirroring', difficulty: 5,
    prompt: 'A data governance team discovers that a Mirrored Database for Cosmos DB contains a collection with a computed field derived from two sensitive PII columns. The field itself is not PII, but the source columns are masked in Cosmos DB via a custom app layer. What is the correct way to prevent the raw PII source columns from being visible in the Fabric mirrored SQL endpoint?',
    options: [
      'The source-side Cosmos DB masking automatically propagates to the Fabric SQL endpoint',
      'Exclude the PII columns from table selection in the Mirroring configuration, then expose only the computed field',
      'Apply a sensitivity label to the mirrored item — this automatically redacts the columns',
      'Enable Always Encrypted on the Fabric Warehouse that reads the mirrored tables'
    ],
    correct: 1,
    explanation: 'Column selection is the only mechanism to prevent specific source columns from landing in the Fabric mirror. Source-side masking (whether Cosmos DB\'s application layer or dynamic data masking) does NOT carry over. Sensitivity labels are classification metadata, not runtime redaction. Always Encrypted applies to SQL Server; Fabric mirrors do not support this.',
    whyWrong: {
      0: 'Source application-layer masking is completely transparent to CDC — the raw unmasked values are what the CDC log captures and replicates.',
      2: 'Sensitivity labels classify data; they do not physically redact columns or prevent queries from returning values.',
      3: 'Always Encrypted is a SQL Server encryption feature not available in Fabric Mirrored Databases.'
    },
    source: SRC.mirroring,
    tags: ['mirroring', 'pii', 'column-selection', 'security', 'governance']
  }),

  // ═══════════════════════════════════════════════════════════════
  // PIPELINES  pbf-034 … pbf-040
  // ═══════════════════════════════════════════════════════════════

  single({
    id: 'pbf-034', domain: 'prepare', subtopic: 'pipelines', difficulty: 3,
    prompt: 'A pipeline contains a ForEach activity iterating over a list of 20 table names, running a Copy activity for each. The pipeline is running items sequentially and taking 40 minutes. The team wants to parallelize. Which ForEach setting achieves this, and what is the maximum batch count?',
    options: [
      'Enable "Sequential" toggle off; maximum batch count is unlimited',
      'Set "Is Sequential" to false and configure "Batch Count" up to a maximum of 50',
      'Replace ForEach with 20 parallel pipeline activities — ForEach cannot be parallelized',
      'Set "Max degree of parallelism" in the Copy activity to 50'
    ],
    correct: 1,
    explanation: 'ForEach is sequential by default. Unchecking "Is Sequential" and setting Batch Count enables parallel execution of inner activities. The maximum Batch Count is 50. This is the most common pipeline-performance trap on the DP-600.',
    whyWrong: {
      0: 'Parallelism IS supported in ForEach — the issue is the batch count cap, which is 50, not unlimited.',
      2: 'ForEach CAN be parallelized — replacing it with 20 separate activities is an unnecessary redesign.',
      3: '"Max degree of parallelism" on the Copy activity controls internal file-copy parallelism within one copy operation, not the number of concurrent ForEach iterations.'
    },
    source: SRC.pipelines,
    tags: ['pipelines', 'foreach', 'parallelism', 'batch-count', 'exam-trap']
  }),

  single({
    id: 'pbf-035', domain: 'prepare', subtopic: 'pipelines', difficulty: 3,
    prompt: 'A pipeline must read the row count from a config table in a Fabric Warehouse before deciding how many partitions to use in a subsequent Copy activity. Which pipeline activity retrieves a single scalar value from a T-SQL query?',
    options: [
      'Copy Data activity with "Read" mode',
      'Lookup activity',
      'Web activity with a SQL endpoint URL',
      'Stored Procedure activity returning an output parameter'
    ],
    correct: 1,
    explanation: 'The Lookup activity runs a query against a supported data store and returns the result as a JSON object, which downstream activities can reference via `@activity(\'LookupName\').output.firstRow.columnName`. It is the standard pattern for reading config values in a pipeline.',
    whyWrong: {
      0: 'Copy Data activity moves bulk data; it does not return a scalar for pipeline control flow.',
      2: 'A Web activity calls HTTP endpoints, not T-SQL queries against a Warehouse.',
      3: 'Stored Procedure activity can return output parameters but is more complex; Lookup is the idiomatic choice for a simple scalar read.'
    },
    source: SRC.pipelines,
    tags: ['pipelines', 'lookup-activity', 'control-flow']
  }),

  multi({
    id: 'pbf-036', domain: 'prepare', subtopic: 'pipelines', difficulty: 4,
    prompt: 'Which pipeline activity types are available in Fabric Data Factory pipelines?',
    options: [
      'Copy Data',
      'Notebook (run a Fabric Spark notebook)',
      'Dataflow Gen2 (trigger a Dataflow Gen2 refresh)',
      'Power BI Report Refresh',
      'Stored Procedure (call a Warehouse stored procedure)'
    ],
    correct: [0, 1, 2, 4],
    explanation: 'Copy Data, Notebook, Dataflow Gen2, and Stored Procedure are all first-class Fabric pipeline activity types. Power BI Report refresh is not a native pipeline activity — semantic model refresh is triggered via the semantic model\'s scheduled refresh or via REST API called from a Web activity.',
    whyWrong: {
      3: 'There is no native "Power BI Report Refresh" pipeline activity in Fabric. To trigger a semantic model refresh you would use a Web activity calling the Power BI REST API, not a dedicated activity type.'
    },
    source: SRC.pipelines,
    tags: ['pipelines', 'activity-types', 'orchestration']
  }),

  single({
    id: 'pbf-037', domain: 'prepare', subtopic: 'pipelines', difficulty: 4,
    prompt: 'A pipeline runs a Notebook activity. The notebook raises an unhandled Python exception partway through. What is the default behavior of the pipeline?',
    options: [
      'The pipeline pauses and waits for a manual retry decision',
      'The Notebook activity is marked as Failed; subsequent activities on the Success path are skipped',
      'The pipeline auto-retries the notebook three times before marking it failed',
      'The pipeline continues to the next activity regardless of notebook outcome'
    ],
    correct: 1,
    explanation: 'When a Notebook activity fails, the activity status becomes Failed. Activities connected on the success dependency path are skipped. Activities on the failure path (if configured) execute. The pipeline does NOT auto-retry by default — retry count is configurable and defaults to 0.',
    whyWrong: {
      0: 'Pipelines do not pause for manual decisions — they proceed on dependency paths.',
      2: 'Auto-retry defaults to 0 (no retries). Retry count is a configurable activity property; without explicit configuration no retries occur.',
      3: 'The pipeline does NOT ignore activity failures and continue indiscriminately — flow follows the configured dependency (success/failure/completion) edges.'
    },
    source: SRC.pipelines,
    tags: ['pipelines', 'notebook-activity', 'failure-handling', 'retry']
  }),

  single({
    id: 'pbf-038', domain: 'prepare', subtopic: 'pipelines', difficulty: 3,
    prompt: 'A team wants to receive an email whenever their nightly Fabric pipeline fails. Which is the SIMPLEST native configuration to achieve this?',
    options: [
      'Add a Web activity on the failure path that calls the Office 365 Mail connector',
      'Configure pipeline failure alerts in the Monitoring Hub alert settings for the workspace',
      'Create a Reflex rule that detects pipeline failure events and sends an email',
      'Add a Stored Procedure activity on the failure path that writes a log row, then set up Azure Logic Apps to poll the log table'
    ],
    correct: 1,
    explanation: 'Fabric Monitoring Hub supports built-in alert rules for pipeline runs. You can configure email notifications for failure events directly in the workspace Monitoring Hub without adding extra activities to the pipeline.',
    whyWrong: {
      0: 'A Web activity calling Office 365 Mail works but requires modifying the pipeline and managing credentials — more complex than the native alert.',
      2: 'Reflex (Activator) can process events but setting up a Reflex rule for pipeline failures is more complex than a Monitoring Hub alert.',
      3: 'Stored Procedure + Logic Apps polling is a multi-system solution far more complex than necessary.'
    },
    source: SRC.pipelines,
    tags: ['pipelines', 'alerts', 'monitoring-hub', 'failure-notification']
  }),

  order({
    id: 'pbf-039', domain: 'prepare', subtopic: 'pipelines', difficulty: 3,
    prompt: 'Order these steps to build a parameterized Fabric pipeline that incrementally copies new rows from an Azure SQL DB table to a Lakehouse — first to last.',
    options: [
      'Add a Lookup activity to read the last high-watermark value from a control table in Fabric Warehouse',
      'Add a Copy Data activity with a source filter WHERE ModifiedDate > @{activity(\'Lookup1\').output.firstRow.lastWatermark}',
      'After copy succeeds, add a Stored Procedure activity to update the control table with the new high-watermark',
      'Configure a schedule trigger to run the pipeline nightly',
      'Test the pipeline with debug mode to verify parameter resolution and row counts'
    ],
    explanation: 'Read watermark first (Lookup) → copy filtered rows → update watermark → schedule → test. Scheduling before testing risks unverified runs hitting production; updating the watermark before copy would skip rows if the copy fails.',
    whyWrong: {},
    source: SRC.pipelines,
    tags: ['pipelines', 'incremental-copy', 'watermark', 'ordering']
  }),

  single({
    id: 'pbf-040', domain: 'prepare', subtopic: 'pipelines', difficulty: 4,
    prompt: 'A Fabric pipeline Copy activity is copying from a REST API source. After 10 minutes it fails with "ActivityFailed: Max retry count reached." The retry count is set to 3 and retry interval to 30 seconds. A developer suggests setting retry interval to 1 second to speed up retry attempts. What is the concern with this change?',
    options: [
      'There is no concern — shorter retry intervals always improve throughput',
      'The REST API source may implement rate limiting; rapid retries within seconds could hit the rate limit and cause longer eventual failure, or the API may block the caller',
      'Fabric pipelines do not support retry intervals shorter than 30 seconds',
      'Shorter retry intervals increase Fabric capacity unit consumption disproportionately'
    ],
    correct: 1,
    explanation: 'REST APIs typically implement rate limiting (e.g., 429 Too Many Requests). If the transient failure is caused by rate limiting, retrying immediately at 1-second intervals will hit the limit again and again, potentially triggering an extended backoff or ban. Exponential backoff or honoring the Retry-After header is best practice.',
    whyWrong: {
      0: 'Shorter intervals are not always better — against rate-limited APIs they can worsen the failure.',
      2: 'Fabric does allow shorter retry intervals than 30 seconds; there is no hard floor at 30 seconds.',
      3: 'Retry interval length has negligible impact on CU consumption compared to the actual copy compute work.'
    },
    source: SRC.pipelines,
    tags: ['pipelines', 'retry', 'rate-limiting', 'rest-api']
  }),

  // ═══════════════════════════════════════════════════════════════
  // ONELAKE SHORTCUTS  pbf-041 … pbf-044
  // ═══════════════════════════════════════════════════════════════

  single({
    id: 'pbf-041', domain: 'prepare', subtopic: 'onelake-shortcuts', difficulty: 4,
    prompt: 'A team creates a OneLake shortcut inside a Lakehouse pointing to an Amazon S3 bucket. A Fabric workspace user (Member role) queries the shortcut. The S3 bucket uses IAM-based access control. Which identity is evaluated against S3 IAM policies when the query runs?',
    options: [
      'The Fabric workspace Managed Identity',
      'The credentials stored in the Fabric connection used to create the shortcut',
      'The querying user\'s Entra ID (AAD) token passed to AWS via federation',
      'The query runs as the Fabric platform service principal with no user context'
    ],
    correct: 1,
    explanation: 'When a shortcut is created with an S3 connection (access key/secret or IAM role ARN), those stored credentials in the Fabric connection hub are what authenticate to S3 on every read — not the end user\'s identity. The user\'s Fabric workspace role controls whether they can USE the shortcut; the shortcut\'s stored connection credentials control what S3 sees.',
    whyWrong: {
      0: 'Fabric workspace Managed Identity can be used for some Azure services but the S3 shortcut uses the connection credentials explicitly stored during shortcut creation.',
      2: 'AWS does not accept Entra ID tokens directly for S3 IAM unless cross-cloud federation is explicitly configured — the shortcut uses the stored AWS credentials, not AAD pass-through.',
      3: 'The Fabric platform service principal does not hold S3 credentials; the stored connection credentials do.'
    },
    source: SRC.onelakeShortcuts,
    tags: ['onelake-shortcuts', 's3', 'security', 'credentials']
  }),

  multi({
    id: 'pbf-042', domain: 'prepare', subtopic: 'onelake-shortcuts', difficulty: 4,
    prompt: 'Which object types in a Fabric Lakehouse can serve as the TARGET of a OneLake shortcut (i.e., a shortcut placed inside this Lakehouse pointing at an external location)?',
    options: [
      'Files (unstructured files in the Files section of the Lakehouse)',
      'Tables (Delta tables registered in the Tables section)',
      'Semantic model tables (direct shortcut to a Power BI dataset table)',
      'Warehouse tables (Delta backing files via OneLake path)',
      'Eventhouse KQL database tables'
    ],
    correct: [0, 1, 3],
    explanation: 'Shortcuts can target Files (arbitrary files) or Tables (Delta tables) within a Lakehouse. Warehouse Delta backing files are also accessible via OneLake paths and can be shortcutted. Power BI semantic model tables and Eventhouse KQL tables are not valid shortcut targets — they are query surfaces, not raw storage objects.',
    whyWrong: {
      2: 'Power BI semantic model tables are in-memory VertiPaq structures, not physical Delta files — they cannot be targeted by a OneLake shortcut.',
      4: 'Eventhouse KQL database internal storage is not exposed as a OneLake-addressable Delta path that can be shortcutted.'
    },
    source: SRC.onelakeShortcuts,
    tags: ['onelake-shortcuts', 'target-types', 'lakehouse', 'warehouse']
  }),

  single({
    id: 'pbf-043', domain: 'prepare', subtopic: 'onelake-shortcuts', difficulty: 4,
    prompt: 'A shortcut inside Lakehouse A points to a Delta table in Lakehouse B. A data engineer running as workspace Contributor on workspace A (where Lakehouse A lives) attempts to read the shortcut. Workspace B grants no role to this user. What happens?',
    options: [
      'Read succeeds — Contributor on workspace A inherits Viewer rights on all shortcuts',
      'Read fails — shortcuts always require explicit Fabric workspace access on both the source and target workspaces',
      'Read succeeds if the shortcut was created with a service principal that has access to Lakehouse B',
      'Read fails if Lakehouse B\'s sensitivity label is higher than Lakehouse A\'s'
    ],
    correct: 2,
    explanation: 'For internal OneLake-to-OneLake shortcuts, reads go through the identity stored in the connection at shortcut creation time (or the calling user\'s identity depending on configuration). If the shortcut was set up with a service principal that has access to Lakehouse B, the read succeeds regardless of the querying user\'s role on workspace B. If the shortcut passes through the user\'s identity (delegated access mode), then the user needs access on workspace B.',
    whyWrong: {
      0: 'Contributor on workspace A does not automatically inherit access to data in workspace B — OneLake security is evaluated at the source workspace.',
      1: 'This is too absolute — access to the target workspace IS required for the user\'s identity, but a service-principal-backed connection can proxy the access.',
      3: 'Sensitivity labels classify data; they do not enforce cross-workspace access blocks at the read level.'
    },
    source: SRC.onelakeShortcuts,
    tags: ['onelake-shortcuts', 'cross-workspace', 'security', 'service-principal']
  }),

  single({
    id: 'pbf-044', domain: 'prepare', subtopic: 'onelake-shortcuts', difficulty: 3,
    prompt: 'A OneLake shortcut is created inside a Lakehouse pointing to an ADLS Gen2 path that holds non-Delta CSV files. A data engineer tries to query the path via the Lakehouse SQL analytics endpoint. What is the result?',
    options: [
      'The SQL endpoint automatically infers the schema and serves the CSVs as a queryable table',
      'The SQL endpoint cannot surface raw CSV files as tables — only Delta-formatted paths appear as tables in the SQL endpoint',
      'The CSV files are converted to Delta on first read and cached permanently',
      'The CSV files are accessible via SQL endpoint only if they are placed in the Tables section of the Lakehouse'
    ],
    correct: 1,
    explanation: 'The Lakehouse SQL analytics endpoint only surfaces Delta tables. CSV files (or any non-Delta files) stored in the Files section — whether via shortcut or directly — do not appear as SQL-queryable tables. To query them via SQL, you must first convert them to Delta (e.g., via Spark) and register them in the Tables section.',
    whyWrong: {
      0: 'The SQL endpoint does NOT auto-infer CSV schemas — Delta format is required for the SQL endpoint.',
      2: 'No automatic CSV-to-Delta conversion occurs on read; the files remain as CSV in ADLS.',
      3: 'Even placing CSV files in the Tables section would not make them SQL-queryable — the section requires Delta format; placing non-Delta files there does not register them as tables.'
    },
    source: SRC.onelakeShortcuts,
    tags: ['onelake-shortcuts', 'csv', 'sql-endpoint', 'delta-format', 'exam-trap']
  }),

];
