/**
 * HTMX Example Server
 *
 * Demonstrates using @cmi5 packages with HTMX for a hypermedia-driven
 * learning management application.
 */

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { html, raw } from 'hono/html';

import type { CMI5Course, CMI5ObjectiveState } from 'cmi5-core';
import { CMI5LearningEngine } from 'cmi5-engine';
import type { LearnerState } from 'cmi5-fsrs-types';
import { createInitialFSRSState, calculateMastery, createLearnerState } from 'cmi5-fsrs-types';

const app = new Hono();

// In-memory store for demo (in production, use LRS)
const learnerStates = new Map<string, LearnerState>();

// Sample course structure
const sampleCourse: CMI5Course = {
  id: 'course-spanish-basics',
  title: 'Spanish Basics',
  description: 'Learn fundamental Spanish vocabulary and phrases',
  assignableUnits: [
    {
      id: 'au-greetings',
      title: 'Greetings',
      launchUrl: '/practice/au-greetings',
      order: 1,
      objectives: [
        { id: 'obj-hola', nodeId: 'hola', description: 'Hola (Hello)', masteryScore: 0.8 },
        { id: 'obj-adios', nodeId: 'adios', description: 'Adiós (Goodbye)', masteryScore: 0.8 },
        { id: 'obj-buenos-dias', nodeId: 'buenos-dias', description: 'Buenos días (Good morning)', masteryScore: 0.8 },
      ],
      moveOn: 'Completed',
    },
    {
      id: 'au-numbers',
      title: 'Numbers 1-10',
      launchUrl: '/practice/au-numbers',
      order: 2,
      prerequisites: ['au-greetings'],
      objectives: [
        { id: 'obj-uno', nodeId: 'uno', description: 'Uno (One)', masteryScore: 0.8 },
        { id: 'obj-dos', nodeId: 'dos', description: 'Dos (Two)', masteryScore: 0.8 },
        { id: 'obj-tres', nodeId: 'tres', description: 'Tres (Three)', masteryScore: 0.8 },
      ],
      moveOn: 'Completed',
    },
    {
      id: 'au-colors',
      title: 'Colors',
      launchUrl: '/practice/au-colors',
      order: 3,
      prerequisites: ['au-numbers'],
      objectives: [
        { id: 'obj-rojo', nodeId: 'rojo', description: 'Rojo (Red)', masteryScore: 0.8 },
        { id: 'obj-azul', nodeId: 'azul', description: 'Azul (Blue)', masteryScore: 0.8 },
        { id: 'obj-verde', nodeId: 'verde', description: 'Verde (Green)', masteryScore: 0.8 },
      ],
      moveOn: 'Completed',
    },
  ],
};

// Initialize engine
const engine = new CMI5LearningEngine(sampleCourse);

