/**
 * Upload diagnostics: 6-stage tracing for debugging media uploads.
 *
 * Stages:
 * 1. file-selected
 * 2. preview-generated
 * 3. upload-started
 * 4. upload-progress
 * 5. upload-completed
 * 6. server-response
 */

export type UploadStage =
  | 'file-selected'
  | 'preview-generated'
  | 'upload-started'
  | 'upload-progress'
  | 'upload-completed'
  | 'server-response';

export interface UploadDiagnosticEntry {
  stage: UploadStage;
  timestamp: number;
  payload?: unknown;
  error?: string;
}

class UploadDiagnostics {
  private entries: UploadDiagnosticEntry[] = [];
  private listeners = new Set<(entries: UploadDiagnosticEntry[]) => void>();

  private notify() {
    this.listeners.forEach((fn) => fn([...this.entries]));
  }

  record(stage: UploadStage, payload?: unknown, error?: string) {
    this.entries.push({ stage, timestamp: Date.now(), payload, error });
    this.notify();
  }

  clear() {
    this.entries = [];
    this.notify();
  }

  getAll(): UploadDiagnosticEntry[] {
    return [...this.entries];
  }

  subscribe(fn: (entries: UploadDiagnosticEntry[]) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Print a human-readable timeline to the console */
  dump() {
    console.group('Upload Diagnostics');
    for (const e of this.entries) {
      const time = new Date(e.timestamp).toISOString();
      const label = `%c${e.stage}`;
      const style = e.error ? 'color: #ef4444' : 'color: #22c55e';
      console.log(`${time} ${label}`, style, e.payload ?? '', e.error ?? '');
    }
    console.groupEnd();
  }
}

export const uploadDiagnostics = new UploadDiagnostics();
