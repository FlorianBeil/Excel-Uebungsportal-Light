// Holt die geteilte Logik (Tabellenblatt, Formel-Engine, Design, Tracking) und die
// Übungen aus dem Übungsportal-Repo in dieses Repo.
//
// Quelle ist bewusst der VERÖFFENTLICHTE Stand (origin/main), nicht der lokale
// Arbeitsstand: unfertige Änderungen am Portal landen so nie in der Light-Version.
//
// Freigeschaltet sind je Stufe die ersten FREI_JE_STUFE Übungen (Reihenfolge wie im
// Portal-Manifest). Nur deren Übungsdateien werden kopiert – gesperrte Übungen sind
// hier technisch nicht vorhanden, nur Titel und Beschreibung für die Übersicht.
//
// Erzeugt:
//   assets/geteilt/…               Kopie der Portal-Dateien + QUELLE.txt
//   daten/uebungen/<id>.json       die freien Übungen
//   daten/uebungen/manifest.json   nur freie Übungen (liest engine.js für „Nächste Übung“)
//   daten/uebersicht.json          alle Übungen mit frei: true/false (liest die Übersicht)
//
// Aufruf: Doppelklick auf geteilt-aktualisieren.bat im Hauptordner.

"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const FREI_JE_STUFE = 3;
const STUFEN = ["anfaenger", "fortgeschritten", "profi"];

const repo = path.resolve(__dirname, "..");
const portal = path.resolve(repo, "..", "excel-flo-uebungsportal");

const DATEIEN = [
  "assets/engine.js",
  "assets/formula-engine.js",
  "assets/engine.css",
  "assets/tracking.js",
  "assets/img/bg-green.webp",
  "assets/img/logo-white.webp",
  "assets/img/logo.svg",
];

function git(args) {
  return execFileSync("git", ["-C", portal, ...args], { encoding: "utf8" }).trim();
}

if (!fs.existsSync(path.join(portal, ".git"))) {
  throw new Error("Portal-Repo nicht gefunden: " + portal);
}

console.log("Hole aktuellen Stand des Portals von GitHub ...");
git(["fetch", "--quiet", "origin"]);
const commit = git(["rev-parse", "--short", "origin/main"]);

const manifest = JSON.parse(git(["show", "origin/main:assets/exercises/manifest.json"]));

const uebersicht = [];
const zaehler = {};
manifest.forEach((ex) => {
  zaehler[ex.level] = (zaehler[ex.level] || 0) + 1;
  uebersicht.push({ ...ex, frei: STUFEN.includes(ex.level) && zaehler[ex.level] <= FREI_JE_STUFE });
});
const freie = uebersicht.filter((ex) => ex.frei);

// git show als Buffer (nicht als Text): Bilder bleiben so unbeschädigt.
const lies = (datei) => execFileSync("git", ["-C", portal, "show", "origin/main:" + datei], { maxBuffer: 50 * 1024 * 1024 });

const geteilt = path.join(repo, "assets", "geteilt");
fs.mkdirSync(path.join(geteilt, "img"), { recursive: true });
DATEIEN.forEach((d) => {
  const relativ = d.slice("assets/".length);
  fs.writeFileSync(path.join(geteilt, relativ), lies(d));
  console.log("  aktualisiert: assets/geteilt/" + relativ);
});

// Übungsordner komplett neu aufbauen, damit nicht mehr freie Übungen verschwinden
const uebungen = path.join(repo, "daten", "uebungen");
fs.rmSync(uebungen, { recursive: true, force: true });
fs.mkdirSync(uebungen, { recursive: true });
freie.forEach((ex) => {
  fs.writeFileSync(path.join(uebungen, ex.id + ".json"), lies("assets/exercises/" + ex.id + ".json"));
  console.log("  frei:         " + ex.level + " / " + ex.id);
});

const schreibeJson = (datei, inhalt) => fs.writeFileSync(datei, JSON.stringify(inhalt, null, 2) + "\n", "utf8");
schreibeJson(
  path.join(uebungen, "manifest.json"),
  freie.map(({ frei, ...ex }) => ex)
);
schreibeJson(path.join(repo, "daten", "uebersicht.json"), uebersicht);

const jetzt = new Date();
const zwei = (n) => String(n).padStart(2, "0");
const datum = `${jetzt.getFullYear()}-${zwei(jetzt.getMonth() + 1)}-${zwei(jetzt.getDate())} ${zwei(jetzt.getHours())}:${zwei(jetzt.getMinutes())}`;
fs.writeFileSync(
  path.join(geteilt, "QUELLE.txt"),
  [
    "Kopie aus github.com/FlorianBeil/Excel-Aufgaben (Branch main)",
    "Commit: " + commit,
    "Geholt: " + datum,
    "",
    "Nicht von Hand aendern - wird beim naechsten Update ueberschrieben.",
    "Aenderungen an diesen Dateien immer im Portal-Repo machen.",
    "",
  ].join("\r\n"),
  "ascii"
);

console.log("");
console.log(`Fertig. Stand des Portals: Commit ${commit} – ${freie.length} von ${uebersicht.length} Übungen frei.`);
console.log("Nächster Schritt: Seite testen, dann committen und pushen.");
