import { type FC, useState } from 'react';
import type { SpreadsheetData } from '../../types/renderers';

interface SpreadsheetRendererProps {
  content: SpreadsheetData | null;
}

const SpreadsheetRenderer: FC<SpreadsheetRendererProps> = ({ content }) => {
  const data = content;

  if (!data) {
    return <div style={{ color: 'var(--text-muted)' }}>No content to display</div>;
  }

  // Excel-like sheets view
  if (data.sheets && data.sheets.length > 0) {
    const [activeSheet, setActiveSheet] = useState(0);
    const sheet = data.sheets[activeSheet];

    return (
      <div>
        <div style={{ marginBottom: '12px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {data.sheets.map((s, i) => (
            <button
              key={s.name}
              onClick={() => setActiveSheet(i)}
              style={{
                padding: '4px 12px',
                fontSize: '12px',
                backgroundColor: activeSheet === i ? 'var(--primary)' : 'var(--surface2)',
                color: activeSheet === i ? 'var(--on-primary)' : 'var(--text)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              {s.name} ({s.row_count} rows)
            </button>
          ))}
        </div>

        <div style={{ overflow: 'auto', border: '1px solid var(--border)', borderRadius: '4px' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--surface2)' }}>
                {sheet.rows[0]?.map((cell, i) => (
                  <th
                    key={i}
                    style={{
                      border: '1px solid var(--border)',
                      padding: '6px 8px',
                      textAlign: 'left',
                      fontWeight: 600,
                      color: 'var(--text)',
                      minWidth: '100px',
                    }}
                  >
                    {String(cell || '')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sheet.rows.slice(1).map((row, ri) => (
                <tr key={ri} style={{ backgroundColor: ri % 2 === 0 ? 'var(--surface)' : 'var(--surface2)' }}>
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      style={{
                        border: '1px solid var(--border)',
                        padding: '4px 8px',
                        color: 'var(--text)',
                      }}
                    >
                      {cell === null || cell === undefined ? '' : String(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
          {sheet.row_count} rows × {sheet.col_count} columns
        </div>
      </div>
    );
  }

  // CSV-like view
  if (data.rows && data.rows.length > 0) {
    return (
      <div>
        <div style={{ overflow: 'auto', border: '1px solid var(--border)', borderRadius: '4px' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--surface2)' }}>
                {(data.headers || data.rows[0] || []).map((header, i) => (
                  <th
                    key={i}
                    style={{
                      border: '1px solid var(--border)',
                      padding: '6px 8px',
                      textAlign: 'left',
                      fontWeight: 600,
                      color: 'var(--text)',
                    }}
                  >
                    {String(header)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows
                .slice(data.headers ? 0 : 1)
                .map((row, ri) => (
                  <tr key={ri} style={{ backgroundColor: ri % 2 === 0 ? 'var(--surface)' : 'var(--surface2)' }}>
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        style={{
                          border: '1px solid var(--border)',
                          padding: '4px 8px',
                          color: 'var(--text)',
                        }}
                      >
                        {cell === null || cell === undefined ? '' : String(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
          {data.rows.length} rows × {data.rows[0]?.length || 0} columns
        </div>
      </div>
    );
  }

  return <div style={{ color: 'var(--text-muted)' }}>No spreadsheet data available</div>;
};

export default SpreadsheetRenderer;