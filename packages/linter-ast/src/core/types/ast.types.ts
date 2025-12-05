export interface ASTNode {
  type: string;
  text: string;
  line: number;
  children: ASTNode[];
}

export interface ParseResult {
  ast: ASTNode;
  language: string;
  parseTimeMs: number;
}
