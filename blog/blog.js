const articleRoute = /\/blog\/[^/.]+\/?$/.test(location.pathname);
const BLOG_DATA = articleRoute ? '../data/posts.json' : 'data/posts.json';
const POST_DATA_ROOT = articleRoute ? '../posts/' : 'posts/';
const imageRoot = articleRoute ? '../images/' : 'images/';
const faDate = value => { try { return new Intl.DateTimeFormat('fa-IR-u-nu-arabext',{year:'numeric',month:'long',day:'numeric'}).format(new Date(value+'T12:00:00')); } catch { return value; } };
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function localMarkdownImagePath(url){
  const value=String(url||'').trim().replace(/\\/g,'/');
  const match=value.match(/^(?:images\/)?([a-zA-Z0-9][a-zA-Z0-9._-]*\.(?:png|jpe?g|webp|gif))$/i);
  return match ? imageRoot + encodeURIComponent(match[1]) : '';
}
function inlineMarkdown(s){
  let x=escapeHTML(s);
  x=x.replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*(.+?)\*/g,'<em>$1</em>');
  x=x.replace(/!\[([^\]]*)\]\(([^)]+)\)/g,(_,a,u)=>{const src=localMarkdownImagePath(u);return src?`<img loading="lazy" alt="${a}" src="${escapeHTML(src)}">`:'';});
  x=x.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,(_,a,u)=>`<a href="${escapeHTML(u)}" target="_blank" rel="noopener">${a}</a>`);
  return x;
}
function markdownToHTML(markdown){
  const lines=String(markdown||'').replace(/\r/g,'').split('\n');let out='',para=[],list=null,code=false,codeLines=[];
  const flush=()=>{if(para.length){out+=`<p>${inlineMarkdown(para.join(' '))}</p>`;para=[];}};
  const closeList=()=>{if(list){out+=`</${list}>`;list=null;}};
  for(const line of lines){
    if(line.trim().startsWith('```')){flush();closeList();if(code){out+=`<pre><code>${escapeHTML(codeLines.join('\n'))}</code></pre>`;codeLines=[];code=false;}else code=true;continue;}
    if(code){codeLines.push(line);continue;}
    const h=line.match(/^(#{1,3})\s+(.+)/);const li=line.match(/^\s*[-*]\s+(.+)/);const ol=line.match(/^\s*\d+[.)-]\s+(.+)/);
    if(h){flush();closeList();const n=h[1].length;out+=`<h${n}>${inlineMarkdown(h[2])}</h${n}>`;continue;}
    if(li||ol){flush();const type=li?'ul':'ol';if(list!==type){closeList();list=type;out+=`<${type}>`;}out+=`<li>${inlineMarkdown((li||ol)[1])}</li>`;continue;}
    if(/^>\s?/.test(line)){flush();closeList();out+=`<blockquote>${inlineMarkdown(line.replace(/^>\s?/,''))}</blockquote>`;continue;}
    if(!line.trim()){flush();closeList();continue;}closeList();para.push(line.trim());
  }
  flush();closeList();if(code)out+=`<pre><code>${escapeHTML(codeLines.join('\n'))}</code></pre>`;return out;
}
async function getPosts(){
  const response=await fetch(BLOG_DATA,{cache:'no-store'});
  if(!response.ok)throw new Error('فهرست نوشته‌ها پیدا نشد');
  const data=await response.json();
  if(Array.isArray(data))return sortPostsNewestFirst(data);
  if(data&&typeof data==='object'&&Array.isArray(data.posts))return sortPostsNewestFirst(data.posts);
  if(data&&typeof data==='object'&&Array.isArray(data.items))return sortPostsNewestFirst(data.items);
  return data&&typeof data==='object'&&data.slug?[data]:[];
}
function getPostDateSortValue(value){
  const fa='۰۱۲۳۴۵۶۷۸۹';
  const ar='٠١٢٣٤٥٦٧٨٩';
  const text=String(value??'').trim().replace(/[۰-۹٠-٩]/g,d=>{
    const i=fa.indexOf(d);
    return String(i>=0?i:ar.indexOf(d));
  });
  // CMS dates are saved as ISO YYYY-MM-DD. Convert them to a numeric key
  // without relying on browser locale or timezone parsing.
  const m=text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:$|[T\s])/);
  if(m){
    const y=Number(m[1]), mo=Number(m[2]), d=Number(m[3]);
    const check=new Date(Date.UTC(y,mo-1,d));
    if(check.getUTCFullYear()===y && check.getUTCMonth()===mo-1 && check.getUTCDate()===d){
      return y*10000+mo*100+d;
    }
    return Number.MIN_SAFE_INTEGER;
  }
  const parsed=Date.parse(text);
  return Number.isFinite(parsed)?parsed:Number.MIN_SAFE_INTEGER;
}
function sortPostsNewestFirst(posts){
  return (Array.isArray(posts)?posts:[])
    .map((post,index)=>({post,index,key:getPostDateSortValue(post?.date)}))
    .sort((a,b)=>(b.key-a.key) || (a.index-b.index))
    .map(item=>item.post);
}
async function getPostContent(slug){
  const root=POST_DATA_ROOT+encodeURIComponent(slug)+'/';
  const metaResponse=await fetch(root+'post.json',{cache:'no-store'});
  if(!metaResponse.ok)throw new Error('اطلاعات مقاله پیدا نشد');
  const meta=await metaResponse.json();
  const bodyResponse=await fetch(root+'content.md',{cache:'no-store'});
  if(!bodyResponse.ok)throw new Error('متن مقاله پیدا نشد');
  return {...meta,body:await bodyResponse.text()};
}
function imagePath(post){return imageRoot+encodeURIComponent(post.image||'');}
function card(post){
  const img=imagePath(post);
  return `<article class="post-card"><a class="post-card-image" href="${encodeURIComponent(post.slug)}/"><img src="${escapeHTML(img)}" alt="${escapeHTML(post.caption||post.title)}" loading="lazy" onerror="this.style.display='none';this.parentElement.innerHTML='<span class=&quot;image-fallback&quot;>✳</span>';"></a><div class="post-card-copy"><div class="post-meta"><span class="post-category">${escapeHTML(post.category)}</span><span>${faDate(post.date)}</span></div><h2><a href="${encodeURIComponent(post.slug)}/">${escapeHTML(post.title)}</a></h2><p>${escapeHTML(post.excerpt)}</p><a class="read-more" href="${encodeURIComponent(post.slug)}/">ادامه نوشته ↙</a></div></article>`;
}
async function renderIndex(){
  const host=document.querySelector('#posts');if(!host)return;
  try{
    const posts=sortPostsNewestFirst(await getPosts());const categories=['همه',...new Set(posts.map(p=>p.category).filter(Boolean))];let active='همه';
    const filters=document.querySelector('#filters');filters.innerHTML=categories.map(c=>`<button class="filter-chip ${c==='همه'?'active':''}" data-category="${escapeHTML(c)}">${escapeHTML(c)}</button>`).join('');
    const search=document.querySelector('#search');
    const draw=()=>{const q=search.value.trim().toLocaleLowerCase();const shown=posts.filter(p=>(active==='همه'||p.category===active)&&[p.title,p.excerpt,p.category].join(' ').toLocaleLowerCase().includes(q));host.innerHTML=shown.map(card).join('');document.querySelector('#empty').hidden=shown.length>0;document.querySelector('#post-count').textContent=new Intl.NumberFormat('fa-IR-u-nu-arabext').format(posts.length);};
    filters.addEventListener('click',e=>{const b=e.target.closest('button[data-category]');if(!b)return;active=b.dataset.category;filters.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));draw();});
    search.addEventListener('input',draw);draw();
  }catch(e){host.innerHTML='<p class="empty-state">فهرست نوشته‌ها بارگذاری نشد. پوشه پروژه را با Live Server اجرا کنید.</p>';}
}
async function renderArticle(){
  const host=document.querySelector('#article');if(!host)return;
  try{
    const posts=await getPosts();const pathSlug=decodeURIComponent(location.pathname.match(/\/blog\/([^/]+)\/?$/)?.[1]||'');const slug=new URLSearchParams(location.search).get('slug')||pathSlug;
    const summary=posts.find(x=>x.slug===slug);
    if(!summary){host.innerHTML=`<h1>نوشته پیدا نشد</h1><p><a href="${articleRoute?'../':'./'}">بازگشت به بلاگ</a></p>`;return;}
    const p=await getPostContent(slug);document.title=p.title+' | مسعود بارانی';
    const tags=(p.tags||[]).map(t=>`<span>${escapeHTML(t)}</span>`).join('، ');
    const cover=p.image?`<img class="article-cover" src="${escapeHTML(imagePath(p))}" alt="${escapeHTML(p.caption||p.title)}" onerror="this.style.display='none';">`:'';
    host.innerHTML=`<header class="article-header"><div class="post-meta"><span class="post-category">${escapeHTML(p.category)}</span><span>${faDate(p.date)}</span></div><h1>${escapeHTML(p.title)}</h1><p class="article-excerpt">${escapeHTML(p.excerpt)}</p></header>${cover}<p class="image-caption">${escapeHTML(p.caption||'')}</p><div class="article-content">${markdownToHTML(p.body)}</div><div class="post-meta article-tags">برچسب‌ها: ${tags}</div>`;
  }catch(e){host.innerHTML='<p>بارگذاری نوشته ناموفق بود. پروژه را با Live Server اجرا کنید.</p>';}
}
const toggle=document.querySelector('.menu-toggle'),nav=document.querySelector('.nav');toggle?.addEventListener('click',()=>{const open=nav.classList.toggle('open');toggle.setAttribute('aria-expanded',String(open));toggle.textContent=open?'×':'☰';});
renderIndex();renderArticle();
