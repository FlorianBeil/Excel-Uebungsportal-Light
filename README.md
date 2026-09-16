# Excel.Flo – Übungsportal Light

Kostenlose Light-Version des Übungsportals zu Excel-Funktionen. Gedacht als nächster Schritt
nach der [kostenlosen Übungsseite](https://github.com/FlorianBeil/Excel-Uebungen-kostenlos):
je Stufe (Anfänger, Fortgeschritten, Profi) sind die ersten **drei** Übungen frei, alle
weiteren sind ausgegraut und verlinken auf die Vollversion.

**Strikt getrennt vom Käufer-Portal** ([Excel-Aufgaben](https://github.com/FlorianBeil/Excel-Aufgaben)):
eigenes Repo, eigenes Deployment, das Portal verlinkt nie hierher. Gesperrte Übungen liegen
hier gar nicht als Datei vor – nur Titel und Beschreibung für die Übersicht.

## Aufbau

| Pfad | Inhalt |
|---|---|
| `index.html` | Übersicht mit Stufen-Tabs, freien und gesperrten Karten |
| `uebung.html` | Übungsseite (nutzt die Portal-Engine unverändert) |
| `daten/konfiguration.json` | `vollversionUrl` – Ziel der Upgrade-Links, **von Hand pflegen** |
| `daten/uebersicht.json` | Alle Übungen mit `frei: true/false` – **erzeugt** |
| `daten/uebungen/` | Die freien Übungen + `manifest.json` (nur freie) – **erzeugt** |
| `assets/geteilt/` | **Kopie** der geteilten Logik aus dem Portal – nicht von Hand ändern |
| `assets/seite/` | `uebersicht.js` (Übersicht), `fortschritt.js` (Fortschritt im Browser, Tracking als `light`), `seite.css` |
| `supabase/light.sql` | Tracking-Bereich `light` in Supabase freischalten |

## Wartung

- **Aktualisieren (neue Übungen, Engine-Verbesserungen):** Doppelklick auf
  `geteilt-aktualisieren.bat`. Holt den veröffentlichten Stand (`origin/main`) aus
  `../excel-flo-uebungsportal`, kopiert Engine + die ersten drei Übungen je Stufe und baut
  die Übersicht neu. Danach testen, `?v=` in `index.html` und `uebung.html` erhöhen, pushen.
- **Anzahl freier Übungen ändern:** `FREI_JE_STUFE` in `skripte/geteilt-aktualisieren.js`,
  dann Skript erneut ausführen.
- Welche Übungen frei sind, richtet sich nach der Reihenfolge im Portal-Manifest.
  Ändert sich dort die Reihenfolge, ändert sich beim nächsten Update auch die Auswahl hier.

## Fortschritt und Tracking

- Fortschritt nur im Browser (`localStorage`, Schlüssel `excelflo_light_progress_v1`) –
  getrennt vom Kaufportal, keine Anmeldung bei Supabase.
- Ereignisse gehen ohne Cookies und ohne Nutzer-ID in die Supabase-Tabelle `events`,
  Bereich `portal = 'light'`. Vorher einmal `supabase/light.sql` ausführen.
- Die Seiten tragen `noindex`, damit sie nicht über Suchmaschinen gefunden werden.

## Lokal testen

Launch-Konfiguration `excel-uebungsportal-light`, Port 8150.
