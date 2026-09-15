-- 0007: серверная проверка капчи (Cloudflare Turnstile) в create_booking.
--
-- Зачем: виджет на форме останавливает простых ботов, а проверка токена
-- ВНУТРИ транзакции не даёт обойти капчу прямым вызовом RPC.
--
-- Настройка (один раз):
--  1) https://dash.cloudflare.com → Turnstile → Add site → hostname сайта
--     (и localhost для локальной разработки) → получить SITE KEY + SECRET KEY.
--  2) SECRET KEY положить в Vault (токен бота там же не мешает):
--       select vault.create_secret('<TURNSTILE_SECRET>', 'turnstile_secret');
--  3) SITE KEY → VITE_TURNSTILE_SITE_KEY (локально .env.local, в проде Variables).
--
-- Поведение:
--  - секрета нет в Vault → проверка пропущена (dev-режим, удобно тестировать);
--  - секрет есть, токена нет → отказ NO_CAPTCHA (обход виджета);
--  - токен не прошёл siteverify → отказ BAD_CAPTCHA.
-- Проверка синхронная через pg_net (ответ Cloudflare ~0.3–1 сек).
-- Подробнее: docs/captcha.md

drop function if exists public.create_booking(uuid, uuid, date, text, integer, text, text, text, text);

create or replace function public.create_booking(
  p_business_id uuid,
  p_service_id uuid,
  p_date date,
  p_time text,
  p_duration_minutes integer,
  p_timezone text,
  p_name text,
  p_phone text,
  p_comment text,
  p_captcha_token text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  sid uuid;
  sname text;
  cid uuid;
  start_at timestamptz;
  end_at timestamptz;
  aid uuid;
  csecret text;
  req_id bigint;
  resp record;
  ok boolean;
begin
  if p_name = '' or p_phone = '' then
    raise exception 'NO_CLIENT_DATA';
  end if;
  if p_time !~ '^[0-2][0-9]:[0-5][0-9]$' then
    raise exception 'BAD_TIME';
  end if;
  if p_duration_minutes < 1 or p_duration_minutes > 600 then
    raise exception 'BAD_DURATION';
  end if;

  -- Капча: проверяем, только если секрет заведён (иначе dev-режим).
  select decrypted_secret into csecret
  from vault.decrypted_secrets
  where name = 'turnstile_secret'
  limit 1;
  if csecret is not null then
    if p_captcha_token is null or p_captcha_token = '' then
      raise exception 'NO_CAPTCHA';
    end if;
    req_id := net.http_post(
      url := 'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      body := jsonb_build_object('secret', csecret, 'response', p_captcha_token),
      headers := jsonb_build_object('Content-Type', 'application/json')
    );
    select * into resp from net.http_collect_response(req_id, false);
    begin
      ok := coalesce((((resp).body)::text)::jsonb ->> 'success', 'false') = 'true';
    exception when others then
      ok := false;
    end;
    if not ok then
      raise exception 'BAD_CAPTCHA';
    end if;
  end if;

  select id, name into sid, sname
  from services
  where id = p_service_id and business_id = p_business_id and is_active = true;
  if sid is null then
    raise exception 'NO_SERVICE';
  end if;

  select id into cid from clients
  where business_id = p_business_id and phone = p_phone and p_phone <> '';
  if cid is null then
    insert into clients (business_id, name, phone)
    values (p_business_id, p_name, p_phone)
    returning id into cid;
  end if;

  start_at := ((p_date::text || ' ' || p_time)::timestamp AT TIME ZONE p_timezone);
  end_at := start_at + (p_duration_minutes || ' minutes')::interval;

  insert into appointments (business_id, service_id, client_id, start_at, end_at, status, notes)
  values (p_business_id, sid, cid, start_at, end_at, 'pending', p_comment)
  returning id into aid;
  -- Пересечение ловит триггер appointments_no_overlap (SLOT_TAKEN).

  return jsonb_build_object(
    'id', aid,
    'service_name', sname,
    'date', to_char(start_at AT TIME ZONE p_timezone, 'YYYY-MM-DD'),
    'time', to_char(start_at AT TIME ZONE p_timezone, 'HH24:MI'),
    'name', p_name,
    'phone', p_phone
  );
end;
$$;

grant execute on function public.create_booking(uuid, uuid, date, text, integer, text, text, text, text, text)
  to anon, authenticated;
