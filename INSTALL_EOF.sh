#!/bin/bash
# Run this from ~/manga-app in Termux
# Each section uses EOF to write files directly - no copy-paste errors

cd ~/manga-app

echo "=== Step 1: Writing workflow ==="
mkdir -p .github/workflows
cat > .github/workflows/build.yml << 'EOF'
name: Build APK

on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js 22
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Install deps
        run: npm ci || npm install

      - name: Build web
        run: npm run build

      - name: Setup Java 21
        uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'

      - name: Setup Android SDK
        uses: android-actions/setup-android@v3

      - name: Capacitor sync
        run: node node_modules/@capacitor/cli/bin/capacitor sync android

      - name: Clean aapt2 override
        run: |
          if grep -q "aapt2FromMavenOverride" android/gradle.properties 2>/dev/null; then
            grep -v "aapt2FromMavenOverride" android/gradle.properties > android/gradle.properties.tmp
            mv android/gradle.properties.tmp android/gradle.properties
          fi

      - name: Build APK
        run: cd android && ./gradlew assembleDebug --no-daemon

      - name: Upload APK
        uses: actions/upload-artifact@v4
        with:
          name: ComiFountain-debug
          path: android/app/build/outputs/apk/debug/app-debug.apk
EOF

echo "=== Step 2: Writing vite.config.js ==="
cat > vite.config.js << 'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@store':      path.resolve(__dirname, './src/store/index.js'),
      '@sources':    path.resolve(__dirname, './src/sources/index.js'),
      '@utils':      path.resolve(__dirname, './src/utils'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages':      path.resolve(__dirname, './src/pages'),
    },
  },
  server: { port: 5173, host: true },
  build:  { outDir: 'dist', sourcemap: false },
})
EOF

