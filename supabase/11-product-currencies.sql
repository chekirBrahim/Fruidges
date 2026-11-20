-- Adds optional conversion metadata without changing the product's source currency.
begin;

alter table public.fruidges_products
  add column if not exists fx_usd numeric(18,8),
  add column if not exists fx_kwd numeric(18,8),
  add column if not exists fx_date date,
  add column if not exists fx_source text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname='fruidges_fx_metadata'
      and conrelid='public.fruidges_products'::regclass
  ) then
    alter table public.fruidges_products
      add constraint fruidges_fx_metadata check (
        (fx_usd is null and fx_kwd is null and fx_date is null and fx_source is null)
        or (
          fx_usd is not null and fx_kwd is not null
          and fx_usd>0 and fx_kwd>0
          and fx_date is not null
          and fx_source is not null
          and length(trim(fx_source)) between 1 and 200
          and (currency<>'USD' or fx_usd=1)
          and (currency<>'KWD' or fx_kwd=1)
        )
      );
  end if;
end
$$;

commit;
