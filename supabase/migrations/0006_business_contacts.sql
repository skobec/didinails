-- 0006: соцсети и пометка про телефон для страницы записи.
-- Применить: SQL Editor → вставить → Run (идемпотентно).
-- После применения: /admin/profile → вписать Instagram/Telegram/пометку → Сохранить.

alter table public.businesses
  add column if not exists instagram text not null default '',
  add column if not exists telegram text not null default '',
  add column if not exists phone_note text not null default '';
