import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const base = SUPABASE_URL.replace(/\/$/, '');
const ready = base.startsWith('https://') && !base.includes('YOUR_') && !SUPABASE_ANON_KEY.includes('YOUR_');
const sessionKey = 'quiet-pages-session';
const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const niceDate = value => { const date = new Date(value); return Number.isNaN(date.getTime()) ? 'DATE NOT SET' : date.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}); };
const getSession = () => { try { return JSON.parse(localStorage.getItem(sessionKey) || 'null'); } catch { return null; } };
const setSession = value => localStorage.setItem(sessionKey, JSON.stringify(value));
const clearSession = () => localStorage.removeItem(sessionKey);
const byId = id => document.getElementById(id);

// Keep the app shell available for launch/install; the live journal and audio use the network.
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(error => console.warn('Ashtray offline shell unavailable.', error)));
}

let installPrompt = null;
const installButton = byId('install-app');
const installMessage = byId('install-message');
if (installButton && window.matchMedia('(display-mode: standalone)').matches) {
  installButton.textContent = '[ INSTALLED ]';
  installButton.disabled = true;
}
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; });
window.addEventListener('appinstalled', () => { installPrompt = null; if (installButton) { installButton.textContent = '[ INSTALLED ]'; installButton.disabled = true; } });
if (installButton) installButton.addEventListener('click', async () => {
  if (installPrompt) {
    try { await installPrompt.prompt(); const choice = await installPrompt.userChoice; installPrompt = null; if (choice?.outcome === 'accepted') installButton.textContent = '[ INSTALLING ]'; }
    catch { installPrompt = null; if (installMessage) { installMessage.textContent = 'Use your browser menu and choose Install Ashtray or Add to Home Screen.'; installMessage.hidden = false; } }
    return;
  }
  if (installMessage) {
    const agent = navigator.userAgent;
    installMessage.textContent = /iPhone|iPad|iPod/i.test(agent) ? 'On iPhone or iPad: tap Share, then Add to Home Screen.' : /Android/i.test(agent) ? 'On Android: open the browser menu ⋮ and choose Install Ashtray or Add to Home screen.' : 'Open your browser menu and choose Install Ashtray or Install app.';
    installMessage.hidden = false;
  }
});
if (installMessage) document.addEventListener('click', event => { if (!event.target.closest('#install-app') && !event.target.closest('#install-message')) installMessage.hidden = true; });

