// Direct Lake — modern terminology batch.
//
// Microsoft now splits Direct Lake into TWO TABLE storage modes:
//   - Direct Lake on OneLake — never falls back to DirectQuery
//   - Direct Lake on SQL     — falls back via SQL analytics endpoint;
//                              fallback governed by `Direct Lake behavior`
//                              (Automatic / DirectLakeOnly / DirectQueryOnly)
//
// The two modes diverge on composite-model support, deployment-pipeline
// rebind rules, SQL RLS application, and SQL view connectivity. These
// are the most common 2026-vintage exam traps.
//
// Source: learn.microsoft.com/en-us/fabric/fundamentals/direct-lake-overview
// (updated 2026-04-08).

import type { Question } from '../../lib/schema';
import { multi, single, SRC } from './_helpers';

export const directLakeModern: Question[] = [
  single({
    id: 'dlm2-001',
    domain: 'semantic',
    subtopic: 'direct-lake',
    difficulty: 4,
    prompt: 'A regulated workload requires that the semantic model NEVER serve a query via DirectQuery — fallback would breach the perf SLA. The team is choosing the table storage mode. Which option is the simplest path to "no fallback, ever"?',
    options: [
      'Direct Lake on OneLake (it never falls back)',
      'Direct Lake on SQL with `Direct Lake behavior = Automatic`',
      'Direct Lake on SQL with `Direct Lake behavior = DirectQueryOnly`',
      'Import mode'
    ],
    correct: 0,
    explanation: 'Direct Lake on OneLake reads Delta tables directly from OneLake and is documented as never falling back to DirectQuery. It is the simplest path to a "no fallback" guarantee. Direct Lake on SQL with `DirectLakeOnly` is a secondary valid answer (queries fail instead of falling back), but the question asks for the simplest path — and the OneLake variant has no fallback property to misconfigure.',
    whyWrong: {
      1: '`Automatic` permits fallback when the query cannot be served by Direct Lake — exactly what the workload prohibits.',
      2: '`DirectQueryOnly` forces every query through DirectQuery, which is the worst-perf path — opposite of the requirement.',
      3: 'Import mode does not fall back to DirectQuery, but it forces a full refresh cycle and copies the entire data volume — overkill when Direct Lake on OneLake already meets the requirement without refreshing.'
    },
    source: SRC.directLakeFallback,
    relatedIds: ['dlm2-005', 'dlm2-002'],
    tags: ['direct-lake', 'on-onelake', 'fallback', 'sla']
  }),

  single({
    id: 'dlm2-002',
    domain: 'semantic',
    subtopic: 'direct-lake',
    difficulty: 4,
    prompt: 'A team builds a composite model: Direct Lake tables for the gold-layer fact, Import tables for a small mapping dimension, and DirectQuery tables to a federated SQL Server source. Which Direct Lake table storage mode supports this composition?',
    options: [
      'Direct Lake on OneLake',
      'Direct Lake on SQL',
      'Both — composite mixing is supported in either mode',
      'Neither — Direct Lake disallows composition'
    ],
    correct: 0,
    explanation: 'Composite models that mix Direct Lake with Import / DirectQuery / Dual storage modes are supported only when the Direct Lake tables use **Direct Lake on OneLake**. Direct Lake on SQL endpoints does not support composition with DirectQuery or Dual tables (calc groups, what-if, and field params are narrow exceptions, not full composite support).',
    whyWrong: {
      1: 'Direct Lake on SQL does NOT support combining Direct Lake tables with DirectQuery or Dual storage tables in the same model.',
      2: 'Only one of the two table storage modes supports the full composite case — the answer is mode-specific.',
      3: 'Composition IS supported with Direct Lake on OneLake; Direct Lake is not categorically composition-incompatible.'
    },
    source: SRC.directLake,
    relatedIds: ['dlm2-001', 'dlm2-005'],
    tags: ['direct-lake', 'composite-model', 'on-onelake', 'on-sql']
  }),

  multi({
    id: 'dlm2-003',
    domain: 'semantic',
    subtopic: 'direct-lake',
    difficulty: 4,
    prompt: 'A semantic model uses Direct Lake on SQL. Which behaviors are TRUE about the SQL analytics endpoint integration? Select all that apply.',
    options: [
      'Tables based on a non-materialized SQL view fall back to DirectQuery (or fail when fallback is disabled)',
      'When the SQL endpoint enforces row-level security, queries fall back to DirectQuery to evaluate RLS — or fail if fallback is disabled',
      'Object-level security defined on the SQL endpoint may produce errors when a user lacks permission',
      'The semantic model can rebind its data source via deployment pipeline rules with no code changes'
    ],
    correct: [0, 1, 2, 3],
    explanation: 'All four are documented behaviors of Direct Lake on SQL. Non-materialized views and SQL RLS both force a DirectQuery fallback (or error when forbidden). OLS errors are raised at query time when the calling identity lacks the granted columns/tables. Deployment pipeline rebind rules ARE supported on Direct Lake on SQL — this is a key contrast with Direct Lake on OneLake, where rebinding requires a parameter expression workaround.',
    whyWrong: {},
    source: SRC.deployment,
    relatedIds: ['dlm2-005', 'dpd-008'],
    tags: ['direct-lake', 'on-sql', 'sql-endpoint', 'rls', 'ols', 'deployment-pipelines']
  }),

  single({
    id: 'dlm2-004',
    domain: 'maintain',
    subtopic: 'deployment-pipelines',
    difficulty: 4,
    prompt: 'A semantic model in a deployment pipeline must rebind its data source from `dev-lakehouse` to `prod-lakehouse` when promoted across stages. The model uses **Direct Lake on OneLake**. The team adds a deployment-pipeline rule for "Data source" — but the rule has no effect during deployment. What is the correct fix?',
    options: [
      'Switch the model to Direct Lake on SQL — rebind rules ARE supported there',
      'Replace the data-source rule with a parameterized M expression and a parameter rule that maps the parameter value per stage',
      'Recreate the rule as a "Connection string" rule instead of "Data source" — same syntax, different rule type',
      'Convert the model to Import storage mode for the deployment, then convert back after promotion'
    ],
    correct: 1,
    explanation: 'Direct Lake on OneLake **does not support deployment-pipeline rules to rebind the data source directly**. The documented workaround is a parameter expression — store the lakehouse path or workspace ID in a parameter, reference it in the connection expression, and use a parameter rule (not a data-source rule) to swap the value per stage.',
    whyWrong: {
      0: 'Switching to Direct Lake on SQL is technically valid but loses composite-model + cross-source flexibility. Microsoft documents the parameter-rule workaround as the canonical path; switch storage mode only when you have a separate reason.',
      2: 'There is no "Connection string" rule that bypasses the limitation — the limitation is mode-specific, not rule-naming.',
      3: 'Round-tripping through Import is destructive (loses Direct Lake performance + framing), and the round-trip is not even supported as a deployment pattern.'
    },
    source: SRC.deployment,
    relatedIds: ['dpd-007', 'dpd-008'],
    tags: ['direct-lake', 'on-onelake', 'deployment-pipelines', 'parameter-rule', 'exam-trap']
  }),

  multi({
    id: 'dlm2-005',
    domain: 'semantic',
    subtopic: 'direct-lake',
    difficulty: 5,
    prompt: 'For a semantic model using **Direct Lake on OneLake**, which statements are CORRECT? Select all that apply.',
    options: [
      'It will never fall back to DirectQuery — queries either run via Direct Lake or fail',
      'It uses the SQL analytics endpoint only for Delta-table discovery and permission checks, not for data reads',
      'SQL-endpoint row-level security is applied to Direct Lake on OneLake queries',
      'It can be combined with Import-storage tables in the same composite model'
    ],
    correct: [0, 1, 3],
    explanation: 'Direct Lake on OneLake reads Delta tables directly from OneLake (uses the SQL endpoint only for metadata + permission checks at design time), never falls back, and supports composite models with Import tables. **It does NOT apply SQL-endpoint RLS** — Direct Lake on OneLake requires the user has access to the OneLake files, and SQL-based RLS rules are not honored in that path. To enforce row filtering on a Direct Lake on OneLake model, define semantic-model RLS roles instead.',
    whyWrong: {
      2: 'SQL-endpoint RLS is NOT applied to Direct Lake on OneLake — file-level OneLake permissions govern access, and SQL RLS rules are bypassed. This is a regulated-workload trap: if you assumed SQL RLS still gated rows, audit will find leaks.'
    },
    source: SRC.rls,
    relatedIds: ['dlm2-001', 'dlm2-002', 'dlm2-003'],
    tags: ['direct-lake', 'on-onelake', 'rls', 'composite-model', 'security']
  })
];
