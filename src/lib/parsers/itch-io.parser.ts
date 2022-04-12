import { ParserInfo, GenericParser, ParsedData } from '../../models';
import { APP } from '../../variables';
import * as fs from "fs-extra";
import * as os from "os";
import * as sqlite from "better-sqlite3";
import * as Sentry from '@sentry/electron';

export class ItchIoParser implements GenericParser {

  private get lang() {
    return APP.lang.itchIoParser;
  }
  getParserInfo(): ParserInfo {
    return {
      title: 'itch.io',
      info: this.lang.docs__md.self.join(''),
      inputs: {
        'itchIoAppDataOverride': {
          label: this.lang.itchIoAppDataOverrideTitle,
          inputType: 'dir',
          validationFn: (input: string) => {
            if(!input || fs.existsSync(input) && fs.lstatSync(input).isFile()) {
              return null;
            } else {
              return this.lang.errors.invalidItchIoAppDataOverride;
            }
          },
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

        const itchIoAppDataDir = inputs.itchIoAppDataOverride || `${process.env.APPDATA}\\itch`;
        const dbPath = `${itchIoAppDataDir}\\db\\butler.db`;

        if(!fs.existsSync(dbPath)) {
          reject();
        }

        const db = sqlite(dbPath);
        const games: { extractedTitle:string, filePath:string }[] = db.prepare(
          "select title, verdict from caves as c join games as g on c.game_id = g.id"
        ).all()
        .map(({ title, verdict }: { [key:string]:string }) => {
          const { basePath, candidates } = JSON.parse(verdict);

          if (!candidates) {
            return null;
          }

          const exePath = candidates[0].path.replace('/','\\');

          return { 
            extractedTitle: title,
            filePath: `${basePath}\\${exePath}`,
          };
        })
        .filter((gameDetails:any) => gameDetails !== null);

        resolve({success: games, failed:[]});
      } catch(err) {
        Sentry.captureException(err);
        reject(this.lang.errors.fatalError__i.interpolate({error: err}));
      }
    })
  }
}
