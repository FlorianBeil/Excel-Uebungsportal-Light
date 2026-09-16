// Holt die geteilte Logik (Tabellenblatt, Formel-Engine, Design, Tracking) und die
// Übungen aus dem Übungsportal-Repo in dieses Repo.
//
// Quelle ist bewusst der VERÖFFENTLICHTE Stand (origin/main), nicht der lokale
// Arbeitsstand: unfertige Änderungen am Portal landen so nie in der Light-Version.
//
// Freigeschaltet sind die Übungen in FREIE_UEBUNGEN (je Stufe, in dieser Reihenfolge).
// Nur deren Übungsdateien werden kopiert – gesperrte Übungen sind hier technisch nicht
// vorhanden, nur Titel und Beschreibung für die Übersicht. Einträge, die mit „pivot-“
// beginnen, kommen nicht aus dem Portal, sondern aus daten/pivot-aufgabe.json.
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

// Bewusst keine Übung, die schon auf der kostenlosen Übungsseite vorkommt
// (dort: summe-umsatz, zaehlenwenn-verkaeufe, summewenn-umsatz-region, sverweis-basis, Pivot umsatz-je-region).
const FREIE_UEBUNGEN = {
  anfaenger: ["mittelwert-noten", "anzahl-teilnehmer", "wenn-bestanden"],
  fortgeschritten: ["wenn-verschachtelt-notenskala", "datedif-alter", "textvor-textnach-email"],
  profi: ["xverweis-mitarbeiterdaten", "pivot-anteil-land-an-region", "wenn-verschachtelt-bonusstufe"],
};

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

const pivotAufgaben = JSON.parse(fs.readFileSync(path.join(repo, "daten", "pivot-aufgabe.json"), "utf8")).aufgaben;
const kurzeintrag = ({ id, title, level, category, description }) => ({ id, title, level, category, description });

// Übersicht je Stufe: freie Übungen zuerst (in der Reihenfolge oben), danach die gesperrten
const uebersicht = [];
Object.keys(FREIE_UEBUNGEN).forEach((stufe) => {
  FREIE_UEBUNGEN[stufe].forEach((id) => {
    const ex = id.startsWith("pivot-") ? pivotAufgaben.find((a) => a.id === id) : manifest.find((m) => m.id === id);
    if (!ex) throw new Error("Freie Übung „" + id + "“ nicht gefunden");
    if (ex.level !== stufe) throw new Error("Freie Übung „" + id + "“ gehört zur Stufe " + ex.level + ", nicht " + stufe);
    uebersicht.push({ ...kurzeintrag(ex), typ: id.startsWith("pivot-") ? "pivot" : "formel", frei: true });
  });
  manifest
    .filter((m) => m.level === stufe && !FREIE_UEBUNGEN[stufe].includes(m.id))
    .forEach((m) => uebersicht.push({ ...kurzeintrag(m), frei: false }));
});
const freie = uebersicht.filter((ex) => ex.frei);
const freieFormeln = freie.filter((ex) => ex.typ === "formel");

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
freieFormeln.forEach((ex) => {
  fs.writeFileSync(path.join(uebungen, ex.id + ".json"), lies("assets/exercises/" + ex.id + ".json"));
  console.log("  frei:         " + ex.level + " / " + ex.id);
});

const schreibeJson = (datei, inhalt) => fs.writeFileSync(datei, JSON.stringify(inhalt, null, 2) + "\n", "utf8");
schreibeJson(
  path.join(uebungen, "manifest.json"),
  // inkl. Pivot-Aufgabe, damit „Nächste Übung“ und „Stufe abgeschlossen“ in engine.js stimmen
  // (uebung.html leitet pivot-… Adressen auf pivot-uebung.html weiter)
  freie.map(({ frei, typ, ...ex }) => ex)
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
