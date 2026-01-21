# @lalia/cmi5-core

**CMI5 Core Types, Constants, and Utilities** - Framework-agnostic core package for CMI5 integration.

## Overview

This package provides the foundational types, constants, and utilities for CMI5 (Computer Managed Instruction 5) integration. It is framework-agnostic and has minimal dependencies.

## Installation

```bash
pnpm add @lalia/cmi5-core
```

## Usage

### Types

```typescript
import type {
  CMI5LaunchParameters,
  CMI5Objective,
  CMI5AssignableUnit,
  CMI5Course,
  CMI5State,
  CMI5ObjectiveState,
} from '@lalia/cmi5-core';
```

### Constants

```typescript
import {
  DEFAULT_MASTERY_SCORE,
  DEFAULT_OBJECTIVE_BASE_URL,
  DEFAULT_STATE_ID,
  CMI5_VERBS,
  CMI5_ACTIVITY_TYPES,
  CMI5_MOVE_ON_CRITERIA,
  CMI5_LAUNCH_MODES,
} from '@lalia/cmi5-core';
```

### Utilities

```typescript
import {
  generateObjectiveId,
  generateAUID,
  validateLaunchParameters,
  parseActor,
} from '@lalia/cmi5-core';

// Generate objective ID from node ID
const objectiveId = generateObjectiveId('vocab-001', 'https://example.com');

// Generate AU ID from lesson ID
const auId = generateAUID('lesson-1');

// Validate launch parameters
const validation = validateLaunchParameters(params);
if (!validation.valid) {
  console.error('Errors:', validation.errors);
}
```

### UNIST Tree Types and Operations

```typescript
import type {
  CMI5CourseNode,
  CMI5AssignableUnitNode,
  CMI5ObjectiveNode,
} from '@lalia/cmi5-core/unist';
import {
  visitCMI5Tree,
  flattenCMI5Tree,
  buildCMI5Tree,
  serializeCMI5Tree,
  validateCMI5Tree,
} from '@lalia/cmi5-core/unist';

// Visit all nodes in tree
visitCMI5Tree(cmi5Tree, (node) => {
  console.log(`${node.type}: ${node.id}`);
});

// Convert between tree and flat structures
const flat = flattenCMI5Tree(cmi5Tree);
const tree = buildCMI5Tree(flat);

// Serialize/deserialize
const json = serializeCMI5Tree(cmi5Tree);
const deserialized = deserializeCMI5Tree(json);

// Validate tree structure
const validation = validateCMI5Tree(cmi5Tree);
if (!validation.valid) {
  console.error('Errors:', validation.errors);
}
```

## Key Design Principles

- **Framework-agnostic**: No dependencies on React, Node.js, or other frameworks
- **Minimal dependencies**: Only essential dependencies (e.g., `zod` for validation, `unist` for tree structures)
- **Type-safe**: Full TypeScript support with comprehensive type definitions
- **UNIST-based trees**: Provides both flat structures and UNIST tree structures for flexible representation
- **Backward compatible**: Supports both `nodeId` (preferred) and `kubitId` (deprecated) for backward compatibility

## Architecture

This package is the foundation for the CMI5 ecosystem:

- `@lalia/cmi5-core` - Core types and utilities (this package)
- `@lalia/cmi5-client` - xAPI client, state manager, and launcher
- `@lalia/cmi5-engine` - Learning engine for progress evaluation
- `@lalia/syllst-cmi5-extension` - Bridge between syllst and CMI5

## Philosophy: Data Ownership

This package is designed with data ownership in mind:

- **Offline-first**: Works without network connectivity
- **User-owned data**: All data stored locally by default
- **Optional sync**: Cloud sync is separate and opt-in
- **Next.js compatible**: Works in serverless environments

## License

MIT
