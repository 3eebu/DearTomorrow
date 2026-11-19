// Synthetic acceptance data only; never opens the user's browser storage.
const fs=require('node:fs');
const {createBook,blankPage,newElement,validateBook}=require('./load-book-model.cjs')('./memory-books');
function anniversary(objects=10,pages=20){
  const b=createBook(`Creative Freedom QA — ${objects} objects`,180,240,'#643e4a','linen',true);
  b.assets.qa={name:'Synthetic photograph.png',data:'data:image/png;base64,'+fs.readFileSync('tests/fixtures/book-photo.png').toString('base64')};
  b.pages=Array.from({length:pages},()=>blankPage(b.chapters[0].id));
  const p=b.pages[0];p.paper='#f6efdf';p.texture='dots';p.textureStrength=.25;p.gradient='#eee0da';
  p.elements=[
    {...newElement('text'),name:'Handwritten title',x:9,y:6,width:83,height:12,font:'hand',fontSize:6,text:'Another year of us.',color:'#643e4a'},
    ...[0,1,2].map((i)=>({...newElement('photo'),name:`Photograph ${i+1}`,x:10+i*28,y:23,width:25,height:23,assetId:'qa',rotation:[-3,2,-2][i],radius:2,shadow:.4,text:`Synthetic photo ${i+1}`})),
    ...[0,1].map(i=>({...newElement('polaroid'),name:`Polaroid ${i+1}`,x:12+i*43,y:49,width:33,height:31,assetId:'qa',frame:i?'vintage':'classic',frameMargin:5,captionMargin:23,background:i?'#e8dec7':'#fffaf0',rotation:i?5:-7,tape:!i,text:i?'All the little things.':'My favorite place.',fontSize:2.4})),
    {...newElement('text'),name:'Personal paragraph',x:12,y:84,width:77,height:12,fontSize:2.3,text:'For every ordinary morning, every little adventure, and every time you made me laugh when I needed it most. I am so glad our paths found each other. Here is to all the pages we have still to fill.'},
    {...newElement('sticker'),sticker:'tape',name:'Washi tape',text:'',x:69,y:19,width:20,height:7,background:'#d8c8a4',rotation:7},
    {...newElement('sticker'),sticker:'heart',name:'A little heart',text:'',x:45,y:71,width:10,height:9,color:'#79505a',background:'#e8c8bf',rotation:-8},
    {...newElement('drawing'),name:'Drawn signature',text:'',x:63,y:76,width:24,height:7,rotation:0,strokes:[{id:'qa-signature',tool:'pen',color:'#643e4a',width:1.3,opacity:1,points:[[2,78,.5],[14,23,.6],[18,81,.7],[31,18,.8],[35,77,.5],[52,48,.6],[43,83,.5],[71,32,.8],[56,83,.5],[94,67,.5]]}]},
  ];
  for(let i=p.elements.length;i<objects;i++)p.elements.push({...newElement(i%2?'shape':'sticker'),shape:'ellipse',sticker:'branch',name:`Complexity fixture ${i+1}`,text:'',x:5+(i%10)*8,y:20+Math.floor(i/10)*6,width:6,height:6,background:'#d9dfcd',opacity:.7});
  return validateBook(b);
}
if(require.main===module)fs.writeFileSync(process.argv[2]||'tests/fixtures/creative-freedom-qa.json',JSON.stringify(anniversary(Number(process.argv[3]||10),Number(process.argv[4]||20))));
module.exports={anniversary};
