export const availableParsers = [
  'Glob',
  'Glob-regex',
  'Epic',
  'Steam',
  'GOG Galaxy',
  'Amazon Games',
  'itch.io'
]

export const availableParserInputs: {[parserType: string]: string[]} = {
  'Glob': ['glob'],
  'Glob-regex': ['glob-regex'],
  'Steam': [],
  'Epic': ['manifests', 'epicLauncherMode'],
  'GOG Galaxy': ['galaxyExeOverride','gogLauncherMode'],
  'Amazon Games': ['amazonGamesExeOverride', 'amazonGamesLauncherMode'],
  'itch.io': ['itchIoAppDataOverride']
}

export const artworkOnlyParsers = ['Steam']
export const ROMParsers = ['Glob', 'Glob-regex']
export const platformParsers = ['Epic','GOG Galaxy','Amazon Games','itch.io']
