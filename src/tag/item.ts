import * as vscode from 'vscode';
import { Tag } from './tags';

export enum NodeType {
    TAG = 'tag',
    FILE = 'file'
}

export class TagTreeItem extends vscode.TreeItem {
    constructor(
        public label: string,
        public readonly type: NodeType,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly filePath?: string,
        public readonly tag?: Tag,
        public readonly parent?: TagTreeItem,
        public children: TagTreeItem[] = []
    ) {
        super(label, collapsibleState);

        this.contextValue = type;

        if (type === NodeType.TAG) {
            this.iconPath = new vscode.ThemeIcon('symbol-keyword');
        } else {
            this.iconPath = new vscode.ThemeIcon('file');

            if (filePath) {
                this.resourceUri = vscode.Uri.file(filePath);
                this.command = {
                    command: 'vscode.open',
                    arguments: [this.resourceUri],
                    title: 'Open File'
                };
            }
        }
    }

    clone(): TagTreeItem {
        return new TagTreeItem(
            this.label,
            this.type,
            this.collapsibleState,
            this.filePath,
            this.tag,
            this.parent,
            this.children.map(child => child.clone())
        );
    }
}