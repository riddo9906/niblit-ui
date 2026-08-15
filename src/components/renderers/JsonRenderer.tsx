import { type FC, useState } from 'react';
import type { JsonData } from '../../types/renderers';

interface JsonRendererProps {
  content: unknown;
}

const JsonRenderer: FC<JsonRendererProps> = ({ content }) => {
  const data = content as JsonData | null;
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  if (!data) {
    return <div style={{ color: 'var(--text-muted)' }}>No content to display</div>;
  }

  const toggleKey = (key: string) => {
    setExpandedKeys((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const renderValue = (value: unknown, path: string = 'root'): JSX.Element => {
    if (value === null) {
      return <span style={{ color: 'var(--danger)' }}>null</span>;
    }

    if (typeof value === 'boolean') {
      return <span style={{ color: 'var(--success)' }}>{String(value)}</span>;
    }

    if (typeof value === 'number') {
      return <span style={{ color: 'var(--info)' }}>{value}</span>;
    }

    if (typeof value === 'string') {
      return <span style={{ color: 'var(--warning)' }}>"{value}"</span>;
    }

    if (Array.isArray(value)) {
      const isExpanded = expandedKeys.has(path);
      return (
        <span>
          <span style={{ color: 'var(--text)', cursor: 'pointer' }} onClick={() => toggleKey(path)}>
            {isExpanded ? '▼' : '▶'} Array({value.length})
          </span>
          {isExpanded && (
            <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
              {value.map((item, i) => (
                <li key={i}>{renderValue(item, `${path}[${i}]`)}</li>
              ))}
            </ul>
          )}
        </span>
      );
    }

    if (typeof value === 'object' && value !== null) {
      const isExpanded = expandedKeys.has(path);
      const entries = Object.entries(value as Record<string, unknown>);
      return (
        <span>
          <span style={{ color: 'var(--text)', cursor: 'pointer' }} onClick={() => toggleKey(path)}>
            {isExpanded ? '▼' : '▶'} Object({entries.length} keys)
          </span>
          {isExpanded && (
            <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
              {entries.map(([k, v]) => (
                <li key={k}>
                  <span style={{ color: 'var(--info)' }}>"{k}"</span>: {renderValue(v, `${path}.${k}`)}
                </li>
              ))}
            </ul>
          )}
        </span>
      );
    }

    return <span>{String(value)}</span>;
  };

  const renderWithSyntaxHighlighting = (jsonStr: string): JSX.Element[] => {
    const lines: JSX.Element[] = [];

    jsonStr.split('\n').forEach((line, i) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//')) return;

      const indent = line.search(/\S/);

      const displayLine = (
        <div key={i} style={{ paddingLeft: `${indent * 4}px`, fontFamily: 'var(--mono)', fontSize: '12px' }}>
          <span style={{ color: 'var(--text-dim)' }}>{i + 1}</span>
          <span> </span>
          <span dangerouslySetInnerHTML={{ __html: highlightJsonValue(trimmed) }} />
        </div>
      );
      lines.push(displayLine);
    });
    return lines;
  };

  const highlightJsonValue = (text: string): string => {
    return text
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"([^"]+)"\s*:/g, '<span style="color: var(--info)">"$1"</span>:')
      .replace(/:\s*"([^"]*)"$/g, ': <span style="color: var(--warning)">"$1"</span>')
      .replace(/:\s*(true|false)$/g, ': <span style="color: var(--success)">$1</span>')
      .replace(/:\s*(null)$/g, ': <span style="color: var(--danger)">$1</span>')
      .replace(/:\s*(-?\d+\.?\d*)$/g, ': <span style="color: var(--info)">$1</span>');
  };

  return (
    <div>
      {data.tree ? (
        <div style={{ color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: '12px' }}>{renderValue(data.tree)}</div>
      ) : data.raw ? (
        <pre style={{ backgroundColor: 'var(--code-bg)', padding: '12px', borderRadius: '4px', overflow: 'auto', border: '1px solid var(--border)' }}>
          <code>
            {renderWithSyntaxHighlighting(data.raw).map((line) => line)}
          </code>
        </pre>
      ) : (
        <div style={{ color: 'var(--text-muted)' }}>No JSON content available</div>
      )}
    </div>
  );
};

export default JsonRenderer;