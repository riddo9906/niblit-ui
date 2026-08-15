import { type FC, useState } from 'react';
import type { HtmlData } from '../../types/renderers';

interface HtmlRendererProps {
  content: HtmlData | null;
}

const HtmlRenderer: FC<HtmlRendererProps> = ({ content }) => {
  const data = content;
  const [showRaw, setShowRaw] = useState(false);

  if (!data) {
    return <div style={{ color: 'var(--text-muted)' }}>No content to display</div>;
  }

  const { raw = '', title, doctype } = data;

  return (
    <div>
      <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button
          onClick={() => setShowRaw(!showRaw)}
          style={{
            padding: '4px 12px',
            fontSize: '12px',
            backgroundColor: 'var(--surface2)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          {showRaw ? 'Show Preview' : 'Show Raw HTML'}
        </button>
        {title && <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Title: {title}</span>}
        {doctype && <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Doctype: {doctype}</span>}
      </div>

      {showRaw ? (
        <pre
          style={{
            backgroundColor: 'var(--code-bg)',
            padding: '12px',
            borderRadius: '4px',
            overflow: 'auto',
            border: '1px solid var(--border)',
            fontSize: '12px',
            color: 'var(--text)',
          }}
        >
          <code>{raw}</code>
        </pre>
      ) : (
        <iframe
          title="HTML Preview"
          srcDoc={raw}
          style={{
            width: '100%',
            height: 'calc(100vh - 200px)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            backgroundColor: 'var(--surface)',
          }}
          sandbox="allow-scripts allow-same-origin"
        />
      )}
    </div>
  );
};

export default HtmlRenderer;