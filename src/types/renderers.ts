// Shared TypeScript types for file renderers

// File metadata interface
export interface FileMetadata {
  path: string;
  name: string;
  extension: string;
  size: number;
  created: string;
  modified: string;
  mime_type: string;
  encoding: string | null;
  hash_md5: string;
  hash_sha256: string;
  is_binary: boolean;
  type_category: string;
}

// Code renderer types
export interface CodeData {
  language?: string;
  lines?: string[];
  tokens?: unknown;
}

// Markdown renderer types
export interface MarkdownData {
  raw?: string;
  body?: string;
  frontmatter?: string | null;
}

// PDF renderer types
export interface PdfPage {
  page_number: number;
  text?: string;
  thumbnail?: string;
  width?: number;
  height?: number;
}

export interface PdfData {
  pages?: PdfPage[];
  text?: string;
  thumbnail?: string;
  page_count?: number;
  filename?: string;
}

// Spreadsheet renderer types
export interface SpreadsheetCell {
  [key: string]: unknown;
}

export interface SpreadsheetSheet {
  name: string;
  rows: SpreadsheetCell[][];
  row_count: number;
  col_count: number;
}

export interface SpreadsheetData {
  sheets?: SpreadsheetSheet[];
  headers?: string[];
  rows?: SpreadsheetCell[][];
}

// Image renderer types
export interface ImageData {
  base64?: string;
  mime_type?: string;
  width?: number;
  height?: number;
  alt?: string;
}

// HTML renderer types
export interface HtmlData {
  raw?: string;
  title?: string;
  doctype?: string;
}

// JSON renderer types
export interface JsonData {
  tree?: unknown;
  raw?: string;
  path?: string;
}

// Audio renderer types
export interface AudioData {
  filename?: string;
  base64?: string;
  mime_type?: string;
  size?: number;
  too_large?: boolean;
}

// Video renderer types
export interface VideoData {
  filename?: string;
  base64?: string;
  mime_type?: string;
  size?: number;
  too_large?: boolean;
}

// Archive renderer types
export interface ArchiveNode {
  path: string;
  size?: number;
  is_dir: boolean;
  children?: ArchiveNode[];
}

export interface ArchiveData {
  archive_type?: string;
  file_count?: number;
  total_size?: number;
  files?: Array<{
    path: string;
    size: number;
    modified?: string;
    is_dir?: boolean;
  }>;
  tree?: ArchiveNode[] | ArchiveNode;
}

// Database renderer types
export interface DatabaseColumn {
  name: string;
  type: string;
  nullable?: boolean;
  default?: string;
  primary_key?: boolean;
}

export interface DatabaseTable {
  name: string;
  sql?: string;
  columns?: DatabaseColumn[];
  row_count?: number;
}

export interface DatabaseData {
  db_type?: string;
  database?: string;
  tables?: DatabaseTable[];
  schema?: Record<string, unknown>;
}

// Binary renderer types
export interface BinaryData {
  size?: number;
  mime_type?: string;
  hex_dump?: string;
  preview?: string;
}

// Notebook renderer types
export interface NotebookOutput {
  output_type: string;
  text?: string | string[];
  data?: Record<string, unknown>;
}

export interface NotebookCell {
  cell_type: string;
  source: string;
  outputs?: NotebookOutput[];
  execution_count: number | null;
}

export interface NotebookData {
  filename?: string;
  cells?: NotebookCell[];
  cell_count?: number;
  metadata?: Record<string, unknown>;
}

// Render result type
export interface RenderResult<T = unknown> {
  success: boolean;
  content: T;
  mime_type: string;
  viewer_type: string;
  error?: string;
  metadata?: FileMetadata | null;
}