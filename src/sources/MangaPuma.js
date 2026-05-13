const BASE='https://mangapuma.com';
const PX='https://corsproxy.io/?';
async function getDoc(url){const r=await fetch(PX+encodeURIComponent(url),{headers:{'User-Agent':'Mozilla/5.0','Referer':BASE}});if(!r.ok)throw new Error(`HTTP ${r.status}`);return new DOMParser().parseFromString(await r.text(),'text/html');}
const abs=url=>{if(!url)return'';if(url.startsWith('http'))return url;if(url.startsWith('//'))return'https:'+url;if(url.startsWith('/'))return BASE+url;return url;};
const imgS=el=>el?.getAttribute('data-src')||el?.getAttribute('data-lazy-src')||el?.getAttribute('src')||'';
const chN=t=>{const m=t.match(/(\d+(?:\.\d+)?)/);return m?m[1]:'0';};

export const MangaPumaSource={
  id:'mangapuma',name:'MangaPuma',lang:'en',baseUrl:BASE,
  isBuiltIn:true,supportsSearch:true,supportsBrowse:true,

  async browse(page=1){return extractList(await getDoc(`${BASE}/manga-list?page=${page}`));},
  async search(q){return extractList(await getDoc(`${BASE}/search?s=${encodeURIComponent(q)}`));},

  async getMangaDetails(id){
    const url=id.startsWith('http')?id:BASE+id;const doc=await getDoc(url);
    const title=doc.querySelector('h1,.post-title,.manga-title')?.textContent?.trim()||'';
    const cover=abs(imgS(doc.querySelector('.summary_image img,.manga-poster img')));
    const desc=doc.querySelector('.summary__content p,[class*="description"] p')?.textContent?.trim()||'';
    const author=doc.querySelector('.author-content a')?.textContent?.trim()||'';
    const status=doc.querySelector('[class*="status"] .summary-content')?.textContent?.trim()||'';
    const genres=Array.from(doc.querySelectorAll('.genres-content a')).map(e=>e.textContent.trim()).slice(0,8);
    const chapters=Array.from(doc.querySelectorAll('.wp-manga-chapter,li[class*="chapter"]')).map((el,i)=>{const a=el.querySelector('a');if(!a)return null;const t=a.textContent.trim();return{id:abs(a.href),title:t,number:chN(t),date:el.querySelector('[class*="date"]')?.textContent?.trim()||'',index:i,sourceId:'mangapuma',mangaId:id};}).filter(Boolean);
    return{id,title,cover,description:desc,author,status,genres,sourceId:'mangapuma',sourceName:'MangaPuma',url,chapters};
  },

  async getPageList(mangaId,chId){
    const url=chId.startsWith('http')?chId:BASE+chId;const doc=await getDoc(url);
    let imgs=Array.from(doc.querySelectorAll('.reading-content img,#readerarea img'));
    if(imgs.length)return imgs.map((el,i)=>({index:i,url:abs(imgS(el))})).filter(p=>p.url&&/\.(jpg|jpeg|png|webp)/i.test(p.url));
    for(const s of doc.querySelectorAll('script')){const t=s.textContent;const m=t.match(/(?:images|chapter_preloaded_images)\s*=\s*(\[.*?\])/s);if(m){try{return JSON.parse(m[1]).filter(u=>typeof u==='string'&&u.includes('http')).map((u,i)=>({index:i,url:u}));}catch{}}}
    return[];
  },
};

function extractList(doc){
  const sels=['.manga-poster','.c-image-hover','.list-story-item','.manga-item','div.page-item-detail'];
  let items=[];for(const s of sels){items=doc.querySelectorAll(s);if(items.length)break;}
  return Array.from(items).map(el=>{const a=el.querySelector('a');const im=el.querySelector('img');const title=el.querySelector('.post-title,h3,h4')?.textContent?.trim()||im?.alt?.trim()||'';if(!a||!title)return null;return{id:abs(a.href),title,cover:abs(imgS(im)),sourceId:'mangapuma',sourceName:'MangaPuma',url:abs(a.href)};}).filter(Boolean);
}
