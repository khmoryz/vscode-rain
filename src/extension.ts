// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as rainView from "./rainView";
import * as rainCommand from "./rainCommand";
import resourceTypes from "./resourceTypes";
import { exec } from "child_process";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "vscode-rain" is now active!');

  let rainPath = vscode.workspace.getConfiguration("rain").get<string>("path", "rain");
  let terminal: vscode.Terminal | undefined;

  const updateRainPath = () => {
    rainPath = vscode.workspace.getConfiguration("rain").get<string>("path", "rain");
  };

  vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration("rain.path")) {
      updateRainPath();
    }
  });

  const disposable = vscode.commands.registerCommand("vscode-rain.deployExistingStack", () => {
    const stackList: string[] = [];
    exec(rainCommand.get("ls", [], []), (error, stdout, stderr) => {
      if (error) {
        vscode.window.showErrorMessage(`Error: ${stderr}`);
        return;
      }

      const items = stdout
        .split("\n")
        .slice(1)
        .filter((line) => line)
        .reverse()
        .map((line) => {
          const [stackName, _] = line.split(":");
          stackList.push(stackName.slice(1));
        });

      vscode.window.showQuickPick(stackList, { placeHolder: "What stack name you want to deploy?" }).then((input) => {
        if (!input) {
          return;
        }
        const activeTextEditor = vscode.window.activeTextEditor;
        if (activeTextEditor) {
          const filePath = activeTextEditor.document.fileName;
          if (!terminal) {
            terminal = vscode.window.createTerminal("Rain");
          }
          terminal.sendText(rainCommand.get("deploy", [filePath, input], []));
          terminal.show();
        } else {
          vscode.window.showErrorMessage("No active file found");
        }
      });
    });
  });

  context.subscriptions.push(disposable);

  const disposableDeployExistingStack = vscode.commands.registerCommand("vscode-rain.deployNewStack", () => {
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
            if (!terminal) {
              terminal = vscode.window.createTerminal("Rain");
            }
            terminal.sendText(rainCommand.get("deploy", [filePath, stackName], []));
            terminal.show();
          } else {
            vscode.window.showErrorMessage("No active file found");
          }
        }
      });
  });

  context.subscriptions.push(disposableDeployExistingStack);

  const buildDisposable = vscode.commands.registerCommand("vscode-rain.build", () => {
    vscode.window.showQuickPick(resourceTypes).then((selected) => {
      if (!selected) {
        return;
      }
      exec(rainCommand.get("build", [selected], []), (error, stdout, stderr) => {
        if (error) {
          vscode.window.showErrorMessage(`Error: ${stderr}`);
          return;
        }
        vscode.env.clipboard.writeText(stdout);
        vscode.window.showInformationMessage("Coppied!");
      });
    });
  });

  context.subscriptions.push(buildDisposable);

  const rainViewProvider = new rainView.RainViewProvider();
  vscode.window.registerTreeDataProvider("vscode-rain-view", rainViewProvider);

  const refreshDisposable = vscode.commands.registerCommand("vscode-rain.refreshView", () => {
    rainViewProvider.refresh();
  });
  context.subscriptions.push(refreshDisposable);

  const consoleDisposable = vscode.commands.registerCommand("vscode-rain.console", () => {
    exec(rainCommand.get("console", [], []), (error, stdout, stderr) => {
      if (error) {
        vscode.window.showErrorMessage(`Error: ${stderr}`);
        return;
      }
      if (!terminal) {
        terminal = vscode.window.createTerminal("Rain");
      }
      terminal.sendText(stdout);
      terminal.show();
    });
  });
  context.subscriptions.push(consoleDisposable);

  const deployStackDisposable = vscode.commands.registerCommand("vscode-rain.deployStack", (item: rainView.RainItem) => {
    vscode.window
      .showOpenDialog({
        canSelectMany: false,
        openLabel: "Select Template File",
        filters: {
          Templates: [".yaml", ".yml", ".json"],
        },
      })
      .then((fileUri) => {
        if (fileUri && fileUri[0]) {
          const templateFilePath = fileUri[0].fsPath;
          if (!terminal) {
            terminal = vscode.window.createTerminal("Rain");
          }
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
