-- Excel.Flo – Auswertung Stufe 1 (kostenlose Übungen) → Stufe 2 (Bonus-Übungen)
--
-- Einmalig im Supabase-Dashboard ausführen:
--   SQL Editor → New query → dieses Skript einfügen → Run
-- Danach im Table Editor unter „Auswertung Stufen Praxistest“ ansehen (oder: select * from "Auswertung Stufen Praxistest";).
-- Das Skript kann gefahrlos mehrfach ausgeführt werden; es legt nur eine Ansicht an, Daten bleiben unverändert.
--
-- Gezählt werden Sitzungen (ein Browser-Tab, solange er offen ist), keine Personen – die Seiten
-- speichern bewusst keine Nutzer-ID. Stufe 1 und Stufe 2 liegen auf verschiedenen Adressen, eine
-- Person lässt sich deshalb nicht von Stufe 1 bis Stufe 2 verfolgen; die Spalten sind Zählungen
-- je Schritt. Damit Wiederkehrer nicht doppelt als „gestartet“ zählen, gilt jeweils nur der
-- Start der ERSTEN Übung als Start der Stufe und das Lösen der LETZTEN als Abschluss.
--
--   Stufe 1 gestartet   erste Aufgabe (summe-umsatz) angefangen                      portal kostenlos
--   Anmeldung Stufe 2   Formular für die Bonus-Übungen abgeschickt (Liste oder Popup)  portal kostenlos
--   Stufe 1 beendet     letzte Aufgabe (Pivot umsatz-je-region) gelöst oder Lösung angesehen
--   Stufe 2 gestartet   erste Bonus-Übung (bonus-max-einzelumsatz) angefangen         portal light
--   Stufe 2 beendet     letzte Bonus-Übung (Pivot) zum ersten Mal richtig gelöst      portal light
--
-- Seit 2026-10-27 zusätzlich je Aufgabe „erledigt“ (hinten angehängt):
--   Stufe 1: gelöst oder Lösung angesehen (wie auf der Seite: danach geht die nächste auf)
--   Stufe 2: zum ersten Mal richtig gelöst
-- „Woche ab“ steht als JJJJ-MM-TT da, damit die Wochen beim Sortieren richtig stehen.

create or replace view public."Auswertung Stufen Praxistest"
with (security_invoker = true) as
with e as (
  select
    date_trunc('week', created_at at time zone 'Europe/Berlin')::date as woche,
    session_id, portal, event, exercise_id,
    (portal = 'kostenlos' and event in ('exercise_solved', 'solution_show'))  as s1_erledigt,
    (portal = 'light' and event = 'exercise_solved')                        as s2_erledigt
  from public.events
  where portal in ('kostenlos', 'light')
),
zahlen as (
  select
    woche,
    count(distinct session_id) filter (where portal = 'kostenlos' and event = 'exercise_start' and exercise_id = 'summe-umsatz') as s1_start,
    count(distinct session_id) filter (where portal = 'kostenlos' and event = 'form_submit')                                   as anmeldung,
    count(distinct session_id) filter (where s1_erledigt and exercise_id = 'umsatz-je-region')                                  as s1_ende,
    count(distinct session_id) filter (where portal = 'light' and event = 'exercise_start' and exercise_id = 'bonus-max-einzelumsatz') as s2_start,
    count(distinct session_id) filter (where s2_erledigt and exercise_id = 'pivot-umsatz-je-region-und-monat')                  as s2_ende,
    count(distinct session_id) filter (where s1_erledigt and exercise_id = 'summe-umsatz')                                      as s1_a1,
    count(distinct session_id) filter (where s1_erledigt and exercise_id = 'mittelwert-noten')                                  as s1_a2,
    count(distinct session_id) filter (where s1_erledigt and exercise_id = 'anzahl-teilnehmer')                                 as s1_a3,
    count(distinct session_id) filter (where s1_erledigt and exercise_id = 'umsatz-je-region')                                  as s1_a4,
    count(distinct session_id) filter (where s2_erledigt and exercise_id = 'bonus-max-einzelumsatz')                            as s2_a1,
    count(distinct session_id) filter (where s2_erledigt and exercise_id = 'bonus-zaehlenwenn-region-nord')                     as s2_a2,
    count(distinct session_id) filter (where s2_erledigt and exercise_id = 'bonus-wenn-ziel-erreicht')                          as s2_a3,
    count(distinct session_id) filter (where s2_erledigt and exercise_id = 'bonus-sverweis-produktnummer')                      as s2_a4,
    count(distinct session_id) filter (where s2_erledigt and exercise_id = 'pivot-umsatz-je-region-und-monat')                  as s2_a5
  from e
  group by rollup (woche)
)
select
  coalesce(to_char(woche, 'YYYY-MM-DD'), 'Gesamt')         as "Woche ab",
  s1_start                                                 as "Stufe 1 gestartet",
  anmeldung                                                as "Anmeldung Stufe 2",
  s1_ende                                                  as "Stufe 1 beendet",
  s2_start                                                 as "Stufe 2 gestartet",
  s2_ende                                                  as "Stufe 2 beendet",
  round(100.0 * s1_ende / nullif(s1_start, 0), 1)          as "Stufe 1 beendet in %",
  round(100.0 * s2_start / nullif(anmeldung, 0), 1)        as "Stufe 2 gestartet in % der Anmeldungen",
  round(100.0 * s2_ende / nullif(s2_start, 0), 1)          as "Stufe 2 beendet in %",
  s1_a1                                                    as "Stufe 1 - Aufgabe 1 erledigt",
  s1_a2                                                    as "Stufe 1 - Aufgabe 2 erledigt",
  s1_a3                                                    as "Stufe 1 - Aufgabe 3 erledigt",
  s1_a4                                                    as "Stufe 1 - Aufgabe 4 erledigt",
  s2_a1                                                    as "Stufe 2 - Aufgabe 1 erledigt",
  s2_a2                                                    as "Stufe 2 - Aufgabe 2 erledigt",
  s2_a3                                                    as "Stufe 2 - Aufgabe 3 erledigt",
  s2_a4                                                    as "Stufe 2 - Aufgabe 4 erledigt",
  s2_a5                                                    as "Stufe 2 - Aufgabe 5 erledigt"
from zahlen
order by woche is not null, woche desc;

revoke all on public."Auswertung Stufen Praxistest" from anon, authenticated;
