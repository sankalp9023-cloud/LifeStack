import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const fixturePath = fileURLToPath(new URL('./fixtures/empty-backup.json', import.meta.url));
const importerPath = fileURLToPath(new URL('../scripts/import-localstorage.mjs', import.meta.url));
const ownerId = '11111111-1111-4111-8111-111111111111';

test('local data import defaults to a validated no-write preview', () => {
  const result = spawnSync(process.execPath, [importerPath, '--owner', ownerId, '--file', fixturePath], {
    cwd: new URL('./fixtures', import.meta.url),
    encoding: 'utf8',
    env: { ...process.env, DATABASE_URL: '' },
  });

  assert.equal(result.status, 0, result.stderr);
  const preview = JSON.parse(result.stdout);
  assert.equal(preview.status, 'preview_only');
  assert.equal(preview.ownerId, ownerId);
  assert.equal(preview.writesPerformed, false);
});

test('local data import requires --apply before database access', () => {
  const result = spawnSync(
    process.execPath,
    [importerPath, '--owner', ownerId, '--file', fixturePath, '--apply'],
    {
      cwd: new URL('./fixtures', import.meta.url),
      encoding: 'utf8',
      env: { ...process.env, DATABASE_URL: '' },
    },
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /DATABASE_URL is required when --apply is used/);
});
