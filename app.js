import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
const base = SUPABASE_URL.replace(/\/$/, '');
const ready = base.startsWith('https://') && !base.includes('YOUR_') && !SUPABASE_ANON_KEY.includes('YOUR_');
const sessionKey = 'quiet-pages-session';
const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const niceDate = value => new Date(value + 'T12:00:00').toLocaleDateString(undefined, {year:'numeric',month:'short',day:'numeric'});
const getSession = () => { try { return JSON.parse(localStorage.getItem(sessionKey) || 'null'); } catch { return null; } };
const setSession = value => localStorage.setItem(sessionKey, JSON.stringify(value));
const clearSession = () => localStorage.removeItem(sessionKey);

async function authCall(path, body) {
  const response = await fetch(base + '/auth/v1/' + path, {method:'POST',headers:{apikey:SUPABASE_ANON_KEY,'Content-Type':'application/json'},body:JSON.stringify(body)});
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.msg || data.message || data.error_description || 'Sign-in failed. Check your email and password.');
  return data;
}
async function getFreshSession() {
  let current = getSession();
  if (current && current.expires_at && current.expires_at < Date.now()/1000 + 45 && current.refresh_token) {
    try {
      const renewed = await authCall('token?grant_type=refresh_token', {refresh_token:current.refresh_token});
      current = Object.assign({}, renewed, {expires_at:Date.now()/1000 + (renewed.expires_in || 3600)});
      setSession(current);
    } catch { clearSession(); current = null; }
  }
  return current;
}
async function api(path, options) {
  options = options || {};
  const current = await getFreshSession();
  const headers = Object.assign({apikey:SUPABASE_ANON_KEY,Authorization:'Bearer ' + (current ? current.access_token : SUPABASE_ANON_KEY)}, options.headers || {});
  if (options.body && !(options.body instanceof File) && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  const response = await fetch(base + path, Object.assign({}, options, {headers:headers}));
  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error((data && (data.message || data.error || data.hint)) || ('Request failed (' + response.status + ').'));
  return data;
}
function showMessage(form, text) { const node = form && form.querySelector('.form-message'); if (node) node.textContent = text; }

async function loadPublic() {
  const node = document.querySelector('#posts');
  if (!node) return;
  try {
    let posts;
    if (ready) posts = await api('/rest/v1/posts?select=*&published=eq.true&order=created_at.desc');
    else posts = [
      {id:'demo1',title:'The light at the end of the day',excerpt:'Some evenings ask nothing of us but that we notice them.',category:'Journal',body:'The day softened around the edges.\n\nI watched the last light find its way across the room and thought how often the smallest things are the ones that stay.',created_at:'2026-10-21'},
      {id:'demo2',title:'A small archive of ordinary things',excerpt:'A list of things I hope I remember.',category:'Writing',body:'The sound of rain arriving before the rain.\nA cup left warm between both hands.\nSomeone saving you the window seat.',created_at:'2026-10-13'}
    ];
    document.querySelector('#post-count').textContent = posts.length + ' ENTRIES';
    node.innerHTML = posts.length ? posts.map((p,i) => '<button class="post-card" data-post="' + esc(p.id) + '"><span class="post-image" ' + (p.photo_url ? 'style="background-image:url(\'' + esc(p.photo_url) + '\')"':'') + '><span>' + String(i+1).padStart(2,'0') + '</span></span><span class="post-meta">' + esc(p.category) + ' · ' + niceDate(p.created_at) + '</span><span class="post-title">' + esc(p.title) + '</span><span class="post-excerpt">' + esc(p.excerpt || 'Open entry →') + '</span></button>').join('') : '<p class="muted">No pages published yet.</p>';
    node.addEventListener('click', event => {
      const button = event.target.closest('[data-post]');
      if (!button) return;
      const post = posts.find(item => String(item.id) === button.dataset.post);
      document.querySelector('#post-detail').innerHTML = (post.photo_url ? '<img class="detail-photo" src="' + esc(post.photo_url) + '" alt="">' : '') + '<h1>' + esc(post.title) + '</h1><p class="detail-excerpt">' + esc(post.excerpt || '') + '</p><div class="prose">' + esc(post.body) + '</div>';
      document.querySelector('#post-dialog').showModal();
    });
  } catch { node.textContent = 'Could not load journal entries. Check the Supabase setup.'; }
}
void loadPublic();
const dialog = document.querySelector('#post-dialog');
dialog && dialog.querySelector('.close') && dialog.querySelector('.close').addEventListener('click', () => dialog.close());

const login = document.querySelector('#login-form');
if (login) {
  const panel = document.querySelector('#sign-in');
  const dashboard = document.querySelector('#dashboard');
  const editor = document.querySelector('#post-form');
  const list = document.querySelector('#admin-posts');
  async function loadAdminPosts() {
    const rows = await api('/rest/v1/posts?select=*&order=created_at.desc');
    list.innerHTML = rows.length ? rows.map(p => '<div class="admin-row"><div><strong>' + esc(p.title) + '</strong><small>' + (p.published?'Published':'Draft') + ' · ' + esc(p.category) + '</small></div><div><button class="text-button" data-edit="' + p.id + '">Edit</button> <button class="text-button danger" data-delete="' + p.id + '">Delete</button></div></div>').join('') : '<p class="muted">No saved pages yet.</p>';
  }
  async function showDashboard(current) {
    panel.hidden = !!current;
    dashboard.hidden = !current;
    if (current) { try { await loadAdminPosts(); } catch (error) { showMessage(editor,error.message); } }
  }
  login.addEventListener('submit', async event => {
    event.preventDefault();
    if (!ready) { showMessage(login,'Setup missing. Check config.js.'); return; }
    const button = login.querySelector('[type="submit"]');
    const values = new FormData(login);
    button.disabled = true;
    showMessage(login,'Signing in…');
    try {
      const data = await authCall('token?grant_type=password',{email:values.get('email'),password:values.get('password')});
      setSession(Object.assign({},data,{expires_at:Date.now()/1000+(data.expires_in||3600)}));
      await showDashboard(data);
      if (!dashboard.hidden) login.reset();
    } catch (error) { showMessage(login,error.message); }
    finally { button.disabled = false; }
  });
  if (!ready) showMessage(login,'Setup missing. Check config.js.');
  else getFreshSession().then(showDashboard).catch(error => showMessage(login,error.message));
  const signOut = document.querySelector('#sign-out');
  signOut && signOut.addEventListener('click',async()=>{try{await api('/auth/v1/logout',{method:'POST'});}catch{}clearSession();await showDashboard(null);});
  const reset = document.querySelector('#reset-form');
  reset && reset.addEventListener('click',()=>{editor.reset();editor.elements.id.value='';document.querySelector('#editor-title').textContent='New page';showMessage(editor,'');});
  list && list.addEventListener('click',async event=>{
    const edit=event.target.closest('[data-edit]'), remove=event.target.closest('[data-delete]');
    try {
      if(edit){const rows=await api('/rest/v1/posts?select=*&id=eq.'+encodeURIComponent(edit.dataset.edit));const post=rows[0];if(!post)throw Error('Page not found.');for(const field of ['id','title','excerpt','category','body','published'])editor.elements[field].type==='checkbox'?editor.elements[field].checked=post[field]:editor.elements[field].value=post[field]||'';document.querySelector('#editor-title').textContent='Edit page';}
      if(remove&&confirm('Delete this page permanently?')){await api('/rest/v1/posts?id=eq.'+encodeURIComponent(remove.dataset.delete),{method:'DELETE'});showMessage(editor,'Page deleted.');await loadAdminPosts();}
    } catch(error){showMessage(editor,error.message);}
  });
  editor && editor.addEventListener('submit',async event=>{
    event.preventDefault();const values=new FormData(editor),id=values.get('id');
    try {
      showMessage(editor,'Saving…');let photoUrl=null;
      if(id){const rows=await api('/rest/v1/posts?select=photo_url&id=eq.'+encodeURIComponent(id));photoUrl=rows[0]&&rows[0].photo_url||null;}
      const photo=values.get('photo');
      if(photo&&photo.size){const ext=photo.name.split('.').pop().replace(/[^a-z0-9]/gi,'')||'jpg',path=(crypto.randomUUID())+'.'+ext;await api('/storage/v1/object/journal-photos/'+path,{method:'POST',body:photo,headers:{'Content-Type':photo.type||'application/octet-stream'}});photoUrl=base+'/storage/v1/object/public/journal-photos/'+path;}
      const row={title:values.get('title').trim(),excerpt:values.get('excerpt').trim(),category:values.get('category'),body:values.get('body'),published:editor.elements.published.checked,photo_url:photoUrl};
      await api(id?'/rest/v1/posts?id=eq.'+encodeURIComponent(id):'/rest/v1/posts',{method:id?'PATCH':'POST',body:JSON.stringify(row),headers:{'Content-Type':'application/json','Prefer':'return=minimal'}});
      editor.reset();editor.elements.id.value='';document.querySelector('#editor-title').textContent='New page';showMessage(editor,'Saved.');await loadAdminPosts();
    } catch(error){showMessage(editor,error.message||'Could not save page.');}
  });
}
