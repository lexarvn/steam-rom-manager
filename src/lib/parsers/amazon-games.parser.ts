import { ParserInfo, GenericParser, ParsedData } from '../../models';
import { APP } from '../../variables';
import * as fs from "fs-extra";
import * as os from "os";
import * as sqlite from "better-sqlite3";
import * as path from 'path';
import { parse } from 'yaml';
import * as Sentry from '@sentry/electron';

export class AmazonGamesParser implements GenericParser {

  private get lang() {
    return APP.lang.amazonGamesParser;
  }
  getParserInfo(): ParserInfo {
    return {
      title: 'Amazon Games',
      info: this.lang.docs__md.self.join(''),
      inputs: {
        'amazonGamesExeOverride': {
          label: this.lang.exeOverrideTitle,
          inputType: 'dir',
          validationFn: (input: string) => {
            if(!input || fs.existsSync(input) && fs.lstatSync(input).isFile()) {
              return null;
            } else {
              return this.lang.errors.invalidExeOverride;
            }
          },
          info: this.lang.docs__md.input.join('')
        },
        'amazonGamesLauncherMode': {
          label: this.lang.launcherModeInputTitle,
          inputType: 'toggle',
          validationFn: (input: any) => { return null },
          info: this.lang.docs__md.input.join('')
        }
      }
    };
  }

  execute(directories: string[], inputs: { [key: string]: any }, cache?: { [key: string]: any }) {
    return new Promise<ParsedData>((resolve,reject)=>{
      try {
        if(os.type()!='Windows_NT') {
          reject(this.lang.errors.osUnsupported);
        }

        const launcherMode = inputs.amazonGamesLauncherMode;

        const amazonGamesExe = inputs.amazonGamesExeOverride || path.resolve(`${process.env.APPDATA}\\..\\local\\Amazon Games\\App\\Amazon Games.exe`);
        const dbPath = path.resolve(`${path.dirname(amazonGamesExe)}\\..\\Data\\Games\\Sql\\GameInstallInfo.sqlite`);

        if(!fs.existsSync(dbPath)) {
          reject();
        }

        const db = sqlite(dbPath);

        const games: {extractedTitle: string, filePath: string, startInDirectory?: string, launchOptions?: string}[] =
        db.prepare("select ProductTitle, InstallDirectory, Id from DbSet")
        .all()
        .map(({ ProductTitle, InstallDirectory, Id }: { [key:string]:string }) => {
          if (launcherMode) {
            return {
              extractedTitle: ProductTitle,
              startInDirectory: InstallDirectory,
              launchOptions: `amazon-games://play/${Id}`,
            };
          }

          const fuelJson = fs.readFileSync(`${InstallDirectory}\\fuel.json`);
          // not really json so need to parse with yaml parser
          const { Main: { Command, Args } } = parse(fuelJson.toString());

          return { 
            extractedTitle: ProductTitle,
            startInDirectory: InstallDirectory,
            filePath: `${InstallDirectory}\\${Command}`,
            launchOptions: Args?.join(' '),
          };
        });

        resolve({executableLocation: launcherMode ? amazonGamesExe : null, success: games, failed:[]});
      } catch(err) {
        Sentry.captureException(err);
        reject(this.lang.errors.fatalError__i.interpolate({error: err}));
      }
    })
  }
}
