import React, { type FC } from 'react';

interface PdfRendererProps {
  content: unknown;
  path?: string;
}

interface PdfData {
  pages?: Array<{
    page_number: number;
    text?: string;
    thumbnail?: string;
    width?: number;
    height?: number;
  }>;
  text?: string;
  thumbnail?: string;
  page_count?: number;
  filename?: string;
}

const PdfRenderer: FC<PdfRendererProps> = ({ content, path }) => {
  const data = content as PdfData | null;

  if (!data) {
    return <div style={{ color: 'var(--text-muted)' }}>No content to display</div>;
  }

  const filename = data.filename || path?.split('/').pop() || 'PDF Document';

  if (data.pages && data.pages.length > 0) {
    const [activePage, setActivePage] = React.useState(0);
    const page = data.pages[activePage];

    return (
      <div>
        <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {filename} - {data.page_count} pages
          </span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => setActivePage((p) => Math.max(0, p - 1))}
              disabled={activePage === 0}
              style={{
                padding: '4px 8px',
                fontSize: '12px',
                backgroundColor: 'var(--surface2)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                cursor: activePage === 0 ? 'not-allowed' : 'pointer',
                opacity: activePage === 0 ? 0.5 : 1,
              }}
            >
              ← Previous
            </button>
            <span style={{ fontSize: '12px', color: 'var(--text)', padding: '0 8px' }}>
              Page {activePage + 1} of {data.pages.length}
            </span>
            <button
              onClick={() => setActivePage((p) => Math.min(data.pages!.length - 1, p + 1))}
              disabled={activePage === data.pages.length - 1}
              style={{
                padding: '4px 8px',
                fontSize: '12px',
                backgroundColor: 'var(--surface2)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                cursor: activePage === data.pages.length - 1 ? 'not-allowed' : 'pointer',
                opacity: activePage === data.pages.length - 1 ? 0.5 : 1,
              }}
            >
              Next →
            </button>
          </div>
        </div>

        {page.thumbnail && (
          <div style={{ marginBottom: '16px' }}>
            <img
              src={`data:image/png;base64,${page.thumbnail}`}
              alt={`Page ${page.page_number}`}
              style={{ maxWidth: '100%', height: 'auto', border: '1px solid var(--border)', borderRadius: '4px' }}
            />
          </div>
        )}

        {page.text && (
          <div style={{ marginTop: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: 'var(--text)' }}>
              Extracted Text:
            </div>
            <pre
              style={{
                backgroundColor: 'var(--code-bg)',
                padding: '12px',
                borderRadius: '4px',
                overflow: 'auto',
                border: '1px solid var(--border)',
                fontSize: '12px',
                color: 'var(--text)',
                whiteSpace: 'pre-wrap',
              }}
            >
              {page.text}
            </pre>
          </div>
        )}
      </div>
    );
  }

  // Single page or fallback view
  return (
    <div>
      <div style={{ marginBottom: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
        {filename}
        {data.page_count && ` - ${data.page_count} page${data.page_count > 1 ? 's' : ''}`}
      </div>

      {data.thumbnail && (
        <div style={{ marginBottom: '16px' }}>
          <img
            src={`data:image/png;base64,${data.thumbnail}`}
            alt="PDF Thumbnail"
            style={{ maxWidth: '100%', height: 'auto', border: '1px solid var(--border)', borderRadius: '4px' }}
          />
        </div>
      )}

      {data.text && (
        <div style={{ marginTop: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: 'var(--text)' }}>
            Extracted Text:
          </div>
          <pre
            style={{
              backgroundColor: 'var(--code-bg)',
              padding: '12px',
              borderRadius: '4px',
              overflow: 'auto',
              border: '1px solid var(--border)',
              fontSize: '12px',
              color: 'var(--text)',
              whiteSpace: 'pre-wrap',
            }}
          >
            {data.text}
          </pre>
        </div>
      )}
    </div>
  );
};

export default PdfRenderer;