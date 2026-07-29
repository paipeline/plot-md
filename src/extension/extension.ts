import type MarkdownIt from "markdown-it";
import * as vscode from "vscode";
import {
  DEFAULT_REGISTRY,
  parseTemplateRegistryJson,
  serializeDefaultRegistry,
  type TemplateRegistry,
} from "../core/registry";
import { validateSemanticMarkdown } from "../core/validation";
import { semanticMarkdownPlugin } from "../renderer/plugin";

const REGISTRY_DIRECTORY = ".semantic-markdown";
const REGISTRY_FILENAME = "templates.json";

class RegistryStore implements vscode.Disposable {
  private currentRegistry: TemplateRegistry = DEFAULT_REGISTRY;
  private watcher: vscode.FileSystemWatcher | undefined;
  private readonly disposables: vscode.Disposable[] = [];

  public constructor(private readonly output: vscode.OutputChannel) {}

  public get current(): TemplateRegistry {
    return this.currentRegistry;
  }

  public async start(): Promise<void> {
    await this.reloadForWorkspace();
    this.disposables.push(
      vscode.workspace.onDidChangeWorkspaceFolders(async () => this.reloadForWorkspace()),
      vscode.workspace.onDidGrantWorkspaceTrust(async () => this.reloadForWorkspace()),
    );
  }

  public async reloadForWorkspace(): Promise<void> {
    this.watcher?.dispose();
    this.watcher = undefined;

    const folder = getSupportedWorkspaceFolder(false);
    if (!vscode.workspace.isTrusted || !folder) {
      this.currentRegistry = DEFAULT_REGISTRY;
      this.output.appendLine("Project registry disabled: workspace is untrusted or not a supported single-root local workspace.");
      return;
    }

    await this.reloadFromFolder(folder, false);
    const pattern = new vscode.RelativePattern(folder, `${REGISTRY_DIRECTORY}/${REGISTRY_FILENAME}`);
    this.watcher = vscode.workspace.createFileSystemWatcher(pattern);
    this.disposables.push(this.watcher);
    this.watcher.onDidCreate(() => this.reloadFromFolder(folder, true), undefined, this.disposables);
    this.watcher.onDidChange(() => this.reloadFromFolder(folder, true), undefined, this.disposables);
    this.watcher.onDidDelete(() => {
      this.currentRegistry = DEFAULT_REGISTRY;
      this.output.appendLine("Project registry removed; using built-in templates.");
    }, undefined, this.disposables);
  }

  public async reloadFromFolder(folder: vscode.WorkspaceFolder, notify: boolean): Promise<boolean> {
    const uri = registryUri(folder);
    try {
      const bytes = await vscode.workspace.fs.readFile(uri);
      const parsed = parseTemplateRegistryJson(new TextDecoder().decode(bytes));
      if (!parsed.ok) {
        this.output.appendLine(`Rejected ${uri.toString()}: ${parsed.errors.join(" ")}`);
        if (notify) {
          void vscode.window.showWarningMessage(
            "Plot.md kept the last valid template registry. Fix templates.json, then close and reopen Preview.",
          );
        }
        return false;
      }
      this.currentRegistry = parsed.value;
      this.output.appendLine(`Loaded ${uri.toString()}.`);
      if (notify) {
        void vscode.window.showInformationMessage(
          "Plot.md templates updated. Close and reopen Markdown Preview to apply the new renderer snapshot.",
        );
      }
      return true;
    } catch (error) {
      if (isFileNotFound(error)) {
        this.currentRegistry = DEFAULT_REGISTRY;
        this.output.appendLine("No project registry found; using built-in templates.");
        return true;
      }
      this.output.appendLine(`Failed to read ${uri.toString()}: ${String(error)}`);
      return false;
    }
  }

  public dispose(): void {
    this.watcher?.dispose();
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }
}

function isFileNotFound(error: unknown): boolean {
  return error instanceof vscode.FileSystemError && error.code === "FileNotFound";
}

function registryUri(folder: vscode.WorkspaceFolder): vscode.Uri {
  return vscode.Uri.joinPath(folder.uri, REGISTRY_DIRECTORY, REGISTRY_FILENAME);
}

function getSupportedWorkspaceFolder(showErrors: boolean): vscode.WorkspaceFolder | undefined {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length !== 1) {
    if (showErrors) {
      void vscode.window.showErrorMessage("Plot.md currently requires one local workspace folder.");
    }
    return undefined;
  }
  if (folders[0].uri.scheme !== "file") {
    if (showErrors) {
      void vscode.window.showErrorMessage("Plot.md does not initialize remote or virtual workspaces yet.");
    }
    return undefined;
  }
  return folders[0];
}

