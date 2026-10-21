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

create or replace view public."Auswertung Stufen Praxistest"
with (security_invoker = true) as
with schritte as (
  select
    date_trunc('week', created_at at time zone 'Europe/Berlin')::date                     as woche,
    session_id,
    case
      when portal = 'kostenlos' and event = 'exercise_start' and exercise_id = 'summe-umsatz' then 1
      when portal = 'kostenlos' and event = 'form_submit' then 2
      when portal = 'kostenlos' and event in ('exercise_solved', 'solution_show')
           and exercise_id = 'umsatz-je-region' then 3
      when portal = 'light' and event = 'exercise_start' and exercise_id = 'bonus-max-einzelumsatz' then 4
      when portal = 'light' and event = 'exercise_solved'
           and exercise_id = 'pivot-umsatz-je-region-und-monat' then 5
    end                                                                                    as schritt
  from public.events
  where portal in ('kostenlos', 'light')
),
zahlen as (
  select
    woche,
    count(distinct session_id) filter (where schritt = 1)                                  as s1_start,
    count(distinct session_id) filter (where schritt = 2)                                  as anmeldung,
    count(distinct session_id) filter (where schritt = 3)                                  as s1_ende,
    count(distinct session_id) filter (where schritt = 4)                                  as s2_start,
    count(distinct session_id) filter (where schritt = 5)                                  as s2_ende
  from schritte
  where schritt is not null
  group by rollup (woche)
)
select
  coalesce(to_char(woche, 'DD.MM.YYYY'), 'Gesamt')                                         as "Woche ab",
  s1_start                                                                                 as "Stufe 1 gestartet",
  anmeldung                                                                                as "Anmeldung Stufe 2",
  s1_ende                                                                                  as "Stufe 1 beendet",
  s2_start                                                                                 as "Stufe 2 gestartet",
  s2_ende                                                                                  as "Stufe 2 beendet",
  round(100.0 * s1_ende / nullif(s1_start, 0), 1)                                          as "Stufe 1 beendet in %",
  round(100.0 * s2_start / nullif(anmeldung, 0), 1)                                        as "Stufe 2 gestartet in % der Anmeldungen",
  round(100.0 * s2_ende / nullif(s2_start, 0), 1)                                          as "Stufe 2 beendet in %"
from zahlen
order by woche is not null, woche desc;

revoke all on public."Auswertung Stufen Praxistest" from anon, authenticated;
