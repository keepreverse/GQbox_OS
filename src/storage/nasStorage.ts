/**
 * NAS / backend-storage: uploads to the API, returns canonical URL.
 */

import { StorageBackend } from './storage';

export class NasStorageBackend implements StorageBackend {
  constructor(
    private apiUrl: string,
    private getToken?: () => string | null
  ) {}

  async upload(file: File, onProgress?: (pct: number) => void): Promise<string> {
    const fd = new FormData();
    fd.append('file', file);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${this.apiUrl}/media/upload`);

      const token = this.getToken?.();
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            onProgress(Math.round((e.loaded / e.total) * 100));
          }
        });
      }

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const json = JSON.parse(xhr.responseText);
            resolve(json.url ?? json.file?.url ?? '');
          } catch {
            resolve(xhr.responseText);
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Upload failed')));
      xhr.send(fd);
    });
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
