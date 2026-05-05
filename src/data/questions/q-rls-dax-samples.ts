// Sprint 6 — DAX expressions for Row-Level Security implementation (15 Q).
//
// Heavy emphasis on CODE-READING: ≥10 of 15 questions present a DAX snippet
// and ask the user to reason about what it does, what it returns, or what is
// wrong with it.
//
// IDs: rdxs-001 through rdxs-015
// Domain: semantic
// Subtopics: rls-dax, rls-roles, dynamic-rls, rls-patterns
//
// Does NOT duplicate rdx-001..rdx-008 (q-dax-iterators.ts) which already cover:
//   rdx-001  static [Region]="Midwest"
//   rdx-002  compound [UserEmail]=UPN && [Status]="Active"
//   rdx-003  LOOKUPVALUE basic lookup
//   rdx-004  PATHCONTAINS+LOOKUPVALUE indirection
//   rdx-005  RELATED+VAR manager-or-self pattern
//   rdx-006  security gaps multi-select
//   rdx-007  cross-filter direction leak
//   rdx-008  LOOKUPVALUE+guard pattern code review
//
// New angles covered here:
//   USERNAME() vs USERPRINCIPALNAME() distinction
//   LOOKUPVALUE BLANK trap — filter direction effect (returns no rows vs all rows)
//   TREATAS for virtual relationship user matching
//   CONTAINS / IN for multi-value entitlements
//   RLS on dim vs fact — which table to filter
//   Steps to configure a dynamic RLS role (ordering)
//   Bridge table RLS misapplied to the fact table (RELATED wrong direction)
//   USERPRINCIPALNAME() BLANK in test context + security implication
//   Multi-select: valid vs invalid DAX in RLS table filter expressions
//   RLS filter context applies BEFORE measure evaluation
//   VAR capturing UPN — correct vs incorrect usage
//   Performance: LOOKUPVALUE per-row vs bridge relationship
//   PATHCONTAINS for hierarchy — top-level manager edge case
//   Multi-value entitlement with CONTAINS pattern
//
// Sources: learn.microsoft.com/en-us/power-bi/admin/service-admin-rls,
// learn.microsoft.com/en-us/dax/userprincipalname-function-dax,
// SQLBI dynamic RLS guide.

import type { Question } from '../../lib/schema';
import { single, multi, order, SRC } from './_helpers';

