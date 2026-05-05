import type { Question } from '../../lib/schema';
import { single, multi, order, SRC } from './_helpers';

// 34 chained scenario questions tied to the 15 scenarios in
// `../scenarios/scn-list.ts`. Question ids must stay aligned with the
// `questionIds` arrays on each Scenario record.

export const scenarioQuestions: Question[] = [
  // ─── scn-01 — Contoso Retail OneLake migration (3 Qs) ─────────────
  single({
    id: 'scn-01-q1',
    type: 'scenario-single',
    domain: 'semantic',
    subtopic: 'direct-lake',
    difficulty: 4,
    scenarioId: 'scn-01',
    scenarioTitle: 'Contoso Retail OneLake migration',
    prompt:
      'Which migration approach BEST satisfies Contoso\'s freshness, latency, and SLA goals while minimising rework on the four legacy reports that depend on [MarginBucket]?',
    options: [
      'Lift-and-shift to Direct Lake unchanged: keep the calculated [MarginBucket] column on the model and rely on Direct Lake to compute it on demand',
      'Move [MarginBucket] upstream into the Lakehouse Silver layer as a native Delta column, then build the Direct Lake model with no calculated columns',
      'Keep StoreSales in Import mode on F64 to avoid any Direct Lake risk, just point Import refresh at the new Lakehouse',
      'Build a composite model with DirectQuery against a Warehouse for the fact and Import for [MarginBucket] only'
    ],
    correct: 1,
    explanation:
      'Direct Lake does not materialise calculated columns on the fly — adding one breaks pure Direct Lake on that table and forces a different storage mode. The clean fix is to compute [MarginBucket] upstream as a native Delta column in Silver, so Direct Lake reads it as a regular column and the four legacy reports keep working without DAX changes.',
    whyWrong: {
      0: 'Direct Lake will not compute the calculated column natively. Keeping it forces fallback or breaks the Direct Lake contract on FactSales — the exact thing the migration is supposed to fix.',
      2: 'Sticking with Import abandons the entire reason to migrate (the missed refresh window). It also wastes the Direct Lake capability paid for on F64.',
      3: 'A composite model adds operational complexity and does not deliver the freshness benefit cleanly; DirectQuery on a 140 GB fact will not hit sub-2-second p95.'
    },
    source: SRC.directLake,
    tags: ['direct-lake', 'scenario', 'calculated-columns', 'migration']
  }),
  single({
    id: 'scn-01-q2',
    type: 'scenario-single',
    domain: 'semantic',
    subtopic: 'direct-lake',
    difficulty: 4,
    scenarioId: 'scn-01',
    scenarioTitle: 'Contoso Retail OneLake migration',
    prompt:
      'After the migration, sales finance sees fresh data in StoreSales within seconds of new Delta commits. The platform team asks how Contoso should now think about the nightly refresh job. What is the correct guidance?',
    options: [
      'Keep the nightly Refresh schedule running — Direct Lake still depends on it for framing',
      'Replace the nightly Refresh with no scheduled job; framing happens automatically against the latest Delta version on next query',
      'Increase Refresh frequency to every 5 minutes to keep VertiPaq warm',
      'Trigger Refresh from the Lakehouse pipeline on every Delta commit via REST API'
    ],
    correct: 1,
    explanation:
      'Direct Lake frames automatically — it picks up the latest committed Delta version when a query arrives. The scheduled refresh of an Import-era model is no longer needed. Manual or API Refresh is reserved for forcing a reframe (e.g., after a schema change), not for keeping data fresh.',
    whyWrong: {
      0: 'Direct Lake framing is event-driven on query arrival, not on a refresh schedule. Keeping the nightly job adds zero freshness benefit.',
      2: 'Refresh does not "warm" VertiPaq in Direct Lake — columns page in lazily on first query reference. A 5-minute Refresh just burns capacity.',
      3: 'Per-commit API Refresh is overkill and can throttle the model. Direct Lake handles this case natively without API calls.'
    },
    source: SRC.directLake,
    tags: ['direct-lake', 'scenario', 'framing', 'refresh']
  }),
  single({
    id: 'scn-01-q3',
    type: 'scenario-single',
    domain: 'semantic',
    subtopic: 'direct-lake',
    difficulty: 5,
    scenarioId: 'scn-01',
    scenarioTitle: 'Contoso Retail OneLake migration',
    prompt:
      'Three weeks post-migration, traces show occasional DirectQuery activity against the SQL endpoint during peak shopping hours. Which investigative path is most likely to find the root cause?',
    options: [
      'Increase the F SKU from F64 to F128 — fallback is a capacity problem',
      'Verify V-Order is enabled on every Delta table and confirm no Delta features (e.g., deletion vectors, column mapping) exceed Direct Lake support',
      'Switch the model to DirectLakeOnly to force fallback to error out, then read the error',
      'Disable the SQL endpoint to prevent DirectQuery'
    ],
    correct: 1,
    explanation:
      'Fallback is a feature/compatibility issue, not a capacity issue. The most common roots are missing V-Order on a table the engineer optimised by hand, or the table using a Delta feature Direct Lake cannot consume. Check those first before considering the more aggressive remedies.',
    whyWrong: {
      0: 'A larger SKU does not eliminate fallback — fallback decisions are made per query based on what Direct Lake can serve, not on capacity headroom.',
      2: 'DirectLakeOnly is a remediation step (and a useful one for Acme-like SLA cases), but it does not investigate the cause. You would still need to know WHY queries fall back to fix the underlying tables.',
      3: 'You cannot disable the SQL endpoint on a Lakehouse, and doing so would break other consumers. This is not a real lever.'
    },
    source: SRC.directLakeFallback,
    tags: ['direct-lake', 'scenario', 'fallback', 'troubleshooting']
  }),

  // ─── scn-02 — Northwind fallback storms (3 Qs) ────────────────────
  single({
    id: 'scn-02-q1',
    type: 'scenario-single',
    domain: 'semantic',
    subtopic: 'direct-lake',
    difficulty: 4,
    scenarioId: 'scn-02',
    scenarioTitle: 'Northwind Logistics fallback storms',
    prompt:
      'Which root cause is the MOST PROBABLE primary contributor to the 09:00–11:00 fallback storm?',
    options: [
      'The F32 capacity is too small for the workload — upgrade to F64',
      'The OPTIMIZE rewrite without V-Order on FactShipments — Direct Lake silently falls back when V-Order is missing',
      'The new dynamic-RLS measures are evaluated at query time and force DirectQuery',
      'Hourly Delta commits invalidate VertiPaq cache, forcing reads from OneLake'
    ],
    correct: 1,
    explanation:
      'Disabling V-Order is the textbook trigger for Direct Lake fallback on a previously-working model. The change happened recently, the symptom started shortly after, and the timing window matches peak query load when more queries hit the now-non-V-Order fact table. Capacity, RLS, and Delta commits are plausible contributors but are downstream of the V-Order regression.',
    whyWrong: {
      0: 'Capacity headroom is being consumed BY the fallback storm, not causing it. Throwing F64 at the symptom without fixing V-Order will just cost more.',
      2: 'Dynamic RLS does not by itself force DirectQuery in Direct Lake. Specific patterns can, but the deployment-correlated symptom points at the V-Order change first.',
      3: 'Delta commits trigger framing, not fallback. Reframing is fast and does not produce a 38% fallback ratio.'
    },
    source: SRC.directLakeFallback,
    tags: ['direct-lake', 'scenario', 'fallback', 'v-order']
  }),
  single({
    id: 'scn-02-q2',
    type: 'scenario-single',
    domain: 'semantic',
    subtopic: 'direct-lake',
    difficulty: 4,
    scenarioId: 'scn-02',
    scenarioTitle: 'Northwind Logistics fallback storms',
    prompt:
      'You restore V-Order on FactShipments. What is the correct sequence to verify the fix and prevent regression?',
    options: [
      'Re-run OPTIMIZE with V-Order enabled, trigger a model Refresh to force a reframe, monitor fallback ratio in the Capacity Metrics app over the next peak window, then add a code-review gate to block V-Order disablement',
      'Just set the model to DirectLakeOnly and let queries fail until the team fixes the table',
      'Upgrade to F64 capacity, then restore V-Order — capacity must be sized first',
      'Re-create the Lakehouse from scratch and re-import all data'
    ],
    correct: 0,
    explanation:
      'Fix the data (V-Order rewrite), force a reframe so the model picks up the corrected layout, then VERIFY via the metrics app over the actual peak window (don\'t declare success until you see the next 09:00 hour pass clean). The code-review gate prevents the same well-meaning regression.',
    whyWrong: {
      1: 'DirectLakeOnly during a fix-in-progress would surface failures to end users instead of silently degrading — appropriate for Acme-style SLAs (scn-03), not for a fix-and-verify workflow at Northwind.',
      2: 'Capacity is downstream. Sizing up first wastes spend and obscures whether the V-Order fix actually worked.',
      3: 'Re-creating the Lakehouse is destructive overkill and would also lose unrelated tables. Targeted OPTIMIZE is the correct surgical fix.'
    },
    source: SRC.directLakeFallback,
    tags: ['direct-lake', 'scenario', 'remediation', 'v-order', 'verification']
  }),
  single({
    id: 'scn-02-q3',
    type: 'scenario-single',
    domain: 'semantic',
    subtopic: 'direct-lake',
    difficulty: 4,
    scenarioId: 'scn-02',
    scenarioTitle: 'Northwind Logistics fallback storms',
    prompt:
      'A week later, FleetOps is stable. The platform lead asks for a guardrail so this class of incident cannot silently recur. Which control gives the EARLIEST warning of a future V-Order regression?',
    options: [
      'A scheduled KQL alert on the Capacity Metrics dataset that fires when the Direct Lake fallback ratio for any model exceeds a threshold (e.g., 5%)',
      'A weekly manual review of the Capacity Metrics app',
      'Switch all Northwind models to DirectLakeOnly — failures will be self-evident',
      'Increase the SKU to F64 to absorb the spike if it happens again'
    ],
    correct: 0,
    explanation:
      'Capacity Metrics exposes fallback ratios in its underlying KQL DB, and a threshold-based scheduled alert catches a regression on the FIRST peak window after it lands — typically within hours. Weekly manual review misses the storm; DirectLakeOnly converts a perf issue into a reliability issue (dangerous in a logistics context); larger SKU just hides the symptom.',
    whyWrong: {
      1: 'A weekly cadence misses days of degraded user experience and wastes capacity in the meantime.',
      2: 'DirectLakeOnly converts a soft perf degradation into a hard query failure for the 200-seat ops centre — wrong tradeoff for an internal logistics workload that prefers slow over broken.',
      3: 'Bigger capacity hides the symptom and makes detection HARDER, not easier.'
    },
    source: SRC.governance,
    tags: ['direct-lake', 'scenario', 'monitoring', 'capacity-metrics']
  }),

  // ─── scn-03 — Acme DirectLakeOnly (2 Qs) ──────────────────────────
  single({
    id: 'scn-03-q1',
    type: 'scenario-single',
    domain: 'semantic',
    subtopic: 'direct-lake',
    difficulty: 5,
    scenarioId: 'scn-03',
    scenarioTitle: 'Acme Capital Markets DirectLakeOnly mandate',
    prompt:
      'Which configuration BEST satisfies the head of risk\'s requirement that the model cannot silently degrade?',
    options: [
      'Set the model to Direct Lake (default) and add a query trace dashboard that flags fallback events',
      'Set the model to DirectLakeOnly mode so any query that cannot run in Direct Lake fails outright',
      'Set the model to Import mode on a P5 capacity for guaranteed performance',
      'Set the model to composite with DirectQuery as a backstop'
    ],
    correct: 1,
    explanation:
      'DirectLakeOnly is exactly the SLA-friendly setting. It forbids the silent fallback path so the model either serves Direct Lake performance or returns a hard error that compliance and ops can detect immediately. Trace dashboards detect degradation AFTER the SLA is breached, which is too late for a regulated workload.',
    whyWrong: {
      0: 'A trace dashboard is detection after the fact. Compliance asked for "no unannounced degradation" — DirectLakeOnly delivers that contractually, the dashboard merely reports it.',
      2: 'Import on P5 may meet performance but loses the freshness Direct Lake offers, and the head of risk\'s ask is about degradation, not throughput.',
      3: 'A DirectQuery backstop is exactly the silent degradation path the requirement forbids.'
    },
    source: SRC.directLakeFallback,
    tags: ['direct-lake', 'scenario', 'directlakeonly', 'sla']
  }),
  single({
    id: 'scn-03-q2',
    type: 'scenario-single',
    domain: 'semantic',
    subtopic: 'direct-lake',
    difficulty: 5,
    scenarioId: 'scn-03',
    scenarioTitle: 'Acme Capital Markets DirectLakeOnly mandate',
    prompt:
      'With DirectLakeOnly set, an analyst writes a new measure that uses an unsupported pattern and the query errors out for traders during market hours. What is the CORRECT operational response?',
    options: [
      'Switch DirectLakeOnly off in production to restore service immediately, then debug at leisure',
      'Roll back the offending measure via the deployment pipeline and treat the error as the system working as designed; investigate why the measure passed pre-prod review',
      'Increase the capacity SKU to make Direct Lake support more patterns',
      'Convert the model to Import mode permanently'
    ],
    correct: 1,
    explanation:
      'The hard error is the contract working correctly — silent fallback would have hidden the issue and breached the SLA without anyone noticing. The right response is to roll the bad measure back via the pipeline and harden pre-prod review so unsupported patterns get caught before they reach prod. Disabling DirectLakeOnly destroys the entire reason it exists.',
    whyWrong: {
      0: 'Disabling the SLA-protection toggle to "restore service" defeats the regulated requirement and just moves the problem from "visible error" to "invisible degradation".',
      2: 'Capacity has nothing to do with which DAX patterns Direct Lake supports.',
      3: 'Converting to Import abandons the freshness goal and is a six-month project, not an incident response.'
    },
    source: SRC.directLakeFallback,
    tags: ['direct-lake', 'scenario', 'directlakeonly', 'incident']
  }),

  // ─── scn-04 — Globex framing semantics (2 Qs) ─────────────────────
  single({
    id: 'scn-04-q1',
    type: 'scenario-single',
    domain: 'semantic',
    subtopic: 'direct-lake',
    difficulty: 5,
    scenarioId: 'scn-04',
    scenarioTitle: 'Globex Pharma framing semantics',
    prompt:
      'What is the MOST LIKELY explanation for the 20-minute window where some queries see "AdverseEventCode" and others throw "column not found"?',
    options: [
      'The Lakehouse SQL endpoint metadata has not yet refreshed across all replicas, so framing sees the new column inconsistently',
      'Direct Lake requires a manual REST API Refresh after every schema change',
      'Delta Lake commits are only eventually-consistent — some queries read old commits',
      'The semantic model needs to be republished from Power BI Desktop'
    ],
    correct: 0,
    explanation:
      'Direct Lake framing relies on the Lakehouse SQL endpoint metadata. The endpoint refreshes asynchronously after schema changes, and during that window some framing operations see the old shape and some see the new shape. The fix is to wait for or force endpoint metadata refresh before publishing the model that depends on the new column.',
    whyWrong: {
      1: 'Manual REST Refresh is one valid trigger for a reframe but not "required after every schema change" — and it would not explain the inconsistent observability across queries.',
      2: 'Delta is strongly consistent within a single table. The inconsistency is at the SQL endpoint metadata layer, not the Delta log.',
      3: 'Republishing from Desktop does not solve a server-side metadata lag.'
    },
    source: SRC.directLake,
    tags: ['direct-lake', 'scenario', 'framing', 'sql-endpoint']
  }),
  single({
    id: 'scn-04-q2',
    type: 'scenario-single',
    domain: 'semantic',
    subtopic: 'direct-lake',
    difficulty: 4,
    scenarioId: 'scn-04',
    scenarioTitle: 'Globex Pharma framing semantics',
    prompt:
      'Which deployment ordering would have prevented the 20-minute inconsistency?',
    options: [
      'Publish the semantic model first, then add the column to FactObservations afterwards',
      'Add the column upstream, wait for the SQL endpoint metadata to reflect the new column, then publish the updated semantic model and trigger a model Refresh to force a reframe',
      'Add the column and publish the model in the same Git commit',
      'Pause Delta commits during deployment'
    ],
    correct: 1,
    explanation:
      'Order matters: data shape first, endpoint metadata caught up second, model deployment that relies on the new shape third, and a forced reframe to make the new shape visible immediately. Globex deployed model + data shape simultaneously, exposing the metadata-lag window.',
    whyWrong: {
      0: 'Publishing a model that references a column that does not yet exist will fail outright — that is the inverse of the right ordering.',
      2: 'Same-commit Git deployment does not help because the SQL endpoint metadata refresh is asynchronous regardless of how the artifacts were committed.',
      3: 'Pausing commits during deployment is impractical for a 10-minute pipeline cadence and does not address the metadata-lag root cause.'
    },
    source: SRC.directLake,
    tags: ['direct-lake', 'scenario', 'framing', 'deployment-ordering']
  }),

  // ─── scn-05 — Initech three-stage pipeline (3 Qs) ─────────────────
  single({
    id: 'scn-05-q1',
    type: 'scenario-single',
    domain: 'maintain',
    subtopic: 'deployment-pipelines',
    difficulty: 4,
    scenarioId: 'scn-05',
    scenarioTitle: 'Initech three-stage Fabric pipeline',
    prompt:
      'Where should Initech configure the swap from azuresql-treasury-dev to azuresql-treasury-test, and from azuresql-treasury-test to the production Managed Instance?',
    options: [
      'Inside the .pbip file as parameters, hand-edited per stage',
      'Deployment rules on the TARGET stage (Test, then Prod) — rules apply to incoming content as it lands in the target',
      'Deployment rules on the SOURCE stage (Dev, then Test)',
      'A tenant-wide configuration store managed by Fabric admin'
    ],
    correct: 1,
    explanation:
      'Deployment rules live on the TARGET stage. When content is deployed INTO Test, the Test rule swaps the connection string from dev to test; when promoted INTO Prod, the Prod rule swaps to the Managed Instance. This is the canonical Fabric pipeline pattern.',
    whyWrong: {
      0: 'Hand-editing PBIP parameters per stage destroys the value of the pipeline (consistent, repeatable promotion) and reintroduces human error on every deploy.',
      2: 'Source-stage rules would apply on outbound content, which defeats the point — you want the swap on arrival in the new environment.',
      3: 'There is no tenant-wide deployment rule store; rules are scoped per pipeline stage.'
    },
    source: SRC.deployment,
    tags: ['deployment-pipelines', 'scenario', 'rules']
  }),
  multi({
    id: 'scn-05-q2',
    type: 'scenario-multi',
    domain: 'maintain',
    subtopic: 'deployment-pipelines',
    difficulty: 4,
    scenarioId: 'scn-05',
    scenarioTitle: 'Initech three-stage Fabric pipeline',
    prompt:
      'Which Initech artifacts CAN flow through the deployment pipeline together with the semantic model? Select all that apply.',
    options: [
      'The semantic model and report',
      'The Dataflow Gen2 dependency',
      'A Dataflow Gen1 the team has lying around as a fallback',
      'The Lakehouse the model reads from',
      'A KQL Database used by an unrelated workspace dashboard'
    ],
    correct: [0, 1, 3],
    explanation:
      'Fabric deployment pipelines support semantic models, reports, Dataflow Gen2, notebooks, and Lakehouses (and several more modern items). Dataflow Gen1 is the legacy Power BI item and is NOT supported. Items that aren\'t in the pipeline\'s workspace simply don\'t flow through it.',
    whyWrong: {
      2: 'Dataflow Gen1 is the legacy PBI dataflow type and is explicitly NOT supported in Fabric deployment pipelines — Initech needs to migrate it to Gen2 or move it out of band.',
      4: 'A KQL Database used by an unrelated workspace is not in this pipeline\'s scope; the question is about which artifact TYPES are supported, but more importantly the unrelated workspace would not be promoted.'
    },
    source: SRC.deployment,
    tags: ['deployment-pipelines', 'scenario', 'supported-items']
  }),
  single({
    id: 'scn-05-q3',
    type: 'scenario-single',
    domain: 'maintain',
    subtopic: 'sensitivity-labels',
    difficulty: 4,
    scenarioId: 'scn-05',
    scenarioTitle: 'Initech three-stage Fabric pipeline',
    prompt:
      'After deploying TreasuryDaily Dev → Test → Prod, the platform team verifies the "Confidential — Finance" sensitivity label is preserved in Prod. Which behaviour SHOULD they expect when a Prod report is exported to Excel by an analyst?',
    options: [
      'The label is stripped because Excel cannot enforce Fabric labels',
      'The label travels with the export and is enforced downstream by MIP-aware tools',
      'The label triggers a deployment-pipeline block on the export action',
      'The label converts to a watermark only with no protection'
    ],
    correct: 1,
    explanation:
      'Sensitivity labels (defined in Microsoft Purview Information Protection) propagate with exported data. MIP-aware downstream tools (Excel with the unified labelling client, M365 apps) honour the label and apply the configured protection — encryption, access restriction, or watermarking depending on policy.',
    whyWrong: {
      0: 'Labels are NOT stripped — propagation is the entire point of Microsoft Information Protection.',
      2: 'Sensitivity labels are not enforced by deployment pipelines at all; pipelines move artifacts, MIP enforces labels.',
      3: 'Watermarking is one possible action, but the label carries the policy, not just a visual mark.'
    },
    source: SRC.sensitivity,
    tags: ['sensitivity-labels', 'scenario', 'export', 'propagation']
  }),

  // ─── scn-06 — Stark hotfix selective deploy (2 Qs) ────────────────
  single({
    id: 'scn-06-q1',
    type: 'scenario-single',
    domain: 'maintain',
    subtopic: 'deployment-pipelines',
    difficulty: 4,
    scenarioId: 'scn-06',
    scenarioTitle: 'Stark Industries hotfix selective deploy',
    prompt:
      'Which deployment approach correctly ships the [Net Margin] fix WITHOUT promoting the four unrelated in-flight changes?',
    options: [
      'Promote the entire Test stage to Prod and ask the four other teams to revert their changes after',
      'Use selective deployment from Test to Prod, choosing only the FinancialKPIs semantic model item',
      'Make the fix directly in Prod via XMLA and skip the pipeline',
      'Backward-deploy from Prod to Test, fix it in Test, then re-deploy'
    ],
    correct: 1,
    explanation:
      'Selective deployment lets the team promote individual items (here, only the FinancialKPIs semantic model) while leaving unselected items at their prior version. This is exactly what hotfix workflows need — be aware that selective deploys can break dependencies if not used carefully, but here only one measure changed.',
    whyWrong: {
      0: '"Promote everything and ask others to revert" is operationally hostile and exposes Prod to four unfinished changes — exactly the situation selective deploy is designed to prevent.',
      2: 'XMLA-direct-to-Prod skips the pipeline\'s audit trail and deployment rules, and creates drift between Prod and Test that the next full deploy will overwrite.',
      3: 'Backward deploy is for reproducing Prod issues in Test, not for delivering a Dev-originated hotfix to Prod.'
    },
    source: SRC.deployment,
    tags: ['deployment-pipelines', 'scenario', 'selective', 'hotfix']
  }),
  single({
    id: 'scn-06-q2',
    type: 'scenario-single',
    domain: 'maintain',
    subtopic: 'deployment-pipelines',
    difficulty: 3,
    scenarioId: 'scn-06',
    scenarioTitle: 'Stark Industries hotfix selective deploy',
    prompt:
      'The on-call analyst attempts the selective deployment and gets a permission error promoting Test → Prod. Given they have Member on Test and Viewer on Prod, what is the minimum-privilege fix?',
    options: [
      'Grant the analyst Admin on Prod',
      'Grant the analyst Contributor (or higher) on the Prod workspace — Member on source plus Contributor on target is the documented minimum to deploy',
      'Add the analyst as Pipeline Admin on the deployment pipeline only',
      'Have the on-call analyst share screen with a Prod Admin and have the Admin click Deploy'
    ],
    correct: 1,
    explanation:
      'Deployment requires sufficient rights on BOTH ends. Member on the source (sufficient — Member can read and initiate), and Contributor on the target (the documented minimum for write access). Viewer on Prod is the blocker; Contributor is the smallest grant that lifts it.',
    whyWrong: {
      0: 'Admin on Prod is over-privileged for a deploy task — violates least privilege.',
      2: 'Pipeline Admin lets you manage the pipeline structure (assign workspaces, etc.) but does NOT bypass the workspace-level deploy permissions.',
      3: 'Driver-handoff "click for me" works mechanically but creates an audit trail in the wrong identity and is brittle for an on-call workflow.'
    },
    source: SRC.deployment,
    tags: ['deployment-pipelines', 'scenario', 'permissions']
  }),

  // ─── scn-07 — Wayne RLS+OLS+labels (2 Qs) ─────────────────────────
  multi({
    id: 'scn-07-q1',
    type: 'scenario-multi',
    domain: 'maintain',
    subtopic: 'security-rls',
    difficulty: 5,
    scenarioId: 'scn-07',
    scenarioTitle: 'Wayne Enterprises RLS+OLS+labels',
    prompt:
      'Which combination of features correctly delivers ALL THREE of Wayne\'s requirements (regional row filtering, [Margin %] hidden from non-finance, label propagation to exports)?',
    options: [
      'RLS with one role per region for row filtering',
      'OLS to hide the [Margin %] column from a "non-finance" role so it does not appear in the field list',
      'A measure that returns BLANK for non-finance instead of OLS',
      'A "Highly Confidential" sensitivity label applied to the semantic model so it propagates to Excel exports',
      'Sensitivity labels in place of RLS, since the label can carry access policy'
    ],
    correct: [0, 1, 3],
    explanation:
      'Three orthogonal controls: RLS for row filtering (per-region roles), OLS for object hiding ([Margin %] disappears from the schema for non-finance roles), and sensitivity labels for downstream propagation (Excel honours the label via MIP). The BLANK-measure approach fails because the column name is still visible in the field list, and labels do not replace RLS — they classify, they do not row-filter.',
    whyWrong: {
      2: 'A measure returning BLANK still leaves the column NAME visible in the field list — the requirement is "not even visible". Only OLS hides the object entirely.',
      4: 'Sensitivity labels classify and apply protection (encryption, watermarking) but do not row-filter. RLS is the row-filter primitive; labels are complementary, not a replacement.'
    },
    source: SRC.rls,
    tags: ['rls', 'ols', 'sensitivity', 'scenario']
  }),
  single({
    id: 'scn-07-q2',
    type: 'scenario-single',
    domain: 'maintain',
    subtopic: 'security-rls',
    difficulty: 5,
    scenarioId: 'scn-07',
    scenarioTitle: 'Wayne Enterprises RLS+OLS+labels',
    prompt:
      'A user belongs to BOTH the Americas and EMEA RLS roles for legitimate cross-regional reporting reasons. What rows do they see?',
    options: [
      'Only Americas rows (first role wins)',
      'Only EMEA rows (last role wins)',
      'The intersection — only rows that are in both Americas AND EMEA (which is empty)',
      'The UNION — Americas rows OR EMEA rows'
    ],
    correct: 3,
    explanation:
      'RLS roles combine with UNION (OR) semantics. A user assigned to multiple roles sees rows matching ANY of their roles. This is by design — it means "more roles = more visibility", never less. Wayne\'s cross-regional analyst gets exactly what they need.',
    whyWrong: {
      0: 'There is no "first role wins" precedence; all roles a user is in apply.',
      1: 'There is no "last role wins" precedence either.',
      2: 'Intersection semantics would be a security feature ("must satisfy ALL roles"), but RLS uses UNION — and Wayne\'s requirement is satisfied by UNION.'
    },
    source: SRC.rls,
    tags: ['rls', 'scenario', 'multiple-roles']
  }),

  // ─── scn-08 — Hooli workspace audit (2 Qs) ────────────────────────
  single({
    id: 'scn-08-q1',
    type: 'scenario-single',
    domain: 'maintain',
    subtopic: 'governance',
    difficulty: 4,
    scenarioId: 'scn-08',
    scenarioTitle: 'Hooli workspace-role audit',
    prompt:
      'Where should Hooli pull the 90-day record of workspace access and role grants/revocations from to satisfy the SOC 2 finding?',
    options: [
      'The Fabric Capacity Metrics app',
      'The Microsoft Purview audit log (M365 Unified Audit Log) — Fabric publishes role changes and access events into it',
      'The workspace usage page in the Power BI service',
      'The Fabric monitoring hub'
    ],
    correct: 1,
    explanation:
      'Tenant-level audit-grade events (who accessed what, when, who granted what role) live in the M365 / Purview Unified Audit Log. Fabric publishes events into it. Capacity metrics covers compute consumption, the workspace usage page covers view counts, monitoring hub covers job runs — none of those are audit-grade.',
    whyWrong: {
      0: 'Capacity Metrics shows CU consumption per item, not user access events.',
      2: 'Workspace usage page shows view counts and rough usage trends, not auditable access events.',
      3: 'Monitoring hub watches your jobs and pipelines, not user actions.'
    },
    source: SRC.governance,
    tags: ['governance', 'scenario', 'audit', 'purview']
  }),
  multi({
    id: 'scn-08-q2',
    type: 'scenario-multi',
    domain: 'maintain',
    subtopic: 'governance',
    difficulty: 5,
    scenarioId: 'scn-08',
    scenarioTitle: 'Hooli workspace-role audit',
    prompt:
      'Which tenant-setting and workspace-hygiene actions DIRECTLY address the auditor\'s findings? Select all that apply.',
    options: [
      'Enable export of audit logs to a designated security group at tenant level so auditors can pull evidence themselves',
      'Remove the former employee\'s Admin assignment immediately and audit other workspaces for similar orphan accounts',
      'Replace the contractors\' direct workspace Member grants with a time-bound Entra ID group membership and remove on contract end',
      'Switch the workspace to V2 to inherit tenant audit settings',
      'Disable the workspace entirely until the audit closes'
    ],
    correct: [0, 1, 2],
    explanation:
      'Three real fixes: enable audit-log export so the auditor has self-service evidence; revoke the orphan Admin and sweep for others (a known audit pattern); replace ad-hoc contractor grants with group-based time-bound membership so "temporarily" actually expires. There is no "V2 workspace" toggle, and disabling the workspace breaks business continuity without addressing the underlying controls.',
    whyWrong: {
      3: 'There is no "V2 workspace" toggle that inherits tenant audit settings — workspaces are governed by tenant settings already; you must enable the audit log export.',
      4: 'Disabling the workspace breaks business operations and does not address the underlying control gaps the auditor flagged.'
    },
    source: SRC.governance,
    tags: ['governance', 'scenario', 'tenant-settings', 'access-review']
  }),

  // ─── scn-09 — Umbrella medallion (3 Qs) ───────────────────────────
  single({
    id: 'scn-09-q1',
    type: 'scenario-single',
    domain: 'prepare',
    subtopic: 'medallion',
    difficulty: 4,
    scenarioId: 'scn-09',
    scenarioTitle: 'Umbrella Foods Bronze→Silver→Gold',
    prompt:
      'Which Bronze layer responsibility is OUT OF SCOPE for Umbrella\'s medallion design?',
    options: [
      'Lossless capture of raw source data (JSON/CSV preserved as-is or as Delta with original schema)',
      'Schema-on-read enrichment, type casting, and business rules',
      'Source-of-truth replay material — keep raw long enough to reprocess Silver',
      'Lineage metadata: ingestion timestamp, source system, file hash'
    ],
    correct: 1,
    explanation:
      'Bronze is the lossless landing zone — preserve exactly what arrived from the source so Silver can be reprocessed if logic changes. Type casting, conformance, and business rules are SILVER concerns. Mixing them into Bronze destroys the replay invariant and couples the layers.',
    whyWrong: {
      0: 'Lossless capture is the textbook Bronze responsibility.',
      2: 'Replay material IS Bronze\'s purpose.',
      3: 'Lineage metadata is exactly what Bronze should add (without altering payload contents).'
    },
    source: SRC.fabricArch,
    tags: ['medallion', 'scenario', 'bronze']
  }),
  single({
    id: 'scn-09-q2',
    type: 'scenario-single',
    domain: 'prepare',
    subtopic: 'medallion',
    difficulty: 5,
    scenarioId: 'scn-09',
    scenarioTitle: 'Umbrella Foods Bronze→Silver→Gold',
    prompt:
      'For Silver transformations on a 14-source CPG pipeline with complex JSON unnesting and slowly-changing dimension logic, which choice is BEST?',
    options: [
      'Spark notebooks (PySpark) in the Lakehouse — the right tool for complex multi-source transformations and SCD logic',
      'Stored procedures in the Warehouse — Silver should be T-SQL only',
      'Dataflow Gen2 — point-and-click is always preferable',
      'Mirror the sources directly into Silver and skip transformations'
    ],
    correct: 0,
    explanation:
      'Spark notebooks handle complex JSON unnesting, multi-source joins, and SCD2 patterns more naturally and at scale than T-SQL or Dataflow Gen2. T-SQL stored procedures in Warehouse work for some Silver transforms but struggle with deeply-nested JSON; Dataflow Gen2 is fine for simpler Silver but hits ceilings on 14-source complexity; mirroring sources is a Bronze concern, not Silver.',
    whyWrong: {
      1: 'Stored procedures can do simple Silver work but choke on heavy JSON unnesting and complex SCD logic at scale.',
      2: 'Dataflow Gen2 is excellent for analyst-driven simple ingestion but is the wrong primary tool for complex multi-source Silver in a 14-source CPG pipeline.',
      3: 'Mirroring is a Bronze-equivalent path; Silver is where the cleaning HAPPENS, not where it is bypassed.'
    },
    source: SRC.notebooks,
    tags: ['medallion', 'scenario', 'silver', 'notebooks']
  }),
  single({
    id: 'scn-09-q3',
    type: 'scenario-single',
    domain: 'prepare',
    subtopic: 'medallion',
    difficulty: 4,
    scenarioId: 'scn-09',
    scenarioTitle: 'Umbrella Foods Bronze→Silver→Gold',
    prompt:
      'Gold is the BI-serving layer (star schema facts/dims, Direct Lake semantic models). Which backing store choice fits BEST given Direct Lake is the consumption pattern?',
    options: [
      'Lakehouse — Delta tables in OneLake, natively Direct-Lake-capable',
      'Warehouse — also Direct-Lake-capable; choose based on team preference for T-SQL versus Spark',
      'KQL Database — better for star schema',
      'A second Lakehouse used as a publishing layer with a OneLake shortcut to Bronze'
    ],
    correct: 1,
    explanation:
      'BOTH Lakehouse and Warehouse persist data as Delta in OneLake and can serve Direct Lake. The choice should be driven by team skill (T-SQL vs Spark), schema-evolution patterns, and write-access patterns — not by Direct Lake compatibility. KQL DB uses Kusto storage and cannot serve Direct Lake.',
    whyWrong: {
      0: 'Lakehouse is correct but framed as exclusive — Warehouse is equally Direct-Lake-capable. The exam tests that you know BOTH work.',
      2: 'KQL Database uses the Kusto engine, NOT Delta-Parquet — it cannot serve Direct Lake (it serves DirectQuery).',
      3: 'A "publishing Lakehouse" with shortcut adds a hop without benefit and is not the standard Gold pattern.'
    },
    source: SRC.fabricArch,
    tags: ['medallion', 'scenario', 'gold', 'direct-lake']
  }),

  // ─── scn-10 — Pied Piper Dataflow vs Notebook (2 Qs) ──────────────
  single({
    id: 'scn-10-q1',
    type: 'scenario-single',
    domain: 'prepare',
    subtopic: 'dataflow',
    difficulty: 4,
    scenarioId: 'scn-10',
    scenarioTitle: 'Pied Piper Dataflow vs Notebook',
    prompt:
      'Given Pied Piper\'s skill mix (90% Power Query/SQL, 10% PySpark), 25-minute SLA, and maintenance-burden goal, which choice is BEST overall?',
    options: [
      'Spark notebook — it will always be faster and cheaper at 8 GB/day',
      'Dataflow Gen2 — best fit for the team\'s skill mix and the data volume; revisit if it cannot hit the 25-minute SLA',
      'Stored procedure in a Warehouse — fastest path for SQL teams',
      'Mirroring — eliminates the ingestion job entirely'
    ],
    correct: 1,
    explanation:
      'At 8 GB/day with a 25-minute SLA, Dataflow Gen2 is well within capability and matches the team\'s skill mix. Long-term maintenance burden is lower because 90% of the team can debug it without learning PySpark. The contractor\'s notebook proposal optimises for compute that isn\'t the bottleneck. Revisit notebooks only if the SLA gets squeezed or the data scales 10x.',
    whyWrong: {
      0: 'Notebooks are not "always faster" at 8 GB; bring-up cost and team retraining swamp any per-run savings, and the contractor leaving creates a maintenance cliff.',
      2: 'Stored procs would require landing the JSON in Warehouse first — Warehouse T-SQL JSON support is limited and would be a worse fit than Dataflow Gen2 with native Power Query JSON.',
      3: 'Mirroring is for upstream operational databases (Azure SQL DB, Cosmos, Snowflake), not for daily JSON file drops.'
    },
    source: SRC.dataflow,
    tags: ['dataflow', 'scenario', 'tradeoff', 'notebooks']
  }),
  single({
    id: 'scn-10-q2',
    type: 'scenario-single',
    domain: 'prepare',
    subtopic: 'dataflow',
    difficulty: 4,
    scenarioId: 'scn-10',
    scenarioTitle: 'Pied Piper Dataflow vs Notebook',
    prompt:
      'Six months later the daily file size grows to 80 GB and the Dataflow Gen2 job runs 1h 50m. The team has hired two more PySpark engineers. What is the right re-decision?',
    options: [
      'Re-platform the daily ingest to a Spark notebook — at 80 GB and with the team capacity to maintain it, the original tradeoff has flipped',
      'Stay on Dataflow Gen2 forever — switching tools is always wrong',
      'Move the entire pipeline to Mirroring',
      'Increase the F SKU to make Dataflow Gen2 faster'
    ],
    correct: 0,
    explanation:
      'The original choice was right for its time. Two inputs changed (data volume 10x, team has Spark capacity now), so the tradeoff flipped. This is the "revisit when conditions change" half of the original decision — recognise it and switch deliberately, don\'t cling to the prior choice.',
    whyWrong: {
      1: '"Switching tools is always wrong" is a sunk-cost fallacy. The point of revisiting is to change when the inputs change.',
      2: 'Mirroring still does not fit a daily JSON file drop pattern even at 80 GB — Mirroring is for source databases, not files.',
      3: 'Throwing capacity at Dataflow Gen2 buys some headroom but does not address that PySpark is structurally better at this scale, and capacity costs scale linearly.'
    },
    source: SRC.notebooks,
    tags: ['dataflow', 'scenario', 'tradeoff-revisit', 'scale']
  }),

  // ─── scn-11 — Soylent shortcut vs ingest vs mirror (2 Qs) ─────────
  single({
    id: 'scn-11-q1',
    type: 'scenario-single',
    domain: 'prepare',
    subtopic: 'onelake-shortcuts',
    difficulty: 4,
    scenarioId: 'scn-11',
    scenarioTitle: 'Soylent Industries OneLake shortcut vs ingest',
    prompt:
      'Which approach gives Soylent the LOWEST storage duplication while still letting the central Lakehouse query all six regions together?',
    options: [
      'OneLake shortcuts from each ADLS container into a central Lakehouse — data stays in ADLS, Fabric reads it in place',
      'Mirror each region\'s Azure SQL DB — Fabric maintains an independent Delta replica',
      'Re-ingest via Data Pipelines into a Bronze Lakehouse — full physical copy in OneLake',
      'Have each region publish their semantic model and use composite to query them'
    ],
    correct: 0,
    explanation:
      'OneLake shortcuts read data in place from ADLS — zero duplication in OneLake, lowest storage cost. Mirroring writes Delta replicas into OneLake (duplicated storage but auto-synced). Re-ingest creates the most duplication. Composite-of-models is a query-time pattern, not a storage strategy.',
    whyWrong: {
      1: 'Mirroring duplicates the data into OneLake by design — auto-synced but not "low duplication".',
      2: 'Re-ingest is by definition a full copy.',
      3: 'Composite models are not a storage solution at all; they federate at query time and add complexity.'
    },
    source: SRC.onelakeShortcuts,
    tags: ['shortcuts', 'scenario', 'storage-tradeoff']
  }),
  single({
    id: 'scn-11-q2',
    type: 'scenario-single',
    domain: 'prepare',
    subtopic: 'onelake-shortcuts',
    difficulty: 5,
    scenarioId: 'scn-11',
    scenarioTitle: 'Soylent Industries OneLake shortcut vs ingest',
    prompt:
      'Soylent\'s central data team needs to enforce row-level security at the central layer regardless of regional team behaviour, and the regional teams change ADLS schemas without coordination. Which approach is BEST?',
    options: [
      'Shortcuts — schema changes upstream propagate immediately and central RLS reads the same source',
      'Mirroring — auto-syncs but central RLS still applies on the mirrored copy',
      'Re-ingest into a Bronze Lakehouse with a contract-validation step in the pipeline; central RLS is enforced on the curated Silver/Gold layer the central team controls',
      'Composite models reading the regional models directly'
    ],
    correct: 2,
    explanation:
      'When upstream teams change schemas without coordination, shortcuts and mirroring propagate the breakage straight into the central model. Re-ingest with contract validation gives the central team a stable Silver/Gold to enforce RLS on, and a clear failure point when an upstream contract breaks. Storage duplication is the price for governance and decoupling — and worth it given the constraints.',
    whyWrong: {
      0: 'Uncoordinated upstream schema changes will instantly break shortcuts; great for lowest cost (q1), wrong here.',
      1: 'Mirroring auto-syncs schema changes too — it propagates breakage just as fast.',
      3: 'Composite over regional models gives the central team zero control over how the regional models are built — worst governance choice.'
    },
    source: SRC.onelakeShortcuts,
    tags: ['shortcuts', 'mirroring', 'scenario', 'governance-tradeoff']
  }),

  // ─── scn-12 — Massive Dynamic CALCULATE perf (2 Qs) ───────────────
  single({
    id: 'scn-12-q1',
    type: 'scenario-single',
    domain: 'semantic',
    subtopic: 'dax-performance',
    difficulty: 5,
    scenarioId: 'scn-12',
    scenarioTitle: 'Massive Dynamic CALCULATE perf trap',
    prompt:
      'Performance Analyzer shows storage engine 200 ms, formula engine 13.5 s. What does this strongly indicate?',
    options: [
      'Direct Lake is too slow — switch to Import',
      'A formula-engine bottleneck — likely materialisation of large intermediate tables driven by SUMX-over-CALCULATE-with-context-transition, which the formula engine cannot push down to storage',
      'The capacity is undersized — go from F64 to F128',
      'Network latency between OneLake and the model'
    ],
    correct: 1,
    explanation:
      'A 200 ms SE / 13.5 s FE split is the classic signature of a formula-engine-bound query. SUMX over CALCULATE with FILTER(ALL(...)) and context-transition forces the FE to materialise large intermediate tables that the SE cannot help with. Switching storage modes does NOTHING for FE-bound work — you must rewrite the DAX (e.g., remove unnecessary CALCULATE wrappers, replace context transition with explicit relationships, push aggregation into the SE-friendly forms).',
    whyWrong: {
      0: 'Direct Lake feeds the SE; the SE is fast (200 ms). Import would not change the FE work at all.',
      2: 'More CU does not parallelise FE work in this pattern; FE is largely single-threaded per query.',
      3: 'Network latency would show up in storage engine time, not formula engine time.'
    },
    source: SRC.daxPerf,
    tags: ['dax', 'scenario', 'performance', 'formula-engine']
  }),
  single({
    id: 'scn-12-q2',
    type: 'scenario-single',
    domain: 'semantic',
    subtopic: 'dax-performance',
    difficulty: 5,
    scenarioId: 'scn-12',
    scenarioTitle: 'Massive Dynamic CALCULATE perf trap',
    prompt:
      'Which DAX rewrite is MOST LIKELY to deliver the largest improvement?',
    options: [
      'Replace SUMX-over-CALCULATE with a single CALCULATE that uses TREATAS or KEEPFILTERS where appropriate, eliminating row-by-row context transition; remove the calculated column in favour of a pre-aggregated upstream column',
      'Wrap every measure in another CALCULATE for "context safety"',
      'Add more FILTER(ALL(...)) arguments to give the engine more options',
      'Convert all measures to calculated columns for pre-computation'
    ],
    correct: 0,
    explanation:
      'The fix is to eliminate per-row context transition. TREATAS / KEEPFILTERS let you set the filter context once instead of via row-by-row CALCULATE; pushing the calculated column upstream lets Direct Lake serve a native column without breaking the storage mode. Both reduce FE materialisation pressure dramatically.',
    whyWrong: {
      1: 'Extra CALCULATE wrappers ADD context transitions and make the problem worse, not better.',
      2: 'More FILTER(ALL(...)) clauses add expansion work, not reduce it.',
      3: 'Calculated columns in Direct Lake break the storage mode (see scn-01) and do not solve formula-engine problems anyway.'
    },
    source: SRC.daxPerf,
    tags: ['dax', 'scenario', 'rewrite', 'context-transition']
  }),

  // ─── scn-13 — Cyberdyne calc groups + field params (2 Qs) ─────────
  single({
    id: 'scn-13-q1',
    type: 'scenario-single',
    domain: 'semantic',
    subtopic: 'semantic-modeling',
    difficulty: 4,
    scenarioId: 'scn-13',
    scenarioTitle: 'Cyberdyne calc groups + field params',
    prompt:
      'Which combination correctly delivers the consolidation Cyberdyne wants while keeping the field list clean?',
    options: [
      'A single calculation group "Time Intelligence" containing items {Current, YTD, QTD, MTD, PY, YoY %} that applies to a base set of measures, plus a field parameter that lets the user pick {Sales, Margin, Volume, GP}',
      'Display folders only — no need for calculation groups',
      'One calculation group per metric (Sales, Margin, Volume, GP) — calculation groups should be metric-specific',
      'Replace all measures with calculated columns and use slicers'
    ],
    correct: 0,
    explanation:
      'A single time-intelligence calculation group provides the {Current, YTD, QTD, MTD, PY, YoY %} variants and applies dynamically to whichever base measure is selected. A field parameter exposes {Sales, Margin, Volume, GP} as a single user-pickable axis. Together: 6 calc-group items × 4 base measures = 24 effective measures from ~5 definitions, dramatically reducing the field-list clutter.',
    whyWrong: {
      1: 'Display folders alleviate visual clutter but do not eliminate the duplicated DEFINITIONS — every new metric still requires six new measures.',
      2: 'Calculation groups should be cross-cutting (time intel, currency, scenario), not per-metric. One per metric is anti-pattern.',
      3: 'Calculated columns instead of measures destroys the entire semantic-model abstraction and would break Direct Lake on those tables.'
    },
    source: SRC.semanticModel,
    tags: ['calc-groups', 'field-parameters', 'scenario']
  }),
  single({
    id: 'scn-13-q2',
    type: 'scenario-single',
    domain: 'semantic',
    subtopic: 'semantic-modeling',
    difficulty: 4,
    scenarioId: 'scn-13',
    scenarioTitle: 'Cyberdyne calc groups + field params',
    prompt:
      'After deploying the calc-group + field-parameter design, the team must train report authors. Which behaviour will surprise them MOST if they are unaware of it?',
    options: [
      'Calculation group items take precedence over base measure formats unless the calc-group item explicitly defers',
      'Field parameters automatically remove the underlying measures from the model',
      'Calculation groups disable Direct Lake on the model',
      'Field parameters cannot be used in slicers'
    ],
    correct: 0,
    explanation:
      'A common gotcha: calculation group items can override the format string of the base measure (e.g., a YoY% item formatting as percentage). If authors apply [Sales] (currency) with the YoY% calc-group item, the format becomes percent — which is intended for YoY%, but unexpected if you don\'t know the precedence. Authors need to learn this once and design item formats accordingly.',
    whyWrong: {
      1: 'Field parameters do not delete the underlying measures — they just provide a user-selectable wrapper.',
      2: 'Calculation groups are fully compatible with Direct Lake.',
      3: 'Field parameters work in slicers — that is in fact a primary use case.'
    },
    source: SRC.semanticModel,
    tags: ['calc-groups', 'scenario', 'format-precedence']
  }),

  // ─── scn-14 — Aperture Eventhouse (2 Qs) ──────────────────────────
  single({
    id: 'scn-14-q1',
    type: 'scenario-single',
    domain: 'prepare',
    subtopic: 'kql',
    difficulty: 4,
    scenarioId: 'scn-14',
    scenarioTitle: 'Aperture Science Eventhouse stream',
    prompt:
      'Which KQL pattern fastest isolates the device-group spike between 14:30 and 14:45 UTC?',
    options: [
      'TelemetryRaw | where Timestamp between (datetime(2024-01-01 14:30) .. datetime(2024-01-01 14:45)) | summarize ErrorCount = count() by DeviceClass, FirmwareVersion | top 20 by ErrorCount desc',
      'TelemetryRaw | summarize count() by DeviceClass | take 100',
      'TelemetryRaw | sort by Timestamp desc | take 1000000',
      'TelemetryRaw | join kind=inner (DeploymentLookup) on DeviceClass | where Timestamp between (datetime(2024-01-01 14:30) .. datetime(2024-01-01 14:45))'
    ],
    correct: 0,
    explanation:
      'Filter early on the time-range partition predicate, then summarise by the dimensional axes (DeviceClass × FirmwareVersion), then top-N. This pushes work down to the storage engine (the time predicate is on the partition column) and minimises the data touched.',
    whyWrong: {
      1: 'No time filter — scans the entire 25k-event/sec stream over the whole retention window. Brutal performance.',
      2: 'Sorting 1.2 billion rows and taking the top million is a worst-case operation; you have not even isolated by dimension.',
      3: 'Joining BEFORE filtering by time multiplies work by the dimension table size; always filter first, then join.'
    },
    source: SRC.kql,
    tags: ['kql', 'scenario', 'eventhouse', 'investigation']
  }),
  single({
    id: 'scn-14-q2',
    type: 'scenario-single',
    domain: 'prepare',
    subtopic: 'kql',
    difficulty: 4,
    scenarioId: 'scn-14',
    scenarioTitle: 'Aperture Science Eventhouse stream',
    prompt:
      'The deployments lookup table sits in a separate Lakehouse, not the Eventhouse. What is the BEST way to enrich the suspect device groups with deployment metadata?',
    options: [
      'Use a OneLake shortcut from the Lakehouse Delta table into the Eventhouse and join via KQL',
      'Export the KQL result to CSV, manually VLOOKUP in Excel',
      'Manually copy the lookup table into the Eventhouse weekly',
      'Switch the entire pipeline to Spark notebooks for the join'
    ],
    correct: 0,
    explanation:
      'OneLake shortcuts let an Eventhouse reference an external Delta table as if it were local — including in KQL joins. Single source of truth, no duplication, near-real-time correctness. Manual exports and weekly copies introduce drift; switching the pipeline to Spark for one join is overkill.',
    whyWrong: {
      1: 'Manual Excel VLOOKUP is not engineering — it does not scale and is error-prone.',
      2: 'Weekly manual copies introduce stale-lookup drift and operational toil.',
      3: 'Re-platforming to Spark to do one join is a sledgehammer for a tack.'
    },
    source: SRC.eventhouse,
    tags: ['kql', 'scenario', 'shortcuts', 'enrichment']
  }),

  // ─── scn-15 — Tyrell KQL perf triage (2 Qs) ───────────────────────
  single({
    id: 'scn-15-q1',
    type: 'scenario-single',
    domain: 'prepare',
    subtopic: 'kql',
    difficulty: 5,
    scenarioId: 'scn-15',
    scenarioTitle: 'Tyrell Corp KQL summarize/join triage',
    prompt:
      'What is the SINGLE largest performance issue in the analyst\'s query?',
    options: [
      'The `where TimeGenerated >= ago(7d)` is at the BOTTOM of the query — the join and summarize are scanning all 1.2 billion rows before the time filter is applied',
      'The `summarize` is the wrong operator',
      'KQL cannot join two tables of different sizes',
      'The 4-million-row UserDirectory is too small for the join'
    ],
    correct: 0,
    explanation:
      'KQL is a pipeline language but does NOT magically push predicates upward. A `where` at the bottom executes after the join — meaning the join runs against ALL 1.2 billion rows, not the 280-million-row 7-day window. Move the time filter to the FIRST line on SignInEvents and the join hits a ~4x smaller dataset.',
    whyWrong: {
      1: 'Summarize is the right operator for a count by tenant; that is not the issue.',
      2: 'KQL joins tables of arbitrary sizes routinely; size is not the issue.',
      3: 'A 4-million-row dimension table is small and well-suited for the right side of a join (with kind=inner the right is broadcast); not the issue.'
    },
    source: SRC.kql,
    tags: ['kql', 'scenario', 'performance', 'predicate-pushdown']
  }),
  single({
    id: 'scn-15-q2',
    type: 'scenario-single',
    domain: 'prepare',
    subtopic: 'kql',
    difficulty: 5,
    scenarioId: 'scn-15',
    scenarioTitle: 'Tyrell Corp KQL summarize/join triage',
    prompt:
      'After moving the time filter to the top, what is the second-most-impactful change?',
    options: [
      'Reverse the join order so the LARGER (filtered) SignInEvents is on the LEFT and the smaller UserDirectory is on the RIGHT — KQL joins broadcast the right side',
      'Replace `join kind=inner` with `join kind=cross`',
      'Add ORDER BY before the join',
      'Convert the query to T-SQL'
    ],
    correct: 0,
    explanation:
      'In KQL, the right side of a join is the one being broadcast/looked-up against. Best practice is large on the LEFT, small on the RIGHT — opposite of the SQL habit some analysts have. Tyrell put the small dim on the left and the giant fact on the right, doubling the work the engine does.',
    whyWrong: {
      1: 'Cross join multiplies row counts catastrophically — would explode the result set.',
      2: 'ORDER BY before a join would force a sort on billions of rows for no benefit.',
      3: 'KQL DBs do not support T-SQL; this is not a real option.'
    },
    source: SRC.kql,
    tags: ['kql', 'scenario', 'performance', 'join-order']
  }),

  /* ═══════ Wave-2 deployment scenarios (scn-16..19, 10 Qs) ═══════ */
  single({
    id: 'scn-16-q1', type: 'scenario-single', domain: 'maintain', subtopic: 'deployment-pipelines', difficulty: 5,
    scenarioId: 'scn-16', scenarioTitle: 'Helix Robotics parameter-rule silent no-op',
    prompt: 'Why did the rule silently fail to rebind?',
    options: ['Parameter rules cannot override Power Query parameters', 'Parameter rule binding is CASE-SENSITIVE on parameter NAME — `psqlserver` does not match `pSqlServer` and the rule no-ops', 'The rule is on the wrong stage (should be on Test, not Prod)', 'Rules only apply to data-source connections, not M parameters'],
    correct: 1,
    explanation: 'Parameter Rule binding is by exact, case-sensitive parameter name. `psqlserver` and `pSqlServer` are different names → rule does not bind → no-op silently → Test connection persists into Prod.',
    whyWrong: { 0: 'Parameter rules absolutely override Power Query parameters when names match.', 2: 'Rules belong on the TARGET stage; Production is correct.', 3: 'Parameter rules apply to M parameters; Data Source rules apply to connections — both are valid rule types.' },
    source: SRC.deployment, tags: ['scenario', 'deployment-pipelines', 'parameter-rule', 'case-sensitive']
  }),
  multi({
    id: 'scn-16-q2', type: 'scenario-multi', domain: 'maintain', subtopic: 'deployment-pipelines', difficulty: 5,
    scenarioId: 'scn-16', scenarioTitle: 'Helix Robotics parameter-rule silent no-op',
    prompt: 'Which remediation steps are appropriate? Select all that apply.',
    options: ['Rename the rule key to `pSqlServer` exactly matching the parameter name', 'Rename the parameter in the model to lowercase `psqlserver` and re-deploy', 'Add a Data Source Rule as a fallback — it does not require a parameter name match', 'Force-disable the parameter and hard-code the connection in the model', 'Re-validate by viewing the deployed item\'s effective connection on Production'],
    correct: [0, 1, 2, 4],
    explanation: 'Either side of the binding can be normalized — fix the rule key OR the parameter name. A Data Source Rule is a viable alternative path. Validating the deployed item\'s effective connection confirms the fix.',
    whyWrong: { 3: 'Hard-coding connections in the model defeats the purpose of pipeline-managed promotion and re-introduces environment drift.' },
    source: SRC.deployment, tags: ['scenario', 'deployment-pipelines', 'remediation']
  }),
  single({
    id: 'scn-17-q1', type: 'scenario-single', domain: 'maintain', subtopic: 'deployment-pipelines', difficulty: 5,
    scenarioId: 'scn-17', scenarioTitle: 'Vertex Bank cross-workspace shared model',
    prompt: 'Why did the report in Test still point at the Dev-core semantic model?',
    options: ['Cross-workspace references are unsupported in pipelines', 'Both workspaces (the report workspace AND the shared-model workspace) must be PAIRED into the pipeline\'s stages for cross-workspace references to auto-rebind on promotion', 'A Data Source Rule is required for shared-model bindings', 'The Dev-core model must be re-published to Prod-core first'],
    correct: 1,
    explanation: 'When two workspaces are paired (each contributes a workspace at every stage), Fabric auto-rebinds cross-workspace semantic-model references between the paired workspaces on promotion. A report workspace alone in the pipeline cannot rebind a reference to a workspace that has no pipeline counterpart.',
    whyWrong: { 0: 'Cross-workspace references ARE supported with proper pairing.', 2: 'No data source rule applies to shared-model bindings; pairing is the mechanism.', 3: 'Re-publishing Dev-core to Prod-core is unrelated; the binding indirection happens through pairing.' },
    source: SRC.deployment, tags: ['scenario', 'cross-workspace', 'pairing']
  }),
  single({
    id: 'scn-17-q2', type: 'scenario-single', domain: 'maintain', subtopic: 'deployment-pipelines', difficulty: 4,
    scenarioId: 'scn-17', scenarioTitle: 'Vertex Bank cross-workspace shared model',
    prompt: 'After pairing both workspaces, deployment rebinds correctly. The team wants automated promotion via Azure DevOps. What is the supported entry point?',
    options: ['Direct XMLA writes from the pipeline runner', 'Power BI / Fabric REST APIs (Deploy stage endpoints), called from the build pipeline with a service principal', 'GitHub Webhooks on the workspace', 'Manual button-click only — no API support'],
    correct: 1,
    explanation: 'Deployment Pipelines have a REST API for triggering stage deployments. Service principal auth + ADO/GitHub Actions is the canonical CI/CD pattern.',
    whyWrong: { 0: 'XMLA is for tabular model management, not pipeline triggering.', 2: 'Webhooks do not directly trigger pipeline promotions.', 3: 'API support exists explicitly for automation.' },
    source: SRC.deployment, tags: ['scenario', 'automation', 'rest-api']
  }),
  multi({
    id: 'scn-17-q3', type: 'scenario-multi', domain: 'maintain', subtopic: 'deployment-pipelines', difficulty: 5,
    scenarioId: 'scn-17', scenarioTitle: 'Vertex Bank cross-workspace shared model',
    prompt: 'After pairing, which behaviors should the team EXPECT? Select all that apply.',
    options: ['Reports promoted in the report-workspace pipeline rebind to the matching shared-model workspace at the same stage', 'A Data Source Rule on the report workspace is still needed to rebind external SQL connections', 'Item IDs are preserved across stages, so external API references remain stable', 'Connection credentials promote with the artifacts', 'RLS member assignments on the shared model promote forward'],
    correct: [0, 1, 2],
    explanation: 'Pairing rebinds shared-model references. Data Source / Parameter rules still handle external connections. Item IDs are preserved. Credentials and RLS member lists are stage-scoped and never promote.',
    whyWrong: { 3: 'Connection credentials are environment-scoped and never promote.', 4: 'RLS member assignments are stage-specific and must be reconfigured on each stage.' },
    source: SRC.deployment, tags: ['scenario', 'cross-workspace', 'expectations']
  }),
  single({
    id: 'scn-18-q1', type: 'scenario-single', domain: 'maintain', subtopic: 'deployment-pipelines', difficulty: 4,
    scenarioId: 'scn-18', scenarioTitle: 'Aperture Logistics Gen1→Gen2 dataflow promotion failure',
    prompt: 'Why did the Gen1 dataflows fail to appear in the deployment list?',
    options: ['Gen1 dataflows are NOT supported by Fabric deployment pipelines — only Gen2', 'Gen1 dataflows require explicit selection in the pipeline UI', 'Gen1 dataflows promote only via the legacy Power BI deployment pipeline', 'A capacity-level setting enables Gen1 dataflows in pipelines'],
    correct: 0,
    explanation: 'Dataflow Gen1 is the legacy Power BI dataflow and is explicitly NOT supported in Fabric deployment pipelines. Items must be migrated to Gen2 to participate.',
    whyWrong: { 1: 'There is no checkbox to enable Gen1 — they are excluded.', 2: 'There is no separate Gen1 pipeline path that supports them in Fabric.', 3: 'No capacity-level toggle enables Gen1 promotion.' },
    source: SRC.deployment, tags: ['scenario', 'dataflow-gen1', 'unsupported']
  }),
  multi({
    id: 'scn-18-q2', type: 'scenario-multi', domain: 'maintain', subtopic: 'deployment-pipelines', difficulty: 5,
    scenarioId: 'scn-18', scenarioTitle: 'Aperture Logistics Gen1→Gen2 dataflow promotion failure',
    prompt: 'What is the appropriate migration path? Select all that apply.',
    options: ['Re-author each Gen1 dataflow as a Gen2 dataflow in the Dev workspace', 'Validate the Gen2 dataflow against the same outputs and consumers', 'Once on Gen2, include them in the next Dev→Test deployment', 'Wait for Microsoft to add Gen1 support to pipelines', 'Bypass the pipeline — copy Gen1 manually to each stage'],
    correct: [0, 1, 2],
    explanation: 'Re-author as Gen2, validate, then promote via the pipeline. Waiting for Gen1 support is a non-starter (it is permanently excluded). Manual cross-stage copy of Gen1 sidesteps every benefit of the pipeline.',
    whyWrong: { 3: 'Gen1 support in Fabric pipelines is not on the roadmap; Gen2 is the supported path.', 4: 'Manual copy creates drift and undermines the pipeline\'s purpose.' },
    source: SRC.deployment, tags: ['scenario', 'gen1-to-gen2', 'migration']
  }),
  single({
    id: 'scn-19-q1', type: 'scenario-single', domain: 'maintain', subtopic: 'deployment-pipelines', difficulty: 5,
    scenarioId: 'scn-19', scenarioTitle: 'Soylent Industries hotfix backwards-deploy + RLS re-validate',
    prompt: 'After backward-deploying Prod→Test, the engineer notices Test queries against the TEST data sources, not Prod. Is this a bug?',
    options: ['Yes — backward deploy should preserve the source environment\'s connections', 'No — deployment rules on Test STILL fire for backward deploys, rebinding incoming content to Test sources', 'No — backward deploys disable all rules', 'Yes — file a Microsoft support ticket'],
    correct: 1,
    explanation: 'Rules on the target stage fire for ANY arrival, including backward deploys. This is by design and is usually exactly what you want when reproducing prod issues against test data.',
    whyWrong: { 0: 'Connections are environment-bound and rebind on arrival.', 2: 'Rules are not disabled for backward deploys.', 3: 'Behavior is by design.' },
    source: SRC.deployment, tags: ['scenario', 'backward-deploy', 'rules-apply']
  }),
  multi({
    id: 'scn-19-q2', type: 'scenario-multi', domain: 'maintain', subtopic: 'deployment-pipelines', difficulty: 5,
    scenarioId: 'scn-19', scenarioTitle: 'Soylent Industries hotfix backwards-deploy + RLS re-validate',
    prompt: 'Which RLS / OLS validations should the engineer perform on each stage AFTER the backward deploys? Select all that apply.',
    options: ['Verify that role MEMBER ASSIGNMENTS are still configured on each stage (members do NOT promote)', 'Verify the OLS-hidden columns are still hidden for the OLS role on each stage', 'Use "View as role" to spot-check that filters return the expected rows', 'Disable RLS temporarily on Prod to verify data is reachable', 'Confirm USERPRINCIPALNAME() returns the expected UPN for representative test users'],
    correct: [0, 1, 2, 4],
    explanation: 'Re-validate role memberships per stage (they do not promote). OLS object hiding is enforced by role definitions which DO promote — but verify the role still has hidden columns on the target. "View as role" and a UPN-echo measure are standard validation tools. Disabling RLS in Prod is a security incident.',
    whyWrong: { 3: 'Disabling RLS in Production is a security incident — never an acceptable validation step.' },
    source: SRC.deployment, tags: ['scenario', 'rls-validation', 'ols-validation']
  }),
  single({
    id: 'scn-19-q3', type: 'scenario-single', domain: 'maintain', subtopic: 'deployment-pipelines', difficulty: 4,
    scenarioId: 'scn-19', scenarioTitle: 'Soylent Industries hotfix backwards-deploy + RLS re-validate',
    prompt: 'After re-aligning lower stages, the engineer wants to make Git the source of truth again. What is the correct next step?',
    options: ['Force-push Prod state to Git\'s main branch', 'Branch a hotfix branch from the prod-aligned commit, commit the hotfix, open a PR back to main, and merge — then sync Dev workspace to the new main', 'Delete and re-create the Git connection', 'Mark the hotfix as out-of-scope for source control'],
    correct: 1,
    explanation: 'Branch from prod, codify the hotfix in Git, PR + merge to main, then "Update workspace" Dev to pull the merged hotfix. This restores Git as source of truth without losing the fix or the audit trail.',
    whyWrong: { 0: 'Force-push to main is destructive and loses commit history.', 2: 'Re-creating the Git connection drops history; unnecessary.', 3: 'Out-of-scope for source control means perpetual drift — the wrong outcome.' },
    source: SRC.deployment, tags: ['scenario', 'git-integration', 'source-of-truth']
  }),

  /* ═══════ Wave-2 semantic-model scenarios (scn-20..22, 8 Qs) ═══════ */
  single({
    id: 'scn-20-q1', type: 'scenario-single', domain: 'semantic', subtopic: 'star-schema', difficulty: 4,
    scenarioId: 'scn-20', scenarioTitle: 'Hyperion Energy star vs snowflake under Direct Lake',
    prompt: 'Why is the snowflake hurting Direct Lake performance more than it would hurt Import?',
    options: ['Direct Lake forbids snowflakes', 'Direct Lake reads on demand; chained relationships across tables increase the number of column segments paged in per query AND can introduce limited relationships if any chain partner is non-Direct-Lake', 'Snowflakes work fine in Direct Lake; the issue is elsewhere', 'Direct Lake recompiles DAX for every snowflake'],
    correct: 1,
    explanation: 'Direct Lake pages columns from OneLake into VertiPaq lazily. Each chain hop touches another table\'s columns. If any link is cross-island, the join becomes a limited relationship and pays the per-query coordination cost. Flattening into a star reduces hops and dictionary footprint.',
    whyWrong: { 0: 'Direct Lake does not "forbid" snowflakes; it just penalizes them more visibly.', 2: 'Snowflakes hurt; the question is by how much.', 3: 'No DAX recompile per snowflake.' },
    source: SRC.semanticModel, tags: ['scenario', 'star-schema', 'direct-lake']
  }),
  multi({
    id: 'scn-20-q2', type: 'scenario-multi', domain: 'semantic', subtopic: 'star-schema', difficulty: 5,
    scenarioId: 'scn-20', scenarioTitle: 'Hyperion Energy star vs snowflake under Direct Lake',
    prompt: 'Which trade-offs are TRUE about flattening into a single denormalized Customer dim? Select all that apply.',
    options: ['Lakehouse Delta storage may grow because flattened columns repeat values', 'VertiPaq dictionary compression typically offsets much of the storage growth at query time', 'Time-to-result on visual queries usually improves due to fewer join hops', 'Maintenance complexity SHIFTS upstream — the Silver/Gold ETL must produce the flattened dim', 'Flattening always increases cardinality of every column'],
    correct: [0, 1, 2, 3],
    explanation: 'Flat dims grow on disk slightly; VertiPaq dictionaries make repeats nearly free in memory. Join elimination speeds queries. Maintenance moves to ETL. Flattening does NOT change column cardinality.',
    whyWrong: { 4: 'Flattening preserves cardinality — distinct values are unchanged; they just live on the same row instead of across tables.' },
    source: SRC.semanticModel, tags: ['scenario', 'star-schema', 'tradeoffs']
  }),
  single({
    id: 'scn-20-q3', type: 'scenario-single', domain: 'semantic', subtopic: 'star-schema', difficulty: 4,
    scenarioId: 'scn-20', scenarioTitle: 'Hyperion Energy star vs snowflake under Direct Lake',
    prompt: 'After flattening, where should the denormalization HAPPEN in a medallion architecture?',
    options: ['In a Power Query M expression at semantic-model load time', 'In Silver→Gold transformation (Spark notebook or stored proc), so the Gold Customer dim is already flat in OneLake', 'In a calculated column on the Direct Lake table', 'In a Gen2 dataflow that writes back to Bronze'],
    correct: 1,
    explanation: 'Denormalization belongs in the Silver→Gold ETL so Gold is already analytical-ready. Calc columns on Direct Lake disqualify the table from Direct Lake.',
    whyWrong: { 0: 'Power Query at load is fine for Import but the Direct Lake model should not need a load-time M step.', 2: 'Calc columns disqualify Direct Lake.', 3: 'Bronze is raw landing, not analytical shaping.' },
    source: SRC.semanticModel, tags: ['scenario', 'medallion', 'silver-to-gold']
  }),
  single({
    id: 'scn-21-q1', type: 'scenario-single', domain: 'maintain', subtopic: 'security-rls', difficulty: 4,
    scenarioId: 'scn-21', scenarioTitle: 'Wayne Enterprises RLS+OLS+sensitivity-label triple-stack',
    prompt: 'Why is the "BLANK measure for unauthorized users" approach the wrong solution for hiding [Margin %]?',
    options: ['The measure name is still visible in the field list — users see [Margin %] exists, just not its values', 'It returns NaN, not BLANK', 'BLANK measures break time intelligence', 'BLANK measures cannot be cached'],
    correct: 0,
    explanation: 'A measure that returns BLANK for unauthorized users still appears in the model schema — its name is visible in the field list. Requirement (b) is OBJECT-LEVEL hiding, which OLS provides; a BLANK measure does not.',
    whyWrong: { 1: 'BLANK is BLANK, not NaN.', 2: 'BLANK measures interact with time intel normally.', 3: 'Caching is unrelated.' },
    source: SRC.ols, tags: ['scenario', 'ols', 'object-hiding']
  }),
  multi({
    id: 'scn-21-q2', type: 'scenario-multi', domain: 'maintain', subtopic: 'security-rls', difficulty: 5,
    scenarioId: 'scn-21', scenarioTitle: 'Wayne Enterprises RLS+OLS+sensitivity-label triple-stack',
    prompt: 'Which configurations correctly satisfy ALL THREE requirements? Select all that apply.',
    options: ['RLS roles per region with `[Region] = "EU"`-style filters and member assignments per region', 'OLS hiding [Margin %] from any role NOT in the finance OLS role', 'A "Highly Confidential" sensitivity label applied at the model level so it propagates to exports', 'A single "AllAccess" RLS role with USERPRINCIPALNAME() lookups for region', 'A custom DAX measure that returns the user\'s region for inspection'],
    correct: [0, 1, 2],
    explanation: 'RLS for row filtering per region, OLS for object-hiding [Margin %], sensitivity label for downstream propagation. All three controls layer cleanly.',
    whyWrong: { 3: '"AllAccess" + dynamic lookup is more complex and harder to audit than per-region roles for the stated requirement.', 4: 'A debug measure helps verify USERPRINCIPALNAME() but is not part of the security solution.' },
    source: SRC.rls, tags: ['scenario', 'rls-ols-labels']
  }),
  single({
    id: 'scn-21-q3', type: 'scenario-single', domain: 'maintain', subtopic: 'sensitivity-labels', difficulty: 4,
    scenarioId: 'scn-21', scenarioTitle: 'Wayne Enterprises RLS+OLS+sensitivity-label triple-stack',
    prompt: 'A user exports report data to Excel. What happens to the "Highly Confidential" sensitivity label?',
    options: ['The label is dropped on export — Excel files are unprotected', 'The label travels with the export and downstream MIP-aware tools (Excel with the unified labeling client, M365 apps) honor it', 'The export is blocked because of the label', 'The label converts to a watermark only'],
    correct: 1,
    explanation: 'Sensitivity labels propagate with exported data. MIP-aware downstream tools enforce the label\'s configured protection. Export is not blocked by the label alone; protection is the propagation outcome.',
    whyWrong: { 0: 'Labels do not drop — propagation is the entire point.', 2: 'Exports aren\'t blocked by labels alone; protection is applied.', 3: 'Watermark is one possible action, not the entire story.' },
    source: SRC.sensitivity, tags: ['scenario', 'sensitivity-label', 'propagation']
  }),
  single({
    id: 'scn-22-q1', type: 'scenario-single', domain: 'semantic', subtopic: 'dax-perf', difficulty: 4,
    scenarioId: 'scn-22', scenarioTitle: 'Massive Dynamic DAX perf triage with VertiPaq Analyzer',
    prompt: 'Given storage 200ms / formula 13.5s, what is the most likely root cause?',
    options: ['Direct Lake fallback to DirectQuery', 'Repeated context transitions: SUMX iterates 60M rows, each calling a CALCULATE wrapping FILTER(ALL(...)) — formula engine is doing per-row work it cannot push down', 'Capacity SKU is too small', 'IFERROR forces serial execution'],
    correct: 1,
    explanation: 'A formula-engine-bound symptom on an iterator-over-fact + CALCULATE-with-FILTER pattern is the textbook context-transition perf trap. Switching to Import does not fix it — it shifts the same FE work to Import.',
    whyWrong: { 0: 'Fallback would show storage-engine cost, not 200ms SE / 13.5s FE.', 2: 'SKU does not address formula-engine cost.', 3: 'IFERROR adds cost but is not the dominant factor here.' },
    source: SRC.daxPerf, tags: ['scenario', 'dax-perf', 'fe-bound']
  }),
  multi({
    id: 'scn-22-q2', type: 'scenario-multi', domain: 'semantic', subtopic: 'dax-perf', difficulty: 5,
    scenarioId: 'scn-22', scenarioTitle: 'Massive Dynamic DAX perf triage with VertiPaq Analyzer',
    prompt: 'Which remediation steps are appropriate? Select all that apply.',
    options: ['Rewrite SUMX(Fact, CALCULATE(...)) into a single CALCULATE with KEEPFILTERS / column predicate where possible', 'Use VARs to memoize sub-expressions', 'Lift simple boolean predicates out of FILTER(ALL(...)) into direct CALCULATE filter args (predicate pushdown)', 'Switch to Import', 'Use VertiPaq Analyzer to confirm column dictionary sizes are not also a contributor'],
    correct: [0, 1, 2, 4],
    explanation: 'The fix is DAX-shape: collapse the iterator + CALCULATE into a single CALCULATE, push predicates down for SE pushdown, memoize with VARs, and verify VertiPaq Analyzer that column shape is not also a contributor.',
    whyWrong: { 3: 'Storage-mode change does not address formula-engine cost. The SUMX-CALCULATE pattern would be equally slow under Import.' },
    source: SRC.daxPerf, tags: ['scenario', 'dax-perf', 'remediation']
  }),

  /* ═══════ Wave-2 prepare-data picker scenarios (scn-23..27, 13 Qs) ═══════ */
  single({
    id: 'scn-23-q1', type: 'scenario-single', domain: 'prepare', subtopic: 'fabric-architecture', difficulty: 4,
    scenarioId: 'scn-23', scenarioTitle: 'Halcyon Energy Fabric stack-from-scratch',
    prompt: 'Which Fabric item should host the 30 TB historical Parquet partner data WITH zero copy?',
    options: ['Lakehouse with OneLake Shortcut to ADLS Gen2', 'Warehouse', 'Mirrored Database', 'Eventhouse'],
    correct: 0,
    explanation: 'A Lakehouse holding a OneLake shortcut to the ADLS Gen2 partner container is zero-copy and live.',
    whyWrong: { 1: 'Warehouse is T-SQL-first; it does not natively shortcut ADLS Parquet for Spark + SQL endpoint workloads.', 2: 'Mirroring targets transactional databases, not ADLS file lakes.', 3: 'Eventhouse is for streaming time-series (KQL), not historical Parquet.' },
    source: SRC.onelakeShortcuts, tags: ['scenario', 'shortcut', 'lakehouse']
  }),
  single({
    id: 'scn-23-q2', type: 'scenario-single', domain: 'prepare', subtopic: 'fabric-architecture', difficulty: 4,
    scenarioId: 'scn-23', scenarioTitle: 'Halcyon Energy Fabric stack-from-scratch',
    prompt: 'Which item is the right home for the 25k-events/sec smart-meter telemetry stream?',
    options: ['Lakehouse', 'Warehouse', 'Eventhouse / KQL DB', 'Dataflow Gen2'],
    correct: 2,
    explanation: 'Eventhouse / KQL DB is purpose-built for high-cardinality streaming with sub-second ingest-to-query and native KQL operators.',
    whyWrong: { 0: 'Lakehouse is batch / Delta-shaped; cannot deliver sub-second freshness on a 25k/sec stream.', 1: 'Warehouse is T-SQL/BI batch — not streaming.', 3: 'Dataflow Gen2 is scheduled batch ETL, not a streaming store.' },
    source: SRC.eventhouse, tags: ['scenario', 'eventhouse', 'streaming']
  }),
  multi({
    id: 'scn-23-q3', type: 'scenario-multi', domain: 'prepare', subtopic: 'fabric-architecture', difficulty: 5,
    scenarioId: 'scn-23', scenarioTitle: 'Halcyon Energy Fabric stack-from-scratch',
    prompt: 'Given the team is 70% T-SQL skilled, which items are appropriate for the BI Gold tier and the executive pack?',
    options: ['Warehouse for the Gold transformations using CTAS / INSERT…SELECT', 'Semantic Model in Direct Lake mode for Power BI consumption', 'Spark notebooks as the primary Gold transformation surface', 'Reflex (Activator) as the Gold tier', 'Mirrored Database as the Gold tier'],
    correct: [0, 1],
    explanation: 'The team\'s T-SQL skills + classic BI workload align with Warehouse for Gold transforms and a Direct Lake Semantic Model for the executive consumption layer.',
    whyWrong: { 2: 'Notebooks are over-engineered when 70% of the team is T-SQL skilled.', 3: 'Reflex is for event triggers, not a Gold storage tier.', 4: 'Mirroring is for source replication, not for hosting Gold transformations.' },
    source: SRC.tsql, tags: ['scenario', 'warehouse', 'semantic-model']
  }),
  single({
    id: 'scn-24-q1', type: 'scenario-single', domain: 'prepare', subtopic: 'mirroring', difficulty: 3,
    scenarioId: 'scn-24', scenarioTitle: 'Cogswell Cogs OLTP-to-BI replication',
    prompt: 'Which Fabric item satisfies sub-minute lag, no custom ETL, and zero replication-compute cost from the Azure SQL DB?',
    options: ['Pipeline copy on a 5-minute schedule', 'Mirrored Database', 'Dataflow Gen2 incremental refresh', 'Lakehouse + custom Spark MERGE'],
    correct: 1,
    explanation: 'Mirrored Database is the canonical answer: continuous CDC, zero code, free replication compute, lands as Delta with auto SQL endpoint.',
    whyWrong: { 0: 'Pipeline copy at 5-minute cadence is not sub-minute, costs CU per run, and is custom logic.', 2: 'Dataflow Gen2 is M-language batch and runs on a schedule.', 3: 'Spark MERGE is custom ETL — explicit anti-requirement.' },
    source: SRC.mirroring, tags: ['scenario', 'mirroring']
  }),
  single({
    id: 'scn-24-q2', type: 'scenario-single', domain: 'prepare', subtopic: 'dataflow-gen2', difficulty: 3,
    scenarioId: 'scn-24', scenarioTitle: 'Cogswell Cogs OLTP-to-BI replication',
    prompt: 'Which item should the analyst use to cleanse the nightly 8 GB vendor CSV into a Delta destination, given no Spark experience?',
    options: ['Spark notebook', 'Dataflow Gen2', 'T-SQL stored procedure in Warehouse', 'Reflex (Activator)'],
    correct: 1,
    explanation: 'Power Query / low-code analyst, modest volume, scheduled refresh, Delta destination = Dataflow Gen2 sweet spot.',
    whyWrong: { 0: 'Notebook requires Spark experience the analyst lacks.', 2: 'T-SQL stored proc does not directly transform a CSV into a Lakehouse Delta destination.', 3: 'Reflex triggers on conditions; not a transformation tool.' },
    source: SRC.dataflow, tags: ['scenario', 'dataflow']
  }),
  multi({
    id: 'scn-24-q3', type: 'scenario-multi', domain: 'prepare', subtopic: 'mirroring', difficulty: 4,
    scenarioId: 'scn-24', scenarioTitle: 'Cogswell Cogs OLTP-to-BI replication',
    prompt: 'Which statements about the Mirrored Database lifecycle are TRUE for Cogswell?',
    options: ['Initial snapshot replicates source rows to OneLake as Delta', 'Continuous CDC keeps the Fabric copy in sync', 'You can write back to the Fabric mirror to update source rows', 'A Direct Lake semantic model can be built directly on the mirrored Delta', 'The mirrored copy is metered against capacity for replication compute'],
    correct: [0, 1, 3],
    explanation: 'Mirroring snapshots, continuously CDCs, and exposes Delta + auto SQL endpoint + Direct Lake-ready model.',
    whyWrong: { 2: 'Mirror is read-only on the Fabric side — you cannot write back to source.', 4: 'Replication compute is free; storage in OneLake counts but the replication engine does not consume your CU.' },
    source: SRC.mirroring, tags: ['scenario', 'mirroring', 'lifecycle']
  }),
  single({
    id: 'scn-25-q1', type: 'scenario-single', domain: 'prepare', subtopic: 'fabric-architecture', difficulty: 3,
    scenarioId: 'scn-25', scenarioTitle: 'Spacely Sprockets observability split',
    prompt: 'Which item should host the 90-day hot SOC tier?',
    options: ['Lakehouse', 'Warehouse', 'Eventhouse / KQL DB', 'Mirrored Database'],
    correct: 2,
    explanation: 'Eventhouse / KQL DB delivers sub-second KQL queries on hot 90-day data with native render and joins.',
    whyWrong: { 0: 'Lakehouse cannot deliver sub-second KQL on 80k/sec streams interactively.', 1: 'Warehouse is T-SQL — missing KQL operators.', 3: 'Mirroring is for transactional DB sources, not Event Hubs streams.' },
    source: SRC.eventhouse, tags: ['scenario', 'eventhouse', 'soc']
  }),
  single({
    id: 'scn-25-q2', type: 'scenario-single', domain: 'prepare', subtopic: 'fabric-architecture', difficulty: 4,
    scenarioId: 'scn-25', scenarioTitle: 'Spacely Sprockets observability split',
    prompt: 'Which item should hold the 5-year cold archive of aged telemetry?',
    options: ['Eventhouse hot tier extended to 5 years', 'Lakehouse Delta with periodic export from Eventhouse', 'Warehouse', 'Reflex (Activator)'],
    correct: 1,
    explanation: 'Two-tier observability: Eventhouse stays hot for 90 days; Lakehouse Delta holds cheap cold history queryable from Direct Lake.',
    whyWrong: { 0: 'Keeping 5 years in Eventhouse hot tier is expensive and unnecessary.', 2: 'Warehouse is feasible but more expensive than Lakehouse and lacks Spark-native reads.', 3: 'Reflex triggers actions; it is not a storage tier.' },
    source: SRC.eventhouse, tags: ['scenario', 'lakehouse', 'tiering']
  }),
  single({
    id: 'scn-25-q3', type: 'scenario-single', domain: 'prepare', subtopic: 'fabric-architecture', difficulty: 4,
    scenarioId: 'scn-25', scenarioTitle: 'Spacely Sprockets observability split',
    prompt: 'Which item should fire automatic Teams alerts when the 1-minute device-error rate exceeds 200?',
    options: ['Custom polling notebook on a 1-minute schedule', 'Reflex (Activator) on the Eventhouse', 'Pipeline trigger every minute', 'Dataflow Gen2 on a 1-minute schedule'],
    correct: 1,
    explanation: 'Reflex (Activator) is the no-code event-on-condition surface for Eventhouse / Power BI / Eventstream — runs the KQL trigger natively and dispatches Teams / Power Automate / custom actions.',
    whyWrong: { 0: 'Custom polling is explicit anti-requirement.', 2: 'Pipeline-on-1-minute-schedule is custom polling and over-engineered.', 3: 'Dataflow Gen2 is batch ETL on a schedule, not event triggers.' },
    source: SRC.eventhouse, tags: ['scenario', 'reflex', 'eventing']
  }),
  single({
    id: 'scn-26-q1', type: 'scenario-single', domain: 'prepare', subtopic: 'pipelines', difficulty: 3,
    scenarioId: 'scn-26', scenarioTitle: 'Pawnee BI nightly orchestration',
    prompt: 'Which item orchestrates the nightly chain with conditional branching and on-success / on-failure paths?',
    options: ['Notebook', 'Dataflow Gen2', 'Data Pipeline', 'Reflex'],
    correct: 2,
    explanation: 'Data Pipelines (Data Factory in Fabric) orchestrate chained activities with conditional branching and on-success / on-failure paths.',
    whyWrong: { 0: 'Notebook is one activity in the chain, not the chain itself.', 1: 'Dataflow Gen2 is one activity in the chain.', 3: 'Reflex is event-shape, not nightly chained-batch orchestration.' },
    source: SRC.pipelines, tags: ['scenario', 'pipelines']
  }),
  single({
    id: 'scn-26-q2', type: 'scenario-single', domain: 'prepare', subtopic: 'fabric-architecture', difficulty: 3,
    scenarioId: 'scn-26', scenarioTitle: 'Pawnee BI nightly orchestration',
    prompt: 'Which item holds relationships, measures, calc groups, RLS roles, and serves Direct Lake to Power BI?',
    options: ['Lakehouse', 'Warehouse', 'Semantic Model', 'Mirrored Database'],
    correct: 2,
    explanation: 'Semantic Model is the consumption-layer artifact: tables, relationships, measures, calc groups, RLS, XMLA endpoint, Direct Lake binding.',
    whyWrong: { 0: 'Lakehouse is the source of Gold tables; it does not host measures or RLS roles.', 1: 'Warehouse stores tables; it is not the semantic model surface for Power BI.', 3: 'Mirrored DB replicates a source; it does not hold the BI model.' },
    source: SRC.fabricArch, tags: ['scenario', 'semantic-model']
  }),
  multi({
    id: 'scn-26-q3', type: 'scenario-multi', domain: 'prepare', subtopic: 'pipelines', difficulty: 4,
    scenarioId: 'scn-26', scenarioTitle: 'Pawnee BI nightly orchestration',
    prompt: 'Which Pipeline activities are appropriate steps in the Pawnee chain?',
    options: ['Copy Data activity (vendor SFTP → Lakehouse Bronze)', 'Dataflow refresh activity', 'Notebook activity (two parallel)', 'Semantic model refresh activity', 'Reflex (Activator) inline as a pipeline activity'],
    correct: [0, 1, 2, 3],
    explanation: 'Copy, Dataflow refresh, Notebook, and Semantic Model refresh are first-class Pipeline activities. Reflex is a separate item — it triggers ON conditions, not as a generic in-pipeline activity.',
    whyWrong: { 4: 'Reflex is a separate item that triggers ON data conditions; it is not a generic in-pipeline activity.' },
    source: SRC.pipelines, tags: ['scenario', 'pipelines', 'activities']
  }),
  single({
    id: 'scn-27-q1', type: 'scenario-single', domain: 'prepare', subtopic: 'onelake-shortcuts', difficulty: 3,
    scenarioId: 'scn-27', scenarioTitle: 'Vandelay Imports cross-BU reference data',
    prompt: 'Which Fabric mechanism shifts Regions B-F off nightly Pipeline copies and onto zero-copy live access to Region A\'s CustomerDim Lakehouse table?',
    options: ['OneLake Shortcut from each consumer Lakehouse to Region A', 'Mirrored Database', 'Dataflow Gen2 reference', 'Pipeline copy on a 5-minute schedule'],
    correct: 0,
    explanation: 'OneLake Shortcut is zero-copy, live, and propagates updates automatically. Each consumer Lakehouse holds a shortcut to Region A\'s table.',
    whyWrong: { 1: 'Mirroring is for external transactional DB sources, not Fabric → Fabric Lakehouse sharing.', 2: 'Dataflow Gen2 reference still creates a copy in the consumer workspace.', 3: 'Pipeline copy is the very anti-pattern Vandelay is moving away from.' },
    source: SRC.onelakeShortcuts, tags: ['scenario', 'shortcut', 'cross-bu']
  }),
  multi({
    id: 'scn-27-q2', type: 'scenario-multi', domain: 'prepare', subtopic: 'onelake-shortcuts', difficulty: 4,
    scenarioId: 'scn-27', scenarioTitle: 'Vandelay Imports cross-BU reference data',
    prompt: 'After implementing the shortcut, which considerations are TRUE for Regions B-F?',
    options: ['Reads honor source-side ACLs — Regions B-F users still need access to Region A\'s Lakehouse', 'Schema changes on Region A propagate automatically through the shortcut', 'Each consumer Region pays storage cost for the duplicated CustomerDim', 'The shortcut respects sensitivity labels applied at the source workspace', 'Direct Lake semantic models in Regions B-F can read the shortcut natively'],
    correct: [0, 1, 3, 4],
    explanation: 'Shortcuts honor source ACLs, propagate schema, and respect sensitivity labels. Direct Lake works through shortcuts. The whole point is zero copy — no per-region storage charge for the dim.',
    whyWrong: { 2: 'Shortcuts are zero-copy. Storage is billed once at the source — that is the entire point.' },
    source: SRC.onelakeShortcuts, tags: ['scenario', 'shortcut', 'permissions']
  }),

  /* ═══════ Wave-2 KQL scenarios (scn-28..31, 11 Qs) ═══════ */
  single({
    id: 'scn-28-q1', type: 'scenario-single', domain: 'prepare', subtopic: 'kql', difficulty: 4,
    scenarioId: 'scn-28', scenarioTitle: 'Aperture Eventhouse aggregation gone wrong',
    prompt: 'What is the MOST LIKELY root cause of `EnrichedTelemetry` showing fewer FirmwareVersions than `RawTelemetry`?',
    options: ['The new `join SymptomLookup on FirmwareVersion` uses the default `innerunique` kind, which de-duplicates the LEFT side on the join key', 'Eventhouse update policies always drop NULL FirmwareVersion rows', 'The hot cache was full and silently dropped half the data', 'KQL `count()` returns approximate values for large tables'],
    correct: 0,
    explanation: 'The default join kind in KQL is `innerunique`, which de-duplicates the LEFT table on the join keys before the inner join runs. Switch to `kind=inner` or use `lookup` for fact-to-small-dim enrichment.',
    whyWrong: { 1: 'Update policies do not silently drop nulls.', 2: 'Hot cache fullness causes eviction and read-from-cold (slower), not data loss.', 3: '`count()` is exact in KQL; only `dcount()` uses HyperLogLog approximations.' },
    source: SRC.kql, tags: ['kql', 'scenario', 'innerunique', 'join']
  }),
  multi({
    id: 'scn-28-q2', type: 'scenario-multi', domain: 'prepare', subtopic: 'kql', difficulty: 4,
    scenarioId: 'scn-28', scenarioTitle: 'Aperture Eventhouse aggregation gone wrong',
    prompt: 'Which fixes correctly preserve all FirmwareVersions while still attaching the symptom tag?',
    options: ['Change the join to `kind=inner` to disable the left-side dedup', 'Replace the join with `lookup SymptomLookup on FirmwareVersion` to broadcast the small dim', 'Use `kind=leftouter` to retain every left row even when no match exists', 'Drop the join and use `extend` to copy SymptomLookup\'s columns directly'],
    correct: [0, 1, 2],
    explanation: '`kind=inner` removes dedup; `lookup` is purpose-built for fact-to-small-dim; `leftouter` retains every fact row regardless of match.',
    whyWrong: { 3: '`extend` adds columns derived from the current row; it cannot pull values from another table.' },
    source: SRC.kql, tags: ['kql', 'scenario', 'fix']
  }),
  single({
    id: 'scn-28-q3', type: 'scenario-single', domain: 'prepare', subtopic: 'kql', difficulty: 5,
    scenarioId: 'scn-28', scenarioTitle: 'Aperture Eventhouse aggregation gone wrong',
    prompt: 'After fixing the join, the SRE wants a guardrail that catches the same regression class on a future PR. What is the BEST choice?',
    options: ['Add a regression test that runs `EnrichedTelemetry | summarize dcount(FirmwareVersion)` and `RawTelemetry | summarize dcount(FirmwareVersion)` after each update-policy change and fails when the two diverge', 'Forbid all KQL joins in the codebase', 'Move every join to `kind=fullouter` "to be safe"', 'Disable the hot cache so all reads are deterministic'],
    correct: 0,
    explanation: 'A test that compares dimensional cardinality on both sides catches innerunique-style row loss immediately, independent of which join kind the author chose.',
    whyWrong: { 1: 'Banning joins outright is over-correction.', 2: 'fullouter introduces NULL rows and changes downstream aggregations.', 3: 'Cache configuration does not change correctness, only latency.' },
    source: SRC.kql, tags: ['kql', 'scenario', 'guardrail']
  }),
  single({
    id: 'scn-29-q1', type: 'scenario-single', domain: 'prepare', subtopic: 'kql', difficulty: 5,
    scenarioId: 'scn-29', scenarioTitle: 'Cyberdyne KQL perf triage',
    prompt: 'Of the three optimizations, which delivers the SINGLE largest win?',
    options: ['Move `where Ts > ago(7d)` to the FIRST operator on SignInEvents — partition pruning on a 1.2B-row table is the largest ROI', '`materialize()` the SignInEvents subquery — re-evaluation is the dominant cost', 'Replace both joins with `lookup` — innerunique dedup is the dominant cost', 'Switch the cluster to a larger SKU'],
    correct: 0,
    explanation: 'A bottom-of-pipeline time filter forces full scan. Moving it to first cuts the dataset by ~75% before any join or summarize.',
    whyWrong: { 1: 'Materialize helps when a subquery is reused; it does not eliminate the underlying full-table scan.', 2: 'lookup is a meaningful win but second-order to partition pruning here.', 3: 'A bigger SKU buys parallelism but does not fix the algorithmic problem.' },
    source: SRC.kql, tags: ['kql', 'scenario', 'performance']
  }),
  multi({
    id: 'scn-29-q2', type: 'scenario-multi', domain: 'prepare', subtopic: 'kql', difficulty: 4,
    scenarioId: 'scn-29', scenarioTitle: 'Cyberdyne KQL perf triage',
    prompt: 'After moving the time filter, the SignInEvents subquery is referenced by THREE downstream tiles. Which optimizations apply now?',
    options: ['Wrap the subquery in `materialize()` and bind to a `let` so it computes once and three tiles share the cached result', 'Replace `join kind=inner UserDirectory` (4M rows) with `lookup UserDirectory` to skip innerunique dedup', 'Reorder the SignInEvents-DeviceRegistry join so the larger filtered SignInEvents is on the LEFT and DeviceRegistry on the RIGHT (broadcast target)', 'Convert all KQL to T-SQL because Polaris is faster than Kusto for this shape'],
    correct: [0, 1, 2],
    explanation: 'Three legitimate stacked wins: materialize once + reuse, lookup for the small dim, large-on-left/small-on-right for broadcast. Converting Eventhouse data to T-SQL is a category error.',
    whyWrong: { 3: 'KQL data lives in Kusto storage; the Polaris (T-SQL) engine cannot query it directly.' },
    source: SRC.kql, tags: ['kql', 'scenario', 'performance']
  }),
  order({
    id: 'scn-29-q3', domain: 'prepare', subtopic: 'kql', difficulty: 4,
    prompt: 'Order the optimization rollout for the slow Cyberdyne report:',
    options: [
      'Move `where Ts > ago(7d)` to the FIRST operator on SignInEvents to enable partition pruning',
      'Reorder joins so the (filtered) large SignInEvents is on the LEFT and small dims on the RIGHT',
      'Replace `join kind=inner` with `lookup` against UserDirectory and DeviceRegistry',
      'Wrap the SignInEvents subquery in `materialize()` since three downstream tiles reference it',
      'Verify the new runtime against the 06:00 SLA and rollback if not met'
    ],
    explanation: 'Filter first to enable pruning, then fix the physical join shape, then pick the operator (lookup) that matches, then add reuse-caching via materialize, finally verify and rollback if the SLA is missed.',
    source: SRC.kql, tags: ['kql', 'scenario', 'performance', 'workflow']
  }),
  single({
    id: 'scn-30-q1', type: 'scenario-single', domain: 'prepare', subtopic: 'kql', difficulty: 4,
    scenarioId: 'scn-30', scenarioTitle: 'Globex Pharma anomaly detection',
    prompt: 'Which KQL shape correctly computes p95 readings per (SiteId, SensorType) in 5-minute windows over the last 24 hours?',
    options: ['SensorReadings | where Ts > ago(24h) | summarize p95 = percentile(Reading, 95) by bin(Ts, 5m), SiteId, SensorType', 'SensorReadings | summarize p95 = percentile(Reading, 95) by SiteId, SensorType | where Ts > ago(24h)', 'SensorReadings | bin(Ts, 5m) | percentile(Reading, 95) by SiteId', 'SensorReadings | where Ts > ago(24h) | top 5 by percentile(Reading, 95)'],
    correct: 0,
    explanation: 'Time filter first (partition pruning), then `summarize percentile(Reading, 95) by bin(Ts, 5m), SiteId, SensorType`.',
    whyWrong: { 1: 'The where after summarize cannot reference Ts — it has been collapsed by the aggregation.', 2: '`bin` and `percentile` are not pipeline operators on their own; they are functions used inside summarize.', 3: '`top` returns rows by sort order; it does not produce per-bucket p95 grids.' },
    source: SRC.kql, tags: ['kql', 'scenario', 'percentile']
  }),
  single({
    id: 'scn-30-q2', type: 'scenario-single', domain: 'prepare', subtopic: 'kql', difficulty: 5,
    scenarioId: 'scn-30', scenarioTitle: 'Globex Pharma anomaly detection',
    prompt: 'To compute the rolling 24-hour mean and stddev for the anomaly comparison, which approach is BEST?',
    options: ['A second `summarize avg(Reading), stdev(Reading) by SiteId, SensorType` over the 24h window, then join to the per-bucket p95 result on (SiteId, SensorType) and filter where p95 > avg + 3 * stdev', 'Run two completely independent queries and reconcile the results in Excel', 'Use `count()` as a substitute for stddev because they are roughly proportional', 'Use `mv-expand` on the Reading column to artificially multiply rows'],
    correct: 0,
    explanation: 'Compute the baseline (avg/stdev) per dim pair, compute the per-bucket p95, join the two on the dim keys, and filter where p95 exceeds avg + 3*stdev. Stays inside one query for atomicity.',
    whyWrong: { 1: 'Manual reconciliation does not refresh on the 60-second SLA.', 2: 'count is unrelated to dispersion.', 3: 'mv-expand explodes arrays; nothing to do with statistical baselines.' },
    source: SRC.kql, tags: ['kql', 'scenario', 'anomaly-detection']
  }),
  single({
    id: 'scn-30-q3', type: 'scenario-single', domain: 'prepare', subtopic: 'kql', difficulty: 4,
    scenarioId: 'scn-30', scenarioTitle: 'Globex Pharma anomaly detection',
    prompt: 'The dashboard refresh budget is 60 seconds. The query is at 75 seconds. Which single change has the BEST chance of pulling it under budget?',
    options: ['Wrap the per-(SiteId, SensorType) baseline subquery in `materialize()` since both the p95 path and the baseline path reuse the same SensorReadings filter', 'Increase the dashboard refresh interval to 120 seconds', 'Drop the time filter — it costs more than it saves', 'Switch the table to row-store entirely'],
    correct: 0,
    explanation: 'When two summarise paths share an underlying filtered scan, materialising the shared result once typically halves the table-scan cost — a common 30-50% improvement.',
    whyWrong: { 1: 'Lengthening the SLA defeats the dashboard purpose.', 2: 'Dropping the time filter scans all 30 days — the opposite direction.', 3: 'Row-store hurts column-aggregation queries badly.' },
    source: SRC.kql, tags: ['kql', 'scenario', 'materialize']
  }),
  single({
    id: 'scn-31-q1', type: 'scenario-single', domain: 'prepare', subtopic: 'kql', difficulty: 5,
    scenarioId: 'scn-31', scenarioTitle: 'Stark Industries cross-cluster federated query',
    prompt: 'Which `kind=` produces "users seen on BOTH the US AND EU clusters in the last 24 hours"?',
    options: ['`kind=inner` (with explicit kind to avoid the innerunique surprise)', '`kind=leftouter` — keeps every US row even without an EU match', '`kind=fullouter` — keeps every row from both sides', '`kind=cross` — produces the intersection by default'],
    correct: 0,
    explanation: 'Intersection on a key = inner join. `kind=inner` is correct and explicit, avoiding the default innerunique dedup.',
    whyWrong: { 1: 'leftouter retains unmatched left rows — symmetric difference territory.', 2: 'fullouter retains unmatched rows from BOTH sides.', 3: '`kind=cross` is not a valid KQL kind.' },
    source: SRC.kql, tags: ['kql', 'scenario', 'cross-cluster']
  }),
  multi({
    id: 'scn-31-q2', type: 'scenario-multi', domain: 'prepare', subtopic: 'kql', difficulty: 5,
    scenarioId: 'scn-31', scenarioTitle: 'Stark Industries cross-cluster federated query',
    prompt: 'Which design choices minimise data shipped between US and EU clusters AND respect the compliance constraint?',
    options: ['Apply the time filter and `project UserId` PROJECTION on the remote-cluster side BEFORE the cross-cluster join', 'Aggregate to a distinct UserId set on each cluster first, then join the two small sets', 'Pull all raw rows from EU into US and join locally for "convenience"', 'Use `kind=fullouter` to ensure no row is dropped, regardless of compliance'],
    correct: [0, 1],
    explanation: 'Project to the minimum column on the remote side before crossing, and pre-aggregate to distinct sets per cluster.',
    whyWrong: { 2: 'Pulling raw EU rows into US violates the compliance constraint.', 3: 'fullouter is the wrong join shape for intersection AND does nothing for compliance.' },
    source: SRC.kql, tags: ['kql', 'scenario', 'compliance']
  })
];
