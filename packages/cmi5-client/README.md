# @lalia/cmi5-client

**CMI5 xAPI Client, State Manager, and Launcher** - Framework-agnostic client package for CMI5 integration.

## Philosophy: Offline-First with Optional Cloud Sync

This package prioritizes **data ownership** and **offline-first** operation:

- **Offline-first by default**: All data is stored locally in the browser (using `@lalia/lrs`)
- **Data ownership**: User owns their learning data - stored locally, can be exported
- **Optional cloud sync**: Cloud sync is opt-in and user-controlled (via `CloudSyncManager`)
- **Next.js serverless compatible**: Works seamlessly in serverless environments
- **LMS integration**: Can also connect to remote xAPI endpoints when needed

## Overview

This package provides the client-side functionality for CMI5 integration:

- **xAPI Client**: Wrapper around `@xapi/xapi` for communicating with LRS (local or remote)
- **State Manager**: Manages CMI5 learner state and persistence (offline-first)
- **Launcher**: Parses and validates CMI5 launch parameters
- **Sync Manager**: Optional cloud sync for backing up local data (opt-in)

## Installation

```bash
pnpm add @lalia/cmi5-client
```

## Usage

### State Manager

```typescript
import { CMI5StateManager } from '@lalia/cmi5-client';
import type { CMI5LaunchParameters } from '@lalia/cmi5-core';
import { LRSStore } from '@lalia/lrs';

const launchParams: CMI5LaunchParameters = {
  endpoint: 'https://example.com/lrs',
  auth: 'Bearer token',
  actor: JSON.stringify({ mbox: 'mailto:user@example.com' }),
  registration: 'reg-123',
  activityId: 'au-001',
};

const lrs = new LRSStore();

const stateManager = new CMI5StateManager(launchParams, {
  activityId: 'au-001',
  useLocalLRS: true,
  localLRS: lrs,
});

await stateManager.initialize();

// Update objective mastery
stateManager.updateObjectiveState('obj-001', 'node-001', 0.9, true);
await stateManager.saveState();

// Get state
const state = stateManager.getState();
```

### Launch Parameters

```typescript
import {
  parseCMI5LaunchParameters,
  parseCMI5LaunchParametersFromURL,
  buildCMI5LaunchURL,
  validateCMI5LaunchParameters,
} from '@lalia/cmi5-client';

// Parse from query string
const params = parseCMI5LaunchParameters('?endpoint=...&auth=...&actor=...');

// Parse from URL
const params2 = parseCMI5LaunchParametersFromURL('https://example.com/launch?endpoint=...');

// Build launch URL
const launchUrl = buildCMI5LaunchURL('https://example.com/content', params);

// Validate
const validation = validateCMI5LaunchParameters(params);
```

### xAPI Client

```typescript
import { XAPIClient } from '@lalia/cmi5-client';
import type { Statement } from '@xapi/xapi';

const client = new XAPIClient(launchParams, {
  useLocalLRS: true,
  localLRS: lrs,
});

// Send statement
await client.sendStatement(statement);

// Send multiple statements
await client.sendStatements([statement1, statement2]);

// Get/save state
const state = await client.getState(activityId, stateId, agent);
await client.saveState(activityId, stateId, agent, state);
```

## Key Features

- **Offline-first**: Defaults to local browser-based LRS (`@lalia/lrs`) for data ownership
- **Optional cloud sync**: `CloudSyncManager` for opt-in cloud backup (user-controlled)
- **State Persistence**: Automatic state persistence and retrieval via xAPI state API (local or remote)
- **Next.js compatible**: Works in serverless environments (client-side only)
- **Framework-agnostic**: No React or other framework dependencies
- **Type-safe**: Full TypeScript support

## Offline-First Usage (Recommended)

```typescript
import { CMI5StateManager, XAPIClient } from '@lalia/cmi5-client';
import { LRSStore } from '@lalia/lrs';

// Create local LRS (offline-first, data ownership)
const lrs = new LRSStore();
await lrs.init();

// Use local LRS by default (useLocalLRS defaults to true)
const stateManager = new CMI5StateManager(launchParams, {
  activityId: 'au-001',
  useLocalLRS: true, // Default - offline-first
  localLRS: lrs,
});

await stateManager.initialize();
// All data stored locally - user owns their data
```

## Optional Cloud Sync

```typescript
import { CloudSyncManager } from '@lalia/cmi5-client';

// Optional: Enable cloud sync (user opts in)
const syncManager = new CloudSyncManager(lrs, {
  endpoint: 'https://example.com/lrs',
  auth: 'Bearer token',
  enabled: false, // Default: offline-only
  syncInterval: 30000, // Sync every 30 seconds if enabled
});

// User can enable/disable sync
syncManager.enable(); // Opt-in to cloud sync
// or
syncManager.disable(); // Back to offline-only

// Manual sync
await syncManager.syncNow();

// Check sync status
const status = syncManager.getStatus();
console.log(status.enabled, status.pendingCount, status.lastSyncedAt);
```

## Next.js Serverless Considerations

This package is designed to work seamlessly in Next.js serverless environments:

1. **Client-side only**: LRS operations run client-side (browser)
2. **Server-side safe**: Returns null/empty when running on server
3. **Offline-first**: No network calls required for basic operations
4. **Data ownership**: All data stored locally in browser (OPFS)

Example Next.js usage:

```typescript
'use client'; // Client component

import { initializeOfflineFirstLRS, createOfflineFirstConfig } from '@lalia/cmi5-client';
import { useEffect, useState } from 'react';

export function CMI5Component() {
  const [lrs, setLRS] = useState<LRSStore | null>(null);

  useEffect(() => {
    // Initialize offline-first LRS (client-side only)
    initializeOfflineFirstLRS().then(setLRS);
  }, []);

  if (!lrs) {
    return <div>Loading...</div>;
  }

  // Use offline-first config
  const config = createOfflineFirstConfig(lrs);
  // ... use with CMI5StateManager
}
```

## License

MIT
