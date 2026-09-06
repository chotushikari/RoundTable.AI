import assert from 'node:assert/strict';
import test from 'node:test';
import { createLivenessChallenge, parseLivenessResult } from '@/lib/liveness';

test('liveness challenges are short lived and do not encode identity', () => {
  const challenge = createLivenessChallenge();
  assert.match(challenge.instruction, /look to your left/i);
  assert.match(challenge.phrase, /^[a-z]+ [a-z]+ [a-z]+$/);
  assert.ok(Date.parse(challenge.expiresAt) > Date.now());
  assert.equal(challenge.instruction.includes('identity'), false);
});

test('liveness output defaults uncertain model replies to inconclusive', () => {
  assert.deepEqual(parseLivenessResult('COMPLETED\nThe requested action and phrase were observed.'), {
    status: 'completed', reason: 'The requested action and phrase were observed.',
  });
  assert.equal(parseLivenessResult('Maybe likely completed').status, 'inconclusive');
  assert.equal(parseLivenessResult('UNAVAILABLE\nCamera could not be evaluated.').status, 'unavailable');
});
