/// <reference types="vite/client" />
import type { Flashcard } from '../../lib/schema';

// Auto-discovered flashcard batches — every fc-*.ts file in this directory is
// picked up automatically. Each file must export exactly one Flashcard[]
// (named export). Iteration is alphabetical by filename for deterministic order.
const modules = import.meta.glob<Record<string, unknown>>('./fc-*.ts', { eager: true });

export const fcBatches: Flashcard[][] = Object.keys(modules)
  .sort()
  .map((key) => modules[key])
  .flatMap((mod) => Object.values(mod).filter((v): v is Flashcard[] => Array.isArray(v)))
  .filter((arr) => arr.length > 0);
