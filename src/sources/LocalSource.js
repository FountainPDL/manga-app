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
