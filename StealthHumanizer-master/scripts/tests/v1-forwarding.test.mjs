import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';

const routeSource = await readFile(new URL('../../app/api/v1/humanize/route.ts', import.meta.url), 'utf8');

test('v1 humanize forwards client IP headers into the main rate-limited route', () => {
  assert.match(routeSource, /buildForwardedHeaders/);
  assert.match(routeSource, /x-forwarded-for/);
  assert.match(routeSource, /x-real-ip/);
  assert.match(routeSource, /cf-connecting-ip/);
  assert.match(routeSource, /headers:\s*buildForwardedHeaders\(request\)/);
});
