/**
 * Storage backend abstraction for product media.
 *
 * Handles upload (to backend) and local caching for offline preview.
 */

export interface StorageBackend {
  /** Upload a file and return its URL */
  upload(file: File, onProgress?: (pct: number) => void): Promise<string>;
  /** Generate a local preview URL (e.g., blob URL) */
  preview(file: File): string;
  /** Revoke a previously created preview URL */
  revoke(url: string): void;
  /** Download a file by URL */
  download(url: string, filename: string): void;
}

/** Simple in-memory cache for recently-uploaded files */
export class StorageCache {
  private map = new Map<string, string>();

  set(key: string, url: string): void {
    this.map.set(key, url);
  }

  get(key: string): string | undefined {
    return this.map.get(key);
  }

  clear(): void {
    this.map.clear();
  }
}

export const storageCache = new StorageCache();
