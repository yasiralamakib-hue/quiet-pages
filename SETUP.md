# The Quiet Pages — vintage newspaper journal

The website has a public journal and a private author desk. To connect its backend, follow these steps:

1. In Supabase SQL Editor, run `supabase-setup.sql`.
2. In Supabase Authentication → Users, create your own author user. In Authentication settings, turn off public sign-ups.
3. Copy your Project URL and Publishable key from Supabase Settings → API Keys. Put them into the two quoted values in `config.js`. Never use a secret/service_role key in this public file.
4. Upload all files in this folder to the root of your GitHub repository, replacing the current files. Ensure `index.html`, `admin.html`, `app.js`, `config.js`, and `styles.css` sit at the top level.
5. GitHub Pages will publish the update automatically. The public site is the repository Pages address; your author desk is the same address followed by `/admin.html`.

Only published posts are visible to visitors. Unpublished drafts are private to authenticated users. The photo bucket is public so images on published entries display correctly; upload only photos you intend to make public. The included publishable key is intended for browser use; database access is restricted by the SQL policies. Keep your password private and enable MFA if available.

## Adding photographs and writing

- To place an entry in the left photograph column, choose Photography or upload a photograph with the entry.
- To place an entry in the right writing column, choose Journal, Writing, or Poetry and leave the photograph field empty.
- Only published entries appear on the public page. Use the edit and delete controls on the author desk to manage entries later.
- The center illustration stays in place. The public journal is one page; admin.html remains the separate private author desk.

## Changing the page

- Edit the words and page structure in index.html.
- Edit colors and page styling in styles.css. The newspaper palette uses cream #f5f5dc and maroon #800000.
- Keep both fancy-bangla-unicode.otf and fancy-bangla.ttf beside styles.css so Bangla text can use the supplied handwriting fonts.
- Leave config.js unchanged unless you are intentionally connecting a different Supabase project.
