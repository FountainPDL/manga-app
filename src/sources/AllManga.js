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
