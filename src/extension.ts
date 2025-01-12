// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as rainView from "./rainView";
import * as rainCommand from "./rainCommand";

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
                terminal.sendText(rainCommand.get("deploy", [filePath, stackName], []));
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

  const rainViewProvider = new rainView.RainViewProvider();
  vscode.window.registerTreeDataProvider("vscode-rain-view", rainViewProvider);

  const refreshDisposable = vscode.commands.registerCommand("vscode-rain.refreshView", () => {
    rainViewProvider.refresh();
  });

  context.subscriptions.push(refreshDisposable);

  const deployStackDisposable = vscode.commands.registerCommand("vscode-rain.deployStack", (item: rainView.RainItem) => {
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
        terminal.sendText(rainCommand.get("deploy", [templateFilePath, String(item.label)], []));
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
