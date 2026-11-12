import {
  ParserInfo,
  GenericParser,
  ParsedData,
  ParserLaunchWrapper,
} from "../../models";
import { parserScript } from "../launch-wrapper";
import { APP } from "../../variables";
import * as _ from "lodash";
import * as fs from "fs-extra";
import * as os from "os";
import * as path from "path";
import { glob } from "glob";

export class EpicParser implements GenericParser {
  private get lang() {
    return APP.lang.epicParser;
  }
  getParserInfo(): ParserInfo {
    return {
      title: "Epic",
      info: this.lang.docs__md.self.join(""),
      inputs: {
        epicManifests: {
          label: this.lang.manifestsInputTitle,
          placeholder: this.lang.manifestsInputPlaceholder[APP.osType],
          inputType: "dir",
          info: this.lang.docs__md.input.join(""),
        },
        epicLauncherMode: {
          label: this.lang.launcherModeInputTitle,
          inputType: "toggle",
          info: this.lang.docs__md.input.join(""),
        },
        epicWaitForExit: {
          label: this.lang.waitForExitInputTitle,
          inputType: "toggle",
          hidden: os.type() != "Windows_NT",
          info: this.lang.docs__md.input.join(""),
        },
      },
    };
  }

  execute(
    directories: string[],
    inputs: { [key: string]: any },
    cache?: { [key: string]: any },
  ) {
    return new Promise<ParsedData>(async (resolve, reject) => {
      let appTitles: string[] = [];
      let epicManifestsDir: string = "";
      if (inputs.epicManifests) {
        epicManifestsDir = inputs.epicManifests;
      } else {
        if (os.type() == "Windows_NT") {
          // Check for the new installation path in the user's local app data
          epicManifestsDir = `${process.env.LOCALAPPDATA}\\com.epicgames.eglv2`;
          if (!fs.existsSync(epicManifestsDir)) { // fallback to the old installation path
            epicManifestsDir =
              "C:\\ProgramData\\Epic\\EpicGamesLauncher\\Data\\Manifests";
          }
        } else if (os.type() == "Linux") {
          return reject(this.lang.errors.epicNotCompatible);
        } else if (os.type() == "Darwin") {
          epicManifestsDir = path.join(
            os.homedir(),
            "/Library/Application Support/Epic/EpicGamesLauncher/Data/Manifests",
          );
        }
      }
      if (!fs.existsSync(epicManifestsDir)) {
        return reject(this.lang.errors.epicNotInstalled);
      }
      let fallbackToLegacyInstallation: boolean = !fs.existsSync(`${epicManifestsDir}\\installations.jsonl`);
      const waitForExit =
        !!inputs.epicLauncherMode &&
        !!inputs.epicWaitForExit &&
        os.type() == "Windows_NT";
      try {
        let parsedData: ParsedData = {
          executableLocation: `C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`,
          success: [],
          failed: [],
        };
        if (fallbackToLegacyInstallation) {
          const files: string[] = await glob(
            [epicManifestsDir.replace(/\\/g, "/"), "*.item"].join("/"),
          );
          for (let file of files) {
            if (fs.existsSync(file) && fs.lstatSync(file).isFile()) {
              let item = JSON.parse(fs.readFileSync(file).toString());
              let launchPath = path.join(
                item.InstallLocation,
                item.LaunchExecutable,
              );
              if (
                item.LaunchExecutable &&
                fs.existsSync(launchPath) &&
                !appTitles.includes(item.DisplayName)
              ) {
                appTitles.push(item.DisplayName);
                parsedData.success.push({
                  extractedTitle: item.DisplayName,
                  extractedAppId: item.AppName,
                  launchOptions: `-windowStyle hidden -NoProfile -ExecutionPolicy Bypass -Command "&Start-Process \\"com.epicgames.launcher://apps/${item.AppName}?action=launch&silent=true\\""`,
                  filePath: launchPath,
                  fileLaunchOptions: item.LaunchCommand,
                  ...(waitForExit && {
                    launchWrapper: waitForExitWrapper(item.AppName, item.InstallLocation, item.LaunchExecutable),
                  }),
                });
              }
            }
          }
        } else {
          const rawInstallations = fs.readFileSync(`${epicManifestsDir}\\installations.jsonl`).toString()
            .split("\n")
            .filter((line) => line.trim() !== "")
            .map((line) => JSON.parse(line));
          const deletedInstallationIds = new Set(rawInstallations.filter((installation) => installation.deleted)
            .map((installation) => installation.installationId));
          const installations = rawInstallations.filter((installation) => !deletedInstallationIds.has(installation.installationId))
            .filter((installation) => installation.complete)
            .filter((installation) => installation.launchExecutable !== "")
            .reduce((acc, installation) => {
              if (acc[installation.installationId] 
                && acc[installation.installationId].writtenAt > installation.writtenAt
              ) {
                return acc;
              }
              acc[installation.installationId] = installation;
              return acc;
            }, {});
          
          for (let [_, installation] of Object.entries<any>(installations)) {
            if (!installation) continue;
            let launchPath = path.join(
              installation.dir,
              installation.launchExecutable,
            );
            if (fs.existsSync(launchPath)) {
              parsedData.success.push({
                extractedTitle: installation.launchExecutable.split(".")[0], // TODO: This is usually not exactly the actually game name, and sometimes outright gibberish. Need to get the game name from somewhere else...
                extractedAppId: installation.artifactId,
                launchOptions: `-windowStyle hidden -NoProfile -ExecutionPolicy Bypass -Command "&Start-Process \\"com.epicgames.launcher://apps/${installation.artifactId}?action=launch&silent=true\\""`,
                filePath: launchPath,
                fileLaunchOptions: installation.launchCommand,
                ...(waitForExit && {
                  launchWrapper: waitForExitWrapper(installation.artifactId, installation.dir, installation.launchExecutable),
                }),
              });
            }
          }
        }
        resolve(parsedData);
      } catch (err) {
        reject(this.lang.errors.fatalError__i.interpolate({ error: err }));
      }
    });
  }
}

// "Wait for the game to exit" (Windows, launching via Epic): SRM's launch
// script restarts Epic (so Epic and the game are in the process tree Steam
// tracks), has it launch the game, and waits for the game (any process in
// its install folder) to exit; then Epic syncs cloud saves and is closed.
// From https://github.com/SteamGridDB/steam-rom-manager/pull/904 (hbogaeus).
function waitForExitWrapper(appName: string, installLocation: string, launchExecutable: string): ParserLaunchWrapper {
  const cloudSync = parserScript("epic-cloud-sync.ps1");
  const stopEpic = { script: parserScript("epic-stop.ps1") };
  return {
    launch: {
      file: `com.epicgames.launcher://apps/${appName}?action=launch&silent=true`,
    },
    game: {
      folder: path.win32.normalize(installLocation),
      exeName: path.win32.basename(launchExecutable),
    },
    preLaunch: [stopEpic],
    postLaunch: [{ script: cloudSync, args: ["-appName", appName, "-Mark"] }],
    postExit: [{ script: cloudSync, args: ["-appName", appName] }, stopEpic],
  };
}