async function initializeProject(store: RegistryStore): Promise<void> {
  if (!vscode.workspace.isTrusted) {
    await vscode.window.showErrorMessage("Trust this workspace before enabling project templates.");
    return;
  }
  const folder = getSupportedWorkspaceFolder(true);
  if (!folder) {
    return;
  }

  const directory = vscode.Uri.joinPath(folder.uri, REGISTRY_DIRECTORY);
  const target = registryUri(folder);
  await vscode.workspace.fs.createDirectory(directory);

  try {
    const existing = await vscode.workspace.fs.readFile(target);
    const parsed = parseTemplateRegistryJson(new TextDecoder().decode(existing));
    if (parsed.ok) {
      await vscode.window.showInformationMessage("Plot.md is already initialized. Existing templates.json was not changed.");
      await store.reloadFromFolder(folder, false);
      return;
    }

    const action = await vscode.window.showWarningMessage(
      `Existing templates.json is invalid: ${parsed.errors[0]}`,
      { modal: true },
      "Back up and recreate",
    );
    if (action !== "Back up and recreate") {
      return;
    }
    const backup = vscode.Uri.joinPath(
      directory,
      `templates.invalid-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
    );
    await vscode.workspace.fs.rename(target, backup, { overwrite: false });
  } catch (error) {
    if (!isFileNotFound(error)) {
      throw error;
    }
  }

  await vscode.workspace.fs.writeFile(target, new TextEncoder().encode(serializeDefaultRegistry()));
  await store.reloadFromFolder(folder, false);
  const document = await vscode.workspace.openTextDocument(target);
  await vscode.window.showTextDocument(document, { preview: false });
  await vscode.window.showInformationMessage("Created .semantic-markdown/templates.json with safe Linear-style defaults.");
}

async function openPreview(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== "markdown") {
    await vscode.window.showErrorMessage("Open a Markdown file before opening Plot.md Preview.");
    return;
  }
  if (editor.document.isUntitled) {
    await vscode.window.showErrorMessage("Save this Markdown document before opening Preview.");
    return;
  }
  await vscode.commands.executeCommand("markdown.showPreviewToSide");
}

async function validateCurrentFile(
  collection: vscode.DiagnosticCollection,
  registry: TemplateRegistry,
): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== "markdown") {
    await vscode.window.showErrorMessage("Open a Markdown file before running Plot.md validation.");
    return;
  }

  const document = editor.document;
  const result = validateSemanticMarkdown(document.getText(), registry);
  const diagnostics = result.diagnostics.map((item) => {
    const range = new vscode.Range(
      document.positionAt(item.range.startUtf16),
      document.positionAt(item.range.endUtf16Exclusive),
    );
    const severity = item.severity === "error"
      ? vscode.DiagnosticSeverity.Error
      : vscode.DiagnosticSeverity.Warning;
    const value = new vscode.Diagnostic(range, item.message, severity);
    value.code = item.code;
    value.source = "semantic-markdown";
    return value;
  });
  collection.set(document.uri, diagnostics);

  const errors = result.diagnostics.filter((item) => item.severity === "error").length;
  const warnings = result.diagnostics.length - errors;
  if (result.diagnostics.length === 0) {
    await vscode.window.showInformationMessage(`Plot.md: valid (${result.nodes.length} directive${result.nodes.length === 1 ? "" : "s"}).`);
  } else {
    await vscode.window.showWarningMessage(`Plot.md found ${errors} error${errors === 1 ? "" : "s"} and ${warnings} warning${warnings === 1 ? "" : "s"}.`);
  }
}

async function openCustomizationGuide(context: vscode.ExtensionContext): Promise<void> {
  const guide = vscode.Uri.joinPath(context.extensionUri, "skills", "customize-semantic-markdown", "SKILL.md");
  const folder = getSupportedWorkspaceFolder(false);
  if (folder) {
    const path = registryUri(folder).fsPath;
    await vscode.env.clipboard.writeText(path);
    void vscode.window.showInformationMessage("Opened the customization guide and copied the project registry path.");
  }
  const document = await vscode.workspace.openTextDocument(guide);
  await vscode.window.showTextDocument(document, { preview: false });
}

export async function activate(context: vscode.ExtensionContext): Promise<{ extendMarkdownIt(md: MarkdownIt): MarkdownIt }> {
  const output = vscode.window.createOutputChannel("Plot.md");
  const diagnostics = vscode.languages.createDiagnosticCollection("semantic-markdown");
  const store = new RegistryStore(output);
  await store.start();

  context.subscriptions.push(
    output,
    diagnostics,
    store,
    vscode.commands.registerCommand("semanticMarkdown.initializeProject", () => initializeProject(store)),
    vscode.commands.registerCommand("semanticMarkdown.openPreview", openPreview),
    vscode.commands.registerCommand("semanticMarkdown.validateCurrentFile", () => validateCurrentFile(diagnostics, store.current)),
    vscode.commands.registerCommand("semanticMarkdown.openCustomizationGuide", () => openCustomizationGuide(context)),
    vscode.workspace.onDidChangeTextDocument((event) => diagnostics.delete(event.document.uri)),
  );

  return {
    extendMarkdownIt(md: MarkdownIt): MarkdownIt {
      return semanticMarkdownPlugin(md, { getRegistry: () => store.current });
    },
  };
}

export function deactivate(): void {}
