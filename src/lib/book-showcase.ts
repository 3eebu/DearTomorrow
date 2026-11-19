import { blankPage, createBook, newElement, uid, validateBook, type BookElement, type BookPage, type DrawingStroke } from './memory-books';
import { coverDesign } from './bookmaking';
import { defaultGift } from './book-gift';
import { surpriseElement, voiceElement } from './studio-document';
import { VOICE_RATE, voiceWav } from './book-voice';
import { newMessage, type SurpriseKind } from './book-surprises';

const cream = '#f8efdc', clay = '#e9d2c1', moss = '#dde3d5', ink = '#46372e', plum = '#694650';
const caption = (text: string, y = 82): BookElement =>
  ({ ...newElement('text'), text, x: 12, y, width: 76, height: 10, align: 'center', fontSize: 2.6, italic: true, color: plum });
function title(text: string, y = 12, size = 7.8): BookElement {
  return { ...caption(text, y), height: 29, fontSize: size, italic: false, lineHeight: 1.04 };
}
function letter(text: string, y = 43): BookElement {
  return { ...caption(text, y), fontSize: 4.2, height: 43, lineHeight: 1.58, x: 15, width: 70, align: 'left', color: ink };
}
function ornament(sticker: BookElement['sticker'], x: number, y: number, width: number, color = plum): BookElement {
  return { ...newElement('sticker'), sticker, x, y, width, height: width * .83, color, background: clay, text: '' };
}
function frame(text: string, x: number, y: number, width: number, height: number, rotation: number): BookElement {
  return { ...newElement('polaroid'), text, x, y, width, height, rotation, frame: 'vintage', frameMargin: 5,
    captionMargin: 20, fontSize: 3.1, background: '#fffaf0', color: ink, tape: true };
}
function line(points: [number, number][], color: string, width: number): DrawingStroke {
  return { id: uid(), tool: 'pen', points: points.map(([x, y]) => [x, y, .5]), color, width, opacity: .86 };
}
function coast(): BookElement {
  const waves: DrawingStroke[] = [0, 7, 14, 21].map((offset, index) => line(
    Array.from({ length: 34 }, (_, n) => [n * 3, 58 + offset + Math.sin(n * .58 + index) * 2.1]), '#778573', .6));
  const sun: [number, number][] = Array.from({ length: 36 }, (_, n) => [
    73 + Math.cos(n / 35 * Math.PI * 2) * 8, 32 + Math.sin(n / 35 * Math.PI * 2) * 13,
  ]);
  return { ...newElement('drawing'), x: 13, y: 22, width: 74, height: 53, text: '', name: 'Original pencil coast',
    strokes: [line([[1, 57], [14, 46], [22, 49], [33, 35], [42, 38], [54, 31], [63, 46], [78, 51], [98, 56]], '#6e7766', .85),
      line(sun, '#b68a5f', .9), ...waves] };
}
function surprise(type: SurpriseKind, label: string, words: string, y = 30): BookElement {
  const element = surpriseElement(type);
  return { ...element, y, x: 18, width: 64, height: 38, fontSize: 4.1,
    surprise: { ...element.surprise!, label, message: newMessage(words) } };
}

