# Ashtray — personal archive and listening room

The website has a public journal and a private author desk. To connect its backend, follow these steps:

1. In Supabase SQL Editor, replace the editor contents with the updated `supabase-setup.sql` from this download and run it once. It adds five playlists and a public music library while keeping the existing journal entries.
2. In Supabase Authentication → Users, create your own author user. In Authentication settings, turn off public sign-ups.
3. Copy your Project URL and Publishable key from Supabase Settings → API Keys. Put them into the two quoted values in `config.js`. Never use a secret/service_role key in this public file.
4. Upload all files in this folder to the root of your GitHub repository, replacing the current files. Ensure `index.html`, `admin.html`, `app.js`, `config.js`, and `styles.css` sit at the top level.
5. GitHub Pages will publish the update automatically. The public site is the repository Pages address; your author desk is the same address followed by `/admin.html`.

The public page includes a DOWNLOAD control for installing Ashtray as a browser app on supported phones and computers. Keep `manifest.webmanifest`, `service-worker.js`, `astray-icon-192.png`, and `astray-icon-512.png` beside the HTML files. The installed app needs an internet connection to load the journal, songs, and Supabase content. On iPhone/iPad, use Safari Share → Add to Home Screen if no install prompt appears.

Only published posts are visible to visitors. Unpublished drafts are private to authenticated users. The media and music buckets are public so published photographs, videos, and playlist songs can be played. Upload only media you intend to share publicly. The included publishable key is intended for browser use; database access is restricted by the SQL policies. Keep your password private and enable MFA if available.

## Adding photographs, videos, and writing

- The public homepage starts blank. Published entries appear newest first in color-tinted cards. Use ALL, MEDIA, and WRITE in the sidebar to filter them.
- Use the WRITE and MEDIA tabs in the author desk to create writing, photograph, and video entries. The MEDIA tab accepts JPG, PNG, WebP, MP4, WebM, and MOV files. MP4 has the broadest playback support. Videos use the existing media bucket; no database table changes are needed. Your Supabase storage limit applies. Selecting an entry lets you edit or delete it.
- The author desk MUSIC tab contains five playlist slots. Rename a playlist and add multiple audio files. Songs are played in order and advance automatically. Visitors choose a playlist, not individual songs.
- While a song is playing, supported browsers can show its title and Ashtray artwork on the phone lock screen and offer play, pause, previous, and next controls. Background playback depends on the phone, browser, battery settings, and network; a website cannot guarantee identical behavior to Spotify on every device. MP3 audio has the broadest compatibility.
- On the public page, use the volume slider to set listening level from 01 to 10. The author desk has its own player so you can listen while writing.
- Only published entries appear publicly. Use the author desk to edit or delete them later.
- The site has one public homepage and one private author desk at admin.html. The public page also has a DOWNLOAD / install control beside AUTHOR DESK.
- After signing in, use LOG OUT in the author desk header on whichever device you are using.

## Changing the page

- Edit the page structure in index.html and admin.html.
- Edit colors and page styling in styles.css. The palette uses aged paper, charcoal ink, terracotta, orange, and sage.
- Keep astray-logo.svg, astray-icon.svg, astray-icon-192.png, and astray-icon-512.png beside the HTML files and manifest. The SVG logo stays sharp at every size, and the PNG copies support app installation on more devices. Keep hair-band-display.png, ear-ring-bow-display.png, and ear-ring-display.png beside index.html; these keep the original decorations intact while trimming only their empty transparent margins for clearer display.
- Bangla text uses Noto Serif Bengali for a readable newspaper style when the page is online. English uses IM Fell English for the classic book-print look.
- Leave config.js unchanged unless you are intentionally connecting a different Supabase project.
