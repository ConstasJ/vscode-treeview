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
