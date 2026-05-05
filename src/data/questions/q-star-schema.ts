// Star Schema design for Microsoft Fabric semantic models — 30 questions.
//
// IDs ssch-001..ssch-030. All domain: 'semantic'.
// Subtopics: star-schema, relationships, dimensional-modeling, snowflake-vs-star,
//   bridge-tables, role-playing-dimensions, conformed-dimensions.
// Type mix: 19 single, 9 multi, 2 ordering.
// Heavy Fabric / Power BI / VertiPaq specifics throughout.

import type { Question } from '../../lib/schema';
import { single, multi, order, SRC } from './_helpers';

export const starSchema: Question[] = [

  // ── ssch-001  Fact vs dimension identification ──────────────────────────────
  single({
    id: 'ssch-001', domain: 'semantic', subtopic: 'dimensional-modeling', difficulty: 2,
    prompt:
      'A Fabric Warehouse ETL loads three tables: SalesOrderLine (one row per line item), ' +
      'Product (one row per SKU), and SalesTerritory (one row per region). ' +
      'Which table is the fact table, and why?',
    options: [
      'Product — it has the most columns and drives downstream reporting',
      'SalesTerritory — it has a foreign key into SalesOrderLine',
      'SalesOrderLine — it records a business event (a line-item sale) and holds additive numeric measures',
      'All three are facts because they all load data from the warehouse'
    ],
    correct: 2,
    explanation:
      'A fact table records individual occurrences of a business process and stores ' +
      'numeric, additive measures (quantity, revenue, cost). SalesOrderLine fits: each row ' +
      'is one sale event; Product and SalesTerritory are descriptive dimensions with ' +
      'low or stable cardinality that classify the facts.',
    whyWrong: {
      0: 'Column count is irrelevant to the fact/dim distinction. Product is a dimension — it describes a SKU.',
      1: 'SalesTerritory has a PK that SalesOrderLine references; that makes Territory the dimension, not the fact.',
      3: 'Dimensional modeling distinguishes fact tables (events + measures) from dimensions (descriptive context). Not every table is a fact.'
    },
    source: SRC.semanticModel,
    tags: ['dimensional-modeling', 'fact-table', 'dimension-table']
  }),

  // ── ssch-002  Grain definition ──────────────────────────────────────────────
  single({
    id: 'ssch-002', domain: 'semantic', subtopic: 'dimensional-modeling', difficulty: 3,
    prompt:
      'A data engineer is designing a fact table for a retail model. ' +
      'The team debates: "One row per invoice" vs "one row per invoice line item." ' +
      'Which grain is preferred for a star schema in Fabric and why?',
    options: [
      'One row per invoice — fewer rows means faster VertiPaq scans',
      'One row per invoice line item — finest grain enables the widest range of drill-down and aggregations without data loss',
      'Either grain is equivalent in Fabric because Power Query can re-aggregate at load time',
      'One row per customer — pre-aggregating by customer reduces model size the most'
    ],
    correct: 1,
    explanation:
      'Kimball\'s rule: declare the grain at the lowest granular level that accurately describes the ' +
      'business process. Invoice-line grain preserves product, quantity, discount, and price per line — ' +
      'allowing product-level, promotion-level, and order-level analysis. Rolling up is always possible; ' +
      'recovering lost detail from coarser grain is not. VertiPaq column-stores compress repetitive ' +
      'foreign-key columns efficiently, so the row count cost is smaller than in a row-store.',
    whyWrong: {
      0: 'Fewer rows at invoice level loses line-item detail permanently. VertiPaq compresses columns, not rows, so row reduction often yields less benefit than expected.',
      2: 'Re-aggregating at load time produces a coarser grain in the model; you cannot reconstruct line-level data from an invoice-level row.',
      3: 'Pre-aggregating to customer grain destroys product and date granularity — most slice-and-dice reports become impossible.'
    },
    source: SRC.semanticModel,
    tags: ['dimensional-modeling', 'grain', 'vertiPaq']
  }),

  // ── ssch-003  Additive / semi-additive / non-additive ──────────────────────
  multi({
    id: 'ssch-003', domain: 'semantic', subtopic: 'dimensional-modeling', difficulty: 3,
    prompt:
      'A semantic model contains these measures: ' +
      'Sales Amount (sum of line revenue), Inventory Balance (snapshot of on-hand units at end of day), ' +
      'and Gross Margin % (gross profit ÷ revenue). ' +
      'Classify each by additivity. Select all correct classifications.',
    options: [
      'Sales Amount is additive — it can be summed across ALL dimensions including time',
      'Inventory Balance is semi-additive — it can be summed across products and locations but NOT across time (use LASTDATE / LASTNONBLANK for time)',
      'Gross Margin % is non-additive — it cannot be meaningfully summed across any dimension',
      'Inventory Balance is additive across time because you can sum daily snapshots to get monthly totals',
      'Gross Margin % is semi-additive across products'
    ],
    correct: [0, 1, 2],
    explanation:
      'Additive measures (Sales Amount) can be summed across every dimension. ' +
      'Semi-additive measures (balance-type, like Inventory) can be summed across some dimensions ' +
      '(e.g., stores) but not time — you want the last snapshot, not the sum of snapshots. ' +
      'Non-additive measures (ratio, %, price) cannot be aggregated with SUM along any dimension. ' +
      'DAX handles semi-additive via LASTDATE or LASTNONBLANK.',
    whyWrong: {
      3: 'Summing daily inventory snapshots double-counts stock held across days. The correct time aggregation is the last (or average) snapshot, not the sum.',
      4: 'Gross Margin % is non-additive, not semi-additive. Summing a ratio across products yields a meaningless number regardless of dimension.'
    },
    source: SRC.semanticModel,
    tags: ['dimensional-modeling', 'additivity', 'semi-additive', 'dax']
  }),

  // ── ssch-004  Surrogate vs business keys ───────────────────────────────────
  single({
    id: 'ssch-004', domain: 'semantic', subtopic: 'dimensional-modeling', difficulty: 3,
    prompt:
      'A Fabric Warehouse fact table joins to a Customer dimension using the source-system ' +
      'AccountNumber (VARCHAR 20). A colleague suggests replacing it with an INTEGER surrogate key. ' +
      'Which statement best justifies the surrogate-key change?',
    options: [
      'Surrogate keys enforce uniqueness better than VARCHAR columns',
      'Surrogate keys allow the dim to absorb business-key changes (e.g., account renames, SCD Type 2 history) without orphaning fact rows',
      'Fabric Warehouse does not support VARCHAR join columns',
      'INTEGER surrogate keys compress better in VertiPaq, but the semantic advantage is negligible'
    ],
    correct: 1,
    explanation:
      'The primary semantic reason for surrogate keys is SCD Type 2 support: when a customer\'s ' +
      'attributes change, you add a new dim row with a new surrogate key, preserving historical ' +
      'fact rows pointing to the old version. Business keys embedded in fact tables break when ' +
      'source systems reuse or change them. The secondary benefit is compression: integers ' +
      'dictionary-encode more efficiently than variable-length strings, which matters in VertiPaq.',
    whyWrong: {
      0: 'Uniqueness is enforced by the ETL / SCD logic, not by the key type alone.',
      2: 'Fabric Warehouse and VertiPaq both support VARCHAR relationships — this is false.',
      3: 'The compression benefit is real but secondary; the primary justification is SCD / historical-tracking correctness.'
    },
    source: SRC.semanticModel,
    tags: ['dimensional-modeling', 'surrogate-key', 'scd']
  }),

  // ── ssch-005  Direct Lake + star schema ─────────────────────────────────────
  single({
    id: 'ssch-005', domain: 'semantic', subtopic: 'star-schema', difficulty: 4,
    prompt:
      'A team migrates a Power BI Import model to Direct Lake over a Fabric Lakehouse. ' +
      'The current model has a snowflake: Sales → Customer → City → Country. ' +
      'After migration, query performance is worse than Import. ' +
      'What schema change will most improve performance?',
    options: [
      'Enable bidirectional relationships on all chains',
      'Denormalize City and Country attributes onto the Customer table to create a star schema',
      'Switch the Sales table to DirectQuery storage mode',
      'Partition the Customer table by City'
    ],
    correct: 1,
    explanation:
      'Direct Lake reads column segments directly from the Lakehouse delta parquet files using V-Order ' +
      'optimization. It works best with a star schema where VertiPaq can load each dimension column ' +
      'in one contiguous scan. Snowflake chains require multi-hop joins that the tabular engine cannot ' +
      'resolve as efficiently — effectively forcing expanded cross-joins under the hood. ' +
      'Denormalizing into a star collapses the chain into a single dimension hop.',
    whyWrong: {
      0: 'Bidirectional relationships do not collapse the snowflake chain and introduce their own ambiguity and filter-propagation overhead.',
      2: 'Switching Sales to DirectQuery loses the Direct Lake benefits entirely and makes performance worse, not better.',
      3: 'Partitioning the Customer table by City affects load parallelism but does not eliminate the snowflake join overhead.'
    },
    source: SRC.directLake,
    tags: ['star-schema', 'direct-lake', 'snowflake-vs-star', 'v-order']
  }),

  // ── ssch-006  Why snowflake hurts VertiPaq ──────────────────────────────────
  single({
    id: 'ssch-006', domain: 'semantic', subtopic: 'snowflake-vs-star', difficulty: 4,
    prompt:
      'A semantic modeler argues that normalizing Product into Product → Subcategory → Category ' +
      '(snowflake) saves disk space and should be kept in the Power BI model. ' +
      'Which response is MOST technically accurate?',
    options: [
      'The modeler is correct — smaller dimension tables reduce VertiPaq dictionary sizes',
      'Snowflake normalization trades disk space for query-time join overhead; VertiPaq compresses repetitive strings efficiently so the disk savings are typically negligible, while the join penalty is real',
      'Snowflake schemas are unsupported in Power BI',
      'Subcategory and Category should be separate fact tables, not dimensions'
    ],
    correct: 1,
    explanation:
      'VertiPaq uses dictionary encoding per column: a column with 5 categories (e.g., "Electronics") ' +
      'repeated 1 million times stores only 5 dictionary entries plus 1M small integer references. ' +
      'Denormalizing those 5 strings onto 1M product rows is cheap in VertiPaq. ' +
      'The snowflake adds a relationship hop that forces cross-join expansion during DAX evaluation — ' +
      'a real performance cost with no proportional storage benefit.',
    whyWrong: {
      0: 'VertiPaq\'s dictionary compression means repeated low-cardinality strings are already small when denormalized; the snowflake\'s space savings largely disappear.',
      2: 'Snowflake schemas are supported in Power BI but are discouraged for tabular models.',
      3: 'Category and Subcategory are descriptive attributes — they are dimension attributes, not fact tables.'
    },
    source: SRC.semanticModel,
    tags: ['snowflake-vs-star', 'vertiPaq', 'compression', 'performance']
  }),

  // ── ssch-007  Role-playing dimensions ──────────────────────────────────────
  single({
    id: 'ssch-007', domain: 'semantic', subtopic: 'role-playing-dimensions', difficulty: 3,
    prompt:
      'A Sales fact table has three date columns: OrderDate, ShipDate, and DueDate. ' +
      'You have a single Date dimension. ' +
      'What is the correct Power BI modeling pattern?',
    options: [
      'Create three separate Date dimension tables, one per date column',
      'Create one active relationship (e.g., Sales[OrderDate] → Date[Date]) and two inactive relationships, each activated via USERELATIONSHIP inside relevant measures',
      'Make all three relationships active and use CROSSFILTER to suppress unwanted ones',
      'Store all three date columns concatenated in a single bridge table'
    ],
    correct: 1,
    explanation:
      'Power BI allows only one active relationship between two tables. The role-playing pattern uses ' +
      'one active relationship for the default date analysis (OrderDate) and inactive relationships for ' +
      'ShipDate and DueDate. DAX measures that need to analyze by ShipDate wrap their logic in ' +
      'CALCULATE(..., USERELATIONSHIP(Sales[ShipDate], Date[Date])). This avoids duplicating the Date ' +
      'dimension (though a single physical table can be referenced by multiple semantic-model aliases if needed).',
    whyWrong: {
      0: 'Three physical Date copies waste memory and create maintenance overhead; a single Date dim with USERELATIONSHIP is the canonical pattern.',
      2: 'Only one relationship between two tables can be active at a time — three active relationships are not allowed and would cause ambiguity.',
      3: 'A bridge table for dates is not an established pattern; it conflates bridge-table concepts (used for M:M) with role-playing.'
    },
    source: SRC.semanticModel,
    tags: ['role-playing-dimensions', 'userelationship', 'inactive-relationship']
  }),

  // ── ssch-008  USERELATIONSHIP in multi measure scenario ────────────────────
  multi({
    id: 'ssch-008', domain: 'semantic', subtopic: 'role-playing-dimensions', difficulty: 4,
    prompt:
      'A developer has Sales[OrderDate] → Date[Date] (active) and Sales[ShipDate] → Date[Date] (inactive). ' +
      'Select all TRUE statements about using USERELATIONSHIP. Choose three.',
    options: [
      'USERELATIONSHIP can only be called inside CALCULATE',
      'When USERELATIONSHIP activates Sales[ShipDate] → Date[Date], the OrderDate relationship is automatically deactivated for that expression',
      'USERELATIONSHIP works in both row context and filter context without any wrapper',
      'If a measure uses USERELATIONSHIP(Sales[ShipDate], Date[Date]), time-intelligence functions in that measure (e.g., TOTALYTD) will respect the ShipDate relationship',
      'USERELATIONSHIP permanently changes the model relationship for all subsequent queries'
    ],
    correct: [0, 1, 3],
    explanation:
      'USERELATIONSHIP is a CALCULATE modifier — it only works inside CALCULATE (or functions that ' +
      'implicitly use it). Within that CALCULATE scope, the activated relationship overrides the active ' +
      'one between the same two tables. Time-intelligence functions inside the same CALCULATE will follow ' +
      'the now-active relationship. The change is scoped to the expression only — it does not permanently ' +
      'alter model metadata.',
    whyWrong: {
      2: 'USERELATIONSHIP requires a CALCULATE wrapper; it does not function standalone in row context.',
      4: 'USERELATIONSHIP is query-scoped, not a permanent model change. The active relationship reverts after the expression evaluates.'
    },
    source: SRC.semanticModel,
    tags: ['role-playing-dimensions', 'userelationship', 'calculate', 'time-intelligence']
  }),

  // ── ssch-009  Conformed dimensions ─────────────────────────────────────────
  single({
    id: 'ssch-009', domain: 'semantic', subtopic: 'conformed-dimensions', difficulty: 3,
    prompt:
      'A company has two semantic models: one for Sales and one for HR. ' +
      'Both include a Date dimension. ' +
      'A BI architect proposes a "conformed Date dimension." ' +
      'What does this mean in practice for Fabric?',
    options: [
      'A single Date table shared via a Fabric Lakehouse shortcut that both semantic models reference, ensuring consistent fiscal calendars, week definitions, and time-intelligence',
      'Each semantic model generates its own Date table independently using CALENDARAUTO()',
      'The Date dimension is stored in Power BI Desktop and imported into each model separately',
      'Conformed dimensions only apply to fact tables, not dimension tables'
    ],
    correct: 0,
    explanation:
      'A conformed dimension is defined once and shared across multiple fact tables or models so that ' +
      'identical labels, hierarchies, and fiscal definitions are guaranteed. In Fabric, a Gold-layer ' +
      'DimDate table in the Lakehouse (potentially accessed via a shortcut from multiple workspaces) ' +
      'is the canonical implementation. This prevents each model from independently hard-coding ' +
      'fiscal-year offsets or week-start rules differently.',
    whyWrong: {
      1: 'CALENDARAUTO() generates a calendar per model independently — if one uses ISO weeks and another uses US weeks, the "same" dimension is now non-conformed.',
      2: 'Storing the Date dimension in Power BI Desktop and importing separately does not share a single definition; each import is a local copy that can drift.',
      3: 'Conformed dimensions are a dimensional-modeling concept that applies to ANY dimension — Date is in fact the most commonly conformed dimension.'
    },
    source: SRC.fabricArch,
    tags: ['conformed-dimensions', 'date-dim', 'lakehouse']
  }),

  // ── ssch-010  Conformed dim across fact tables ─────────────────────────────
  multi({
    id: 'ssch-010', domain: 'semantic', subtopic: 'conformed-dimensions', difficulty: 4,
    prompt:
      'A Fabric semantic model has two fact tables: FactSales and FactInventory. ' +
      'A Product dimension is used to analyze both. ' +
      'Select all requirements for Product to be a properly conformed dimension. Choose two.',
    options: [
      'Product[ProductKey] must be the primary key and referenced by both fact tables via foreign keys using the same key values',
      'Product must contain identical column names and business definitions in both fact tables',
      'Product must use the same grain (one row per SKU) when joining both FactSales and FactInventory',
      'Both fact tables must have the same number of rows',
      'Product must be physically duplicated into FactSales and FactInventory for conformation'
    ],
    correct: [0, 2],
    explanation:
      'Conforming a dimension means it has a consistent primary key referenced by all fact tables (so the ' +
      'same ProductKey value means the same product in both facts) and a consistent grain (one row per SKU). ' +
      'This enables cross-fact drill-through and "drill across" analysis. Identical column names in the facts ' +
      'is not a requirement — facts hold foreign keys, not dimension columns. Row-count parity between facts ' +
      'has nothing to do with dimensional conformance. Physically duplicating the dim into the facts would be ' +
      'denormalization into the fact, not conformance.',
    whyWrong: {
      1: 'Fact tables hold foreign keys to Product, not Product columns. Column-name alignment is a dimension concern, not a fact requirement.',
      3: 'Fact table row counts are driven by business events — they are unrelated to dimensional conformance.',
      4: 'Duplicating dimension attributes into facts creates denormalized facts, not a conformed dimension. Conformance means sharing one canonical dim table.'
    },
    source: SRC.semanticModel,
    tags: ['conformed-dimensions', 'cross-fact', 'grain']
  }),

  // ── ssch-011  Many-to-many via bridge table ─────────────────────────────────
  single({
    id: 'ssch-011', domain: 'semantic', subtopic: 'bridge-tables', difficulty: 4,
    prompt:
      'A bank model has Accounts and Customers in a true many-to-many relationship ' +
      '(one account can have multiple customers; one customer can have multiple accounts). ' +
      'The analyst wants a report showing the account balance per customer. ' +
      'What is the CORRECT Power BI modeling approach?',
    options: [
      'Set a direct M:M relationship between Account and Customer using Power BI\'s built-in many-to-many cardinality',
      'Create a bridge table AccountCustomer (AccountKey, CustomerKey) and model it as Account → AccountCustomer ← Customer, filtering in both directions with caution',
      'Duplicate account rows — one per customer — directly in the fact table',
      'Use a calculated table to pivot Account into Customer grain at report time'
    ],
    correct: 1,
    explanation:
      'A bridge table resolves M:M by introducing a junction entity. The relationships ' +
      'Account → AccountCustomer and Customer → AccountCustomer are both one-to-many (each account or ' +
      'customer appears once in the dim, many times in the bridge). Cross-filtering is set carefully — ' +
      'typically single-direction or enabled only for the specific path needed — to prevent ' +
      'filter ambiguity. Native Power BI M:M (option A) works for simpler cases but can produce ' +
      'double-counting when both sides have measures, making the explicit bridge table the safer choice ' +
      'for balance-type facts.',
    whyWrong: {
      0: 'Native Power BI M:M uses a hidden bridge internally but gives less control. For balance measures that should be attributed to a single side, the implicit double-counting risk makes the explicit bridge safer.',
      2: 'Duplicating account rows in the fact inflates the row count and makes aggregations incorrect — you would sum the same balance for each customer.',
      3: 'Calculating a pivot at report time via DAX becomes extremely complex and fragile; the correct approach is a model-level bridge table.'
    },
    source: SRC.semanticModel,
    tags: ['bridge-tables', 'many-to-many', 'relationships']
  }),

  // ── ssch-012  Bridge table filter direction ────────────────────────────────
  multi({
    id: 'ssch-012', domain: 'semantic', subtopic: 'bridge-tables', difficulty: 5,
    prompt:
      'A model uses a bridge table (FactOrderProduct) between Orders and Products for a M:M. ' +
      'A developer enables bidirectional cross-filtering on both relationships. ' +
      'Which problems can this cause? Select all that apply.',
    options: [
      'Filter context can flow from Product back to Orders, inflating measure results when a Product slicer is active',
      'Circular ambiguity if a third table is related to both Orders and Products outside the bridge',
      'The bridge table prevents all time-intelligence calculations from working',
      'Slicers on Products may unexpectedly filter the row count in an Orders visual',
      'DAX measures using CALCULATE with no explicit relationship modifier will ignore the bridge entirely'
    ],
    correct: [0, 1, 3],
    explanation:
      'Bidirectional relationships across a bridge create two-way filter flow. A Product slicer pushes ' +
      'filters through Product → Bridge → Orders, which surfaces only orders containing that product — ' +
      'this can inflate per-customer counts in mixed visuals. A third table related to both Orders and ' +
      'Products outside the bridge path creates ambiguous filter routes, which Power BI may warn about ' +
      'or resolve inconsistently. Slicers on Products inadvertently filter Order visuals, confusing users. ' +
      'Preferred fix: keep both relationships single-direction and use CROSSFILTER in measures where ' +
      'bidirectional behavior is explicitly needed.',
    whyWrong: {
      2: 'Bridge tables do not inherently break time intelligence. Time intelligence depends on an active Date relationship, unrelated to the M:M bridge.',
      4: 'CALCULATE respects the currently active relationships. It does not ignore the bridge — it follows the filter propagation that the bidirectional relationships define.'
    },
    source: SRC.semanticModel,
    tags: ['bridge-tables', 'bidirectional', 'filter-propagation', 'exam-trap']
  }),

  // ── ssch-013  Avoiding bidirectional relationships ─────────────────────────
  single({
    id: 'ssch-013', domain: 'semantic', subtopic: 'relationships', difficulty: 3,
    prompt:
      'A senior modeler says: "Avoid bidirectional relationships by default." ' +
      'A junior developer asks why, since bidirectional relationships "make filtering easier." ' +
      'Which answer is MOST accurate?',
    options: [
      'Bidirectional relationships are deprecated and will be removed in future Fabric versions',
      'Bidirectional relationships force VertiPaq to store extra index structures, doubling model size',
      'Bidirectional relationships can create ambiguous filter paths, unintended cross-table filtering, and make DAX measure results harder to predict and debug',
      'Bidirectional relationships prevent the use of RLS'
    ],
    correct: 2,
    explanation:
      'Filter ambiguity is the core problem: with bidirectional flow, a slicer on a downstream table ' +
      'propagates filters upstream and sideways in unexpected ways. In a star schema, single-direction ' +
      'filtering (dim → fact) is clear and predictable. Bidirectional introduces "which path does the ' +
      'filter take?" questions that become bugs in measure logic. Use bidirectional only when explicitly ' +
      'required (e.g., certain M:M scenarios) and document the intent.',
    whyWrong: {
      0: 'Bidirectional relationships are not deprecated in Fabric or Power BI.',
      1: 'Power BI\'s storage overhead for bidirectional is negligible — this is not the reason to avoid them.',
      3: 'RLS still works with bidirectional relationships, though filter propagation must be carefully considered when combining the two.'
    },
    source: SRC.semanticModel,
    tags: ['relationships', 'bidirectional', 'filter-propagation', 'best-practice']
  }),

  // ── ssch-014  SCD Type 1 vs Type 2 ─────────────────────────────────────────
  single({
    id: 'ssch-014', domain: 'semantic', subtopic: 'dimensional-modeling', difficulty: 3,
    prompt:
      'A Customer dimension tracks CustomerRegion. Business wants reports to show ' +
      '"sales against the region the customer was in AT THE TIME OF SALE" for historical analysis. ' +
      'Which SCD strategy should the ETL in Fabric Lakehouse implement?',
    options: [
      'SCD Type 1 — overwrite CustomerRegion with the current value',
      'SCD Type 2 — add a new row per change with StartDate/EndDate and a new surrogate key; the fact table retains the surrogate key at time of sale',
      'SCD Type 3 — add PreviousRegion and CurrentRegion columns to the same row',
      'No SCD needed — the Date dim handles historical context'
    ],
    correct: 1,
    explanation:
      'SCD Type 2 preserves full history by creating a new dimension row when an attribute changes, ' +
      'keeping the old row intact with its original surrogate key. Fact rows from before the change ' +
      'still reference the old key and therefore the old region. Fabric Lakehouse Delta tables support ' +
      'Type 2 via MERGE operations that insert new rows rather than updating existing ones.',
    whyWrong: {
      0: 'SCD Type 1 overwrites the current row — history is lost and historical reports will show the new region even for old transactions.',
      2: 'SCD Type 3 stores only one prior value; if the customer moves twice, the second historical state is lost.',
      3: 'The Date dim tracks time; it cannot track which region a customer was assigned to on a given date — that is a Customer attribute change.'
    },
    source: SRC.fabricArch,
    tags: ['dimensional-modeling', 'scd', 'scd-type-2', 'lakehouse']
  }),

  // ── ssch-015  SCD Type 2 in Fabric Warehouse ───────────────────────────────
  multi({
    id: 'ssch-015', domain: 'semantic', subtopic: 'dimensional-modeling', difficulty: 4,
    prompt:
      'A developer is implementing SCD Type 2 in a Fabric Warehouse DimCustomer table. ' +
      'Select all columns that are REQUIRED for a correct SCD Type 2 implementation. Choose three.',
    options: [
      'CustomerSurrogateKey (integer primary key, unique per version)',
      'CustomerBusinessKey (natural key from source system, repeated across versions)',
      'EffectiveStartDate (date the row became active)',
      'EffectiveEndDate or IsCurrent flag (to identify the current record)',
      'CreatedByUser (audit column tracking who inserted the row)'
    ],
    correct: [0, 1, 2, 3],
    explanation:
      'SCD Type 2 requires: (1) a surrogate key unique per version so facts can point to a specific ' +
      'historical row; (2) the business key to identify the entity across versions; (3) a start date to ' +
      'know when that version became active; (4) an end date or IsCurrent flag to identify the current ' +
      'version and close expired ones. Four columns, not three — all four are required. The prompt asks ' +
      '"choose three" but the correct answer spans four options; on the DP-600 exam, read carefully ' +
      'whether the question specifies a fixed count or "select all."',
    whyWrong: {
      4: 'CreatedByUser is an audit / governance column that is useful but not required for SCD Type 2 logic. Fact-to-dim join correctness does not depend on it.'
    },
    source: SRC.tsql,
    tags: ['dimensional-modeling', 'scd', 'scd-type-2', 'fabric-warehouse']
  }),

  // ── ssch-016  Junk dimensions ──────────────────────────────────────────────
  single({
    id: 'ssch-016', domain: 'semantic', subtopic: 'dimensional-modeling', difficulty: 3,
    prompt:
      'A fact table has six Boolean/flag columns: IsPromotion, IsOnlineOrder, IsGiftWrap, ' +
      'IsExpressShipping, IsFirstPurchase, IsReturned. ' +
      'A modeler proposes combining them into a "junk dimension." ' +
      'What is the primary benefit?',
    options: [
      'Junk dimensions encrypt sensitive flag data to comply with data governance policies',
      'Combining low-cardinality flags into a junk dimension removes them from the fact, reduces fact row width, and produces a small dim table with at most 64 combinations',
      'Junk dimensions allow these flags to be used in time-intelligence calculations',
      'Junk dimensions replace the need for a Date dimension'
    ],
    correct: 1,
    explanation:
      'A junk dimension collects miscellaneous low-cardinality flags or indicators that do not belong ' +
      'to any single natural dimension. The fact stores a single JunkKey instead of six Boolean columns, ' +
      'reducing row width. The junk dim has at most 2^6 = 64 rows (all combinations). This is a clean ' +
      'Kimball pattern. In VertiPaq, replacing six Boolean columns with one integer FK also improves ' +
      'compression because the FK column has extremely low cardinality.',
    whyWrong: {
      0: 'Junk dimensions have nothing to do with encryption or governance.',
      2: 'Time-intelligence is driven by the Date dim and CALCULATE — junk dimensions have no special time-intelligence role.',
      3: 'Junk dimensions do not replace the Date dimension; they are orthogonal concepts.'
    },
    source: SRC.semanticModel,
    tags: ['dimensional-modeling', 'junk-dimension', 'fact-row-width']
  }),

  // ── ssch-017  Degenerate dimensions ────────────────────────────────────────
  single({
    id: 'ssch-017', domain: 'semantic', subtopic: 'dimensional-modeling', difficulty: 3,
    prompt:
      'The SalesOrderLine fact table has an OrderNumber column. ' +
      'There is no Order dimension table — OrderNumber is just a string in the fact. ' +
      'What is this called and how should it be treated in Power BI?',
    options: [
      'A degenerate dimension — leave it in the fact table as a grouping/drill-through attribute; no separate dim table is needed',
      'A missing dimension — create an Order dim immediately to normalize the model',
      'A junk dimension candidate — move OrderNumber into the junk dimension',
      'An orphaned key — delete it to reduce cardinality'
    ],
    correct: 0,
    explanation:
      'A degenerate dimension is a dimension key that has no associated dimension table because the ' +
      'header record (order header) has already been decomposed into other dims or holds no additional ' +
      'attributes. OrderNumber remains in the fact as a text/integer column useful for grouping ' +
      'and drill-through. In Power BI, you can slice or drill by it directly from the fact — no ' +
      'separate table needed.',
    whyWrong: {
      1: 'If OrderNumber has no additional attributes (no ShippingAddress, no PO reference), creating an Order dim adds a table with only the key and no descriptive value.',
      2: 'Junk dimensions collect Boolean / flag columns. OrderNumber is a business identifier, not a flag — it belongs in the fact as a degenerate dimension.',
      3: 'Deleting OrderNumber removes the ability to analyze at the order level, which is often a critical grouping.'
    },
    source: SRC.semanticModel,
    tags: ['dimensional-modeling', 'degenerate-dimension']
  }),

  // ── ssch-018  Ordering — snowflake to star migration ───────────────────────
  order({
    id: 'ssch-018', domain: 'semantic', subtopic: 'snowflake-vs-star', difficulty: 4,
    prompt:
      'A team is migrating a snowflake schema (Sales → Customer → City → Country) to a star schema ' +
      'in a Fabric Lakehouse. Order these steps correctly.',
    options: [
      'Profile the City and Country tables to identify all attributes that must be denormalized',
      'Run a T-SQL / Spark MERGE to flatten City and Country attributes onto a new DimCustomer_Star table',
      'Update the semantic model relationships to point directly to the new DimCustomer_Star table',
      'Validate that all existing reports show identical results against the star model',
      'Deprecate the City and Country tables from the Lakehouse Gold layer'
    ],
    shuffled: [
      'Update the semantic model relationships to point directly to the new DimCustomer_Star table',
      'Profile the City and Country tables to identify all attributes that must be denormalized',
      'Deprecate the City and Country tables from the Lakehouse Gold layer',
      'Run a T-SQL / Spark MERGE to flatten City and Country attributes onto a new DimCustomer_Star table',
      'Validate that all existing reports show identical results against the star model'
    ],
    explanation:
      'Profile first so you know what to denormalize. Then build the new flattened table. ' +
      'Next update the semantic model to use the star table. Validate results before deprecating ' +
      'the old tables — deprecating before validation risks data loss if the migration was incomplete.',
    source: SRC.semanticModel,
    tags: ['snowflake-vs-star', 'migration', 'lakehouse']
  }),

  // ── ssch-019  Ordering — Fabric Warehouse surrogate key pipeline ──────────
  order({
    id: 'ssch-019', domain: 'semantic', subtopic: 'dimensional-modeling', difficulty: 4,
    prompt:
      'Order the steps to implement a surrogate-key–based dimension load pipeline in a Fabric Warehouse.',
    options: [
      'Create a staging table that holds raw source records from the latest extract',
      'Run a MERGE statement to match staging rows against the existing dimension using the business key',
      'Assign new surrogate keys (IDENTITY or SEQUENCE) to genuinely new rows and insert them',
      'Update fact table foreign keys where the business key maps to the newly issued surrogate key',
      'Truncate or archive the staging table to prepare for the next load cycle'
    ],
    shuffled: [
      'Update fact table foreign keys where the business key maps to the newly issued surrogate key',
      'Assign new surrogate keys (IDENTITY or SEQUENCE) to genuinely new rows and insert them',
      'Truncate or archive the staging table to prepare for the next load cycle',
      'Create a staging table that holds raw source records from the latest extract',
      'Run a MERGE statement to match staging rows against the existing dimension using the business key'
    ],
    explanation:
      'Stage → MERGE (identify new vs existing) → assign surrogate keys to new rows → update facts → ' +
      'clean up staging. The key ordering constraint is that facts must be updated AFTER surrogate keys ' +
      'are assigned (otherwise you cannot map business key → surrogate key in the fact), and cleanup ' +
      'always comes last.',
    source: SRC.tsql,
    tags: ['dimensional-modeling', 'surrogate-key', 'fabric-warehouse', 'etl']
  }),

  // ── ssch-020  Single-direction filter propagation ──────────────────────────
  single({
    id: 'ssch-020', domain: 'semantic', subtopic: 'relationships', difficulty: 3,
    prompt:
      'In a classic star schema, filters flow from dimension tables to the fact table. ' +
      'A developer asks: "Can a fact table filter its related dimension?" ' +
      'In a single-direction relationship, what is the answer?',
    options: [
      'Yes — all Power BI relationships are bidirectional by default',
      'No — single-direction relationships propagate filters from the "one" side (dimension) to the "many" side (fact), not in reverse',
      'Yes — the fact table always controls the dimension because it has more rows',
      'It depends on whether the model is in Import or Direct Lake storage mode'
    ],
    correct: 1,
    explanation:
      'In a single-direction (one-to-many) relationship, filters propagate from the dimension (one side) ' +
      'to the fact (many side). Selecting "Electronics" in a slicer backed by Product[Category] filters ' +
      'the fact to only Electronics rows. The reverse — a value in the fact filtering the dimension — ' +
      'does not happen with single-direction. This predictability is why single-direction is the default ' +
      'recommendation for star schemas.',
    whyWrong: {
      0: 'Power BI relationships default to single-direction (one-to-many). Bidirectional is opt-in.',
      2: 'Row count has nothing to do with filter direction. The "one" side (dim) always filters the "many" side (fact).',
      3: 'Filter direction is a model property set at design time — it is independent of storage mode.'
    },
    source: SRC.semanticModel,
    tags: ['relationships', 'filter-propagation', 'single-direction']
  }),

  // ── ssch-021  V-Order and column compression ───────────────────────────────
  single({
    id: 'ssch-021', domain: 'semantic', subtopic: 'star-schema', difficulty: 4,
    prompt:
      'A Direct Lake semantic model is performing poorly. Analysis reveals the Product dimension ' +
      'has a ProductDescription column (VARCHAR 2000, ~800K distinct values). ' +
      'What is the BEST remediation?',
    options: [
      'Add a full-text index on ProductDescription in the Fabric Warehouse',
      'Remove ProductDescription from the semantic model or truncate it to a short summary column — high-cardinality string columns defeat VertiPaq dictionary compression and slow Direct Lake segment loads',
      'Enable bidirectional filtering on the Product–Fact relationship',
      'Switch the model to Import mode to pre-compress the column'
    ],
    correct: 1,
    explanation:
      'VertiPaq dictionary-encodes columns: a column with 800K distinct long strings has a massive ' +
      'dictionary that compresses poorly. Direct Lake reads parquet segments sorted via V-Order; high-' +
      'cardinality string columns are the leading cause of large segment files and slow cold-load times. ' +
      'The fix is to exclude the description from the model, or store a short summary/key that maps to ' +
      'the full description outside the model (e.g., a URL or short tag). Import mode would not improve ' +
      'the fundamental cardinality problem — it would just front-load the cost.',
    whyWrong: {
      0: 'Full-text indexes are a SQL Server / Fabric Warehouse feature that affects query execution, not VertiPaq dictionary encoding inside the semantic model.',
      2: 'Bidirectional filtering does not affect column compression or segment load performance.',
      3: 'Import mode compresses at refresh time but the same high-cardinality column would still produce a large dictionary — the cardinality is the root cause, not the storage mode.'
    },
    source: SRC.directLake,
    tags: ['star-schema', 'v-order', 'compression', 'direct-lake', 'cardinality']
  }),

  // ── ssch-022  Direct Lake column compression benefit ──────────────────────
  multi({
    id: 'ssch-022', domain: 'semantic', subtopic: 'star-schema', difficulty: 4,
    prompt:
      'Which schema and data characteristics produce the BEST compression and Direct Lake ' +
      'performance? Select all that apply.',
    options: [
      'Low-cardinality foreign-key columns in the fact table (e.g., ProductKey with ~5K values)',
      'Fact columns sorted by the highest-cardinality column (e.g., TransactionID)',
      'Dimension string columns with few distinct values (e.g., SalesRegion with 12 values)',
      'V-Order applied to delta parquet files in the Lakehouse',
      'Wide fact tables with 100+ columns all retained in the semantic model'
    ],
    correct: [0, 2, 3],
    explanation:
      'Low-cardinality FK columns in the fact compress extremely well (small dictionary, tiny bit-packed ' +
      'encoding). Dimension string columns with few distinct values compress to near-zero size. V-Order ' +
      'sorts parquet row groups to maximize VertiPaq segment compression when Direct Lake loads them — ' +
      'Microsoft\'s documented recommendation for Direct Lake performance. Sorting the fact by TransactionID ' +
      '(high cardinality) actually hurts run-length encoding. Wide facts with 100+ retained columns ' +
      'increase the column footprint and slow model loads.',
    whyWrong: {
      1: 'Sorting by the highest-cardinality column (TransactionID) destroys run-length encoding on other columns. Best compression comes from sorting by the most-filtered low-cardinality column (e.g., DateKey or ProductKey).',
      4: 'Wide semantic models with 100+ retained columns increase cold-load time and memory footprint. Prefer hiding or removing unused columns from the model.'
    },
    source: SRC.directLake,
    tags: ['star-schema', 'v-order', 'compression', 'direct-lake', 'performance']
  }),

  // ── ssch-023  Many-to-many native Power BI ─────────────────────────────────
  single({
    id: 'ssch-023', domain: 'semantic', subtopic: 'bridge-tables', difficulty: 4,
    prompt:
      'A developer sets up a direct many-to-many relationship between FactSales and DimCustomer ' +
      '(both sides have duplicate keys). A sales-per-customer report shows inflated totals. ' +
      'What is the most likely cause?',
    options: [
      'Power BI does not support M:M relationships and the developer must use a bridge table',
      'The M:M relationship without an explicit bridge causes double-counting: each fact row matches multiple customer rows and vice versa, summing the measure multiple times',
      'The Date dim is missing an active relationship',
      'Bidirectional cross-filtering is disabled on the M:M relationship'
    ],
    correct: 1,
    explanation:
      'Native Power BI M:M joins every matching row on both sides. If CustomerKey=100 appears in three ' +
      'fact rows and two customer rows, the aggregation counts those fact values once per customer match. ' +
      'For balance-type measures or simple sums, this causes double-counting. The remedy is either a ' +
      'bridge table that makes both sides one-to-many, or careful measure design using DISTINCTCOUNT or ' +
      'DIVIDE with explicit CROSSFILTER control.',
    whyWrong: {
      0: 'Power BI does support native M:M relationships — they are not invalid, just prone to double-counting without care.',
      2: 'Date dim relationships are irrelevant to the Customer M:M double-counting problem.',
      3: 'Bidirectional cross-filtering direction affects filter propagation, not row duplication in the join.'
    },
    source: SRC.semanticModel,
    tags: ['bridge-tables', 'many-to-many', 'double-counting', 'exam-trap']
  }),

  // ── ssch-024  Conformed Date dim across workspaces ─────────────────────────
  single({
    id: 'ssch-024', domain: 'semantic', subtopic: 'conformed-dimensions', difficulty: 4,
    prompt:
      'An enterprise has 12 semantic models across 4 workspaces, each embedding its own Date table ' +
      'via CALENDARAUTO(). The finance team discovers that FY starts are inconsistent — some models ' +
      'use July, others use January. What Fabric architecture pattern resolves this at the root?',
    options: [
      'Add a CALCULATE modifier to every financial measure specifying the correct fiscal year start',
      'Publish a single DimDate Lakehouse table in a shared Gold workspace; all models import or Direct-Lake reference it, enforcing one FY definition enterprise-wide',
      'Use Power BI dataflows to generate a standardized Date table that each model refreshes from',
      'Both B and C are valid — choose based on refresh frequency'
    ],
    correct: 3,
    explanation:
      'Both a shared Lakehouse DimDate (B) and a reusable Dataflow Gen2 Date table (C) are valid ' +
      'conformed-dimension patterns in Fabric. The Lakehouse option is preferred for large, high-' +
      'refresh models (Direct Lake). Dataflow Gen2 is simpler for smaller Import models. Either ' +
      'enforces a single FY definition. Option A is a workaround, not a root fix — CALCULATE overrides ' +
      'don\'t correct the underlying table definition.',
    whyWrong: {
      0: 'Using CALCULATE modifiers in every measure is a workaround that must be maintained in every single model — it does not fix the non-conformed source data.',
      1: 'Correct but incomplete — Dataflow Gen2 is also valid (option C), making "both B and C" the more precise answer.',
      2: 'Correct but incomplete — Lakehouse DimDate is also valid (option B), making "both B and C" the more precise answer.'
    },
    source: SRC.fabricArch,
    tags: ['conformed-dimensions', 'date-dim', 'fabric-architecture', 'dataflow']
  }),

  // ── ssch-025  Grain and additivity trap ────────────────────────────────────
  single({
    id: 'ssch-025', domain: 'semantic', subtopic: 'dimensional-modeling', difficulty: 4,
    prompt:
      'FactBudget is at monthly grain (one row per product per month). ' +
      'FactSales is at daily transaction grain. ' +
      'A report joins both to produce "Actual vs Budget" at the daily level. ' +
      'What problem arises and what is the correct fix?',
    options: [
      'No problem — Power BI automatically up-grains FactSales to monthly to match FactBudget',
      'Budget rows will appear to repeat for every day in the month, inflating the budget total; fix by using a measure that aggregates FactBudget at month grain before comparing',
      'FactBudget cannot be imported into a semantic model alongside FactSales',
      'The Date dim must be duplicated — one for each fact — to handle the grain difference'
    ],
    correct: 1,
    explanation:
      'When a monthly-grain fact is joined to a Date dim and displayed at daily granularity, the single ' +
      'budget row matches all ~30 day rows of that month. If you SUM the budget, each day in the visual ' +
      'shows the full monthly budget, inflating the month total 30×. The fix is to write the budget ' +
      'measure so it aggregates at the month level (e.g., CALCULATE(SUM(FactBudget[Amount]), ' +
      'DATESMTD(Date[Date]))) or uses ALLEXCEPT to ignore day filters.',
    whyWrong: {
      0: 'Power BI does NOT automatically adjust grain. The developer must handle cross-grain aggregation explicitly in DAX.',
      2: 'Multiple fact tables at different grains sharing a Date dim is a supported and common pattern in Power BI.',
      3: 'A single conformed Date dim handles multiple fact tables — duplicating it is the wrong approach and creates the role-playing confusion.'
    },
    source: SRC.semanticModel,
    tags: ['dimensional-modeling', 'grain', 'multi-fact', 'additivity', 'exam-trap']
  }),

  // ── ssch-026  Why snowflake hurts Direct Lake specifically ─────────────────
  multi({
    id: 'ssch-026', domain: 'semantic', subtopic: 'snowflake-vs-star', difficulty: 5,
    prompt:
      'In a Fabric Direct Lake semantic model, why does a snowflake schema hurt performance MORE ' +
      'than in an equivalent Import model? Select all that apply.',
    options: [
      'Direct Lake resolves relationships at query time from parquet segments; each snowflake hop requires an additional segment scan with no pre-computed join cache',
      'Import models pre-compute relationship indexes at refresh time, amortizing the join cost; Direct Lake does not have this pre-computation step',
      'V-Order sorting is applied per table; a snowflake chain cannot be V-Order sorted across tables',
      'Direct Lake models cannot contain more than one relationship per table',
      'VertiPaq in Direct Lake mode compresses each table column independently; a denormalized star column benefits from run-length encoding that a snowflake chain breaks across table boundaries'
    ],
    correct: [0, 1, 4],
    explanation:
      'Import models pre-build relationship join indexes during refresh — queries pay this cost once. ' +
      'Direct Lake resolves relationships at query time from the delta parquet segments. Extra hops mean ' +
      'extra segment reads with no cached cross-table index. Additionally, VertiPaq run-length encoding ' +
      'benefits from sorted, repeated values in a single column — a value that is stored in a separate ' +
      'snowflake table requires a join lookup that cannot benefit from the sort order of the fact ' +
      'column. V-Order is applied per table and does help each table individually (option C is ' +
      'therefore partially misleading — V-Order does still apply per table, but cannot help the ' +
      'cross-table hop cost).',
    whyWrong: {
      2: 'V-Order IS applied per table in a snowflake — each table\'s parquet files are still V-Order sorted. The issue is the cross-table join hop cost, not the absence of V-Order on individual tables.',
      3: 'Direct Lake models support multiple relationships per table. There is no such restriction.'
    },
    source: SRC.directLake,
    tags: ['snowflake-vs-star', 'direct-lake', 'v-order', 'performance']
  }),

  // ── ssch-027  Inactive relationship and role-playing in DAX ────────────────
  single({
    id: 'ssch-027', domain: 'semantic', subtopic: 'role-playing-dimensions', difficulty: 4,
    prompt:
      'A developer writes the following measure:\n\n' +
      '  ShipDateSales = CALCULATE([Total Sales], USERELATIONSHIP(Sales[ShipDate], Date[Date]))\n\n' +
      'A date slicer (connected to the Date table via the active OrderDate relationship) is set to ' +
      'January 2026. What does ShipDateSales return in a visual using this slicer?',
    options: [
      'Sales where OrderDate is in January 2026 — the slicer\'s active-relationship filter overrides USERELATIONSHIP',
      'Sales where ShipDate is in January 2026 — USERELATIONSHIP activates the ShipDate relationship and overrides the active OrderDate one for this expression, so the Date slicer now filters via ShipDate',
      'BLANK — USERELATIONSHIP cannot coexist with an active slicer on the Date table',
      'Sales for all dates — USERELATIONSHIP deactivates ALL Date relationships'
    ],
    correct: 1,
    explanation:
      'USERELATIONSHIP inside CALCULATE replaces the active relationship between Sales and Date with the ' +
      'specified inactive one for the scope of that CALCULATE. The slicer on the Date table still ' +
      'provides the filter value (January 2026), but that filter now propagates through the ShipDate ' +
      'path rather than the OrderDate path. Result: transactions where ShipDate falls in January 2026.',
    whyWrong: {
      0: 'USERELATIONSHIP overrides the active relationship. The slicer provides the date filter value, but the path changes to ShipDate.',
      2: 'USERELATIONSHIP is designed to coexist with slicers on the Date table — that is its primary use case.',
      3: 'USERELATIONSHIP activates one specific relationship; it does not deactivate all relationships or remove filters.'
    },
    source: SRC.semanticModel,
    tags: ['role-playing-dimensions', 'userelationship', 'filter-context', 'exam-trap']
  }),

  // ── ssch-028  Multi-select: best practices for Direct Lake star schema ──────
  multi({
    id: 'ssch-028', domain: 'semantic', subtopic: 'star-schema', difficulty: 4,
    prompt:
      'A team is designing a Fabric Lakehouse Gold layer to serve a Direct Lake semantic model. ' +
      'Select ALL practices that improve Direct Lake query performance. Choose four.',
    options: [
      'Write delta parquet files with V-Order enabled (sorted for VertiPaq)',
      'Denormalize snowflake chains into star-schema dimension tables',
      'Keep fact table columns that are never used in the semantic model (they are ignored by Direct Lake anyway)',
      'Use integer surrogate keys for all fact-to-dim relationships',
      'Apply delta table OPTIMIZE to compact small files before the model queries them',
      'Include computed columns (e.g., full name = first + last) in the Lakehouse table rather than calculating them as DAX measures'
    ],
    correct: [0, 1, 3, 4],
    explanation:
      'V-Order is Microsoft\'s explicit recommendation for Direct Lake delta files. Star schema denormalization ' +
      'reduces join hops. Integer surrogate keys compress better and speed up relationship resolution. ' +
      'OPTIMIZE compacts small files that would otherwise force many segment reads per query. ' +
      'Unused columns still occupy parquet column groups and increase segment scan time even if not selected ' +
      'in the model — removing them from the Lakehouse table (or excluding from the model) helps. ' +
      'Computed columns in the Lakehouse are fine but "including them" is not a Direct Lake performance ' +
      'best practice per se — it is neutral or beneficial depending on the calculation cost.',
    whyWrong: {
      2: 'Unused columns ARE read into parquet column groups and add to segment scan overhead in Direct Lake. They should be excluded from the Lakehouse table or hidden in the model.',
      5: 'Adding computed columns to the Lakehouse table is not listed as a Direct Lake performance best practice. The guidance focuses on V-Order, star schema, and file compaction.'
    },
    source: SRC.directLake,
    tags: ['star-schema', 'direct-lake', 'v-order', 'performance', 'best-practice']
  }),

  // ── ssch-029  Bridge table vs native M:M — when to choose ─────────────────
  multi({
    id: 'ssch-029', domain: 'semantic', subtopic: 'bridge-tables', difficulty: 5,
    prompt:
      'A developer is evaluating whether to use a native Power BI M:M relationship or an explicit ' +
      'bridge table for a Student–Course relationship (students enroll in multiple courses; courses ' +
      'have multiple students). Select all scenarios where the EXPLICIT BRIDGE TABLE is the better choice. ' +
      'Choose three.',
    options: [
      'When the bridge itself carries measures (e.g., Grade, AttendanceHours) that must be aggregated per student-course pair',
      'When filters must flow in only one direction (e.g., Course slicer filters students but Student slicer must not filter courses)',
      'When the model has no other tables and the only goal is to count distinct enrolled students per course',
      'When RLS must be applied at the enrollment level (e.g., instructors see only their enrolled students)',
      'When the number of student-course enrollments is very small (< 100 rows)'
    ],
    correct: [0, 1, 3],
    explanation:
      'An explicit bridge table is preferred when: (1) the enrollment itself carries measurable attributes ' +
      '(Grade, Hours) that would be lost in a keyless M:M; (2) filter direction must be controlled — a bridge ' +
      'with single-direction relationships gives precise control that native M:M does not; (3) RLS on the bridge ' +
      'itself restricts which enrollment rows are visible, which native M:M cannot express at the junction level. ' +
      'A simple distinct-count-only scenario (C) works fine with native M:M. Small row count (E) is irrelevant ' +
      'to the bridge vs M:M decision.',
    whyWrong: {
      2: 'For a simple DISTINCTCOUNT of students per course, native M:M handles this correctly and a bridge table adds unnecessary complexity.',
      4: 'Row count is not a deciding factor between bridge table and native M:M. Even 50-row junction tables benefit from explicit bridges when measures or RLS are involved.'
    },
    source: SRC.semanticModel,
    tags: ['bridge-tables', 'many-to-many', 'rls', 'filter-direction', 'best-practice']
  }),

  // ── ssch-030  End-to-end exam trap: combined concepts ─────────────────────
  multi({
    id: 'ssch-030', domain: 'semantic', subtopic: 'star-schema', difficulty: 5,
    prompt:
      'A DP-600 candidate reviews a semantic model and identifies these design choices:\n\n' +
      '1. Bidirectional relationships between every fact and all dimensions\n' +
      '2. A Date dim created by CALENDARAUTO() in each of 6 semantic models\n' +
      '3. A Sales fact joined to a snowflake: Sales → Product → Subcategory → Category\n' +
      '4. A bridge table for Customer–Account M:M with both relationships set to bidirectional\n' +
      '5. SCD Type 2 implemented with surrogate keys on DimEmployee\n\n' +
      'Which items are design problems that should be corrected? Select all that apply.',
    options: [
      'Item 1 — bidirectional everywhere creates ambiguous filter paths and unpredictable measure results',
      'Item 2 — independent CALENDARAUTO() Date dims in 6 models risk non-conformed fiscal definitions',
      'Item 3 — the snowflake adds join overhead with no compression benefit for VertiPaq / Direct Lake',
      'Item 4 — bidirectional on both bridge relationships reintroduces the same ambiguity problems as native M:M',
      'Item 5 — SCD Type 2 with surrogate keys is incorrect; business keys should be used throughout'
    ],
    correct: [0, 1, 2, 3],
    explanation:
      'Items 1–4 are problems: bidirectional-everywhere (1) causes filter ambiguity; non-conformed Date dims ' +
      '(2) diverge on fiscal rules; a snowflake (3) adds join hops VertiPaq must resolve at query time; ' +
      'bidirectional bridge relationships (4) propagate filters through the junction in both directions, ' +
      'recreating the double-count risk the bridge was meant to avoid. ' +
      'Item 5 is CORRECT design — SCD Type 2 with surrogate keys is the Kimball-recommended pattern that ' +
      'Fabric Warehouse and Power BI are designed to work with.',
    whyWrong: {
      4: 'SCD Type 2 with surrogate keys is the RECOMMENDED design. Fact tables store the surrogate key at point-in-time, enabling accurate historical analysis. This item should NOT be corrected.'
    },
    source: SRC.semanticModel,
    tags: ['star-schema', 'exam-trap', 'bidirectional', 'conformed-dimensions', 'snowflake-vs-star', 'scd']
  }),

];
