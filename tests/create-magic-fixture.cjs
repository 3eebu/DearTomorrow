// Generates a synthetic anniversary book. Browser storage is never accessed.
const fs = require('node:fs');
const path = require('node:path');
const load = require('./load-book-model.cjs');
const { createBook, blankPage, newElement, validateBook } = load('./memory-books');
const { surpriseElement } = load('./studio-document');
const { newMessage, surpriseKinds } = load('./book-surprises');
const { defaultGift } = load('./book-gift');

function anniversaryBook() {
  const book = createBook('The Days We Kept · Magic QA', 180, 240, '#643e4a', 'linen', true);
  book.gift = { ...defaultGift, to: 'Avery', from: 'Morgan', tag: 'For our anniversary', message: 'Every page is another reason I love you.' };
  book.assets.fixture = {
    name: 'Synthetic anniversary photograph',
    data: 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, 'fixtures', 'book-photo.png')).toString('base64'),
  };
  book.pages = Array.from({ length: 4 }, (_, index) => {
    const page = blankPage(book.chapters[0].id);
    page.elements.push({ ...newElement('text'), x: 8, y: 5, width: 84, height: 9, align: 'center',
      fontSize: 4.5, color: '#744f59', text: ['A letter in the cupboard', 'Days worth keeping', 'Things we carried', 'Still ahead of us'][index] });
    return page;
  });
  const storyline = {
    envelope: { label: 'For Avery', seal: '#864c59', initials: 'A', message: newMessage('I would choose this little life with you again.') },
    fold: { label: 'Folded with love', fold: 'heart', message: newMessage('You make the ordinary days feel like holidays.') },
    reverse: { message: { ...newMessage('The place we went back to every Sunday.'), assetId: 'fixture', date: '14 February', place: 'The coast' } },
    scratch: { label: 'Scratch here', message: newMessage('A walk at sunrise. You pick the coffee.') },
    flap: { label: 'Behind this tab', hinge: 'left', message: newMessage('I still remember our first hello.') },
    pocket: { label: 'In my coat pocket', items: [
      { ...newMessage('Two for the afternoon show.'), id: 'qa-ticket', type: 'ticket', title: 'Cinema ticket' },
      { ...newMessage(), assetId: 'fixture', id: 'qa-photo', type: 'photo', title: 'A photograph' },
    ] },
    popup: { label: 'One more thing', style: 'paired', message: newMessage('Here is to more years of us.') },
  };
  surpriseKinds.forEach((type, index) => {
    const element = surpriseElement(type);
    element.surprise = { ...element.surprise, ...storyline[type] };
    element.x = 23; element.y = index % 2 ? 58 : 17;
    element.width = 54; element.height = 32;
    if (type === 'reverse') element.assetId = 'fixture';
    if (type === 'scratch') element.rotation = 11;
    book.pages[Math.floor(index / 2)].elements.push(element);
  });
  return validateBook(book);
}

if (require.main === module) {
  if (!process.argv[2]) throw new Error('Pass an output file path for the synthetic project.');
  fs.writeFileSync(process.argv[2], JSON.stringify(anniversaryBook()));
}
module.exports = { anniversaryBook };
