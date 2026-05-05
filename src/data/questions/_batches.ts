import type { Question } from '../../lib/schema';
import { directLake } from './q-direct-lake';
import { directLakeMastery } from './q-direct-lake-mastery';
import { directLakeModern } from './q-direct-lake-modern';
import { directLakeSecurity } from './q-direct-lake-security';
import { storageModes } from './q-storage-modes';
import { semantic } from './q-semantic';
import { semanticMore } from './q-semantic-more';
import { semanticEngineering } from './q-semantic-engineering';
import { maintain } from './q-maintain';
import { maintainMore } from './q-maintain-more';
import { maintainOperations } from './q-maintain-operations';
import { governanceSecurity } from './q-governance-security';
import { deploymentDeep } from './q-deployment-deep';
import { prepareArchitecture } from './q-prepare-arch';
import { prepareMore } from './q-prepare-more';
import { prepareLab } from './q-prepare-lab';
import { qPrepareBlueprintFill } from './q-prepare-blueprint-fill';
import { kqlDeep } from './q-kql-deep';
import { reinforcement } from './q-reinforcement';
import { scenarioQuestions } from './q-scenarios';
import { typeSupplement } from './q-type-supplement';

export const qBatches: Question[][] = [
  directLake,
  directLakeMastery,
  directLakeModern,
  directLakeSecurity,
  storageModes,
  semantic,
  semanticMore,
  semanticEngineering,
  maintain,
  maintainMore,
  maintainOperations,
  governanceSecurity,
  deploymentDeep,
  prepareArchitecture,
  prepareMore,
  prepareLab,
  qPrepareBlueprintFill,
  kqlDeep,
  reinforcement,
  scenarioQuestions,
  typeSupplement
];
