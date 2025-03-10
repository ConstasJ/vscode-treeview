// src/extension.ts
import * as vscode from 'vscode';
import { FileTreeProvider, FileTreeItem, NodeType } from './freedom';
import { TagTreeProvider } from './tag/provider';

export function activate(context: vscode.ExtensionContext) {
  // 初始化树视图数据提供者
  const fileTreeProvider = new FileTreeProvider(context);
  const tagTreeProvider = new TagTreeProvider(context);
  
  // 注册树视图（支持拖放）
  const fileTreeView = vscode.window.createTreeView('file-tree-view', {
    treeDataProvider: fileTreeProvider,
    dragAndDropController: fileTreeProvider
  });

  const tagTreeView = vscode.window.createTreeView('tag-tree-view', {
    treeDataProvider: tagTreeProvider
  });
  
  // 注册命令
  const fileCommands = [
    // 添加文件夹节点
    vscode.commands.registerCommand('customFileManager.addNode', async () => {
      const nodeName = await vscode.window.showInputBox({
        prompt: '输入文件夹名称',
        placeHolder: '新文件夹'
      });
      
      if (nodeName) {
        fileTreeProvider.addFolderNode(nodeName);
      }
    }),
    
    // 添加子文件夹节点
    vscode.commands.registerCommand('customFileManager.addChildNode', async (node: FileTreeItem) => {
      if (node.type !== NodeType.FOLDER) {
        vscode.window.showErrorMessage('只能在文件夹下添加子文件夹');
        return;
      }
      
      const nodeName = await vscode.window.showInputBox({
        prompt: '输入文件夹名称',
        placeHolder: '新文件夹'
      });
      
      if (nodeName) {
        fileTreeProvider.addFolderNode(nodeName, node);
      }
    }),
    
    // 添加文件到文件夹
    vscode.commands.registerCommand('customFileManager.addFile', async (node: FileTreeItem) => {
      await fileTreeProvider.addFileToFolder(node);
    }),
    
    // 从文件夹中移除文件
    vscode.commands.registerCommand('customFileManager.removeFile', (node: FileTreeItem) => {
      fileTreeProvider.removeFileFromFolder(node);
    }),
    
    // 重命名节点
    vscode.commands.registerCommand('customFileManager.renameNode', async (node: FileTreeItem) => {
      const newName = await vscode.window.showInputBox({
        prompt: '输入新名称',
        placeHolder: node.label,
        value: node.label
      });
      
      if (newName && newName !== node.label) {
        fileTreeProvider.renameNode(node, newName);
      }
    }),
    
    // 删除节点
    vscode.commands.registerCommand('customFileManager.deleteNode', async (node: FileTreeItem) => {
      const confirmation = await vscode.window.showWarningMessage(
        `确定要删除${node.type === NodeType.FOLDER ? '文件夹' : '文件'} "${node.label}" 吗?`,
        { modal: true },
        '确定'
      );
      
      if (confirmation === '确定') {
        fileTreeProvider.removeNode(node);
      }
    })
  ];

  const tagCommands = [
    vscode.commands.registerCommand('customTagManager.addTag', async () => {
      const tagName = await vscode.window.showInputBox({
        prompt: '输入标签名称',
        placeHolder: '新标签'
      });

      if (tagName) {
        const exists = tagTreeProvider.getManager().getTag(tagName);
        if (exists) {
          vscode.window.showErrorMessage('标签已存在');
          return;
        }
        tagTreeProvider.getManager().addTag(tagName);
        tagTreeProvider.refresh();
      }
    }),
  ]

  const fileChangeWatcher = vscode.workspace.createFileSystemWatcher('**/*');

  fileChangeWatcher.onDidDelete(uri => {
    fileTreeProvider.handleFileDeleted(uri);
  });
  
  context.subscriptions.push(...fileCommands, fileTreeView, fileChangeWatcher);
}

export function deactivate() {}