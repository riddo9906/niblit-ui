import { API_BASE_URL, apiUrl } from '../config/api';

/** Raw shapes returned by the Core API ``GET /api/commands`` (app.py COMMAND_GROUPS). */
export interface RawCommand {
  label: string;
  cmd: string;
  desc?: string;
  has_input?: boolean;
}

export interface RawCommandGroup {
  group: string;
  icon?: string;
  commands: RawCommand[];
}

export interface CommandsResponse {
  commands: RawCommandGroup[];
  count?: number;
}

/**
 * Normalized command as used by the UI. All fields are translated from real
 * backend metadata — nothing is fabricated. Fields the backend does not expose
 * stay ``undefined`` so the UI can render an explicit "unavailable" state.
 */
export interface CommandInfo {
  /** Authoritative invocation text sent to Core (e.g. ``"recall"``). */
  name: string;
  /** Human label from the catalogue (e.g. ``"recall <topic>"``). */
  label: string;
  category: string;
  description: string;
  /** True when the command needs an argument typed by the user. */
  requiresInput: boolean;
  /** Placeholder hint derived from the label's ``<…>`` segment, if any. */
  argumentHint?: string;
  aliases: string[];
  /** Where the metadata came from. Always the Core catalogue. */
  source: 'core-catalogue';
}

function argumentHintOf(label: string): string | undefined {
  const match = label.match(/<([^>]+)>/);
  return match ? match[1] : undefined;
}

/** Translate one raw catalogue entry into the normalized UI contract. */
export function normalizeCommand(raw: RawCommand, group: string): CommandInfo {
  const name = String(raw.cmd ?? raw.label ?? '').trim();
  const aliases = name
    .split(/\s+/)
    .filter((part) => part.length > 1);
  return {
    name,
    label: String(raw.label ?? name),
    category: group || 'Uncategorized',
    description: String(raw.desc ?? '').trim(),
    requiresInput: Boolean(raw.has_input) || /<[^>]+>/.test(String(raw.label ?? '')),
    argumentHint: argumentHintOf(String(raw.label ?? '')),
    aliases,
    source: 'core-catalogue',
  };
}

/** Flatten + normalize the grouped catalogue response. */
export function normalizeCommands(payload: CommandsResponse | null): CommandInfo[] {
  if (!payload || !Array.isArray(payload.commands)) {
    return [];
  }
  const out: CommandInfo[] = [];
  for (const group of payload.commands) {
    for (const raw of group.commands ?? []) {
      out.push(normalizeCommand(raw, group.group));
    }
  }
  return out;
}

export async function fetchCommands(): Promise<CommandInfo[]> {
  try {
    const response = await fetch(apiUrl('/api/commands'));
    if (!response.ok) {
      return [];
    }
    const payload = (await response.json()) as CommandsResponse;
    return normalizeCommands(payload);
  } catch {
    return [];
  }
}

/** Case-insensitive ranked search over name, label, description and category. */
export function filterCommands(commands: CommandInfo[], query: string): CommandInfo[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return commands;
  }
  const terms = q.split(/\s+/);
  const scored: Array<{ command: CommandInfo; score: number }> = [];
  for (const command of commands) {
    const haystackName = command.name.toLowerCase();
    const haystackLabel = command.label.toLowerCase();
    const haystackDesc = command.description.toLowerCase();
    const haystackCategory = command.category.toLowerCase();
    let score = 0;
    let matchedAll = true;
    for (const term of terms) {
      if (haystackName.startsWith(term)) {
        score += 40;
      } else if (haystackName.includes(term)) {
        score += 25;
      } else if (haystackLabel.includes(term)) {
        score += 15;
      } else if (haystackCategory.includes(term)) {
        score += 8;
      } else if (haystackDesc.includes(term)) {
        score += 5;
      } else {
        matchedAll = false;
        break;
      }
    }
    if (matchedAll) {
      scored.push({ command, score });
    }
  }
  return scored
    .sort((a, b) => b.score - a.score || a.command.name.localeCompare(b.command.name))
    .map((entry) => entry.command);
}

