// src/file-view/item.ts
import * as vscode from 'vscode';
import * as path from 'path';

export enum NodeType {
  FOLDER = 'folder',
  FILE = 'file'
}

export class FileTreeItem extends vscode.TreeItem {
  constructor(
    public label: string,
    public readonly type: NodeType,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly filePath?: string,
    public children: FileTreeItem[] = []
  ) {
    super(label, collapsibleState);
    
    this.contextValue = type;
    
    if (type === NodeType.FOLDER) {
      this.iconPath = new vscode.ThemeIcon('folder');
    } else {
      this.iconPath = new vscode.ThemeIcon('file');
      
      // 对于文件类型，设置 resourceUri 和打开文件的命令
      if (filePath) {
        this.resourceUri = vscode.Uri.file(filePath);
        this.command = {
          command: 'vscode.open',
          arguments: [this.resourceUri],
          title: '打开文件'
        };
      }
    }
  }

  // 克隆一个节点（用于重命名等操作）
  clone(): FileTreeItem {
    return new FileTreeItem(
      this.label,
      this.type,
      this.collapsibleState,
      this.filePath,
      this.children.map(child => child.clone())
    );
  }
}