export function newShowcase() {
  const book = createBook('Every Little Thing About Us', 180, 240, '#6b4049', 'linen', true);
  book.id = 'dear-tomorrow-showcase';
  book.subtitle = 'A small collection of ordinary wonders';
  book.dedication = 'For the person who made the smallest things worth keeping.';
  book.cover.design = { ...coverDesign(book), branding: false, lettering: 'gold', initials: 'A & M', ribbon: '#bc8683',
    date: 'THE FIRST VOLUME', spineTitle: 'Every Little Thing', finish: 'satin' };
  book.bookmaking = { version: 1, contents: true };
  book.gift = { ...defaultGift, tag: 'With all my love', to: 'Avery', from: 'Morgan',
    message: 'Here is a little book for the things I hope we never forget.' };
  book.chapters = ['The small hours', 'The roads we took', 'For all the mornings after'].map((name, index) =>
    ({ id: `example-chapter-${index}`, title: name, color: [plum, '#6f8069', '#a47b61'][index] }));

  const envelope = surprise('envelope', 'To Avery', 'I still love the way you say good morning before your eyes are quite open.', 36);
  if (envelope.surprise?.type === 'envelope') envelope.surprise.initials = 'M';
  const note = surprise('fold', 'Folded with care', 'On a very ordinary Thursday, you made me laugh until the tea went cold.');
  if (note.surprise?.type === 'fold') note.surprise.fold = 'heart';
  const reverse = { ...surprise('reverse', '', 'The coast, after the rain. We stayed until every other person had gone home.'),
    text: 'The coast · late summer', y: 29, height: 47, rotation: -6, tape: true };
  const scratch = surprise('scratch', 'Scratch here', 'One train ticket. Any destination. I will pack the sandwiches.', 35);
  const pocket = surprise('pocket', 'The day in my coat pocket', '', 34);
  if (pocket.surprise?.type === 'pocket') pocket.surprise.items = [
    { ...newMessage('Two seats for the six o’clock show.'), id: 'ticket', type: 'ticket', title: 'Cinema ticket' },
    { ...newMessage('The day we walked home in the rain.'), id: 'date', type: 'date', title: '8 September' },
  ];
  const flap = surprise('flap', 'Something I never told you', 'Even on the days we say very little, I feel at home with you.', 35);
  const popup = surprise('popup', 'One last little thing', 'I would happily start this story again.', 30);
  if (popup.surprise?.type === 'popup') popup.surprise.style = 'paired';
  const chime = voiceElement();
  chime.x = 16; chime.y = 47; chime.width = 68; chime.height = 30;
  chime.voice = { version: 1, style: 'waveform', assetId: 'example-chime', title: 'A little sound to keep',
    transcript: 'This example plays a short synthetic chime. Replace it with your own recording in Studio.' };
  book.voiceAssets = { 'example-chime': voiceWav(Float32Array.from({ length: 3 * VOICE_RATE }, (_, frame) => {
    const time = frame / VOICE_RATE, note = Math.floor(time), phase = time - note;
    return .12 * Math.sin(2 * Math.PI * [392, 494, 587][note] * phase) * Math.min(1, phase * 30) * (1 - phase) ** 3;
  }), 'Synthetic example chime') };

  const compositions: [string, BookElement[], BookPage['texture']?][] = [
    [cream, [caption('AN EXAMPLE MEMORY BOOK', 12), title('Every little thing\nabout us.', 32, 10), ornament('branch', 39, 64, 24, '#7c886f'), caption('Avery & Morgan · a fictional keepsake', 84)], 'handmade'],
    [clay, [caption('CHAPTER ONE', 15), title('The small\nhours.', 40, 11), caption('Before the rest of the world woke up.', 76)], 'handmade'],
    [cream, [title('The kitchen light', 12), letter('You always turned on the little lamp first.\n\nI began to love the hour between the kettle singing and the rest of the day beginning.', 43)]],
    [cream, [title('A roomful of sun', 9), frame('A photograph for this spot', 19, 29, 63, 48, -4), caption('Place your own photo in this editable frame.', 86)]],
    [moss, [title('The Thursday note'), note, caption('A tiny thing worth unfolding.', 83)]],
    [cream, [title('To the person\nacross the table', 9), envelope, caption('An envelope in the middle of an ordinary day.', 84)]],
    [moss, [caption('CHAPTER TWO', 15), title('The roads\nwe took.', 40, 11), caption('Side streets, wrong turns, and coming home.', 76)], 'handmade'],
    [cream, [title('The long way home', 9), coast(), caption('An original drawing, made with editable strokes.', 82)]],
    [cream, [title('After the rain'), reverse, caption('Turn the photograph over.', 87)]],
    [clay, [title('Shall we go?'), scratch, caption('A small adventure is waiting underneath.', 85)]],
    [cream, [title('Souvenirs'), pocket, caption('Things that almost went into the wash.', 86)]],
    [cream, [caption('A FEW THINGS WE TOOK HOME', 10), frame('The morning market', 14, 22, 42, 43, -6), frame('An empty promenade', 44, 47, 41, 41, 6), ornament('ticket', 16, 71, 23)]],
    [clay, [caption('CHAPTER THREE', 15), title('For all the\nmornings after.', 40, 9), caption('The pages we have still to fill.', 77)], 'handmade'],
    [cream, [title('A sound for later'), caption('Some moments are worth hearing again.', 33), chime,
      ornament('branch', 73, 78, 16, '#778573')], 'lines'],
    [moss, [title('Under this tab'), flap, caption('You can always lift this if you forget.', 85)]],
    [cream, [title('An afternoon\nwith nothing planned', 8, 7), frame('A place for a photograph', 18, 32, 63, 46, 4), caption('The sort of day I’d like to have again.', 85)]],
    [clay, [title('One last thing'), popup, caption('For the days yet to come.', 85)]],
    [cream, [ornament('branch', 39, 21, 24, '#778573'), title('There will be\nmore pages.', 47, 9), caption('Always, yours.', 77)]],
  ];
  book.pages = compositions.map(([paper, elements, texture], index) => ({
    ...blankPage(book.chapters[Math.floor(index / 6)].id), paper, elements, texture: texture ?? 'grain',
    textureStrength: .23,
  }));
  return validateBook(book);
}