echo "=== Step 3: Writing index.html ==="
cat > index.html << 'EOF'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8"/>
    <link rel="icon" type="image/png" href="/icon.png"/>
    <meta name="viewport" content="width=device-width,initial-scale=1.0,viewport-fit=cover"/>
    <meta name="mobile-web-app-capable" content="yes"/>
    <meta name="apple-mobile-web-app-capable" content="yes"/>
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
    <meta name="theme-color" content="#000000"/>
    <title>ComiFountain</title>
    <style>html,body{background:#000;margin:0;padding:0;}</style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
EOF

echo "=== Step 4: Writing capacitor.config.json ==="
cat > capacitor.config.json << 'EOF'
{
  "appId":   "com.fountainpdl.comifountain",
  "appName": "ComiFountain",
  "webDir":  "dist",
  "android": {
    "allowMixedContent": true,
    "captureInput": true,
    "webContentsDebuggingEnabled": false
  },
  "plugins": {
    "StatusBar":    {"style":"DARK","backgroundColor":"#00000000","overlaysWebView":true},
    "SplashScreen": {"launchShowDuration":0,"backgroundColor":"#000000"},
    "Keyboard":     {"resize":"body","style":"DARK"}
  }
}
EOF

echo "=== Step 5: Creating sources folder ==="
mkdir -p src/sources

echo "=== Step 6: Writing AllManga.js ==="
cat > src/sources/AllManga.js << 'EOF'
const API='https://api.allanime.day/api';
const SITE='https://allmanga.to';
const H={'Content-Type':'application/json','Referer':SITE,'Origin':SITE,'User-Agent':'Mozilla/5.0'};

async function gql(q,v){
  const r=await fetch(API,{method:'POST',headers:H,body:JSON.stringify({query:q,variables:v})});
  if(!r.ok)throw new Error(`AllManga API ${r.status}`);
  const j=await r.json();
  if(j.errors?.length)throw new Error(j.errors[0].message);
  return j.data;
}

const QL=`query($search:SearchInput,$limit:Int,$page:Int){mangas(search:$search,limit:$limit,page:$page){edges{_id name thumbnail status genres}}}`;
const QD=`query($id:String!){manga(_id:$id){_id name thumbnail description genres status authors chapters{edges{_id chapterNum title uploadDate}}}}`;
const QP=`query($id:String!,$num:String!){chapter(_id:$id,chapterNum:$num){pages{edges{pictureUrls pageNum}}}}`;

const norm=m=>({id:m._id,title:m.name||'Unknown',cover:m.thumbnail||'',genres:m.genres||[],status:m.status||'',sourceId:'allanime',sourceName:'AllManga',url:`${SITE}/manga/${m._id}`});

export const AllMangaSource={
  id:'allanime',name:'AllManga',lang:'en',baseUrl:SITE,
  isBuiltIn:true,supportsSearch:true,supportsBrowse:true,

  async browse(page=1){const d=await gql(QL,{search:{sortBy:'Latest',isManga:true},limit:30,page});return(d?.mangas?.edges||[]).map(norm);},
  async search(query,page=1){const d=await gql(QL,{search:{query,isManga:true},limit:30,page});return(d?.mangas?.edges||[]).map(norm);},

  async getMangaDetails(id){
    const d=await gql(QD,{id});const m=d?.manga;if(!m)return null;
    const chapters=(m.chapters?.edges||[]).map((ch,i)=>({id:ch._id,title:ch.title||`Chapter ${ch.chapterNum}`,number:String(ch.chapterNum),date:ch.uploadDate?new Date(ch.uploadDate).toLocaleDateString():'',index:i,sourceId:'allanime',mangaId:id})).sort((a,b)=>parseFloat(b.number)-parseFloat(a.number));
    return{...norm(m),description:m.description||'',author:(m.authors||[]).join(', '),chapters};
  },

  async getPageList(mangaId,chapterNum){
    const d=await gql(QP,{id:mangaId,num:String(chapterNum)});
    return(d?.chapter?.pages?.edges||[]).sort((a,b)=>a.pageNum-b.pageNum).map(p=>({index:p.pageNum,url:(p.pictureUrls||[])[0]||''})).filter(p=>p.url);
  },
};
EOF

echo "=== Step 7: Writing MangaPuma.js ==="
cat > src/sources/MangaPuma.js << 'EOF'
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
EOF

echo "=== Step 8: Writing RavenScans.js ==="
cat > src/sources/RavenScans.js << 'EOF'
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
EOF

echo "=== Step 9: Writing LocalSource.js ==="
cat > src/sources/LocalSource.js << 'EOF'
export const LocalSource={
  id:'local',name:'Local Source',lang:'all',
  isBuiltIn:true,isLocal:true,supportsSearch:true,supportsBrowse:true,
  _files:{},_root:'',

  loadFromFileList(fl){
    this._files={};
    const arr=Array.from(fl);
    if(!arr.length)return 0;
    this._root=arr[0].webkitRelativePath.split('/')[0];
    for(const f of arr)this._files[f.webkitRelativePath]=f;
    return arr.length;
  },

  async browse(){
    const paths=Object.keys(this._files);if(!paths.length)return[];
    const map={};
    for(const p of paths){const parts=p.split('/');if(parts.length<2)continue;const n=parts[1];if(!map[n])map[n]={name:n,files:[]};map[n].files.push(p);}
    const res=[];
    for(const k of Object.keys(map)){const cov=await this._cover(map[k].files);res.push({id:`local:${k}`,title:toT(k),cover:cov,sourceId:'local',sourceName:'Local Source',local:true});}
    return res.sort((a,b)=>a.title.localeCompare(b.title));
  },

  async search(q){return(await this.browse()).filter(m=>m.title.toLowerCase().includes(q.toLowerCase()));},

  async getMangaDetails(id){
    const name=id.replace('local:','');
    const prefix=`${this._root}/${name}/`;
    const paths=Object.keys(this._files).filter(p=>p.startsWith(prefix));
    if(!paths.length)return null;
    const cmap={};
    for(const p of paths){const parts=p.split('/');if(parts.length<3)continue;const ch=parts[2];if(!cmap[ch])cmap[ch]=[];cmap[ch].push(p);}
    const chapters=Object.keys(cmap).map((ch,i)=>({id:`local:${name}/${ch}`,title:toT(ch.replace(/\.(cbz|zip)$/i,'')),number:chN(ch),date:'',index:i,sourceId:'local',mangaId:id,_cbz:/\.(cbz|zip)$/i.test(ch)})).sort((a,b)=>parseFloat(a.number)-parseFloat(b.number));
    const cover=await this._cover(paths);
    return{id,title:toT(name),cover,description:'',genres:[],status:'Local',author:'',sourceId:'local',sourceName:'Local Source',local:true,chapters};
  },

  async getPageList(mangaId,chapterId){
    const rel=chapterId.replace('local:','');const parts=rel.split('/');
    const name=parts[0],ch=parts[1];if(!ch)return[];
    if(/\.(cbz|zip)$/i.test(ch))return this._cbz(name,ch);
    const prefix=`${this._root}/${name}/${ch}/`;
    const imgs=Object.keys(this._files).filter(p=>p.startsWith(prefix)&&isImg(p)).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
    return imgs.map((p,i)=>{const f=this._files[p];return f?{index:i,url:URL.createObjectURL(f),_obj:true}:null;}).filter(Boolean);
  },

  async _cover(paths){
    const f=paths.find(p=>isImg(p)&&/cover/i.test(p))||paths.find(p=>isImg(p));
    if(!f)return null;const file=this._files[f];return file?URL.createObjectURL(file):null;
  },

  async _cbz(name,file){
    const p=`${this._root}/${name}/${file}`;const f=this._files[p];if(!f)return[];
    try{const{default:JSZip}=await import('jszip');const zip=await JSZip.loadAsync(f);const names=Object.keys(zip.files).filter(n=>!zip.files[n].dir&&isImg(n)).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));const pages=[];for(let i=0;i<names.length;i++){const blob=await zip.files[names[i]].async('blob');pages.push({index:i,url:URL.createObjectURL(blob),_obj:true});}return pages;}
    catch(e){console.error('CBZ:',e);return[];}
  },

  revokePages(pages){for(const p of pages){if(p._obj&&p.url?.startsWith('blob:'))URL.revokeObjectURL(p.url);}},
};

