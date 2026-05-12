-- Habilita a extensão para gerar UUIDs (caso ainda não esteja habilitada)
create extension if not exists "uuid-ossp";

-- =============================================
-- TABELA: expenses
-- =============================================
create table if not exists expenses (
  id              uuid                     default uuid_generate_v4() primary key,
  user_id         uuid                     references auth.users(id) not null,
  description     text                     not null,
  amount          numeric(10, 2)           not null,
  category        text                     not null default 'Outros',
  payment_method  text                     not null default 'credit',
  date            date                     not null,
  month           integer                  not null,
  year            integer                  not null,
  installment_id  uuid,                    -- agrupa parcelas de uma mesma despesa
  created_at      timestamp with time zone default now() not null,
  updated_at      timestamp with time zone default now() not null
);

-- Índices para performance
create index if not exists idx_expenses_user_id        on expenses(user_id);
create index if not exists idx_expenses_user_year_month on expenses(user_id, year, month);
create index if not exists idx_expenses_installment_id  on expenses(installment_id);

-- Trigger para atualizar updated_at automaticamente
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger expenses_set_updated_at
  before update on expenses
  for each row execute function set_updated_at();

-- Habilitar RLS (Row Level Security)
alter table expenses enable row level security;

-- Políticas de segurança
create policy "Usuários podem ver apenas suas próprias despesas"
  on expenses for select
  using (auth.uid() = user_id);

create policy "Usuários podem criar despesas para si mesmos"
  on expenses for insert
  with check (auth.uid() = user_id);

create policy "Usuários podem atualizar suas próprias despesas"
  on expenses for update
  using (auth.uid() = user_id);

create policy "Usuários podem excluir suas próprias despesas"
  on expenses for delete
  using (auth.uid() = user_id);


-- =============================================
-- TABELA: user_settings
-- =============================================
create table if not exists user_settings (
  id          uuid                     default uuid_generate_v4() primary key,
  user_id     uuid                     references auth.users(id) not null unique,
  salary      numeric(10, 2)           not null default 0,
  created_at  timestamp with time zone default now() not null,
  updated_at  timestamp with time zone default now() not null
);

-- Índice para performance
create index if not exists idx_user_settings_user_id on user_settings(user_id);

-- Trigger para atualizar updated_at automaticamente
create trigger user_settings_set_updated_at
  before update on user_settings
  for each row execute function set_updated_at();

-- Habilitar RLS (Row Level Security)
alter table user_settings enable row level security;

-- Políticas de segurança
create policy "Usuários podem ver apenas suas próprias configurações"
  on user_settings for select
  using (auth.uid() = user_id);

create policy "Usuários podem criar suas próprias configurações"
  on user_settings for insert
  with check (auth.uid() = user_id);

create policy "Usuários podem atualizar suas próprias configurações"
  on user_settings for update
  using (auth.uid() = user_id);

create policy "Usuários podem excluir suas próprias configurações"
  on user_settings for delete
  using (auth.uid() = user_id);


-- =============================================
-- TABELA: fixed_expenses (Gastos Fixos Mensais)
-- =============================================
create table if not exists fixed_expenses (
  id             uuid                     default uuid_generate_v4() primary key,
  user_id        uuid                     references auth.users(id) not null,
  description    text                     not null,
  amount         numeric(10, 2)           not null,
  category       text                     not null default 'Outros',
  payment_method text                     not null default 'credit',
  card_id        uuid                     references cards(id),
  day_of_month   integer                  not null check (day_of_month >= 1 and day_of_month <= 31),
  active         boolean                  not null default true,
  created_at     timestamp with time zone default now() not null,
  updated_at     timestamp with time zone default now() not null
);

create index if not exists idx_fixed_expenses_user_id on fixed_expenses(user_id);

create trigger fixed_expenses_set_updated_at
  before update on fixed_expenses
  for each row execute function set_updated_at();

alter table fixed_expenses enable row level security;

create policy "Usuários podem ver seus próprios gastos fixos"
  on fixed_expenses for select using (auth.uid() = user_id);

create policy "Usuários podem criar seus próprios gastos fixos"
  on fixed_expenses for insert with check (auth.uid() = user_id);

create policy "Usuários podem atualizar seus próprios gastos fixos"
  on fixed_expenses for update using (auth.uid() = user_id);

create policy "Usuários podem excluir seus próprios gastos fixos"
  on fixed_expenses for delete using (auth.uid() = user_id);


-- =============================================
-- MIGRAÇÃO: Feature de Cartões
-- Execute estes comandos no Supabase SQL Editor
-- Seguro: apenas adiciona nova tabela e coluna nullable
-- =============================================

-- Tabela de cartões do usuário
create table if not exists cards (
  id           uuid                     default uuid_generate_v4() primary key,
  user_id      uuid                     references auth.users(id) not null,
  name         text                     not null,
  last_four    text,
  color        text                     not null default '#6366f1',
  closing_day  integer                  check (closing_day >= 1 and closing_day <= 31),
  due_day      integer                  check (due_day >= 1 and due_day <= 31),
  created_at   timestamp with time zone default now() not null,
  updated_at   timestamp with time zone default now() not null
);

create index if not exists idx_cards_user_id on cards(user_id);

create trigger cards_set_updated_at
  before update on cards
  for each row execute function set_updated_at();

alter table cards enable row level security;

create policy "Usuários podem ver seus próprios cartões"
  on cards for select using (auth.uid() = user_id);

create policy "Usuários podem criar seus próprios cartões"
  on cards for insert with check (auth.uid() = user_id);

create policy "Usuários podem atualizar seus próprios cartões"
  on cards for update using (auth.uid() = user_id);

create policy "Usuários podem excluir seus próprios cartões"
  on cards for delete using (auth.uid() = user_id);

-- Vincula gastos a cartões (nullable — não quebra dados existentes)
alter table expenses
  add column if not exists card_id uuid references cards(id);

create index if not exists idx_expenses_card_id on expenses(card_id);

-- Dia de fechamento e vencimento do cartão (nullable — não quebra dados existentes)
alter table cards
  add column if not exists closing_day integer check (closing_day >= 1 and closing_day <= 31);

alter table cards
  add column if not exists due_day integer check (due_day >= 1 and due_day <= 31);
