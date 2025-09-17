import { test, expect } from 'vitest';
import { stopWords, buildRelayPrompt } from './relayPrompts';

test('stopWords contains all required phrases', () => {
  expect(stopWords).toEqual(
    expect.arrayContaining(['…', 'continue', 'generating', 'Read more', 'Show more'])
  );
});

test('buildRelayPrompt returns correct prompt for claude', () => {
  const prompt = buildRelayPrompt('prev', 'claude', 'userQ', 123);
  expect(prompt).toContain('Oto pytanie: "userQ"');
  expect(prompt).toContain('123 słów');
});
