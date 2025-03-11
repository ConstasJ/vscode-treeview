// src/extension.ts
import * as vscode from "vscode";
import {
  FileTreeProvider,
  FileTreeItem,
  NodeType as FileNodeType,
} from "./freedom";
import { TagTreeProvider, TagTreeItem, NodeType as TagNodeType } from "./tag";

export function activate(context: vscode.ExtensionContext) {
  // 初始化树视图数据提供者
  const fileTreeProvider = new FileTreeProvider(context);
  const tagTreeProvider = new TagTreeProvider(context);

  // 注册树视图（支持拖放）
  const fileTreeView = vscode.window.createTreeView("file-tree-view", {
    treeDataProvider: fileTreeProvider,
    dragAndDropController: fileTreeProvider,
  });

  const tagTreeView = vscode.window.createTreeView("tag-tree-view", {
    treeDataProvider: tagTreeProvider,
  });

  // 注册命令
  const fileCommands = [
    // 添加文件夹节点
    vscode.commands.registerCommand("customFileManager.addNode", async () => {
      const nodeName = await vscode.window.showInputBox({
        prompt: "输入文件夹名称",
        placeHolder: "新文件夹",
      });

      if (nodeName) {
        fileTreeProvider.addFolderNode(nodeName);
      }
    }),

    // 添加子文件夹节点
    vscode.commands.registerCommand(
      "customFileManager.addChildNode",
      async (node: FileTreeItem) => {
        if (node.type !== FileNodeType.FOLDER) {
          vscode.window.showErrorMessage("只能在文件夹下添加子文件夹");
          return;
        }

        const nodeName = await vscode.window.showInputBox({
          prompt: "输入文件夹名称",
          placeHolder: "新文件夹",
        });

        if (nodeName) {
          fileTreeProvider.addFolderNode(nodeName, node);
        }
      }
    ),

    // 添加文件到文件夹
    vscode.commands.registerCommand(
      "customFileManager.addFile",
      async (node: FileTreeItem) => {
        await fileTreeProvider.addFileToFolder(node);
      }
    ),

    // 从文件夹中移除文件
    vscode.commands.registerCommand(
      "customFileManager.removeFile",
      (node: FileTreeItem) => {
        fileTreeProvider.removeFileFromFolder(node);
      }
    ),

    // 重命名节点
    vscode.commands.registerCommand(
      "customFileManager.renameNode",
      async (node: FileTreeItem) => {
        const newName = await vscode.window.showInputBox({
          prompt: "输入新名称",
          placeHolder: node.label,
          value: node.label,
        });

        if (newName && newName !== node.label) {
          fileTreeProvider.renameNode(node, newName);
        }
      }
    ),

    // 删除节点
    vscode.commands.registerCommand(
      "customFileManager.deleteNode",
      async (node: FileTreeItem) => {
        const confirmation = await vscode.window.showWarningMessage(
          `确定要删除${
            node.type === FileNodeType.FOLDER ? "文件夹" : "文件"
          } "${node.label}" 吗?`,
          { modal: true },
          "确定"
        );

        if (confirmation === "确定") {
          fileTreeProvider.removeNode(node);
        }
      }
    ),
  ];

  const manager = tagTreeProvider.getManager();

  const tagCommands = [
    vscode.commands.registerCommand("customTagManager.addTag", async () => {
      const tagName = await vscode.window.showInputBox({
        prompt: "输入标签名称",
        placeHolder: "新标签",
      });

      if (tagName) {
        const exists = manager.getTag(tagName);
        if (exists) {
          vscode.window.showErrorMessage("标签已存在");
          return;
        }
        manager.addTag(tagName);
        tagTreeProvider.refresh();
      }
    }),
    vscode.commands.registerCommand(
      "customTagManager.addFile",
      async (node: TagTreeItem) => {
        if (node.type !== TagNodeType.TAG || !node.tag) {
          vscode.window.showErrorMessage("只能在标签下添加文件");
          return;
        }

        const files = await vscode.window.showOpenDialog({
          canSelectMany: true,
          openLabel: "选择文件",
          filters: {
            所有文件: ["*"],
          },
        });

        if (files && files.length > 0) {
          let addedCount = 0;

          for (const fileUri of files) {
            try {
              const stat = await vscode.workspace.fs.stat(fileUri);
              if (stat.type === vscode.FileType.Directory) {
                continue;
              }

              if (manager.addFileToTag(node.tag.name, fileUri)) {
                addedCount++;
              }
            } catch (e) {
              console.error(e);
            }
          }

          if (addedCount > 0) {
            tagTreeProvider.refresh();
            vscode.window.showInformationMessage(
              `成功添加 ${addedCount} 个文件`
            );
          }
        }
      }
    ),
    vscode.commands.registerCommand(
      "customTagManager.removeFile",
      async (node: TagTreeItem) => {
        if (node.type !== TagNodeType.FILE || !node.tag || !node.filePath) {
          vscode.window.showErrorMessage("只能移除标签中的文件");
          return;
        }

        const fileUri = vscode.Uri.file(node.filePath);
        const success = manager.removeFileFromTag(node.tag.name, fileUri);

        if (success) {
          tagTreeProvider.refresh();
          vscode.window.showInformationMessage("成功移除文件");
        }
      }
    ),
    vscode.commands.registerCommand(
      "customTagManager.renameTag",
      async (node: TagTreeItem) => {
        if (node.type !== TagNodeType.TAG || !node.tag) {
          vscode.window.showErrorMessage("只能重命名标签");
          return;
        }

        const oldName = node.tag.name;
        const newName = await vscode.window.showInputBox({
          prompt: "输入新名称",
          placeHolder: oldName,
          value: oldName,
        });

        if (newName && newName !== oldName) {
          const success = manager.renameTag(oldName, newName);
          if (success) {
            tagTreeProvider.refresh();
            vscode.window.showInformationMessage(`标签已重命名为 "${newName}"`);
          } else {
            vscode.window.showErrorMessage(
              `无法重命名标签，"${newName}" 可能已存在`
            );
          }
        }
      }
    ),
    vscode.commands.registerCommand(
      "customTagMAnager.deleteTag",
      async (node: TagTreeItem) => {
        if (node.type !== TagNodeType.TAG || !node.tag) {
          vscode.window.showErrorMessage("只能删除标签节点");
          return;
        }

        const confirm = await vscode.window.showWarningMessage(
          `确定要删除标签 "${node.tag.name}" 及其所有关联文件吗?`,
          { modal: true },
          "确定"
        );

        if (confirm === "确定") {
          const success = manager.removeTag(node.tag.name);
          if (success) {
            tagTreeProvider.refresh();
            vscode.window.showInformationMessage(
              `标签 "${node.tag.name}" 已删除`
            );
          }
        }
      }
    ),
    vscode.commands.registerCommand(
      "customTagManager.addTagToFile",
      async (uri: vscode.Uri) => {
        const existTags = manager.getTags();
        const items = existTags.map((tag) => ({
          label: tag.name,
          picked: false,
        }));
        const selectedTags = await vscode.window.showQuickPick(
          items,
          {
            canPickMany: true,
            placeHolder: "选择标签",
          }
        );
        if (selectedTags && selectedTags.length > 0) {
          for (const tag of selectedTags) {
            manager.addFileToTag(tag.label, uri);
          }
          tagTreeProvider.refresh();
        }
      }
    )
  ];

  const fileChangeWatcher = vscode.workspace.createFileSystemWatcher("**/*");

  fileChangeWatcher.onDidDelete((uri) => {
    fileTreeProvider.handleFileDeleted(uri);
  });

  context.subscriptions.push(
    ...fileCommands,
    fileTreeView,
    fileChangeWatcher,
    ...tagCommands
  );
}

export function deactivate() {}
