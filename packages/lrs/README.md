# @lalia/lrs

CMI5-compatible Learning Record Store (LRS) for xAPI statement storage and retrieval.

**Single Source of Truth**: The LRS serves as the central repository for all learning data, including FSRS (spaced repetition) state, review milestones, and CMI5 progress tracking.

> **Architecture**: See [LRS as Single Source of Truth](../../docs/architecture/lrs-single-source-of-truth.md) for detailed architecture documentation.
> **Testing**: See [LRS Testing Plan](../../docs/testing/lrs-testing-plan.md) for comprehensive test scenarios.

## Philosophy

This LRS embodies our philosophy of **"the anything learning record store that you own"**:

- **Stores anything** - Learning records across all topics, languages, and activities in one place
- **You own it** - Data stored locally in your browser, with export capabilities and optional cloud sync
- **Standards-compliant** - Uses xAPI 1.0.3 and CMI5 for compatibility and portability

See [Learning Systems Philosophy](../../../docs/products/polyglot-tools/learning-systems/PHILOSOPHY.md) for more details.

## Overview

This package provides a complete LRS implementation that:
- Stores xAPI statements
- Manages CMI5 state
- Browser-based with local SQLite storage (OPFS persistence)
- Supports CMI5 launch parameters and tracking

## Features

- ✅ xAPI 1.0.3 compliant
- ✅ CMI5 state management
- ✅ Statement storage and retrieval
- ✅ State API support
- ✅ Registration-based tracking
- ✅ PostgreSQL database backend

## Installation

```bash
pnpm add @lalia/lrs
```

## Usage

### Browser Usage

```typescript
import { LRSStore } from '@lalia/lrs';

// Create store (uses OPFS for persistence)
const store = new LRSStore({
  dbName: 'lrs.db', // Optional, defaults to 'lrs.db'
  inMemory: false,  // Set to true for in-memory (no persistence)
});

// Initialize
await store.init();

// Store a statement
const statementId = await store.storeStatement({
  actor: { name: ['John Doe'], mbox: 'mailto:john@example.com' },
  verb: { id: 'http://adlnet.gov/expapi/verbs/completed', display: { 'en-US': 'completed' } },
  object: { id: 'https://example.com/activities/lesson-01', objectType: 'Activity' },
});

// Query statements
const results = await store.queryStatements({
  registration: 'registration-uuid',
  limit: 10,
});

// Save CMI5 state
await store.saveCMI5State(
  'registration-uuid',
  'activity-id',
  { name: ['John Doe'] },
  'state-id',
  { /* CMI5State */ }
);
```

### Features

- **Browser-native SQLite** - Uses `@libsql/client-wasm` for WASM-based SQLite
- **OPFS persistence** - Stores data in browser's Origin Private File System
- **Type-safe** - Full TypeScript support with Drizzle ORM
- **CMI5 compatible** - Supports CMI5 state management
- **xAPI compliant** - Implements xAPI 1.0.3 statement storage

## Database Schema

The LRS uses SQLite (browser-based) with two main tables:
- `xapi_statements` - Stores xAPI statements
- `cmi5_state` - Stores CMI5 learner state

Uses `@libsql/client-wasm` for browser-native SQLite with OPFS (Origin Private File System) for persistent storage.

See `src/db/schema.ts` for full schema definitions.

## API Methods

### Statement Methods

- `storeStatement(statement)` - Store an xAPI statement
- `getStatement(statementId)` - Get a statement by ID
- `queryStatements(params)` - Query statements with filters

### CMI5 State Methods

- `saveCMI5State(registration, activityId, agent, stateId, state)` - Save CMI5 state
- `getCMI5State(registration, activityId, agent, stateId)` - Get CMI5 state
- `deleteCMI5State(registration, activityId, agent, stateId)` - Delete CMI5 state

## CMI5 Support

The LRS fully supports CMI5 requirements:
- Launch parameter parsing
- Registration-based tracking
- Objective mastery tracking
- AU completion tracking
- State persistence

## License

MIT
