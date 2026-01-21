/**
 * Cloud Sync Manager
 *
 * Optional cloud sync for CMI5 data.
 * Designed to work alongside offline-first local LRS.
 * 
 * Philosophy: Data ownership first - all data is stored locally.
 * Cloud sync is optional and can be enabled/disabled by the user.
 */

import type { Statement } from '@xapi/xapi';
import type { CMI5State } from 'cmi5-core';
import type { LRSStore } from 'cmi5-lrs';

/**
 * Cloud Sync Options
 */
export interface CloudSyncOptions {
  /** Remote xAPI endpoint URL */
  endpoint: string;
  /** Authorization token */
  auth: string;
  /** Whether sync is enabled (default: false - offline-first) */
  enabled?: boolean;
  /** Sync interval in milliseconds (default: 30000 = 30 seconds) */
  syncInterval?: number;
  /** Whether to sync on every statement (default: false - batch sync) */
  syncImmediately?: boolean;
}

/**
 * Sync Status
 */
export interface SyncStatus {
  /** Whether sync is currently running */
  syncing: boolean;
  /** Last successful sync timestamp */
  lastSyncedAt?: string;
  /** Last sync error */
  lastError?: Error;
  /** Number of pending statements to sync */
  pendingCount: number;
  /** Whether sync is enabled */
  enabled: boolean;
}

/**
 * Cloud Sync Manager
 * 
 * Manages optional cloud sync of local LRS data to remote endpoint.
 * Works alongside local LRS - all data is stored locally first.
 * 
 * Usage:
 * ```typescript
 * const syncManager = new CloudSyncManager(localLRS, {
 *   endpoint: 'https://example.com/lrs',
 *   auth: 'Bearer token',
 *   enabled: true, // User opts in to cloud sync
 * });
 * 
 * await syncManager.start();
 * // Data syncs in background
 * await syncManager.stop();
 * ```
 */
export class CloudSyncManager {
  private localLRS: LRSStore;
  private options: Required<Omit<CloudSyncOptions, 'endpoint' | 'auth'>> & Pick<CloudSyncOptions, 'endpoint' | 'auth'>;
  private syncIntervalId: ReturnType<typeof setInterval> | null = null;
  private status: SyncStatus = {
    syncing: false,
    pendingCount: 0,
    enabled: false,
  };
  private abortController: AbortController | null = null;

  constructor(localLRS: LRSStore, options: CloudSyncOptions) {
    this.localLRS = localLRS;
    this.options = {
      enabled: options.enabled ?? false, // Default: offline-only
      syncInterval: options.syncInterval ?? 30000, // 30 seconds
      syncImmediately: options.syncImmediately ?? false,
      endpoint: options.endpoint,
      auth: options.auth,
    };
    this.status.enabled = this.options.enabled;
  }

  /**
   * Start cloud sync (if enabled)
   */
  async start(): Promise<void> {
    if (!this.options.enabled) {
      return; // Offline-only mode
    }

    // Initial sync
    await this.sync();

    // Set up periodic sync
    if (this.options.syncInterval > 0) {
      this.syncIntervalId = setInterval(() => {
        this.sync().catch((error) => {
          console.error('Periodic sync failed:', error);
          this.status.lastError = error instanceof Error ? error : new Error(String(error));
        });
      }, this.options.syncInterval);
    }
  }

  /**
   * Stop cloud sync
   */
  stop(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.status.syncing = false;
  }

  /**
   * Enable cloud sync
   */
  enable(): void {
    this.options.enabled = true;
    this.status.enabled = true;
    this.start().catch((error) => {
      console.error('Failed to start sync:', error);
    });
  }

  /**
   * Disable cloud sync (offline-only mode)
   */
  disable(): void {
    this.stop();
    this.options.enabled = false;
    this.status.enabled = false;
  }

  /**
   * Sync pending statements to cloud
   */
  async sync(): Promise<void> {
    if (!this.options.enabled || this.status.syncing) {
      return;
    }

    this.status.syncing = true;
    this.abortController = new AbortController();

    try {
      // Get pending statements from local LRS
      // Note: This assumes LRS has a way to mark statements as synced
      // For now, we'll sync all statements (in a real implementation,
      // you'd track which statements have been synced)
      const statements = await this.getPendingStatements();

      if (statements.length === 0) {
        this.status.pendingCount = 0;
        this.status.syncing = false;
        return;
      }

      this.status.pendingCount = statements.length;

      // Send to remote endpoint
      await this.sendToCloud(statements);

      // Mark as synced (if LRS supports it)
      await this.markAsSynced(statements);

      this.status.lastSyncedAt = new Date().toISOString();
      this.status.pendingCount = 0;
      this.status.lastError = undefined;
    } catch (error) {
      this.status.lastError = error instanceof Error ? error : new Error(String(error));
      throw error;
    } finally {
      this.status.syncing = false;
      this.abortController = null;
    }
  }

  /**
   * Get sync status
   */
  getStatus(): SyncStatus {
    return { ...this.status };
  }

  /**
   * Manually trigger sync
   */
  async syncNow(): Promise<void> {
    await this.sync();
  }

  /**
   * Get pending statements from local LRS
   * In a real implementation, this would query for unsynced statements
   */
  private async getPendingStatements(): Promise<Statement[]> {
    // TODO: Implement query for unsynced statements
    // For now, return empty array
    // In real implementation, you'd query LRS for statements where synced = false
    return [];
  }

  /**
   * Send statements to cloud endpoint
   */
  private async sendToCloud(statements: Statement[]): Promise<void> {
    const response = await fetch(`${this.options.endpoint}/statements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.options.auth,
        'X-Experience-API-Version': '1.0.3',
      },
      body: JSON.stringify(statements),
      signal: this.abortController?.signal,
    });

    if (!response.ok) {
      throw new Error(`Cloud sync failed: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Mark statements as synced
   */
  private async markAsSynced(statements: Statement[]): Promise<void> {
    // TODO: Implement marking statements as synced in LRS
    // This would update a `synced` flag or move statements to a synced table
  }
}
