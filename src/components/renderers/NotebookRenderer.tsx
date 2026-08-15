import { type FC } from 'react';
import type { NotebookData, NotebookOutput } from '../../types/renderers';

interface NotebookRendererProps {
  content: NotebookData | null;
}

const NotebookRenderer: FC<NotebookRendererProps> = ({ content }) => {
  const data = content;

  if (!data) {
    return <div style={{ color: 'var(--text-muted)' }}>No content to display</div>;
  }

  const renderOutput = (output: NotebookOutput, index: number): JSX.Element => {
    if (output.output_type === 'stream' && output.text) {
      const text = Array.isArray(output.text) ? output.text.join('') : output.text;
      return (
        <pre key={index} style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
          {text}
        </pre>
      );
    }

    if (output.output_type === 'execute_result' && output.data?.['text/plain']) {
      return (
        <pre key={index} style={{ margin: 0, color: 'var(--success)' }}>
          {Array.isArray(output.data['text/plain']) ? output.data['text/plain'].join('') : String(output.data['text/plain'])}
        </pre>
      );
    }

    if (output.output_type === 'display_data' && output.data) {
      if (output.data['text/html']) {
        const html = Array.isArray(output.data['text/html']) ? output.data['text/html'].join('') : String(output.data['text/html']);
        return (
          <div key={index} dangerouslySetInnerHTML={{ __html: html }} />
        );
      }
      if (output.data['text/plain']) {
        return (
          <pre key={index} style={{ margin: 0 }}>
            {Array.isArray(output.data['text/plain']) ? output.data['text/plain'].join('') : String(output.data['text/plain'])}
          </pre>
        );
      }
    }

    return <pre key={index} style={{ margin: 0 }}>Output</pre>;
  };

  return (
    <div>
      <div style={{ marginBottom: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
        {data.filename} • {data.cell_count} cells
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {data.cells?.map((cell, i) => (
          <div
            key={i}
            style={{
              border: '1px solid var(--border)',
              borderRadius: '8px',
              backgroundColor: 'var(--surface)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '6px 10px',
                fontSize: '11px',
                fontWeight: 600,
                backgroundColor: cell.cell_type === 'code' ? 'var(--surface2)' : 'var(--code-bg)',
                color: cell.cell_type === 'code' ? 'var(--text-muted)' : 'var(--info)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>{cell.cell_type === 'code' ? '💻' : '📝'}</span>
              <span>{cell.cell_type.toUpperCase()}</span>
              {cell.execution_count !== null && (
                <span style={{ color: 'var(--text-dim)', marginLeft: 'auto' }}>
                  In: [{cell.execution_count}]
                </span>
              )}
            </div>
            <div style={{ padding: '10px', fontSize: '12px', fontFamily: 'var(--mono)' }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'var(--code-text)' }}>
                {cell.source || '(empty)'}
              </pre>
            </div>
            {cell.outputs && cell.outputs.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border)' }}>
                {cell.outputs.map((output, oi) => renderOutput(output, oi))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotebookRenderer;