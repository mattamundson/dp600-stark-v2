/// <reference types="vite/client" />
import type { Question } from '../../lib/schema';

// Auto-discovered question batches — every q-*.ts file in this directory is
// picked up automatically. Each file must export exactly one Question[]
// (named export). Adding a new batch is a single-file operation; no wiring
// edit here. Iteration is alphabetical by filename for deterministic order.
const modules = import.meta.glob<Record<string, unknown>>('./q-*.ts', { eager: true });

export const qBatches: Question[][] = Object.keys(modules)
  .sort()
  .map((key) => modules[key])
  .flatMap((mod) => Object.values(mod).filter((v): v is Question[] => Array.isArray(v)))
  .filter((arr) => arr.length > 0);
