import type { FC } from 'react';
import type { BinaryData } from '../../types/renderers';

interface BinaryRendererProps {
  content: BinaryData | null;
}

const BinaryRenderer: FC<BinaryRendererProps> = ({ content }) => {
  const data = content;

  if (!data) {
    return <div style={{ color: 'var(--text-muted)' }}>No content to display</div>;
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <div>
      <div style={{ marginBottom: '12px', display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
        <span>Size: {formatBytes(data.size || 0)}</span>
        {data.mime_type && <span>MIME: {data.mime_type}</span>}
      </div>

      {data.hex_dump && (
        <div>
          <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: 'var(--text)' }}>
            Hex Dump:
          </div>
          <pre
            style={{
              backgroundColor: 'var(--code-bg)',
              padding: '12px',
              borderRadius: '4px',
              overflow: 'auto',
              border: '1px solid var(--border)',
              fontSize: '11px',
              fontFamily: 'var(--mono)',
              color: 'var(--text)',
            }}
          >
            <code>{data.hex_dump}</code>
          </pre>
        </div>
      )}

      {data.preview && (
        <div style={{ marginTop: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: 'var(--text)' }}>
            Text Preview:
          </div>
          <pre
            style={{
              backgroundColor: 'var(--code-bg)',
              padding: '12px',
              borderRadius: '4px',
              overflow: 'auto',
              border: '1px solid var(--border)',
              fontSize: '12px',
              fontFamily: 'var(--mono)',
              color: 'var(--text)',
            }}
          >
            <code>{data.preview}</code>
          </pre>
        </div>
      )}
    </div>
  );
};

export default BinaryRenderer;