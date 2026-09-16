// Übernimmt den Pivot-Nachbau von der kostenlosen Übungsseite (Repo Excel-Uebungen-kostenlos).
//
// Dort wird er bereits aus dem Pivot-Kurs-Repo herausgelöst (skripte/pivot-uebernehmen.js):
// ohne Kurs-Katalog, Kurs-Fortschritt und Kurs-Tracking, mit Barrierefreiheits-Anpassungen.
// Hier wird nur noch die Datenquelle umgestellt: statt der Aufgabe der kostenlosen Seite
// lädt pivot.html die Aufgabe aus daten/pivot-aufgabe.json.
//
// Quelle ist der veröffentlichte Stand (origin/main) von ../excel-uebungen-kostenlos.
// Aufruf: node skripte/pivot-uebernehmen.js
"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const repo = path.resolve(__dirname, "..");
const quelle = path.resolve(repo, "..", "excel-uebungen-kostenlos");

const git = (args) => execFileSync("git", ["-C", quelle, ...args], { maxBuffer: 64 * 1024 * 1024 });

git(["fetch", "--quiet", "origin"]);
const commit = git(["rev-parse", "--short", "origin/main"]).toString().trim();

let s = git(["show", "origin/main:pivot.html"]).toString("utf8");
const anker = 'fetch("daten/aufgaben.json"';
if (s.split(anker).length !== 2) throw new Error("Anker " + anker + " nicht genau einmal in pivot.html gefunden");
s = s.replace(anker, 'fetch("daten/pivot-aufgabe.json"');
s = s.replace(/<!-- Aus github\.com[^\n]*-->\n/, (kopf) =>
  kopf + "<!-- Übernommen aus github.com/FlorianBeil/Excel-Uebungen-kostenlos (Commit " + commit + ") mit skripte/pivot-uebernehmen.js – nicht von Hand ändern. -->\n"
);

fs.writeFileSync(path.join(repo, "pivot.html"), s);
fs.mkdirSync(path.join(repo, "assets", "pivot"), { recursive: true });
fs.writeFileSync(path.join(repo, "assets", "pivot", "datensatz.js"), git(["show", "origin/main:assets/pivot/datensatz.js"]));

console.log("pivot.html + assets/pivot/datensatz.js übernommen (kostenlose Seite, Commit " + commit + ")");
