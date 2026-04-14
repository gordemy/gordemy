-- Clan chat messages
create table if not exists public.clan_messages (
  id          uuid primary key default gen_random_uuid(),
  clan_id     uuid not null references public.clans(id) on delete cascade,
  student_id  uuid not null references public.students(id) on delete cascade,
  student_name text not null default 'Учень',
  text        text not null check (char_length(text) <= 200),
  created_at  timestamptz not null default now()
);

create index if not exists clan_messages_clan_id_idx on public.clan_messages(clan_id, created_at);

-- RLS
alter table public.clan_messages enable row level security;

-- Members of the same clan can read
create policy "clan members can read messages"
  on public.clan_messages for select
  using (
    exists (
      select 1 from public.clan_members cm
      where cm.clan_id = clan_messages.clan_id
        and cm.student_id = auth.uid()
    )
  );

-- Members can insert their own messages
create policy "clan members can send messages"
  on public.clan_messages for insert
  with check (
    student_id = auth.uid()
    and exists (
      select 1 from public.clan_members cm
      where cm.clan_id = clan_messages.clan_id
        and cm.student_id = auth.uid()
    )
  );

-- Enable realtime
alter publication supabase_realtime add table public.clan_messages;
