export interface ASTNode {
  type: string;
  text: string;
  line: number;
  children: ASTNode[];
}
