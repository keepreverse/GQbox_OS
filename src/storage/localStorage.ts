/**
 * Local-storage (browser) backend: uses Blob URLs for preview.
 */

import { StorageBackend } from './storage';

export class LocalStorageBackend implements StorageBackend {
  upload(): Promise<string> {
    throw new Error('LocalStorageBackend does not support upload');
  }

  preview(file: File): string {
    return URL.createObjectURL(file);
  }

  revoke(url: string): void {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }

  download(url: string, filename: string): void {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