async function authCall(path, body) {
  const response = await fetch(base + '/auth/v1/' + path, {method:'POST',headers:{apikey:SUPABASE_ANON_KEY,'Content-Type':'application/json'},body:JSON.stringify(body)});
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.msg || data.message || data.error_description || 'Sign-in failed. Check your email and password.');
  return data;
}
async function getFreshSession() {
  let current = getSession();
  if (current?.expires_at && current.expires_at < Date.now()/1000 + 45 && current.refresh_token) {
    try { const renewed = await authCall('token?grant_type=refresh_token',{refresh_token:current.refresh_token}); current = Object.assign({},renewed,{expires_at:Date.now()/1000+(renewed.expires_in||3600)}); setSession(current); }
    catch { clearSession(); current = null; }
  }
  return current;
}
async function api(path, options = {}) {
  const current = await getFreshSession();
  const headers = Object.assign({apikey:SUPABASE_ANON_KEY,Authorization:'Bearer '+(current?.access_token||SUPABASE_ANON_KEY)},options.headers||{});
  if (options.body && !(options.body instanceof File) && !headers['Content-Type']) headers['Content-Type']='application/json';
  const response = await fetch(base+path,Object.assign({},options,{headers}));
  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error((data&&(data.message||data.error||data.hint))||('Request failed ('+response.status+').'));
  return data;
}
function setMessage(node, text) { if (node) node.textContent = text || ''; }
function showMessage(form, text) { setMessage(form?.querySelector('.form-message'),text); }
const isVideoUrl = url => /\.(?:mp4|webm|mov|m4v|ogv)(?:[?#]|$)/i.test(String(url||''));
const isVideo = post => /video/i.test(post.category||'') || isVideoUrl(post.photo_url);
const isPhoto = post => !!post.photo_url || /photo|video/i.test(post.category||'');
const postKind = post => isPhoto(post) ? 'photo' : 'write';
const publicUrl = path => base+'/storage/v1/object/public/astray-music/'+String(path||'').split('/').map(encodeURIComponent).join('/');

// Public archive, the three filters, and the expandable reading view.
let publicPosts = [];
let activeFilter = 'all';
function renderPublicPosts() {
  const node = byId('journal-feed');
  if (!node) return;
  const visible = publicPosts.filter(post => activeFilter === 'all' || postKind(post) === activeFilter);
  node.innerHTML = visible.map((post,index) => {
    const photo = isPhoto(post);
    const video = isVideo(post);
    const image = photo ? '<span class="entry-image'+(video?' entry-video':'')+'">'+(video?'<video src="'+esc(post.photo_url)+'" muted playsinline preload="metadata" aria-label="Video: '+esc(post.title)+'"></video><span class="video-chip" aria-hidden="true">▶ VIDEO</span>':'<img src="'+esc(post.photo_url)+'" alt="'+esc(post.title)+'" loading="lazy">')+'</span>' : '';
    const category = video ? 'Video' : post.category || (photo ? 'Photography' : 'Writing');
    return '<button class="journal-entry '+(photo?'with-photo':'writing-only')+'" data-post="'+esc(post.id)+'" data-index="'+(index+1)+'" type="button">'+image+'<span class="entry-copy"><span class="entry-date">'+esc(category)+' · '+esc(niceDate(post.created_at))+'</span><strong>'+esc(post.title)+'</strong>'+(post.excerpt?'<span class="entry-excerpt">'+esc(post.excerpt)+'</span>':'')+'<span class="entry-number">'+String(index+1).padStart(2,'0')+'</span></span></button>';
  }).join('');
  const empty = byId('empty-state');
  if (empty) { empty.hidden = visible.length > 0; empty.textContent = activeFilter === 'all' ? 'This archive is waiting for its first entry.' : 'Nothing here yet. Try another section.'; }
}
function updateCounts() {
  const photos = publicPosts.filter(isPhoto).length;
  const writes = publicPosts.length - photos;
  if (byId('count-all')) byId('count-all').textContent=String(publicPosts.length).padStart(2,'0');
  if (byId('count-photo')) byId('count-photo').textContent=String(photos).padStart(2,'0');
  if (byId('count-write')) byId('count-write').textContent=String(writes).padStart(2,'0');
}
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click',() => {
  activeFilter=button.dataset.filter;
  document.querySelectorAll('[data-filter]').forEach(item=>item.classList.toggle('active',item===button));
  renderPublicPosts();
}));
const feed = byId('journal-feed');
feed?.addEventListener('click',event => {
  const button=event.target.closest('[data-post]'); if(!button)return;
  const post=publicPosts.find(item=>String(item.id)===button.dataset.post);if(!post)return;
  const photo=isPhoto(post),video=isVideo(post);
  const body=esc(post.body||'').split('\n').map(line=>line.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*(.+?)\*/g,'<em>$1</em>')).join('\n');
  const media=video?'<video class="detail-video" src="'+esc(post.photo_url)+'" controls playsinline preload="metadata" aria-label="'+esc(post.title)+'"></video>':photo?'<img class="detail-photo" src="'+esc(post.photo_url)+'" alt="'+esc(post.title)+'">':'';
  byId('post-detail').innerHTML=media+'<p class="entry-date">'+esc(video?'Video':post.category|| (photo?'Photography':'Writing'))+' · '+esc(niceDate(post.created_at))+'</p><h1>'+esc(post.title)+'</h1>'+(post.excerpt?'<p class="detail-excerpt">'+esc(post.excerpt)+'</p>':'')+'<div class="prose">'+body+'</div>';
  byId('post-dialog').showModal();
});
byId('post-dialog')?.querySelector('.close')?.addEventListener('click',()=>byId('post-dialog').close());
byId('post-dialog')?.addEventListener('close',()=>byId('post-detail')?.querySelectorAll('video').forEach(video=>video.pause()));

