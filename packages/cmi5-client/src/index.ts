/**
 * cmi5-client
 *
 * CMI5 xAPI client, state manager, and launcher
 * Framework-agnostic package for CMI5 client functionality
 * 
 * Philosophy: Offline-first with optional cloud sync
 * - All data is stored locally by default (data ownership)
 * - Cloud sync is optional and user-controlled
 * - Works seamlessly in Next.js serverless environments
 */

export * from './xapi-client';
export * from './state-manager';
export * from './launcher';
export * from './sync-manager';
export * from './offline-first';
export * from './fsrs-service';