// Helper to render layout
const layout = (title: string, content: unknown) => html`
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${title} - CMI5 HTMX Demo</title>
      <script src="https://unpkg.com/htmx.org@1.9.10"></script>
      <style>
        * {
          box-sizing: border-box;
        }
        body {
          font-family: system-ui, -apple-system, sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
          background: #f5f5f5;
        }
        h1 {
          color: #333;
        }
        .card {
          background: white;
          border-radius: 8px;
          padding: 1.5rem;
          margin-bottom: 1rem;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .lesson {
          border-left: 4px solid #ddd;
          padding-left: 1rem;
        }
        .lesson.locked {
          border-color: #999;
          opacity: 0.6;
        }
        .lesson.available {
          border-color: #3b82f6;
        }
        .lesson.in-progress {
          border-color: #f59e0b;
        }
        .lesson.completed {
          border-color: #22c55e;
        }
        .lesson.passed {
          border-color: #8b5cf6;
        }
        .badge {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }
        .badge-locked {
          background: #e5e5e5;
          color: #666;
        }
        .badge-available {
          background: #dbeafe;
          color: #1d4ed8;
        }
        .badge-in-progress {
          background: #fef3c7;
          color: #b45309;
        }
        .badge-completed {
          background: #dcfce7;
          color: #166534;
        }
        .badge-passed {
          background: #ede9fe;
          color: #6d28d9;
        }
        .objectives {
          margin-top: 1rem;
        }
        .objective {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem;
          border-radius: 4px;
          margin-bottom: 0.5rem;
          background: #f9fafb;
        }
        .progress-bar {
          width: 100px;
          height: 8px;
          background: #e5e5e5;
          border-radius: 4px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          background: #3b82f6;
          transition: width 0.3s;
        }
        button {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.875rem;
        }
        button:hover {
          background: #2563eb;
        }
        button:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }
        .practice-card {
          text-align: center;
          padding: 2rem;
        }
        .practice-word {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }
        .practice-meaning {
          color: #666;
          margin-bottom: 1.5rem;
        }
        .rating-buttons {
          display: flex;
          gap: 0.5rem;
          justify-content: center;
        }
        .rating-buttons button {
          flex: 1;
          max-width: 100px;
        }
        .btn-again {
          background: #ef4444;
        }
        .btn-hard {
          background: #f59e0b;
        }
        .btn-good {
          background: #22c55e;
        }
        .btn-easy {
          background: #8b5cf6;
        }
        .htmx-indicator {
          opacity: 0;
          transition: opacity 0.2s;
        }
        .htmx-request .htmx-indicator {
          opacity: 1;
        }
        .flash {
          animation: flash 0.3s;
        }
        @keyframes flash {
          0% {
            background: #fef3c7;
          }
          100% {
            background: transparent;
          }
        }
      </style>
    </head>
    <body>
      <h1>CMI5 + HTMX Demo</h1>
      ${content}
    </body>
  </html>
`;

// Routes

// Home page - Course overview
app.get('/', (c) => {
  // Build objective states map from learner states
  const objectiveStates = new Map<string, CMI5ObjectiveState>();
  for (const [id, state] of learnerStates.entries()) {
    objectiveStates.set(id, {
      objectiveId: id,
      nodeId: id,
      mastery: state.mastery,
      satisfied: state.mastery >= 0.8,
      attempts: 1,
      lastAttempted: state.lastReviewed.toISOString(),
    });
  }

  const snapshot = engine.evaluate({
    cmi5State: {
      registration: 'demo-registration',
      launchMode: 'Normal',
      objectiveStates,
      progress: {
        completedLessons: [],
        currentLesson: undefined,
        timeSpent: 0,
      },
      completed: false,
    },
  });

  const lessonsHtml = Array.from(snapshot.aus.values())
    .sort((a, b) => a.order - b.order)
    .map(
      (au) => `
        <div class="card lesson ${au.status}">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h3 style="margin: 0;">${au.title}</h3>
            <span class="badge badge-${au.status}">${au.status}</span>
          </div>
          <div class="objectives" id="objectives-${au.auId}">
            ${au.objectives.details.map(
              (obj) => `
                <div class="objective">
                  <span>${obj.id.replace('obj-', '')}</span>
                  <div class="progress-bar">
                    <div class="progress-fill" style="width: ${obj.mastery * 100}%"></div>
                  </div>
                </div>
              `
            ).join('')}
          </div>
          ${au.status !== 'locked'
            ? `
                <button
                  hx-get="/practice/${au.auId}"
                  hx-target="#practice-area"
                  hx-swap="innerHTML"
                  style="margin-top: 1rem;"
                >
                  Practice
                </button>
              `
            : `<p style="color: #666; font-size: 0.875rem; margin-top: 1rem;">
                Complete prerequisites to unlock
              </p>`}
        </div>
      `
    )
    .join('');

  const content = `
    <div class="card">
      <h2>${sampleCourse.title}</h2>
      <p>${sampleCourse.description}</p>
      <p>
        <strong>Status:</strong>
        <span class="badge badge-${snapshot.course.status}">${snapshot.course.status}</span>
      </p>
    </div>

    ${lessonsHtml}

    <div class="card" id="practice-area">
      <p style="text-align: center; color: #666;">Select a lesson to practice</p>
    </div>
  `;

  return c.html(layout('Course Overview', raw(content)));
});

