/**
 * Offline-First Utilities
 *
 * Helper functions for offline-first CMI5 operations.
 * Emphasizes data ownership and local-first storage.
 */

import type { LRSStore } from 'cmi5-lrs';

/**
 * Create a default offline-first configuration
 * 
 * This is the recommended setup for Next.js serverless environments
 * where data ownership is prioritized.
 */
export interface OfflineFirstConfig {
  /** Local LRS instance */
  localLRS: LRSStore;
  /** Whether to use local LRS (default: true - offline-first) */
  useLocalLRS?: boolean;
}

/**
 * Create default offline-first options for CMI5StateManager
 * 
 * Usage:
 * ```typescript
 * const config = createOfflineFirstConfig(lrs);
 * const stateManager = new CMI5StateManager(launchParams, {
 *   ...config,
 *   activityId: 'au-001',
 * });
 * ```
 */
export function createOfflineFirstConfig(
  localLRS: LRSStore
): Pick<OfflineFirstConfig, 'localLRS' | 'useLocalLRS'> {
  return {
    localLRS,
    useLocalLRS: true, // Offline-first by default
  };
}

/**
 * Check if running in a browser environment
 * Useful for Next.js serverless where client-side code needs to check environment
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Check if running in a serverless environment
 * Useful for Next.js where code runs on both server and client
 */
export function isServerless(): boolean {
  return typeof process !== 'undefined' && process.env.VERCEL !== undefined;
}

/**
 * Initialize local LRS for offline-first operation
 * 
 * This is the recommended way to set up CMI5 in Next.js serverless:
 * - Client-side: Uses browser LRS with OPFS persistence
 * - Server-side: Returns null (client-side only)
 * 
 * Usage:
 * ```typescript
 * const lrs = await initializeOfflineFirstLRS();
 * if (lrs) {
 *   // Client-side: Use local LRS
 *   const stateManager = new CMI5StateManager(launchParams, {
 *     ...createOfflineFirstConfig(lrs),
 *     activityId: 'au-001',
 *   });
 * }
 * ```
 */
export async function initializeOfflineFirstLRS(): Promise<LRSStore | null> {
  if (!isBrowser()) {
    // Server-side: Return null (client-side only)
    return null;
  }

  // Client-side: Initialize local LRS
  const { LRSStore } = await import('cmi5-lrs');
  const lrs = new LRSStore({
    dbName: 'cmi5-lrs.db',
    inMemory: false, // Use OPFS for persistence
  });
  
  await lrs.init();
  return lrs;
}