function setPlaylistOptions(select,playlists) {
  if(!select)return;
  const selected=select.value;
  select.innerHTML='<option value="">Choose a playlist</option>'+playlists.map((list,index)=>'<option value="'+esc(list.id)+'">'+esc(list.name||('Playlist '+String(index+1).padStart(2,'0')) )+'</option>').join('');
  if(playlists.some(item=>String(item.id)===selected))select.value=selected;
}
function createPlayer(prefix,playlists,tracks) {
  const audio=byId(prefix+'-audio'),select=byId(prefix+'-playlist');if(!audio||!select)return;
  const title=byId(prefix+'-track-title'),subtitle=byId(prefix+'-track-subtitle');
  const playButton=byId(prefix+'-play'),progress=byId(prefix+'-progress');
  const mediaSession=navigator.mediaSession;
  let queue=[],index=0;
  setPlaylistOptions(select,playlists);
  const currentPlaylist=()=>playlists.find(item=>String(item.id)===select.value);
  const setMediaMetadata=()=>{
    const track=queue[index];
    if(!mediaSession)return;
    try{
      if(track&&'MediaMetadata' in window)mediaSession.metadata=new MediaMetadata({title:track.title||'Ashtray',artist:currentPlaylist()?.name||'Ashtray Radio',album:'Ashtray',artwork:[{src:new URL('./astray-icon-512.png',location.href).href,sizes:'512x512',type:'image/png'}]});
      else mediaSession.metadata=null;
    }catch{}
  };
  const paint=()=>{
    const track=queue[index];
    if(title)title.textContent=track?.title||'Select a playlist';
    if(subtitle)subtitle.textContent=track?(currentPlaylist()?.name||'ASHTRAY RADIO'):'ASHTRAY RADIO';
    if(playButton){playButton.textContent=audio.paused?'▶':'Ⅱ';playButton.setAttribute('aria-label',audio.paused?'Play':'Pause');}
    if(progress)progress.style.width=(audio.duration?audio.currentTime/audio.duration*100:0)+'%';
    if(mediaSession){try{mediaSession.playbackState=track?(audio.paused?'paused':'playing'):'none';}catch{}}
    if(mediaSession&&audio.duration&&Number.isFinite(audio.duration)){try{mediaSession.setPositionState({duration:audio.duration,playbackRate:audio.playbackRate,position:audio.currentTime});}catch{}}
  };
  const loadTrack=(next,autoplay)=>{
    if(!queue.length){audio.removeAttribute('src');audio.load();paint();return;}
    index=(next+queue.length)%queue.length;
    audio.src=publicUrl(queue[index].storage_path);audio.load();setMediaMetadata();paint();
    if(autoplay)audio.play().catch(()=>paint());
  };
  select.addEventListener('change',()=>{
    const wasPlaying=!audio.paused;
    queue=tracks.filter(track=>String(track.playlist_id)===select.value).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
    if(!select.value){queue=[];loadTrack(0,false);return;}
    loadTrack(0,wasPlaying);
  });
  byId(prefix+'-play')?.addEventListener('click',()=>{
    if(!select.value){if(title)title.textContent='Choose a playlist first';return;}
    if(!queue.length){if(title)title.textContent='No songs in this playlist yet';return;}
    if(audio.paused)audio.play().catch(()=>{if(title)title.textContent='Tap play to start listening';});else audio.pause();
  });
  byId(prefix+'-next')?.addEventListener('click',()=>loadTrack(index+1,true));
  byId(prefix+'-prev')?.addEventListener('click',()=>loadTrack(index-1,true));
  audio.addEventListener('ended',()=>loadTrack(index+1,true));
  audio.addEventListener('play',paint);audio.addEventListener('pause',paint);audio.addEventListener('timeupdate',paint);audio.addEventListener('loadedmetadata',paint);
  if(mediaSession){
    const handlers={play:()=>audio.play().catch(()=>paint()),pause:()=>audio.pause(),previoustrack:()=>loadTrack(index-1,true),nexttrack:()=>loadTrack(index+1,true),seekbackward:details=>{audio.currentTime=Math.max(0,audio.currentTime-(details.seekOffset||10));},seekforward:details=>{audio.currentTime=Math.min(audio.duration||Infinity,audio.currentTime+(details.seekOffset||10));},seekto:details=>{if(Number.isFinite(details.seekTime))audio.currentTime=details.seekTime;}};
    for(const [action,handler] of Object.entries(handlers)){try{mediaSession.setActionHandler(action,handler);}catch{}}
  }
  const volume=byId(prefix+'-volume'),output=byId(prefix+'-volume-value');
  const applyVolume=()=>{const level=Number(volume?.value||3);audio.volume=level/10;if(output)output.value=String(level).padStart(2,'0');};
  volume?.addEventListener('input',applyVolume);applyVolume();paint();
}

