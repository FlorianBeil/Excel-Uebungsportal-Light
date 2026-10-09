/* Excel.Flo Bonus-Übungen – Übungsseite (uebung.html?id=…) für Formel- und Pivot-Übungen
 *
 * Eigene Seite statt initExercise aus engine.js: Die Bonus-Übungen sind ein fester Weg 1 → 5
 * („Übung 3 von 5“, Fortschrittsbalken, „Weiter mit Übung 4“). Die Tabelle selbst kommt
 * unverändert aus der Portal-Engine (window.ExcelFlo.createSheet), die Pivot-Aufgabe aus
 * pivot.html im iframe (prüft selbst und meldet das Ergebnis per postMessage).
 *
 * Am Handy gibt es unter der Tabelle zusätzlich ein Formelfeld („Deine Formel in D2“), weil
 * Tippen direkt in die kleine Zelle dort mühsam ist. Es schreibt in dieselbe Eingabezelle.
 *
 * Zeitmessung für „Deine Zeit“: nur sichtbare Zeit bis zum ersten Lösen (fortschritt.js).
 */

(function () {
  "use strict";

  const B = window.ExcelFloBonus;
  const { el } = B;

  // Erste Funktion der Formel, die zählt statt rechnet → Ergebnis ohne Zahlenformat (wie engine.js)
  const OHNE_FORMAT = new Set(["ANZAHL", "ZÄHLENWENN", "ZÄHLENWENNS", "DATEDIF", "VERGLEICH", "LÄNGE", "FINDEN"]);

  // Touch-Bedienung oder wirklich schmal – ein schmales Desktop-Fenster mit Maus braucht das Feld nicht
const istMobil = () => window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 600;

  function start() {
    const root = document.getElementById("bonus-uebung");
    const id = new URLSearchParams(location.search).get("id");

    B.ladeUebersicht()
      .then((daten) => {
        const index = daten.freie.findIndex((ex) => ex.id === id);
        if (index === -1) throw new Error("Übung „" + id + "“ nicht gefunden");
        const eintrag = daten.freie[index];
        const quelle = eintrag.typ === "pivot"
          ? B.laden("daten/pivot-aufgabe.json").then((d) => d.aufgaben.find((a) => a.id === id))
          : B.laden("daten/uebungen/" + encodeURIComponent(id) + ".json");
        return quelle.then((aufgabe) => aufbauen(root, aufgabe, eintrag, index, daten.freie));
      })
      .catch((err) => {
        root.innerHTML = "";
        root.appendChild(el("p", { class: "bonus-fehler" }, ["Fehler beim Laden der Übung: " + err.message + " "]));
        root.appendChild(el("a", { class: "bonus-link", href: "index.html", text: "Zur Übersicht" }));
      });
  }

  function aufbauen(root, a, eintrag, index, freie) {
    document.title = "Excel.Flo – " + a.title;
    root.innerHTML = "";
    const nr = index + 1;
    const zeit = zeitmessung(a.id);
    const stats = { geoeffnet: Date.now(), versuche: 0 };

    root.appendChild(el("nav", { class: "bonus-nav", "aria-label": "Fortschritt" }, [
      el("a", { class: "bonus-nav__zurueck", href: "index.html", text: "‹ Übersicht" }),
      el("p", { class: "bonus-label", text: "Übung " + nr + " von " + freie.length }),
    ]));
    root.appendChild(el("div", { class: "bonus-segmente", "aria-hidden": "true" },
      freie.map((ex, i) => el("span", { class: i <= index || B.erledigt(ex) ? "is-voll" : "" }))
    ));

    root.appendChild(el("p", { class: "bonus-badge bonus-badge--kategorie", text: B.kategorie(a.category) }));
    root.appendChild(el("h1", { class: "bonus-titel", text: a.title }));
    root.appendChild(el("div", { class: "bonus-aufgabe" }, [
      a.task.intro ? el("p", { text: a.task.intro }) : null,
      ...(a.task.steps || []).map((s) => el("p", { text: s })),
    ]));

    const arbeitsbereich = el("div", { class: "bonus-arbeitsbereich" });
    root.appendChild(arbeitsbereich);
    const feedback = el("div", { class: "bonus-feedback", role: "status", "aria-live": "polite" });
    const weiter = el("div", { class: "bonus-weiter" });

    const geloest = () => {
      zeit.geloest();
      const neu = !B.erledigt(a);
      window.ExcelFloProgress.markCompleted(a.id);
      if (neu) B.track("exercise_solved", a.id, { seconds: Math.round((Date.now() - stats.geoeffnet) / 1000) });
      erfolgZeigen(feedback, a);
      weiterZeigen(weiter, freie, a);
    };
    const pruefung = (richtig) => {
      stats.versuche++;
      B.track("check", a.id, { correct: richtig, attempt: stats.versuche, seconds: Math.round((Date.now() - stats.geoeffnet) / 1000) });
    };

    if (a.typ === "pivot") pivotTeil(arbeitsbereich, a, feedback, pruefung, geloest);
    else formelTeil(arbeitsbereich, a, feedback, pruefung, geloest);

    root.appendChild(feedback);
    root.appendChild(tippsUndLoesung(a));
    root.appendChild(weiter);

    // Wiederholen: Weiter-Knopf gleich zeigen, die Übung selbst startet leer
    if (B.erledigt(a)) weiterZeigen(weiter, freie, a);
    else weiter.appendChild(el("a", { class: "bonus-link bonus-weiter__uebersicht", href: "index.html", text: "Zur Übersicht" }));

    B.track("exercise_open", a.id, { nr });
  }

  /* ---------------- Formel-Übung ---------------- */

  function formelTeil(bereich, a, feedback, pruefung, geloest) {
    const E = window.ExcelFlo;
    const sheet = E.createSheet(a.grid);
    sheet.node.setAttribute("aria-label", "Tabelle. Zellen mit den Pfeiltasten wählen, zum Bearbeiten tippen oder Enter drücken.");
    bereich.appendChild(sheet.node);

    const refs = Object.keys(sheet.inputEntries);
    const feld = istMobil() && refs.length === 1 ? formelFeld(bereich, a, sheet, refs[0]) : null;
    if (istMobil()) handySpalten(sheet, a.grid.cols.length);
    zielzelleZeigen(sheet.inputEntries[refs[0]].td);

    const pruefen = el("button", { type: "button", class: "bonus-btn", text: "Prüfen" });
    const zuruecksetzen = el("button", { type: "button", class: "bonus-btn bonus-btn--rand", text: "Zurücksetzen" });
    bereich.appendChild(el("div", { class: "bonus-aktionen" }, [pruefen, zuruecksetzen]));

    zuruecksetzen.addEventListener("click", () => {
      sheet.reset();
      refs.forEach((r) => sheet.inputEntries[r].td.classList.remove("is-correct", "is-wrong"));
      if (feld) feld.value = "";
      leeren(feedback);
    });

    pruefen.addEventListener("click", () => {
      let beantwortet = 0;
      let richtig = 0;
      refs.forEach((r) => {
        const e = sheet.inputEntries[r];
        const ergebnis = E.checkCell(e.raw, e.answer, sheet.getCellValue);
        e.td.classList.remove("is-correct", "is-wrong");
        if (ergebnis === true) { e.td.classList.add("is-correct"); beantwortet++; richtig++; }
        else if (ergebnis === false) { e.td.classList.add("is-wrong"); beantwortet++; }
      });

      if (!beantwortet) {
        const meldung = "Trag zuerst eine Formel in die markierte Zelle " + refs[0] + " ein.";
        fehlerZeigen(feedback, meldung);
        E.showErrorPopup(sheet.node, meldung);
        return;
      }
      const ok = richtig === refs.length;
      pruefung(ok);
      if (ok) {
        E.showSuccessPopup(sheet.node);
        geloest();
      } else {
        const meldung = refs.length === 1 ? "Das Ergebnis stimmt noch nicht." : richtig + " von " + refs.length + " Feldern stimmen.";
        E.showErrorPopup(sheet.node, meldung);
        fehlerZeigen(feedback, meldung + " Schau dir die Tipps an – oder lass dir die Lösung anzeigen.");
      }
    });
  }

  // Handy: Die Engine hängt rechts leere Spalten an (Excel-Optik) und gibt den Datenspalten ihre
  // Desktop-Breite – zusammen breiter als der Bildschirm, dann ist Spalte A angeschnitten.
  // Hier: leere Spalten ausblenden und die Datenspalten anteilig auf die verfügbare Breite bringen.
  const ZEILENKOPF_HANDY = 34;
  const SPALTE_MIN_HANDY = 64;

  function handySpalten(sheet, anzahlDaten) {
    setTimeout(() => {
      const table = sheet.node.querySelector("table.sheet");
      const scroller = sheet.node.querySelector(".sheet-scroll");
      if (!table || !scroller || table.offsetWidth <= scroller.clientWidth) return;
      const cols = [...table.querySelectorAll("colgroup col")];
      const daten = cols.slice(1, 1 + anzahlDaten);
      cols.slice(1 + anzahlDaten).forEach((c) => (c.style.visibility = "collapse"));
      cols[0].style.width = ZEILENKOPF_HANDY + "px";
      const breiten = daten.map((c) => parseFloat(c.style.width) || 110);
      const faktor = Math.min(1, (scroller.clientWidth - ZEILENKOPF_HANDY) / breiten.reduce((x, y) => x + y, 0));
      let gesamt = ZEILENKOPF_HANDY;
      daten.forEach((c, i) => {
        const w = Math.max(SPALTE_MIN_HANDY, Math.floor(breiten[i] * faktor));
        c.style.width = w + "px";
        gesamt += w;
      });
      table.style.minWidth = "0";
      table.style.width = gesamt + "px";
    }, 0);
  }

  // Schmale Bildschirme: Tabelle seitlich so weit scrollen, dass die gelbe Zielzelle sichtbar ist
  // (nur innerhalb der Tabelle – die Seite selbst bewegt sich nicht)
  function zielzelleZeigen(td) {
    // setTimeout statt requestAnimationFrame: läuft auch, wenn der Tab gerade im Hintergrund lädt
    setTimeout(() => {
      const scroller = td.closest(".sheet-scroll");
      if (!scroller || scroller.scrollWidth <= scroller.clientWidth) return;
      // Nur scrollen, wenn die Zielzelle wirklich (teilweise) verdeckt ist – dann mit etwas Luft
      const verdeckt = td.getBoundingClientRect().right - scroller.getBoundingClientRect().right;
      if (verdeckt > 1) scroller.scrollLeft += verdeckt + 16;
    }, 0);
  }

  // Formelfeld fürs Handy: schreibt in die Eingabezelle (entry.raw – daraus liest auch die Prüfung)
  // und zeigt das Ergebnis in der Zelle wie engine.js nach einer Eingabe direkt in der Zelle.
  function formelFeld(bereich, a, sheet, ref) {
    const entry = sheet.inputEntries[ref];
    const id = "formel-" + ref;
    const feld = el("input", {
      id, type: "text", class: "bonus-formelfeld__eingabe", placeholder: "=",
      autocomplete: "off", autocapitalize: "off", autocorrect: "off", spellcheck: "false", enterkeyhint: "done",
    });
    bereich.appendChild(el("div", { class: "bonus-formelfeld" }, [
      el("label", { for: id, text: "Deine Formel in " + ref }),
      feld,
    ]));

    feld.addEventListener("input", () => {
      entry.raw = feld.value.trim();
      entry.td.classList.remove("is-correct", "is-wrong");
      ergebnisAnzeigen(a, sheet, entry);
    });
    feld.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") feld.blur();
    });
    // Wer doch in der Zelle tippt: Feld nachziehen
    sheet.node.addEventListener("focusout", () => setTimeout(() => {
      if (document.activeElement !== feld) feld.value = entry.raw;
    }, 0));
    return feld;
  }

  function ergebnisAnzeigen(a, sheet, entry) {
    const raw = entry.raw;
    let text = raw;
    let zahl = false;
    if (raw.startsWith("=") && window.ExcelFloFormula) {
      const F = window.ExcelFloFormula;
      const ergebnis = F.evaluate(raw, sheet.getCellValue);
      if (F.isFormulaError(ergebnis)) {
        const code = String(ergebnis.message || "").match(/#[A-ZÄÖÜ0-9\/!?]+/);
        text = code ? ({ "#N/A": "#NV", "#VALUE!": "#WERT!" }[code[0]] || code[0]) : "#WERT!";
      } else if (typeof ergebnis === "number") {
        text = zahlFormatieren(ergebnis, entry.format || formatAusFormel(a, raw));
        zahl = true;
      } else if (typeof ergebnis === "boolean") {
        text = ergebnis ? "WAHR" : "FALSCH";
      } else {
        text = ergebnis === undefined || ergebnis === null ? "0" : String(ergebnis);
      }
    }
    entry.el.textContent = text;
    entry.td.classList.toggle("cell--num", zahl);
  }

  function formatAusFormel(a, raw) {
    const funktion = (raw.match(/^=\s*([A-ZÄÖÜa-zäöü.]+)\s*\(/) || [])[1];
    if (funktion && OHNE_FORMAT.has(funktion.toUpperCase())) return null;
    const bezug = (raw.match(/\$?[A-Za-z]{1,3}\$?\d+/) || [])[0];
    const def = bezug && a.grid.cells[bezug.replace(/\$/g, "").toUpperCase()];
    // Erster Bezug ohne Format (z. B. Suchwert bei SVERWEIS): Format der Ergebnisspalte suchen
    if (def && def.format) return def.format;
    const mitFormat = Object.values(a.grid.cells).find((c) => c.format);
    return /SVERWEIS|MAX|MIN|SUMME|MITTELWERT/i.test(funktion || "") && mitFormat ? mitFormat.format : null;
  }

  function zahlFormatieren(n, format) {
    if (format === "currency0" && !Number.isInteger(Math.round(n * 100) / 100)) format = "currency";
    if (format === "currency") return n.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
    if (format === "currency0") return n.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
    const gerundet = Number.isInteger(n) ? n : parseFloat(n.toPrecision(10));
    return String(gerundet).replace(".", ",");
  }

  /* ---------------- Pivot-Übung ---------------- */

  function pivotTeil(bereich, a, feedback, pruefung, geloest) {
    const iframe = el("iframe", { class: "bonus-pivot", src: "pivot.html", title: "Pivot-Tabelle: " + a.title });
    iframe.addEventListener("load", () => {
      try {
        const doc = iframe.contentDocument;
        // Höhe folgt dem Inhalt (gleiche Herkunft) – keine zweite Scrollleiste
        const anpassen = () => (iframe.style.height = Math.ceil(doc.body.getBoundingClientRect().height) + "px");
        anpassen();
        new ResizeObserver(anpassen).observe(doc.body);
      } catch (e) {
        // feste Höhe aus seite.css bleibt
      }
    });
    bereich.appendChild(iframe);

    window.addEventListener("message", (ev) => {
      if (ev.origin !== location.origin || ev.source !== iframe.contentWindow) return;
      const m = ev.data;
      if (!m || m.quelle !== "excelflo-pivot" || m.typ !== "pruefung") return;
      const richtig = !!(m.daten && m.daten.richtig);
      pruefung(richtig);
      // Die Fehlermeldung zeigt der Pivot-Nachbau selbst; hier nur der Erfolg
      if (richtig) geloest();
      else leeren(feedback);
    });
  }

  /* ---------------- Tipps, Lösung, Rückmeldung, Weiter ---------------- */

  function tippsUndLoesung(a) {
    const loesung = el("div", { class: "bonus-loesung", hidden: true }, [
      el("p", { class: "bonus-label", text: "Lösung" }),
      el("p", { class: a.typ === "pivot" ? "bonus-loesung__text" : "bonus-loesung__formel", text: a.solution }),
      el("p", { text: a.explanation }),
    ]);
    const knopf = el("button", { type: "button", class: "bonus-btn bonus-btn--rand bonus-btn--klein", text: "Lösung anzeigen" });
    knopf.addEventListener("click", () => {
      loesung.hidden = !loesung.hidden;
      knopf.textContent = loesung.hidden ? "Lösung anzeigen" : "Lösung ausblenden";
      if (!loesung.hidden) B.track("solution_show", a.id);
    });
    const details = el("details", { class: "bonus-tipps" }, [
      el("summary", { text: "Tipps anzeigen" }),
      el("ol", {}, (a.hints || []).map((h) => el("li", { text: h }))),
      knopf,
      loesung,
    ]);
    details.addEventListener("toggle", () => {
      if (details.open) B.track("hints_open", a.id);
    });
    return details;
  }

  function leeren(feedback) {
    feedback.className = "bonus-feedback";
    feedback.innerHTML = "";
  }

  function fehlerZeigen(feedback, meldung) {
    leeren(feedback);
    feedback.classList.add("is-error");
    feedback.appendChild(el("p", { text: meldung }));
  }

  function erfolgZeigen(feedback, a) {
    leeren(feedback);
    feedback.classList.add("is-success");
    feedback.appendChild(el("span", { class: "bonus-feedback__haken", "aria-hidden": "true", html: B.CHECK_SVG }));
    feedback.appendChild(el("div", {}, [
      el("p", { class: "bonus-feedback__titel", text: "Richtig gelöst." }),
      el("p", { text: a.erfolgTipp || a.explanation }),
    ]));
  }

  function weiterZeigen(weiter, freie, a) {
    weiter.innerHTML = "";
    // Nächste offene Übung NACH dieser (Übung 3 → 4), erst danach von vorn
    const offen = (ex) => ex.id !== a.id && !B.erledigt(ex);
    const index = freie.findIndex((ex) => ex.id === a.id);
    const naechste = freie.slice(index + 1).find(offen) || freie.find(offen) || null;
    const ziel = naechste
      ? el("a", { class: "bonus-btn bonus-btn--gross bonus-btn--voll", href: B.uebungUrl(naechste), text: "Weiter mit Übung " + (freie.indexOf(naechste) + 1) + " →" })
      : el("a", { class: "bonus-btn bonus-btn--gross bonus-btn--voll", href: "index.html", text: "Zum Abschluss →" });
    weiter.appendChild(ziel);
    weiter.appendChild(el("a", { class: "bonus-link bonus-weiter__uebersicht", href: "index.html", text: "Zur Übersicht" }));
  }

  /* ---------------- Zeitmessung ---------------- */

  function zeitmessung(id) {
    let gesammelt = 0;
    let seit = document.visibilityState === "visible" ? Date.now() : null;
    let fertig = false;
    const anhalten = () => {
      if (seit !== null) gesammelt += Date.now() - seit;
      seit = null;
    };
    const sichern = () => {
      anhalten();
      if (!fertig) window.ExcelFloProgress.addTime(id, gesammelt);
      gesammelt = 0;
    };
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") { if (seit === null) seit = Date.now(); }
      else sichern();
    });
    window.addEventListener("pagehide", sichern);
    return {
      // vor markCompleted aufrufen – danach nimmt addTime nichts mehr an
      geloest() {
        sichern();
        fertig = true;
      },
    };
  }

  document.addEventListener("DOMContentLoaded", start);
})();
