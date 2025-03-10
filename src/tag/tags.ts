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