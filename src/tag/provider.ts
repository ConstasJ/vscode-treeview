import * as vscode from 'vscode';
import { NodeType, TagTreeItem } from './item';
import { Tag, TagManager } from './tags';
import path from 'path';

export class TagTreeProvider implements vscode.TreeDataProvider<TagTreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<TagTreeItem | undefined>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private manager: TagManager;
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.manager = new TagManager(context);
    }

    public getManager(): TagManager {
        return this.manager;
    }

    public addTag(name: string): void {
        this.manager.addTag(name);
        this.refresh();
    }

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    getTreeItem(element: TagTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: TagTreeItem): vscode.ProviderResult<TagTreeItem[]> {
        if (!element) {
            return this.manager.getTags().map(tag => new TagTreeItem(
                tag.name,
                NodeType.TAG,
                vscode.TreeItemCollapsibleState.Collapsed,
                undefined,
                tag
            ));
        } else if (element.type === NodeType.TAG) {
            const files = element.tag?.getFiles();
            return files?.map(uri => {
                const fileName = path.basename(uri.fsPath);
                const fileItem = new TagTreeItem(
                    fileName,
                    NodeType.FILE,
                    vscode.TreeItemCollapsibleState.None,
                    uri.fsPath,
                    element.tag,
                    element
                );
                fileItem.command = {
                    command: 'vscode.open',
                    arguments: [uri],
                    title: 'Open File'
                };
                return fileItem;
            });
        }

        return [];
    }

    getParent(element: TagTreeItem): vscode.ProviderResult<TagTreeItem> {
        return element.parent;
    }
} 