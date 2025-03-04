// src/file-view/provider.ts
import * as vscode from "vscode";
import * as path from "path";
import { FileTreeItem, NodeType } from "./item";

export class FileTreeProvider
    implements
    vscode.TreeDataProvider<FileTreeItem>,
    vscode.TreeDragAndDropController<FileTreeItem> {
    // 拖放支持相关属性
    public readonly dropMimeTypes = ["application/vnd.code.tree.explorer"];
    public readonly dragMimeTypes = ["application/vnd.code.tree.explorer"];

    private _onDidChangeTreeData: vscode.EventEmitter<
        FileTreeItem | undefined | void
    > = new vscode.EventEmitter<FileTreeItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<FileTreeItem | undefined | void> =
        this._onDidChangeTreeData.event;

    private treeData: FileTreeItem[] = [];
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.loadTreeData();
    }

    // 加载存储的树数据
    private loadTreeData(): void {
        const storedData = this.context.globalState.get<any[]>("fileTreeData", []);
        this.treeData = this.deserializeTreeData(storedData);
        this._onDidChangeTreeData.fire();
    }

    // 保存树数据
    private saveTreeData(): void {
        const serializedData = this.serializeTreeData(this.treeData);
        this.context.globalState.update("fileTreeData", serializedData);
    }

    // 序列化树数据
    private serializeTreeData(items: FileTreeItem[]): any[] {
        return items.map((item) => ({
            label: item.label,
            type: item.type,
            filePath: item.filePath,
            children: this.serializeTreeData(item.children),
        }));
    }

    // 反序列化树数据
    private deserializeTreeData(data: any[]): FileTreeItem[] {
        return data.map((item) => {
            const collapsibleState =
                item.type === NodeType.FOLDER
                    ? vscode.TreeItemCollapsibleState.Collapsed
                    : vscode.TreeItemCollapsibleState.None;

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
            vscode.window.showErrorMessage("只能在文件夹下添加文件");
            return;
        }

        const files = await vscode.window.showOpenDialog({
            canSelectMany: false,
            openLabel: "选择文件",
        });

        if (files && files.length > 0) {
            const filePath = files[0].fsPath;
            const fileName = path.basename(filePath);

            // 检查是否已经有同名文件
            const exists = parent.children.some(
                (child) => child.type === NodeType.FILE && child.label === fileName
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

    // 批量添加文件到文件夹
    public async addMultipleFilesToFolder(
        parent: FileTreeItem,
        files: vscode.Uri[]
    ): Promise<void> {
        if (parent.type !== NodeType.FOLDER) {
            vscode.window.showErrorMessage("只能在文件夹下添加文件");
            return;
        }

        let addedCount = 0;
        for (const fileUri of files) {
            try {
                const fileStat = await vscode.workspace.fs.stat(fileUri);
                const isDirectory = fileStat.type === vscode.FileType.Directory;

                if (isDirectory) {
                    // 如果是目录，创建子文件夹
                    const folderName = path.basename(fileUri.fsPath);
                    const folderNode = new FileTreeItem(
                        folderName,
                        NodeType.FOLDER,
                        vscode.TreeItemCollapsibleState.Collapsed
                    );
                    parent.children.push(folderNode);
                    addedCount++;
                } else {
                    // 如果是文件，添加文件
                    const fileName = path.basename(fileUri.fsPath);
                    const exists = parent.children.some(
                        (child) => child.type === NodeType.FILE && child.label === fileName
                    );

                    if (!exists) {
                        const fileNode = new FileTreeItem(
                            fileName,
                            NodeType.FILE,
                            vscode.TreeItemCollapsibleState.None,
                            fileUri.fsPath
                        );
                        parent.children.push(fileNode);
                        addedCount++;
                    }
                }
            } catch (error) {
                console.error(`Error processing ${fileUri.fsPath}:`, error);
            }
        }

        if (addedCount > 0) {
            this.saveTreeData();
            this._onDidChangeTreeData.fire();
            vscode.window.showInformationMessage(`成功添加了 ${addedCount} 个项目`);
        }
    }

    // 从文件夹中移除文件
    public removeFileFromFolder(fileNode: FileTreeItem): void {
        if (fileNode.type !== NodeType.FILE) {
            vscode.window.showErrorMessage("只能移除文件");
            return;
        }

        // 查找文件的父文件夹
        const findParentFolder = (
            searchItem: FileTreeItem,
            items: FileTreeItem[]
        ): FileTreeItem | null => {
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
            parent.children = parent.children.filter((child) => child !== fileNode);
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
            this.treeData = this.treeData.filter((item) => item !== node);
            this.saveTreeData();
            this._onDidChangeTreeData.fire();
            return;
        }

        // 在子节点中查找
        const removeNodeFromChildren = (items: FileTreeItem[]): boolean => {
            for (const item of items) {
                if (item.children.includes(node)) {
                    item.children = item.children.filter((child) => child !== node);
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

    public handleFileDeleted(uri: vscode.Uri): void {
        const fileNode = this.searchFileNode(uri);
        if (fileNode) {
            this.removeFileFromFolder(fileNode);
        }
    }

    private searchFileNode(
        uri: vscode.Uri,
        parentNode?: FileTreeItem
    ): FileTreeItem | null {
        const itemsToSearch = parentNode ? parentNode.children : this.treeData;

        for (const item of itemsToSearch) {
            if (item.type === NodeType.FILE && item.filePath === uri.fsPath) {
                return item;
            } else if (item.type !== NodeType.FILE) {
                const fileNode = this.searchFileNode(uri, item);
                if (fileNode) {
                    return fileNode;
                }
            }
        }

        return null;
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

    // 处理拖入操作
    public async handleDrop(
        target: FileTreeItem | undefined,
        sources: vscode.DataTransfer,
        token: vscode.CancellationToken
    ): Promise<void> {
        const transferItem = sources.get("application/vnd.code.tree.explorer");
        if (!transferItem) {
            return;
        }

        // 处理拖放的 URI 资源（文件或文件夹）
        try {
            const uriList: vscode.Uri[] = (
                JSON.parse(await transferItem.asString()) as Record<string, any>[]
            ).map((uri) => {
                return vscode.Uri.file(uri.path);
            });

            // 如果没有目标节点，则放到根目录
            if (!target) {
                for (const uri of uriList) {
                    if (await this.isDirectory(uri)) {
                        // 不允许拖放目录
                        vscode.window.showInformationMessage("不支持拖放目录");
                    } else {
                        // 如果是文件，提示需要拖到一个文件夹节点
                        vscode.window.showInformationMessage(
                            "请将文件拖到一个文件夹节点上"
                        );
                    }
                }
            } else if (target.type === NodeType.FOLDER) {
                // 拖到文件夹节点上
                let addedCount = 0;
                for (const uri of uriList) {
                    if (await this.isDirectory(uri)) {
                        // 不允许拖放目录
                        await vscode.window.showInformationMessage("不支持拖放目录");
                    } else {
                        // 如果是文件，添加文件到目标文件夹
                        const fileName = path.basename(uri.fsPath);
                        const exists = target.children.some(
                            (child) =>
                                child.type === NodeType.FILE && child.label === fileName
                        );

                        if (exists) {
                            vscode.window.showInformationMessage(
                                `文件 "${fileName}" 已存在于该文件夹中`
                            );
                        } else {
                            // 在添加到新位置前，查找并移除已存在的引用
                            const existingNode = this.findFileNodeByPath(uri.fsPath);
                            if (existingNode) {
                                // 如果在其他位置存在相同的文件引用，先移除它
                                this.removeFileFromTree(existingNode);
                                vscode.window.showInformationMessage(
                                    `文件 "${fileName}" 已从其他位置移动`
                                );
                            }

                            const fileNode = new FileTreeItem(
                                fileName,
                                NodeType.FILE,
                                vscode.TreeItemCollapsibleState.None,
                                uri.fsPath
                            );

                            target.children.push(fileNode);
                            addedCount++;
                        }
                    }
                }

                if (addedCount > 0) {
                    this.saveTreeData();
                    this._onDidChangeTreeData.fire();
                }
            } else {
                // 拖到文件节点上，表现与拖到其父节点上相同
                vscode.window.showInformationMessage("请将拖拽项拖到文件夹节点上");
            }
        } catch (e) {
            console.error(e);
        }
    }

    // 新增：通过文件路径查找文件节点
    private findFileNodeByPath(filePath: string): FileTreeItem | null {
        const searchInNodes = (nodes: FileTreeItem[]): FileTreeItem | null => {
            for (const node of nodes) {
                if (node.type === NodeType.FILE && node.filePath === filePath) {
                    return node;
                }
                if (node.children.length > 0) {
                    const found = searchInNodes(node.children);
                    if (found) {
                        return found;
                    }
                }
            }
            return null;
        };

        return searchInNodes(this.treeData);
    }

    // 新增：从树中删除文件节点
    private removeFileFromTree(node: FileTreeItem): void {
        // 查找文件的父节点
        const findParentFolder = (
            searchItem: FileTreeItem,
            items: FileTreeItem[]
        ): FileTreeItem | null => {
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

        // 如果是顶层节点
        if (this.treeData.includes(node)) {
            this.treeData = this.treeData.filter((item) => item !== node);
            return;
        }

        // 如果有父节点
        const parent = findParentFolder(node, this.treeData);
        if (parent) {
            parent.children = parent.children.filter((child) => child !== node);
        }
    }

    // 拖动源的处理
    public async handleDrag(
        source: readonly FileTreeItem[],
        dataTransfer: vscode.DataTransfer,
        token: vscode.CancellationToken
    ): Promise<void> {
        const uriList = source
            .filter(
                (item) => item.type === NodeType.FOLDER || item.type === NodeType.FILE
            )
            .map((item) =>
                item.filePath ? vscode.Uri.file(item.filePath) : undefined
            )
            .filter((uri) => uri) as vscode.Uri[];

        dataTransfer.set(
            "application/vnd.code.tree.explorer",
            new vscode.DataTransferItem(JSON.stringify(uriList))
        );
    }

    // 辅助方法：检查 URI 是否为目录
    private async isDirectory(uri: vscode.Uri): Promise<boolean> {
        try {
            return (
                (await vscode.workspace.fs.stat(uri)).type === vscode.FileType.Directory
            );
        } catch {
            return false;
        }
    }
}
