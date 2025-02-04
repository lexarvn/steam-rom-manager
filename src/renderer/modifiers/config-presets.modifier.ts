import { ValidatorModifier, UserConfiguration } from '../../models';
import * as _ from "lodash";

let replaceVariables_undefined = (oldValue: any) => typeof oldValue === 'string' ? oldValue.replace(/\${dir}/gi, '${romDir}').replace(/\${file}/gi, '${fileName}').replace(/\${sep}/gi, '${/}') : '';
let versionUp = (version: number) => { return version + 1 };

export const configPreset: ValidatorModifier<UserConfiguration> = {
  controlProperty: 'presetVersion',
  latestVersion: 0,
  fields: {
    undefined: {
      'presetVersion': { method: ()=>0 },
      'parserInputs': {
        method: (oldValue, oldConfiguration: any) => {
          let result: any = {};
          if(oldConfiguration.parserType=='Glob'){
            result['glob'] = oldConfiguration.parserInputs['glob']
          } else if(oldConfiguration.parserType=='Glob-regex') {
            result['glob-regex'] = oldConfiguration.parserInputs['glob-regex']
          } else if(oldConfiguration.parserType=='Epic') {
            result['manifests'] = null;
          }
          return result;
        }
      }
    }
  }
}
