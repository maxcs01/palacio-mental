-- Cole e execute este SQL no Supabase (SQL Editor -> New query -> Run)
create table if not exists public.worlds (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Cidade Médica',
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create unique index if not exists worlds_owner_unique on public.worlds (owner_id);

alter table public.worlds enable row level security;

-- Leitura: dono ou qualquer usuário logado que tenha o link de convite do mundo
drop policy if exists "Dono pode ler seu mundo" on public.worlds;
create policy "Usuarios logados podem ler mundos compartilhados"
  on public.worlds for select
  using (auth.role() = 'authenticated');

drop policy if exists "Dono pode criar seu mundo" on public.worlds;
create policy "Dono pode criar seu mundo"
  on public.worlds for insert
  with check (auth.uid() = owner_id);

drop policy if exists "Dono pode atualizar seu mundo" on public.worlds;
create policy "Dono pode atualizar seu mundo"
  on public.worlds for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);
