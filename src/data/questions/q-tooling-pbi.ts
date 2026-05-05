// Power BI External Tooling & Authoring — 25 questions, IDs tlpb-001..tlpb-025.
//
// Subtopics:
//   tabular-editor         tlpb-001..005
//   best-practice-analyzer tlpb-006..008
//   dax-studio             tlpb-009..012
//   vertipaq-analyzer      tlpb-013..015
//   alm-toolkit            tlpb-016..018
//   bravo                  tlpb-019..020
//   pbi-desktop            tlpb-021..023
//   tooling (misc/xmla)    tlpb-024..025
//
// Type mix: 17 single, 7 multi, 1 ordering
//
// Sources:
//   learn.microsoft.com/power-bi/transform-model/desktop-external-tools
//   learn.microsoft.com/power-bi/enterprise/service-premium-connect-tools
//   tabulareditor.com/docs
//   daxstudio.org
//   almtoolkit.com
//   bravorator.com

import type { Question } from '../../lib/schema';
import { single, multi, order, SRC } from './_helpers';

export const toolingPbi: Question[] = [

  // ── Tabular Editor (5 Q) ──────────────────────────────────────────

  single({
    id: 'tlpb-001', domain: 'semantic', subtopic: 'tabular-editor', difficulty: 2,
    prompt: 'A developer needs to create a calculation group in a Power BI semantic model hosted on Microsoft Fabric. Which statement correctly describes the tooling requirement?',
    options: [
      'Power BI Desktop supports calculation group creation via the Modeling ribbon',
      'Tabular Editor 2 (free/open-source) or Tabular Editor 3 (paid) connected via the XMLA endpoint is the required path',
      'DAX Studio supports CREATE CALCULATION GROUP DDL syntax natively',
      'Only Tabular Editor 3 Pro license supports calculation groups — Tabular Editor 2 cannot create them'
    ],
    correct: 1,
    explanation: 'Power BI Desktop does not expose a native calculation group authoring UI. Tabular Editor — either the free open-source version 2 or the paid version 3 — is the standard tool. Both versions support creation and editing of calculation groups via the XMLA read/write endpoint. There is no DDL difference between TE2 and TE3 for this feature.',
    whyWrong: {
      0: 'Power BI Desktop lacks a "New Calculation Group" UI as of the current release; it must be authored externally.',
      2: 'DAX Studio is a query/analysis tool and has no DDL capabilities such as CREATE CALCULATION GROUP.',
      3: 'Tabular Editor 2 (free, open-source) fully supports calculation group creation; TE3 adds debugging/diagramming features but is not required for calc groups.'
    },
    source: SRC.xmla,
    tags: ['tabular-editor', 'calc-groups', 'tooling', 'xmla']
  }),

  single({
    id: 'tlpb-002', domain: 'semantic', subtopic: 'tabular-editor', difficulty: 2,
    prompt: 'Which of the following is a capability of Tabular Editor 3 (paid) that is NOT available in the free Tabular Editor 2?',
    options: [
      'Creating and editing calculation groups',
      'Connecting to a Fabric semantic model via the XMLA endpoint',
      'DAX debugger with step-through evaluation and expression analysis',
      'Applying Best Practice Analyzer rules from a JSON rule file'
    ],
    correct: 2,
    explanation: 'Tabular Editor 3 adds a DAX debugger that allows step-through evaluation of DAX expressions — a capability not present in the free Tabular Editor 2. Both TE2 and TE3 support calculation group authoring, XMLA endpoint connections, and running Best Practice Analyzer rules.',
    whyWrong: {
      0: 'Calculation group creation is available in both TE2 and TE3.',
      1: 'XMLA endpoint connectivity is available in both TE2 and TE3.',
      3: 'Best Practice Analyzer with JSON rule files is available in both TE2 and TE3.'
    },
    source: { category: 'external-tools-tabular-editor', note: 'Tabular Editor 2 vs 3 feature comparison' },
    tags: ['tabular-editor', 'dax-debugger', 'te2-vs-te3']
  }),

  single({
    id: 'tlpb-003', domain: 'semantic', subtopic: 'tabular-editor', difficulty: 3,
    prompt: 'A developer registers Tabular Editor as an External Tool in Power BI Desktop. When the developer clicks the Tabular Editor button on the External Tools ribbon, what connection does Tabular Editor open?',
    options: [
      'A connection to the Power BI Service using the user\'s cloud credentials',
      'A local Analysis Services instance that Power BI Desktop spins up on a dynamic port, exposing the in-memory model',
      'A DirectQuery passthrough to the underlying data source',
      'A read-only connection to the PBIX file on disk'
    ],
    correct: 1,
    explanation: 'Power BI Desktop hosts a local Analysis Services (AS) instance on a dynamic port for each open file. When an external tool is launched via the ribbon, Power BI passes the local AS connection string — including the dynamic port and database name — to the tool. Tabular Editor connects to this local instance, which represents the live in-memory model.',
    whyWrong: {
      0: 'Launching from Desktop connects to the local AS instance, not the Power BI Service. Service connections require separate configuration via the XMLA endpoint URL.',
      2: 'The local AS connection gives full TOM (Tabular Object Model) access, not a DirectQuery passthrough.',
      3: 'External tools connect to the live in-memory model process, not the PBIX file on disk. The PBIX is the serialization format.'
    },
    source: { category: 'external-tools-tabular-editor', note: 'Power BI Desktop local AS instance and External Tools ribbon' },
    tags: ['tabular-editor', 'pbi-desktop', 'external-tools', 'local-as']
  }),

  multi({
    id: 'tlpb-004', domain: 'semantic', subtopic: 'tabular-editor', difficulty: 3,
    prompt: 'A team manages a large Fabric semantic model and wants to use Tabular Editor for production deployments. Which statements are TRUE? Select all that apply.',
    options: [
      'Tabular Editor can connect to a Fabric semantic model via the XMLA endpoint URL for read/write operations',
      'The XMLA endpoint must be enabled at both the tenant level and the capacity/workspace level for Tabular Editor to connect',
      'Tabular Editor can save model changes directly to the Power BI Service model, making the edits visible to report consumers immediately',
      'Tabular Editor 2 can be used in a CI/CD pipeline as a command-line tool for scripted model deployments',
      'XMLA read/write access requires a Premium Per User (PPU), Premium Per Capacity (P-SKU), or Fabric (F-SKU) workspace'
    ],
    correct: [0, 1, 2, 3, 4],
    explanation: 'All five statements are true. TE connects to the service via the XMLA endpoint (A). The XMLA endpoint must be enabled at both tenant and capacity/workspace levels (B). Read/write XMLA allows direct model modifications that are immediately reflected in the service (C). TE2 ships with a command-line interface (`TabularEditor.exe /script`) enabling scripted deployments (D). XMLA read/write is only available on PPU, Premium, or Fabric-capacity workspaces (E).',
    whyWrong: {},
    source: SRC.xmla,
    tags: ['tabular-editor', 'xmla', 'deployment', 'cicd', 'premium']
  }),

  single({
    id: 'tlpb-005', domain: 'semantic', subtopic: 'tabular-editor', difficulty: 4,
    prompt: 'A developer is using Tabular Editor 3 connected to a Fabric semantic model via XMLA. They want to add a new hidden column to a table, create a measure that references it, and test the DAX expression — all before saving changes to the service. Which TE3 feature enables testing the measure before committing?',
    options: [
      'Best Practice Analyzer — it validates DAX expressions before save',
      'The DAX Debugger / DAX Script window — allows executing DAX queries against the live model in the same session before publishing changes',
      'The Deployment Wizard — stages changes in a sandbox before pushing to production',
      'VertiPaq Analyzer — verifies that the new measure does not increase model size'
    ],
    correct: 1,
    explanation: 'Tabular Editor 3 includes an integrated DAX script/query window and debugger that connects to the same local or service model. A developer can add model objects in TE3, then immediately run DAX queries against the (unsaved) model state to validate results before committing changes via File → Save or applying to the XMLA endpoint.',
    whyWrong: {
      0: 'Best Practice Analyzer checks model design rules (naming conventions, anti-patterns) — it does not execute or validate DAX return values.',
      2: 'TE3 has no "Deployment Wizard" in the same sense as ALM Toolkit; ALM Toolkit is the dedicated tool for staged model deployment.',
      3: 'VertiPaq Analyzer reports storage metrics; it does not test DAX expression logic.'
    },
    source: { category: 'external-tools-tabular-editor', note: 'Tabular Editor 3 DAX debugger and integrated query window' },
    tags: ['tabular-editor', 'dax-debugger', 'te3', 'testing']
  }),

  // ── Best Practice Analyzer (3 Q) ─────────────────────────────────

  single({
    id: 'tlpb-006', domain: 'semantic', subtopic: 'best-practice-analyzer', difficulty: 2,
    prompt: 'Where is the Best Practice Analyzer (BPA) built into, and what is its primary purpose?',
    options: [
      'DAX Studio — it analyzes the performance of DAX queries and suggests rewrites',
      'Tabular Editor (both TE2 and TE3) — it scans model objects against a configurable rule set and flags violations that indicate design, naming, or performance issues',
      'Power BI Desktop — it runs on every Save and blocks publish if rules are violated',
      'VertiPaq Analyzer — it identifies columns that violate cardinality thresholds'
    ],
    correct: 1,
    explanation: 'Best Practice Analyzer is a feature integrated into Tabular Editor (available in both TE2 and TE3). It evaluates model objects — tables, columns, measures, relationships — against a configurable JSON rule set and surfaces violations. Microsoft and the community (SQLBI) publish recommended rule sets covering naming conventions, hidden-column hygiene, formatting, RLS configuration, and performance anti-patterns.',
    whyWrong: {
      0: 'DAX Studio has Server Timings and query plan analysis; BPA is a separate Tabular Editor feature.',
      2: 'Power BI Desktop does not include BPA; there is no save-blocking rule engine built into Desktop.',
      3: 'VertiPaq Analyzer reports storage metrics such as cardinality and dictionary sizes; it does not apply a rule set to flag design violations.'
    },
    source: { category: 'external-tools-tabular-editor', note: 'Best Practice Analyzer in Tabular Editor' },
    tags: ['best-practice-analyzer', 'tabular-editor', 'model-quality']
  }),

  multi({
    id: 'tlpb-007', domain: 'semantic', subtopic: 'best-practice-analyzer', difficulty: 3,
    prompt: 'A governance team wants to enforce model quality via Best Practice Analyzer rules integrated into the deployment pipeline. Which rule categories are typically available in the Microsoft/SQLBI community BPA rule sets? Select all that apply.',
    options: [
      'Naming conventions — e.g., measures should not start with a lowercase letter',
      'Performance anti-patterns — e.g., columns with no downstream usage should be hidden or removed',
      'RLS configuration — e.g., tables that carry sensitive data but have no RLS role defined',
      'DAX syntax validation — e.g., mismatched parentheses in measure expressions',
      'Formatting — e.g., measures without explicit format strings'
    ],
    correct: [0, 1, 2, 4],
    explanation: 'BPA rule sets commonly cover naming conventions (A), performance flags like unused visible columns (B), security/RLS configuration gaps (C), and formatting standards such as missing format strings (E). DAX syntax validation (D) is handled by the Tabular Editor parser itself and by DAX Studio — not a BPA rule category.',
    whyWrong: {
      3: 'DAX syntax errors are caught by the inline parser in Tabular Editor and DAX Studio — they are not a BPA rule category. BPA operates on model-object properties, not raw DAX text parsing.'
    },
    source: { category: 'external-tools-tabular-editor', note: 'BPA rule categories — Microsoft and SQLBI rule packs' },
    tags: ['best-practice-analyzer', 'governance', 'rls', 'performance', 'naming']
  }),

  single({
    id: 'tlpb-008', domain: 'semantic', subtopic: 'best-practice-analyzer', difficulty: 4,
    prompt: 'A developer runs Best Practice Analyzer on a model and sees a rule violation: "Do not use floating point data types." The column in question is a financial Amount column currently typed as Double. What is the recommended fix, and why?',
    options: [
      'Change the column type to Currency (fixed decimal, 4 decimal places) — floating point accumulates rounding errors in financial aggregations',
      'Change the column type to Whole Number — financial amounts do not need decimals',
      'Suppress the BPA rule — Double is the standard for all numeric analysis in Power BI',
      'Change the column type to Text and re-parse in DAX — this avoids floating-point rounding'
    ],
    correct: 0,
    explanation: 'Floating-point (Double) types use binary representation that can introduce rounding errors when summing large sets of financial values. The recommended type for financial amounts is Currency (Decimal Number with fixed precision — 4 decimal places internally), which uses a scaled integer representation and avoids the accumulation of floating-point errors in SUM operations.',
    whyWrong: {
      1: 'Whole Number truncates cent-precision values and is unsuitable for financial amounts that require decimal precision.',
      2: 'Double / floating-point is explicitly flagged as a BPA violation for financial columns due to known rounding accumulation; the rule exists for good reason and should not be suppressed without justification.',
      3: 'Storing numbers as Text converts all aggregation to slow text operations and forces DAX type-coercion; this is far worse than Double.'
    },
    source: { category: 'external-tools-tabular-editor', note: 'BPA rule: avoid floating-point for financial data' },
    tags: ['best-practice-analyzer', 'data-types', 'currency', 'rounding', 'perf']
  }),

  // ── DAX Studio (4 Q) ─────────────────────────────────────────────

  single({
    id: 'tlpb-009', domain: 'semantic', subtopic: 'dax-studio', difficulty: 2,
    prompt: 'A report developer sees slow visuals and suspects inefficient DAX. They use DAX Studio with Server Timings enabled. The results show a high Storage Engine (SE) duration and a low Formula Engine (FE) duration. What does this indicate?',
    options: [
      'The measure contains complex CALCULATE logic that should be rewritten',
      'The bottleneck is in scanning/reading data from the VertiPaq column store — consider reducing column cardinality, adding aggregations, or reviewing relationship fanout',
      'The FE is waiting on external data — switch the model to Import mode',
      'Server Timings cannot distinguish SE vs FE time; the breakdown is cosmetic'
    ],
    correct: 1,
    explanation: 'In DAX Studio Server Timings, Storage Engine time represents the cost of scanning VertiPaq column stores to fulfill data cache requests. High SE / low FE means the formula logic is efficient but the raw data scan is expensive — typically due to high-cardinality columns, large row counts, relationship fanout, or missing aggregations. The fix is on the storage/model side, not in DAX rewriting.',
    whyWrong: {
      0: 'High FE duration would indicate complex formula logic; high SE points to data scanning, not formula complexity.',
      2: 'SE time exists in both Import and DirectQuery models; the concern here is VertiPaq column store scan time, not an external source issue.',
      3: 'SE vs FE breakdown is a real and actionable metric — it is the foundation of DAX performance diagnosis in DAX Studio.'
    },
    source: SRC.daxPerf,
    tags: ['dax-studio', 'server-timings', 'se-fe', 'performance']
  }),

  single({
    id: 'tlpb-010', domain: 'semantic', subtopic: 'dax-studio', difficulty: 3,
    prompt: 'A developer uses DAX Studio\'s "Export Data" feature to capture query results from a Fabric semantic model. Which connection prerequisite must be met?',
    options: [
      'The developer must have Contributor or higher workspace role AND the XMLA endpoint must be enabled for read access on the workspace',
      'The developer must be a Fabric capacity administrator',
      'Export Data requires a DirectQuery model — Import mode models cannot be queried via XMLA',
      'DAX Studio Export requires a paid DAX Studio Pro license'
    ],
    correct: 0,
    explanation: 'DAX Studio connects to Fabric/Power BI Service semantic models via the XMLA endpoint. The XMLA endpoint must be enabled at the tenant and capacity/workspace level, and the connecting user needs at least Contributor workspace permissions (or Build access to the semantic model item) to run queries. No elevated capacity admin role is required for standard query operations.',
    whyWrong: {
      1: 'Capacity admin role is not required for querying a model via XMLA; workspace Contributor or semantic model Build permission is sufficient.',
      2: 'DAX Studio queries work against Import, DirectQuery, Composite, and Direct Lake models alike — there is no Import-mode restriction.',
      3: 'DAX Studio is free and open-source; there is no "DAX Studio Pro" paid tier as of the current release.'
    },
    source: SRC.xmla,
    tags: ['dax-studio', 'xmla', 'permissions', 'fabric']
  }),

  multi({
    id: 'tlpb-011', domain: 'semantic', subtopic: 'dax-studio', difficulty: 3,
    prompt: 'Which of the following tasks can DAX Studio perform? Select all that apply.',
    options: [
      'Run DAX queries against a Power BI Desktop model or a Power BI Service model via XMLA',
      'View query plans (physical and logical) for a DAX expression',
      'Capture Server Timings to analyze Storage Engine vs Formula Engine cost breakdown',
      'Create new measures and calculated columns in the model',
      'View VertiPaq statistics including column cardinality and dictionary sizes',
      'Format DAX code for readability using the built-in DAX formatter'
    ],
    correct: [0, 1, 2, 4, 5],
    explanation: 'DAX Studio supports querying models (A), query plan inspection (B), Server Timings SE/FE breakdown (C), VertiPaq statistics via the embedded VertiPaq Analyzer view (D — option E at index 4), and DAX formatting (F — option at index 5). It does NOT support model DDL changes such as creating measures or calculated columns (index 3 — that is a Tabular Editor function).',
    whyWrong: {
      3: 'DAX Studio is a read-only query and analysis tool. Creating or modifying model objects (measures, columns, tables) requires Tabular Editor or the Power BI Service model editor.'
    },
    source: SRC.daxPerf,
    tags: ['dax-studio', 'capabilities', 'query-plans', 'vertipaq']
  }),

  single({
    id: 'tlpb-012', domain: 'semantic', subtopic: 'dax-studio', difficulty: 3,
    prompt: 'A developer uses Power BI Desktop\'s built-in Performance Analyzer to capture a visual\'s DAX query, then pastes it into DAX Studio for deeper analysis. What additional insight does DAX Studio provide that the Desktop Performance Analyzer cannot?',
    options: [
      'The total visual render time including JSON serialization',
      'Storage Engine query plans, SE/FE duration breakdown, and the ability to inspect individual cache events with their row counts',
      'Which users triggered the slow query in the Power BI Service',
      'Whether the data source gateway is causing latency'
    ],
    correct: 1,
    explanation: 'Power BI Desktop\'s Performance Analyzer shows the DAX query text and total DAX duration — a useful starting point. DAX Studio goes further: with Server Timings enabled it captures individual SE (Storage Engine) cache events, physical/logical query plans, and the FE vs SE time split. This granularity pinpoints whether the bottleneck is in data scanning, join materialization, or formula engine evaluation.',
    whyWrong: {
      0: 'Visual render time (JSON serialization, rendering) is shown by the Desktop Performance Analyzer, not DAX Studio — DAX Studio focuses on the query side.',
      2: 'DAX Studio connects to a model for analysis; it does not access service-side user audit logs.',
      3: 'Gateway latency is a data source connectivity concern visible in the Power BI Service refresh history or gateway logs — not in DAX Studio query analysis.'
    },
    source: SRC.daxPerf,
    tags: ['dax-studio', 'performance-analyzer', 'server-timings', 'se-fe', 'pbi-desktop']
  }),

  // ── VertiPaq Analyzer (3 Q) ───────────────────────────────────────

  single({
    id: 'tlpb-013', domain: 'semantic', subtopic: 'vertipaq-analyzer', difficulty: 2,
    prompt: 'A developer opens VertiPaq Analyzer (within DAX Studio) for a 2 GB semantic model and wants to identify which columns are consuming the most storage. Which metric should they sort by?',
    options: [
      'Column Cardinality — higher cardinality always means more storage',
      'Dictionary Size + Data Size combined (total column storage) — sort descending to find the largest consumers',
      'Relationship Count — more relationships indicate more storage',
      'Hierarchy Levels — deeper hierarchies cause proportionally larger dictionaries'
    ],
    correct: 1,
    explanation: 'VertiPaq Analyzer reports each column\'s Dictionary Size (the unique value encoding), Data Size (the encoded column data), and Hierarchy Size. Sorting by the sum of Dictionary + Data Size descending identifies the columns contributing most to model footprint. Cardinality alone does not tell the full story — a high-cardinality integer column may compress better than a moderate-cardinality long-string column.',
    whyWrong: {
      0: 'Cardinality is a driver of dictionary size but the two are not linearly correlated. A high-cardinality column with integers may compress far better than a moderate-cardinality column with long strings. Use actual size metrics.',
      2: 'Relationship count describes the model topology and does not directly map to storage consumption.',
      3: 'Hierarchies add a modest overhead, but the dominant storage cost is in column dictionaries and data. Hierarchy levels are rarely the largest storage consumer.'
    },
    source: { category: 'vertipaq-analyzer', note: 'Column storage breakdown: dictionary size, data size, hierarchy size' },
    tags: ['vertipaq-analyzer', 'storage', 'cardinality', 'optimization']
  }),

  multi({
    id: 'tlpb-014', domain: 'semantic', subtopic: 'vertipaq-analyzer', difficulty: 3,
    prompt: 'A developer is investigating a 4 GB semantic model that should be closer to 500 MB based on source row counts. Which VertiPaq Analyzer findings would indicate root causes to investigate? Select all that apply.',
    options: [
      'A DateTime column in a fact table with cardinality in the millions (timestamp-precision values)',
      'A free-text description column with average value length of 400 characters and cardinality equal to row count',
      'A Date dimension with a surrogate key integer column of cardinality 3,650',
      'A Status column of type Text with 6 distinct values but stored without a dictionary encoding optimization',
      'Multiple tables that are fully loaded into Import mode but are only used by a single rarely-accessed report page'
    ],
    correct: [0, 1, 4],
    explanation: 'Timestamp-precision DateTime columns (A) cause cardinality explosions that bloat dictionaries. Free-text columns with near-unique values (B) create massive dictionaries because VertiPaq stores every unique string. Large Import-mode tables used by rarely-accessed pages (E) inflate model size with low-benefit data. A Date dim surrogate integer with 3,650 values (C) is normal and well-compressed. A low-cardinality Status column (D) compresses very efficiently regardless of type — VertiPaq is optimized for low-cardinality categorical columns.',
    whyWrong: {
      2: 'A Date dim surrogate key with 3,650 unique integers (roughly 10 years daily) is a normal, low-cardinality column that compresses efficiently — it is not a bloat concern.',
      3: 'A Text column with only 6 distinct values is a low-cardinality categorical — VertiPaq excels at encoding these compactly. This is not a storage concern.'
    },
    source: { category: 'vertipaq-analyzer', note: 'Identifying storage bloat: timestamp cardinality, free text, unused tables' },
    tags: ['vertipaq-analyzer', 'storage', 'cardinality', 'optimization', 'datetime']
  }),

  single({
    id: 'tlpb-015', domain: 'semantic', subtopic: 'vertipaq-analyzer', difficulty: 3,
    prompt: 'VertiPaq Analyzer reports a "Segments" count per table. What does a high segment count on a single table typically indicate, and what performance implication does it have?',
    options: [
      'The table has many relationships — each relationship creates a segment',
      'The table data is distributed across many compression chunks, often due to high cardinality or an unsorted column — the Storage Engine must scan more segments per query, increasing SE time',
      'The table has many calculated columns — each column is stored as its own segment',
      'Segments represent RLS roles applied to the table — more roles means more segments'
    ],
    correct: 1,
    explanation: 'VertiPaq partitions tables into segments (internal compression chunks, typically ~8 million rows each). Within a segment, columns are stored in value encoding or run-length encoding (RLE). A high segment count relative to row count, or poor compression ratios within segments, often stems from high-cardinality or unsorted data that prevents effective RLE. The SE must scan each segment independently, so a fragmented table increases Storage Engine time per query.',
    whyWrong: {
      0: 'Relationships are model-level metadata stored separately; they do not create column segments.',
      2: 'Each column is stored as its own column store — not segments in the table sense. Segment count relates to the table\'s row partitioning, not column count.',
      3: 'RLS roles are security metadata; they do not create storage segments.'
    },
    source: { category: 'vertipaq-analyzer', note: 'Segment count and VertiPaq compression mechanics' },
    tags: ['vertipaq-analyzer', 'segments', 'storage-engine', 'compression', 'performance']
  }),

  // ── ALM Toolkit (3 Q) ────────────────────────────────────────────

  single({
    id: 'tlpb-016', domain: 'semantic', subtopic: 'alm-toolkit', difficulty: 2,
    prompt: 'A team uses a dev/test/prod deployment pipeline for their Fabric semantic model. They want to promote ONLY a specific new measure and a modified relationship from the development model to test, without overwriting other test-model changes. Which tool supports this selective schema merge?',
    options: [
      'Power BI Deployment Pipelines — it automatically detects and applies individual object changes',
      'ALM Toolkit — it shows a diff between source and target models and lets users select individual objects to deploy',
      'Tabular Editor Deployment Wizard — it publishes the full model and cannot exclude individual objects',
      'DAX Studio Sync — it replicates query results but not model object definitions'
    ],
    correct: 1,
    explanation: 'ALM Toolkit (Application Lifecycle Management Toolkit) is purpose-built for semantic model schema differencing and selective deployment. It compares two models (source vs target, by live connection or BISM file) and presents an object-level diff — tables, measures, relationships, etc. The user can check or uncheck individual objects before applying, enabling surgical promotions that preserve changes already in the target.',
    whyWrong: {
      0: 'Power BI Deployment Pipelines deploy the entire semantic model item; they do not support selective object-level merges.',
      2: 'Tabular Editor\'s save-to-server action publishes the full model TOM; for selective deployment, ALM Toolkit is the right tool.',
      3: 'DAX Studio has no model schema synchronization or deployment capability; it is a query and analysis tool.'
    },
    source: { category: 'alm-toolkit', note: 'ALM Toolkit schema diff and selective object deployment' },
    tags: ['alm-toolkit', 'deployment', 'schema-diff', 'selective-merge']
  }),

  single({
    id: 'tlpb-017', domain: 'semantic', subtopic: 'alm-toolkit', difficulty: 3,
    prompt: 'An ALM Toolkit schema comparison shows a table as "Different" between the dev and production models. The developer wants to update the production measures in that table but leave the production table\'s RLS roles untouched. What ALM Toolkit behavior enables this?',
    options: [
      'ALM Toolkit cannot exclude RLS roles from a deployment — all objects in a changed table are deployed together',
      'ALM Toolkit expands each table into child objects (measures, columns, RLS roles, etc.) allowing the developer to select only the measures for deployment while deselecting the roles node',
      'RLS roles are stored externally in the Power BI Service and are never touched by ALM Toolkit',
      'The developer should use Power BI Deployment Pipeline rules to block role updates'
    ],
    correct: 1,
    explanation: 'ALM Toolkit displays the model diff as a hierarchical tree. A changed table expands to show its child objects: measures, columns, partitions, hierarchies, and roles. The developer can deselect the RLS Roles node while selecting only the Measures node, deploying the measure updates while leaving the production roles intact. This granular control is the primary reason ALM Toolkit is preferred over full-model deployments for complex pipelines.',
    whyWrong: {
      0: 'ALM Toolkit supports object-level selection within changed tables — this is a core feature, not a limitation.',
      2: 'Table-level roles defined in the model ARE part of the model TOM and appear in the ALM Toolkit diff. Workspace-level permissions are separate, but model roles are model objects.',
      3: 'Deployment pipeline rules can parameterize data source connections and other properties, but they do not provide granular model-object exclusion logic like ALM Toolkit does.'
    },
    source: { category: 'alm-toolkit', note: 'ALM Toolkit hierarchical diff tree and RLS role exclusion' },
    tags: ['alm-toolkit', 'rls', 'schema-diff', 'selective-deploy']
  }),

  multi({
    id: 'tlpb-018', domain: 'semantic', subtopic: 'alm-toolkit', difficulty: 4,
    prompt: 'A data engineering team integrates ALM Toolkit into an automated CI/CD pipeline using its command-line interface. Which statements about ALM Toolkit CLI usage are TRUE? Select all that apply.',
    options: [
      'ALM Toolkit can be invoked from the command line with a BIM (JSON model definition) file as the source and an XMLA endpoint as the target',
      'The CLI supports a "-deploy" flag that applies all differences from source to target without user interaction',
      'ALM Toolkit CLI can generate a diff report without deploying, enabling review steps in the pipeline before changes are promoted',
      'ALM Toolkit requires a GUI session; it has no CLI mode and cannot be automated',
      'ALM Toolkit CLI deployments require an Azure Service Principal with semantic model write access on the target workspace'
    ],
    correct: [0, 1, 2, 4],
    explanation: 'ALM Toolkit CLI accepts BIM source files and XMLA endpoints as targets (A). It supports unattended full deployment via CLI flags (B). A diff-only/report mode is available to support pipeline review gates (C). CLI mode is fully supported — there is no GUI requirement (D is false). Service principal authentication with semantic model write permissions is required for unattended deployments (E).',
    whyWrong: {
      3: 'ALM Toolkit has a well-documented CLI mode that enables automation and CI/CD integration without a GUI session. This is a primary use case for the tool in enterprise pipelines.'
    },
    source: { category: 'alm-toolkit', note: 'ALM Toolkit CLI flags, BIM files, XMLA endpoint deployment, service principal' },
    tags: ['alm-toolkit', 'cicd', 'cli', 'service-principal', 'automation']
  }),

  // ── Bravo (2 Q) ──────────────────────────────────────────────────

  single({
    id: 'tlpb-019', domain: 'semantic', subtopic: 'bravo', difficulty: 2,
    prompt: 'A Power BI report author wants to quickly identify all columns in their semantic model that are visible in the Fields pane but have no measures, visuals, or relationships referencing them — and then hide those columns. Which tool is best suited for this task?',
    options: [
      'DAX Studio — run a query against SYSTEMRESTRICTSCHEMA() to list unreferenced columns',
      'Bravo for Power BI — the "Analyze Model" feature surfaces unused fields and provides a one-click workflow to hide them',
      'Tabular Editor BPA — add a custom rule to flag columns with no downstream usage',
      'Power BI Desktop — the Modeling view highlights unused columns with a warning icon'
    ],
    correct: 1,
    explanation: 'Bravo for Power BI is a free community tool specifically designed for accessible model optimization tasks. Its "Analyze Model" feature scans for columns that are visible but have no downstream references (no measures, visuals, or relationships use them) and presents a clear list with a workflow to bulk-hide them. While TE BPA or DAX Studio queries can also identify unused columns, Bravo provides the most accessible, purpose-built experience for this task.',
    whyWrong: {
      0: 'DAX Studio can query metadata but requires writing DMV queries (e.g., against $SYSTEM.DISCOVER_CALC_DEPENDENCY) — it is not the most accessible path for this operational task.',
      2: 'Tabular Editor BPA requires configuring a custom rule; Bravo performs this analysis out of the box with no rule configuration.',
      3: 'Power BI Desktop Modeling view does not natively flag unreferenced columns with warning icons. Column usage analysis requires external tooling.'
    },
    source: { category: 'bravo-for-pbi', note: 'Bravo Analyze Model — unused column detection and hide workflow' },
    tags: ['bravo', 'unused-columns', 'model-optimization', 'tooling']
  }),

  multi({
    id: 'tlpb-020', domain: 'semantic', subtopic: 'bravo', difficulty: 3,
    prompt: 'A developer uses Bravo for Power BI on a model. Which tasks does Bravo support natively? Select all that apply.',
    options: [
      'Format DAX measures for readability using the DAX Formatter service',
      'Manage date tables — create a custom date table or identify an existing date column for time intelligence',
      'Export model data to Excel for validation purposes',
      'Identify unused columns and hidden fields that add unnecessary model weight',
      'Deploy the model to a different workspace via the XMLA endpoint'
    ],
    correct: [0, 1, 3],
    explanation: 'Bravo\'s core capabilities are: DAX formatting via the integrated DAX Formatter service (A), date table management — scanning for date columns and offering to create/annotate a date table (B), and unused-column analysis (D). Bravo does not export model data to Excel (C — use Analyze in Excel or DAX Studio for that) and does not deploy model definitions to workspaces (E — that is ALM Toolkit\'s domain).',
    whyWrong: {
      2: 'Bravo does not export model data. Data export from a semantic model uses Analyze in Excel, DAX Studio, or Power BI Service export features.',
      4: 'XMLA endpoint model deployment is handled by ALM Toolkit or Tabular Editor — Bravo does not support model publishing to a workspace.'
    },
    source: { category: 'bravo-for-pbi', note: 'Bravo capabilities: DAX format, date table, analyze model' },
    tags: ['bravo', 'dax-formatter', 'date-table', 'model-optimization']
  }),

  // ── Power BI Desktop (3 Q) ────────────────────────────────────────

  single({
    id: 'tlpb-021', domain: 'semantic', subtopic: 'pbi-desktop', difficulty: 2,
    prompt: 'Which of the following modeling actions CANNOT be performed using Power BI Desktop\'s native authoring UI, requiring an external tool such as Tabular Editor?',
    options: [
      'Creating a measure with a DAX expression',
      'Setting a table as the Date Table for time intelligence',
      'Creating a calculation group',
      'Defining a many-to-many relationship between two tables'
    ],
    correct: 2,
    explanation: 'Power BI Desktop natively supports measure creation, date table marking, and all relationship types including many-to-many. Calculation groups are the notable exception — Desktop does not expose a creation UI for them. They must be created via Tabular Editor (or the Power BI web-based model explorer where available) and committed via the XMLA endpoint.',
    whyWrong: {
      0: 'Measure creation is a core Power BI Desktop feature available in the Modeling ribbon and Fields pane context menu.',
      1: 'Marking a table as the Date Table is available in the Desktop Table Tools ribbon.',
      3: 'Many-to-many relationships can be configured in the Desktop Manage Relationships dialog by setting cardinality to Many-to-many.'
    },
    source: { category: 'pbi-desktop-limitations', note: 'Power BI Desktop: no native calculation group UI' },
    tags: ['pbi-desktop', 'calc-groups', 'limitations', 'tabular-editor']
  }),

  single({
    id: 'tlpb-022', domain: 'semantic', subtopic: 'pbi-desktop', difficulty: 3,
    prompt: 'A developer opens Power BI Desktop\'s Performance Analyzer and records a slow visual. The output shows "DAX query: 8,450ms" and "Other: 120ms." Where should they focus first?',
    options: [
      'The "Other" time — this represents network latency and should be reduced by moving to Premium',
      'The DAX query time — copy the query from Performance Analyzer and analyze it in DAX Studio with Server Timings to identify whether SE or FE is the bottleneck',
      'Reduce the number of visuals on the page — page complexity always causes slow visuals',
      'Enable Import mode — the slow time indicates a DirectQuery model that should be converted'
    ],
    correct: 1,
    explanation: 'When DAX query time dominates the Performance Analyzer output, the next step is to copy the captured DAX query and run it in DAX Studio with Server Timings enabled. This identifies whether the cost is in the Storage Engine (data scanning — fix via model optimization) or Formula Engine (DAX logic — fix via measure rewrite). Performance Analyzer\'s role is triage; DAX Studio provides the detailed diagnostic.',
    whyWrong: {
      0: '"Other" in Performance Analyzer represents visual rendering time (rendering the SVG/chart elements), not network latency. 120ms is a normal value and not the concern here.',
      2: 'Page complexity can contribute to render time, but the 8,450ms DAX query is the dominant bottleneck. Reducing visuals will not help a fundamentally slow measure.',
      3: 'The query time does not indicate a storage mode. Import models can also produce slow DAX queries if the DAX or model design is inefficient.'
    },
    source: SRC.daxPerf,
    tags: ['pbi-desktop', 'performance-analyzer', 'dax-studio', 'server-timings', 'workflow']
  }),

  single({
    id: 'tlpb-023', domain: 'semantic', subtopic: 'pbi-desktop', difficulty: 3,
    prompt: 'A developer is working on a .pbip (Power BI Project) file format report stored in a git repository. They want to make model changes directly. What is the key advantage of .pbip format over .pbix for this workflow?',
    options: [
      '.pbip files are smaller because they compress data with a proprietary algorithm',
      '.pbip stores the semantic model as human-readable JSON/TMDL files in a folder, enabling meaningful git diffs and merge workflows for model changes alongside code review',
      '.pbip files allow the report to run without Power BI Desktop installed',
      '.pbip disables the XMLA endpoint requirement, enabling direct cloud edits without Premium'
    ],
    correct: 1,
    explanation: 'The Power BI Project (.pbip) format decomposes the PBIX binary into a folder of source files — report layout JSON, semantic model definition as TMDL (Tabular Model Definition Language) or model.bim JSON, and dataset metadata. This makes every model change diffable in git, enabling pull request reviews, branch comparisons, and conflict resolution for semantic model authoring — a major ALM improvement over the opaque PBIX binary.',
    whyWrong: {
      0: '.pbip format typically results in LARGER on-disk size for complex models because the binary compression of PBIX is replaced by readable text files. The advantage is source control, not file size.',
      2: 'Power BI Desktop (or the Fabric web editor) is still required to open and edit .pbip files; the format does not enable standalone execution.',
      3: '.pbip format is orthogonal to the XMLA endpoint. Premium/Fabric capacity is still required for XMLA write access to published models.'
    },
    source: SRC.pbip,
    tags: ['pbi-desktop', 'pbip', 'source-control', 'git', 'tmdl']
  }),

  // ── Tooling / XMLA / misc (2 Q) ──────────────────────────────────

  multi({
    id: 'tlpb-024', domain: 'semantic', subtopic: 'tooling', difficulty: 3,
    prompt: 'An organization wants to enable external tools (Tabular Editor, DAX Studio, ALM Toolkit) to connect to published Fabric semantic models for read/write operations. Which conditions must ALL be true? Select all that apply.',
    options: [
      'The "Allow XMLA endpoints" tenant setting must be enabled by the Fabric/Power BI administrator',
      'The workspace must be on a Fabric capacity (F-SKU), Premium Per User (PPU), or Premium Per Capacity (P-SKU) — XMLA write is not available on shared capacity (Pro or free)',
      'The connecting user or service principal must have at least Contributor workspace role or Build semantic model permission',
      'The model must be in Import storage mode — DirectQuery and Composite models do not support XMLA write',
      'XMLA read/write must be explicitly set on the capacity settings page (not just read)'
    ],
    correct: [0, 1, 2, 4],
    explanation: 'Enabling external tools for read/write XMLA access requires: tenant-level XMLA enablement (A), an appropriate workspace capacity tier (B), sufficient user/service principal permissions (C), and the capacity XMLA setting set to read/write — read-only is a separate (and more restrictive) setting (E). Storage mode does not restrict XMLA access — DirectQuery, Composite, and Direct Lake models all support XMLA write operations (D is false).',
    whyWrong: {
      3: 'XMLA read/write is not restricted to Import models. DirectQuery, Composite, and Direct Lake semantic models all support XMLA write access for model definition changes (DDL operations). The storage mode constrains query behavior, not XMLA administrative access.'
    },
    source: SRC.xmla,
    tags: ['xmla', 'tooling', 'premium', 'fabric', 'permissions', 'tenant-settings']
  }),

  order({
    id: 'tlpb-025', domain: 'semantic', subtopic: 'tooling', difficulty: 3,
    prompt: 'A team is building a CI/CD pipeline to automate semantic model deployments from a git repository to Fabric production. Place the following steps in the correct order.',
    options: [
      'Export the model definition as a .bim / TMDL file from the source git branch',
      'Run Best Practice Analyzer via Tabular Editor CLI to validate the model definition against quality rules',
      'Use ALM Toolkit CLI to diff the source model against the production XMLA endpoint and generate a change report',
      'Apply the selective deployment to the production XMLA endpoint after pipeline approval',
      'Trigger a semantic model refresh to load updated data into the deployed model'
    ],
    explanation: 'The correct sequence is: (1) export the model definition artifact from source control, (2) validate quality via BPA before any deployment, (3) diff against production to understand the change scope, (4) apply the deployment to production after human or automated approval, (5) refresh the model so end users see current data. Running the refresh before deployment (or skipping BPA) are the common ordering mistakes on exam scenarios.',
    source: { category: 'alm-toolkit', note: 'CI/CD pipeline order: export → BPA → diff → deploy → refresh' },
    tags: ['tooling', 'cicd', 'alm-toolkit', 'best-practice-analyzer', 'deployment', 'ordering']
  })

];
