import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const configured = SUPABASE_URL.startsWith('https://') && !SUPABASE_URL.includes('YOUR_') && !SUPABASE_ANON_KEY.includes('YOUR_');
const db = configured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const readableDate = value => new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {year:'numeric',month:'short',day:'numeric'});

// Public journal
const postsNode = document.querySelector('#posts');
if (postsNode) {
  try {
    let posts;
    if (db) {
      const result = await db.from('posts').select('*').eq('published', true).order('created_at', {ascending:false});
      if (result.error) throw result.error;
      posts = result.data || [];
    } else {
      posts = [
        {id:'sample1',title:'The light at the end of the day',excerpt:'Some evenings ask nothing of us but that we notice them.',category:'Journal',body:'The day softened around the edges.\n\nI watched the last light find its way across the room and thought how often the smallest things are the ones that stay.',created_at:'2026-10-21'},
        {id:'sample2',title:'A small archive of ordinary things',excerpt:'A list of things I hope I remember.',category:'Writing',body:'The sound of rain arriving before the rain.\nA cup left warm between both hands.\nSomeone saving you the window seat.',created_at:'2026-10-13'},
        {id:'sample3',title:'For the days that pass quietly',excerpt:'',category:'Poetry',body:'Let the day be small.\nLet the kettle sing.\nLet one good thing\nbe enough to bring.',created_at:'2026-10-02'}
      ];
    }
    document.querySelector('#post-count').textContent = `${posts.length} ${posts.length === 1 ? 'ENTRY' : 'ENTRIES'}`;
    postsNode.innerHTML = posts.length ? posts.map((post,index) => `<button class="post-card" data-post-id="${escapeHtml(post.id)}"><span class="post-image" ${post.photo_url ? `style="background-image:url('${escapeHtml(post.photo_url)}')"` : ''}><span>${String(index+1).padStart(2,'0')}</span></span><span class="post-meta">${escapeHtml(post.category)} · ${readableDate(post.created_at)}</span><span class="post-title">${escapeHtml(post.title)}</span><span class="post-excerpt">${escapeHtml(post.excerpt || 'Open entry →')}</span></button>`).join('') : '<p class="muted">No pages published yet.</p>';
    postsNode.addEventListener('click', event => {
      const button = event.target.closest('[data-post-id]');
      if (!button) return;
      const post = posts.find(item => String(item.id) === button.dataset.postId);
      document.querySelector('#post-detail').innerHTML = `${post.photo_url ? `<img class="detail-photo" src="${escapeHtml(post.photo_url)}" alt="">` : ''}<p class="eyebrow">${escapeHtml(post.category)} · ${readableDate(post.created_at)}</p><h1>${escapeHtml(post.title)}</h1><p class="detail-excerpt">${escapeHtml(post.excerpt || '')}</p><div class="prose">${escapeHtml(post.body)}</div>`;
      document.querySelector('#post-dialog').showModal();
    });
  } catch (error) {
    postsNode.textContent = 'Could not load journal entries. Check the Supabase setup.';
  }
}
const dialog = document.querySelector('#post-dialog');
dialog?.querySelector('.close')?.addEventListener('click', () => dialog.close());
dialog?.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });

