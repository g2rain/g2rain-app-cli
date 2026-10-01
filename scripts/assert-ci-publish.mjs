#!/usr/bin/env node
/**
 * npm publish is allowed only from GitHub Actions (OIDC Trusted Publishing).
 * Local developers should use `npm pack` / `npm pack --dry-run`.
 */
if (process.env.GITHUB_ACTIONS === 'true') {
  process.exit(0);
}

console.error(
  '✖ npm publish is only allowed from GitHub Actions (OIDC Trusted Publishing + npm-production).',
);
console.error('  Locally run: npm run verify:template-snapshots && npm pack --dry-run');
process.exit(1);