// Practice endpoint - returns HTMX partial
app.get('/practice/:auId', (c) => {
  const auId = c.req.param('auId');
  const au = sampleCourse.assignableUnits.find((a) => a.id === auId);

  if (!au) {
    return c.html('<p>Lesson not found</p>');
  }

  // Get a random objective to practice
  const objectives = au.objectives;
  const randomObj = objectives[Math.floor(Math.random() * objectives.length)]!;
  const nodeId = randomObj.nodeId || randomObj.id;

  // Get current state
  const state = learnerStates.get(nodeId);
  const mastery = state?.mastery ?? 0;

  return c.html(`
    <div class="practice-card">
      <h3>Practice: ${au.title}</h3>
      <div class="practice-word">${nodeId}</div>
      <div class="practice-meaning">${randomObj.description || randomObj.id}</div>
      <p>Current mastery: ${Math.round(mastery * 100)}%</p>
      <div class="rating-buttons">
        <button
          class="btn-again"
          hx-post="/review/${nodeId}?rating=1"
          hx-target="#practice-area"
          hx-swap="innerHTML"
        >
          Again
        </button>
        <button
          class="btn-hard"
          hx-post="/review/${nodeId}?rating=2"
          hx-target="#practice-area"
          hx-swap="innerHTML"
        >
          Hard
        </button>
        <button
          class="btn-good"
          hx-post="/review/${nodeId}?rating=3"
          hx-target="#practice-area"
          hx-swap="innerHTML"
        >
          Good
        </button>
        <button
          class="btn-easy"
          hx-post="/review/${nodeId}?rating=4"
          hx-target="#practice-area"
          hx-swap="innerHTML"
        >
          Easy
        </button>
      </div>
      <p style="margin-top: 1rem;">
        <button hx-get="/practice/${auId}" hx-target="#practice-area" hx-swap="innerHTML">
          Skip
        </button>
      </p>
    </div>
  `);
});

// Review endpoint - processes rating and returns updated card
app.post('/review/:nodeId', (c) => {
  const nodeId = c.req.param('nodeId');
  const rating = parseInt(c.req.query('rating') || '3');

  // Get or create learner state
  let state = learnerStates.get(nodeId);
  if (!state) {
    state = createLearnerState(nodeId, 'demo-user');
  }

  // Apply FSRS-like update (simplified)
  const newFsrs = { ...state.state };
  newFsrs.reps += 1;

  if (rating === 1) {
    newFsrs.lapses += 1;
    newFsrs.stability = Math.max(0.1, newFsrs.stability * 0.5);
    newFsrs.state = 'relearning';
  } else {
    const multiplier = 1 + (rating - 2) * 0.5;
    newFsrs.stability = Math.max(0.1, newFsrs.stability * multiplier);
    if (newFsrs.stability >= 1) {
      newFsrs.state = 'review';
    }
  }

  newFsrs.scheduledDays = Math.max(1, Math.round(newFsrs.stability));

  // Update state
  const updatedState: LearnerState = {
    ...state,
    state: newFsrs,
    lastReviewed: new Date(),
    nextReview: new Date(Date.now() + newFsrs.scheduledDays * 24 * 60 * 60 * 1000),
  };
  updatedState.mastery = calculateMastery(updatedState);
  learnerStates.set(nodeId, updatedState);

  // Find which AU this belongs to
  const au = sampleCourse.assignableUnits.find((a) => a.objectives.some((o) => o.nodeId === nodeId));

  const ratingNames = ['Again', 'Hard', 'Good', 'Easy'];
  return c.html(`
    <div class="practice-card flash">
      <h3>Reviewed!</h3>
      <p>
        <strong>${nodeId}</strong> - Rating: ${ratingNames[rating - 1]}
      </p>
      <p>New mastery: ${Math.round(updatedState.mastery * 100)}%</p>
      <p>Next review in: ${newFsrs.scheduledDays} day(s)</p>
      ${au
        ? `
            <button
              hx-get="/practice/${au.id}"
              hx-target="#practice-area"
              hx-swap="innerHTML"
              style="margin-top: 1rem;"
            >
              Continue Practice
            </button>
          `
        : ''}
      <button hx-get="/" hx-target="body" hx-swap="innerHTML" style="margin-top: 1rem;">
        Back to Course
      </button>
    </div>
  `);
});

// Start server
const port = 3000;
console.log(`Server running at http://localhost:${port}`);
serve({ fetch: app.fetch, port });