// Author dashboard. Attach the submit handler before making any network request,
// and admin.html also cancels native form submission as a safety net.
const loginForm = document.querySelector('#login-form');
if (loginForm) {
  const signInPanel = document.querySelector('#sign-in');
  const dashboard = document.querySelector('#dashboard');
  const editor = document.querySelector('#post-form');
  const postList = document.querySelector('#admin-posts');
  const message = (form, text) => { const node = form?.querySelector('.form-message'); if (node) node.textContent = text; };

  loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!db) { message(loginForm, 'Setup is incomplete. Check config.js and SETUP.md.'); return; }
    const values = new FormData(loginForm);
    const submit = loginForm.querySelector('[type="submit"]');
    submit.disabled = true;
    message(loginForm, 'Signing in…');
    try {
      const {error} = await db.auth.signInWithPassword({email:values.get('email'),password:values.get('password')});
      message(loginForm, error?.message || '');
    } catch (error) {
      message(loginForm, error?.message || 'Could not connect. Check your internet and try again.');
    } finally {
      submit.disabled = false;
    }
  });

  if (!db) {
    message(loginForm, 'Setup is incomplete. Check config.js and SETUP.md.');
  } else {
    const loadPosts = async () => {
      const {data,error} = await db.from('posts').select('*').order('created_at',{ascending:false});
      if (error) { postList.textContent = error.message; return; }
      postList.innerHTML = data.length ? data.map(post => `<div class="admin-row"><div><strong>${escapeHtml(post.title)}</strong><small>${post.published?'Published':'Draft'} · ${escapeHtml(post.category)}</small></div><div><button class="text-button" data-edit="${post.id}">Edit</button><button class="text-button danger" data-delete="${post.id}">Delete</button></div></div>`).join('') : '<p class="muted">No saved pages yet.</p>';
    };
    const showDashboard = async session => {
      signInPanel.hidden = Boolean(session);
      dashboard.hidden = !session;
      if (session) await loadPosts();
    };
    db.auth.onAuthStateChange((_event,session) => { void showDashboard(session); });
    db.auth.getSession().then(({data,error}) => {
      if (error) message(loginForm, error.message);
      else void showDashboard(data.session);
    }).catch(error => message(loginForm, error.message || 'Could not connect to Supabase.'));

    document.querySelector('#sign-out')?.addEventListener('click', () => { void db.auth.signOut(); });
    document.querySelector('#reset-form')?.addEventListener('click', () => {
      editor.reset(); editor.elements.id.value = ''; document.querySelector('#editor-title').textContent = 'New page'; message(editor,'');
    });
    postList.addEventListener('click', async event => {
      const edit = event.target.closest('[data-edit]');
      const remove = event.target.closest('[data-delete]');
      if (edit) {
        const {data,error} = await db.from('posts').select('*').eq('id',edit.dataset.edit).single();
        if (error) { message(editor,error.message); return; }
        for (const field of ['id','title','excerpt','category','body','published']) {
          if (editor.elements[field].type === 'checkbox') editor.elements[field].checked = data[field];
          else editor.elements[field].value = data[field] ?? '';
        }
        document.querySelector('#editor-title').textContent = 'Edit page';
        scrollTo({top:0,behavior:'smooth'});
      }
      if (remove && confirm('Delete this page permanently?')) {
        const {error} = await db.from('posts').delete().eq('id',remove.dataset.delete);
        message(editor,error?.message || 'Page deleted.');
        await loadPosts();
      }
    });
    editor.addEventListener('submit', async event => {
      event.preventDefault();
      const values = new FormData(editor), id = values.get('id');
      try {
        message(editor,'Saving…');
        let photoUrl = null;
        if (id) { const {data} = await db.from('posts').select('photo_url').eq('id',id).single(); photoUrl = data?.photo_url || null; }
        const photo = values.get('photo');
        if (photo?.size) {
          const ext = photo.name.split('.').pop().replace(/[^a-z0-9]/gi,'') || 'jpg';
          const path = `${crypto.randomUUID()}.${ext}`;
          const {error} = await db.storage.from('journal-photos').upload(path,photo);
          if (error) throw error;
          photoUrl = db.storage.from('journal-photos').getPublicUrl(path).data.publicUrl;
        }
        const record = {title:values.get('title').trim(),excerpt:values.get('excerpt').trim(),category:values.get('category'),body:values.get('body'),published:editor.elements.published.checked,photo_url:photoUrl};
        const result = id ? await db.from('posts').update(record).eq('id',id) : await db.from('posts').insert(record);
        if (result.error) throw result.error;
        editor.reset(); editor.elements.id.value = ''; document.querySelector('#editor-title').textContent = 'New page';
        message(editor,'Saved.'); await loadPosts();
      } catch (error) {
        message(editor,error?.message || 'Could not save this page.');
      }
    });
  }
}
