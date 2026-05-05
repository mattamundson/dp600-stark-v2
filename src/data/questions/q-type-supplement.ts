// Supplement to satisfy the type-mix minimums (≥50 multi, ≥20 ordering).
// Each item is a real exam-relevant scenario, not filler.

import type { Question } from '../../lib/schema';
import { multi, order, SRC } from './_helpers';

export const typeSupplement: Question[] = [
  /* ── 9 additional multi-select ────────────────────────────────── */
  multi({
    id: 'tm-001', domain: 'semantic', subtopic: 'direct-lake', difficulty: 4,
    prompt: 'Which behaviors are guaranteed under DirectLakeOnly mode? Select all that apply.',
    options: [
      'Queries that cannot be served by Direct Lake fail outright instead of falling back',
      'Performance characteristics align with Direct Lake even under load',
      'Visuals automatically switch to Import for unsupported queries',
      'The model rejects DirectQuery tables at design time'
    ],
    correct: [0, 1],
    explanation: 'DirectLakeOnly forbids fallback. Queries either run in Direct Lake or fail — there is no silent degradation. This makes performance predictable for SLA-bound workloads.',
    whyWrong: {
      2: 'Switching to Import is not what happens; the query fails.',
      3: 'DirectLakeOnly is a runtime/deployment policy, not a design-time validator on table types.'
    },
    source: SRC.directLakeFallback,
    tags: ['direct-lake', 'directlakeonly']
  }),
  multi({
    id: 'tm-002', domain: 'maintain', subtopic: 'security-rls', difficulty: 4,
    prompt: 'Which approaches correctly implement DYNAMIC RLS in a Fabric semantic model? Select all that apply.',
    options: [
      'Filter the Users dim on `[UPN] = USERPRINCIPALNAME()` and let the relationship propagate',
      'Filter the fact table directly on a SalesRep column comparing to USERPRINCIPALNAME()',
      'Use a CALCULATE wrapper around the user identity function in the role definition',
      'Bind the user to a Microsoft Entra group and define one role per group'
    ],
    correct: [0, 1, 3],
    explanation: 'Dynamic RLS is built by filtering on the current user identity. Filtering the dim and propagating is the cleaner pattern, but filtering the fact directly is also valid. Mapping users to Entra groups and defining roles per group is the recommended scale-out pattern.',
    whyWrong: {
      2: 'CALCULATE is not a role-expression construct. The role is a single boolean filter expression.'
    },
    source: SRC.rls,
    tags: ['rls', 'dynamic']
  }),
  multi({
    id: 'tm-003', domain: 'maintain', subtopic: 'deployment-pipelines', difficulty: 4,
    prompt: 'Which actions can be performed via deployment pipelines? Select all that apply.',
    options: [
      'Compare differences between two stages',
      'Promote selected items only (selective deployment)',
      'Deploy backwards (e.g., prod → test)',
      'Auto-promote items that pass DAX-time tests'
    ],
    correct: [0, 1, 2],
    explanation: 'Compare, selective deploy, and backward deploy are all supported. There is no built-in "auto-promote on test pass" — that is a DevOps automation pattern you would script externally.',
    whyWrong: {
      3: 'There is no native auto-promotion gate driven by DAX tests; you must author this in CI.'
    },
    source: SRC.deployment,
    tags: ['deployment-pipelines']
  }),
  multi({
    id: 'tm-004', domain: 'prepare', subtopic: 'kql', difficulty: 4,
    prompt: 'Which KQL features improve query LATENCY when querying large telemetry tables?',
    options: [
      'Filtering early with `where` before any join',
      'Using `summarize` with a small set of group-by keys to shrink intermediate results',
      'Calling `materialize()` on a sub-result reused multiple times in the query',
      'Replacing scalar functions with regex matches against arbitrary text'
    ],
    correct: [0, 1, 2],
    explanation: 'Filter pushdown, narrow group-by, and materialize() are standard KQL latency wins. Regex against arbitrary text is the OPPOSITE — it forces full-row scanning and inhibits indexing.',
    whyWrong: {
      3: 'Regex over arbitrary text typically REGRESSES latency, not improves it.'
    },
    source: SRC.kql,
    tags: ['kql', 'performance']
  }),
  multi({
    id: 'tm-005', domain: 'prepare', subtopic: 'fabric-architecture', difficulty: 3,
    prompt: 'Which Fabric items can write data into OneLake (in Delta format) by default?',
    options: ['Lakehouse', 'Warehouse', 'Mirrored Database', 'Power BI Report'],
    correct: [0, 1, 2],
    explanation: 'Lakehouse, Warehouse, and Mirrored Database all persist to OneLake as Delta. Reports are consumption-side artifacts and do not write data.',
    whyWrong: {
      3: 'A Power BI report consumes from a semantic model — it does not produce/persist data.'
    },
    source: SRC.fabricArch,
    tags: ['onelake', 'delta']
  }),
  multi({
    id: 'tm-006', domain: 'semantic', subtopic: 'dax-context', difficulty: 5,
    prompt: 'A measure `Bad = SUMX(FILTER(Sales, [Margin %] > 0.2), Sales[Amount])` is slow. Which refactors are likely to improve it?',
    options: [
      'Replace with `CALCULATE(SUM(Sales[Amount]), [Margin %] > 0.2)` to avoid SUMX iterator + per-row context transition',
      'Use a calculated column for `Margin %` to avoid recomputing it per iteration (when in Import mode)',
      'Add KEEPFILTERS around the FILTER to "preserve" the iteration',
      'Wrap in IFERROR to short-circuit on the first miss'
    ],
    correct: [0, 1],
    explanation: 'The SUMX + per-row context transition (calling [Margin %] inside the iterator) is the perf trap. CALCULATE-with-condition is much cheaper. Calculated column for the margin makes sense in Import mode. KEEPFILTERS does not change perf here, and IFERROR forces evaluation regardless.',
    whyWrong: {
      2: 'KEEPFILTERS modifies filter combination semantics, not performance of this iterator.',
      3: 'IFERROR does not short-circuit DAX evaluation; it just catches errors.'
    },
    source: SRC.daxPerf,
    tags: ['dax', 'performance', 'context-transition']
  }),
  multi({
    id: 'tm-007', domain: 'maintain', subtopic: 'governance', difficulty: 3,
    prompt: 'Which TENANT-LEVEL controls help govern a large Fabric deployment?',
    options: [
      'Restricting workspace creation to specific Entra groups',
      'Limiting which users can publish apps to entire org',
      'Disabling specific custom-visual sources',
      'Forcing every visual to use a particular DAX template'
    ],
    correct: [0, 1, 2],
    explanation: 'Tenant-level controls govern surface area: who can create workspaces, publish apps, and use which visuals. There is no tenant control that mandates DAX templates per visual — that is a code-review concern.',
    whyWrong: {
      3: 'No tenant setting forces DAX templates onto visuals.'
    },
    source: SRC.governance,
    tags: ['tenant-settings', 'governance']
  }),
  multi({
    id: 'tm-008', domain: 'semantic', subtopic: 'optimization', difficulty: 4,
    prompt: 'Which actions reduce the in-memory size of an Import-mode tabular model?',
    options: [
      'Drop columns that are not used by any visual or measure',
      'Replace high-cardinality string IDs with integer surrogate keys',
      'Disable Auto Date/Time when an explicit Date table exists',
      'Add bi-directional filters to all relationships'
    ],
    correct: [0, 1, 2],
    explanation: 'Dropping unused columns, lowering string cardinality, and removing Auto Date/Time hidden tables all shrink the model. Bi-directional relationships do not affect storage size and tend to add ambiguity.',
    whyWrong: {
      3: 'Bi-directional filters change query behavior, not storage size, and create ambiguity that hurts more than it helps.'
    },
    source: SRC.semanticModel,
    tags: ['optimization', 'vertipaq']
  }),
  multi({
    id: 'tm-009', domain: 'prepare', subtopic: 'pipelines', difficulty: 3,
    prompt: 'Which pipeline activities are appropriate for orchestrating a Lakehouse-based ETL job?',
    options: [
      'Notebook activity to run the transformation',
      'Copy Data activity to bring source files into Bronze',
      'Get Metadata activity to enumerate source files',
      'Send Email activity to send the user\'s payroll'
    ],
    correct: [0, 1, 2],
    explanation: 'Notebook (transform), Copy Data (ingest), and Get Metadata (file enumeration) are workhorse activities. Sending payroll over email is neither a real activity nor an appropriate use.',
    whyWrong: {
      3: 'Pipelines do not have a "Send payroll over email" activity, and obviously this is not what an ETL pipeline does.'
    },
    source: SRC.pipelines,
    tags: ['pipelines', 'activities']
  }),

  /* ── 13 additional ordering questions ─────────────────────────── */
  order({
    id: 'to-001', domain: 'semantic', subtopic: 'direct-lake', difficulty: 4,
    prompt: 'Place these Direct Lake fallback investigation steps in the right order.',
    options: [
      'Observe slow query in trace; identify it as DirectQuery, not Direct Lake',
      'Inspect tables involved with VertiPaq Analyzer / DAX Studio',
      'Check whether V-Order is enabled on the underlying Delta files',
      'If V-Order is missing, optimize the table with V-Order; if a feature triggered fallback, switch to a supported pattern',
      'Re-test query and confirm Direct Lake path in trace'
    ],
    explanation: 'Diagnose → inspect → identify root cause → remediate → verify. The fix is meaningless without the post-fix verification.',
    source: SRC.directLakeFallback,
    tags: ['direct-lake', 'fallback', 'troubleshooting']
  }),
  order({
    id: 'to-002', domain: 'maintain', subtopic: 'deployment-pipelines', difficulty: 3,
    prompt: 'Place a deployment pipeline workflow in order for promoting a new feature from Dev to Prod.',
    options: [
      'Author content in the Development workspace',
      'Configure deployment rules on Test (e.g., test SQL connection)',
      'Deploy Dev → Test, validate behavior',
      'Configure deployment rules on Production (prod SQL connection)',
      'Deploy Test → Prod after stakeholder sign-off'
    ],
    explanation: 'Author → set test rules → push to test → set prod rules → push to prod. Rules must be set BEFORE deploy so the artifact arrives bound to the correct environment.',
    source: SRC.deployment,
    tags: ['deployment-pipelines', 'workflow']
  }),
  order({
    id: 'to-003', domain: 'prepare', subtopic: 'medallion', difficulty: 3,
    prompt: 'Place medallion layers in order from raw to consumption-ready.',
    options: ['Bronze (raw landed)', 'Silver (cleansed, conformed)', 'Gold (business-ready, modeled)'],
    explanation: 'Bronze → Silver → Gold is the canonical medallion progression.',
    source: SRC.fabricArch,
    tags: ['medallion']
  }),
  order({
    id: 'to-004', domain: 'maintain', subtopic: 'security-rls', difficulty: 4,
    prompt: 'Place these RLS implementation steps in correct order.',
    options: [
      'Identify the dimension that uniquely identifies a user (e.g., Users[UPN])',
      'Define a role with a DAX filter expression on the user dim using USERPRINCIPALNAME()',
      'Test the role using "View as" or an XMLA role-impersonated query',
      'Map users (or Microsoft Entra groups) to the role in Power BI / Fabric Service',
      'Re-validate after promoting via deployment pipeline (rules don\'t move user mappings forward by default)'
    ],
    explanation: 'Dim → role → test → assign → re-validate after promotion. The post-promotion re-validation step catches the trap that user mappings often need to be re-applied per stage.',
    source: SRC.rls,
    tags: ['rls', 'workflow']
  }),
  order({
    id: 'to-005', domain: 'prepare', subtopic: 'kql', difficulty: 3,
    prompt: 'Order this KQL pipeline correctly: filter early, then aggregate, then post-process.',
    options: [
      'where Timestamp > ago(1h)',
      'summarize Hits = count() by Customer',
      'top 10 by Hits desc',
      'project Customer, Hits'
    ],
    explanation: 'Filter rows → aggregate → take top-N → project columns. Filtering early shrinks the working set; aggregation comes before slicing top-N; projection is cosmetic and last.',
    source: SRC.kql,
    tags: ['kql', 'pipeline-order']
  }),
  order({
    id: 'to-006', domain: 'semantic', subtopic: 'dax-context', difficulty: 4,
    prompt: 'Place CALCULATE\'s evaluation steps in order.',
    options: [
      'Evaluate filter arguments under outer context',
      'Modify filter context (replace same-column filters unless KEEPFILTERS used)',
      'Trigger context transition if a row context exists',
      'Evaluate the inner expression under modified context',
      'Return the scalar result'
    ],
    explanation: 'Filter args evaluate first, then context is modified (with optional context transition), then the inner expression runs.',
    source: SRC.daxFunctions,
    tags: ['dax', 'calculate']
  }),
  order({
    id: 'to-007', domain: 'prepare', subtopic: 'transform', difficulty: 3,
    prompt: 'Order a typical Lakehouse ELT job from start to finish.',
    options: [
      'Pipeline triggers on schedule',
      'Copy activity lands raw files into Bronze',
      'Notebook reads Bronze, validates, writes Silver',
      'Notebook reads Silver, aggregates, writes Gold',
      'Semantic model frames against Gold and serves reports'
    ],
    explanation: 'Trigger → ingest → validate/conform → aggregate → serve. Each step can fail independently, which is why orchestration matters.',
    source: SRC.pipelines,
    tags: ['etl', 'medallion']
  }),
  order({
    id: 'to-008', domain: 'maintain', subtopic: 'pbip', difficulty: 4,
    prompt: 'Order these steps to put an existing .pbix under Git source control.',
    options: [
      'Open the .pbix in Power BI Desktop',
      'File → Save as → choose .pbip (Power BI Project) format',
      'Open the project folder in your IDE; commit to Git',
      'Author changes (TMDL/JSON files diff cleanly)',
      'Open project in Desktop, save back to .pbip, commit again'
    ],
    explanation: 'Convert pbix → pbip → commit → iterate via TMDL/JSON edits → re-save. The .pbip format is what makes Git diffs meaningful.',
    source: SRC.pbip,
    tags: ['pbip', 'version-control']
  }),
  order({
    id: 'to-009', domain: 'prepare', subtopic: 'mirroring', difficulty: 3,
    prompt: 'Order the lifecycle of a Fabric Mirrored Database from creation to consumption.',
    options: [
      'Create a Mirrored Database item pointing at the source (e.g., Azure SQL DB)',
      'Initial seed replicates source into OneLake as Delta',
      'Continuous CDC streams ongoing changes',
      'Semantic model in same workspace queries the Mirrored Database via Direct Lake',
      'Reports refresh near-real-time as commits flow in'
    ],
    explanation: 'Create → seed → CDC stream → model → reports. Mirroring is set-and-forget once the seed completes.',
    source: SRC.mirroring,
    tags: ['mirroring', 'lifecycle']
  }),
  order({
    id: 'to-010', domain: 'semantic', subtopic: 'optimization', difficulty: 4,
    prompt: 'Order these model-optimization steps from highest to lowest typical impact.',
    options: [
      'Drop unused high-cardinality columns',
      'Convert string IDs to integer surrogate keys',
      'Remove Auto Date/Time hidden tables in favor of an explicit Date dim',
      'Replace implicit measures with explicit measures',
      'Annotate the date table as the marked Date table'
    ],
    explanation: 'Cardinality reductions and surrogate keys give the biggest VertiPaq wins; removing Auto Date/Time eliminates hidden bloat; explicit measures are correctness/clarity wins; marking the Date table is a small but real perf and correctness improvement.',
    source: SRC.semanticModel,
    tags: ['optimization', 'priority']
  }),
  order({
    id: 'to-011', domain: 'maintain', subtopic: 'sensitivity-labels', difficulty: 4,
    prompt: 'Order these sensitivity-label propagation events in the correct sequence.',
    options: [
      'Author of a semantic model applies "Confidential" label',
      'Downstream report inherits the label from the source semantic model',
      'User exports report to Excel; the label travels with the file',
      'A MIP-aware policy on the export blocks email-out to external recipients'
    ],
    explanation: 'Source label → downstream inheritance → export carries label → enforcement on action. The chain only works because each step is MIP-aware.',
    source: SRC.sensitivity,
    tags: ['sensitivity', 'propagation']
  }),
  order({
    id: 'to-012', domain: 'maintain', subtopic: 'xmla-endpoint', difficulty: 3,
    prompt: 'Order these XMLA-based deployment steps using Tabular Editor.',
    options: [
      'Connect Tabular Editor to the workspace XMLA endpoint',
      'Open the model and edit (e.g., add a measure, modify a calculation group)',
      'Save changes back via the XMLA endpoint',
      'Trigger a Refresh (when needed) to recalc dependent caches'
    ],
    explanation: 'Connect → edit → save → refresh. Many users skip the refresh and wonder why their changes don\'t appear in visuals immediately.',
    source: SRC.xmla,
    tags: ['xmla', 'tabular-editor']
  }),
  order({
    id: 'to-013', domain: 'semantic', subtopic: 'calc-groups', difficulty: 4,
    prompt: 'Order the steps to add a calculation group with YTD/MTD/QTD time-intel variants.',
    options: [
      'Create a calculation group "Time Intelligence" with a column "Variant"',
      'Add calculation items: YTD, MTD, QTD with DAX expressions referencing SELECTEDMEASURE()',
      'Set precedence and format strings as needed',
      'Hide implicit measures; ensure your base measures are explicit',
      'Test in a visual: pivot Variant on rows and a base measure as values'
    ],
    explanation: 'Create group → define items → set precedence/format → ensure explicit measures → test in visual. The "explicit measures" prerequisite is the trap — implicit measures break calc groups.',
    source: SRC.semanticModel,
    tags: ['calc-groups', 'time-intel']
  })
];
