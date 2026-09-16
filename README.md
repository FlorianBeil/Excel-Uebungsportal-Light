# Excel.Flo – Übungsportal Light

Kostenlose Light-Version des Übungsportals zu Excel-Funktionen. Gedacht als nächster Schritt
nach der [kostenlosen Übungsseite](https://github.com/FlorianBeil/Excel-Uebungen-kostenlos):
je Stufe (Anfänger, Fortgeschritten, Profi) sind **zwei** Funktionen-Übungen frei – bewusst keine, die
schon auf der kostenlosen Seite vorkommt –, dazu unter Fortgeschritten eine Pivot-Aufgabe.
Die Übungen des Pivot-Kurses erscheinen als gesperrte Karten in ihrer jeweiligen Stufe.
Alle weiteren Übungen sind ausgegraut und verlinken auf die Vollversion.

**Strikt getrennt vom Käufer-Portal** ([Excel-Aufgaben](https://github.com/FlorianBeil/Excel-Aufgaben)):
eigenes Repo, eigenes Deployment, das Portal verlinkt nie hierher. Gesperrte Übungen liegen
hier gar nicht als Datei vor – nur Titel und Beschreibung für die Übersicht.

## Aufbau

| Pfad | Inhalt |
|---|---|
| `index.html` | Übersicht mit Stufen-Tabs, freien und gesperrten Karten |
| `uebung.html` | Übungsseite für Formel-Übungen (nutzt die Portal-Engine unverändert) |
| `pivot-uebung.html` | Übungsseite für Pivot-Aufgaben (`assets/seite/pivot-seite.js`), bettet `pivot.html` ein |
| `pivot.html`, `assets/pivot/datensatz.js` | Pivot-Nachbau – **erzeugt** aus der kostenlosen Seite, nicht von Hand ändern |
| `daten/pivot-aufgabe.json` | Die Pivot-Aufgabe (Text, Tipps, Lösung, Prüfregel, Bauplan der Beispieldaten) |
| `daten/konfiguration.json` | `vollversionUrl` – Ziel der Upgrade-Links, **von Hand pflegen** |
| `daten/uebersicht.json` | Alle Übungen mit `frei: true/false` – **erzeugt** |
| `daten/uebungen/` | Die freien Übungen + `manifest.json` (nur freie) – **erzeugt** |
| `assets/geteilt/` | **Kopie** der geteilten Logik aus dem Portal – nicht von Hand ändern |
| `assets/seite/` | `uebersicht.js` (Übersicht), `fortschritt.js` (Fortschritt im Browser, Tracking als `light`), `seite.css` |
| `supabase/light.sql` | Tracking-Bereich `light` in Supabase freischalten |

## Wartung

- **Aktualisieren (neue Übungen, Engine-Verbesserungen):** Doppelklick auf
  `geteilt-aktualisieren.bat`. Holt den veröffentlichten Stand (`origin/main`) aus
  `../excel-flo-uebungsportal`, kopiert Engine + die freien Übungen und baut die Übersicht neu.
  Danach testen, `?v=` in den HTML-Dateien erhöhen, pushen.
- **Freie Übungen austauschen:** Liste `FREIE_UEBUNGEN` oben in `skripte/geteilt-aktualisieren.js`
  ändern, dann Skript erneut ausführen. Pivot-Aufgaben beginnen mit `pivot-` und stehen in
  `daten/pivot-aufgabe.json` (bisher unterstützt die Seite genau eine Pivot-Aufgabe).
- **Pivot-Nachbau aktualisieren:** `node skripte/pivot-uebernehmen.js` – holt `pivot.html` vom
  veröffentlichten Stand der kostenlosen Seite und stellt nur die Datenquelle um.

## Fortschritt und Tracking

- Fortschritt nur im Browser (`localStorage`, Schlüssel `excelflo_light_progress_v1`) –
  getrennt vom Kaufportal, keine Anmeldung bei Supabase.
- Ereignisse gehen ohne Cookies und ohne Nutzer-ID in die Supabase-Tabelle `events`,
  Bereich `portal = 'light'`. Vorher einmal `supabase/light.sql` ausführen.
- Die Seiten tragen `noindex`, damit sie nicht über Suchmaschinen gefunden werden.

## Lokal testen

Launch-Konfiguration `excel-uebungsportal-light`, Port 8150.
