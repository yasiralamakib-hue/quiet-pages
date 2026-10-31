# Astray — vintage newspaper journal

The website has a public journal and a private author desk. To connect its backend, follow these steps:

1. In Supabase SQL Editor, run `supabase-setup.sql`.
2. In Supabase Authentication → Users, create your own author user. In Authentication settings, turn off public sign-ups.
3. Copy your Project URL and Publishable key from Supabase Settings → API Keys. Put them into the two quoted values in `config.js`. Never use a secret/service_role key in this public file.
4. Upload all files in this folder to the root of your GitHub repository, replacing the current files. Ensure `index.html`, `admin.html`, `app.js`, `config.js`, and `styles.css` sit at the top level.
5. GitHub Pages will publish the update automatically. The public site is the repository Pages address; your author desk is the same address followed by `/admin.html`.

Only published posts are visible to visitors. Unpublished drafts are private to authenticated users. The photo bucket is public so images on published entries display correctly; upload only photos you intend to make public. The included publishable key is intended for browser use; database access is restricted by the SQL policies. Keep your password private and enable MFA if available.

## Adding photographs and writing

- The public homepage starts blank. Published entries appear together in newest-first order, with a varied layout based on the entry content.
- Add a photograph to an entry to show its image on the homepage. Text-only entries appear as editorial cards. Either kind opens in a large reading view when selected.
- Only published entries appear publicly. Use the author desk to edit or delete them later.
- The site has one public homepage and one private author desk at admin.html.
- After signing in, use LOG OUT in the author desk header on whichever device you are using.

## Changing the page

- Edit the words and page structure in index.html.
- Edit colors and page styling in styles.css. The newspaper palette uses aged sand, charcoal ink, and faded terracotta.
- Keep akib.png, hair-band.png, ear-ring-bow.png, and ear-ring.png beside index.html. Each supplied transparent image is positioned individually in the left rail on desktop and phone. The image proportions are preserved while the journal column uses the remaining screen width. Do not remove these image files.
- Keep both fancy-bangla-unicode.otf and fancy-bangla.ttf beside styles.css so Bangla text can use the supplied handwriting fonts.
- Leave config.js unchanged unless you are intentionally connecting a different Supabase project.
