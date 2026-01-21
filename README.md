# CMI5 Playground

A pnpm monorepo containing CMI5 (Computer Managed Instruction) and xAPI learning analytics packages with an HTMX example application.

## Overview

This repository provides a complete set of packages for implementing CMI5-compatible learning systems:

- **@cmi5/core** - Core types, constants, and utilities for CMI5
- **@cmi5/engine** - Learning engine for evaluating syllabus progress and dependencies
- **@cmi5/lrs** - Learning Record Store (LRS) for xAPI statement storage
- **@cmi5/client** - xAPI client, state manager, and launcher
- **@cmi5/fsrs-types** - FSRS (Free Spaced Repetition Scheduler) types and utilities

## Quick Start

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run the HTMX example
pnpm --filter @cmi5/htmx-example dev
```

Then open http://localhost:3000 to see the demo.

## Packages

### @cmi5/core

Core types and utilities for CMI5 integration. Framework-agnostic with minimal dependencies.

```typescript
import type { CMI5Course, CMI5LaunchParameters } from '@cmi5/core';
import { CMI5_VERBS, CMI5_ACTIVITY_TYPES } from '@cmi5/core';

// UNIST tree operations
import { buildCMI5Tree, flattenCMI5Tree, validateCMI5Tree } from '@cmi5/core/unist';
```

### @cmi5/engine

Evaluates CMI5 course progress, prerequisites, and completion criteria.

```typescript
import { CMI5LearningEngine } from '@cmi5/engine';

const engine = new CMI5LearningEngine(course);
const snapshot = engine.evaluate({ cmi5State });

// Check lesson status
const lesson = snapshot.aus.get('lesson-1');
console.log(lesson.status); // 'locked' | 'available' | 'in-progress' | 'completed' | 'passed'
```

### @cmi5/lrs

In-browser Learning Record Store using libSQL/WASM for offline-first storage.

```typescript
import { LRSStore } from '@cmi5/lrs';

const lrs = new LRSStore();
await lrs.storeStatement(statement);
const results = await lrs.queryStatements({ verb: 'completed' });
```

### @cmi5/client

Complete CMI5 client implementation with state management and FSRS integration.

```typescript
import { FSRSService } from '@cmi5/client';

const fsrs = new FSRSService({ lrs, launchParams, userId: 'user-1' });
await fsrs.recordReview({ itemId: 'vocab-hola', rating: 3, activity: 'recognition' });
```

### @cmi5/fsrs-types

Standalone FSRS types and utilities for spaced repetition systems.

```typescript
import { createLearnerState, calculateMastery, isDueForReview } from '@cmi5/fsrs-types';

const state = createLearnerState('vocab-123', 'user-1');
const mastery = calculateMastery(state);
const isDue = isDueForReview(state);
```

## Apps

### HTMX Example

A server-rendered application using Hono + HTMX demonstrating:

- Course structure display with lesson status
- Interactive flashcard practice
- FSRS-based spaced repetition
- Real-time progress updates via HTMX

```bash
cd apps/htmx-example
pnpm dev
```

## Project Structure

```
cmi5-playground/
├── apps/
│   └── htmx-example/        # HTMX demo application
├── packages/
│   ├── cmi5-core/           # Core types and utilities
│   ├── cmi5-engine/         # Learning progress engine
│   ├── cmi5-client/         # xAPI client and FSRS service
│   ├── lrs/                 # Learning Record Store
│   └── fsrs-types/          # FSRS types and utilities
├── tooling/
│   └── typescript/          # Shared TypeScript configs
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Build only packages (not apps)
pnpm build:packages

# Type check
pnpm typecheck

# Run tests
pnpm test

# Format code
pnpm format:fix
```

## Philosophy

This project follows these principles:

1. **Offline-first**: All data is stored locally by default using browser storage
2. **Data ownership**: Users own their learning data, cloud sync is optional
3. **Framework-agnostic**: Core packages work with any JavaScript framework
4. **Standards-based**: Built on CMI5 and xAPI specifications

## License

MIT
