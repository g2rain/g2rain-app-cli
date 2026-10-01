import { isFamilyAlias, isFamilyId, type FamilyAlias, type FamilyId } from '../families/types.js';

export type CliCommand = 'create' | 'generate' | 'build-config' | 'help' | 'version';

export interface ParsedTopLevel {
  command: CliCommand;
  /** argv tokens after the command name (or full create tokens for legacy) */
  args: string[];
  /** Present when first token was app/shell alias. */
  familyAlias?: FamilyAlias;
}

const KNOWN_COMMANDS = new Set<string>(['create', 'generate', 'build-config', 'help', 'version']);

/**
 * Route subcommands. Unknown `-` options fail.
 * Legacy: first positional that is not a command → implicit `create`.
 * Family aliases: `app` / `shell` → create with familyAlias.
 */
export function parseTopLevel(argv: string[]): ParsedTopLevel {
  const rest = argv.slice(2);

  if (rest.length === 0) {
    return { command: 'create', args: [] };
  }

  const first = rest[0];

  if (first === '--help' || first === '-h') {
    return { command: 'help', args: rest.slice(1) };
  }
  if (first === '--version' || first === '-V') {
    return { command: 'version', args: [] };
  }

  if (first.startsWith('-')) {
    assertNoUnknownCreateFlags(rest);
    return { command: 'create', args: rest };
  }

  if (isFamilyAlias(first)) {
    assertNoUnknownCreateFlags(rest.slice(1));
    return { command: 'create', args: rest.slice(1), familyAlias: first };
  }

  if (KNOWN_COMMANDS.has(first)) {
    const command = first as CliCommand;
    const args = rest.slice(1);
    if (command === 'create') {
      if (args[0] && isFamilyAlias(args[0])) {
        assertNoUnknownCreateFlags(args.slice(1));
        return { command: 'create', args: args.slice(1), familyAlias: args[0] };
      }
      assertNoUnknownCreateFlags(args);
    } else if (command === 'help' || command === 'version') {
      // no flag validation
    } else {
      assertKnownFlagsOnly(args, command);
    }
    return { command, args };
  }

  // Implicit create: project name as first token
  assertNoUnknownCreateFlags(rest);
  return { command: 'create', args: rest };
}

const CREATE_FLAGS = new Set([
  '--context-path',
  '--context_path',
  '--family',
  '--name',
  '--port',
  '--with-legacy',
  '--help',
  '-h',
]);
const GENERATE_FLAGS = new Set([
  '--tables',
  '--cwd',
  '--sql',
  '--views',
  '--route-map',
  '--no-view',
  '--no-api',
  '--no-mock',
  '--no-route',
  '--skip-view',
  '--skip-api',
  '--skip-mock',
  '--skip-route',
]);
const BUILD_CONFIG_FLAGS = new Set(['--cwd', '--route-map', '--views', '--out']);

function assertNoUnknownCreateFlags(args: string[]): void {
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith('-')) continue;
    if (arg.startsWith('--tables=')) {
      throw new Error(`Unknown option for create: ${arg}`);
    }
    const name = arg.includes('=') ? arg.slice(0, arg.indexOf('=')) : arg;
    if (!CREATE_FLAGS.has(name)) {
      throw new Error(`Unknown option: ${arg}`);
    }
    if (
      !arg.includes('=') &&
      (name === '--context-path' ||
        name === '--context_path' ||
        name === '--family' ||
        name === '--name' ||
        name === '--port')
    ) {
      i += 1;
    }
  }
}

function assertKnownFlagsOnly(args: string[], command: 'generate' | 'build-config'): void {
  const allowed = command === 'generate' ? GENERATE_FLAGS : BUILD_CONFIG_FLAGS;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith('-')) {
      throw new Error(`Unexpected argument for ${command}: ${arg}`);
    }
    if (arg.startsWith('--tables=')) {
      if (command !== 'generate') {
        throw new Error(`Unknown option for ${command}: ${arg}`);
      }
      continue;
    }
    const name = arg.includes('=') ? arg.slice(0, arg.indexOf('=')) : arg;
    if (!allowed.has(name)) {
      throw new Error(`Unknown option for ${command}: ${arg}`);
    }
    if (
      !arg.includes('=') &&
      (name === '--tables' ||
        name === '--cwd' ||
        name === '--sql' ||
        name === '--views' ||
        name === '--route-map' ||
        name === '--out')
    ) {
      i += 1;
      if (i >= args.length || args[i].startsWith('-')) {
        throw new Error(`Missing value for ${name}`);
      }
    }
  }
}

export interface ParsedCreateArgs {
  family?: FamilyId;
  familyExplicit: boolean;
  projectName?: string;
  contextPath?: string;
  port?: number;
  /** Shell-only optional legacy overlay. Default false. */
  withLegacy: boolean;
  help: boolean;
}

export function parseCreateArgs(
  argv: string[],
  familyAlias?: FamilyAlias,
): ParsedCreateArgs {
  const args: ParsedCreateArgs = {
    familyExplicit: false,
    withLegacy: false,
    help: false,
  };

  if (familyAlias) {
    args.family = familyAlias === 'app' ? 'frontend-app' : 'frontend-shell';
    args.familyExplicit = true;
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--with-legacy') {
      args.withLegacy = true;
    } else if (arg === '--family') {
      const value = argv[++i];
      if (!value || value.startsWith('-')) {
        throw new Error('Missing value for --family');
      }
      if (!isFamilyId(value)) {
        throw new Error(`Unknown family: ${value}. Use frontend-app or frontend-shell.`);
      }
      args.family = value;
      args.familyExplicit = true;
    } else if (arg === '--name') {
      const value = argv[++i];
      if (!value || value.startsWith('-')) {
        throw new Error('Missing value for --name');
      }
      args.projectName = value;
    } else if (arg === '--context-path' || arg === '--context_path') {
      const value = argv[++i];
      if (!value || value.startsWith('-')) {
        throw new Error(`Missing value for ${arg}`);
      }
      args.contextPath = value;
    } else if (arg === '--port') {
      const value = argv[++i];
      if (!value || value.startsWith('-')) {
        throw new Error('Missing value for --port');
      }
      const port = Number.parseInt(value, 10);
      if (!Number.isFinite(port) || port <= 0 || port > 65535) {
        throw new Error(`Invalid --port: ${value}`);
      }
      args.port = port;
    } else if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}`);
    } else if (!args.projectName) {
      args.projectName = arg;
    } else if (!args.contextPath) {
      args.contextPath = arg;
    } else {
      throw new Error(`Unexpected argument: ${arg}`);
    }
  }

  if (!args.family) {
    args.family = 'frontend-app';
    args.familyExplicit = false;
  }

  if (args.withLegacy && args.family !== 'frontend-shell') {
    throw new Error(
      '--with-legacy is only valid for shell / --family frontend-shell (not app, generate, or build-config)',
    );
  }

  return args;
}
