// Star Schema Decision Lab — 10 prompts where the user reads a denormalized
// table and picks the right dimensional model split. Output: which columns
// belong on the Fact, which become Dim, which are derived/dropped.

export interface StarSchemaOption {
  id: string;
  label: string;
}

export interface StarSchemaPrompt {
  id: string; // sps-001..sps-010
  business: string;
  scenario: string;
  /** The denormalized source rendered as a column list. */
  sourceColumns: string[];
  options: StarSchemaOption[];
  correctId: string;
  explanation: string;
  whyWrong: Record<string, string>;
  difficulty: 2 | 3 | 4 | 5;
  tags: string[];
}

export const starSchemaPrompts: StarSchemaPrompt[] = [
  {
    id: 'sps-001',
    business: 'Retail sales reporting from a flat point-of-sale extract.',
    scenario: 'You receive a wide POS extract. Pick the correct star-schema split.',
    sourceColumns: [
      'TransactionID', 'TransactionDate', 'StoreID', 'StoreName', 'StoreCity', 'StoreRegion',
      'ProductID', 'ProductName', 'ProductCategory', 'ProductSubcategory',
      'CustomerID', 'CustomerName', 'CustomerCity', 'CustomerJoinDate',
      'Quantity', 'UnitPrice', 'DiscountAmount', 'TotalAmount'
    ],
    options: [
      { id: 'fact-narrow', label: 'Fact: TransactionID, TransactionDate (or DateKey), StoreID, ProductID, CustomerID, Quantity, UnitPrice, DiscountAmount, TotalAmount. Dims: Store, Product, Customer, Date.' },
      { id: 'fact-wide', label: 'Fact contains every column — no dims (single-table model).' },
      { id: 'snowflake', label: 'Snowflake Product into Product → Subcategory → Category dim chain; Store into Store → City → Region chain.' },
      { id: 'date-only-dim', label: 'Fact + a Date dim only; Store/Product/Customer columns stay on the fact.' }
    ],
    correctId: 'fact-narrow',
    explanation: 'Star schema: fact holds keys + measures; descriptive attributes move to per-grain dims (Store, Product, Customer, Date). Wide attributes stay denormalized inside each dim.',
    whyWrong: {
      'fact-wide': 'Single-table model wastes memory (string repetition), kills compression, and makes RLS painful.',
      snowflake: 'Snowflaking adds joins for no benefit in a star — keep Category/Subcategory on the Product dim.',
      'date-only-dim': 'Star without Product/Customer/Store dims defeats the model — analytical pivots become impossible.'
    },
    difficulty: 2,
    tags: ['star-schema', 'dimensional-modeling']
  },
  {
    id: 'sps-002',
    business: 'Slowly Changing Dimension decision.',
    scenario: 'Customer can move cities. The business wants to attribute past sales to the city the customer lived in AT THE TIME of sale (not their current city). What does Customer dim need?',
    sourceColumns: ['CustomerID', 'CustomerName', 'CustomerCity', 'CustomerStateCode', 'JoinDate'],
    options: [
      { id: 'scd2', label: 'SCD Type 2: add EffectiveFrom, EffectiveTo, IsCurrent, surrogate CustomerSK; multiple rows per CustomerID.' },
      { id: 'scd1', label: 'SCD Type 1: overwrite CustomerCity in place when it changes.' },
      { id: 'scd3', label: 'SCD Type 3: add PreviousCity column.' },
      { id: 'no-dim', label: 'Push CustomerCity to the fact at sale time.' }
    ],
    correctId: 'scd2',
    explanation: 'SCD Type 2 preserves history with effective-date ranges; the fact joins to the surrogate that was current at sale-time, attributing sales to the right city.',
    whyWrong: {
      scd1: 'Overwriting loses history — past sales would attribute to the new city.',
      scd3: 'Type 3 only stores ONE prior value, not full history; breaks if customer moves twice.',
      'no-dim': 'Snapshotting on the fact works but loses the dim\'s analytical convenience and breaks future-proofing.'
    },
    difficulty: 3,
    tags: ['star-schema', 'dimensional-modeling']
  },
  {
    id: 'sps-003',
    business: 'Many-to-many between Sales and Sales Reps.',
    scenario: 'A single sale can be split across multiple reps (commission share). What pattern do you build?',
    sourceColumns: ['SaleID', 'SaleDate', 'ProductID', 'CustomerID', 'Amount', 'RepID', 'RepShare'],
    options: [
      { id: 'bridge', label: 'Bridge table SalesRep with SaleID + RepID + RepShare; Sale fact links via SaleID; Rep dim joins via bridge.' },
      { id: 'duplicate', label: 'Duplicate the Sale row, one per Rep, dividing Amount by share.' },
      { id: 'rep-only-fact', label: 'Move Rep onto the fact directly with a single RepID column.' }
    ],
    correctId: 'bridge',
    explanation: 'A bridge table (factless or factual) handles M:M cleanly. The bridge lets you allocate shares without exploding the fact grain.',
    whyWrong: {
      duplicate: 'Inflates aggregates if you forget to apply the share; SUM(Amount) double-counts.',
      'rep-only-fact': 'Cannot represent multiple reps per sale on a single column — drops data.'
    },
    difficulty: 3,
    tags: ['star-schema', 'relationships']
  },
  {
    id: 'sps-004',
    business: 'Date dim grain.',
    scenario: 'Reports need Year, Quarter, Month, ISO Week, Fiscal Year, Day-of-Week, IsWeekend. Where do these go?',
    sourceColumns: ['TransactionDate'],
    options: [
      { id: 'date-dim', label: 'Single Date dim with one row per day, columns for Year/Quarter/Month/ISOWeek/FiscalYear/DOW/IsWeekend; fact joins on DateKey.' },
      { id: 'fact-derived', label: 'Compute Year/Quarter/Month on the fact via DAX YEAR/QUARTER/MONTH functions.' },
      { id: 'date-snowflake', label: 'Date → Month → Quarter → Year snowflake chain.' }
    ],
    correctId: 'date-dim',
    explanation: 'A canonical Date dim is universally recommended. Pre-compute every calendar attribute once; reuse across all facts. Time intelligence DAX functions REQUIRE a dedicated Date dim marked as such.',
    whyWrong: {
      'fact-derived': 'YEAR()/MONTH() on the fact disables time-intelligence DAX (no contiguous date table) and re-computes per query.',
      'date-snowflake': 'Snowflake breaks the star pattern; time-intelligence functions expect a single flat Date dim.'
    },
    difficulty: 2,
    tags: ['star-schema', 'time-intelligence']
  },
  {
    id: 'sps-005',
    business: 'Junk dimension for low-cardinality flags.',
    scenario: 'You have IsPromo (Y/N), PaymentMethod (Cash/Card/Wire), Channel (Web/Store/Phone). All have <5 distinct values. How do you model them?',
    sourceColumns: ['IsPromo', 'PaymentMethod', 'Channel'],
    options: [
      { id: 'junk-dim', label: 'Single Junk dim "DimSaleAttributes" containing every combination; fact gets one SaleAttributesKey.' },
      { id: 'three-dims', label: 'Three separate dims: DimPromo, DimPayment, DimChannel.' },
      { id: 'fact-flat', label: 'Keep all three columns on the fact directly.' }
    ],
    correctId: 'junk-dim',
    explanation: 'Junk dim collapses N low-cardinality columns into one dim with all combinations — keeps the fact narrow without polluting the model with one-column dims.',
    whyWrong: {
      'three-dims': 'Three single-column dims clutter the model and add unnecessary joins.',
      'fact-flat': 'Acceptable but worse for VertiPaq compression (low-cardinality strings repeated per fact row).'
    },
    difficulty: 3,
    tags: ['star-schema', 'dimensional-modeling']
  },
  {
    id: 'sps-006',
    business: 'Role-playing date dimension.',
    scenario: 'Order has OrderDate, ShipDate, DeliveryDate, all of which need separate slicing. How do you model the relationships?',
    sourceColumns: ['OrderID', 'OrderDate', 'ShipDate', 'DeliveryDate', 'Amount'],
    options: [
      { id: 'role-playing', label: 'One Date dim, three relationships (one active = OrderDate, two inactive = ShipDate/DeliveryDate); use USERELATIONSHIP in DAX to switch.' },
      { id: 'three-date-dims', label: 'Three copies of Date dim (DimOrderDate, DimShipDate, DimDeliveryDate) — physical role-playing.' },
      { id: 'flat-on-fact', label: 'Keep all 3 dates as columns on the fact, no dim relationships.' }
    ],
    correctId: 'role-playing',
    explanation: 'One Date dim with multiple relationships is the standard role-playing pattern. USERELATIONSHIP in DAX activates inactive ones. Saves memory; one dim is the source of truth.',
    whyWrong: {
      'three-date-dims': 'Works but wastes memory (3x the rows) and forces users to remember which dim slices which date.',
      'flat-on-fact': 'Disables time-intelligence and forces date logic into every measure.'
    },
    difficulty: 3,
    tags: ['star-schema', 'relationships']
  },
  {
    id: 'sps-007',
    business: 'Degenerate dimension.',
    scenario: 'TransactionID is unique per sale row, has no descriptive attributes, but is needed for drill-down to the source POS receipt. Where does it live?',
    sourceColumns: ['TransactionID', 'StoreID', 'ProductID', 'Amount'],
    options: [
      { id: 'fact-keep', label: 'Keep TransactionID on the fact as a degenerate dimension (no separate dim table).' },
      { id: 'transaction-dim', label: 'Build a DimTransaction with one row per TransactionID.' },
      { id: 'drop', label: 'Drop TransactionID — facts shouldn\'t carry source IDs.' }
    ],
    correctId: 'fact-keep',
    explanation: 'A degenerate dim (DD) is a key-with-no-attributes that lives on the fact for drill-back purposes. Building a dim for it would be 1:1 with the fact and waste memory.',
    whyWrong: {
      'transaction-dim': '1:1 dim adds no value; just bloats the model.',
      drop: 'You\'d lose drill-back to the source system — needed for audits and reconciliations.'
    },
    difficulty: 3,
    tags: ['star-schema', 'dimensional-modeling']
  },
  {
    id: 'sps-008',
    business: 'Mini-dim split for high-frequency change.',
    scenario: 'Customer dim has 1M rows; Income and Segment columns change OFTEN (causing SCD2 explosion). Other Customer attributes are stable. How do you fix it?',
    sourceColumns: ['CustomerID', 'CustomerName', 'JoinDate', 'Income', 'Segment'],
    options: [
      { id: 'mini-dim', label: 'Split a mini-dim DimCustomerDemographics with (Income, Segment); fact links to both DimCustomer and DimCustomerDemographics.' },
      { id: 'overwrite', label: 'Switch to SCD Type 1 — overwrite Income/Segment in place.' },
      { id: 'snapshot-fact', label: 'Snapshot Income/Segment onto the fact at sale time.' }
    ],
    correctId: 'mini-dim',
    explanation: 'Mini-dim isolates the volatile attributes into their own banded dim (e.g., Income bands). Fact gets a key to both dims. Prevents Customer SCD2 explosion while preserving history.',
    whyWrong: {
      overwrite: 'Loses history; can\'t attribute past sales to the customer\'s past Income.',
      'snapshot-fact': 'Works but loses dim convenience and breaks "income at any historical date" queries.'
    },
    difficulty: 4,
    tags: ['star-schema', 'dimensional-modeling']
  },
  {
    id: 'sps-009',
    business: 'Conformed dim across two facts.',
    scenario: 'You have Sales fact and Returns fact. Both reference Product, Customer, Date. The business wants "Net Sales = Sales − Returns" sliced by Product. What dim pattern?',
    sourceColumns: ['(Sales fact)', '(Returns fact)'],
    options: [
      { id: 'conformed', label: 'Conformed dims (single shared DimProduct, DimCustomer, DimDate) used by both fact tables; measures sum on each side, subtract for net.' },
      { id: 'separate-dims', label: 'Separate DimProduct_Sales and DimProduct_Returns — strict per-fact ownership.' },
      { id: 'union-fact', label: 'UNION the two facts into one; add a TransactionType column.' }
    ],
    correctId: 'conformed',
    explanation: 'Conformed dims are THE Kimball pattern for cross-fact analysis. One Product dim joins to both facts; "Net" is just Sales − Returns measure.',
    whyWrong: {
      'separate-dims': 'Defeats cross-fact analysis; product slicer would have to drive both separately and reconcile them by hand.',
      'union-fact': 'Works but obscures fact-specific measures and can break partial refresh strategies.'
    },
    difficulty: 3,
    tags: ['star-schema', 'dimensional-modeling']
  },
  {
    id: 'sps-010',
    business: 'Factless fact for coverage.',
    scenario: 'Marketing wants to know: for each Promotion + Date, which Products were ELIGIBLE (regardless of whether they sold)? What table do you build?',
    sourceColumns: ['PromotionID', 'Date', 'ProductID'],
    options: [
      { id: 'factless', label: 'Factless fact PromotionEligibility with (PromotionID, DateKey, ProductID) and no measures.' },
      { id: 'sales-fact', label: 'Use the existing Sales fact and filter to promo periods.' },
      { id: 'dim-product', label: 'Add IsEligible flag to DimProduct.' }
    ],
    correctId: 'factless',
    explanation: 'A factless fact stores coverage / eligibility / event-occurrence with no numeric measure. Joins to dims like a regular fact; counts rows for "how many products were eligible".',
    whyWrong: {
      'sales-fact': 'Sales fact only captures actual sales — eligible-but-not-sold products are invisible.',
      'dim-product': 'A flag on the dim doesn\'t time-vary; can\'t answer "which products were eligible last month".'
    },
    difficulty: 4,
    tags: ['star-schema', 'dimensional-modeling']
  }
];
