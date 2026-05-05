// Composite Models and Aggregation Tables — deep-dive, 15 questions.
// IDs: cmag-001..cmag-015
// Domain: semantic
// Subtopics: composite-models, aggregations, managed-aggregations,
//            user-defined-aggregations, storage-modes, composite-security
// Type mix: 6 multi-select, 1 ordering, 8 single
// 100% whyWrong coverage

import type { Question } from '../../lib/schema';
import { single, multi, order } from './_helpers';

const SRC_CMAG = {
  compositeDocs: {
    category: 'composite-models-deep',
    note: 'Per-table storage modes, Dual, Limited relationships, chained composites, security'
  },
  aggsDocs: {
    category: 'aggregations-deep',
    note: 'Managed aggs, user-defined aggs, matching rules, DISTINCTCOUNT, hit-rate metrics'
  },
  hybridDocs: {
    category: 'hybrid-tables',
    note: 'Incremental refresh + DirectQuery hot partition + aggregations'
  },
  dlCompositeDocs: {
    category: 'direct-lake-composite',
    note: 'Direct Lake in composite: no Dual, DQ fallback semantics, restrictions'
  },
  securityCompositeDocs: {
    category: 'composite-security',
    note: 'Per-source RLS, chain-of-trust, composite-on-composite security boundaries'
  },
};

