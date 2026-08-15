import type { FC } from 'react';
import type { AudioData } from '../../types/renderers';

interface AudioRendererProps {
  content: AudioData | null;
}

const AudioRenderer: FC<AudioRendererProps> = ({ content }) => {
  const data = content;

  if (!data) {
    return <div style={{ color: 'var(--text-muted)' }}>No content to display</div>;
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  if (data.too_large) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎵</div>
        <div style={{ color: 'var(--text)' }}>{data.filename}</div>
        <div style={{ fontSize: '12px', marginTop: '8px' }}>
          Audio file too large to preview ({formatBytes(data.size || 0)})
        </div>
      </div>
    );
  }

  if (!data.base64) {
    return <div style={{ color: 'var(--text-muted)' }}>No audio data available</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <div style={{ marginBottom: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
        {data.filename} • {formatBytes(data.size || 0)}
      </div>
      <audio
        src={`data:${data.mime_type || 'audio/mpeg'};base64,${data.base64}`}
        controls
        style={{ width: '100%', maxWidth: '400px' }}
      />
    </div>
  );
};

export default AudioRenderer;