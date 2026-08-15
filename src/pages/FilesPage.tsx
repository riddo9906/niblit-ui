import { type FC, useState, useEffect } from 'react';
import FileViewer from '../components/renderers/FileViewer';
import { listFiles, type FileInfo } from '../services/fileBrowser';

const FilesPage: FC = () => {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [currentPath, setCurrentPath] = useState('.');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFiles = async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const fileList = await listFiles(path);
      setFiles(fileList);
      setCurrentPath(path);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles('.');
  }, []);

  const handleFileClick = (file: FileInfo) => {
    if (file.is_dir) {
      loadFiles(file.path);
    } else {
      setSelectedFile(file.path);
    }
  };

  const handleBackClick = () => {
    const parent = currentPath.split('/').slice(0, -1).join('/') || '.';
    loadFiles(parent);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  if (selectedFile) {
    return <FileViewer filePath={selectedFile} onClose={() => setSelectedFile(null)} />;
  }

  return (
    <div className="content">
      <div className="panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          {currentPath !== '.' && (
            <button
              onClick={handleBackClick}
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
              ← Back
            </button>
          )}
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
            {currentPath}
          </span>
        </div>

        {loading && <div style={{ color: 'var(--text-muted)' }}>Loading files...</div>}
        {error && <div style={{ color: 'var(--danger)' }}>{error}</div>}

        {!loading && !error && (
          <div style={{ maxHeight: '60vh', overflow: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--surface2)' }}>
                  <th style={{ border: '1px solid var(--border)', padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: 'var(--text)' }}>
                    Name
                  </th>
                  <th style={{ border: '1px solid var(--border)', padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: 'var(--text)' }}>
                    Size
                  </th>
                  <th style={{ border: '1px solid var(--border)', padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: 'var(--text)' }}>
                    Modified
                  </th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr
                    key={file.path}
                    style={{
                      backgroundColor: file.is_dir ? 'var(--surface2)' : 'var(--surface)',
                      cursor: 'pointer',
                    }}
                    onClick={() => handleFileClick(file)}
                  >
                    <td style={{ border: '1px solid var(--border)', padding: '4px 8px', color: 'var(--text)' }}>
                      <span style={{ marginRight: '6px' }}>{file.is_dir ? '📁' : '📄'}</span>
                      {file.name}
                    </td>
                    <td style={{ border: '1px solid var(--border)', padding: '4px 8px', color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
                      {file.is_dir ? '-' : formatBytes(file.size)}
                    </td>
                    <td style={{ border: '1px solid var(--border)', padding: '4px 8px', color: 'var(--text-dim)', fontSize: '11px' }}>
                      {file.modified}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default FilesPage;