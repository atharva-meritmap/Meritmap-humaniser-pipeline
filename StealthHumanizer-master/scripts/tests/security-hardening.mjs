import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { assessSemanticFidelity } from '../../lib/semantic-fidelity.ts';
import { localHumanizeText } from '../../lib/local-humanizer.ts';
import { consumeHumanizeStream } from '../../lib/streaming-client.ts';

const humanizerSource = await readFile(new URL('../../components/Humanizer.tsx', import.meta.url), 'utf8');
const manifest = JSON.parse(await readFile(new URL('../../extension/manifest.json', import.meta.url), 'utf8'));
const localHumanizerSource = await readFile(new URL('../../lib/local-humanizer.ts', import.meta.url), 'utf8');

test('highlight rendering escapes user HTML before using dangerouslySetInnerHTML', () => {
  assert.match(humanizerSource, /const escapeHtml = \(value: string\)/);
  assert.match(humanizerSource, /let html = escapeHtml\(fullText\)/);
  assert.doesNotMatch(humanizerSource, /let html = fullText;/);
});

test('browser extension uses least-privilege manifest permissions', () => {
  assert.deepEqual(manifest.permissions.sort(), ['contextMenus', 'storage']);
  assert.equal(manifest.host_permissions, undefined);
  assert.equal(manifest.content_scripts, undefined);
});

test('semantic fidelity flags protected URL email code markdown and key loss', () => {
  const original = '# Deploy\nContact ops@example.com and open https://example.com/run?id=42. Use `npm test` with sk-123456789abcdef.';
  const rewritten = 'Deploy. Contact ops and run tests.';
  const report = assessSemanticFidelity(original, rewritten);
  assert.ok(report.urlRecall < 100);
  assert.ok(report.emailRecall < 100);
  assert.ok(report.codeRecall < 100);
  assert.ok(report.markdownRecall < 100);
  assert.ok(report.protectedTokenRecall < 100);
  assert.ok(report.warnings.length >= 4);
});

test('privacy mode has no network or provider dependency', () => {
  assert.doesNotMatch(localHumanizerSource, /fetch\s*\(/);
  assert.doesNotMatch(localHumanizerSource, /generateWithProvider|getProvider|apiKey/);
  const rewritten = localHumanizeText('Visit https://example.com and email ops@example.com. Never share sk-123456789abcdef.', { level: 'ninja', style: 'technical', tone: 'technical' });
  assert.match(rewritten, /https:\/\/example\.com/);
  assert.match(rewritten, /ops@example\.com/);
  assert.match(rewritten, /Never share/);
});

test('streaming client rejects malformed SSE error events', async () => {
  const response = new Response('event: error\ndata: {"error":"bad request"}\n\n');
  await assert.rejects(() => consumeHumanizeStream(response, () => {}), /bad request/);
});

test('streaming client rejects interrupted streams without result', async () => {
  const response = new Response('event: progress\ndata: {"message":"started"}\n\n');
  await assert.rejects(() => consumeHumanizeStream(response, () => {}), /did not include a result/);
});
