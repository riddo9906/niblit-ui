import { type FC, useState, useEffect } from 'react';
import { renderFile, getFilePreview } from '../../services/fileRenderer';
import type { FileMetadata } from '../../services/fileRenderer';
import type { RenderResult } from '../../types/renderers';
import CodeRenderer from './CodeRenderer';
import MarkdownRenderer from './MarkdownRenderer';
import JsonRenderer from './JsonRenderer';
import SpreadsheetRenderer from './SpreadsheetRenderer';
import ImageRenderer from './ImageRenderer';
import PdfRenderer from './PdfRenderer';
import HtmlRenderer from './HtmlRenderer';
import BinaryRenderer from './BinaryRenderer';
import ArchiveRenderer from './ArchiveRenderer';
import DatabaseRenderer from './DatabaseRenderer';
import VideoRenderer from './VideoRenderer';
import AudioRenderer from './AudioRenderer';
import NotebookRenderer from './NotebookRenderer';
import FilePreviewPanel from './FilePreviewPanel';

interface FileViewerProps {
  filePath: string;
  onClose?: () => void;
}

const FileViewer: FC<FileViewerProps> = ({ filePath, onClose }) => {
  const [renderResult, setRenderResult] = useState<RenderResult | null>(null);
  const [metadata, setMetadata] = useState<FileMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadFile = async () => {
      setLoading(true);
      setError(null);
      try {
        const [render, preview] = await Promise.all([
          renderFile(filePath),
          getFilePreview(filePath),
        ]);
        setRenderResult(render);
        if (preview.metadata) {
          setMetadata(preview.metadata);
        } else {
          setError(preview.error || 'Could not load file');
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    };
    loadFile();
  }, [filePath]);

  const renderViewer = () => {
    if (!renderResult) return null;

    const { viewer_type, content } = renderResult;

    switch (viewer_type) {
      case 'code':
        return <CodeRenderer content={content as any} />;
      case 'markdown':
        return <MarkdownRenderer content={content as any} />;
      case 'json':
        return <JsonRenderer content={content as any} />;
      case 'spreadsheet':
        return <SpreadsheetRenderer content={content as any} />;
      case 'image':
        return <ImageRenderer content={content as any} />;
      case 'pdf':
        return <PdfRenderer content={content as any} path={filePath} />;
      case 'html':
        return <HtmlRenderer content={content as any} />;
      case 'binary':
        return <BinaryRenderer content={content as any} />;
      case 'archive':
        return <ArchiveRenderer content={content as any} />;
      case 'database':
        return <DatabaseRenderer content={content as any} />;
      case 'video':
        return <VideoRenderer content={content as any} />;
      case 'audio':
        return <AudioRenderer content={content as any} />;
      case 'notebook':
        return <NotebookRenderer content={content as any} />;
      default:
        return (
          <div style={{ padding: '20px', color: 'var(--text-muted)' }}>
            Unsupported file type: {viewer_type}
          </div>
        );
    }
  };

  return (
    <div className="panel file-viewer" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <header className="file-viewer-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{filePath}</span>
        {onClose && (
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px' }}>
            ✕
          </button>
        )}
      </header>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {metadata && <FilePreviewPanel metadata={metadata} />}
        <main style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
          {loading && <div style={{ color: 'var(--text-muted)' }}>Loading...</div>}
          {error && <div style={{ color: 'var(--danger)' }}>{error}</div>}
          {!loading && !error && renderViewer()}
        </main>
      </div>
    </div>
  );
};

export default FileViewer;