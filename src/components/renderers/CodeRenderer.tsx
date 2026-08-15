import type { FC } from 'react';
import type { CodeData } from '../../types/renderers';

interface CodeRendererProps {
  content: unknown;
}

const CodeRenderer: FC<CodeRendererProps> = ({ content }) => {
  const data = content as CodeData | null;

  if (!data) {
    return <div style={{ color: 'var(--text-muted)' }}>No content to display</div>;
  }

  const { language = 'text', lines = [] } = data;

  return (
    <div style={{ fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--code-text)' }}>
      <div style={{ marginBottom: '8px', color: 'var(--text-muted)', fontSize: '11px' }}>
        Language: {language}
      </div>
      <pre style={{ backgroundColor: 'var(--code-bg)', padding: '12px', borderRadius: '4px', overflow: 'auto', border: '1px solid var(--border)' }}>
        <code>
          {lines.map((line, i) => (
            <div key={i} style={{ display: 'flex', minHeight: '18px' }}>
              <span style={{ color: 'var(--text-dim)', marginRight: '16px', userSelect: 'none' }}>{i + 1}</span>
              <span>{line}</span>
            </div>
          ))}
        </code>
      </pre>
    </div>
  );
};

export default CodeRenderer;