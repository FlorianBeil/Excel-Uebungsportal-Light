/* Excel.Flo Bonus-Übungen – gemeinsame Helfer für Übersicht und Übungsseite
 *
 * Die freien Übungen sind ein fester Weg 1 → 5 (Reihenfolge = daten/uebersicht.json,
 * erzeugt aus FREIE_UEBUNGEN in skripte/geteilt-aktualisieren.js). „Als nächstes“ ist
 * immer die erste noch nicht gelöste Übung in dieser Reihenfolge.
 */

(function () {
  "use strict";

  const STUFEN = [
    { id: "anfaenger", label: "Anfänger" },
    { id: "fortgeschritten", label: "Fortgeschritten" },
    { id: "profi", label: "Profi" },
  ];

  const LOCK_SVG =
    '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/></svg>';
  const CHECK_SVG =
    '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    for (const key in attrs || {}) {
      const wert = attrs[key];
      if (wert === null || wert === undefined || wert === false) continue;
      if (key === "class") node.className = wert;
      else if (key === "text") node.textContent = wert;
      else if (key === "html") node.innerHTML = wert;
      else node.setAttribute(key, wert === true ? "" : wert);
    }
    (children || []).forEach((c) => {
      if (c === null || c === undefined || c === false) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }

  function track(event, exerciseId, detail) {
    if (window.ExcelFloTracking) window.ExcelFloTracking.track("light", exerciseId || null, event, detail || {});
  }

  function laden(pfad) {
    return fetch(pfad, { cache: "no-cache" }).then((res) => {
      if (!res.ok) throw new Error(pfad + " konnte nicht geladen werden (" + res.status + ")");
      return res.json();
    });
  }

  // { alle, freie, gesperrte, konfig }
  function ladeUebersicht() {
    return Promise.all([laden("daten/uebersicht.json"), laden("daten/konfiguration.json")]).then(([alle, konfig]) => ({
      alle,
      freie: alle.filter((ex) => ex.frei),
      gesperrte: alle.filter((ex) => !ex.frei),
      konfig,
    }));
  }

  const erledigt = (ex) => window.ExcelFloProgress.isCompleted(ex.id);
  const naechste = (freie) => freie.find((ex) => !erledigt(ex)) || null;
  const uebungUrl = (ex) => "uebung.html?id=" + encodeURIComponent(ex.id);
  const kategorie = (c) => (c ? c.charAt(0).toUpperCase() + c.slice(1).replace(/-/g, " ") : "");

  // Gesamtzeit nur, wenn für jede freie Übung eine Zeit vorliegt (sonst wäre sie geschönt)
  function gesamtZeit(freie) {
    const zeiten = window.ExcelFloProgress.getTimes();
    if (!freie.every((ex) => zeiten[ex.id] > 0)) return null;
    return freie.reduce((summe, ex) => summe + zeiten[ex.id], 0);
  }

  function formatZeit(ms) {
    const sek = Math.max(1, Math.round(ms / 1000));
    const h = Math.floor(sek / 3600);
    const m = Math.floor((sek % 3600) / 60);
    const s = String(sek % 60).padStart(2, "0");
    return h ? h + ":" + String(m).padStart(2, "0") + ":" + s : m + ":" + s;
  }

  // Link zur Vollversion mit Tracking
  function upgradeLink(url, text, ort, klasse, exerciseId) {
    const link = el("a", { class: klasse, href: url, target: "_blank", rel: "noopener", text });
    link.addEventListener("click", () => track("upgrade_click", exerciseId, { ort }));
    return link;
  }

  window.ExcelFloBonus = {
    STUFEN, LOCK_SVG, CHECK_SVG,
    el, track, laden, ladeUebersicht, erledigt, naechste, uebungUrl, kategorie, gesamtZeit, formatZeit, upgradeLink,
  };
})();
