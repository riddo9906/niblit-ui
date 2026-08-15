import type { FC } from 'react';
import type { ImageData } from '../../types/renderers';

interface ImageRendererProps {
  content: ImageData | null;
}

const ImageRenderer: FC<ImageRendererProps> = ({ content }) => {
  const data = content;

  if (!data) {
    return <div style={{ color: 'var(--text-muted)' }}>No content to display</div>;
  }

  if (!data.base64) {
    return <div style={{ color: 'var(--text-muted)' }}>No image data available</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <div
        style={{
          maxWidth: '100%',
          maxHeight: 'calc(100vh - 200px)',
          overflow: 'auto',
          border: '1px solid var(--border)',
          borderRadius: '4px',
          padding: '8px',
          backgroundColor: 'var(--surface)',
        }}
      >
        <img
          src={`data:${data.mime_type || 'image/png'};base64,${data.base64}`}
          alt={data.alt || 'Rendered image'}
          style={{
            maxWidth: '100%',
            height: 'auto',
            display: 'block',
          }}
        />
      </div>

      {(data.width !== undefined || data.height !== undefined) && (
        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {data.width !== undefined && `Width: ${data.width}px`}
          {data.width !== undefined && data.height !== undefined && ' × '}
          {data.height !== undefined && `Height: ${data.height}px`}
        </div>
      )}
    </div>
  );
};

export default ImageRenderer;