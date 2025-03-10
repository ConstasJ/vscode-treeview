import * as vscode from 'vscode';

export class Tag {
    public name: string;
    private fileUris: Set<vscode.Uri> = new Set();

    constructor(name: string) {
        this.name = name;
    }

    public addFile(uri: vscode.Uri): boolean {
        const uriString = uri.toString();
        const exists = [...this.fileUris].some(existingUri => existingUri.toString() === uriString);

        if(!exists) {
            this.fileUris.add(uri);
            return true;
        }
        return false;
    }

    public removeFile(uri: vscode.Uri): boolean {
        const uriString = uri.toString();
        const fileToRemove = [...this.fileUris].find(existingUri => existingUri.toString() === uriString);

        if(fileToRemove) {
            this.fileUris.delete(fileToRemove);
            return true;
        }
        return false;
    }

    public hasFile(uri: vscode.Uri): boolean {
        const uriString = uri.toString();
        return [...this.fileUris].some(existingUri => existingUri.toString() === uriString);
    }

    public getFiles(): vscode.Uri[] {
        return [...this.fileUris];
    }
}

export class TagManager {
    private tags: Map<string, Tag> = new Map();
    private readonly storageKey = 'tags';
    private context: vscode.ExtensionContext;

    public constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.loadTagData();
    }
    
    public async loadTags() {
        const tags = await vscode.workspace.getConfiguration('tag').get<string[]>('tags');
        if (tags) {
            tags.forEach(tag => {
                this.tags.set(tag, new Tag(tag));
            });
        }
    }

    public getTags(): Tag[] {
        return Array.from(this.tags.values());
    }

    public getTag(name: string): Tag | undefined {
        return this.tags.get(name);
    }

    public addTag(name: string): Tag | undefined {
        if (this.tags.has(name)) {
            return undefined;
        }

        const tag = new Tag(name);
        this.tags.set(name, tag);
        this.saveTagData();
        return tag;
    }

    public removeTag(name: string) {
        const result = this.tags.delete(name);
        if (result) {
            this.saveTagData();
        }
        return result;
    }

    public addFileToTag(tagName: string, uri: vscode.Uri): boolean {
        const tag = this.getTag(tagName);
        if (!tag) {
            return false;
        }

        const result = tag.addFile(uri);
        if (result) {
            this.saveTagData();
        }
        return result;
    }

    public removeFileFromTag(tagName: string, uri: vscode.Uri): boolean {
        const tag = this.getTag(tagName);
        if (!tag) {
            return false;
        }

        const result = tag.removeFile(uri);
        if (result) {
            this.saveTagData();
        }
        return result;
    }

    public loadTagData(): void {
        try {
            const data = this.context.globalState.get<Tag[]>(this.storageKey);
            if (data) {
                data.forEach(tag => {
                    this.tags.set(tag.name, new Tag(tag.name));
                });
            }
        } catch (e) {
            console.error(e);
        }
    }

    public saveTagData() {
        try {
            const tags = Array.from(this.tags.values());
            this.context.globalState.update(this.storageKey, tags);
        } catch(e) {
            console.error(e);
        }
    }
}