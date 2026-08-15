import type { FC } from 'react';
import type { MarkdownData } from '../../types/renderers';

interface MarkdownRendererProps {
  content: unknown;
}

const MarkdownRenderer: FC<MarkdownRendererProps> = ({ content }) => {
  const data = content as MarkdownData | null;

  if (!data) {
    return <div style={{ color: 'var(--text-muted)' }}>No content to display</div>;
  }

  const { body = '', frontmatter } = data;

  const renderMarkdown = (text: string): JSX.Element[] => {
    let html = text
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>');

    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    html = html.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code className="$1">$2</code></pre>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    return html.split('\n').map((line, i) => (
      <p key={i} dangerouslySetInnerHTML={{ __html: line || '&nbsp;' }} />
    ));
  };

  return (
    <div style={{ color: 'var(--text)', lineHeight: 1.6 }}>
      {frontmatter && (
        <div style={{ backgroundColor: 'var(--surface2)', padding: '8px', borderRadius: '4px', marginBottom: '12px', fontSize: '12px', border: '1px solid var(--border)' }}>
          <strong>Frontmatter:</strong>
          <pre style={{ margin: 0 }}>{frontmatter}</pre>
        </div>
      )}
      <div>{renderMarkdown(body)}</div>
    </div>
  );
};

export default MarkdownRenderer;