/**
 * Suppress SQLite WASM verbose logs and warnings
 *
 * IMPORTANT: This module must be imported BEFORE @libsql/client-wasm
 * to intercept the logs that fire during WASM initialization.
 *
 * The @libsql/client-wasm library outputs:
 * - Verbose SQL TRACE logs from the WASM binary
 * - OPFS installation warnings when COOP/COEP headers aren't set
 * - topLevelAwait warnings from Next.js HMR
 *
 * These are filtered out to keep the console clean since:
 * - SQL traces are too verbose for normal development
 * - OPFS warning is expected (we use in-memory storage, not OPFS persistence)
 * - topLevelAwait warning is expected (WASM modules use it intentionally)
 */

if (typeof console !== 'undefined') {
  const originalLog = console.log;
  const originalWarn = console.warn;

  console.log = (...args: unknown[]) => {
    const firstArg = args[0];
    if (typeof firstArg === 'string') {
      // Filter out SQL TRACE messages from sqlite3 WASM
      if (firstArg.includes('SQL TRACE')) {
        return;
      }
    }
    originalLog.apply(console, args);
  };

  console.warn = (...args: unknown[]) => {
    const firstArg = args[0];
    if (typeof firstArg === 'string') {
      // Filter out OPFS installation warning (expected when COOP/COEP headers not set)
      if (firstArg.includes('OPFS sqlite3_vfs') || firstArg.includes('inability to install OPFS')) {
        return;
      }
      // Filter out topLevelAwait warning from Next.js HMR (expected for WASM modules)
      if (firstArg.includes('topLevelAwait') || firstArg.includes('top level await')) {
        return;
      }
    }
    originalWarn.apply(console, args);
  };
}

export {};