export interface GroupedCommands {
  category: string;
  commands: CommandInfo[];
}

/** Group a (possibly filtered) command list by category, preserving order. */
export function groupCommands(commands: CommandInfo[]): GroupedCommands[] {
  const map = new Map<string, CommandInfo[]>();
  for (const command of commands) {
    const list = map.get(command.category);
    if (list) {
      list.push(command);
    } else {
      map.set(command.category, [command]);
    }
  }
  return Array.from(map.entries()).map(([category, cmds]) => ({ category, commands: cmds }));
}

// ─── Governed command registry (Phase 5E) ────────────────────────────────────
// The Command tab invokes REAL capabilities through the governed runtime path:
//   UI -> POST /api/commands/execute -> core_tool_runtime -> LlmToolLoop.invoke
//      -> registered capability / NiblitToolExecutor -> real result -> EventBus.
// Nothing here fabricates states: every field comes from the Core registry.

export type CommandState =
  | 'EXECUTABLE'
  | 'BLOCKED'
  | 'REQUIRES_AUTHORIZATION'
  | 'UNAVAILABLE'
  | 'REGISTERED';

export interface JsonSchemaProperty {
  type: string;
  description?: string;
}

export interface GovernedCommand {
  name: string;
  description: string;
  category: string;
  input_schema: {
    type: string;
    properties?: Record<string, JsonSchemaProperty>;
    required?: string[];
  };
  state: CommandState;
  risk_class: string;
  side_effect_level: string;
  requires_authorization: boolean;
  authorization_action?: string | null;
  /** True ONLY when the command will actually dispatch right now. */
  execution_enabled: boolean;
  /** Phase 5F: the ORIGINAL Niblit name this command was restored from. */
  original_name?: string;
  /** Phase 5F: alternative spellings that resolve to this same command. */
  aliases?: string[];
  // ── Phase 5G governance detail (additive; absent on older cores) ──────────
  /** Phase 5G exposure class recorded by the audit layer. */
  governed_status?: string;
  /** Phase 5G risk class (READ_ONLY, RESEARCH, TRADING, ...). */
  audit_risk_class?: string;
  /** Phase 5G side-effect level (NONE, LOW, MEDIUM, HIGH, CRITICAL). */
  audit_side_effect_level?: string;
  /** Documented side effect when the level is not NONE. */
  side_effect_detail?: string;
  /** Source file the ORIGINAL implementation came from. */
  original_source?: string;
  /** Symbol that registered the ORIGINAL command. */
  source_symbol?: string;
  /** Read-only evidence trace for the promotion decision. */
  evidence?: string;
  /** Truthful explanation, present only while the state is UNAVAILABLE. */
  unavailable_reason?: string;
}

export interface GovernedRegistryResponse {
  source: string;
  capability_path: string;
  research_budgets: {
    max_searches: number;
    max_fetches: number;
    max_rounds: number;
    ui_can_raise: boolean;
  };
  commands: GovernedCommand[];
  count: number;
  /** Phase 5G: how many ORIGINAL commands the runtime promoted. */
  original_command_count?: number;
}

export type CommandExecutionStatus =
  | 'success'
  | 'rejected'
  | 'authorization_required'
  | 'unavailable'
  | 'error';

export interface CommandExecutionResult {
  command: string;
  request_id: string;
  status: CommandExecutionStatus;
  result: unknown;
  error: string | null;
  duration_ms?: number;
  governance?: {
    schema_validated: boolean;
    permission_action?: string | null;
    executor: string;
    dispatch_path: string;
  };
  authorization_action?: string;
}

/** Fetch the governed registry with truthful runtime states. */
export async function fetchGovernedCommands(): Promise<GovernedRegistryResponse | null> {
  try {
    const response = await fetch(apiUrl('/api/commands/governed'));
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as GovernedRegistryResponse;
  } catch {
    return null;
  }
}

