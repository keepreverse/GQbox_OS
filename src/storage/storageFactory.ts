/**
 * Factory to pick the right storage backend based on environment.
 */

import { StorageBackend } from './storage';
import { LocalStorageBackend } from './localStorage';
import { NasStorageBackend } from './nasStorage';

export function createStorageBackend(mode: 'demo' | 'dev'): StorageBackend {
  if (mode === 'demo') {
    return new LocalStorageBackend();
  }
  return new NasStorageBackend(
    import.meta.env.VITE_API_URL || '/api',
    () => localStorage.getItem('token')
  );
}
