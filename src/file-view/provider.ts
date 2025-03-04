// src/file-view/provider.ts
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { FileTreeItem, NodeType } from './item';

export class FileTreeProvider implements vscode.TreeDataProvider<FileTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<FileTreeItem | undefined | void> = new vscode.EventEmitter<FileTreeItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<FileTreeItem | undefined | void> = this._onDidChangeTreeData.event;

  private treeData: FileTreeItem[] = [];
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.loadTreeData();
  }

  // 加载存储的树数据
  private loadTreeData(): void {
    const storedData = this.context.globalState.get<any[]>('fileTreeData', []);
    this.treeData = this.deserializeTreeData(storedData);
    this._onDidChangeTreeData.fire();
  }

  // 保存树数据
  private saveTreeData(): void {
    const serializedData = this.serializeTreeData(this.treeData);
    this.context.globalState.update('fileTreeData', serializedData);
  }

  // 序列化树数据
  private serializeTreeData(items: FileTreeItem[]): any[] {
    return items.map(item => ({
      label: item.label,
      type: item.type,
      filePath: item.filePath,
      children: this.serializeTreeData(item.children)
    }));
  }

  // 反序列化树数据
  private deserializeTreeData(data: any[]): FileTreeItem[] {
    return data.map(item => {
      const collapsibleState = item.type === NodeType.FOLDER ? 
        vscode.TreeItemCollapsibleState.Collapsed : 
        vscode.TreeItemCollapsibleState.None;
        
      const treeItem = new FileTreeItem(
        item.label, 
        item.type, 
        collapsibleState,
        item.filePath
      );
      
      treeItem.children = this.deserializeTreeData(item.children);
      return treeItem;
    });
  }

  // 添加文件夹节点
  public addFolderNode(name: string, parent?: FileTreeItem): void {
    const newNode = new FileTreeItem(
      name,
      NodeType.FOLDER,
      vscode.TreeItemCollapsibleState.Collapsed
    );

    if (parent) {
      parent.children.push(newNode);
    } else {
      this.treeData.push(newNode);
    }

    this.saveTreeData();
    this._onDidChangeTreeData.fire();
  }

  // 添加文件到文件夹
  public async addFileToFolder(parent: FileTreeItem): Promise<void> {
    // 只能在文件夹下添加文件
    if (parent.type !== NodeType.FOLDER) {
      vscode.window.showErrorMessage('只能在文件夹下添加文件');
      return;
    }

    const files = await vscode.window.showOpenDialog({
      canSelectMany: false,
      openLabel: '选择文件'
    });

    if (files && files.length > 0) {
      const filePath = files[0].fsPath;
      const fileName = path.basename(filePath);
      
      // 检查是否已经有同名文件
      const exists = parent.children.some(
        child => child.type === NodeType.FILE && child.label === fileName
      );
      
      if (exists) {
        vscode.window.showErrorMessage(`文件 "${fileName}" 已存在于该文件夹中`);
        return;
      }

      const fileNode = new FileTreeItem(
        fileName,
        NodeType.FILE,
        vscode.TreeItemCollapsibleState.None,
        filePath
      );

      parent.children.push(fileNode);
      this.saveTreeData();
      this._onDidChangeTreeData.fire();
    }
  }

  // 从文件夹中移除文件
  public removeFileFromFolder(fileNode: FileTreeItem): void {
    if (fileNode.type !== NodeType.FILE) {
      vscode.window.showErrorMessage('只能移除文件');
      return;
    }

    // 查找文件的父文件夹
    const findParentFolder = (searchItem: FileTreeItem, items: FileTreeItem[]): FileTreeItem | null => {
      for (const item of items) {
        if (item.children.includes(searchItem)) {
          return item;
        }
        const parent = findParentFolder(searchItem, item.children);
        if (parent) {
          return parent;
        }
      }
      return null;
    };

    const parent = findParentFolder(fileNode, this.treeData);
    if (parent) {
      parent.children = parent.children.filter(child => child !== fileNode);
      this.saveTreeData();
      this._onDidChangeTreeData.fire();
    }
  }

  // 重命名节点
  public renameNode(node: FileTreeItem, newName: string): void {
    const oldLabel = node.label;
    const newItem = node.clone();
    newItem.label = newName;
    
    // 查找并替换节点
    const replaceNode = (items: FileTreeItem[]): boolean => {
      for (let i = 0; i < items.length; i++) {
        if (items[i] === node) {
          items[i] = newItem;
          return true;
        }
        if (replaceNode(items[i].children)) {
          return true;
        }
      }
      return false;
    };

    if (replaceNode(this.treeData)) {
      this.saveTreeData();
      this._onDidChangeTreeData.fire();
    }
  }

  // 删除节点
  public removeNode(node: FileTreeItem): void {
    // 直接删除顶层节点
    if (this.treeData.includes(node)) {
      this.treeData = this.treeData.filter(item => item !== node);
      this.saveTreeData();
      this._onDidChangeTreeData.fire();
      return;
    }

    // 在子节点中查找
    const removeNodeFromChildren = (items: FileTreeItem[]): boolean => {
      for (const item of items) {
        if (item.children.includes(node)) {
          item.children = item.children.filter(child => child !== node);
          return true;
        }
        if (removeNodeFromChildren(item.children)) {
          return true;
        }
      }
      return false;
    };

    if (removeNodeFromChildren(this.treeData)) {
      this.saveTreeData();
      this._onDidChangeTreeData.fire();
    }
  }

  // TreeDataProvider 接口实现
  getTreeItem(element: FileTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: FileTreeItem): Thenable<FileTreeItem[]> {
    if (element) {
      return Promise.resolve(element.children);
    }
    return Promise.resolve(this.treeData);
  }

  // 刷新视图
  refresh(): void {
    this._onDidChangeTreeData.fire();
  }
}