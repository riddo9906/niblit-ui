import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  type GovernedCommand,
  initialArgumentValues,
  parseArgumentValues,
  stateLabel,
} from '../services/commandsApi';
import {
  GovernedBadge,
  GovernedDetail,
  filterGoverned,
  groupGoverned,
} from '../pages/CommandsPage';

function governed(overrides: Partial<GovernedCommand>): GovernedCommand {
  return {
    name: 'workspace_read',
    description: 'Read the REAL content of a workspace text/code file.',
    category: 'Workspace',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'workspace-relative path' },
        max_chars: { type: 'integer' },
      },
      required: ['path'],
    },
    state: 'EXECUTABLE',
    risk_class: 'none',
    side_effect_level: 'read_only',
    requires_authorization: false,
    authorization_action: null,
    execution_enabled: true,
    ...overrides,
  };
}

describe('governed registry translation (Phase 5E)', () => {
  it('filters and groups governed commands without fabrication', () => {
    const list = [
      governed({}),
      governed({ name: 'runtime_status', category: 'Runtime', description: 'Runtime status shell output.' }),
    ];
    expect(filterGoverned(list, 'runtime')).toHaveLength(1);
    const grouped = groupGoverned(list);
    expect(grouped.map((g) => g.category)).toEqual(['Workspace', 'Runtime']);
  });

  it('labels every state truthfully', () => {
    expect(stateLabel('EXECUTABLE')).toBe('Executable');
    expect(stateLabel('REQUIRES_AUTHORIZATION')).toBe('Authorization required');
    expect(stateLabel('UNAVAILABLE')).toBe('Unavailable');
    expect(stateLabel('BLOCKED')).toBe('Blocked');
  });

  it('parses argument forms into typed payloads', () => {
    const command = governed({});
    const values = initialArgumentValues(command);
    expect(values).toEqual({ path: '', max_chars: '' });
    expect(parseArgumentValues(command, { path: 'modules/x.py', max_chars: '1200' }))
      .toEqual({ path: 'modules/x.py', max_chars: 1200 });
    expect(() => parseArgumentValues(command, { max_chars: 'abc' })).toThrow(/must be a number/);
  });
});

describe('Phase 5G governance detail', () => {
  function renderDetail(command: GovernedCommand): string {
    return renderToStaticMarkup(
      <GovernedDetail
        command={command}
        argValues={initialArgumentValues(command)}
        onArgChange={() => undefined}
        onExecute={() => undefined}
        executing={false}
        lastResult={null}
      />,
    );
  }

  it('renders the audit risk class, original name and evidence trace', () => {
    const html = renderDetail(
      governed({
        name: 'knowledge_stats',
        category: 'Knowledge',
        original_name: 'knowledge stats',
        aliases: ['knowledge stats'],
        audit_risk_class: 'READ_ONLY',
        audit_side_effect_level: 'NONE',
        evidence: 'niblit_core._cmd_knowledge_stats -> db.get_knowledge_summary()',
        source_symbol: 'niblit_core.py:NiblitCore._register_commands',
        governed_status: 'GOVERNED_EXECUTABLE',
      }),
    );
    expect(html).toContain('READ_ONLY');
    expect(html).toContain('knowledge stats');
    expect(html).toContain('db.get_knowledge_summary()');
    expect(html).toContain('niblit_core.py:NiblitCore._register_commands');
    expect(html).toContain('Available on the governed assistant tool loop');
  });

  it('documents a bounded LOW side effect instead of hiding it', () => {
    const html = renderDetail(
      governed({
        name: 'retrieval_status',
        category: 'Research',
        audit_risk_class: 'READ_ONLY',
        audit_side_effect_level: 'LOW',
        side_effect_detail:
          'NiblitUnifiedRuntime.dispatch_command persists its telemetry state file (bounded)',
      }),
    );
    expect(html).toContain('LOW');
    expect(html).toContain('telemetry state file');
  });

  it('states truthfully that a disabled command is not LLM-exposed', () => {
    const html = renderDetail(
      governed({
        state: 'UNAVAILABLE',
        execution_enabled: false,
        unavailable_reason:
          "the canonical registry has no callable handler for the original command 'status'",
      }),
    );
    expect(html).toContain('Not exposed to the assistant');
    expect(html).toContain('no callable handler');
    expect(html).toContain('Unavailable:');
  });

  it('renders unchanged for a command without Phase 5G metadata', () => {
    const html = renderDetail(governed({}));
    expect(html).toContain('Workspace');
    expect(html).toContain('Not required');
    expect(html).not.toContain('Unavailable:');
  });
});

describe('governed state rendering (Phase 5E)', () => {
  it('renders the executable state with its glyph', () => {
    const html = renderToStaticMarkup(<GovernedBadge state="EXECUTABLE" />);
    expect(html).toContain('Executable');
    expect(html).toContain('cmd-state--ok');
  });

  it('renders authorization-required state and disables execution', () => {
    const command = governed({
      state: 'REQUIRES_AUTHORIZATION',
      requires_authorization: true,
      authorization_action: 'command.workspace_write',
      execution_enabled: false,
    });
    const html = renderToStaticMarkup(
      <GovernedDetail
        command={command}
        argValues={{ path: '', max_chars: '' }}
        onArgChange={() => undefined}
        onExecute={() => undefined}
        executing={false}
        lastResult={null}
      />,
    );
    expect(html).toContain('Authorization required');
    expect(html).toContain('command.workspace_write');
    expect(html).toContain('disabled');
  });

  it('renders the real result payload with governance metadata', () => {
    const command = governed({});
    const html = renderToStaticMarkup(
      <GovernedDetail
        command={command}
        argValues={{ path: 'README.md', max_chars: '' }}
        onArgChange={() => undefined}
        onExecute={() => undefined}
        executing={false}
        lastResult={{
          command: 'workspace_read',
          request_id: 'live-1',
          status: 'success',
          result: { path: 'README.md', content: '# real source' },
          error: null,
          duration_ms: 3.2,
          governance: {
            schema_validated: true,
            permission_action: null,
            executor: 'core_tool_runtime.LlmToolLoop.invoke',
            dispatch_path: 'identical to the LLM tool loop',
          },
        }}
      />,
    );
    expect(html).toContain('success');
    expect(html).toContain('# real source');
    expect(html).toContain('core_tool_runtime.LlmToolLoop.invoke');
  });
});