const isImg=p=>/\.(jpg|jpeg|png|webp|gif|avif)$/i.test(p);
const toT=s=>s.replace(/\.(cbz|zip|cbr)$/i,'').replace(/[-_]/g,' ').replace(/\b\w/g,c=>c.toUpperCase()).trim();
const chN=s=>{const m=s.replace(/\.(cbz|zip)$/i,'').match(/(\d+(?:\.\d+)?)/);return m?m[1]:'0';};
EOF

echo "=== Step 10: Writing sources/index.js ==="
cat > src/sources/index.js << 'EOF'
import{AllMangaSource}from'./AllManga.js';
import{MangaPumaSource}from'./MangaPuma.js';
import{RavenScansSource}from'./RavenScans.js';
import{LocalSource}from'./LocalSource.js';
export{AllMangaSource,MangaPumaSource,RavenScansSource,LocalSource};
export const BUILT_INS=[AllMangaSource,MangaPumaSource,RavenScansSource,LocalSource];
export function getSource(id){return BUILT_INS.find(s=>s.id===id)||null;}
export function getAllSources(custom=[]){return[...BUILT_INS,...custom.filter(s=>s.enabled!==false).map(s=>{const b=s.url?.replace(/\/$/,'');const PX='https://corsproxy.io/?';const H={'User-Agent':'Mozilla/5.0','Referer':b};async function gD(url){const r=await fetch(PX+encodeURIComponent(url),{headers:H});if(!r.ok)throw new Error(`HTTP ${r.status}`);return new DOMParser().parseFromString(await r.text(),'text/html');}const abs=url=>{if(!url)return'';if(url.startsWith('http'))return url;if(url.startsWith('//'))return'https:'+url;if(url.startsWith('/'))return new URL(b).origin+url;return url;};const iS=el=>el?.getAttribute('data-src')||el?.getAttribute('src')||'';return{id:s.id,name:s.name,lang:s.lang||'en',baseUrl:b,is18Plus:s.is18Plus||false,isBuiltIn:false,supportsSearch:true,supportsBrowse:false,async search(q){const doc=await gD(`${b}${s.searchPath||'/?s='}${encodeURIComponent(q)}`);return Array.from(doc.querySelectorAll('a')).filter(a=>a.querySelector('img')&&a.href).slice(0,24).map(a=>{const im=a.querySelector('img');const t=im?.alt||a.textContent.trim();if(!t||t.length<2)return null;return{id:abs(a.href),title:t,cover:abs(iS(im)),sourceId:s.id,sourceName:s.name,url:abs(a.href)};}).filter(Boolean);},async browse(){return[];},async getMangaDetails(id){const url=id.startsWith('http')?id:b+id;const doc=await gD(url);const title=doc.querySelector('h1,.manga-title')?.textContent?.trim()||doc.title;const cEl=doc.querySelector('[class*="cover"] img,[class*="poster"] img');const chapters=Array.from(doc.querySelectorAll('[class*="chapter"] a')).map((a,i)=>{const t=a.textContent.trim();return{id:abs(a.href),title:t,number:t.match(/(\d+)/)?.[1]||'0',date:'',index:i,sourceId:s.id,mangaId:id};});return{id,title,cover:abs(iS(cEl)),description:'',genres:[],status:'',sourceId:s.id,sourceName:s.name,url,chapters};},async getPageList(mId,chId){const url=chId.startsWith('http')?chId:b+chId;const doc=await gD(url);const sels=['#readerarea img','.reading-content img','.chapter-content img'];let imgs=[];for(const sel of sels){imgs=doc.querySelectorAll(sel);if(imgs.length)break;}return Array.from(imgs).map((el,i)=>({index:i,url:abs(iS(el))})).filter(p=>p.url&&/\.(jpg|jpeg|png|webp)/i.test(p.url));},};})];
}
EOF

