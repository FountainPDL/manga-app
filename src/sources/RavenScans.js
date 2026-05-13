const BASE='https://ravenscans.com';
const PX='https://corsproxy.io/?';
async function getDoc(url){const r=await fetch(PX+encodeURIComponent(url),{headers:{'User-Agent':'Mozilla/5.0','Referer':BASE}});if(!r.ok)throw new Error(`HTTP ${r.status}`);return new DOMParser().parseFromString(await r.text(),'text/html');}
const abs=url=>{if(!url)return'';if(url.startsWith('http'))return url;if(url.startsWith('//'))return'https:'+url;if(url.startsWith('/'))return BASE+url;return url;};
const imgS=el=>el?.getAttribute('data-src')||el?.getAttribute('data-lazy')||el?.getAttribute('src')||'';
const chN=t=>{const m=t.match(/(\d+(?:\.\d+)?)/);return m?m[1]:'0';};

export const RavenScansSource={
  id:'ravenscans',name:'RavenScans',lang:'en',baseUrl:BASE,
  isBuiltIn:true,supportsSearch:true,supportsBrowse:true,

  async browse(page=1){return extractList(await getDoc(`${BASE}/series/?page=${page}&order=update`));},
  async search(q){return extractList(await getDoc(`${BASE}/?s=${encodeURIComponent(q)}`));},

  async getMangaDetails(id){
    const url=id.startsWith('http')?id:`${BASE}/series/${id}`;const doc=await getDoc(url);
    const title=doc.querySelector('.post-title h1,.entry-title,h1.title')?.textContent?.trim()||'';
    const cover=abs(imgS(doc.querySelector('.summary_image img,.thumb img,.wp-post-image')));
    const desc=doc.querySelector('.entry-content p,.summary__content p')?.textContent?.trim()||'';
    const author=doc.querySelector('.author-content')?.textContent?.trim().replace(/^Author:\s*/i,'')||'';
    const status=doc.querySelector('[class*="status"] .summary-content')?.textContent?.trim()||'';
    const genres=Array.from(doc.querySelectorAll('.genres-content a,.mgen a')).map(e=>e.textContent.trim());
    const chapters=Array.from(doc.querySelectorAll('#chapterlist li,.chapter-list li')).map((el,i)=>{const a=el.querySelector('a');if(!a)return null;const t=el.querySelector('.chapternum,span')?.textContent?.trim()||a.textContent.trim();const date=el.querySelector('.chapterdate,[class*="date"]')?.textContent?.trim()||'';return{id:abs(a.href),title:t,number:chN(t),date,index:i,sourceId:'ravenscans',mangaId:id};}).filter(Boolean);
    return{id,title,cover,description:desc,author,status,genres,sourceId:'ravenscans',sourceName:'RavenScans',url,chapters};
  },

  async getPageList(mangaId,chId){
    const url=chId.startsWith('http')?chId:`${BASE}${chId}`;const doc=await getDoc(url);
    for(const s of doc.querySelectorAll('script')){const t=s.textContent;
      const m=t.match(/ts_reader\.run\((\{[\s\S]*?\})\)/);if(m){try{const d=JSON.parse(m[1]);const imgs=(d.sources||[])[0]?.images||[];if(imgs.length)return imgs.map((u,i)=>({index:i,url:abs(u)}));}catch{}}
      const m2=t.match(/var\s+images\s*=\s*(\[[\s\S]*?\]);/);if(m2){try{return JSON.parse(m2[1]).filter(u=>typeof u==='string').map((u,i)=>({index:i,url:abs(u)}));}catch{}}
    }
    return Array.from(doc.querySelectorAll('.reading-content img,.chapter-content img')).map((el,i)=>({index:i,url:abs(imgS(el))})).filter(p=>p.url&&/\.(jpg|jpeg|png|webp)/i.test(p.url));
  },
};

function extractList(doc){
  const sels=['.bsx','.bs','.series-card','.manga-item'];let items=[];for(const s of sels){items=doc.querySelectorAll(s);if(items.length)break;}
  return Array.from(items).map(el=>{const a=el.querySelector('a');const im=el.querySelector('img');const title=el.querySelector('.title,.series-title,h3,h4')?.textContent?.trim()||im?.alt?.trim()||'';if(!a||!title)return null;return{id:abs(a.href),title,cover:abs(imgS(im)),sourceId:'ravenscans',sourceName:'RavenScans',url:abs(a.href)};}).filter(Boolean);
}
