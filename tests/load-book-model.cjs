const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
const { webcrypto: crypto } = require('node:crypto');

const cache = new Map();
module.exports = function load(name) {
  if (cache.has(name)) return cache.get(name);
  if (!/^\.\/[a-z-]+$/.test(name)) throw new Error('Unsupported model test import: ' + name);
  const file = path.join(__dirname, '..', 'src', 'lib', name + '.ts');
  const exports = {};
  cache.set(name, exports);
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  vm.runInNewContext(outputText, { exports, require: load, crypto, atob, btoa, TextEncoder });
  return exports;
};
