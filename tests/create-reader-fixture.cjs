// Generates importable QA books; never reads or writes the user's browser library.
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const model = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/memory-books.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
  { exports: model.exports, crypto: require('node:crypto').webcrypto });
const { createBook, blankPage, newElement, validateBook } = model.exports;
const count = Number(process.argv[2] || 20);
const book = createBook(`Realism QA — ${count} pages`, 203.2, 203.2, '#643e4a', 'linen', true);
book.assets.fixture = { name: 'book-photo.png', data: 'data:image/png;base64,' + fs.readFileSync('tests/fixtures/book-photo.png').toString('base64') };
book.pages = Array.from({ length: count }, (_, i) => ({ ...blankPage(book.chapters[0].id),
  paper: ['#f6efdf', '#e6eadf', '#eee0da', '#e2e7ec'][i % 4],
  elements: [
    { ...newElement('text'), x: 9, y: 7, width: 82, height: 20, text: `PAGE ${i + 1}\nA day to keep`, fontSize: 6 },
    { ...newElement(i % 2 ? 'photo' : 'polaroid'), x: 20, y: 31, width: 60, height: 48, assetId: 'fixture', text: `Photograph ${i + 1}` },
    { ...newElement('note'), x: 12, y: 83, width: 74, height: 12, text: `A little note on page ${i + 1}.`, fontSize: 3.4 },
  ] }));
fs.writeFileSync(process.argv[3] || 'tests/fixtures/realism-review.json', JSON.stringify(validateBook(book)));