export const rlsDaxSamples: Question[] = [

  // rdxs-001 — USERNAME() vs USERPRINCIPALNAME() (code-reading, single)
  single({
    id: 'rdxs-001',
    domain: 'semantic',
    subtopic: 'rls-dax',
    difficulty: 3,
    prompt: `Code-reading — an RLS role expression reads:\n\`\`\`dax\nVAR userName = USERNAME()\nRETURN [SalesPerson] = userName\n\`\`\`\nThe model is deployed to Power BI Service (Fabric). A tester reports that no rows match for any user. What is the most likely cause?`,
    options: [
      'USERNAME() returns the format DOMAIN\\username (e.g. "CONTOSO\\alice"), but the [SalesPerson] column stores UPN format (e.g. "alice@contoso.com") — the comparison always fails in the cloud service',
      'VAR cannot capture the result of USERNAME() — it must be called inline',
      'USERNAME() is not a valid DAX function — it must be USEROBJECTID()',
      'The predicate syntax requires CALCULATE() wrapping even in RLS expressions'
    ],
    correct: 0,
    explanation: 'USERNAME() returns the Windows identity in DOMAIN\\username format. In Power BI Service (Fabric), user identities are stored as UPN format (email-style). The column [SalesPerson] almost always stores UPNs. The comparison DOMAIN\\user ≠ user@domain means no rows match. Fix: replace USERNAME() with USERPRINCIPALNAME(), which returns the UPN in every Fabric context.',
    whyWrong: {
      1: 'VAR can absolutely capture USERNAME() — the capture is syntactically and semantically valid.',
      2: 'USERNAME() is a real DAX function. It exists and returns the Windows identity string.',
      3: 'RLS table filter expressions do not require a CALCULATE wrapper. The expression is evaluated directly as a Boolean filter.'
    },
    source: SRC.rls,
    tags: ['rls-dax', 'username', 'userprincipalname', 'cloud-vs-desktop', 'code-reading', 'exam-trap'],
    relatedIds: ['rdx-002', 'dls-013']
  }),

  // rdxs-002 — LOOKUPVALUE BLANK trap (code-reading, single)
  single({
    id: 'rdxs-002',
    domain: 'semantic',
    subtopic: 'rls-dax',
    difficulty: 4,
    prompt: `Code-reading — an RLS role on the Sales table contains:\n\`\`\`dax\nLOOKUPVALUE(\n    Users[Region],\n    Users[Email], USERPRINCIPALNAME()\n) = [Region]\n\`\`\`\nUser "bob@contoso.com" is NOT in the Users table. What rows does Bob see in a Sales report?`,
    options: [
      'Bob sees ALL rows — BLANK = any value is TRUE in DAX filter context',
      'Bob sees NO rows — LOOKUPVALUE returns BLANK, and BLANK = [Region] is FALSE for every non-blank Region value',
      'Bob sees only rows where [Region] is blank/null',
      'The query errors because LOOKUPVALUE requires a default-value argument'
    ],
    correct: 1,
    explanation: 'When LOOKUPVALUE cannot find a match it returns BLANK. The predicate then becomes BLANK = [Region]. For every row where [Region] has a real value (non-blank), this evaluates to FALSE. So Bob sees zero rows — the RLS "fails closed". This is the desired security default: an unknown user gets nothing, not everything. (The edge case where [Region] itself is blank would match, but standard region columns are never blank in a clean model.)',
    whyWrong: {
      0: 'BLANK = non-blank-value is FALSE in DAX, not TRUE. The filter fails closed, not open.',
      2: 'Bob would only see blank-Region rows, which is effectively nothing in a clean model — but the primary answer is "no rows" because Region values are non-blank.',
      3: 'LOOKUPVALUE\'s third argument is an optional default value, not required. Omitting it is valid and returns BLANK on no match.'
    },
    source: SRC.rls,
    tags: ['rls-dax', 'lookupvalue', 'blank-trap', 'fail-closed', 'code-reading'],
    relatedIds: ['rdx-003', 'rdx-008']
  }),

  // rdxs-003 — VAR caching UPN correctly (code-reading, single)
  single({
    id: 'rdxs-003',
    domain: 'semantic',
    subtopic: 'dynamic-rls',
    difficulty: 3,
    prompt: `Code-reading — a DAX engineer writes this RLS expression:\n\`\`\`dax\nVAR _upn = USERPRINCIPALNAME()\nRETURN\n    LOOKUPVALUE(\n        Employees[ManagerEmail],\n        Employees[Email], _upn\n    ) = [ManagerEmail]\n    || [Email] = _upn\n\`\`\`\nWhat is the purpose of capturing USERPRINCIPALNAME() into VAR _upn rather than calling it twice inline?`,
    options: [
      'It prevents USERPRINCIPALNAME() from returning different values on each call within the same expression',
      'USERPRINCIPALNAME() is called once per predicate evaluation and VAR caches it, avoiding a redundant function call — primarily a readability and minor performance benefit',
      'VAR is required when USERPRINCIPALNAME() is used in a logical OR expression',
      'Without VAR, the second call to USERPRINCIPALNAME() would return BLANK'
    ],
    correct: 1,
    explanation: 'USERPRINCIPALNAME() is deterministic per session — it does not change between calls within the same query. VAR _upn avoids repeating the call and makes the intent explicit (one identity, used two ways). It is primarily a readability and minor consistency convention rather than a correctness requirement. The pattern is considered best practice in production RLS expressions.',
    whyWrong: {
      0: 'USERPRINCIPALNAME() is deterministic per session. It would return the same value both times. The VAR is not needed for correctness.',
      2: 'There is no syntactic restriction preventing USERPRINCIPALNAME() in a logical OR without VAR.',
      3: 'USERPRINCIPALNAME() does not return BLANK on a second call. It is session-scoped and stable.'
    },
    source: SRC.rls,
    tags: ['rls-dax', 'var', 'userprincipalname', 'code-reading', 'best-practice'],
    relatedIds: ['rdx-005', 'dxi-015']
  }),

  // rdxs-004 — TREATAS for cross-table user matching (code-reading, single)
  single({
    id: 'rdxs-004',
    domain: 'semantic',
    subtopic: 'rls-patterns',
    difficulty: 5,
    prompt: `A modeler wants to filter the Sales table based on the calling user without a physical relationship between a Users security table and Sales. They write the following RLS expression on the Sales table:\n\`\`\`dax\nSALES[Region] IN\n    TREATAS(\n        FILTER(Users, Users[Email] = USERPRINCIPALNAME()),\n        Sales[Region]\n    )\n\`\`\`\nWhat does TREATAS accomplish here?`,
    options: [
      'TREATAS adds a physical relationship between Users and Sales at query time',
      'TREATAS re-tags the Users[Email] column values as if they were Sales[Region] values, creating a virtual filter on Sales[Region] without a physical relationship',
      'TREATAS is invalid in RLS expressions — only RELATED can cross tables',
      'TREATAS filters Users to the current user but returns the Sales table unchanged'
    ],
    correct: 1,
    explanation: 'TREATAS(table, column) re-labels the values from the input table as belonging to the target column, then DAX uses that as a filter on the target column\'s lineage. In this pattern: FILTER(Users, ...) returns a one-row table of the user\'s regions, and TREATAS re-tags those values as Sales[Region] values, producing a virtual filter that matches rows in Sales. This avoids needing a physical relationship between Users and Sales, which is useful when the relationship would create cross-filter complications.',
    whyWrong: {
      0: 'TREATAS does not add a physical relationship. It creates a virtual column lineage mapping at evaluation time only.',
      2: 'TREATAS is valid in RLS expressions. It is a standard DAX table manipulation function.',
      3: 'TREATAS specifically re-tags the column values — it does not return Sales unchanged. The output is a filtered column values table with new lineage.'
    },
    source: SRC.rls,
    tags: ['rls-dax', 'treatas', 'virtual-relationship', 'code-reading', 'advanced'],
    relatedIds: ['rdx-007', 'rdxs-009']
  }),

  // rdxs-005 — CONTAINS for multi-value entitlements (code-reading, single)
  single({
    id: 'rdxs-005',
    domain: 'semantic',
    subtopic: 'rls-patterns',
    difficulty: 4,
    prompt: `An RLS expression needs to let a user see rows for ANY of their assigned regions (a user may have multiple). The entitlement table UserRegions has columns [Email] and [Region]. The RLS expression on the DimRegion table is:\n\`\`\`dax\nCONTAINS(\n    FILTER(UserRegions, UserRegions[Email] = USERPRINCIPALNAME()),\n    UserRegions[Region], DimRegion[RegionCode]\n)\n\`\`\`\nWhat does this expression return per row of DimRegion?`,
    options: [
      'TRUE if the current DimRegion[RegionCode] value appears in the set of regions assigned to the calling user; FALSE otherwise',
      'The count of matching regions for this user',
      'TRUE for all rows if the user has any region at all; FALSE only for users with zero entitlements',
      'An error — CONTAINS cannot reference a column from the outer table (DimRegion) in its third argument'
    ],
    correct: 0,
    explanation: 'CONTAINS(table, columnName, value) returns TRUE if the value appears in the specified column of the table. Here: the first arg filters UserRegions to the calling user\'s rows, the second arg specifies which column to search, and the third arg is the value to look for (the current row\'s RegionCode from DimRegion). Evaluated per row of DimRegion, this returns TRUE only for regions the user is entitled to — a correct multi-value entitlement pattern.',
    whyWrong: {
      1: 'CONTAINS returns a Boolean (TRUE/FALSE), not a count.',
      2: 'CONTAINS tests whether the specific row\'s value is in the set — it is row-specific, not a blanket TRUE for any entitled user.',
      3: 'RLS expressions have row context for the filtered table (DimRegion here). Referencing DimRegion[RegionCode] in the CONTAINS value argument is valid.'
    },
    source: SRC.rls,
    tags: ['rls-dax', 'contains', 'multi-value-entitlement', 'code-reading', 'pattern'],
    relatedIds: ['rdxs-004', 'dls-014']
  }),

  // rdxs-006 — RLS on dim vs fact: which table to filter (single, no code)
  single({
    id: 'rdxs-006',
    domain: 'semantic',
    subtopic: 'rls-roles',
    difficulty: 3,
    prompt: 'A star-schema model has a DimRegion dimension and a FactSales fact table. Relationships: DimRegion → FactSales (single-direction, one-to-many). A modeler places the RLS region filter on the FactSales fact table directly. A second modeler says "the filter belongs on DimRegion." Who is correct, and why?',
    options: [
      'Both are equivalent — the filter propagates through the relationship either way',
      'The second modeler is correct: filtering DimRegion uses the existing relationship to propagate the filter to FactSales automatically, which is more maintainable and works correctly even when additional fact tables share the same dimension',
      'The first modeler is correct: filtering the fact table directly is always faster and more explicit',
      'Neither approach is valid — RLS can only be placed on a dedicated security table'
    ],
    correct: 1,
    explanation: 'Placing RLS on the dimension is the recommended pattern. The single-direction relationship from DimRegion to FactSales means a filter on DimRegion propagates to FactSales automatically via the normal filter flow. If additional facts also relate to DimRegion, they all benefit from one role definition. Filtering the fact table directly works but duplicates logic for every fact sharing the dimension and can be missed if new facts are added.',
    whyWrong: {
      0: 'Not equivalent in maintenance terms. A fact-table filter must be replicated to every fact; a dim filter propagates to all. Propagation also has different behavior if cross-filter direction is ever toggled.',
      2: 'Direct fact filtering is not universally faster — the storage engine handles both efficiently for simple predicates. Maintainability strongly favors the dim.',
      3: 'RLS can be placed on any table in the model, not just dedicated security tables.'
    },
    source: SRC.rls,
    tags: ['rls-roles', 'dim-vs-fact', 'filter-propagation', 'design-pattern'],
    relatedIds: ['rdx-007', 'rdxs-009']
  }),

  // rdxs-007 — Steps to configure dynamic RLS role (ordering)
  order({
    id: 'rdxs-007',
    domain: 'semantic',
    subtopic: 'dynamic-rls',
    difficulty: 3,
    prompt: 'Place the following steps in the correct order to configure a working dynamic RLS role in Power BI Desktop that filters rows based on the signed-in user\'s department.',
    options: [
      'Create or import a Users security table with [Email] and [Department] columns',
      'Define a relationship between the Users table and the dimension table that holds [Department]',
      'In Model view → Manage Roles, create a new role and enter the DAX table filter expression using USERPRINCIPALNAME()',
      'Use "View as role" in Power BI Desktop to test that a sample user sees only their department\'s rows',
      'Publish the model to Fabric/Power BI Service and assign users to the role'
    ],
    explanation: 'The correct sequence: (1) provide the security table as the entitlement source, (2) wire the relationship so the filter can propagate, (3) author the DAX predicate in the role, (4) test locally before publishing, (5) publish and assign. Testing before publishing (step 4 before 5) is critical — a broken predicate in Service affects live users.',
    source: SRC.rls,
    tags: ['dynamic-rls', 'configuration-steps', 'ordering', 'workflow']
  }),

  // rdxs-008 — Bridge table RLS misapplied to fact table (code-reading, single)
  single({
    id: 'rdxs-008',
    domain: 'semantic',
    subtopic: 'rls-dax',
    difficulty: 4,
    prompt: `A modeler places the following RLS expression on the FactSales FACT table (not on a dimension):\n\`\`\`dax\nRELATED(Users[UserEmail]) = USERPRINCIPALNAME()\n\`\`\`\nWhy is this expression problematic when applied to FactSales?`,
    options: [
      'RELATED() traverses relationships from the current table to a related table. On FactSales, RELATED(Users[UserEmail]) requires a direct relationship from FactSales to Users. If no such relationship exists, RELATED returns BLANK for every row — causing no rows to be returned for any user.',
      'RELATED is only valid in calculated columns, not in RLS expressions',
      'The expression is correct and is the recommended pattern for fact-table RLS',
      'USERPRINCIPALNAME() cannot be compared to a RELATED value'
    ],
    correct: 0,
    explanation: 'RELATED requires a relationship path from the current table (FactSales) to the target table (Users). Fact tables typically do not have a direct relationship to a Users security table — the path is usually Fact → Dim → Users. Without the relationship, RELATED returns BLANK and the predicate becomes BLANK = UPN, which is FALSE for every row. The correct pattern is to apply RLS on a dimension table that DOES have a relationship to Users, letting standard filter propagation carry the security context down to the fact.',
    whyWrong: {
      1: 'RELATED is valid in both calculated columns and RLS table filter expressions.',
      2: 'Applying RELATED to a fact table is NOT recommended when no direct relationship to Users exists — it silently fails closed.',
      3: 'Comparing a RELATED value to USERPRINCIPALNAME() is syntactically valid. The problem is the missing relationship, not the comparison.'
    },
    source: SRC.rls,
    tags: ['rls-dax', 'related', 'fact-table', 'relationship-dependency', 'code-reading', 'exam-trap'],
    relatedIds: ['rdx-005', 'rdxs-006']
  }),

  // rdxs-009 — Filter context: RLS applies before measure (code-reading, single)
  single({
    id: 'rdxs-009',
    domain: 'semantic',
    subtopic: 'rls-dax',
    difficulty: 4,
    prompt: `A model has an RLS role with the table filter on DimProduct:\n\`\`\`dax\n[Category] = LOOKUPVALUE(\n    Users[AllowedCategory],\n    Users[Email], USERPRINCIPALNAME()\n)\n\`\`\`\nA measure on FactSales is:\n\`\`\`dax\nTotal Sales := SUM(FactSales[Amount])\n\`\`\`\nUser Alice is entitled to Category = "Electronics". When Alice views a report card showing [Total Sales] with no visual filter, what does the measure return?`,
    options: [
      'Total sales across ALL categories — the RLS filter does not affect measures',
      'Total sales for Electronics only — RLS filters apply before the measure\'s filter context, so SUM sees only rows where Category = "Electronics"',
      'BLANK — RLS and measures cannot coexist in the same visual',
      'Total sales for Electronics only, but only if the visual explicitly has Category on rows'
    ],
    correct: 1,
    explanation: 'RLS table filters are applied as permanent filters in the filter context BEFORE any measure evaluation. They behave like invisible slicers that cannot be removed by CALCULATE or ALL(). So when Alice evaluates [Total Sales] with no visual filter, the RLS filter on DimProduct already restricts DimProduct to Electronics rows, and via the relationship, FactSales is filtered accordingly. The measure returns only Electronics sales.',
    whyWrong: {
      0: 'RLS filters absolutely affect measures. They are injected into the filter context before evaluation — this is the core mechanism of RLS.',
      2: 'RLS and measures coexist by design. The whole point of RLS is to restrict what measures see.',
      3: 'RLS is independent of visual configuration. The filter applies even with no Category column on the visual.'
    },
    source: SRC.rls,
    tags: ['rls-dax', 'filter-context', 'measure-interaction', 'code-reading'],
    relatedIds: ['dxi-017', 'rdxs-002']
  }),

  // rdxs-010 — USERPRINCIPALNAME() returns BLANK in test context (code-reading, multi)
  multi({
    id: 'rdxs-010',
    domain: 'semantic',
    subtopic: 'dynamic-rls',
    difficulty: 4,
    prompt: `A developer tests a dynamic RLS expression:\n\`\`\`dax\n[UserEmail] = USERPRINCIPALNAME()\n\`\`\`\nWhen previewing the model in Power BI Desktop without using "View as role," the developer sees ALL rows instead of just their own. Which statements correctly explain this behavior? Select all that apply.`,
    options: [
      'USERPRINCIPALNAME() returns BLANK in Power BI Desktop when not viewed "as role" — the predicate BLANK = [UserEmail] is FALSE for all non-blank emails, so all rows pass',
      'RLS is only enforced in the Power BI Service or when explicitly testing via "View as role" in Desktop — outside those contexts the filter is not applied',
      'The expression is syntactically incorrect — it should use CONTAINS instead of =',
      'Power BI Desktop shows the model owner view by default, which bypasses all RLS by design',
      'USERPRINCIPALNAME() in Desktop without a role context returns the developer\'s actual Windows UPN, filtering to only their rows'
    ],
    correct: [1, 3],
    explanation: 'Two statements are correct: (B) RLS enforcement is only active in Service or "View as role" mode — in normal Desktop authoring view, RLS is bypassed intentionally so the author can see all data. (D) Desktop shows the model-owner view, which bypasses RLS by design. (A) is incorrect: USERPRINCIPALNAME() in Desktop actually returns the developer\'s own UPN — the issue is not BLANK but that the enforcement mechanism is not active. (C) is wrong — = is valid for single-value matching. (E) is the partial truth behind A but the conclusion is backwards: the UPN is available but RLS itself is not enforced in default Desktop view.',
    whyWrong: {
      0: 'USERPRINCIPALNAME() in Power BI Desktop does return the signed-in user\'s UPN (not BLANK). The reason all rows appear is that RLS is simply not enforced in the default Desktop authoring context — not a BLANK issue.',
      2: 'Single-value = comparison is valid DAX for RLS. CONTAINS is for multi-value set membership.',
      4: 'This is partially true (UPN is returned) but the conclusion is wrong. RLS is not enforced in default Desktop view regardless of whether UPN resolves correctly.'
    },
    source: SRC.rls,
    tags: ['dynamic-rls', 'userprincipalname', 'desktop-vs-service', 'testing', 'code-reading'],
    relatedIds: ['rdxs-001', 'dls-013']
  }),

  // rdxs-011 — Multi-select: valid DAX in RLS table filter expressions
  multi({
    id: 'rdxs-011',
    domain: 'semantic',
    subtopic: 'rls-roles',
    difficulty: 3,
    prompt: 'Which of the following are valid DAX expressions for an RLS table filter (the expression entered in the role\'s table filter box in Power BI)? Select all that apply.',
    options: [
      '[Region] = "West"',
      'USERPRINCIPALNAME() = [UserEmail]',
      'LOOKUPVALUE(Users[Department], Users[Email], USERPRINCIPALNAME()) = [Department]',
      'SUM([SalesAmount]) > 1000',
      'PATHCONTAINS([ManagerPath], USERPRINCIPALNAME())',
      'CALCULATE([Total Sales], ALL(DimProduct)) > 500'
    ],
    correct: [0, 1, 2, 4],
    explanation: 'RLS table filter expressions must return a Boolean (TRUE/FALSE) per row, and can use standard DAX functions that operate in row context. (A) simple static equality — valid. (B) identity comparison — valid. (C) LOOKUPVALUE lookup — valid. (E) PATHCONTAINS — valid Boolean per row. (D) SUM is an aggregation — aggregations are not valid in RLS expressions because there is no filter context for them to aggregate over; this errors. (F) CALCULATE with a measure is not allowed in RLS — measures and CALCULATE in that form cannot be evaluated in the row-context RLS evaluation environment.',
    whyWrong: {
      3: 'SUM is an aggregation function requiring a filter context. RLS expressions are evaluated in row context per row of the filtered table — SUM has no context to aggregate over and is not permitted.',
      5: 'CALCULATE with a measure cannot be used as an RLS table filter expression. RLS filters operate in row context, not measure evaluation context. This would cause an error at role definition time.'
    },
    source: SRC.rls,
    tags: ['rls-roles', 'valid-expressions', 'row-context', 'exam-trap'],
    relatedIds: ['rdxs-009', 'dxi-004']
  }),

  // rdxs-012 — PATHCONTAINS hierarchy top-level edge case (code-reading, single)
  single({
    id: 'rdxs-012',
    domain: 'semantic',
    subtopic: 'rls-patterns',
    difficulty: 4,
    prompt: `An RLS hierarchy expression on the Employees table is:\n\`\`\`dax\nPATHCONTAINS([ManagerHierarchyPath], USERPRINCIPALNAME())\n\`\`\`\nThe [ManagerHierarchyPath] column is built with PATH(Employees[EmployeeKey], Employees[ManagerKey]). CEO Alice is at the root — her own PATH entry is just her EmployeeKey with no parent. When Alice's UPN is evaluated against her own row, what does PATHCONTAINS return?`,
    options: [
      'FALSE — PATHCONTAINS only works for non-root nodes where a parent-child path exists',
      'TRUE — PATH always includes the node itself; PATHCONTAINS finds Alice\'s own ID in her path',
      'BLANK — root nodes produce null paths',
      'An error — PATHCONTAINS requires at least two levels in the hierarchy'
    ],
    correct: 1,
    explanation: 'PATH(key, parentKey) always includes the node itself in its own path. A root node (null parent) generates a path containing just its own key. PATHCONTAINS(path, value) returns TRUE if the value is anywhere in the path string. Since Alice\'s key appears in her own path, PATHCONTAINS returns TRUE for Alice\'s row. This means Alice (as a top-level manager) correctly sees her own row — and because her key appears in every subordinate\'s path, she also sees all rows below her.',
    whyWrong: {
      0: 'PATH includes the node itself. Root nodes are not excluded — their path is just their own key.',
      2: 'PATH does not return null for root nodes. It returns a string containing just the node\'s own key.',
      3: 'PATH and PATHCONTAINS work on single-node paths. There is no minimum depth requirement.'
    },
    source: SRC.rls,
    tags: ['rls-patterns', 'pathcontains', 'hierarchy', 'root-node', 'code-reading'],
    relatedIds: ['rdx-004']
  }),

  // rdxs-013 — Performance: LOOKUPVALUE per-row vs bridge relationship (multi)
  multi({
    id: 'rdxs-013',
    domain: 'semantic',
    subtopic: 'rls-dax',
    difficulty: 5,
    prompt: `Two engineers propose different RLS approaches for a model with 500,000 users:\n\n**Approach A:**\n\`\`\`dax\nLOOKUPVALUE(Users[Region], Users[Email], USERPRINCIPALNAME()) = [Region]\n\`\`\`\n(on the DimRegion table, no physical relationship between Users and DimRegion)\n\n**Approach B:** Create a physical relationship between Users and DimRegion, then use:\n\`\`\`dax\n[UserEmail] = USERPRINCIPALNAME()\n\`\`\`\n(on the Users table, filter propagates via relationship)\n\nWhich statements about the performance difference are TRUE? Select all that apply.`,
    options: [
      'Approach A evaluates LOOKUPVALUE once per row of DimRegion at query time — for large DimRegion tables this runs in the formula engine row by row',
      'Approach B pushes the user identity filter to the storage engine via the relationship; VertiPaq can handle it efficiently as a hash join',
      'Approach A and B are identical in performance — DAX optimizes LOOKUPVALUE to use the same path as a relationship',
      'Approach B is generally preferred for large user tables because the relationship-based filter is sargable by the storage engine',
      'Approach A is preferred because it avoids adding a relationship to the model'
    ],
    correct: [0, 1, 3],
    explanation: 'LOOKUPVALUE in RLS (Approach A) is evaluated per row in the formula engine — for a large DimRegion table with many users it can be slow at scale (A is true). A physical relationship (Approach B) lets the storage engine apply the user filter as a hash join, which is far more efficient for large user counts (B, D are true). DAX does NOT automatically convert LOOKUPVALUE to relationship semantics (C is false). The preference for a relationship (D) is well-documented Microsoft guidance for high-user-count models. Avoiding relationships (E) is not a valid performance reason — relationships cost very little and pay large performance dividends.',
    whyWrong: {
      2: 'The DAX engine does NOT automatically optimize LOOKUPVALUE into a relationship-equivalent path. They are processed differently.',
      4: 'Avoiding a relationship "for simplicity" is not a performance optimization. Relationships are the efficient path for filter propagation.'
    },
    source: SRC.rls,
    tags: ['rls-dax', 'performance', 'lookupvalue', 'bridge-table', 'storage-engine', 'code-reading'],
    relatedIds: ['rdx-003', 'rdx-008', 'dxi-012']
  }),

  // rdxs-014 — USERPRINCIPALNAME() + IN operator for multi-role entitlement (code-reading, single)
  single({
    id: 'rdxs-014',
    domain: 'semantic',
    subtopic: 'rls-patterns',
    difficulty: 4,
    prompt: `A modeler needs to show a user rows for MULTIPLE regions based on an entitlement table. They write the following RLS expression on DimRegion:\n\`\`\`dax\n[RegionCode] IN\n    SELECTCOLUMNS(\n        FILTER(UserRegions, UserRegions[Email] = USERPRINCIPALNAME()),\n        \"RC\", UserRegions[RegionCode]\n    )\n\`\`\`\nWhat does this expression do, and is it a recommended pattern?`,
    options: [
      'It filters DimRegion to rows where [RegionCode] is in the set of region codes assigned to the calling user in UserRegions. It is a valid and recommended multi-value entitlement pattern.',
      'It returns all rows because IN with a SELECTCOLUMNS result always evaluates to TRUE',
      'It errors because IN cannot accept a table expression — only a literal list like {\"A\", \"B\", \"C\"}',
      'It is invalid because FILTER cannot reference USERPRINCIPALNAME() inside an RLS context'
    ],
    correct: 0,
    explanation: 'The IN operator in DAX accepts a table expression (not just a literal list). SELECTCOLUMNS projects only the [RegionCode] values for the calling user from UserRegions. The result is a single-column virtual table of the user\'s entitled region codes. IN then checks whether the current DimRegion row\'s [RegionCode] is a member of that set. This is the idiomatic multi-value entitlement pattern — it correctly shows a user all their regions.',
    whyWrong: {
      1: 'IN evaluates membership precisely. A user with no regions in UserRegions produces an empty set, and IN against an empty set returns FALSE for every row — the user sees nothing.',
      2: 'IN in DAX does accept a table expression. The literal-list syntax {A, B, C} is one form but SELECTCOLUMNS/FILTER table expressions also work.',
      3: 'USERPRINCIPALNAME() is fully accessible inside FILTER within an RLS expression. It is not restricted in that context.'
    },
    source: SRC.rls,
    tags: ['rls-patterns', 'in-operator', 'selectcolumns', 'multi-value-entitlement', 'code-reading'],
    relatedIds: ['rdxs-005', 'rdxs-013']
  }),

  // rdxs-015 — USERNAME() Domain format + Fabric context (code-reading, multi)
  multi({
    id: 'rdxs-015',
    domain: 'semantic',
    subtopic: 'rls-dax',
    difficulty: 4,
    prompt: `A team migrates an on-premises Power BI Report Server model to Fabric. The model has this RLS expression on every restricted table:\n\`\`\`dax\nVAR userName = USERNAME()\nRETURN [OwnerLogin] = userName\n\`\`\`\nThe [OwnerLogin] column stores Windows domain login values like "CORP\\alice". After migration to Fabric, users report seeing NO rows. Which statements explain the failure and the correct fix? Select all that apply.`,
    options: [
      'USERNAME() in Fabric returns the UPN (e.g. "alice@corp.com"), not "CORP\\alice" — the comparison fails because formats differ',
      'The fix is to replace USERNAME() with USERPRINCIPALNAME() AND update [OwnerLogin] to store UPN-format values (or add a UPN column to the mapping table)',
      'The fix is to replace USERNAME() with USERDOMAIN() + "\\\\" + USEROBJECTID()',
      'USERNAME() is deprecated in Fabric and should be replaced with CUSTOMDATA()',
      'The migration must also update the [OwnerLogin] column values from DOMAIN\\user to UPN format to match what USERPRINCIPALNAME() returns'
    ],
    correct: [0, 1, 4],
    explanation: 'The root cause is format mismatch (A): USERNAME() in Fabric returns UPN format, but [OwnerLogin] was populated with DOMAIN\\user format for on-premises. Fix requires both sides: replace USERNAME() with USERPRINCIPALNAME() in the DAX (B) AND update the data to store UPNs (E) — or add a mapping column. Just changing the function without updating the data column leaves the mismatch. (C) USERDOMAIN() + USEROBJECTID() would construct a different non-standard string, not a UPN. (D) CUSTOMDATA() is for embedding scenarios where a custom string is passed via connection — it is not a replacement for user identity in standard RLS.',
    whyWrong: {
      2: 'USERDOMAIN() + USEROBJECTID() does not produce a valid UPN. USEROBJECTID() returns a GUID, not a username. This would fail to match any real data.',
      3: 'USERNAME() is not deprecated and CUSTOMDATA() is not a user-identity function. CUSTOMDATA() passes an arbitrary string from the connection, unrelated to authenticated user identity.'
    },
    source: SRC.rls,
    tags: ['rls-dax', 'username', 'userprincipalname', 'migration', 'on-premises-to-fabric', 'code-reading'],
    relatedIds: ['rdxs-001', 'rdxs-003']
  })
];