export const compositeAggs: Question[] = [

  // ── Composite Models — Dual mode ──────────────────────────────────

  single({
    id: 'cmag-001',
    domain: 'semantic',
    subtopic: 'composite-models',
    difficulty: 4,
    prompt:
      'A semantic model has FactSales in DirectQuery mode and DimProduct in Dual mode. A report slicer filters DimProduct[Category]. The slicer has no relationship to any DirectQuery table in its query. Which data source does Power BI read to populate the slicer?',
    options: [
      'The DirectQuery source, because DimProduct must stay consistent with FactSales',
      'The Import cache inside the Dual table, because the slicer query is entirely within the Import island',
      'Both sources simultaneously — Dual always queries both and merges results',
      'Neither — Dual tables cannot be used in slicers'
    ],
    correct: 1,
    explanation:
      'A Dual table maintains both an in-memory (Import) cache and the ability to route to the DirectQuery source. When a query can be resolved entirely within the Import island — such as a standalone slicer that does not join to any DirectQuery table — the engine uses the Import cache. The DirectQuery path activates only when the Dual table participates in a cross-island join (e.g., when joined to FactSales at report visual time). This is the core Dual-mode benefit: cheap Import cache for filters and slicers, correct DQ consistency for joins.',
    whyWrong: {
      0: 'The engine only routes to the DirectQuery source when the Dual table is part of a cross-island join. A standalone slicer does not require DQ consistency.',
      2: 'Dual does not query both sources simultaneously. The choice is one or the other based on whether the query spans islands.',
      3: 'Dual tables fully support slicers — Import-cache path serves them efficiently.'
    },
    source: SRC_CMAG.compositeDocs,
    tags: ['composite-models', 'dual', 'storage-modes', 'cross-island', 'slicer'],
  }),

  // ── Composite Models — Limited relationships ──────────────────────

  single({
    id: 'cmag-002',
    domain: 'semantic',
    subtopic: 'composite-models',
    difficulty: 5,
    prompt:
      'In a composite model, a relationship between an Import dim (DimCustomer) and a DirectQuery fact (FactOrders) is classified as "Limited." What is the practical consequence of a Limited relationship compared to a Regular relationship?',
    options: [
      'Limited relationships prevent any filter propagation between the two tables',
      'Limited relationships are evaluated per-query: the engine materialises one side and passes IN-list values to the other, rather than using a pre-computed join — this produces more round-trips and higher latency than a Regular relationship',
      'Limited relationships automatically become Regular when the DirectQuery table is behind a gateway',
      'Limited relationships enforce RLS on the Import side only'
    ],
    correct: 1,
    explanation:
      'Regular relationships exist within a single storage island and allow the engine to use pre-computed join paths with optimised pushdown. When a relationship crosses storage islands (Import to DirectQuery, Direct Lake to Import, etc.) the engine cannot pre-compute the join — it becomes Limited. At query time, the engine materialises one side into a value list and passes that list as an IN-predicate to the other side, a pattern called "materialise and loop." The result is additional round-trips and latency. The key mitigation is to assign Dual mode to dimensions that bridge islands, converting cross-island queries back to Import-only work.',
    whyWrong: {
      0: 'Limited relationships do propagate filters — they just do so less efficiently, via runtime materialisation.',
      2: 'Gateway configuration does not change the Regular/Limited classification. The classification depends on storage mode, not connection method.',
      3: 'RLS boundaries are separate from the Limited/Regular distinction; Limited is a query-execution classification, not a security one.'
    },
    source: SRC_CMAG.compositeDocs,
    tags: ['composite-models', 'limited-relationships', 'directquery', 'cross-island', 'performance'],
    relatedIds: ['sme-004', 'sm-004'],
  }),

  // ── Composite Models — Direct Lake cannot be Dual ──────────────────

  single({
    id: 'cmag-003',
    domain: 'semantic',
    subtopic: 'composite-models',
    difficulty: 5,
    prompt:
      'A model architect wants to build a composite model with a Direct Lake fact table and several Import dimension tables. They propose setting the Direct Lake table to Dual storage mode so it can serve both as a cached copy and as a DirectQuery source. Is this valid?',
    options: [
      'Yes — any table in a composite model can be set to Dual mode regardless of its underlying storage',
      'No — Direct Lake tables cannot be set to Dual mode. Dual is only supported for Import and DirectQuery tables. A Direct Lake table falls back to DirectQuery under certain cross-island query conditions, but that fallback is not the same as Dual mode',
      'Yes, but only when the Fabric capacity is F64 or higher',
      'No — Direct Lake tables must always be set to Import in composite models'
    ],
    correct: 1,
    explanation:
      'Dual storage mode is a design-time setting applicable only to Import or DirectQuery tables. Direct Lake is a distinct storage mode with its own fallback semantics: when a query requires features not supported by Direct Lake (e.g., calculated columns on the table, or unsupported query patterns), the engine falls back to DirectQuery automatically. This fallback is NOT Dual mode — it cannot be configured, it cannot be "capped" at Import cache, and the table retains its Direct Lake classification. Attempting to explicitly set a Direct Lake table to Dual in the model properties is not a supported configuration.',
    whyWrong: {
      0: 'Dual is a specific mode with specific semantics (Import cache + DQ path). Direct Lake has a different architecture and its own fallback logic — they are not interchangeable.',
      2: 'Capacity SKU determines compute and memory limits; it does not change which storage modes are supported on a table.',
      3: 'Direct Lake tables do not have to be Import; they use the Direct Lake mode (delta file framing). Import is a different mode that copies data at refresh time.'
    },
    source: SRC_CMAG.dlCompositeDocs,
    tags: ['composite-models', 'direct-lake', 'dual', 'storage-modes', 'restrictions'],
    relatedIds: ['smpf-012'],
  }),

  // ── Composite Models — Chained composite restrictions ─────────────

  single({
    id: 'cmag-004',
    domain: 'semantic',
    subtopic: 'composite-models',
    difficulty: 5,
    prompt:
      'A team is building a "composite-on-composite" model — Model B is a Live Connection to a published composite semantic model (Model A), and Model B adds its own DirectQuery table. What is a key restriction of this chained composite pattern?',
    options: [
      'Chained composites are fully supported with no restrictions in Power BI Premium',
      'Model B cannot add new calculated tables that reference columns from Model A',
      'Model B inherits Model A\'s RLS roles automatically and cannot override them — any RLS defined in Model A is enforced transparently in Model B, and Model B cannot grant access to rows that Model A denies',
      'The DirectQuery table in Model B must use the same data source as the DirectQuery tables in Model A'
    ],
    correct: 2,
    explanation:
      'In chained composites (composite-on-composite), the security boundary of the upstream model is preserved by design: Model B cannot grant visibility to rows that Model A\'s RLS restricts. This is the chain-of-trust model — downstream models inherit and cannot loosen upstream security. This is critical for governance: an analyst with Contributor access to Model B cannot use that model to extract rows that their RLS role in Model A would deny. Other restrictions also apply (e.g., some DAX functions and calculated table patterns have limited support across the chain), but the security inheritance boundary is the most commonly tested restriction.',
    whyWrong: {
      0: 'Chained composites have several documented restrictions — security inheritance, limited DAX surface, and some write-back limitations.',
      1: 'Calculated tables in Model B can reference measures from Model A, though there are some constraints. This is not the primary/key restriction.',
      3: 'Model B\'s DirectQuery table can use a completely different data source from Model A\'s sources — that is a key reason to use chained composites.'
    },
    source: SRC_CMAG.securityCompositeDocs,
    tags: ['composite-models', 'chained-composite', 'composite-security', 'rls', 'chain-of-trust'],
  }),

  // ── Composite Models — Cross-source filter propagation ────────────

  multi({
    id: 'cmag-005',
    domain: 'semantic',
    subtopic: 'composite-models',
    difficulty: 5,
    prompt:
      'A composite model joins an Import DimRegion to both a DirectQuery FactSales (Source A: Azure SQL) and a DirectQuery FactBudget (Source B: Fabric Warehouse). A slicer on DimRegion is applied. Which statements about filter propagation are TRUE? Select all that apply.',
    options: [
      'DimRegion\'s Import cache can filter FactSales and FactBudget independently — the engine issues one SQL query to Source A and one to Source B, each with the appropriate IN-list filter',
      'Bidirectional filtering from FactSales back to DimRegion is always required for the slicer to work correctly',
      'The cross-source join (FactSales ↔ FactBudget) cannot be computed in a single SQL statement — the engine must materialise one result set and cross-join in memory',
      'Adding a bidirectional relationship between DimRegion and FactSales could inadvertently allow FactSales rows to filter FactBudget through DimRegion, producing unexpected results in visuals that display both facts'
    ],
    correct: [0, 2, 3],
    explanation:
      'In a composite with two DirectQuery sources and a shared Import dim: (A) The engine fans out separate source-specific queries, each filtered by the slicer\'s IN-list — this is the standard cross-source fan-out pattern. (B) Bidirectional filtering from the fact back to the dim is NOT required for a slicer to filter the fact; the slicer works via the existing dim→fact relationship. (C) A join BETWEEN FactSales and FactBudget (different sources) cannot be pushed to either source — the engine must bring one result set to memory. (D) Bidirectional from fact to shared dim creates a filter path from FactSales → DimRegion → FactBudget, which can silently cross-filter an unrelated fact — a classic composite model ambiguity trap.',
    whyWrong: {
      1: 'Bidirectional from fact to dim is NOT required for a slicer on the dim to filter the fact. The single-direction relationship (dim → fact) is sufficient for the slicer to propagate. Bidirectional is only needed when you want rows in the fact to filter the dim.'
    },
    source: SRC_CMAG.compositeDocs,
    tags: ['composite-models', 'cross-source', 'filter-propagation', 'bidirectional', 'composite-security'],
  }),

  // ── Aggregations — Managed vs user-defined ────────────────────────

  multi({
    id: 'cmag-006',
    domain: 'semantic',
    subtopic: 'managed-aggregations',
    difficulty: 4,
    prompt:
      'A Power BI Premium model has both managed (auto) aggregations and a user-defined aggregation table. Which statements correctly describe the differences between the two? Select all that apply.',
    options: [
      'Managed aggregations are generated automatically by Power BI based on query history; user-defined aggregations are created manually by the model author',
      'User-defined aggregations give the model author explicit control over grain, columns aggregated, and precedence; managed aggregations are opaque to the author',
      'Managed aggregations store data outside the semantic model in Fabric; user-defined aggregations store data inside the model as an Import table',
      'Both managed and user-defined aggregations use Import storage mode for the aggregation data',
      'Managed aggregations require a training period of query logging before they begin providing benefit'
    ],
    correct: [0, 1, 4],
    explanation:
      'Managed (auto) aggregations are a Power BI Premium feature that observes query patterns over a training period, then automatically generates and maintains aggregation caches — the author has no direct control over grain or columns. User-defined aggregations are explicit Import tables with manually configured column mappings and precedence values — the author fully controls the design. Both ultimately store aggregation data in Import/memory; managed aggs store their cache within the Premium capacity (not externally in Fabric storage). The training period (option E) is an accurate characteristic of managed aggs — there is a warm-up period before they become effective.',
    whyWrong: {
      2: 'Managed aggregation caches are stored within the Premium capacity as in-memory structures, not in a separate Fabric storage location. User-defined agg tables are Import tables within the semantic model itself.',
      3: 'While both ultimately use in-memory (Import-style) storage, the framing is imprecise. User-defined agg tables are explicitly Import tables. Managed aggs are internal Premium-capacity caches. The statement as written collapses an important distinction.'
    },
    source: SRC_CMAG.aggsDocs,
    tags: ['managed-aggregations', 'user-defined-aggregations', 'aggregations', 'auto-agg', 'training-period'],
  }),

  // ── Aggregations — DISTINCTCOUNT non-additivity + HLL ─────────────

  single({
    id: 'cmag-007',
    domain: 'semantic',
    subtopic: 'aggregations',
    difficulty: 5,
    prompt:
      'A model has a 1B-row FactEvents DirectQuery table. The team creates a user-defined aggregation table at the Date/Campaign grain that maps `DISTINCTCOUNT(FactEvents[UserID])` to `DISTINCTCOUNT(Agg[UserID])`. A report queries distinct user count at the Week grain (coarser than Date). Will the aggregation be used?',
    options: [
      'Yes — the query grain is coarser than the agg grain, so the engine uses the agg and sums the daily distinct counts to get the weekly figure',
      'No — DISTINCTCOUNT is non-additive. The weekly distinct user count cannot be derived by summing daily distinct counts (a user counted on two days is still one distinct user for the week). The query falls through to DirectQuery',
      'Yes, but only when the Date dim is marked as a Date Table',
      'No — DISTINCTCOUNT cannot be mapped in user-defined aggregations at all'
    ],
    correct: 1,
    explanation:
      'Distinct counts are non-additive: summing per-day DISTINCTCOUNT values gives you the sum of daily distinct users, not the count of DISTINCT users across the entire week. A user who appears on Monday AND Tuesday is counted twice in the daily sum but should count once for the week. Because the engine cannot re-aggregate DISTINCTCOUNT to a coarser grain, the query falls through to DirectQuery for any grain coarser than the exact grain at which the DISTINCTCOUNT was materialised. The workaround is to store a HyperLogLog (HLL) sketch in the aggregation table — HLL sketches ARE additive (they can be merged across time periods) and Power BI supports HLL-based approximate distinct counts in Premium workloads.',
    whyWrong: {
      0: 'This is the classic DISTINCTCOUNT additivity trap. Summing daily distinct counts does NOT yield the weekly distinct count because the same users appear across multiple days.',
      2: 'The marked Date Table setting affects time-intelligence functions, not aggregation matching rules.',
      3: 'DISTINCTCOUNT CAN be mapped in user-defined aggregations — but only queries at the EXACT grain can use it. Coarser-grain queries fall through. The statement "cannot be mapped at all" is incorrect.'
    },
    source: SRC_CMAG.aggsDocs,
    tags: ['aggregations', 'distinctcount', 'non-additive', 'hll', 'fallthrough', 'user-defined-aggregations'],
    relatedIds: ['smpf-007'],
  }),

  // ── Aggregations — Precedence ─────────────────────────────────────

  single({
    id: 'cmag-008',
    domain: 'semantic',
    subtopic: 'aggregations',
    difficulty: 4,
    prompt:
      'A model has two aggregation tables for FactSales: `Sales_Agg_Day` (grain: Date, Product — precedence 10) and `Sales_Agg_Month` (grain: Month, Category — precedence 20). A report queries at the Month/Category grain. Which aggregation does the engine use?',
    options: [
      'Sales_Agg_Day (precedence 10) — lower precedence is evaluated first',
      'Sales_Agg_Month (precedence 20) — when multiple aggregations match a query, the engine uses the one with the highest precedence value',
      'Both simultaneously — the engine averages the results',
      'The engine falls through to DirectQuery because multiple aggs match and the behavior is undefined'
    ],
    correct: 1,
    explanation:
      'When multiple user-defined aggregation tables could satisfy the same query, the engine selects the one with the highest precedence value. Precedence 20 beats precedence 10, so `Sales_Agg_Month` is used. This allows model authors to layer aggregations at different grains: a coarser agg (Month/Category) handles broad queries cheaply, while a finer agg (Date/Product) handles detailed queries that don\'t match the coarser agg. Authors assign higher precedence to coarser (smaller, faster) tables so they are preferred when they match, and the finer table serves as a fallback for more detailed queries.',
    whyWrong: {
      0: 'Lower precedence is NOT evaluated first. Higher precedence wins. This is the opposite of the rule.',
      2: 'The engine selects a single aggregation table per query — there is no averaging of multiple results.',
      3: 'The behavior when multiple aggs match is well-defined: highest precedence wins. There is no ambiguity or fallthrough.'
    },
    source: SRC_CMAG.aggsDocs,
    tags: ['aggregations', 'precedence', 'user-defined-aggregations', 'matching-rules'],
  }),

  // ── Aggregations — Aggregation hit rate metrics ───────────────────

  multi({
    id: 'cmag-009',
    domain: 'semantic',
    subtopic: 'aggregations',
    difficulty: 4,
    prompt:
      'A team has deployed a user-defined aggregation table and wants to measure whether it is actually being used. Which tools or techniques give reliable aggregation hit-rate metrics? Select all that apply.',
    options: [
      'DAX Studio — the query trace output includes a "Storage Engine Requests" section that shows whether the query hit the aggregation or fell through to DirectQuery',
      'Power BI Performance Analyzer in Desktop — the DAX query duration breakdown shows agg vs DQ contribution',
      'The Fabric Capacity Metrics app — the DirectQuery usage metric will decrease measurably when aggs are effective, providing an indirect signal',
      'SQL Server Profiler / Azure Monitor against the underlying DirectQuery source — a reduction in query volume to the source indicates agg hits are absorbing queries',
      'XMLA-based DMV queries against the semantic model — the `$System.DISCOVER_STORAGE_TABLES` DMV surfaces aggregation table usage metadata'
    ],
    correct: [0, 2, 3],
    explanation:
      'DAX Studio (option A) is the primary tool: its server timings and query traces explicitly show whether storage engine requests were satisfied from the aggregation cache or generated DirectQuery SQL. The Fabric Capacity Metrics app (option C) is an indirect but valid signal — a well-functioning agg reduces DQ operations visible in capacity metrics. Monitoring the DirectQuery source itself (option D) is a strong operational signal: if queries to the source drop after agg deployment, agg hits are working. Power BI Performance Analyzer (option B) shows total DAX query duration but does not break out agg vs DQ internally — it is not a reliable hit-rate tool. The `DISCOVER_STORAGE_TABLES` DMV (option E) provides storage table metadata but does not expose per-query hit/miss statistics.',
    whyWrong: {
      1: 'Performance Analyzer shows wall-clock query time but does not expose whether an aggregation was hit or the query fell through to DQ. Use DAX Studio for that level of detail.',
      4: 'DISCOVER_STORAGE_TABLES shows table structure and storage size. It does not contain hit-rate or per-query routing data.'
    },
    source: SRC_CMAG.aggsDocs,
    tags: ['aggregations', 'hit-rate', 'monitoring', 'dax-studio', 'capacity-metrics'],
  }),

  // ── Aggregations — Grain mismatch bug ─────────────────────────────

  single({
    id: 'cmag-010',
    domain: 'semantic',
    subtopic: 'user-defined-aggregations',
    difficulty: 4,
    prompt:
      'A model architect creates an aggregation table `Sales_Agg` with grain `DateKey, ProductKey` and maps `SUM(FactSales[Revenue])` to `SUM(Sales_Agg[Revenue])`. DAX Studio confirms the aggregation is NEVER hit — every query falls through to DirectQuery. The aggregation table contains data and is set to Import mode. What is the MOST LIKELY cause?',
    options: [
      'SUM aggregations are not supported in user-defined aggregation tables',
      'The aggregation relationship between Sales_Agg and DimDate (or DimProduct) is missing or misconfigured — without a relationship chain from the detail table\'s groupBy columns back to the agg table\'s groupBy columns, the engine cannot verify the grain match and falls through',
      'The aggregation table must be stored in DirectQuery mode to enable matching',
      'The aggregation table is too small — aggregations are only activated when the table exceeds 10 million rows'
    ],
    correct: 1,
    explanation:
      'This is the canonical "agg defined but never hit" bug. User-defined aggregation matching requires that every groupBy column in a query can be resolved to the aggregation table\'s grain via a relationship chain. If the agg table has `DateKey` and `ProductKey` columns but lacks explicit relationships to DimDate and DimProduct (or if the relationship cardinality is wrong), the engine cannot validate the grain and falls through to DirectQuery on every query. The fix is to ensure the agg table has correctly configured many-to-one relationships to all relevant dim tables, mirroring the relationship structure of the detail fact table.',
    whyWrong: {
      0: 'SUM is the most basic and fully supported aggregation type in user-defined agg mappings.',
      2: 'Aggregation tables must be Import mode to be effective. A DirectQuery agg table would just route the query to the same source — defeating the purpose entirely.',
      3: 'There is no documented minimum row-count threshold for aggregation activation. A well-configured agg on a 1,000-row summary table will be hit if the grain and relationships are correct.'
    },
    source: SRC_CMAG.aggsDocs,
    tags: ['aggregations', 'user-defined-aggregations', 'grain-mismatch', 'relationships', 'debugging'],
    relatedIds: ['smpf-005', 'smpf-006'],
  }),

  // ── Composite Security — per-source RLS ───────────────────────────

  multi({
    id: 'cmag-011',
    domain: 'semantic',
    subtopic: 'composite-security',
    difficulty: 5,
    prompt:
      'A composite semantic model connects to two data sources: Azure SQL DB (DirectQuery) and Fabric Lakehouse (Direct Lake). Both sources enforce their own Row-Level Security. Which statements about security in this composite model are TRUE? Select all that apply.',
    options: [
      'RLS defined in the Power BI semantic model (via USERPRINCIPALNAME() roles) applies uniformly across all tables regardless of their source',
      'The Azure SQL DB can enforce its own database-level RLS independently of the Power BI semantic model roles — if the gateway credentials are service-account-level, per-user SQL RLS may not fire',
      'Direct Lake tables respect OneLake (Fabric) security as the underlying data layer, but Power BI semantic model RLS applies as an additional layer on top of whatever the Direct Lake table exposes',
      'A user who is denied access to certain rows in the Azure SQL source cannot bypass that denial by querying through the composite Power BI model',
      'Composite model RLS roles always override OneLake table permissions, granting the semantic model\'s users full access to all OneLake data'
    ],
    correct: [1, 2, 3],
    explanation:
      'Composite model security is layered. (B) DirectQuery sources like Azure SQL can enforce their own database-level RLS via the gateway connection. If the gateway uses a service-account (shared credentials), per-user SQL RLS does not fire — all users see the service account\'s data view. This is the critical "gateway credential flattening" risk. (C) Direct Lake tables sit on OneLake Delta files; the underlying OneLake/Fabric security (workspace roles, item permissions) applies at the data layer, and Power BI RLS roles add a further restriction at the semantic layer. (D) The chain-of-trust model ensures that source-level denials are preserved — the semantic model cannot grant access beyond what the source permits. (A) is only partially true — Power BI RLS applies uniformly, but source-level security is independent and may have different coverage. (E) is false: Power BI RLS cannot expand permissions beyond what OneLake permits.',
    whyWrong: {
      0: 'Power BI semantic model RLS does apply uniformly, but it coexists with — and is constrained by — source-level security. Saying it applies "regardless of source" ignores that source-level RLS adds a second independent layer.',
      4: 'Composite model RLS cannot override or expand OneLake table permissions. The semantic model can only restrict what is already permitted by the underlying source.'
    },
    source: SRC_CMAG.securityCompositeDocs,
    tags: ['composite-security', 'rls', 'direct-lake', 'directquery', 'chain-of-trust', 'gateway'],
  }),

  // ── Aggregations — Hybrid table + agg interaction ─────────────────

  single({
    id: 'cmag-012',
    domain: 'semantic',
    subtopic: 'aggregations',
    difficulty: 5,
    prompt:
      'A hybrid table uses incremental refresh (3-year Import history, 7-day rolling refresh) plus a DirectQuery hot partition for real-time data. The model author also adds a user-defined aggregation table at the Month/Category grain. A report queries `SUM(Revenue)` for a date in the Import history range at the Month/Category grain. A second visual queries the same measure for a date within the past 24 hours (DirectQuery partition). What happens in each case?',
    options: [
      'Both queries use the aggregation table — the agg covers all partitions uniformly',
      'The first query (Import history) uses the aggregation table. The second query (recent 24 hours, DQ partition) falls through to the DirectQuery hot partition because the aggregation table, being Import, cannot contain data from the real-time DQ partition',
      'Both queries fall through to DirectQuery because the hybrid table invalidates aggregation matching',
      'The aggregation table only works for the current calendar month — any prior-month query falls through'
    ],
    correct: 1,
    explanation:
      'A hybrid table combines Import partitions (historical) with a single DirectQuery hot partition (recent data). User-defined aggregation tables are Import mode and are populated at refresh time — they contain pre-aggregated data for the same historical period covered by the Import partitions. When a query targets the Import history range and matches the agg grain, the agg is used (fast Import response). When a query targets the DirectQuery hot partition (e.g., the last 24 hours), the data is not in the agg table (which was last refreshed on the refresh schedule, not continuously). The engine detects that the required rows are in the DQ partition and falls through to the source for that partition. The net result is: Import history → agg-served, recent data → DirectQuery-served. This is the expected and documented behavior of hybrid table + agg combination.',
    whyWrong: {
      0: 'The agg table does not cover the DQ hot partition. The DQ partition is intentionally outside the agg because it contains data not yet in the Import snapshot.',
      2: 'Hybrid tables do not invalidate aggregation matching for the Import partitions. They coexist correctly.',
      3: 'Month grain is exactly what the agg is designed for. Prior months are well within the Import history window and are served from the agg.'
    },
    source: SRC_CMAG.hybridDocs,
    tags: ['aggregations', 'hybrid-tables', 'incremental-refresh', 'storage-modes', 'directquery'],
    relatedIds: ['smpf-025'],
  }),

  // ── Composite Models — Role-playing dimensions ────────────────────

  multi({
    id: 'cmag-013',
    domain: 'semantic',
    subtopic: 'composite-models',
    difficulty: 4,
    prompt:
      'A composite model has FactOrders (DirectQuery) and a shared DimDate (Import). FactOrders has two date FKs: OrderDate and ShipDate. The model author creates two inactive relationships from FactOrders to DimDate and uses USERELATIONSHIP in measures. Which complications arise specifically from the DirectQuery + Import cross-island context? Select all that apply.',
    options: [
      'USERELATIONSHIP activating an inactive relationship between a DirectQuery fact and an Import dim promotes the relationship to Regular for the duration of that CALCULATE',
      'The cross-island join (DirectQuery FactOrders ↔ Import DimDate) is a Limited relationship; activating the inactive variant via USERELATIONSHIP still produces a Limited relationship, not a Regular one',
      'Measures using USERELATIONSHIP on the inactive ShipDate relationship will route the DirectQuery SQL with a different date column predicate — the source must have an index on ShipDate or performance degrades significantly',
      'Having two inactive relationships to the same dim is not supported in composite models — only one relationship (active or inactive) per table pair is allowed'
    ],
    correct: [1, 2],
    explanation:
      'In a composite model, USERELATIONSHIP activates an inactive relationship for a calculation scope, but it does NOT change the relationship classification from Limited to Regular. A cross-island join (DirectQuery table ↔ Import table) is Limited by definition — the engine must materialise and loop regardless of which relationship variant is active. Additionally (option C), activating the ShipDate relationship means the DirectQuery SQL will include a WHERE clause on ShipDate instead of OrderDate — if the source database lacks an index on ShipDate, the DQ query will perform a full scan, causing visible performance degradation. These are real operational considerations for role-playing dimensions in composite models. Option A is incorrect (promotion to Regular does not happen). Option D is incorrect — multiple inactive relationships to the same dim are fully supported; having more than one ACTIVE relationship to the same table pair is what is prohibited.',
    whyWrong: {
      0: 'USERELATIONSHIP does not promote a Limited relationship to Regular. The classification is determined by storage mode crossing, not relationship activation state.',
      3: 'Multiple inactive relationships to the same table pair are a supported and common pattern (role-playing dimensions). Only having more than one ACTIVE relationship between the same two tables is prohibited.'
    },
    source: SRC_CMAG.compositeDocs,
    tags: ['composite-models', 'role-playing', 'userelationship', 'limited-relationships', 'directquery', 'performance'],
  }),

  // ── Aggregations — Dual dims + agg interaction ────────────────────

  single({
    id: 'cmag-014',
    domain: 'semantic',
    subtopic: 'storage-modes',
    difficulty: 4,
    prompt:
      'Why are dimension tables typically set to Dual storage mode in a composite model that uses user-defined aggregation tables?',
    options: [
      'Dual mode is required for a dim to participate in an aggregation table relationship — without Dual, the aggregation mapping cannot reference the dim',
      'Setting dims to Dual ensures that queries against the aggregation table (Import) can be fully resolved within the Import island, while the same dim can also serve DQ-side joins — without Dual, a query that uses the agg table would still trigger a DirectQuery call to resolve the dim',
      'Dual mode compresses dimension data more efficiently than pure Import mode',
      'Dual mode automatically updates the aggregation table when the dimension changes'
    ],
    correct: 1,
    explanation:
      'The Dual mode recommendation for dimension tables in composite + agg models comes from how aggregation matching works. The engine can use an aggregation table only when ALL tables involved in the query (both the agg and the dims) are resolvable from the Import island. If a dimension is Import-only, queries joining the agg to the dim stay fully in-memory. If a dimension is DirectQuery-only, even a query that hits the agg table must issue a DQ call to resolve dim attributes — defeating much of the agg\'s benefit. Dual dims satisfy both requirements: they are Import-side (keeping agg queries in-memory) and DQ-side (available for cross-island joins to the detail fact). This is why "DimDate and DimProduct as Dual" is the standard recommendation in composite + agg architectures.',
    whyWrong: {
      0: 'Dual mode is not required for aggregation relationships. A purely Import dim participates in agg relationships fine — Dual is a performance optimization, not a prerequisite.',
      2: 'Dual mode does not change compression characteristics. The Import cache in a Dual table uses the same VertiPaq compression as a pure Import table.',
      3: 'Dual mode has no automatic aggregation table refresh trigger. Aggregation tables are refreshed on the semantic model refresh schedule, independently of the dim\'s storage mode.'
    },
    source: SRC_CMAG.aggsDocs,
    tags: ['storage-modes', 'dual', 'aggregations', 'composite-models', 'import-island'],
    relatedIds: ['cmag-001', 'smpf-010'],
  }),

  // ── Ordering — Design a user-defined agg for a 1B-row Lakehouse ────

  order({
    id: 'cmag-015',
    domain: 'semantic',
    subtopic: 'user-defined-aggregations',
    difficulty: 4,
    prompt:
      'Order the five steps to correctly design and deploy a user-defined aggregation table for a 1B-row DirectQuery Lakehouse fact table in a Fabric semantic model.',
    options: [
      'Identify the target query grain (e.g., Date/Category) by analysing the most common report groupBy patterns and confirm which measures need to be pre-aggregated (SUM, COUNT, MIN/MAX — not raw DISTINCTCOUNT)',
      'Build the aggregation summary table in the Lakehouse or Dataflow at the target grain, including all required pre-aggregated columns, and load it as an Import table in the semantic model',
      'Configure the aggregation mappings in the semantic model: for each pre-aggregated column, define the summarisation (SUM→SUM, COUNT→COUNT), the detail column reference, and assign a precedence value higher than any other agg on the same detail table',
      'Set the dimension tables that join to both the detail fact and the aggregation table to Dual storage mode so agg-hitting queries resolve entirely in the Import island',
      'Validate the aggregation is being used: run representative report queries in DAX Studio, confirm SE requests go to the agg table (not generating DirectQuery SQL to the Lakehouse source), and monitor capacity DirectQuery metrics for reduction'
    ],
    shuffled: [
      'Build the aggregation summary table in the Lakehouse or Dataflow at the target grain, including all required pre-aggregated columns, and load it as an Import table in the semantic model',
      'Validate the aggregation is being used: run representative report queries in DAX Studio, confirm SE requests go to the agg table (not generating DirectQuery SQL to the Lakehouse source), and monitor capacity DirectQuery metrics for reduction',
      'Identify the target query grain (e.g., Date/Category) by analysing the most common report groupBy patterns and confirm which measures need to be pre-aggregated (SUM, COUNT, MIN/MAX — not raw DISTINCTCOUNT)',
      'Set the dimension tables that join to both the detail fact and the aggregation table to Dual storage mode so agg-hitting queries resolve entirely in the Import island',
      'Configure the aggregation mappings in the semantic model: for each pre-aggregated column, define the summarisation (SUM→SUM, COUNT→COUNT), the detail column reference, and assign a precedence value higher than any other agg on the same detail table'
    ],
    explanation:
      'The correct design sequence is: (1) Analyse query patterns first to choose the right grain and avoid DISTINCTCOUNT columns that will never match at coarser grains. (2) Build and load the summary table — without the physical data, the mapping in step 3 has nothing to point at. (3) Configure the aggregation mappings in the model — grain, summarisation type, and precedence. (4) Set dims to Dual so agg-hitting queries stay in the Import island without triggering DQ calls for the dim. (5) Validate with DAX Studio to confirm the agg is actually being hit before declaring the work done. Steps 3 and 4 could logically swap (dim mode can be set before or after configuring mappings), but the canonical guidance sequences them grain→data→mapping→dims→validate.',
    source: SRC_CMAG.aggsDocs,
    tags: ['user-defined-aggregations', 'aggregations', 'ordering', 'design', 'dax-studio', 'dual'],
    relatedIds: ['cmag-008', 'cmag-010', 'cmag-014', 'smpf-006'],
  }),

];
