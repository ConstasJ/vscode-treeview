import * as vscode from 'vscode';
import { FileTreeProvider } from './file-view';

export function activate(context: vscode.ExtensionContext) {
	const fileTreeProvider = new FileTreeProvider(context);

    const fileTreeView = vscode.window.createTreeView('file-tree-view', {
        treeDataProvider: fileTreeProvider,
        showCollapseAll: true,
        canSelectMany: false,
        dragAndDropController: fileTreeProvider,
    });

    const fileSystemWatcher = vscode.workspace.createFileSystemWatcher('**/*');

    fileSystemWatcher.onDidDelete(uri => {
        fileTreeProvider.handleFileDeleted(uri);
    });

    const commands = [
        vscode.commands.registerCommand('customFileManager.addNode', async () => {  
            const nodeName = await vscode.window.showInputBox({  
              prompt: '输入节点名称',  
              placeHolder: '新节点'  
            });  
            
            if (nodeName) {  
              fileTreeProvider.addNode(nodeName);  
            }  
          }),  
      
          // 映射文件到节点  
          vscode.commands.registerCommand('customFileManager.mapToFile', async (node) => {  
            const fileUris = await vscode.window.showOpenDialog({  
              canSelectFiles: true,  
              canSelectFolders: false,  
              canSelectMany: false  
            });  
            
            if (fileUris && fileUris.length > 0) {  
              fileTreeProvider.mapNodeToFile(node, fileUris[0]);  
            }  
          }),
          vscode.commands.registerCommand('customFileManager.deleteNode', async (node) => {
            const confirmation = await vscode.window.showWarningMessage(
              `确定要删除节点 "${node.label}" 吗?`,
              { modal: true },
              '确定'
            );
            
            if (confirmation === '确定') {
              fileTreeProvider.removeNode(node);
            }
          }),
          
          vscode.commands.registerCommand('customFileManager.renameNode', async (node) => {
            const newName = await vscode.window.showInputBox({
              prompt: '输入新的节点名称',
              placeHolder: node.label,
              value: node.label
            });
            
            if (newName && newName !== node.label) {
              fileTreeProvider.renameNode(node, newName);
            }
          }),
          
          vscode.commands.registerCommand('customFileManager.addChildNode', async (node) => {
            const nodeName = await vscode.window.showInputBox({
              prompt: '输入子节点名称',
              placeHolder: '新子节点'
            });
            
            if (nodeName) {
              fileTreeProvider.addNode(nodeName, node);
            }
          }),
      
          // 添加标签  
        //   vscode.commands.registerCommand('customFileManager.addTag', async () => {  
        //     const tagName = await vscode.window.showInputBox({  
        //       prompt: '输入标签名称',  
        //       placeHolder: '新标签'  
        //     });  
            
        //     if (tagName) {  
        //       tagTreeProvider.addTag(tagName);  
        //     }  
        //   }),  
      
          // 为文件添加标签  
        //   vscode.commands.registerCommand('customFileManager.tagFile', async (fileItem) => {  
        //     const availableTags = tagTreeProvider.getAllTags();  
        //     const selectedTag = await vscode.window.showQuickPick(availableTags, {  
        //       placeHolder: '选择标签'  
        //     });  
            
        //     if (selectedTag && fileItem.fileUri) {  
        //       tagTreeProvider.addFileToTag(selectedTag, fileItem.fileUri);  
        //     }  
        //   }),
    ];

    context.subscriptions.push(...commands, fileTreeView, fileSystemWatcher,
        vscode.workspace.onDidRenameFiles(event => {
            for (const { oldUri, newUri } of event.files) {
                fileTreeProvider.handleFileRenamed(oldUri, newUri);
            }
        })
    );
    
}

export function deactivate() {}