echo "=== Step 11: Fix ALL import paths ==="
find src -name "*.jsx" -o -name "*.js" | xargs sed -i \
  -e "s|from '../../store'|from '@store'|g" \
  -e "s|from '../store'|from '@store'|g" \
  -e "s|from '../../store/index.js'|from '@store'|g" \
  -e "s|from '../store/index.js'|from '@store'|g" \
  -e "s|from '../../sources'|from '@sources'|g" \
  -e "s|from '../sources'|from '@sources'|g" \
  -e "s|from '../../sources/index.js'|from '@sources'|g" \
  -e "s|from '../sources/index.js'|from '@sources'|g" \
  -e "s|from '../../utils/scraper'|from '@utils/scraper'|g" \
  -e "s|from '../../utils/scraper.js'|from '@utils/scraper'|g" \
  -e "s|from '../../utils/screenshot'|from '@utils/screenshot'|g" \
  -e "s|from '../../utils/screenshot.js'|from '@utils/screenshot'|g" \
  -e "s|from '../../components/common/Icons'|from '@components/common/Icons'|g" \
  -e "s|from '../../components/common/Icons.jsx'|from '@components/common/Icons'|g" \
  -e "s|from '../../components/common/Toast'|from '@components/common/Toast'|g" \
  -e "s|from '../../components/common/Toast.jsx'|from '@components/common/Toast'|g" \
  -e "s|from '../../components/common/SplashScreen'|from '@components/common/SplashScreen'|g" \
  -e "s|from '../../components/common/SplashScreen.jsx'|from '@components/common/SplashScreen'|g" \
  -e "s|from '../../components/reader/MangaReader'|from '@components/reader/MangaReader'|g" \
  -e "s|from '../../components/reader/MangaReader.jsx'|from '@components/reader/MangaReader'|g" \
  -e "s|from '../common/Icons'|from '@components/common/Icons'|g" \
  -e "s|from '../common/Icons.jsx'|from '@components/common/Icons'|g" \
  -e "s|from '../common/Toast'|from '@components/common/Toast'|g" \
  -e "s|from '../common/SplashScreen'|from '@components/common/SplashScreen'|g" \
  -e "s|from '../reader/MangaReader'|from '@components/reader/MangaReader'|g" \
  -e "s|from '../reader/MangaReader.jsx'|from '@components/reader/MangaReader'|g" \
  -e "s|from '../pages/LibraryPage'|from '@pages/LibraryPage'|g" \
  -e "s|from '../pages/SearchPage'|from '@pages/SearchPage'|g" \
  -e "s|from '../pages/SourcesPage'|from '@pages/SourcesPage'|g" \
  -e "s|from '../pages/UpdatesPage'|from '@pages/UpdatesPage'|g" \
  -e "s|from '../pages/SettingsPage'|from '@pages/SettingsPage'|g" \
  -e "s|from '../pages/MangaDetailPage'|from '@pages/MangaDetailPage'|g"

echo "=== Step 12: Build and push ==="
npm install
npm run build

if [ $? -eq 0 ]; then
  echo "Build SUCCESS"
  npx cap sync android 2>/dev/null || node node_modules/@capacitor/cli/bin/capacitor sync android
  git add .
  git commit -m "Fix: sources, local folder, icons, nav bar, app name, imports"
  git push
  echo "PUSHED - check GitHub Actions"
else
  echo "Build FAILED - check errors above"
fi
