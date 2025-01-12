// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { exec } from "child_process";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "vscode-rain" is now active!');

  let rainPath = vscode.workspace.getConfiguration("rain").get<string>("path", "rain");

  const updateRainPath = () => {
    rainPath = vscode.workspace.getConfiguration("rain").get<string>("path", "rain");
  };

  vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration("rain.path")) {
      updateRainPath();
    }
  });

  const disposable = vscode.commands.registerCommand("vscode-rain.deploy", () => {
    // Execute `rain deploy` with active file path after inputing the stack name
    vscode.window
      .showInputBox({
        prompt: "Enter the stack name",
        placeHolder: "Stack name",
      })
      .then((stackName) => {
        if (stackName) {
          const activeTextEditor = vscode.window.activeTextEditor;
          if (activeTextEditor) {
            const filePath = activeTextEditor.document.fileName;
            vscode.window.showInformationMessage(`Do you want to deploy ${filePath} to stack ${stackName}?`, "Yes", "No").then((selection) => {
              if (selection === "Yes") {
                const terminal = vscode.window.createTerminal(`Rain Deploy: ${stackName}`);
                terminal.sendText(`${rainPath} deploy ${filePath} ${stackName}`);
                terminal.show();
              }
            });
          } else {
            vscode.window.showErrorMessage("No active file found");
          }
        }
      });
  });

  context.subscriptions.push(disposable);

  const rainViewProvider = new RainViewProvider();
  vscode.window.registerTreeDataProvider("vscode-rain-view", rainViewProvider);

  const refreshDisposable = vscode.commands.registerCommand("vscode-rain.refreshView", () => {
    rainViewProvider.refresh();
  });

  context.subscriptions.push(refreshDisposable);

  const deployStackDisposable = vscode.commands.registerCommand("vscode-rain.deployStack", (item: RainItem) => {
    vscode.window.showOpenDialog({
      canSelectMany: false,
      openLabel: 'Select Template File',
      filters: {
        'Templates': ['.yaml', '.yml', '.json']
      }
    }).then((fileUri) => {
      if (fileUri && fileUri[0]) {
        const templateFilePath = fileUri[0].fsPath;
        const terminal = vscode.window.createTerminal(`Rain Deploy: ${item.label}`);
        terminal.sendText(`${rainPath} deploy ${templateFilePath} ${item.label}`);
        terminal.show();
      } else {
        vscode.window.showErrorMessage("Template file path is required");
      }
    });
  });

  context.subscriptions.push(deployStackDisposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}

class RainViewProvider implements vscode.TreeDataProvider<RainItem> {
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
    return this.getRainItems();
  }

  private getRainItems(): Thenable<RainItem[]> {
    return new Promise((resolve, reject) => {
      exec(`${this.rainPath} ls`, (error, stdout, stderr) => {
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

class RainItem extends vscode.TreeItem {
  constructor(label: string, status: string) {
    vscode.window.showInformationMessage(`Stack ${label} is ${status}`);
    super(label);
    this.tooltip = `${label} - ${status}`;
    this.description = status;
    this.contextValue = 'rainItem';
    // Choose the icon based on the status
    // TODO: Add light icons
    // TODO: Make sure to cover all statuses
    switch (status) {
      case "CREATE_COMPLETE":
        this.iconPath = {
          light: vscode.Uri.file(__dirname + "/../resources/pass.svg"),
          dark: vscode.Uri.file(__dirname + "/../resources/pass.svg"),
        };
				break;
      case "REVIEW_IN_PROGRESS":
        this.iconPath = {
          light: vscode.Uri.file(__dirname + "/../resources/info.svg"),
          dark: vscode.Uri.file(__dirname + "/../resources/info.svg"),
        };
				break;
      case "CREATE_IN_PROGRESS":
        this.iconPath = {
          light: vscode.Uri.file(__dirname + "/../resources/info.svg"),
          dark: vscode.Uri.file(__dirname + "/../resources/info.svg"),
        };
				break;
      case "ROLLBACK_COMPLETE":
        this.iconPath = {
          light: vscode.Uri.file(__dirname + "/../resources/error.svg"),
          dark: vscode.Uri.file(__dirname + "/../resources/error.svg"),
        };
				break;
      case "ROLLBACK_IN_PROGRESS":
        this.iconPath = {
          light: vscode.Uri.file(__dirname + "/../resources/error.svg"),
          dark: vscode.Uri.file(__dirname + "/../resources/error.svg"),
        };
				break;
      case "CREATE_FAILED":
        this.iconPath = {
          light: vscode.Uri.file(__dirname + "/../resources/error.svg"),
          dark: vscode.Uri.file(__dirname + "/../resources/error.svg"),
        };
				break;
			default:
				this.iconPath = {
					light: vscode.Uri.file(__dirname + "/../resources/info.svg"),
					dark: vscode.Uri.file(__dirname + "/../resources/info.svg"),
				};
    }
  }
}
