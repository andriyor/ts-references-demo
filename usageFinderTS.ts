import * as fs from 'fs';
import * as ts from 'typescript';
import {Node, Project} from 'ts-morph';


const project = new Project({
  tsConfigFilePath: 'tsconfig.json',
});


const sourceFile = project.addSourceFileAtPath('src/esm/sum.ts');

function watch(rootFileNames: string[], options: ts.CompilerOptions) {
  const files: ts.MapLike<{ version: number }> = {};

  // initialize the list of files
  rootFileNames.forEach(fileName => {
    files[fileName] = {version: 0};
  });

  // Create the language service host to allow the LS to communicate with the host
  const servicesHost: ts.LanguageServiceHost = {
    getScriptFileNames: () => rootFileNames,
    getScriptVersion: fileName =>
      files[fileName] && files[fileName].version.toString(),
    getScriptSnapshot: fileName => {
      if (!fs.existsSync(fileName)) {
        return undefined;
      }

      return ts.ScriptSnapshot.fromString(fs.readFileSync(fileName).toString());
    },
    getCurrentDirectory: () => process.cwd(),
    getCompilationSettings: () => options,
    getDefaultLibFileName: options => ts.getDefaultLibFilePath(options),
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory,
    directoryExists: ts.sys.directoryExists,
    getDirectories: ts.sys.getDirectories,
  };

  // Create the language service files
  const services = ts.createLanguageService(servicesHost, ts.createDocumentRegistry());


  sourceFile.forEachDescendant((node) => {
    if (Node.isVariableStatement(node)) {
      if (node.getModifiers().map(m => m.getKindName()).includes('ExportKeyword')) {
        for (const declaration of node.getDeclarationList().getDeclarations()) {
          const refs = services.findReferences(sourceFile.getFilePath(), declaration.getNameNode().getStart());

          if (refs) {
            for (const ref of refs) {
              console.log(ref.references);
            }
          }
        }
      }
    }
  })
}

// Initialize files constituting the program as all .ts files in the current directory
const currentDirectoryFiles = fs
  .readdirSync(process.cwd())
  .filter(fileName => fileName.length >= 3 && fileName.substr(fileName.length - 3, 3) === '.ts');

// Start the watcher
watch(['src/esm/sum.ts', 'src/esm/usage.ts'], {module: ts.ModuleKind.CommonJS});
