# @lalia/cmi5-engine

**CMI5 Learning Engine** - Framework-agnostic learning engine for evaluating syllabus progress and dependencies.

## Overview

This package provides a **framework-agnostic** learning engine that evaluates CMI5 course structures:

- **AU dependencies**: Prerequisites and move-on criteria for Assignable Units
- **Completion status**: Based on mastery scores, completion criteria, and objective state
- **Progress tracking**: Evaluates status across AUs and objectives
- **Objective mastery**: Tracks mastery from CMI5 objective state

**Key Design**: This engine operates solely on CMI5 structures (`CMI5Course` or `CMI5CourseNode`). It has **no dependency on syllst**. Use `@lalia/syllst-cmi5-extension` to convert syllst to CMI5 structures first.

## Installation

```bash
pnpm add @lalia/cmi5-engine
```

## Usage

```typescript
import { CMI5LearningEngine } from '@lalia/cmi5-engine';
import type { CMI5Course, CMI5CourseNode } from '@lalia/cmi5-core';
import type { CMI5State } from '@lalia/cmi5-core';
import { mapSyllstToCMI5Tree } from '@lalia/syllst-cmi5-extension';

// Option 1: Use flat CMI5 structure
const flatCourse: CMI5Course = /* ... */;
const engine = new CMI5LearningEngine(flatCourse, {
  defaultMasteryScore: 0.8,
  prerequisitePolicy: 'completion', // or 'moveOn'
  missingPrerequisiteBehavior: 'ignore', // or 'lock'
});

// Option 2: Use UNIST tree structure (from syllst)
const syllabus: SyllabusRoot = /* ... */;
const cmi5Tree: CMI5CourseNode = mapSyllstToCMI5Tree(syllabus);
const engine = new CMI5LearningEngine(cmi5Tree, {
  defaultMasteryScore: 0.8,
});

// Evaluate progress
const snapshot = engine.evaluate({
  cmi5State: state,
});

// Access evaluations
const auEval = snapshot.aus.get('au-1');
console.log(auEval?.status); // 'locked' | 'unlocked' | 'in-progress' | 'completed' | 'passed'
console.log(auEval?.completion.isComplete);
console.log(auEval?.prerequisites.met);

const syllabusStatus = snapshot.syllabusStatus; // Overall course status
```

## Key Features

- **Framework-agnostic**: No dependencies on syllst, React, or other frameworks
- **CMI5-only**: Operates solely on CMI5 structures (flat or UNIST tree)
- **Dependency-aware**: Evaluates prerequisites and move-on criteria
- **Flexible completion**: Supports multiple completion criteria (mastery score, percentage, min count)
- **Multiple formats**: Accepts both flat `CMI5Course` and UNIST `CMI5CourseNode` structures
- **Type-safe**: Full TypeScript support with comprehensive type definitions

## Philosophy: Offline-First Evaluation

This engine works entirely offline:

- **No network required**: Evaluates progress using local state
- **Data ownership**: Works with locally stored CMI5 state
- **Next.js compatible**: Runs client-side in serverless environments

## License

MIT
