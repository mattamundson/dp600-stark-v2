import type { Question, SourceAnchor } from '../../lib/schema';
import { single, multi, order, SRC } from './_helpers';

// 25 deep T-SQL Warehouse questions (wh-001..wh-025) for the prepare domain.
// Closes the Prepare-data gap (47.5% blueprint, currently underweight).
// Coverage: Warehouse vs Lakehouse SQL endpoint, DDL surface (CREATE TABLE,
// CREATE VIEW, CREATE PROCEDURE, CREATE FUNCTION — supported vs not), DML
// (INSERT/UPDATE/DELETE/MERGE), RLS via SECURITY POLICY + SCHEMABINDING,
// column-level grants, workspace roles vs object grants, cross-warehouse
// 3-part / 4-part naming, OPTION (LABEL=...), distribution (auto-hash), COPY
// INTO (formats, ERRORFILE, paths), statistics (auto, manual UPDATE).
// Includes 4 SQL code-reading questions and 2 ordering questions.

const SRC_WH: SourceAnchor = {
  category: 'fabric-warehouse-deep',
  note: 'Fabric Warehouse T-SQL deep dive: DDL/DML, RLS, security, perf, COPY INTO, stats'
};

export const tsqlWarehouseDeep: Question[] = [
  // ── 001: Warehouse vs Lakehouse SQL endpoint ─────────────────
  multi({
    id: 'wh-001', domain: 'prepare', subtopic: 'tsql-warehouse', difficulty: 3,
    prompt: 'Which statements correctly contrast a Fabric Warehouse with a Lakehouse SQL analytics endpoint?',
    options: [
      'The Warehouse SQL endpoint accepts T-SQL DDL and DML; the Lakehouse SQL analytics endpoint is read-only',
      'Both surfaces ultimately query Delta-Parquet files in OneLake',
      'The Lakehouse SQL endpoint supports CREATE TABLE and INSERT; the Warehouse does not',
      'The Warehouse supports multi-table ACID transactions across its tables'
    ],
    correct: [0, 1, 3],
    explanation: 'Warehouse exposes a full read/write T-SQL surface with multi-statement ACID; the Lakehouse SQL analytics endpoint is read-only (writes happen via Spark/Delta). Both store data as Delta in OneLake.',
    whyWrong: {
      2: 'Reversed — the Warehouse supports CREATE TABLE/INSERT; the Lakehouse SQL endpoint does not.'
    },
    source: SRC_WH,
    tags: ['warehouse', 'lakehouse', 'sql-endpoint']
  }),

  // ── 002: T-SQL DDL surface ───────────────────────────────────
  multi({
    id: 'wh-002', domain: 'prepare', subtopic: 'warehouse-ddl', difficulty: 4,
    prompt: 'Which T-SQL features are NOT currently supported in Fabric Warehouse?',
    options: [
      'IDENTITY columns with auto-increment',
      'Triggers (DML or DDL)',
      'CREATE PROCEDURE',
      'CREATE VIEW',
      'CLR (assembly) functions',
      'MERGE statement'
    ],
    correct: [0, 1, 4],
    explanation: 'IDENTITY auto-increment, triggers, and CLR are unsupported in the Polaris-based Warehouse engine. CREATE PROCEDURE, CREATE VIEW, and MERGE (added 2024) are supported.',
    whyWrong: {
      2: 'CREATE PROCEDURE is supported.',
      3: 'CREATE VIEW is supported.',
      5: 'MERGE was added to Fabric Warehouse in 2024 and is supported.'
    },
    source: SRC_WH,
    tags: ['ddl', 'unsupported', 'identity', 'triggers']
  }),

  // ── 003: CREATE TABLE AS (CTAS) ──────────────────────────────
  single({
    id: 'wh-003', domain: 'prepare', subtopic: 'warehouse-ddl', difficulty: 3,
    prompt: 'Which T-SQL syntax is the supported way to materialize a query result as a new permanent table in Fabric Warehouse?',
    options: [
      'CREATE TABLE dbo.Sales_Snap AS SELECT * FROM dbo.Sales WHERE Year = 2025;',
      'SELECT * INTO dbo.Sales_Snap FROM dbo.Sales WHERE Year = 2025;',
      'CREATE TABLE dbo.Sales_Snap WITH (DISTRIBUTION = HASH(Id)) AS SELECT * FROM dbo.Sales;',
      'CTAS dbo.Sales_Snap AS SELECT * FROM dbo.Sales;'
    ],
    correct: 0,
    explanation: 'Fabric Warehouse uses standard `CREATE TABLE AS SELECT` (CTAS) syntax. Synapse Dedicated\'s `CREATE TABLE ... WITH (DISTRIBUTION = HASH(...)) AS SELECT` syntax is NOT used here — Fabric Warehouse auto-distributes.',
    whyWrong: {
      1: '`SELECT INTO` is not supported in Fabric Warehouse for permanent tables.',
      2: 'Synapse Dedicated SQL Pool syntax with explicit DISTRIBUTION is not used in Fabric Warehouse — distribution is automatic.',
      3: '`CTAS` is not a T-SQL keyword; the actual statement is `CREATE TABLE ... AS SELECT`.'
    },
    source: SRC_WH,
    tags: ['ctas', 'create-table', 'syntax']
  }),

  // ── 004: MERGE statement ─────────────────────────────────────
  single({
    id: 'wh-004', domain: 'prepare', subtopic: 'warehouse-dml', difficulty: 4,
    prompt: 'A Fabric Warehouse target table `dbo.DimCustomer` must be upserted from a staging table `stg.Customer`. Which is the correct approach?',
    options: [
      'Use a cursor to loop and conditionally INSERT or UPDATE',
      'Use MERGE INTO dbo.DimCustomer AS T USING stg.Customer AS S ON T.Id=S.Id WHEN MATCHED THEN UPDATE ... WHEN NOT MATCHED THEN INSERT ...',
      'Use IDENTITY-based INSERT and rely on auto-merge',
      'Use a temporary table with TRUNCATE + INSERT only'
    ],
    correct: 1,
    explanation: 'MERGE was added to Fabric Warehouse in 2024 and is the canonical upsert pattern. It handles MATCHED (update), NOT MATCHED (insert), and NOT MATCHED BY SOURCE (delete) in a single statement.',
    whyWrong: {
      0: 'Cursors are not supported in Fabric Warehouse.',
      2: 'IDENTITY auto-increment is not supported, and there is no "auto-merge" feature.',
      3: 'TRUNCATE + INSERT is destructive and loses incremental state; MERGE is the proper upsert.'
    },
    source: SRC_WH,
    tags: ['merge', 'upsert', 'dml']
  }),

  // ── 005: SQL code-reading — MERGE behavior ───────────────────
  single({
    id: 'wh-005', domain: 'prepare', subtopic: 'warehouse-dml', difficulty: 4,
    prompt: 'Given the following Fabric Warehouse statement, what happens to a row in `dbo.Target` whose `Id` is NOT present in `stg.Source`?\n\n```sql\nMERGE INTO dbo.Target AS T\nUSING stg.Source AS S\n  ON T.Id = S.Id\nWHEN MATCHED THEN\n  UPDATE SET T.Amount = S.Amount\nWHEN NOT MATCHED BY TARGET THEN\n  INSERT (Id, Amount) VALUES (S.Id, S.Amount)\nWHEN NOT MATCHED BY SOURCE THEN\n  DELETE;\n```',
    options: [
      'It is left unchanged',
      'It is deleted',
      'It is updated to NULL',
      'The whole MERGE fails because NOT MATCHED BY SOURCE is invalid'
    ],
    correct: 1,
    explanation: '`WHEN NOT MATCHED BY SOURCE THEN DELETE` removes any target row whose key does not appear in the source. With all three branches present, MERGE acts as a full sync.',
    whyWrong: {
      0: 'The DELETE clause is explicit — rows missing from source are removed.',
      2: 'The clause says DELETE, not UPDATE.',
      3: 'NOT MATCHED BY SOURCE is supported in Fabric Warehouse MERGE.'
    },
    source: SRC_WH,
    tags: ['merge', 'code-reading', 'sync']
  }),

  // ── 006: Workspace roles ─────────────────────────────────────
  single({
    id: 'wh-006', domain: 'prepare', subtopic: 'warehouse-security', difficulty: 3,
    prompt: 'Which Fabric workspace role grants the ability to write data into a Warehouse but NOT to manage workspace settings or assign other users?',
    options: ['Admin', 'Member', 'Contributor', 'Viewer'],
    correct: 2,
    explanation: 'Contributor can create and edit items including writing to Warehouses. Member adds the ability to share and manage permissions; Admin manages workspace settings and roles; Viewer is read-only.',
    whyWrong: {
      0: 'Admin has full control including settings and role assignment — broader than required.',
      1: 'Member can also share and manage workspace access — broader than required.',
      3: 'Viewer is read-only and cannot write data.'
    },
    source: SRC.workspace,
    tags: ['workspace-roles', 'contributor', 'rbac']
  }),

  // ── 007: Object-level grants ─────────────────────────────────
  single({
    id: 'wh-007', domain: 'prepare', subtopic: 'warehouse-security', difficulty: 4,
    prompt: 'A Warehouse user is added as a workspace Viewer. The admin then runs `GRANT SELECT, INSERT ON dbo.Sales TO [user@contoso.com];` in the Warehouse. What is the effective permission on `dbo.Sales`?',
    options: [
      'SELECT only — workspace Viewer overrides any object grant',
      'SELECT and INSERT — object-level grants are additive on top of workspace role',
      'No access — object grants on a Viewer are blocked',
      'INSERT only — explicit GRANT replaces the implicit role'
    ],
    correct: 1,
    explanation: 'Object-level GRANTs in the Warehouse are additive over the workspace role. A Viewer (read across the workspace) PLUS an explicit GRANT INSERT yields SELECT + INSERT on that table.',
    whyWrong: {
      0: 'Workspace role does not cap the object-level grants — they compose additively.',
      2: 'Object grants are allowed; they do not require a higher workspace role to take effect.',
      3: 'GRANT does not replace the role; both apply.'
    },
    source: SRC_WH,
    tags: ['grants', 'workspace-role', 'rbac', 'composition']
  }),

  // ── 008: Column-level security ───────────────────────────────
  single({
    id: 'wh-008', domain: 'prepare', subtopic: 'warehouse-security', difficulty: 4,
    prompt: 'A Warehouse table `dbo.Employee` has columns `Id, Name, Email, Salary, SSN`. Analysts must see all columns EXCEPT `Salary` and `SSN`. Which is the most direct T-SQL approach?',
    options: [
      'CREATE VIEW dbo.EmployeePublic AS SELECT Id, Name, Email FROM dbo.Employee; GRANT SELECT ON dbo.EmployeePublic TO analysts;',
      'GRANT SELECT ON dbo.Employee (Id, Name, Email) TO analysts;',
      'CREATE SECURITY POLICY blocking Salary and SSN columns',
      'Both A and B are valid approaches'
    ],
    correct: 3,
    explanation: 'Fabric Warehouse supports BOTH column-level grants (`GRANT SELECT ON tbl (col1, col2) TO role`) and view-based projection. SECURITY POLICY is for row-level security, not columns.',
    whyWrong: {
      0: 'Valid but not the only approach — column-level grants also work.',
      1: 'Valid but not the only approach — views also work.',
      2: 'SECURITY POLICY targets rows (RLS), not columns.'
    },
    source: SRC_WH,
    tags: ['column-security', 'grants', 'views']
  }),

  // ── 009: RLS via SECURITY POLICY ─────────────────────────────
  single({
    id: 'wh-009', domain: 'prepare', subtopic: 'warehouse-rls', difficulty: 5,
    prompt: 'Which T-SQL element is REQUIRED on the predicate function used by `CREATE SECURITY POLICY` for row-level security in Fabric Warehouse?',
    options: [
      'WITH ENCRYPTION',
      'WITH SCHEMABINDING',
      'WITH RECOMPILE',
      'WITH EXECUTE AS CALLER'
    ],
    correct: 1,
    explanation: 'The inline table-valued function used as the RLS predicate must be created `WITH SCHEMABINDING` so the engine can guarantee the underlying schema cannot drift out from under the policy.',
    whyWrong: {
      0: 'WITH ENCRYPTION obfuscates source; not required for RLS.',
      2: 'WITH RECOMPILE controls plan caching; not required and would hurt perf.',
      3: 'EXECUTE AS is set on the policy/function but not the SCHEMABINDING requirement asked here.'
    },
    source: SRC.rls,
    tags: ['rls', 'security-policy', 'schemabinding']
  }),

  // ── 010: SQL code-reading — RLS predicate ────────────────────
  single({
    id: 'wh-010', domain: 'prepare', subtopic: 'warehouse-rls', difficulty: 5,
    prompt: 'Given the following Fabric Warehouse RLS setup, which user sees rows of `dbo.Sales` where `Region = \'East\'`?\n\n```sql\nCREATE FUNCTION sec.fn_RegionPred(@Region sysname)\nRETURNS TABLE WITH SCHEMABINDING AS\nRETURN SELECT 1 AS ok\n  WHERE @Region = USER_NAME() OR IS_ROLEMEMBER(\'GlobalAdmins\') = 1;\n\nCREATE SECURITY POLICY sec.SalesFilter\n  ADD FILTER PREDICATE sec.fn_RegionPred(Region) ON dbo.Sales\n  WITH (STATE = ON);\n```',
    options: [
      'A user named `East` (USER_NAME() = "East")',
      'Any user in the Viewer workspace role',
      'Only members of the `GlobalAdmins` role',
      'Nobody — the policy is malformed'
    ],
    correct: 0,
    explanation: 'The predicate returns rows where `Region = USER_NAME()` OR the caller is in `GlobalAdmins`. A user whose database name is `East` matches the first clause and sees `Region=\'East\'` rows.',
    whyWrong: {
      1: 'Workspace role alone does not satisfy the predicate; the user name must match the region or be in GlobalAdmins.',
      2: 'GlobalAdmins see ALL rows, not specifically East.',
      3: 'The policy is well-formed — SCHEMABINDING is present, predicate returns a TVF.'
    },
    source: SRC.rls,
    tags: ['rls', 'code-reading', 'user-name']
  }),

  // ── 011: RLS composition with workspace roles ────────────────
  multi({
    id: 'wh-011', domain: 'prepare', subtopic: 'warehouse-rls', difficulty: 4,
    prompt: 'Which statements about RLS in Fabric Warehouse are TRUE?',
    options: [
      'A workspace Admin bypasses RLS predicates by default',
      'RLS predicates apply uniformly to anyone querying the table, regardless of workspace role, unless the predicate explicitly carves out an exception',
      'You can grant SELECT on a table with RLS to a Viewer and they will only see rows that pass the predicate',
      'RLS is enforced at the SQL endpoint but bypassed when the same table is read via OneLake from Spark'
    ],
    correct: [1, 2, 3],
    explanation: 'RLS applies to ALL T-SQL callers including Admins unless the predicate explicitly exempts them (e.g., IS_ROLEMEMBER check). A Viewer with SELECT sees only filtered rows. RLS is a SQL-endpoint concept — Spark reading the underlying Delta in OneLake bypasses it (a known governance trap).',
    whyWrong: {
      0: 'False — Admin does NOT bypass RLS by default; the predicate must explicitly exempt them.'
    },
    source: SRC.rls,
    tags: ['rls', 'composition', 'onelake-bypass']
  }),

  // ── 012: Cross-warehouse 3-part naming ───────────────────────
  single({
    id: 'wh-012', domain: 'prepare', subtopic: 'tsql-warehouse', difficulty: 3,
    prompt: 'Within a single Fabric workspace, how do you JOIN a Warehouse table to a Lakehouse table from T-SQL?',
    options: [
      'Use 3-part naming like `LakehouseName.dbo.TableName` from the Warehouse SQL endpoint — both items are queryable in the same query',
      'You cannot — Warehouse and Lakehouse SQL surfaces are isolated',
      'Use 4-part naming with a linked server',
      'Export the Lakehouse table to CSV and import it'
    ],
    correct: 0,
    explanation: 'Within a workspace, the Warehouse SQL endpoint can query a Lakehouse SQL endpoint via 3-part naming `<lakehouse>.<schema>.<table>` and join across items. This is a key Fabric integration feature.',
    whyWrong: {
      1: 'They are NOT isolated — cross-item queries work via 3-part naming.',
      2: 'Linked servers are not the Fabric pattern.',
      3: 'Export/import is unnecessary and loses the live link.'
    },
    source: SRC_WH,
    tags: ['cross-warehouse', '3-part-naming', 'lakehouse-integration']
  }),

  // ── 013: 4-part cross-workspace ──────────────────────────────
  single({
    id: 'wh-013', domain: 'prepare', subtopic: 'tsql-warehouse', difficulty: 4,
    prompt: 'A query in Workspace A needs to read a table from a Warehouse in Workspace B. Which is the supported pattern?',
    options: [
      'Reference the foreign Warehouse with 4-part naming directly across workspaces',
      'Create a OneLake shortcut (or use the cross-workspace query feature) to expose the Workspace B item to Workspace A, then query via 3-part naming',
      'Manually export and re-import via Pipeline Copy each session',
      'It is impossible — cross-workspace SQL queries are blocked'
    ],
    correct: 1,
    explanation: 'Cross-workspace querying in Fabric is enabled via shortcuts/linked items in the consuming workspace. Once linked, the foreign item is referenced by ordinary 3-part naming. Raw 4-part naming across workspaces is not the Fabric pattern.',
    whyWrong: {
      0: 'Fabric does not use SQL Server-style 4-part cross-workspace names directly; the workspace must surface the foreign item locally.',
      2: 'Manual export is not required and loses freshness.',
      3: 'Cross-workspace queries are supported via the linked-item / shortcut pattern.'
    },
    source: SRC_WH,
    tags: ['cross-workspace', '4-part', 'shortcuts']
  }),

  // ── 014: OPTION (LABEL = ...) ────────────────────────────────
  single({
    id: 'wh-014', domain: 'prepare', subtopic: 'warehouse-perf', difficulty: 4,
    prompt: 'A Warehouse query is `SELECT ... FROM dbo.Sales OPTION (LABEL = \'NightlyAggregation\');`. What is the purpose of the LABEL hint?',
    options: [
      'It forces a parallel execution plan',
      'It tags the query so it is identifiable in monitoring views and DMVs (e.g., to find slow runs of a known workload)',
      'It assigns a workload classifier priority',
      'It enables result caching for that label'
    ],
    correct: 1,
    explanation: '`OPTION (LABEL = \'...\')` tags the query in monitoring views like `sys.dm_exec_requests` and the Fabric monitoring hub so you can find specific workloads later. Standard pattern for ETL pipelines.',
    whyWrong: {
      0: 'LABEL has no effect on parallelism.',
      2: 'Workload classification is a different mechanism.',
      3: 'LABEL does not control caching.'
    },
    source: SRC_WH,
    tags: ['option-label', 'monitoring', 'observability']
  }),

  // ── 015: Auto-distribution ───────────────────────────────────
  multi({
    id: 'wh-015', domain: 'prepare', subtopic: 'warehouse-perf', difficulty: 4,
    prompt: 'Which statements about data distribution in Fabric Warehouse are TRUE?',
    options: [
      'Fabric Warehouse auto-distributes data across compute — you do NOT manually specify HASH or ROUND_ROBIN',
      'You must declare `WITH (DISTRIBUTION = HASH(col))` like Synapse Dedicated SQL Pool',
      'Replicated tables are explicitly defined with `DISTRIBUTION = REPLICATE`',
      'Query-time data shuffling is handled by the engine without manual distribution hints'
    ],
    correct: [0, 3],
    explanation: 'Fabric Warehouse intentionally hides distribution from the user — the engine auto-distributes and shuffles as needed. Synapse Dedicated SQL Pool used explicit HASH/ROUND_ROBIN/REPLICATE; Fabric Warehouse does not.',
    whyWrong: {
      1: 'False — Synapse-style distribution syntax is NOT used in Fabric Warehouse.',
      2: 'False — REPLICATE is a Synapse Dedicated concept, not Fabric Warehouse.'
    },
    source: SRC_WH,
    tags: ['distribution', 'auto-distribute', 'synapse-difference']
  }),

  // ── 016: COPY INTO statement ─────────────────────────────────
  single({
    id: 'wh-016', domain: 'prepare', subtopic: 'tsql-warehouse', difficulty: 4,
    prompt: 'Which T-SQL statement is the recommended high-throughput bulk-load mechanism into a Fabric Warehouse table from Parquet files in OneLake or ADLS Gen2?',
    options: [
      'BULK INSERT',
      'COPY INTO',
      'OPENROWSET',
      'INSERT ... SELECT * FROM OPENJSON'
    ],
    correct: 1,
    explanation: 'COPY INTO is the canonical Fabric Warehouse bulk-load statement. It supports Parquet and CSV, multiple files via wildcards, ERRORFILE for rejected rows, and parallel ingestion at scale.',
    whyWrong: {
      0: 'BULK INSERT is the legacy SQL Server statement; COPY INTO is preferred and more capable in Fabric Warehouse.',
      2: 'OPENROWSET is for ad-hoc reads (Synapse Serverless pattern), not the Fabric Warehouse bulk-load entry point.',
      3: 'OPENJSON parses JSON values — not a bulk-loader.'
    },
    source: SRC_WH,
    tags: ['copy-into', 'bulk-load', 'parquet']
  }),

  // ── 017: SQL code-reading — COPY INTO ───────────────────────
  multi({
    id: 'wh-017', domain: 'prepare', subtopic: 'tsql-warehouse', difficulty: 4,
    prompt: 'Given:\n```sql\nCOPY INTO dbo.Sales\nFROM \'https://account.dfs.core.windows.net/raw/sales/2025/*/*.parquet\'\nWITH (\n  FILE_TYPE = \'PARQUET\',\n  CREDENTIAL = (IDENTITY = \'Managed Identity\'),\n  ERRORFILE = \'https://account.dfs.core.windows.net/errors/sales/\',\n  MAXERRORS = 100\n);\n```\nWhich statements are TRUE about this COPY INTO?',
    options: [
      'The `**/*.parquet` glob path loads multiple Parquet files in parallel',
      'Up to 100 row-level errors are tolerated before the load fails',
      'Rejected rows are written to the ERRORFILE location',
      'It requires explicit column mapping when source schema matches target'
    ],
    correct: [0, 1, 2],
    explanation: 'COPY INTO loads multiple files in parallel via wildcard paths, tolerates up to MAXERRORS row-level rejections, and writes rejected rows to ERRORFILE. Column mapping is OPTIONAL when source/target schema match.',
    whyWrong: {
      3: 'Column mapping is optional when the source schema aligns with the target — explicit mapping is only needed for transformations or mismatch.'
    },
    source: SRC_WH,
    tags: ['copy-into', 'code-reading', 'errorfile', 'maxerrors']
  }),

  // ── 018: Statistics — auto + manual ──────────────────────────
  multi({
    id: 'wh-018', domain: 'prepare', subtopic: 'warehouse-perf', difficulty: 4,
    prompt: 'Which statements about statistics in Fabric Warehouse are TRUE?',
    options: [
      'The engine automatically creates single-column statistics on the first query that touches a column in a predicate, join, or grouping',
      'You can manually create stats via `CREATE STATISTICS stat_name ON dbo.Table(col1, col2);`',
      '`UPDATE STATISTICS dbo.Table;` refreshes statistics on demand',
      'Statistics are irrelevant in Fabric Warehouse because the engine never uses cost-based optimization'
    ],
    correct: [0, 1, 2],
    explanation: 'Fabric Warehouse uses cost-based optimization. Auto-stats fire on first use of a column in WHERE/JOIN/GROUP BY. Manual `CREATE STATISTICS` and `UPDATE STATISTICS` are both supported for tuning.',
    whyWrong: {
      3: 'False — Fabric Warehouse absolutely uses cost-based optimization driven by statistics. Stale stats are a top-tier perf cause.'
    },
    source: SRC_WH,
    tags: ['statistics', 'auto-stats', 'cost-based-opt']
  }),

  // ── 019: Stored procedures ───────────────────────────────────
  single({
    id: 'wh-019', domain: 'prepare', subtopic: 'warehouse-ddl', difficulty: 3,
    prompt: 'Which feature inside CREATE PROCEDURE is NOT supported in Fabric Warehouse?',
    options: [
      'Local variables (DECLARE @x INT)',
      'IF / WHILE control flow',
      'TRY / CATCH error handling',
      'DECLARE CURSOR for row-by-row iteration'
    ],
    correct: 3,
    explanation: 'Cursors are not supported in Fabric Warehouse procedures. Use set-based logic, MERGE, or temp result patterns instead. Variables, control flow, and TRY/CATCH are all supported.',
    whyWrong: {
      0: 'DECLARE @var is supported.',
      1: 'IF/WHILE control flow is supported.',
      2: 'TRY/CATCH is supported.'
    },
    source: SRC_WH,
    tags: ['stored-procedures', 'cursors', 'control-flow']
  }),

  // ── 020: SQL code-reading — CREATE VIEW with RLS combo ──────
  single({
    id: 'wh-020', domain: 'prepare', subtopic: 'warehouse-views', difficulty: 4,
    prompt: 'Given:\n```sql\nCREATE VIEW rep.SalesByRegion\nWITH SCHEMABINDING AS\nSELECT s.Id, s.Region, s.Amount, s.SoldAt\nFROM dbo.Sales s;\n\nGRANT SELECT ON rep.SalesByRegion TO analysts;\nDENY SELECT ON dbo.Sales TO analysts;\n```\nWhat can a user in the `analysts` role do?',
    options: [
      'Query rep.SalesByRegion and (transitively) get the same rows from dbo.Sales',
      'Query both rep.SalesByRegion AND dbo.Sales directly',
      'Query neither — DENY on dbo.Sales blocks the view too',
      'Query nothing because SCHEMABINDING blocks all reads'
    ],
    correct: 0,
    explanation: 'Ownership chaining: when the view and underlying table share an owner, GRANT on the view is sufficient even with DENY on the base table. Analysts read via the view but cannot SELECT directly from `dbo.Sales`.',
    whyWrong: {
      1: 'DENY on dbo.Sales blocks DIRECT access; the view-mediated path still works.',
      2: 'Ownership chaining permits view access despite the DENY on the base table.',
      3: 'SCHEMABINDING locks schema; it does NOT block reads.'
    },
    source: SRC_WH,
    tags: ['views', 'ownership-chaining', 'deny', 'schemabinding']
  }),

  // ── 021: Ordering — COPY INTO load steps ─────────────────────
  order({
    id: 'wh-021', domain: 'prepare', subtopic: 'tsql-warehouse', difficulty: 4,
    prompt: 'Order the steps to bulk-load Parquet files from ADLS Gen2 into a new Fabric Warehouse table.',
    options: [
      'CREATE TABLE dbo.Sales with the target schema',
      'Grant the Warehouse Managed Identity Storage Blob Data Reader on the ADLS container',
      'Run COPY INTO dbo.Sales FROM \'https://...\' WITH (FILE_TYPE=\'PARQUET\', CREDENTIAL=(IDENTITY=\'Managed Identity\'), ERRORFILE=...);',
      'Run UPDATE STATISTICS dbo.Sales; (or rely on auto-stats on first query)',
      'Validate row count and sample values; query rejected rows from ERRORFILE if any'
    ],
    explanation: 'Schema first, then permissions, then load, then refresh stats so the optimizer has accurate cardinality, then validate. Skipping permissions causes auth errors; skipping stats means slow first queries.',
    whyWrong: {},
    source: SRC_WH,
    tags: ['copy-into', 'workflow', 'ordering']
  }),

  // ── 022: Ordering — RLS deployment ───────────────────────────
  order({
    id: 'wh-022', domain: 'prepare', subtopic: 'warehouse-rls', difficulty: 5,
    prompt: 'Order the steps to deploy row-level security on a Fabric Warehouse table.',
    options: [
      'CREATE SCHEMA sec; (dedicated schema for security objects)',
      'CREATE FUNCTION sec.fn_Predicate(...) RETURNS TABLE WITH SCHEMABINDING AS ...;',
      'CREATE SECURITY POLICY sec.MyPolicy ADD FILTER PREDICATE sec.fn_Predicate(col) ON dbo.Target WITH (STATE = ON);',
      'Test as an unprivileged user via EXECUTE AS USER = \'tester\';',
      'Document the predicate logic in a runbook so future admins understand the carve-outs'
    ],
    explanation: 'Schema → predicate function (SCHEMABINDING required) → SECURITY POLICY referencing the function → test under a non-admin identity → document. Each step depends on the previous.',
    whyWrong: {},
    source: SRC.rls,
    tags: ['rls', 'deployment', 'ordering']
  }),

  // ── 023: User-defined functions ──────────────────────────────
  multi({
    id: 'wh-023', domain: 'prepare', subtopic: 'warehouse-ddl', difficulty: 4,
    prompt: 'Which kinds of user-defined functions are supported in Fabric Warehouse?',
    options: [
      'Inline table-valued functions (inline TVF)',
      'Scalar functions',
      'Multi-statement table-valued functions (MSTVF)',
      'CLR functions'
    ],
    correct: [0, 1],
    explanation: 'Fabric Warehouse supports inline TVFs (essential for RLS predicates) and scalar functions. Multi-statement TVFs and CLR functions are not supported.',
    whyWrong: {
      2: 'MSTVFs are not supported in Fabric Warehouse.',
      3: 'CLR functions are not supported.'
    },
    source: SRC_WH,
    tags: ['udf', 'tvf', 'scalar-functions']
  }),

  // ── 024: Time travel ─────────────────────────────────────────
  single({
    id: 'wh-024', domain: 'prepare', subtopic: 'tsql-warehouse', difficulty: 4,
    prompt: 'A user accidentally ran `UPDATE dbo.Sales SET Amount = 0;` at 09:14 UTC. The Warehouse needs to read the table state from 08:00 UTC. Which Fabric Warehouse feature provides this?',
    options: [
      'CREATE SNAPSHOT taken nightly',
      'SELECT ... FROM dbo.Sales OPTION (FOR TIMESTAMP AS OF \'2026-05-05T08:00:00\') — time travel up to 30 days back',
      'Restore from a backup tape',
      'Re-run the original COPY INTO to overwrite'
    ],
    correct: 1,
    explanation: 'Fabric Warehouse supports T-SQL time travel via the `OPTION (FOR TIMESTAMP AS OF ...)` clause, providing point-in-time queries up to 30 days back. Useful for accidental DML recovery.',
    whyWrong: {
      0: 'CREATE SNAPSHOT (Synapse Dedicated style) is not the Fabric Warehouse pattern.',
      2: 'There are no backup tapes to restore from in Fabric Warehouse — time travel covers this scenario.',
      3: 'Re-running the COPY INTO would only work if the source still has the original state and is unrelated to time travel.'
    },
    source: SRC_WH,
    tags: ['time-travel', 'recovery', 'point-in-time']
  }),

  // ── 025: Performance — query monitoring ──────────────────────
  multi({
    id: 'wh-025', domain: 'prepare', subtopic: 'warehouse-perf', difficulty: 4,
    prompt: 'A Warehouse stored procedure is slow. Which actions help diagnose and improve performance?',
    options: [
      'Add `OPTION (LABEL = \'<sp_name>\')` so it is locatable in `sys.dm_exec_requests` / monitoring hub',
      'Run `UPDATE STATISTICS` on tables with stale stats on join and predicate columns',
      'Inspect the query plan via `EXPLAIN` or the query insights view to find data shuffles and full scans',
      'Add explicit `WITH (DISTRIBUTION = HASH(...))` to the table DDL to force optimal distribution'
    ],
    correct: [0, 1, 2],
    explanation: 'LABEL the query for observability, refresh stats so the optimizer has accurate cardinality, and inspect the plan for shuffles/full scans. Distribution is auto-managed in Fabric Warehouse — the Synapse-style hint is not used.',
    whyWrong: {
      3: 'Fabric Warehouse auto-distributes; explicit `WITH (DISTRIBUTION = HASH(...))` is a Synapse Dedicated SQL Pool concept and does not apply here.'
    },
    source: SRC_WH,
    tags: ['performance', 'diagnosis', 'option-label', 'statistics']
  })
];