// ── Phase 5G: the complete ORIGINAL command surface (read-only audit) ───────

/** One ORIGINAL command exactly as the audit classified it. */
export interface AuditedCommand {
  original_name: string;
  canonical_id: string;
  aliases?: string[];
  category?: string;
  description?: string;
  risk_class: string;
  side_effect_level: string;
  side_effect_detail?: string;
  requires_authorization?: boolean;
  llm_safe: boolean;
  governed_status: string;
  classification_reason: string;
  implementation_exists?: boolean;
  actual_dispatch_path?: string;
  unavailable_reason?: string;
  promoted?: boolean;
  governed_tool?: string | null;
  alias_of?: string;
  handler?: string | null;
  handler_symbol?: string | null;
  source?: string;
  scan?: { scanned?: boolean; mutation_tokens?: string[]; read_only_by_scan?: boolean };
}

export interface CommandSurfaceResponse {
  source: string;
  basis: string;
  commands: AuditedCommand[];
  summary: {
    total: number;
    registered_in_core: number;
    by_status: Record<string, number>;
    by_source: Record<string, number>;
    by_risk_class: Record<string, number>;
    governed_exposed: string[];
    unexplained: string[];
    complete: boolean;
  };
  conflicts: Array<Record<string, unknown>>;
}

/**
 * Fetch the reconciled original-surface audit. Returns null when the core does
 * not expose it (older build) so the UI degrades to the governed registry
 * instead of rendering an empty surface.
 */
export async function fetchCommandSurface(): Promise<CommandSurfaceResponse | null> {
  try {
    const response = await fetch(apiUrl('/api/commands/surface'));
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as CommandSurfaceResponse;
  } catch {
    return null;
  }
}

/**
 * Execute one governed command through the authoritative Core path.
 * The response carries the REAL result, or a truthful rejection/error —
 * never a simulated success.
 */
export async function executeGovernedCommand(
  name: string,
  args: Record<string, unknown>,
  requestId?: string,
): Promise<CommandExecutionResult> {
  const response = await fetch(apiUrl('/api/commands/execute'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command: name, arguments: args, request_id: requestId ?? '' }),
  });
  if (!response.ok) {
    throw new Error(`Core command endpoint returned HTTP ${response.status}`);
  }
  return (await response.json()) as CommandExecutionResult;
}

/** Build one form value per schema property (string properties only for now). */
export function initialArgumentValues(command: GovernedCommand): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, prop] of Object.entries(command.input_schema.properties ?? {})) {
    values[key] = prop.type === 'integer' || prop.type === 'number' ? '' : '';
  }
  return values;
}

/** Parse the argument form into a typed payload; throws on invalid integers. */
export function parseArgumentValues(
  command: GovernedCommand,
  values: Record<string, string>,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(values)) {
    const trimmed = raw.trim();
    if (!trimmed) {
      continue;
    }
    const prop = command.input_schema.properties?.[key];
    if (prop && (prop.type === 'integer' || prop.type === 'number')) {
      const parsed = Number(trimmed);
      if (!Number.isFinite(parsed)) {
        throw new Error(`Argument "${key}" must be a number`);
      }
      payload[key] = prop.type === 'integer' ? Math.trunc(parsed) : parsed;
    } else {
      payload[key] = trimmed;
    }
  }
  return payload;
}

/** Human label for a runtime state (§1 of the Phase 5E contract). */
export function stateLabel(state: CommandState): string {
  switch (state) {
    case 'EXECUTABLE':
      return 'Executable';
    case 'REQUIRES_AUTHORIZATION':
      return 'Authorization required';
    case 'UNAVAILABLE':
      return 'Unavailable';
    case 'BLOCKED':
      return 'Blocked';
    default:
      return 'Registered';
  }
}

export { API_BASE_URL };
