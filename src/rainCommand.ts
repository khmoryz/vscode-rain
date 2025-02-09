import * as vscode from "vscode";

let rainPath: string;
let rainProfile: string;

export function get(subCommand: string, args: string[], flags: string[], addProfile: boolean): string {
  rainPath = vscode.workspace.getConfiguration("rain").get<string>("path", "rain");
  // set rainProfile to the value of the rain.profile setting, defaulting to "rain" if it's not empty
  rainProfile = vscode.workspace.getConfiguration("rain").get<string>("profile", "rain");
  let rainProfileFlag = "";
  if (addProfile) {
    rainProfileFlag = rainProfile !== "" ? `--profile ${rainProfile}` : "";
  }

  return `${rainPath} ${subCommand} ${args.join(" ")} ${flags.join(" ")} ${rainProfileFlag}`;
}
