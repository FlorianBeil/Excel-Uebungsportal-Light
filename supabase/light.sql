-- Excel.Flo – Übungsportal Light: Tracking freischalten
--
-- Voraussetzung: Die Tabelle public.events existiert bereits (Übungsportal, supabase/events.sql).
-- Einmalig im Supabase-Dashboard ausführen:
--   SQL Editor → New query → dieses Skript einfügen → Run
--
-- Was passiert: Nur die erlaubten Werte der Spalte „portal“ werden um 'light' erweitert.
-- Bestehende Ereignisse, Fortschritte und Auswertungen bleiben unverändert.
-- Das Skript kann gefahrlos mehrfach ausgeführt werden.
--
-- Ereignisse der Light-Version (portal = 'light'):
--   overview_view    Übersicht aufgerufen
--   upgrade_click    Klick auf einen Vollversions-Link    exercise_id = gesperrte Übung (bei Karten), detail.ort = karte | banner
--   exercise_open, check, hints_open, solution_show, reset – wie im Kaufportal (kommen aus engine.js)
--
-- Auswertung: in den bestehenden Views „Auswertung Übungsportal“ und „Auswertung Einzelklicks“,
-- Zeilen dieser Seite erkennst du an Portal = light.

alter table public.events drop constraint if exists events_portal_check;
alter table public.events add constraint events_portal_check
  check (portal in ('funktionen', 'pivot', 'powerquery', 'einstufungstest', 'kostenlos', 'light'));
