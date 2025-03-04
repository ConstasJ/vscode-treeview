import * as vscode from 'vscode';

/**
 * represents a node in the file tree view.
 */
export class FileTreeItem extends vscode.TreeItem {
    public readonly id: string;

    public children: FileTreeItem[] = [];

    public parent?: FileTreeItem;

    public fileUri?: vscode.Uri;

    constructor(
        id: string,
        public label: string,
        collapsibleState: vscode.TreeItemCollapsibleState,
        parent?: FileTreeItem,
    ) {
        super(label, collapsibleState);
        this.id = id;
        this.parent = parent;

        this.iconPath = vscode.ThemeIcon.Folder;
        this.contextValue = 'folder';

        this.tooltip = label;
    }
}
