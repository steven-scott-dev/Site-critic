create extension if not exists pgcrypto;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text,
  email text,
  phone text,
  website text not null,
  business_type text,
  goal text,
  extra_context text,
  status text not null default 'new',
  critique_score numeric,
  follow_up_message text
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_status_idx on public.leads (status);
create index if not exists leads_website_idx on public.leads (website);

alter table public.leads enable row level security;

create policy "service role can manage leads"
on public.leads
as permissive
for all
to service_role
using (true)
with check (true);
