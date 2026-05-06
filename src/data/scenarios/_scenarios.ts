/// <reference types="vite/client" />
import type { Scenario } from '../../lib/schema';

// Auto-discovered scenario batches — every scn-*.ts file in this directory is
// picked up automatically. Each file must export exactly one Scenario[]
// (named export). Iteration is alphabetical by filename for deterministic order.
const modules = import.meta.glob<Record<string, unknown>>('./scn-*.ts', { eager: true });

export const scenarioList: Scenario[] = Object.keys(modules)
  .sort()
  .map((key) => modules[key])
  .flatMap((mod) => Object.values(mod).filter((v): v is Scenario[] => Array.isArray(v)))
  .flat();
