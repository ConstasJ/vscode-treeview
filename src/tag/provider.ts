import * as vscode from 'vscode';
import { NodeType, TagTreeItem } from './item';
import { Tag, TagManager } from './tags';

export class TagTreeProvider implements vscode.TreeDataProvider<TagTreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<TagTreeItem | undefined>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private manager = TagManager.getInstance();

    constructor() {}

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
            ));
        } else {
            return element.children;
        }
    }

    getParent(element: TagTreeItem): vscode.ProviderResult<TagTreeItem> {
        return element.parent;
    }
} 