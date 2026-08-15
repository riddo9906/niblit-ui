import type { FC } from 'react';
import type { VideoData } from '../../types/renderers';

interface VideoRendererProps {
  content: VideoData | null;
}

const VideoRenderer: FC<VideoRendererProps> = ({ content }) => {
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
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>📹</div>
        <div style={{ color: 'var(--text)' }}>{data.filename}</div>
        <div style={{ fontSize: '12px', marginTop: '8px' }}>
          Video file too large to preview ({formatBytes(data.size || 0)})
        </div>
      </div>
    );
  }

  if (!data.base64) {
    return <div style={{ color: 'var(--text-muted)' }}>No video data available</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <div style={{ marginBottom: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
        {data.filename} • {formatBytes(data.size || 0)}
      </div>
      <video
        src={`data:${data.mime_type || 'video/mp4'};base64,${data.base64}`}
        controls
        style={{ maxWidth: '100%', maxHeight: 'calc(100vh - 200px)', backgroundColor: 'var(--surface)' }}
      />
    </div>
  );
};

export default VideoRenderer;