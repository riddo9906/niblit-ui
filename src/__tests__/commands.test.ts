import { describe, it, expect } from 'vitest';
import {
  normalizeCommands,
  normalizeCommand,
  filterCommands,
  groupCommands,
  type CommandsResponse,
} from '../services/commandsApi';

const catalogue: CommandsResponse = {
  count: 4,
  commands: [
    {
      group: 'Core',
      icon: '🏠',
      commands: [
        { label: 'help', cmd: 'help', desc: 'Show the complete Niblit command reference' },
        { label: 'status', cmd: 'status', desc: 'Show overall system status (modules, threads, memory)' },
      ],
    },
    {
      group: 'Knowledge & Recall',
      icon: '🧠',
      commands: [
        { label: 'recall <topic>', cmd: 'recall ', desc: 'Full-text search across KnowledgeDB facts', has_input: true },
        { label: 'knowledge stats', cmd: 'knowledge stats', desc: 'KnowledgeDB statistics' },
      ],
    },
  ],
};

describe('command metadata translation', () => {
  it('normalizes groups into a flat catalogue with real backend fields', () => {
    const commands = normalizeCommands(catalogue);
    expect(commands).toHaveLength(4);
    expect(commands[0]).toMatchObject({
      name: 'help',
      label: 'help',
      category: 'Core',
      description: 'Show the complete Niblit command reference',
      requiresInput: false,
      source: 'core-catalogue',
    });
  });

  it('marks input commands and derives argument hints from labels only', () => {
    const recall = normalizeCommand(
      { label: 'recall <topic>', cmd: 'recall ', has_input: true },
      'Knowledge & Recall',
    );
    expect(recall.requiresInput).toBe(true);
    expect(recall.argumentHint).toBe('topic');
    expect(recall.name).toBe('recall');
  });

  it('does not fabricate descriptions when backend omits them', () => {
    const bare = normalizeCommand({ label: 'x', cmd: 'x' }, 'Core');
    expect(bare.description).toBe('');
  });

  it('returns an empty list for null / malformed payloads', () => {
    expect(normalizeCommands(null)).toEqual([]);
    expect(normalizeCommands({ commands: [] })).toEqual([]);
  });
});

describe('command search / filtering', () => {
  const commands = normalizeCommands(catalogue);

  it('returns everything unfiltered', () => {
    expect(filterCommands(commands, '')).toHaveLength(4);
    expect(filterCommands(commands, '   ')).toHaveLength(4);
  });

  it('matches by name with prefix ranking first', () => {
    const results = filterCommands(commands, 'stat');
    expect(results[0].name).toBe('status');
    // "knowledge stats" also matches via name substring
    expect(results.map((c) => c.name)).toContain('knowledge stats');
  });

  it('matches by description and category terms', () => {
    expect(filterCommands(commands, 'facts').map((c) => c.name)).toContain('recall');
    expect(filterCommands(commands, 'knowledge').map((c) => c.name)).toContain('knowledge stats');
  });

  it('requires all terms to match (AND semantics)', () => {
    // 'status' matches status commands, 'recall' only matches recall — no command satisfies both
    expect(filterCommands(commands, 'status recall')).toHaveLength(0);
  });
});

describe('command grouping', () => {
  it('preserves catalogue order and groups by category', () => {
    const grouped = groupCommands(normalizeCommands(catalogue));
    expect(grouped.map((g) => g.category)).toEqual(['Core', 'Knowledge & Recall']);
    expect(grouped[1].commands.map((c) => c.name)).toEqual(['recall', 'knowledge stats']);
  });
});
