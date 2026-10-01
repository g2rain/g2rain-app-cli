#!/usr/bin/env node
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { includeInTreeHash } from './lib/template-sync-filter.mjs';

/**
 * Recursively list files under root as POSIX relative paths (sorted).
 * Symlinks cause failure.
 * @param {string} root
 * @returns {Promise<string[]>}
 */
async function listFiles(root) {
  /** @type {string[]} */
  const files = [];

  async function walk(absDir, relPosix) {
    const entries = await fsp.readdir(absDir, { withFileTypes: true });
    for (const entry of entries) {
      const childRel = relPosix ? `${relPosix}/${entry.name}` : entry.name;
      if (!includeInTreeHash(childRel) && entry.isDirectory()) {
        // Skip entire excluded trees (node_modules, dist, .git, markers at root).
        if (
          entry.name === 'node_modules' ||
          entry.name === 'dist' ||
          entry.name === '.git'
        ) {
          continue;
        }
      }
      if (
        entry.name === '.g2rain-template-meta.json' ||
        entry.name === '.g2rain-template-snapshot.md'
      ) {
        continue;
      }

      const childAbs = path.join(absDir, entry.name);
      if (entry.isSymbolicLink()) {
        throw new Error(`Symlink not allowed in template snapshot: ${childRel}`);
      }
      if (entry.isDirectory()) {
        await walk(childAbs, childRel);
        continue;
      }
      if (entry.isFile()) {
        if (!includeInTreeHash(childRel)) continue;
        files.push(childRel);
      }
    }
  }

  await walk(root, '');
  files.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return files;
}

/**
 * Git may materialize text files as CRLF on Windows and LF on Linux. Hash the
 * canonical LF representation for valid UTF-8 text, while keeping binary
 * content byte-for-byte intact.
 * @param {Buffer} content
 * @returns {Buffer}
 */
function canonicalizeContent(content) {
  if (content.includes(0)) return content;

  const text = content.toString('utf8');
  // Invalid UTF-8 is treated as binary; never transform it.
  if (!Buffer.from(text, 'utf8').equals(content)) return content;

  return Buffer.from(text.replace(/\r\n/g, '\n'), 'utf8');
}

/**
 * Deterministic content tree hash: sha256:<hex>
 * @param {string} templateDir
 * @returns {Promise<string>}
 */
export async function hashTemplateTree(templateDir) {
  const root = path.resolve(templateDir);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    throw new Error(`Not a directory: ${root}`);
  }

  const files = await listFiles(root);
  const hash = createHash('sha256');
  const nul = Buffer.from([0]);

  for (const rel of files) {
    hash.update(Buffer.from(rel, 'utf-8'));
    hash.update(nul);
    const content = await fsp.readFile(path.join(root, ...rel.split('/')));
    hash.update(canonicalizeContent(content));
    hash.update(nul);
  }

  return `sha256:${hash.digest('hex')}`;
}

async function main() {
  const target = process.argv[2];
  if (!target) {
    console.error('Usage: node scripts/template-tree-hash.mjs <template-dir>');
    process.exit(1);
  }
  const digest = await hashTemplateTree(path.resolve(target));
  process.stdout.write(`${digest}\n`);
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
