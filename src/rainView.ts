import * as vscode from "vscode";
import { exec } from "child_process";
import * as rainCommand from "./rainCommand";

export class RainViewProvider implements vscode.TreeDataProvider<RainItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<RainItem | undefined | void> = new vscode.EventEmitter<RainItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<RainItem | undefined | void> = this._onDidChangeTreeData.event;

  private rainPath: string = "rain";

  constructor() {
    this.updateRainPath();
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("rain.path")) {
        this.updateRainPath();
      }
    });
  }

  private updateRainPath() {
    this.rainPath = vscode.workspace.getConfiguration("rain").get<string>("path", "rain");
  }

  getTreeItem(element: RainItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: RainItem): Thenable<RainItem[]> {
    if (element === undefined) {
      return Promise.resolve([new RainRoot("STACK LIST", vscode.TreeItemCollapsibleState.Expanded, "ListGroup")]);
    }
    vscode.window.showInformationMessage("Getting rain items");
    return this.getRainItems();
  }

  private getRainItems(): Thenable<RainItem[]> {
    return new Promise((resolve, reject) => {
      exec(rainCommand.get("ls", [], []), (error, stdout, stderr) => {
        if (error) {
          vscode.window.showErrorMessage(`Error: ${stderr}`);
          reject([]);
          return;
        }

        const items = stdout
          .split("\n")
          .slice(1)
          .filter((line) => line)
          .map((line) => {
            const [stackName, status] = line.split(": ");
            return new RainItem(stackName, status);
          });
        resolve(items);
      });
    });
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }
}

export class RainRoot extends vscode.TreeItem {
  constructor(label: string, collapsibleState: vscode.TreeItemCollapsibleState, contextValue: string) {
    super(label, collapsibleState);
    this.contextValue = contextValue;
  }
}

export class RainItem extends vscode.TreeItem {
  constructor(label: string, status: string) {
    vscode.window.showInformationMessage(`Stack ${label} is ${status}`);
    super(label);
    this.tooltip = `${label} - ${status}`;
    this.description = status;
    this.contextValue = "rainItem";
    switch (status) {
      case "CREATE_COMPLETE":
      case "UPDATE_COMPLETE":
      case "IMPORT_COMPLETE":
        this.iconPath = {
          light: vscode.Uri.file(__dirname + "/../resources/light/pass.svg"),
          dark: vscode.Uri.file(__dirname + "/../resources/dark/pass.svg"),
        };
        break;
      case "CREATE_IN_PROGRESS":
      case "DELETE_IN_PROGRESS":
      case "REVIEW_IN_PROGRESS":
      case "UPDATE_IN_PROGRESS":
      case "IMPORT_IN_PROGRESS":
        this.iconPath = {
          light: vscode.Uri.file(__dirname + "/../resources/light/info.svg"),
          dark: vscode.Uri.file(__dirname + "/../resources/dark/info.svg"),
        };
        break;
      case "CREATE_FAILED":
      case "DELETE_FAILED":
      case "ROLLBACK_FAILED":
      case "ROLLBACK_COMPLETE":
      case "ROLLBACK_IN_PROGRESS":
      case "UPDATE_COMPLETE_CLEANUP_IN_PROGRESS":
      case "UPDATE_FAILED":
      case "UPDATE_ROLLBACK_COMPLETE":
      case "UPDATE_ROLLBACK_COMPLETE_CLEANUP_IN_PROGRESS":
      case "UPDATE_ROLLBACK_FAILED":
      case "UPDATE_ROLLBACK_IN_PROGRESS":
      case "IMPORT_ROLLBACK_IN_PROGRESS":
      case "IMPORT_ROLLBACK_FAILED":
      case "IMPORT_ROLLBACK_COMPLETE":
        this.iconPath = {
          light: vscode.Uri.file(__dirname + "/../resources/light/error.svg"),
          dark: vscode.Uri.file(__dirname + "/../resources/dark/error.svg"),
        };
        break;
      default:
        this.iconPath = {
          light: vscode.Uri.file(__dirname + "/../resources/light/info.svg"),
          dark: vscode.Uri.file(__dirname + "/../resources/dark/info.svg"),
        };
    }
  }
}
