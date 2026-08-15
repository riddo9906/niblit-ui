import { type FC, useState } from 'react';
import type { DatabaseData } from '../../types/renderers';

interface DatabaseRendererProps {
  content: unknown;
}

const DatabaseRenderer: FC<DatabaseRendererProps> = ({ content }) => {
  const data = content as DatabaseData | null;
  const [activeTable, setActiveTable] = useState<string | null>(null);

  if (!data) {
    return <div style={{ color: 'var(--text-muted)' }}>No content to display</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
        <span>Database Type: {data.db_type?.toUpperCase() || 'SQLite'}</span>
        {data.database && <span> | Database: {data.database}</span>}
      </div>

      {data.tables && data.tables.length > 0 && (
        <div>
          <div style={{ marginBottom: '12px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {data.tables.map((table) => (
              <button
                key={table.name}
                onClick={() => setActiveTable(table.name)}
                style={{
                  padding: '4px 12px',
                  fontSize: '12px',
                  backgroundColor: activeTable === table.name ? 'var(--primary)' : 'var(--surface2)',
                  color: activeTable === table.name ? 'var(--on-primary)' : 'var(--text)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                {table.name} ({table.row_count || 0} rows)
              </button>
            ))}
          </div>

          {activeTable && (
            <div style={{ border: '1px solid var(--border)', borderRadius: '4px', padding: '8px' }}>
              {data.tables
                .filter((t) => t.name === activeTable)
                .map((table) => (
                  <div key={table.name}>
                    <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: 'var(--text)' }}>
                      {table.name} Schema
                    </div>

                    {table.sql && (
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>CREATE TABLE:</div>
                        <pre
                          style={{
                            backgroundColor: 'var(--code-bg)',
                            padding: '8px',
                            borderRadius: '4px',
                            overflow: 'auto',
                            fontSize: '11px',
                            fontFamily: 'var(--mono)',
                            color: 'var(--text)',
                          }}
                        >
                          <code>{table.sql}</code>
                        </pre>
                      </div>
                    )}

                    {table.columns && table.columns.length > 0 && (
                      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ backgroundColor: 'var(--surface2)' }}>
                            <th style={{ border: '1px solid var(--border)', padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: 'var(--text)' }}>
                              Column
                            </th>
                            <th style={{ border: '1px solid var(--border)', padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: 'var(--text)' }}>
                              Type
                            </th>
                            <th style={{ border: '1px solid var(--border)', padding: '6px 8px', textAlign: 'center', fontWeight: 600, color: 'var(--text)' }}>
                              Nullable
                            </th>
                            <th style={{ border: '1px solid var(--border)', padding: '6px 8px', textAlign: 'center', fontWeight: 600, color: 'var(--text)' }}>
                              Primary Key
                            </th>
                            <th style={{ border: '1px solid var(--border)', padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: 'var(--text)' }}>
                              Default
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {table.columns.map((col) => (
                            <tr key={col.name}>
                              <td style={{ border: '1px solid var(--border)', padding: '4px 8px', color: 'var(--info)', fontFamily: 'var(--mono)' }}>
                                {col.name}
                              </td>
                              <td style={{ border: '1px solid var(--border)', padding: '4px 8px', color: 'var(--text)', fontFamily: 'var(--mono)' }}>
                                {col.type}
                              </td>
                              <td style={{ border: '1px solid var(--border)', padding: '4px 8px', textAlign: 'center', color: 'var(--text-dim)' }}>
                                {col.nullable ? 'Yes' : 'No'}
                              </td>
                              <td style={{ border: '1px solid var(--border)', padding: '4px 8px', textAlign: 'center', color: 'var(--text)' }}>
                                {col.primary_key ? '✓' : ''}
                              </td>
                              <td style={{ border: '1px solid var(--border)', padding: '4px 8px', color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
                                {col.default || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {!data.tables && data.schema && (
        <div style={{ border: '1px solid var(--border)', borderRadius: '4px', padding: '8px' }}>
          <pre style={{ fontSize: '12px', fontFamily: 'var(--mono)', color: 'var(--text)' }}>
            <code>{JSON.stringify(data.schema, null, 2)}</code>
          </pre>
        </div>
      )}
    </div>
  );
};

export default DatabaseRenderer;