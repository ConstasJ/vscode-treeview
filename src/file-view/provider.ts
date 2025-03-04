import * as vscode from 'vscode';
import * as path from 'node:path';
import { FileTreeItem } from './item';

export class FileTreeProvider implements vscode.TreeDataProvider<FileTreeItem>, vscode.TreeDragAndDropController<FileTreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<FileTreeItem | null>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private _onDidChangeDragAndDrop = new vscode.EventEmitter<void>();
    readonly onDidChangeDragAndDrop = this._onDidChangeDragAndDrop.event;

    private rootNodes: FileTreeItem[] = [];

    private nodeMap = new Map<string, FileTreeItem>();
    private fileMap = new Map<string, FileTreeItem>();

    constructor(private context: vscode.ExtensionContext) {
        this.loadTreeData();

        this.dropMimeTypes = ['application/vnd.code.tree.customfiletree'];
        this.dragMimeTypes = ['application/vnd.code.tree.customfiletree'];
    }

    getTreeItem(element: FileTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: FileTreeItem): vscode.ProviderResult<FileTreeItem[]> {
        if (!element) {
            return this.rootNodes;
        }

        return element.children;
    }

    getParent(element: FileTreeItem): vscode.ProviderResult<FileTreeItem> {
        return element.parent;
    }

    public addNode(name: string, parentNode?: FileTreeItem) {
        const id = `node_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

        const newNode = new FileTreeItem(
            id,
            name,
            vscode.TreeItemCollapsibleState.Collapsed,
        );

        if (parentNode) {
            parentNode.children.push(newNode);
            newNode.parent = parentNode;
        } else {
            this.rootNodes.push(newNode);
        }

        this.nodeMap.set(id, newNode);

        this._onDidChangeTreeData.fire(null);

        this.saveTreeData();

        return newNode;
    }

    public removeNode(node: FileTreeItem) {
        if (node.fileUri) {
            this.fileMap.delete(node.fileUri.toString());
        }

        this.nodeMap.delete(node.id);

        if (node.parent) {
            const index = node.parent.children.indexOf(node);
            if (index !== -1) {
                node.parent.children.splice(index, 1);
            }
        } else {
            const index = this.rootNodes.indexOf(node);
            if (index !== -1) {
                this.rootNodes.splice(index, 1);
            }
        }

        this.recursivelyRemoveNodeMapping(node);
        this._onDidChangeTreeData.fire(null);
        this.saveTreeData();
    }

    public recursivelyRemoveNodeMapping(node: FileTreeItem) {
        for (const child of node.children) {
            if (child.fileUri) {
                this.fileMap.delete(child.fileUri.toString());
            }
            this.nodeMap.delete(child.id);

            this.recursivelyRemoveNodeMapping(child);
        }
    }

    public mapNodeToFile(node: FileTreeItem, fileUri: vscode.Uri): void {
        const existingNode = this.fileMap.get(fileUri.toString());
        if (existingNode && existingNode !== node) {
            existingNode.fileUri = undefined;
            existingNode.iconPath = new vscode.ThemeIcon('folder');
            existingNode.command = undefined;
        }

        node.fileUri = fileUri;

        node.iconPath = vscode.ThemeIcon.File;

        node.command = {
            command: 'vscode.open',
            arguments: [fileUri],
            title: 'Open File',
        };

        node.description = path.basename(fileUri.fsPath);

        node.contextValue = 'file';

        this.fileMap.set(fileUri.toString(), node);

        this._onDidChangeTreeData.fire(node);

        this.saveTreeData();
    }

    public renameNode(node: FileTreeItem, newName: string): void {
        node.label = newName;
        node.tooltip = newName;
        this._onDidChangeTreeData.fire(node);
        this.saveTreeData();
    }

    public handleFileDeleted(uri: vscode.Uri): void {
        const node = this.fileMap.get(uri.toString());
        if (node) {
            node.fileUri = undefined;
            node.iconPath = new vscode.ThemeIcon('folder');
            node.command = undefined;
            node.contextValue = 'folder';
            node.description = '';

            this.fileMap.delete(uri.toString());
            this._onDidChangeTreeData.fire(node);
            this.saveTreeData();
        }
    }

    public handleFileRenamed(oldUri: vscode.Uri, newUri: vscode.Uri): void {  
        const node = this.fileMap.get(oldUri.toString());  
        if (node) {  
          this.fileMap.delete(oldUri.toString());  
          node.fileUri = newUri;  
          node.description = path.basename(newUri.fsPath);  
          node.command = {  
            command: 'vscode.open',  
            arguments: [newUri],  
            title: 'Open File'  
          };  
          this.fileMap.set(newUri.toString(), node);  
          this._onDidChangeTreeData.fire(node);  
          this.saveTreeData();  
        }  
      }  

    private serializeTreeData(): any {
        const serializeNode = (node: FileTreeItem): any => {
            return {
                id: node.id,
                label: node.label,
                fileUri: node.fileUri ? node.fileUri.toString() : undefined,
                children: node.children.map(serializeNode),
            };
        };

        return this.rootNodes.map(serializeNode);
    }

    private deserializeTreeData(data: any): FileTreeItem[] {
        const deserializeNode = (nodeData: any, parent?: FileTreeItem): FileTreeItem => {
            const collapsibleState = nodeData.children.length > 0
                ? vscode.TreeItemCollapsibleState.Collapsed
                : vscode.TreeItemCollapsibleState.None;

            const node = new FileTreeItem(
                nodeData.id,
                nodeData.label,
                collapsibleState,
                parent
            );

            if (nodeData.fileUri) {
                const Uri = vscode.Uri.parse(nodeData.fileUri);
                node.fileUri = Uri;
                node.iconPath = vscode.ThemeIcon.File;
                node.command = {
                    command: 'vscode.open',
                    arguments: [Uri],
                    title: 'Open File',
                };
                node.description = path.basename(Uri.fsPath);
                node.contextValue = 'file';
                this.fileMap.set(Uri.toString(), node);
            }

            this.nodeMap.set(node.id, node);

            node.children = nodeData.children.map((childData: any) => deserializeNode(childData, node));
            
            return node;
        };

        return data.map((nodeData: any) => deserializeNode(nodeData));
    }

    private saveTreeData(): void {
        const data = this.serializeTreeData();
        this.context.workspaceState.update('fileTreeData', data);
    }

    private loadTreeData(): void {
        const data = this.context.workspaceState.get<any>('fileTreeData');
        if (data && Array.isArray(data)) {
            this.rootNodes = this.deserializeTreeData(data);
        }
    }

    public moveNode(node: FileTreeItem, targetNode?: FileTreeItem): void {
        if (node.parent) {
            const sourceIndex = node.parent.children.indexOf(node);
            if (sourceIndex !== -1) {
                node.parent.children.splice(sourceIndex, 1);
            }
        } else {
            const rootIndex = this.rootNodes.indexOf(node);
            if (rootIndex !== -1) {
                this.rootNodes.splice(rootIndex, 1);
            }
        }

        if (targetNode) {
            node.parent = targetNode;
            targetNode.children.push(node);
        } else {
            this.rootNodes.push(node);
            node.parent = undefined;
        }

        this._onDidChangeTreeData.fire(null);
        this.saveTreeData();
    }

    dropMimeTypes: string[] = [];
    dragMimeTypes: string[] = [];

    handleDrag(source: readonly FileTreeItem[], dataTransfer: vscode.DataTransfer): void {
        dataTransfer.set('application/vnd.code.tree.customfiletree',
            new vscode.DataTransferItem(source.map(item => item.id)));
    }

    handleDrop(target: FileTreeItem | undefined, dataTransfer: vscode.DataTransfer): void {
        const transferItem = dataTransfer.get('application/vnd.code.tree.customfiletree');
        if (!transferItem) {
            return;
        }
        
        const nodeIds: string[] = transferItem.value;

        for (const nodeId of nodeIds) {
            const node = this.nodeMap.get(nodeId);
            if (node) {
                if (target && (target === node || this.isDescendant(target, node))) {
                    return;
                }

                this.moveNode(node, target);
            }
        }
    }

    private isDescendant(parent: FileTreeItem, potentialChild: FileTreeItem): boolean {
        for (const child of parent.children) {
            if (child === potentialChild || this.isDescendant(child, potentialChild)) {
                return true;
            }
        }
        return false;   
    }
}
