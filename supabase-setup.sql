create extension if not exists pgcrypto;
create table if not exists public.posts (id uuid primary key default gen_random_uuid(),title text not null,excerpt text not null default '',category text not null default 'Journal',body text not null,photo_url text,published boolean not null default false,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
alter table public.posts enable row level security;
drop policy if exists "Anyone can read published posts" on public.posts;
create policy "Anyone can read published posts" on public.posts for select using (published=true or auth.uid() is not null);
drop policy if exists "Authors can add posts" on public.posts;
create policy "Authors can add posts" on public.posts for insert to authenticated with check (auth.uid() is not null);
drop policy if exists "Authors can update posts" on public.posts;
create policy "Authors can update posts" on public.posts for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);
drop policy if exists "Authors can delete posts" on public.posts;
create policy "Authors can delete posts" on public.posts for delete to authenticated using (auth.uid() is not null);
insert into storage.buckets(id,name,public) values('journal-photos','journal-photos',true) on conflict(id) do update set public=true;
drop policy if exists "Anyone can view journal photos" on storage.objects;
create policy "Anyone can view journal photos" on storage.objects for select using(bucket_id='journal-photos');
drop policy if exists "Authors can upload journal photos" on storage.objects;
create policy "Authors can upload journal photos" on storage.objects for insert to authenticated with check(bucket_id='journal-photos' and auth.uid() is not null);
drop policy if exists "Authors can delete journal photos" on storage.objects;
create policy "Authors can delete journal photos" on storage.objects for delete to authenticated using(bucket_id='journal-photos' and auth.uid() is not null);

-- Five public listening playlists, managed only from the signed-in author desk.
create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  slot smallint not null unique check (slot between 1 and 5),
  name text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.playlist_tracks (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  title text not null,
  storage_path text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
insert into public.playlists(slot,name)
select n, 'Playlist ' || lpad(n::text,2,'0') from generate_series(1,5) as s(n)
on conflict (slot) do nothing;

alter table public.playlists enable row level security;
alter table public.playlist_tracks enable row level security;
drop policy if exists "Anyone can read playlists" on public.playlists;
create policy "Anyone can read playlists" on public.playlists for select using (true);
drop policy if exists "Authors can manage playlists" on public.playlists;
create policy "Authors can manage playlists" on public.playlists for all to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);
drop policy if exists "Anyone can read playlist tracks" on public.playlist_tracks;
create policy "Anyone can read playlist tracks" on public.playlist_tracks for select using (true);
drop policy if exists "Authors can manage playlist tracks" on public.playlist_tracks;
create policy "Authors can manage playlist tracks" on public.playlist_tracks for all to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);

insert into storage.buckets(id,name,public) values('astray-music','astray-music',true) on conflict(id) do update set public=true;
drop policy if exists "Anyone can listen to Astray music" on storage.objects;
create policy "Anyone can listen to Astray music" on storage.objects for select using(bucket_id='astray-music');
drop policy if exists "Authors can upload Astray music" on storage.objects;
create policy "Authors can upload Astray music" on storage.objects for insert to authenticated with check(bucket_id='astray-music' and auth.uid() is not null);
drop policy if exists "Authors can remove Astray music" on storage.objects;
create policy "Authors can remove Astray music" on storage.objects for delete to authenticated using(bucket_id='astray-music' and auth.uid() is not null);
