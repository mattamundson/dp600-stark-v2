import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { _resetDbForTests } from '../src/lib/storage/db';

// Reset IndexedDB module-level cache between test files so each test file
// gets a fresh fake-indexeddb backing store.
beforeEach(() => {
  // @ts-expect-error - vite-injected global from fake-indexeddb/auto
  if (typeof indexedDB !== 'undefined' && (indexedDB as IDBFactory & { _databases?: Map<string, unknown> })._databases) {
    (indexedDB as IDBFactory & { _databases: Map<string, unknown> })._databases.clear();
  }
  _resetDbForTests();
});
