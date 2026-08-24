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

export { API_BASE_URL };
