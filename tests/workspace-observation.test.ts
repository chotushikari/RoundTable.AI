import assert from 'node:assert/strict';
import test from 'node:test';
import { canvasReviewObservation, codeReviewObservation, codeTaskReview } from '@/lib/workspace-observation';

test('canvas review reports only components and links the candidate actually added', () => {
  const empty = canvasReviewObservation({ nodes: [], edges: [] });
  assert.match(empty ?? '', /currently empty/);
  assert.match(empty ?? '', /Client/);

  const incomplete = canvasReviewObservation({
    nodes: [{ id: 'server', data: { label: 'API Server' } }],
    edges: [],
  });
  assert.match(incomplete ?? '', /API Server/);
  assert.match(incomplete ?? '', /Add Client/);
  assert.match(incomplete ?? '', /Database/);

  const complete = canvasReviewObservation({
    nodes: [
      { id: 'client', data: { label: 'Client' } },
      { id: 'server', data: { label: 'API Server' } },
      { id: 'database', data: { label: 'Database' } },
    ],
    edges: [{ source: 'client', target: 'server' }, { source: 'server', target: 'database' }],
  });
  assert.match(complete ?? '', /both required data-flow connections/);
});

test('code review identifies a saved function without claiming correctness', () => {
  const review = codeReviewObservation({ language: 'python', source: 'def countVowels(value):\n    return 0\n' });
  assert.match(review ?? '', /countVowels/);
  assert.doesNotMatch(review ?? '', /correct|passes/i);
});

test('code task review recognizes the required countVowels implementation without executing it', () => {
  const review = codeTaskReview({
    language: 'typescript',
    source: "function countVowels(value: string) {\n  return [...value].filter((letter) => 'aeiouAEIOU'.includes(letter)).length;\n}",
  }, 'Implement a function countVowels that counts vowels and ignores non-alphabetic characters.');
  assert.equal(review?.complete, true);
  assert.match(review?.text ?? '', /character iteration/);
});

test('code task review accepts the Python count_vowels entry point requested by the prompt', () => {
  const review = codeTaskReview({
    language: 'python',
    source: "def count_vowels(value: str) -> int:\n    return sum(letter.lower() in 'aeiou' for letter in value)",
  }, 'Implement a function count_vowels(s: str) -> int that returns the number of vowels in the input string.');
  assert.equal(review?.complete, true);
  assert.match(review?.text ?? '', /vowel-counting function/);
});

test('code task review accepts a compact sumEvenNumbers implementation', () => {
  const review = codeTaskReview({
    language: 'python',
    source: 'def sumEvenNumbers(values):\n    return sum(value for value in values if value % 2 == 0)',
  }, 'Implement sumEvenNumbers: return the sum of all even numbers in an array.');
  assert.equal(review?.complete, true);
  assert.match(review?.text ?? '', /workspace portion is complete/);
});

test('code task review accepts a two-line named ascending sort', () => {
  const review = codeTaskReview({
    language: 'python',
    source: 'def sort_ascending(values):\n    return sorted(values)',
  }, 'Write a function that takes a list of integers and returns the list sorted in ascending order.');
  assert.equal(review?.complete, true);
  assert.match(review?.text ?? '', /ascending sort/);
  assert.match(review?.text ?? '', /empty list/);
});

test('freehand whiteboard review reports saved marks without pretending it is a structured diagram', () => {
  const review = canvasReviewObservation({
    nodes: [], edges: [],
    freehand: { elements: [{ type: 'rectangle' }, { type: 'text' }, { type: 'arrow' }] },
  });
  assert.match(review ?? '', /freehand whiteboard/);
  assert.match(review ?? '', /1 labels and 1 arrows/);
  assert.match(review ?? '', /Add Client label/);
});

test('freehand architecture with saved labels and arrows is complete', () => {
  const review = canvasReviewObservation({
    nodes: [], edges: [],
    freehand: {
      elements: [
        { type: 'rectangle' }, { type: 'rectangle' }, { type: 'rectangle' },
        { type: 'text', text: 'Client' }, { type: 'text', text: 'API Server' }, { type: 'text', text: 'Database' },
        { type: 'arrow' }, { type: 'arrow' },
      ],
    },
  });
  assert.match(review ?? '', /complete architecture flow/);
});
