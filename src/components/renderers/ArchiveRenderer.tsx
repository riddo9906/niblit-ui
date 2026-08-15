import { type FC, useState } from 'react';
import type { ArchiveData, ArchiveNode } from '../../types/renderers';

interface ArchiveRendererProps {
  content: ArchiveData | null;
}

const ArchiveRenderer: FC<ArchiveRendererProps> = ({ content }) => {
  const data = content;
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

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

  const togglePath = (path: string) => {
    setExpandedPaths((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const renderTree = (tree: ArchiveNode[] | ArchiveNode | undefined, path = ''): JSX.Element | null => {
    if (!tree || typeof tree !== 'object') return null;

    if (Array.isArray(tree)) {
      return (
        <ul style={{ margin: '4px 0', paddingLeft: '20px', listStyle: 'none' }}>
          {tree.map((item, i) => (
            <li key={i}>{renderTreeNode(item, path ? `${path}.${i}` : `${i}`)}</li>
          ))}
        </ul>
      );
    }

    return renderTreeNode(tree as ArchiveNode, path);
  };

  const renderTreeNode = (node: ArchiveNode, path: string): JSX.Element => {
    const isExpanded = expandedPaths.has(path);

    return (
      <div style={{ fontFamily: 'var(--mono)', fontSize: '12px' }}>
        <span
          style={{ color: 'var(--text)', cursor: 'pointer' }}
          onClick={() => togglePath(path)}
        >
          {isExpanded ? '▼' : '▶'} {node.is_dir ? '📁' : '📄'} {node.path}
        </span>
        {node.size !== undefined && !node.is_dir && (
          <span style={{ color: 'var(--text-muted)' }}> ({formatBytes(node.size)})</span>
        )}
        {isExpanded && node.children && (
          <div style={{ paddingLeft: '20px' }}>{renderTree(node.children, path)}</div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div style={{ marginBottom: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
        <span>
          Type: {data.archive_type?.toUpperCase() || 'Archive'} | Files: {data.file_count || 0}
        </span>
        {data.total_size !== undefined && <span> | Total Size: {formatBytes(data.total_size)}</span>}
      </div>

      {data.tree && (
        <div style={{ border: '1px solid var(--border)', borderRadius: '4px', padding: '8px', maxHeight: '500px', overflow: 'auto' }}>
          {renderTree(Array.isArray(data.tree) ? data.tree : [data.tree])}
        </div>
      )}

      {data.files && !data.tree && (
        <div style={{ maxHeight: '500px', overflow: 'auto', border: '1px solid var(--border)', borderRadius: '4px' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--surface2)' }}>
                <th style={{ border: '1px solid var(--border)', padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: 'var(--text)' }}>
                  Path
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
              {data.files.map((file) => (
                <tr key={file.path} style={{ backgroundColor: file.is_dir ? 'var(--surface2)' : 'var(--surface)' }}>
                  <td style={{ border: '1px solid var(--border)', padding: '4px 8px', color: 'var(--text)' }}>
                    {file.is_dir ? '📁' : '📄'} {file.path}
                  </td>
                  <td style={{ border: '1px solid var(--border)', padding: '4px 8px', color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
                    {file.is_dir ? '-' : formatBytes(file.size)}
                  </td>
                  <td style={{ border: '1px solid var(--border)', padding: '4px 8px', color: 'var(--text-dim)', fontSize: '11px' }}>
                    {file.modified || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ArchiveRenderer;