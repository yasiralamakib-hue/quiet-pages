# The Quiet Pages

A portable, responsive journal website. Visitors can read published pages; only the Supabase account you authorize can sign in to write, edit, upload photos, and publish. The homepage includes sample entries until Supabase is configured.

## 1. Create the private writing backend

1. Create a project at [supabase.com](https://supabase.com/).
2. In **SQL Editor**, run all of `supabase-setup.sql`.
3. In **Authentication → Users**, add your own email as a user and set a strong password. In **Authentication → Settings**, disable public sign-ups so only the account you create can access the author tools.
4. In **Project Settings → API**, copy the Project URL and the anon/publishable key. Put them in `config.js`. The anon key is meant to be used by the website; never expose a `service_role` key.
5. Serve the folder from a static web host that supports HTTPS (for example, Netlify, Cloudflare Pages, or GitHub Pages). Because the site uses JavaScript modules, opening `index.html` directly from your file manager may not work. Upload the folder contents, not the ZIP itself.
6. Open the deployed `/admin.html`, sign in, and create a page. Keep drafts unpublished; tick **Publish this page** when ready for everyone to read.

## 2. Google Sites

Google Sites cannot host this site's backend or author dashboard itself. Host the complete folder on a static host first. In Google Sites, choose **Insert → Embed → By URL**, enter the public website URL, resize the embed, and publish the Google Site. You can also add a normal link to the journal; linking often reads better on phones. Do not embed or link the private `/admin.html` page for visitors.

## Files

- `index.html`, `styles.css`, `app.js`: public journal and article reader
- `admin.html`: sign-in and author dashboard
- `config.js`: your Supabase project URL and public anon key
- `supabase-setup.sql`: database, access policies, and photo storage setup

## Privacy and maintenance

Supabase Row Level Security makes posts readable to visitors only after publication; inserts, edits, and deletes require the signed-in author. The photo bucket is public so published images can display on the public site; use only images you intend to publish. Protect the author email and password, enable MFA in Supabase if available, and never share the `service_role` key. This package is source code: it does not create your Supabase project or deploy itself.