async function loadPublic() {
  if(!feed)return;
  try {
    publicPosts=ready?await api('/rest/v1/posts?select=*&published=eq.true&order=created_at.desc'):[];
    updateCounts();renderPublicPosts();
    try {
      const [playlists,tracks]=await Promise.all([api('/rest/v1/playlists?select=*&order=slot.asc'),api('/rest/v1/playlist_tracks?select=*&order=sort_order.asc')]);
      createPlayer('public',playlists,tracks);
    } catch(error) { console.warn('Playlist setup is not available yet.',error);createPlayer('public',[],[]); }
  } catch(error) { console.error('Ashtray entries could not be loaded.',error);const empty=byId('empty-state');if(empty){empty.textContent='The archive could not load right now. Please refresh in a moment.';empty.hidden=false;} }
}
void loadPublic();

// Private author desk.
const login=byId('login-form');
if(login){
  const panel=byId('sign-in'),dashboard=byId('dashboard'),writeForm=byId('post-form'),photoForm=byId('photo-form'),postList=byId('admin-posts');
  let adminRows=[],playlists=[],tracks=[],currentMediaUrl=null,previewObjectUrl=null,activeTab='writing';
  const previewImage=byId('media-preview-image'),previewVideo=byId('media-preview-video');
  function clearMediaPreview(){
    if(previewObjectUrl){URL.revokeObjectURL(previewObjectUrl);previewObjectUrl=null;}
    if(previewImage){previewImage.removeAttribute('src');previewImage.hidden=true;}
    if(previewVideo){previewVideo.pause();previewVideo.removeAttribute('src');previewVideo.load();previewVideo.hidden=true;}
  }
  function showMediaPreview(url,video){
    clearMediaPreview();if(!url)return;
    if(video&&previewVideo){previewVideo.src=url;previewVideo.hidden=false;previewVideo.play().catch(()=>{});}
    else if(previewImage){previewImage.src=url;previewImage.hidden=false;}
  }
  function switchTab(name){
    activeTab=name;
    for(const tab of document.querySelectorAll('.desk-tab')){const active=tab.dataset.panel===name;tab.classList.toggle('active',active);tab.setAttribute('aria-selected',String(active));}
    for(const panelName of ['writing','photo','music']){const node=byId(panelName+'-panel');if(node)node.hidden=panelName!==name;}
  }
  document.querySelectorAll('.desk-tab').forEach(tab=>tab.addEventListener('click',()=>switchTab(tab.dataset.panel)));
  async function loadAdminPosts(){
    adminRows=await api('/rest/v1/posts?select=*&order=created_at.desc');
    postList.innerHTML=adminRows.length?adminRows.map(post=>'<article class="admin-row"><div><strong>'+esc(post.title)+'</strong><small>'+esc(isVideo(post)?'Video':post.category||'Writing')+' · '+(post.published?'PUBLISHED':'DRAFT')+'</small></div><div class="admin-row-actions"><button class="text-button" type="button" data-edit="'+esc(post.id)+'">EDIT</button><button class="text-button" type="button" data-delete="'+esc(post.id)+'">DELETE</button></div></article>').join(''):'<p class="muted">Your saved entries will appear here.</p>';
  }
  async function loadMusicAdmin(){
    try { playlists=await api('/rest/v1/playlists?select=*&order=slot.asc');tracks=await api('/rest/v1/playlist_tracks?select=*&order=sort_order.asc');renderPlaylistManager();createPlayer('desk',playlists,tracks); }
    catch(error){byId('playlist-manager').innerHTML='<p class="setup-note">Music library needs the updated Supabase setup. Run the new supabase-setup.sql once in SQL Editor, then refresh this page.</p>';setMessage(byId('music-message'),error.message);}
  }
  async function showDashboard(current){
    panel.hidden=!!current;dashboard.hidden=!current;
    const logout=byId('sign-out');if(logout)logout.hidden=!current;
    if(current){try{await Promise.all([loadAdminPosts(),loadMusicAdmin()]);}catch(error){showMessage(writeForm,error.message);}}
  }
  login.addEventListener('submit',async event=>{
    event.preventDefault();if(!ready){showMessage(login,'Setup missing. Check config.js.');return;}
    const button=login.querySelector('[type="submit"]'),values=new FormData(login);button.disabled=true;showMessage(login,'Signing in…');
    try{const data=await authCall('token?grant_type=password',{email:values.get('email'),password:values.get('password')});setSession(Object.assign({},data,{expires_at:Date.now()/1000+(data.expires_in||3600)}));await showDashboard(data);login.reset();}
    catch(error){showMessage(login,error.message);}finally{button.disabled=false;}
  });
  if(!ready)showMessage(login,'Setup missing. Check config.js.');else getFreshSession().then(showDashboard).catch(error=>showMessage(login,error.message));
  byId('sign-out')?.addEventListener('click',async()=>{try{await api('/auth/v1/logout',{method:'POST'});}catch{}clearSession();await showDashboard(null);});
  byId('new-entry')?.addEventListener('click',()=>{writeForm.reset();photoForm.reset();writeForm.elements.id.value='';photoForm.elements.id.value='';currentMediaUrl=null;clearMediaPreview();switchTab('writing');window.scrollTo({top:0,behavior:'smooth'});});
  postList?.addEventListener('click',async event=>{
    const edit=event.target.closest('[data-edit]'),remove=event.target.closest('[data-delete]');
    if(edit){const post=adminRows.find(item=>String(item.id)===edit.dataset.edit);if(!post)return;const form=isPhoto(post)?photoForm:writeForm;writeForm.reset();photoForm.reset();clearMediaPreview();writeForm.elements.id.value=post.id;photoForm.elements.id.value=post.id;currentMediaUrl=post.photo_url||null;
      if(isPhoto(post)){photoForm.elements.title.value=post.title||'';photoForm.elements.excerpt.value=post.excerpt||'';if(currentMediaUrl)showMediaPreview(currentMediaUrl,isVideo(post));switchTab('photo');}
      else{writeForm.elements.title.value=post.title||'';writeForm.elements.excerpt.value=post.excerpt||'';writeForm.elements.body.value=post.body||'';switchTab('writing');}
      window.scrollTo({top:0,behavior:'smooth'});return;
    }
    if(remove&&confirm('Delete this entry permanently?')){try{await api('/rest/v1/posts?id=eq.'+encodeURIComponent(remove.dataset.delete),{method:'DELETE'});await loadAdminPosts();}catch(error){setMessage(byId('music-message'),error.message);}}
  });
  byId('photo-file')?.addEventListener('change',()=>{const file=byId('photo-file').files[0];if(!file){if(!currentMediaUrl)clearMediaPreview();return;}const objectUrl=URL.createObjectURL(file);showMediaPreview(objectUrl,file.type.startsWith('video/')||isVideoUrl(file.name));previewObjectUrl=objectUrl;});
  for(const button of document.querySelectorAll('[data-format]'))button.addEventListener('click',()=>{
    const area=byId('post-body'),start=area.selectionStart,end=area.selectionEnd,selected=area.value.slice(start,end),format=button.dataset.format;
    const wrapper=format==='bold'?['**','**']:format==='italic'?['*','*']:['> ',''];
    area.setRangeText(wrapper[0]+(selected||'your words')+wrapper[1],start,end,'select');area.focus();
  });
  async function savePost(kind,published){
    const form=kind==='photo'?photoForm:writeForm;
    if(!form.reportValidity())return;
    const values=new FormData(form),id=values.get('id');
    try{
      showMessage(form,published?'Publishing…':'Saving draft…');let photoUrl=kind==='photo'?currentMediaUrl:null;
      const photo=values.get('photo');
      let mediaIsVideo=currentMediaUrl?isVideo({photo_url:currentMediaUrl}):false;
      if(kind==='photo'&&photo?.size){
        const ext=(photo.name.split('.').pop()||'').replace(/[^a-z0-9]/gi,'').toLowerCase();
        const videoFile=photo.type.startsWith('video/')||isVideoUrl(photo.name);
        const imageFile=photo.type.startsWith('image/')||/^(?:jpe?g|png|gif|webp|avif|heic|heif|bmp|tiff?)$/i.test(ext);
        if(!videoFile&&!imageFile)throw new Error('Choose an image or a video file (MP4, WebM, or MOV).');
        const path=crypto.randomUUID()+'.'+(ext|| (videoFile?'mp4':'jpg'));
        await api('/storage/v1/object/journal-photos/'+path,{method:'POST',body:photo,headers:{'Content-Type':photo.type|| (videoFile?'video/mp4':'application/octet-stream')}});
        photoUrl=base+'/storage/v1/object/public/journal-photos/'+path;mediaIsVideo=videoFile;
      }
      if(kind==='photo'&&!photoUrl)throw new Error('Choose a photograph or video before saving.');
      const row={title:values.get('title').trim(),excerpt:(values.get('excerpt')||'').trim(),category:kind==='photo'?(mediaIsVideo?'Video':'Photography'):'Writing',body:kind==='photo'?((values.get('excerpt')||'').trim()||values.get('title').trim()):values.get('body').trim(),photo_url:photoUrl,published};
      await api(id?'/rest/v1/posts?id=eq.'+encodeURIComponent(id):'/rest/v1/posts',{method:id?'PATCH':'POST',body:JSON.stringify(row),headers:{'Content-Type':'application/json','Prefer':'return=minimal'}});
      form.reset();writeForm.elements.id.value='';photoForm.elements.id.value='';currentMediaUrl=null;clearMediaPreview();showMessage(form,published?'Published.':'Draft saved.');await loadAdminPosts();
    }catch(error){showMessage(form,error.message||'Could not save this entry.');}
  }
  byId('save-draft')?.addEventListener('click',()=>savePost(activeTab==='photo'?'photo':'write',false));
  byId('publish-post')?.addEventListener('click',()=>savePost(activeTab==='photo'?'photo':'write',true));
  async function renderPlaylistManager(){
    const root=byId('playlist-manager');if(!root)return;
    root.innerHTML=playlists.map((playlist,index)=>{
      const items=tracks.filter(track=>String(track.playlist_id)===String(playlist.id)).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
      return '<section class="playlist-card" data-playlist-card="'+esc(playlist.id)+'"><div class="playlist-card-head"><span class="slot">0'+(playlist.slot||index+1)+'</span><input data-playlist-name value="'+esc(playlist.name)+'" aria-label="Playlist name"><button type="button" data-save-playlist="'+esc(playlist.id)+'">SAVE NAME</button></div><label class="track-upload">ADD SONGS<input type="file" accept="audio/*" multiple data-upload-playlist="'+esc(playlist.id)+'"></label><ul class="track-list">'+(items.length?items.map(track=>'<li><span>'+esc(track.title)+'</span><button type="button" data-delete-track="'+esc(track.id)+'" data-path="'+esc(track.storage_path)+'">REMOVE</button></li>').join(''):'<li><span>No songs added yet.</span></li>')+'</ul></section>';
    }).join('')||'<p class="setup-note">Run the updated Supabase setup SQL once to create five playlists.</p>';
    setPlaylistOptions(byId('desk-playlist'),playlists);
  }
  byId('playlist-manager')?.addEventListener('click',async event=>{
    const save=event.target.closest('[data-save-playlist]'),remove=event.target.closest('[data-delete-track]');
    try{
      if(save){const card=save.closest('[data-playlist-card]'),name=card.querySelector('[data-playlist-name]').value.trim()||('Playlist '+save.dataset.savePlaylist);await api('/rest/v1/playlists?id=eq.'+encodeURIComponent(save.dataset.savePlaylist),{method:'PATCH',body:JSON.stringify({name}),headers:{'Content-Type':'application/json','Prefer':'return=minimal'}});await loadMusicAdmin();setMessage(byId('music-message'),'Playlist name saved.');}
      if(remove){await api('/rest/v1/playlist_tracks?id=eq.'+encodeURIComponent(remove.dataset.deleteTrack),{method:'DELETE'});await api('/storage/v1/object/astray-music',{method:'DELETE',body:JSON.stringify({prefixes:[remove.dataset.path]})});await loadMusicAdmin();setMessage(byId('music-message'),'Song removed.');}
    }catch(error){setMessage(byId('music-message'),error.message);}
  });
  byId('playlist-manager')?.addEventListener('change',async event=>{
    const input=event.target.closest('[data-upload-playlist]');if(!input||!input.files?.length)return;
    const playlistId=input.dataset.uploadPlaylist,files=Array.from(input.files);input.disabled=true;setMessage(byId('music-message'),'Adding songs…');
    try{
      let order=tracks.filter(track=>String(track.playlist_id)===playlistId).length;
      for(const file of files){const ext=(file.name.split('.').pop()||'mp3').replace(/[^a-z0-9]/gi,'')||'mp3',path=crypto.randomUUID()+'.'+ext;await api('/storage/v1/object/astray-music/'+path,{method:'POST',body:file,headers:{'Content-Type':file.type||'audio/mpeg'}});const title=file.name.replace(/\.[^.]+$/,'');await api('/rest/v1/playlist_tracks',{method:'POST',body:JSON.stringify({playlist_id:playlistId,title,storage_path:path,sort_order:++order}),headers:{'Content-Type':'application/json','Prefer':'return=minimal'}});}
      await loadMusicAdmin();setMessage(byId('music-message'),'Songs added. Tracks play in order and advance automatically.');
    }catch(error){setMessage(byId('music-message'),error.message||'Could not add the songs.');}finally{input.disabled=false;input.value='';}
  });
}
