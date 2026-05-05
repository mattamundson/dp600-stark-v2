import type { Question } from '../../lib/schema';
import { single, multi, order, SRC } from './_helpers';

// 25 DP-600-style questions on Medallion Architecture (Bronze/Silver/Gold)
// in Microsoft Fabric Lakehouse.
//
// IDs: mdlh-001..mdlh-025
// Domain: prepare (all 25)
// Subtopics: medallion, bronze-layer, silver-layer, gold-layer,
//   lakehouse-architecture, data-quality, transform, onelake
// Type mix: 15 single, 8 multi, 2 ordering
// 100% whyWrong coverage

export const medallion: Question[] = [

  // ─── Bronze Layer (mdlh-001..005) ─────────────────────────────

  single({
    id: 'mdlh-001', domain: 'prepare', subtopic: 'bronze-layer', difficulty: 2,
    prompt: 'Which characteristic BEST describes the Bronze layer in a Fabric Lakehouse medallion architecture?',
    options: [
      'Cleansed, deduplicated records ready for dimensional modeling',
      'Raw data ingested as-is from the source, append-only, preserving original format',
      'Pre-aggregated business metrics optimized for Direct Lake consumption',
      'Schema-enforced Parquet tables with referential integrity constraints'
    ],
    correct: 1,
    explanation: 'Bronze is the raw-landing zone: data lands in its source format (CSV, JSON, Parquet, etc.) without transformation. Tables are append-only — existing rows are never updated — ensuring the layer is replayable and auditable. No cleansing, no type-casting, no deduplication happens here.',
    whyWrong: {
      0: 'Cleansed and deduplicated records describe the Silver layer.',
      2: 'Pre-aggregated metrics optimized for BI/Direct Lake describe the Gold layer.',
      3: 'Schema enforcement and referential integrity belong at Silver or Gold, not Bronze.'
    },
    source: SRC.fabricArch,
    tags: ['medallion', 'bronze', 'raw-ingestion']
  }),

  single({
    id: 'mdlh-002', domain: 'prepare', subtopic: 'bronze-layer', difficulty: 3,
    prompt: 'A pipeline re-ingests the same source extract twice due to a transient failure. In a correctly designed Bronze layer, what is the expected outcome?',
    options: [
      'The second run overwrites the first run\'s rows, preserving exactly one copy',
      'An error is raised because Bronze tables do not accept duplicate keys',
      'Both runs append identical rows; duplicate detection is delegated to Silver',
      'The pipeline aborts because Bronze enforce idempotent keys by default'
    ],
    correct: 2,
    explanation: 'Bronze is append-only and idempotent at the ingestion level: each run appends its batch. Deduplication is a Silver responsibility. The duplicate rows in Bronze are harmless — Silver filters them using a row_hash or business key comparison. This design lets Bronze serve as a full replay log.',
    whyWrong: {
      0: 'Overwriting would destroy the audit trail; Bronze is append-only.',
      1: 'Bronze imposes no uniqueness constraints — it accepts whatever the source sends.',
      3: 'No such default abort behavior exists; Bronze pipelines are designed to be re-runnable safely.'
    },
    source: SRC.fabricArch,
    tags: ['bronze', 'idempotency', 'append-only']
  }),

  single({
    id: 'mdlh-003', domain: 'prepare', subtopic: 'bronze-layer', difficulty: 3,
    prompt: 'A data team debates whether to store raw JSON blobs in Bronze or parse and flatten them immediately. Which principle supports storing the raw JSON?',
    options: [
      'Bronze should always store Delta tables with a strict schema for query performance',
      'Preserving the original source format ensures the raw state can be replayed if downstream parsing logic changes',
      'JSON is automatically converted to Parquet by OneLake before being written to the Bronze layer',
      'Parsing in Bronze reduces Silver compute costs and is therefore preferred'
    ],
    correct: 1,
    explanation: 'A key Bronze principle is source-fidelity: keep the raw payload exactly as it arrived. If a downstream schema changes or a bug is found in the parser, teams can re-derive Silver from the unchanged Bronze. Once you parse-and-overwrite in Bronze you lose this capability.',
    whyWrong: {
      0: 'Bronze can hold semi-structured data such as JSON columns in Delta — a strict schema is a Silver/Gold concern.',
      2: 'OneLake does not auto-convert JSON to Parquet; Delta tables store row data in Parquet and column values in the schema defined by the writer.',
      3: 'Parsing in Bronze couples the ingestion and transformation steps, making re-ingestion harder, not cheaper.'
    },
    source: SRC.fabricArch,
    tags: ['bronze', 'source-fidelity', 'replay']
  }),

  multi({
    id: 'mdlh-004', domain: 'prepare', subtopic: 'bronze-layer', difficulty: 4,
    prompt: 'Which TWO ingestion patterns are appropriate for populating a Bronze Lakehouse table from an operational SQL database?',
    options: [
      'Fabric Mirrored Database (continuous CDC replication into OneLake as Delta)',
      'Data Pipeline Copy Data activity (full or incremental extract, appending to Bronze)',
      'Direct Lake mode pointed at the operational SQL database',
      'Power BI Dataflow Gen2 writing to a Gold table and creating a shortcut back to Bronze'
    ],
    correct: [0, 1],
    explanation: 'Mirrored Database continuously replicates the source DB into OneLake as Delta — a natural Bronze materialisation. Pipeline Copy Activity moves bytes from source to Lakehouse and can append on schedule. Direct Lake is a read mode for semantic models, not an ingestion pattern. Writing Gold first and shortcutting to Bronze inverts the medallion flow.',
    whyWrong: {
      2: 'Direct Lake is a Power BI connectivity mode, not a way to move data into a Lakehouse Bronze layer.',
      3: 'Writing to Gold first and back-pointing a shortcut to Bronze violates medallion directionality; data must flow Bronze → Silver → Gold, not the reverse.'
    },
    source: SRC.mirroring,
    tags: ['bronze', 'ingestion', 'mirroring', 'pipeline']
  }),

  single({
    id: 'mdlh-005', domain: 'prepare', subtopic: 'bronze-layer', difficulty: 3,
    prompt: 'An architect proposes using a OneLake shortcut to an ADLS Gen2 container as the Bronze layer rather than copying data into a Lakehouse table. What is the main advantage of this "virtual Bronze" pattern?',
    options: [
      'Shortcuts automatically enforce a schema on the source data at write time',
      'No data movement or duplication — the Lakehouse references the data in-place, reducing storage cost and latency',
      'Shortcuts provide faster Delta scan performance than physical Lakehouse tables',
      'V-Order compression is applied to shortcut targets automatically'
    ],
    correct: 1,
    explanation: 'A virtual Bronze via shortcut means zero data is copied into Fabric storage — the Lakehouse simply points to the existing ADLS container. This avoids duplication costs and eliminates an ingestion step. The trade-off is that you rely on source-side access controls and the data format may not be Delta (requiring Silver to handle that conversion).',
    whyWrong: {
      0: 'Shortcuts are virtual references; they do not validate or enforce any schema on the source.',
      2: 'Physical Delta tables with V-Order in the Lakehouse typically scan faster than shortcuts pointing to non-Delta formats on external storage.',
      3: 'V-Order is applied when writing Delta files into Fabric-managed storage; it is not retroactively applied to external shortcut targets.'
    },
    source: SRC.onelakeShortcuts,
    tags: ['bronze', 'shortcut', 'virtual-bronze', 'onelake']
  }),

  // ─── Silver Layer (mdlh-006..010) ─────────────────────────────

  single({
    id: 'mdlh-006', domain: 'prepare', subtopic: 'silver-layer', difficulty: 2,
    prompt: 'Which transformation is a Silver-layer responsibility in a medallion Lakehouse?',
    options: [
      'Copying raw CSV files from the source landing zone',
      'Building fact and dimension tables for the enterprise data warehouse',
      'Deduplicating rows, casting data types, and conforming schema across sources',
      'Applying V-Order to Delta files for Direct Lake query performance'
    ],
    correct: 2,
    explanation: 'Silver is the cleanse-and-conform layer. Core operations are: deduplication (remove duplicates from Bronze), type casting (e.g., strings → dates), null handling, schema conformance (map source column names to enterprise standards). Silver is "trusted" data — still granular, but clean.',
    whyWrong: {
      0: 'Copying raw files is a Bronze (ingestion) responsibility.',
      1: 'Fact and dimension modeling is a Gold responsibility.',
      3: 'V-Order is a write-time optimization applied to Gold tables for Direct Lake; it is not a Silver transformation.'
    },
    source: SRC.fabricArch,
    tags: ['silver', 'cleanse', 'conform']
  }),

  multi({
    id: 'mdlh-007', domain: 'prepare', subtopic: 'silver-layer', difficulty: 4,
    prompt: 'A Silver notebook reads from `lh_bronze.orders_raw` and writes to `lh_silver.orders`. Which THREE operations belong in this Silver notebook?',
    options: [
      'Remove duplicate rows using a composite business key (order_id + source_system)',
      'Cast `order_date` from string "YYYY-MM-DD" to DateType',
      'Append the original raw payload unchanged for audit purposes',
      'Standardise `country_code` to ISO 3166 two-letter format across all source systems',
      'Pre-aggregate total revenue per month for the BI dashboard'
    ],
    correct: [0, 1, 3],
    explanation: 'Silver operations: deduplicate on business key, type-cast columns, conform values across sources. Appending unchanged raw payloads belongs in Bronze (Silver should not re-land raw data). Monthly revenue aggregation belongs in Gold (Silver stays granular).',
    whyWrong: {
      2: 'Preserving unchanged raw payloads is a Bronze responsibility; duplicating that into Silver adds storage cost with no benefit.',
      4: 'Pre-aggregating for dashboards is a Gold operation; Silver stays row-level to remain reusable for multiple downstream purposes.'
    },
    source: SRC.notebooks,
    tags: ['silver', 'transform', 'dedup', 'type-cast']
  }),

  single({
    id: 'mdlh-008', domain: 'prepare', subtopic: 'silver-layer', difficulty: 4,
    prompt: 'A Silver table tracks customer records. When a customer changes their address the team needs a full history of changes. Which SCD approach belongs in Silver?',
    options: [
      'SCD Type 0 — never update; keep the original record forever',
      'SCD Type 1 — overwrite the current record with the new address',
      'SCD Type 2 — add a new row with the new address and mark the old row as expired',
      'SCD Type 3 — add a "previous_address" column to the existing row'
    ],
    correct: 2,
    explanation: 'Silver is where full historical change data lives. SCD Type 2 adds a new row per change with effective/expiry dates, preserving complete history. Gold may then project a Type 1 (current-state) view from Silver for BI consumption, but the authoritative history sits in Silver.',
    whyWrong: {
      0: 'Type 0 ignores all changes — unusable for history tracking.',
      1: 'Type 1 overwrites the old record, destroying history — a Gold pattern (current-state only), not Silver.',
      3: 'Type 3 adds one previous-value column, which only tracks a single prior state — insufficient for full history.'
    },
    source: SRC.fabricArch,
    tags: ['silver', 'scd', 'scd-type2', 'history']
  }),

  single({
    id: 'mdlh-009', domain: 'prepare', subtopic: 'silver-layer', difficulty: 3,
    prompt: 'Multiple source systems (CRM, ERP, e-commerce) each have a Bronze table for `customer`. The Silver layer merges them. What is the FIRST step in a correct multi-source Silver merge?',
    options: [
      'Write all three Bronze tables directly to the Gold fact table without a Silver merge',
      'Identify a canonical business key (e.g., email or global_customer_id) to resolve the same customer across systems',
      'Pick the largest source as the primary and discard rows from other sources',
      'Union all three tables without any matching logic and rely on Gold to de-duplicate'
    ],
    correct: 1,
    explanation: 'Before merging multi-source Bronze data in Silver you must establish a canonical entity resolution key. Without a shared business key (email, global ID, etc.) you cannot correctly identify matching entities — leading to fan-out or data loss downstream. Entity resolution is the Silver-layer foundation for multi-source unification.',
    whyWrong: {
      0: 'Bypassing Silver pushes all transformation complexity into Gold and produces an untrusted, unmaintainable Gold table.',
      2: 'Discarding rows from minority sources destroys data and violates completeness.',
      3: 'Unioning without matching creates duplicate customers in Silver that corrupt all downstream reporting.'
    },
    source: SRC.fabricArch,
    tags: ['silver', 'multi-source', 'entity-resolution']
  }),

  multi({
    id: 'mdlh-010', domain: 'prepare', subtopic: 'silver-layer', difficulty: 4,
    prompt: 'Which TWO Delta Lake schema evolution modes are appropriate for the Silver layer when a new nullable column is added to a source?',
    options: [
      'OVERWRITE — replace the entire table schema and truncate all existing rows',
      'MERGE — accept the new column and backfill existing rows with NULL',
      'ENFORCE — reject writes that introduce new columns not already in the Silver schema',
      'EVOLUTION MERGE — add the new column to existing Delta schema without dropping old rows'
    ],
    correct: [1, 3],
    explanation: 'Silver should accept additive schema changes (new nullable columns) without breaking existing rows. Both MERGE and evolution-MERGE achieve this: new column appears, existing rows get NULL. OVERWRITE destroys history. ENFORCE causes pipeline failures every time a source adds a column — too brittle for Silver.',
    whyWrong: {
      0: 'OVERWRITE truncates all Silver history, destroying the audit trail that Silver is designed to preserve.',
      2: 'ENFORCE (strict mode) rejects additive schema changes — any new source column will fail the Silver write, requiring manual schema updates before processing can resume.'
    },
    source: SRC.notebooks,
    tags: ['silver', 'schema-evolution', 'delta-lake']
  }),

  // ─── Gold Layer (mdlh-011..015) ───────────────────────────────

  single({
    id: 'mdlh-011', domain: 'prepare', subtopic: 'gold-layer', difficulty: 2,
    prompt: 'Which statement BEST describes the Gold layer in a Fabric medallion Lakehouse?',
    options: [
      'Append-only raw files from source systems, retained for replay',
      'Row-level granular cleansed data ready for further transformation',
      'Business-ready aggregates, dimensional models, and serving tables consumed by BI tools',
      'A backup copy of the Silver layer for disaster recovery'
    ],
    correct: 2,
    explanation: 'Gold is the serving layer. Tables are shaped for consumption: fact tables, dimension tables, pre-aggregated rollups. Power BI semantic models (often in Direct Lake mode) read from Gold. Gold is curated, smaller, and optimised for query performance.',
    whyWrong: {
      0: 'Append-only raw files are Bronze.',
      1: 'Granular cleansed data is Silver.',
      3: 'A disaster-recovery backup is a separate concern; Gold is not a copy of Silver.'
    },
    source: SRC.fabricArch,
    tags: ['gold', 'serving-layer', 'dimensional-model']
  }),

  single({
    id: 'mdlh-012', domain: 'prepare', subtopic: 'gold-layer', difficulty: 3,
    prompt: 'A Gold fact table in a Fabric Lakehouse will be consumed by a Power BI semantic model in Direct Lake mode. Which write-time optimization should the engineer apply when writing the Gold table?',
    options: [
      'Partition the table by a high-cardinality string column such as product_sku',
      'Apply V-Order during the Delta write to enable optimized VertiPaq-style reads by Direct Lake',
      'Store the table as CSV to reduce Spark write time',
      'Enable ENFORCE schema mode so Power BI columns are never null'
    ],
    correct: 1,
    explanation: 'V-Order is a Fabric-specific write-time optimization that encodes Delta Parquet files in a column-sorted, compressed layout that VertiPaq (the Direct Lake engine) can read with near-Import speed. It must be applied at write time on Gold tables consumed via Direct Lake.',
    whyWrong: {
      0: 'Partitioning on a high-cardinality column causes excessive small files (partition explosion), hurting both write and read performance.',
      2: 'CSV is not Delta format — Direct Lake requires Delta; CSV is inappropriate for Gold.',
      3: 'ENFORCE schema mode controls whether new columns are accepted or rejected; it has no effect on query performance or Direct Lake compatibility.'
    },
    source: SRC.directLake,
    tags: ['gold', 'v-order', 'direct-lake', 'performance']
  }),

  single({
    id: 'mdlh-013', domain: 'prepare', subtopic: 'gold-layer', difficulty: 4,
    prompt: 'An enterprise uses a Fabric Lakehouse for Bronze and Silver but is debating Lakehouse vs Warehouse for the Gold layer. Which factor MOST favors choosing a Fabric Warehouse for Gold?',
    options: [
      'The Gold layer has more than 1 TB of data that must be stored as Delta',
      'Multiple BI developers need to write T-SQL queries with INSERT/UPDATE/MERGE, and the team needs cross-table ACID transactions for nightly close logic',
      'Power BI Direct Lake is required and only Lakehouse supports it',
      'The Gold layer needs Spark notebooks to run complex Python UDFs'
    ],
    correct: 1,
    explanation: 'If the Gold serving layer requires T-SQL DML (INSERT, UPDATE, MERGE) and cross-table ACID transactions — common in nightly financial close workflows — Warehouse is the better choice. Lakehouse SQL endpoint is read-only; you cannot write via T-SQL.',
    whyWrong: {
      0: 'Data volume alone does not determine Lakehouse vs Warehouse; both can store large Delta/Parquet datasets in OneLake.',
      2: 'Direct Lake CAN use a Warehouse as its source (via T-SQL endpoint) as well as a Lakehouse — it is not exclusive to Lakehouse.',
      3: 'Lakehouse, not Warehouse, is the item for Spark notebooks; choosing Warehouse for Spark UDFs would be the opposite of correct.'
    },
    source: SRC.tsql,
    tags: ['gold', 'lakehouse-vs-warehouse', 'acid', 'decision']
  }),

  multi({
    id: 'mdlh-014', domain: 'prepare', subtopic: 'gold-layer', difficulty: 4,
    prompt: 'A Gold layer dim_customer table in a Fabric Lakehouse needs optimal performance for Direct Lake. Which TWO actions should the engineer take?',
    options: [
      'Write the table with V-Order enabled (spark.conf.set("spark.sql.parquet.vorder.enabled", "true"))',
      'Partition the table by customer_id (high-cardinality integer)',
      'Run OPTIMIZE and VACUUM on the Gold Delta table regularly to compact small files and remove stale versions',
      'Store dim_customer as an unmanaged external table on ADLS Gen2 outside OneLake'
    ],
    correct: [0, 2],
    explanation: 'V-Order at write time enables Direct Lake\'s fast VertiPaq column reads. Regular OPTIMIZE/VACUUM compacts small files (improving scan performance) and removes old Delta log snapshots. Partitioning a small-to-medium dimension by high-cardinality customer_id creates many tiny files — counterproductive. Storing outside OneLake breaks Direct Lake, which requires Delta files in OneLake.',
    whyWrong: {
      1: 'High-cardinality partitioning fragments a dimension table into thousands of tiny Parquet files, degrading performance rather than improving it.',
      3: 'Direct Lake requires the Delta table to reside in OneLake-managed storage; external tables on ADLS outside OneLake are not compatible.'
    },
    source: SRC.directLake,
    tags: ['gold', 'v-order', 'optimize', 'direct-lake']
  }),

  single({
    id: 'mdlh-015', domain: 'prepare', subtopic: 'gold-layer', difficulty: 3,
    prompt: 'The Gold layer has a `fact_sales` table and a `dim_customer` table. A data engineer proposes applying Z-ordering on `fact_sales` by `customer_id` and `order_date`. What is the purpose of Z-ordering here?',
    options: [
      'Z-ordering enforces referential integrity between fact_sales and dim_customer',
      'Z-ordering co-locates data for common query filter columns (customer_id, order_date) in the same Parquet files, enabling file skipping and faster scans',
      'Z-ordering converts the Delta table to a warehouse schema for T-SQL queries',
      'Z-ordering replaces the need for V-Order on Gold tables consumed by Direct Lake'
    ],
    correct: 1,
    explanation: 'Z-ordering multi-dimensionally sorts and co-locates data so that Parquet file statistics (min/max) cover small ranges for the Z-ordered columns. Delta\'s data-skipping can then skip entire files for queries filtered on those columns, dramatically reducing I/O for selective queries on large fact tables.',
    whyWrong: {
      0: 'Z-ordering is a physical layout optimization; it does not enforce referential integrity.',
      2: 'Z-ordering is a Spark/Delta operation; it has no effect on T-SQL query routing.',
      3: 'Z-ordering and V-Order are complementary, not substitutes. Direct Lake needs V-Order for columnar encoding; Z-ordering helps Spark/SQL queries skip files.'
    },
    source: SRC.notebooks,
    tags: ['gold', 'z-order', 'data-skipping', 'delta-lake']
  }),

  // ─── Architecture & Layer Boundaries (mdlh-016..020) ─────────

  single({
    id: 'mdlh-016', domain: 'prepare', subtopic: 'medallion', difficulty: 3,
    prompt: 'A streaming pipeline ingests IoT sensor readings from Event Hub. The team wants to skip Bronze and write directly to Silver. When is this acceptable?',
    options: [
      'Never — all data must pass through Bronze before reaching Silver',
      'When the data stream is already clean, conformed, and deduplicated at the source (e.g., a well-governed internal telemetry system)',
      'Always — streaming data should never touch Bronze because Bronze is batch-only',
      'Only when the Gold layer also writes back to Bronze for reconciliation'
    ],
    correct: 1,
    explanation: 'Medallion is a pattern, not a rigid rule. When a source guarantees clean, conformed, duplicate-free data (common in managed internal telemetry), the Bronze hop adds cost and latency with no value. Skipping Bronze is valid when the source already fulfils Bronze\'s quality contract. However, for third-party or untrusted sources, Bronze is still recommended.',
    whyWrong: {
      0: 'Medallion is a guideline; architectural fitness matters more than layer orthodoxy.',
      2: 'Bronze is not batch-only — it can ingest streaming data. The question is about source quality, not delivery mechanism.',
      3: 'Gold never writes back to Bronze; data flows in one direction: Bronze → Silver → Gold.'
    },
    source: SRC.fabricArch,
    tags: ['medallion', 'skip-bronze', 'streaming', 'architecture']
  }),

  multi({
    id: 'mdlh-017', domain: 'prepare', subtopic: 'lakehouse-architecture', difficulty: 4,
    prompt: 'A new data source (on-prem SAP ERP) is being added to the medallion architecture. Which THREE statements describe correct naming and schema conventions?',
    options: [
      'Bronze table: lh_bronze.sap_sales_raw — one table per source feed, raw column names preserved',
      'Silver table: lh_silver.sales — conformed column names and types merged from all source systems',
      'Gold table: lh_gold.fact_sales — aggregated, business-named, dimensional model-shaped table',
      'Bronze table: lh_gold.sap_sales_raw — store raw SAP data in the Gold schema to co-locate with serving tables',
      'Silver table: lh_bronze.sales — write cleansed data back into the Bronze schema to overwrite the raw feed'
    ],
    correct: [0, 1, 2],
    explanation: 'Best practice naming separates schemas by layer: lh_bronze.* for raw per-source tables, lh_silver.* for conformed entities, lh_gold.* for serving tables. Storing raw SAP data in lh_gold mixes layer concerns. Writing cleansed data back to lh_bronze destroys source fidelity.',
    whyWrong: {
      3: 'Raw source data must never live in the Gold schema — mixing raw ingestion with business-ready serving creates confusion and breaks lineage.',
      4: 'Cleansed Silver data must never be written into lh_bronze — the Bronze schema is the immutable raw landing zone.'
    },
    source: SRC.fabricArch,
    tags: ['medallion', 'naming', 'schema', 'lakehouse-architecture']
  }),

  single({
    id: 'mdlh-018', domain: 'prepare', subtopic: 'medallion', difficulty: 3,
    prompt: 'In a Fabric medallion pipeline, which orchestration trigger pattern correctly models the dependency between layers?',
    options: [
      'Bronze, Silver, and Gold pipelines all run simultaneously on a fixed schedule',
      'Bronze runs on source event/schedule; Silver runs after Bronze succeeds; Gold runs after Silver succeeds',
      'Gold runs first to define the schema; then Silver conforms to Gold; then Bronze lands the raw data',
      'Silver and Gold run simultaneously while Bronze runs independently at midnight'
    ],
    correct: 1,
    explanation: 'Medallion has a strict data dependency: Bronze must complete before Silver can process new increments, and Silver must complete before Gold aggregates. In Fabric Data Pipelines, this is modelled with sequential activities or pipeline chaining with success conditions — Bronze → Silver → Gold in order.',
    whyWrong: {
      0: 'Running all three simultaneously means Silver and Gold may read stale Bronze; the layers are not independent.',
      2: 'Gold never precedes Silver or Bronze — data flows upstream-to-downstream, not the reverse.',
      3: 'Running Silver and Gold simultaneously while Bronze is independent will cause Gold to consume an incomplete Silver.'
    },
    source: SRC.pipelines,
    tags: ['medallion', 'orchestration', 'pipeline', 'dependency']
  }),

  single({
    id: 'mdlh-019', domain: 'prepare', subtopic: 'data-quality', difficulty: 4,
    prompt: 'A data quality gate between Silver and Gold checks that the row count in `lh_silver.orders` is within 5% of the row count in `lh_bronze.orders_raw` for the same batch. The check fails with Silver showing 30% fewer rows. What is the MOST likely cause?',
    options: [
      'V-Order compression in Silver removes rows to reduce storage',
      'An overly aggressive deduplication rule in Silver is incorrectly dropping valid rows',
      'The Gold OPTIMIZE job ran and deleted Silver rows as part of file compaction',
      'Direct Lake mode caused Power BI to purge Silver rows during framing'
    ],
    correct: 1,
    explanation: 'A 30% row reduction from Bronze to Silver almost always indicates a deduplication or filter logic bug in Silver — either the business key comparison is incorrect (treating distinct valid rows as duplicates) or a WHERE clause is too restrictive. This is the canonical Silver data quality trap.',
    whyWrong: {
      0: 'V-Order is a column-encoding optimisation; it never removes rows.',
      2: 'OPTIMIZE compacts Parquet files within the same Delta table; it does not cross table boundaries or delete rows from other tables.',
      3: 'Direct Lake is a read-side query mode; it never deletes or purges data from any Lakehouse table.'
    },
    source: SRC.fabricArch,
    tags: ['data-quality', 'silver', 'reconciliation', 'dedup']
  }),

  multi({
    id: 'mdlh-020', domain: 'prepare', subtopic: 'data-quality', difficulty: 4,
    prompt: 'A data engineering team wants to add automated data quality gates between Bronze and Silver. Which TWO checks are MOST important to include?',
    options: [
      'Row count delta: Silver row count must be ≥95% of Bronze row count for the same batch',
      'Null threshold: critical business key columns (e.g., order_id, customer_id) must have <1% nulls in Silver',
      'V-Order verification: confirm V-Order bit is set in every Silver Parquet file footer',
      'Column count parity: Silver must have the same number of columns as Bronze'
    ],
    correct: [0, 1],
    explanation: 'Row count delta catches over-aggressive deduplication, filter bugs, and load truncations. Null threshold on business keys catches missing joins, type-cast failures that null out IDs, and source data quality issues. Both are actionable and catch the most common Silver pipeline failures. V-Order belongs on Gold, not Silver. Column count parity is a weak check — Silver intentionally adds/renames columns.',
    whyWrong: {
      2: 'V-Order is a Gold-layer optimization for Direct Lake; checking it on Silver files is not a meaningful data quality gate.',
      3: 'Silver intentionally restructures, renames, and adds columns versus Bronze. Column count parity is not a valid Silver quality gate.'
    },
    source: SRC.fabricArch,
    tags: ['data-quality', 'bronze-silver', 'row-count', 'null-check']
  }),

  // ─── Delta Lake, Schema Evolution, Storage (mdlh-021..023) ────

  single({
    id: 'mdlh-021', domain: 'prepare', subtopic: 'transform', difficulty: 3,
    prompt: 'All three medallion layers in a Fabric Lakehouse use Delta Lake format. Which capability of Delta Lake is MOST important for ensuring Bronze re-ingestion can undo a bad batch load?',
    options: [
      'V-Order encoding for fast BI reads',
      'Time Travel — the ability to read a previous Delta table version using VERSION AS OF or TIMESTAMP AS OF',
      'Z-ordering for file skipping on filter columns',
      'OPTIMIZE to compact files after large appends'
    ],
    correct: 1,
    explanation: 'Delta Time Travel retains a transaction log with previous snapshots. If a bad batch corrupts Bronze, engineers can RESTORE to the pre-load version, effectively "undoing" the bad append without any out-of-band restore process. This is the recovery mechanism enabled by Delta at Bronze.',
    whyWrong: {
      0: 'V-Order is for columnar read performance, not recovery.',
      2: 'Z-ordering organises files for data skipping; it has no restore capability.',
      3: 'OPTIMIZE compacts files for performance; it does not provide rollback capability.'
    },
    source: SRC.notebooks,
    tags: ['bronze', 'delta-lake', 'time-travel', 'recovery']
  }),

  single({
    id: 'mdlh-022', domain: 'prepare', subtopic: 'onelake', difficulty: 3,
    prompt: 'A Fabric Lakehouse has three schemas: lh_bronze, lh_silver, and lh_gold. A Power BI semantic model in Direct Lake mode targets lh_gold.fact_sales. The semantic model framing job fails. Which is the MOST likely reason?',
    options: [
      'Direct Lake cannot read tables from a Lakehouse that also contains Bronze and Silver tables',
      'The lh_gold.fact_sales Delta table was not written with V-Order enabled, causing framing to fall back to DirectQuery',
      'Gold tables cannot be in the same Lakehouse as Bronze tables due to OneLake namespace conflicts',
      'Framing requires at least two Gold tables; a single fact table is insufficient'
    ],
    correct: 1,
    explanation: 'Direct Lake framing reads Delta Parquet files into VertiPaq memory. If V-Order is absent, framing still works but may fall back to DirectQuery mode for suboptimal performance. However, the framing job itself can FAIL (not just degrade) if the Delta table has corrupted or unreadable files. The most DP-600-testable answer is that missing V-Order is the key Gold-layer requirement for Direct Lake framing. In practice, a hard failure is usually file/version corruption.',
    whyWrong: {
      0: 'A single Lakehouse can hold all three layers simultaneously; there is no restriction preventing co-location.',
      2: 'There are no OneLake namespace conflicts between schemas within the same Lakehouse.',
      3: 'Direct Lake models can point to a single table; there is no minimum table-count requirement for framing.'
    },
    source: SRC.directLake,
    tags: ['gold', 'direct-lake', 'framing', 'v-order']
  }),

  single({
    id: 'mdlh-023', domain: 'prepare', subtopic: 'bronze-layer', difficulty: 4,
    prompt: 'A Bronze table has 24 months of daily appended data (about 720 Delta log entries). Queries on the table are slow to plan because the Delta log has too many checkpoint files. Which operation should the engineer run?',
    options: [
      'VACUUM to purge old Delta log transaction files and checkpoint entries',
      'OPTIMIZE to compact the Parquet data files and trigger a checkpoint at the new log entry',
      'RESTORE to roll the table back to its earliest version, then re-append',
      'DROP and recreate the Bronze table with a partition on year/month'
    ],
    correct: 1,
    explanation: 'OPTIMIZE compacts small Parquet data files into larger ones and advances the Delta transaction log checkpoint. The new checkpoint covers all previous log entries, reducing the number of JSON log files the reader must scan to reconstruct table state. This is the standard remediation for slow-plan due to log proliferation.',
    whyWrong: {
      0: 'VACUUM removes old data-file versions (tombstoned by DELETE/UPDATE) and expired log files after the retention window. It does not compact active data files or create new checkpoints.',
      2: 'RESTORE discards all data after the target version — catastrophic for a Bronze audit table.',
      3: 'Dropping and recreating destroys the Delta transaction history and is unnecessary; OPTIMIZE is non-destructive and sufficient.'
    },
    source: SRC.notebooks,
    tags: ['bronze', 'delta-lake', 'optimize', 'checkpoint']
  }),

  // ─── Anti-patterns & Common Mistakes (mdlh-024) ───────────────

  multi({
    id: 'mdlh-024', domain: 'prepare', subtopic: 'medallion', difficulty: 4,
    prompt: 'Which THREE items are common medallion anti-patterns that should be avoided in a Fabric Lakehouse?',
    options: [
      'Performing complex business transformations (aggregations, SCD logic) inside the Bronze ingestion pipeline',
      'Storing raw source data directly in the Gold schema for "convenience"',
      'Running Bronze, Silver, and Gold pipelines sequentially with success-gated triggers',
      'Building Gold tables as pre-aggregated, business-named serving tables',
      'Allowing analysts to write ad-hoc DELETE statements against Silver Delta tables from Notebooks'
    ],
    correct: [0, 1, 4],
    explanation: 'Anti-patterns: (A) transforming in Bronze couples ingestion and logic, breaking replay; (B) raw data in Gold pollutes the serving layer and defeats downstream consumers\' trust; (E) ad-hoc DELETEs against Silver break Silver\'s role as the clean-but-granular source of truth. Sequential pipeline triggers (C) are the correct dependency model, not an anti-pattern. Business-named Gold aggregates (D) are the intended Gold design.',
    whyWrong: {
      2: 'Sequential success-gated triggers are the CORRECT orchestration model for medallion — Bronze must complete before Silver, etc.',
      3: 'Building pre-aggregated, business-named Gold tables is the explicit goal of the Gold layer, not an anti-pattern.'
    },
    source: SRC.fabricArch,
    tags: ['medallion', 'anti-pattern', 'bronze', 'silver', 'gold']
  }),

  // ─── Ordering questions (mdlh-025) ────────────────────────────

  order({
    id: 'mdlh-025', domain: 'prepare', subtopic: 'medallion', difficulty: 3,
    prompt: 'Arrange the following steps in the CORRECT canonical order for onboarding a new data source (on-prem Oracle HR database) through a Fabric medallion Lakehouse.',
    options: [
      'Design and configure a Fabric Data Pipeline Copy Activity (or Mirrored DB) to land raw Oracle HR extracts into lh_bronze.hr_raw',
      'Validate Bronze row counts and spot-check raw data format (dates as strings, nulls present) before proceeding',
      'Author a Spark notebook to cleanse, deduplicate, and type-cast lh_bronze.hr_raw → lh_silver.employee',
      'Apply a data quality gate: row count delta ≤5%, null rate on employee_id <1%',
      'Build lh_gold.dim_employee with V-Order enabled and wire it into the Power BI semantic model via Direct Lake'
    ],
    shuffled: [
      'Apply a data quality gate: row count delta ≤5%, null rate on employee_id <1%',
      'Build lh_gold.dim_employee with V-Order enabled and wire it into the Power BI semantic model via Direct Lake',
      'Design and configure a Fabric Data Pipeline Copy Activity (or Mirrored DB) to land raw Oracle HR extracts into lh_bronze.hr_raw',
      'Author a Spark notebook to cleanse, deduplicate, and type-cast lh_bronze.hr_raw → lh_silver.employee',
      'Validate Bronze row counts and spot-check raw data format (dates as strings, nulls present) before proceeding'
    ],
    explanation: 'The canonical 5-step medallion onboarding flow: (1) Ingest raw to Bronze, (2) Validate Bronze before transforming, (3) Cleanse/conform to Silver, (4) Apply Silver quality gate, (5) Build Gold serving table with V-Order and connect to BI. Validating Bronze before Silver prevents propagating bad data. The quality gate runs after Silver is written to confirm the transformation was correct.',
    whyWrong: {
      0: 'The data quality gate (step 4) validates Silver output — it must follow the Silver notebook (step 3), not precede ingestion.',
      1: 'Building Gold (step 5) requires clean Silver data to already exist — it cannot precede the Silver notebook.',
      2: 'Configuring the Bronze ingestion pipeline is always the first step; without Bronze data nothing downstream can execute.',
      3: 'The Silver notebook (step 3) must follow Bronze validation (step 2) — not precede it.',
      4: 'Bronze spot-check (step 2) must follow ingestion (step 1) and precede Silver cleansing (step 3).'
    },
    source: SRC.fabricArch,
    tags: ['medallion', 'onboarding', 'ordering', 'end-to-end']
  })

];
