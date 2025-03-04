import * as vscode from 'vscode';

export class Tag {
    public name: string;
    private fileUris: vscode.Uri[] = [];

    constructor(name: string) {
        this.name = name;
    }

    public addFile(uri: vscode.Uri) {
        this.fileUris.push(uri);
    }

    public removeFile(uri: vscode.Uri) {
        this.fileUris = this.fileUris.filter(fileUri => fileUri.fsPath !== uri.fsPath);
    }
}

export class TagManager {
    private static instance: TagManager;
    private tags: Map<string, Tag> = new Map();
    private constructor() {}

    public static getInstance(): TagManager {
        if (!TagManager.instance) {
            TagManager.instance = new TagManager();
        }
        return TagManager.instance;
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

    public addTag(name: string) {
        if (!this.tags.has(name)) {
            this.tags.set(name, new Tag(name));
        }
    }

    public removeTag(name: string) {
        this.tags.delete(name);
    }
}