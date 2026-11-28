const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');

function loadServerModule(relative, overrides = {}, extraGlobals = {}) {
  const file = path.resolve(__dirname,'..',relative);
  const exports = {};
  const {outputText} = ts.transpileModule(fs.readFileSync(file,'utf8'), {
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
  });
  vm.runInNewContext(outputText,{
    exports,Buffer,Blob,Response,ReadableStream,process,console,...extraGlobals,
    require(name) {
      if (Object.hasOwn(overrides,name)) return overrides[name];
      if (name==='server-only') return {};
      if (name.startsWith('./')) {
        return loadServerModule(path.relative(path.resolve(__dirname,'..'),path.resolve(path.dirname(file),name+'.ts')),overrides,extraGlobals);
      }
      return require(name);
    },
  },{filename:relative});
  return exports;
}

module.exports = {loadServerModule};
