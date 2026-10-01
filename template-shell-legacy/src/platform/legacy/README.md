# Legacy compatibility overlay

Optional Shell edge module installed only when scaffolding with:

```bash
g2rain-app shell <name> --with-legacy
```

## Purpose

Bridge stock Manager-style sub-apps that still expect Token-in-props and
`TOKEN_INVALID` with `data.applicationCode` only. AppKit remains the sole core protocol.

## Layout

| File | Role |
| --- | --- |
| `registry.ts` | Legacy `applicationCode` allow-list (empty by default) |
| `adapter.ts` | Registry-aware protocol adapter (injects token props) |
| `resolve-instance.ts` | Instance routing for legacy token-invalid |
| `types.ts` | Private `LegacyMountProps` (do not export to Workspace) |
| `../components/micro-app/legacy-message-bridge.ts` | Old event → Shell refresh |
| `../runtime/shell-extensions.ts` | `setAdapterResolver` + start bridge |

## Security

- Never log `token`, `tokenKid`, or `client`.
- Do not put Token fields on AppKit `MainPublicProps`, URL, or Workspace.
- See `docs/architecture/deviations.md` rows TPL-010 / TPL-011 (fragment also in
  `docs/architecture/legacy-deviations.fragment.md`).

## Migrate an app

1. Add `{ protocolVersion: 'legacy' }` under the app's `applicationCode` in `registry.ts`.
2. Record owner, acceptance, rollback, and planned removal date in the table below.
3. When the app uses Auth Bridge / AppKit messages, delete its registry entry and fixtures.

## Migration log

| applicationCode | Owner | Accepted | Rollback | Remove by |
| --- | --- | --- | --- | --- |
| _(none)_ | — | — | — | — |

## Remove this overlay

1. Empty `LEGACY_APPLICATION_REGISTRY`.
2. Delete `src/platform/legacy/`, `src/components/micro-app/legacy-message-bridge.ts`.
3. Restore default `src/runtime/shell-extensions.ts` (no-op `installShellExtensions`).
4. Remove legacy deviation rows and set `legacyCompatibility: false` in `docs/project.yaml`.
5. Run the default Shell build / AppKit acceptance.
