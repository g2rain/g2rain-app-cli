import assert from 'node:assert/strict';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { parseTopLevel } = await import(
  pathToFileURL(path.join(repoRoot, 'dist', 'cli', 'parse.js')).href
);

test('implicit create when first token is project name', () => {
  const parsed = parseTopLevel(['node', 'g2rain-app', 'g2rain-demo-app', '--context-path', 'demo']);
  assert.equal(parsed.command, 'create');
  assert.deepEqual(parsed.args, ['g2rain-demo-app', '--context-path', 'demo']);
  assert.equal(parsed.familyAlias, undefined);
});

test('explicit create subcommand', () => {
  const parsed = parseTopLevel(['node', 'g2rain-app', 'create', 'g2rain-demo-app', 'demo']);
  assert.equal(parsed.command, 'create');
  assert.deepEqual(parsed.args, ['g2rain-demo-app', 'demo']);
});

test('app and shell family aliases route to create', () => {
  const app = parseTopLevel(['node', 'g2rain-app', 'app', 'demo-app']);
  assert.equal(app.command, 'create');
  assert.equal(app.familyAlias, 'app');
  assert.deepEqual(app.args, ['demo-app']);

  const shell = parseTopLevel(['node', 'g2rain-app', 'shell', 'demo-shell', '--port', '3000']);
  assert.equal(shell.command, 'create');
  assert.equal(shell.familyAlias, 'shell');
  assert.deepEqual(shell.args, ['demo-shell', '--port', '3000']);
});

test('help and version commands', () => {
  assert.equal(parseTopLevel(['node', 'g2rain-app', '--help']).command, 'help');
  assert.equal(parseTopLevel(['node', 'g2rain-app', '--version']).command, 'version');
});

test('generate subcommand', () => {
  const parsed = parseTopLevel(['node', 'g2rain-app', 'generate', '--tables=member', '--no-view']);
  assert.equal(parsed.command, 'generate');
  assert.deepEqual(parsed.args, ['--tables=member', '--no-view']);
});

test('build-config subcommand', () => {
  const parsed = parseTopLevel(['node', 'g2rain-app', 'build-config', '--out', 'out/config']);
  assert.equal(parsed.command, 'build-config');
  assert.deepEqual(parsed.args, ['--out', 'out/config']);
});

test('unknown create option fails', () => {
  assert.throws(
    () => parseTopLevel(['node', 'g2rain-app', 'g2rain-demo-app', '--unknown']),
    /Unknown option/,
  );
});

test('unknown generate option fails', () => {
  assert.throws(
    () => parseTopLevel(['node', 'g2rain-app', 'generate', '--tables=a', '--foo']),
    /Unknown option/,
  );
});
