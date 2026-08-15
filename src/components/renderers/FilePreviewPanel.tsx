import type { FC } from 'react';
import type { FileMetadata } from '../../services/fileRenderer';

interface FilePreviewPanelProps {
  metadata: FileMetadata;
}

const FilePreviewPanel: FC<FilePreviewPanelProps> = ({ metadata }) => {
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch {
      return dateStr;
    }
  };

  return (
    <aside
      style={{
        width: '280px',
        borderRight: '1px solid var(--border)',
        padding: '12px',
        overflow: 'auto',
        fontSize: '12px',
        backgroundColor: 'var(--surface)',
      }}
    >
      <h3 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
        File Details
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div>
          <span style={{ color: 'var(--text-dim)' }}>Name:</span>
          <span style={{ color: 'var(--text)', marginLeft: '8px' }}>{metadata.name}</span>
        </div>

        <div>
          <span style={{ color: 'var(--text-dim)' }}>Path:</span>
          <span style={{ color: 'var(--text-muted)', marginLeft: '8px', wordBreak: 'break-all' }}>
            {metadata.path}
          </span>
        </div>

        <div>
          <span style={{ color: 'var(--text-dim)' }}>Extension:</span>
          <span style={{ color: 'var(--text)', marginLeft: '8px' }}>.{metadata.extension}</span>
        </div>

        <div>
          <span style={{ color: 'var(--text-dim)' }}>Type:</span>
          <span style={{ color: 'var(--text)', marginLeft: '8px' }}>{metadata.type_category}</span>
        </div>

        <div>
          <span style={{ color: 'var(--text-dim)' }}>MIME:</span>
          <span style={{ color: 'var(--text)', marginLeft: '8px' }}>{metadata.mime_type}</span>
        </div>

        <div>
          <span style={{ color: 'var(--text-dim)' }}>Size:</span>
          <span style={{ color: 'var(--text)', marginLeft: '8px' }}>{formatBytes(metadata.size)}</span>
        </div>

        <div>
          <span style={{ color: 'var(--text-dim)' }}>Created:</span>
          <span style={{ color: 'var(--text-muted)', marginLeft: '8px' }}>{formatDate(metadata.created)}</span>
        </div>

        <div>
          <span style={{ color: 'var(--text-dim)' }}>Modified:</span>
          <span style={{ color: 'var(--text-muted)', marginLeft: '8px' }}>{formatDate(metadata.modified)}</span>
        </div>

        {metadata.encoding && (
          <div>
            <span style={{ color: 'var(--text-dim)' }}>Encoding:</span>
            <span style={{ color: 'var(--text)', marginLeft: '8px' }}>{metadata.encoding}</span>
          </div>
        )}

        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
          <div style={{ marginBottom: '4px' }}>
            <span style={{ color: 'var(--text-dim)' }}>MD5:</span>
          </div>
          <code
            style={{
              color: 'var(--text-dim)',
              fontSize: '10px',
              wordBreak: 'break-all',
              backgroundColor: 'var(--code-bg)',
              padding: '4px',
              borderRadius: '4px',
              display: 'block',
            }}
          >
            {metadata.hash_md5}
          </code>

          <div style={{ marginTop: '8px', marginBottom: '4px' }}>
            <span style={{ color: 'var(--text-dim)' }}>SHA256:</span>
          </div>
          <code
            style={{
              color: 'var(--text-dim)',
              fontSize: '10px',
              wordBreak: 'break-all',
              backgroundColor: 'var(--code-bg)',
              padding: '4px',
              borderRadius: '4px',
              display: 'block',
            }}
          >
            {metadata.hash_sha256}
          </code>
        </div>
      </div>
    </aside>
  );
};

export default FilePreviewPanel;