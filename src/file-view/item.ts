// src/file-view/item.ts
import * as vscode from 'vscode';
import * as path from 'path';

export enum NodeType {
  FOLDER = 'folder',
  FILE = 'file'
}

export class FileTreeItem extends vscode.TreeItem {
  // 增加 type 属性以区分文件和文件夹
  constructor(
    public label: string,
    public readonly type: NodeType,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly filePath?: string, // 对于文件类型，存储真实文件路径
    public children: FileTreeItem[] = []
  ) {
    super(label, collapsibleState);
    
    // 设置图标和contextValue
    this.contextValue = type;
    
    if (type === NodeType.FOLDER) {
      this.iconPath = new vscode.ThemeIcon('folder');
    } else {
      this.iconPath = new vscode.ThemeIcon('file');
      // 如果是文件且有路径，可以设置命令以打开该文件
      if (filePath) {
        this.command = {
          command: 'vscode.open',
          arguments: [vscode.Uri.file(filePath)],
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