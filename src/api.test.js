import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeWorkflowListResponse } from './api.js';

test('normalizeWorkflowListResponse accepts a direct workflow array', () => {
  const workflows = normalizeWorkflowListResponse([
    {
      id: 'wf-one',
      name: 'One',
      category: 'ML',
    },
  ]);

  assert.equal(workflows.length, 1);
  assert.equal(workflows[0].id, 'wf-one');
  assert.equal(workflows[0].description, '');
});

test('normalizeWorkflowListResponse unwraps workflow API envelopes', () => {
  assert.deepEqual(
    normalizeWorkflowListResponse({
      workflows: [
        {
          id: 'wf-top',
          name: 'Top',
          category: 'Data',
        },
      ],
    }).map((workflow) => workflow.id),
    ['wf-top'],
  );

  assert.deepEqual(
    normalizeWorkflowListResponse({
      data: {
        workflows: [
          {
            id: 'wf-nested',
            name: 'Nested',
            category: 'Reporting',
          },
        ],
      },
    }).map((workflow) => workflow.id),
    ['wf-nested'],
  );
});

test('normalizeWorkflowListResponse returns an empty list for non-list payloads', () => {
  assert.deepEqual(normalizeWorkflowListResponse({ status: 'ok' }), []);
  assert.deepEqual(normalizeWorkflowListResponse(null), []);
});
