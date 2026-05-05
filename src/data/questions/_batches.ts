import type { Question } from '../../lib/schema';
import { directLake } from './q-direct-lake';
import { directLakeMastery } from './q-direct-lake-mastery';
import { storageModes } from './q-storage-modes';
import { semantic } from './q-semantic';
import { semanticMore } from './q-semantic-more';
import { semanticEngineering } from './q-semantic-engineering';
import { maintain } from './q-maintain';
import { maintainMore } from './q-maintain-more';
import { deploymentDeep } from './q-deployment-deep';
import { prepareArchitecture } from './q-prepare-arch';
import { prepareMore } from './q-prepare-more';
import { prepareLab } from './q-prepare-lab';
import { kqlDeep } from './q-kql-deep';
import { reinforcement } from './q-reinforcement';
import { scenarioQuestions } from './q-scenarios';
import { typeSupplement } from './q-type-supplement';

export const qBatches: Question[][] = [
  directLake,
  directLakeMastery,
  storageModes,
  semantic,
  semanticMore,
  semanticEngineering,
  maintain,
  maintainMore,
  deploymentDeep,
  prepareArchitecture,
  prepareMore,
  prepareLab,
  kqlDeep,
  reinforcement,
  scenarioQuestions,
  typeSupplement
];
