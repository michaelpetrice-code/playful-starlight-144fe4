-- Optional: run in the SAME Supabase project as The Local after VENUE-PLATFORM-SETUP.sql.
-- The Local v99 already displays Coombe Social Club locally, so this is only
-- needed to persist the venue in the shared directory table.
-- This is not a claim that venue ownership has been externally verified.
insert into public.local_venue_directory
(name,type,town,description,website,status,verified)
select 'Coombe Social Club','Social club','Coventry',
'A Coventry social club with a concert room, lounge, events, games and room hire.',
'https://www.coombesocialclub.co.uk/','featured',false
where not exists (
 select 1 from public.local_venue_directory
 where lower(trim(name)) in ('coombe social club','the coombe social club')
);
