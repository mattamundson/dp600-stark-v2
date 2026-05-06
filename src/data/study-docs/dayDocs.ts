// Per-day Microsoft Learn links, keyed by reference section slug.
// Content.ts sections are rendered inline in DayStudyView; this file
// provides the external "go deeper" links for each section.

export interface StudyDocLink {
  label: string;
  url: string;
}

export interface DayDocSection {
  sectionSlug: string;
  links: StudyDocLink[];
}

export interface DayDoc {
  day: number;
  sections: DayDocSection[];
}

export const DAY_DOCS: DayDoc[] = [
  {
    day: 1,
    sections: [
      {
        sectionSlug: 'fabric-architecture',
        links: [
          { label: 'OneLake overview', url: 'https://learn.microsoft.com/en-us/fabric/onelake/onelake-overview' },
          { label: 'Lakehouse overview', url: 'https://learn.microsoft.com/en-us/fabric/data-engineering/lakehouse-overview' },
          { label: 'Data warehousing in Microsoft Fabric', url: 'https://learn.microsoft.com/en-us/fabric/data-warehouse/data-warehousing' },
        ],
      },
      {
        sectionSlug: 'storage-modes',
        links: [
          { label: 'Lakehouse SQL analytics endpoint', url: 'https://learn.microsoft.com/en-us/fabric/data-engineering/lakehouse-sql-analytics-endpoint' },
          { label: 'Get started with Lakehouse', url: 'https://learn.microsoft.com/en-us/fabric/data-engineering/get-started-lakehouse' },
        ],
      },
    ],
  },
  {
    day: 2,
    sections: [
      {
        sectionSlug: 'direct-lake-mechanics',
        links: [
          { label: 'Direct Lake overview', url: 'https://learn.microsoft.com/en-us/fabric/get-started/direct-lake-overview' },
          { label: 'Direct Lake — develop semantic models', url: 'https://learn.microsoft.com/en-us/fabric/get-started/direct-lake-develop' },
          { label: 'Delta / V-Order optimization', url: 'https://learn.microsoft.com/en-us/fabric/data-engineering/delta-optimization-and-v-order' },
        ],
      },
      {
        sectionSlug: 'direct-lake-onelake',
        links: [
          { label: 'OneLake shortcuts', url: 'https://learn.microsoft.com/en-us/fabric/onelake/onelake-shortcuts' },
        ],
      },
      {
        sectionSlug: 'direct-lake-on-onelake-vs-sql',
        links: [
          { label: 'Direct Lake vs Import vs DirectQuery', url: 'https://learn.microsoft.com/en-us/fabric/get-started/direct-lake-overview' },
        ],
      },
    ],
  },
  {
    day: 3,
    sections: [
      {
        sectionSlug: 'fabric-architecture',
        links: [
          { label: 'Dataflow Gen2 overview', url: 'https://learn.microsoft.com/en-us/fabric/data-factory/dataflows-gen2-overview' },
          { label: 'How to use a notebook', url: 'https://learn.microsoft.com/en-us/fabric/data-engineering/how-to-use-notebook' },
          { label: 'T-SQL surface area in Warehouse', url: 'https://learn.microsoft.com/en-us/fabric/data-warehouse/tsql-surface-area' },
        ],
      },
    ],
  },
  {
    day: 4,
    sections: [
      {
        sectionSlug: 'kql-cheatsheet',
        links: [
          { label: 'KQL quick reference', url: 'https://learn.microsoft.com/en-us/azure/data-explorer/kusto/query/kql-quick-reference' },
          { label: 'KQL tutorial', url: 'https://learn.microsoft.com/en-us/azure/data-explorer/kusto/query/tutorial' },
          { label: 'Eventhouse overview', url: 'https://learn.microsoft.com/en-us/fabric/real-time-intelligence/eventhouse' },
          { label: 'Real-Time Intelligence in Fabric', url: 'https://learn.microsoft.com/en-us/fabric/real-time-intelligence/overview' },
        ],
      },
      {
        sectionSlug: 'kql-join-kinds',
        links: [
          { label: 'join operator reference', url: 'https://learn.microsoft.com/en-us/azure/data-explorer/kusto/query/join-operator' },
        ],
      },
      {
        sectionSlug: 'kql-mv-expand-parse-materialize',
        links: [
          { label: 'mv-expand operator', url: 'https://learn.microsoft.com/en-us/azure/data-explorer/kusto/query/mv-expand-operator' },
          { label: 'materialize() function', url: 'https://learn.microsoft.com/en-us/azure/data-explorer/kusto/query/materialize-function' },
          { label: 'parse operator', url: 'https://learn.microsoft.com/en-us/azure/data-explorer/kusto/query/parse-operator' },
        ],
      },
    ],
  },
  {
    day: 5,
    sections: [
      {
        sectionSlug: 'onelake-shortcuts',
        links: [
          { label: 'OneLake shortcuts', url: 'https://learn.microsoft.com/en-us/fabric/onelake/onelake-shortcuts' },
          { label: 'Mirrored database overview', url: 'https://learn.microsoft.com/en-us/fabric/database/mirrored-database/overview' },
          { label: 'Mirror Azure SQL Database', url: 'https://learn.microsoft.com/en-us/fabric/database/mirrored-database/azure-sql-database' },
        ],
      },
      {
        sectionSlug: 'storage-modes',
        links: [
          { label: 'Data ingestion options in Fabric', url: 'https://learn.microsoft.com/en-us/fabric/data-factory/data-factory-overview' },
        ],
      },
    ],
  },
  {
    day: 6,
    sections: [
      {
        sectionSlug: 'fabric-architecture',
        links: [
          { label: 'Data Factory in Fabric overview', url: 'https://learn.microsoft.com/en-us/fabric/data-factory/data-factory-overview' },
          { label: 'Pipeline overview', url: 'https://learn.microsoft.com/en-us/fabric/data-factory/pipeline-overview' },
          { label: 'Pipeline activity reference', url: 'https://learn.microsoft.com/en-us/fabric/data-factory/activity-overview' },
        ],
      },
    ],
  },
  {
    day: 7,
    sections: [
      {
        sectionSlug: 'workspace-roles',
        links: [
          { label: 'Fabric permission model', url: 'https://learn.microsoft.com/en-us/fabric/security/permission-model' },
          { label: 'Workspace roles', url: 'https://learn.microsoft.com/en-us/fabric/get-started/roles-workspaces' },
        ],
      },
      {
        sectionSlug: 'security-decision-matrix',
        links: [
          { label: 'Row-level security (Power BI)', url: 'https://learn.microsoft.com/en-us/power-bi/enterprise/service-admin-rls' },
          { label: 'Object-level security', url: 'https://learn.microsoft.com/en-us/power-bi/enterprise/service-admin-ols' },
        ],
      },
      {
        sectionSlug: 'rls-multi-role-trap',
        links: [
          { label: 'RLS — configure and manage', url: 'https://learn.microsoft.com/en-us/power-bi/enterprise/service-admin-rls' },
        ],
      },
    ],
  },
  {
    day: 8,
    sections: [
      {
        sectionSlug: 'deployment-pipelines',
        links: [
          { label: 'Intro to deployment pipelines', url: 'https://learn.microsoft.com/en-us/fabric/cicd/deployment-pipelines/intro-to-deployment-pipelines' },
          { label: 'Deployment pipelines process', url: 'https://learn.microsoft.com/en-us/fabric/cicd/deployment-pipelines/deployment-pipelines-process' },
          { label: 'Deployment rules', url: 'https://learn.microsoft.com/en-us/fabric/cicd/deployment-pipelines/create-rules' },
        ],
      },
    ],
  },
  {
    day: 9,
    sections: [
      {
        sectionSlug: 'capacity-throttling-ladder',
        links: [
          { label: 'Microsoft Purview information protection in Fabric', url: 'https://learn.microsoft.com/en-us/fabric/governance/information-protection' },
          { label: 'Sensitivity labels in Power BI', url: 'https://learn.microsoft.com/en-us/power-bi/enterprise/service-security-sensitivity-label-overview' },
          { label: 'XMLA endpoint overview', url: 'https://learn.microsoft.com/en-us/power-bi/enterprise/service-premium-connect-tools' },
          { label: 'Fabric capacity and licenses', url: 'https://learn.microsoft.com/en-us/fabric/enterprise/licenses' },
        ],
      },
    ],
  },
  {
    day: 10,
    sections: [
      {
        sectionSlug: 'dax-traps',
        links: [
          { label: 'DAX function reference', url: 'https://learn.microsoft.com/en-us/dax/' },
          { label: 'Model relationships in Power BI', url: 'https://learn.microsoft.com/en-us/power-bi/transform-model/desktop-relationships-understand' },
          { label: 'Calculation groups', url: 'https://learn.microsoft.com/en-us/power-bi/transform-model/calculation-groups' },
        ],
      },
      {
        sectionSlug: 'dax-filter-modifier-cheat-sheet',
        links: [
          { label: 'CALCULATE function', url: 'https://learn.microsoft.com/en-us/dax/calculate-function-dax' },
          { label: 'Understand filter context in DAX', url: 'https://learn.microsoft.com/en-us/power-bi/guidance/dax-understand-eval-context' },
        ],
      },
      {
        sectionSlug: 'dax-iterators-mental-model',
        links: [
          { label: 'DAX iterators (SUMX, AVERAGEX, etc.)', url: 'https://learn.microsoft.com/en-us/dax/understanding-functions-in-dax' },
        ],
      },
      {
        sectionSlug: 'dax-trap-snippets',
        links: [],
      },
    ],
  },
  {
    day: 11,
    sections: [
      {
        sectionSlug: 'direct-lake-security-traps',
        links: [
          { label: 'Fabric security overview', url: 'https://learn.microsoft.com/en-us/fabric/security/security-overview' },
          { label: 'Direct Lake fixed identity', url: 'https://learn.microsoft.com/en-us/fabric/get-started/direct-lake-fixed-identity' },
        ],
      },
      {
        sectionSlug: 'security-decision-matrix',
        links: [
          { label: 'Governance and compliance in Fabric', url: 'https://learn.microsoft.com/en-us/fabric/governance/governance-compliance-overview' },
        ],
      },
    ],
  },
  {
    day: 12,
    sections: [],
  },
  {
    day: 13,
    sections: [
      {
        sectionSlug: 'dax-filter-modifier-cheat-sheet',
        links: [
          { label: 'Calculation groups (advanced)', url: 'https://learn.microsoft.com/en-us/power-bi/transform-model/calculation-groups' },
        ],
      },
      {
        sectionSlug: 'maintain-operations-checklist',
        links: [
          { label: 'Fabric CICD overview', url: 'https://learn.microsoft.com/en-us/fabric/cicd/cicd-overview' },
        ],
      },
    ],
  },
  {
    day: 14,
    sections: [
      {
        sectionSlug: 'last-hour-checklist',
        links: [
          { label: 'DP-600 certification page', url: 'https://learn.microsoft.com/en-us/credentials/certifications/fabric-analytics-engineer-associate/' },
        ],
      },
      {
        sectionSlug: 'top-15-traps',
        links: [],
      },
      {
        sectionSlug: 'refresh-memory-rule',
        links: [],
      },
    ],
  },
];
