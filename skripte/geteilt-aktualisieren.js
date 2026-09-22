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
// Zusätzlich erscheinen die Übungen des Pivot-Kurses (../pivot-tabelle-prototyp, origin/main)
// als gesperrte Karten in ihrer Kurs-Stufe – ohne die, die hier frei ist (gleicher Titel).
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
// Die Pivot-Aufgabe stammt aus der Profi-Stufe des Pivot-Kurses, steht hier aber bewusst unter Fortgeschritten.
const FREIE_UEBUNGEN = {
  anfaenger: ["mittelwert-noten", "wenn-bestanden"],
  fortgeschritten: ["textvor-textnach-email", "pivot-anteil-land-an-region"],
  profi: ["xverweis-mitarbeiterdaten", "wenn-verschachtelt-bonusstufe"],
};

// Kartentexte der gesperrten Pivot-Übungen. Die Kurs-Texte eignen sich nicht direkt
// (verraten den Lösungsweg oder beziehen sich auf vorherige Übungen). Fehlt eine neue
// Kurs-Übung hier, wird ihr Einleitungstext genommen und eine Warnung ausgegeben.
const PIVOT_BESCHREIBUNGEN = {
  "umsatz-je-region": "Fasse mit einer Pivot-Tabelle die Tagesumsätze je Region zusammen.",
  "anzahl-verkaeufe-je-region": "Werte mit einer Pivot-Tabelle aus, wie viele Verkäufe es je Region gab.",
  "umsatz-je-region-nach-jahr": "Zeige den Umsatz je Region – zusätzlich aufgeteilt nach Jahren.",
  "umsatz-pro-vertriebler-kanal": "Berechne den Umsatz je Vertriebler, aber nur für einen bestimmten Vertriebskanal.",
  "umsatz-je-region-nach-land": "Zeige den Umsatz je Region – zusätzlich aufgeschlüsselt nach Land.",
  "durchschnittlicher-rabatt-je-kategorie": "Ermittle mit einer Pivot-Tabelle den durchschnittlichen Rabatt je Produktkategorie.",
  "umsatz-und-menge-je-kategorie-jahr": "Zeige Umsatz und Menge nebeneinander – aufgeschlüsselt nach Kategorie und Jahr.",
  "umsatzanteil-je-kategorie-prozent": "Zeige, wie viel Prozent jede Produktkategorie zum Gesamtumsatz beiträgt.",
  "umsatz-je-quartal": "Fasse Tagesumsätze aus zwei Jahren je Quartal zusammen, ohne dass die Jahre vermischt werden.",
  "top5-umsatzstaerkste-kunden": "Zeige nur die fünf umsatzstärksten Kunden, absteigend sortiert.",
  "umsatzveraenderung-zum-vorjahr": "Zeige, wie sich der Umsatz gegenüber dem Vorjahr verändert hat – absolut und in Prozent.",
  "deckungsbeitragsmarge-je-kategorie": "Ermittle die Deckungsbeitragsmarge je Produktkategorie – und vermeide dabei einen typischen Rechenfehler.",
  "kumulierter-umsatz-je-monat": "Zeige den Umsatz im Jahresverlauf kumuliert – Monat für Monat.",
  "anzahl-unterschiedlicher-kunden-je-region": "Ermittle, wie viele unterschiedliche Kunden je Region eingekauft haben – nicht, wie viele Verkäufe.",
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

// Übungskatalog des Pivot-Kurses: das Array EXERCISES aus dessen index.html (nur Literale)
const pivotRepo = path.resolve(repo, "..", "pivot-tabelle-prototyp");
execFileSync("git", ["-C", pivotRepo, "fetch", "--quiet", "origin"]);
const pivotHtml = execFileSync("git", ["-C", pivotRepo, "show", "origin/main:index.html"], { maxBuffer: 64 * 1024 * 1024 }).toString("utf8").replace(/\r\n/g, "\n");
const katalogStart = pivotHtml.indexOf("var EXERCISES = [");
const katalogEnde = pivotHtml.indexOf("\n  ];", katalogStart);
if (katalogStart === -1 || katalogEnde === -1) throw new Error("Übungskatalog im Pivot-Repo nicht gefunden (var EXERCISES)");
const pivotKatalog = new Function("return " + pivotHtml.slice(katalogStart + "var EXERCISES = ".length, katalogEnde + 4))();

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
  pivotKatalog
    .filter((p) => p.level === stufe && !pivotAufgaben.some((a) => a.title === p.title))
    .forEach((p) => {
      let description = PIVOT_BESCHREIBUNGEN[p.id];
      if (!description) {
        description = p.intro.replace(/<p class="goal">[\s\S]*$/, "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").trim();
        console.warn("  WARNUNG: kein Kartentext für Pivot-Übung „" + p.id + "“ – Einleitung verwendet");
      }
      uebersicht.push({ id: "pivot-kurs-" + p.id, title: p.title, level: stufe, category: "pivot-tabellen", description, frei: false });
    });
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
