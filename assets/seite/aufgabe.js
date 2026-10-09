/* Excel.Flo Bonus-Übungen – Inhalt EINER Übung (Kopfzeile, Text, Tabelle bzw. Pivot-Nachbau,
 * Prüfen, Rückmeldung, Tipps mit Lösung, Weiter-Bereich) zum Einsetzen in die Übersicht
 * (uebersicht.js klappt die Übungen dort auf und zu). Aufbau wie in der kostenlosen
 * Übungsseite (excel-uebungen-kostenlos/assets/seite/aufgabe.js) – Tabelle, Formelfeld und
 * Pivot-Teil sind dort und hier identisch; eigen sind hier die Regeln der Bonus-Übungen:
 * gelöst = richtig geprüft (ExcelFloProgress), die Lösung steht jederzeit in den Tipps.
 *
 * ExcelFloAufgabe.bauen(a, nr, ctx) → { node, weiter, beimOeffnen() }
 *   ctx.erledigt(a)   schon gelöst?
 *   ctx.geloest(a)    nach dem ersten richtigen Prüfen (Fortschritt speichern, Anzeige anpassen)
 */

(function () {
  "use strict";

  const B = window.ExcelFloBonus;
  const { el } = B;
  const E = window.ExcelFlo;
  // Gleiche Schnittstelle wie in der kostenlosen Seite (F.track(event, detail, eintrag))
  const F = {
    track: (event, detail, eintrag) => B.track(event, eintrag ? eintrag.a.id : null, Object.assign(eintrag ? { nr: eintrag.nr } : {}, detail || {})),
  };

  // Erste Funktion der Formel, die zählt statt rechnet → Ergebnis ohne Zahlenformat (wie engine.js)
  const OHNE_FORMAT = new Set(["ANZAHL", "ZÄHLENWENN", "ZÄHLENWENNS", "DATEDIF", "VERGLEICH", "LÄNGE", "FINDEN"]);
  // Touch-Bedienung oder wirklich schmal (Breite 0 = Tab lädt unsichtbar im Hintergrund)
  const istMobil = () => window.matchMedia("(pointer: coarse)").matches || (window.innerWidth > 0 && window.innerWidth < 600);

  function bauen(a, nr, ctx) {
    const eintrag = { a, nr, gestartet: false, versuche: 0, geoeffnet: Date.now() };
    const schritte = a.task.steps || [];

    // Bausteine einzeln, damit sie am PC in zwei Spalten stehen können (seite.css):
    // links Kopf, Buttons, Rückmeldung/Tipps – rechts die Tabelle. Am Handy untereinander.
    const bereich = el("div", { class: "bonus-arbeitsbereich frei-teil-tabelle" });
    const aktionen = el("div", { class: "bonus-aktionen frei-teil-aktionen" });
    const feedback = el("div", { class: "bonus-feedback", role: "status", "aria-live": "polite" });
    const weiter = el("div", { class: "bonus-weiter" });

    const node = el("div", { class: "frei-aufgabe__inhalt" + (a.typ === "pivot" ? " is-pivot" : " is-formel") }, [
      el("div", { class: "frei-teil-kopf" }, [
        el("p", { class: "bonus-label", text: "Übung " + nr + (a.funktion ? " · Thema: " + a.funktion : "") }),
        el("h2", { class: "bonus-titel frei-aufgabe__titel", id: "uebung-" + nr + "-titel", text: a.title }),
        el("div", { class: "bonus-aufgabe" }, [
          a.task.intro ? el("p", { text: a.task.intro }) : null,
          // Nur echte Schrittfolgen als nummerierte Liste – ein einzelner Schritt ist ein normaler Satz
          ...(schritte.length > 1 ? [el("ol", {}, schritte.map((s) => el("li", { text: s })))] : schritte.map((s) => el("p", { text: s }))),
        ]),
      ]),
      bereich,
      a.typ === "pivot" ? null : aktionen,
      el("div", { class: "frei-teil-unten" }, [feedback, tipps(eintrag), weiter]),
    ]);

    const gestartet = () => {
      if (eintrag.gestartet) return;
      eintrag.gestartet = true;
      F.track("exercise_start", null, eintrag);
    };

    // Ergebnis einer Prüfung verarbeiten (Formel oder Pivot)
    const pruefung = (ok) => {
      gestartet();
      eintrag.versuche++;
      const sekunden = Math.round((Date.now() - eintrag.geoeffnet) / 1000);
      F.track("check", { correct: ok, attempt: eintrag.versuche, seconds: sekunden }, eintrag);
      if (!ok) return;
      const neu = !ctx.erledigt(a);
      if (neu) F.track("exercise_solved", { seconds: sekunden }, eintrag);
      node.classList.add("is-geloest");
      erfolgZeigen(feedback, a, false);
      ctx.geloest(a, neu);
    };

    const teil = a.typ === "pivot" ? pivotTeil(bereich, a, feedback, pruefung, gestartet) : formelTeil(bereich, aktionen, a, feedback, pruefung, gestartet, nr);

    // Schon gelöst (Wiederkehrer): Erklärung zum Nachlesen gleich zeigen
    if (ctx.erledigt(a)) {
      node.classList.add("is-geloest");
      erfolgZeigen(feedback, a, true);
    }

    let gesehen = false;
    return {
      node,
      weiter,
      // Übung wurde aufgeklappt: Handy-Anpassungen brauchen echte Maße, Pivot lädt erst jetzt
      beimOeffnen() {
        if (teil && teil.beimOeffnen) teil.beimOeffnen();
        if (!gesehen) {
          gesehen = true;
          eintrag.geoeffnet = Date.now();
          F.track("exercise_open", null, eintrag);
        }
      },
    };
  }

  /* ---------------- Formel-Aufgabe ---------------- */

  function formelTeil(bereich, aktionen, a, feedback, pruefung, gestartet, nr) {
    const sheet = E.createSheet(a.grid);
    sheet.node.setAttribute("role", "group");
    sheet.node.setAttribute("aria-label", "Tabelle. Zellen mit den Pfeiltasten wählen, zum Bearbeiten tippen oder Enter drücken.");
    sheet.node.addEventListener("pointerdown", gestartet);
    sheet.node.addEventListener("keydown", gestartet);
    bereich.appendChild(sheet.node);

    const refs = Object.keys(sheet.inputEntries);
    const feld = istMobil() && refs.length === 1 ? formelFeld(bereich, a, sheet, refs[0], gestartet) : null;

    const pruefen = el("button", { type: "button", class: "bonus-btn", text: "Prüfen" });
    const zuruecksetzen = el("button", { type: "button", class: "bonus-btn bonus-btn--rand", text: "Zurücksetzen" });
    aktionen.append(pruefen, zuruecksetzen);

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
        // zählt nicht als Fehlversuch – es wurde ja noch nichts eingegeben
        gestartet();
        F.track("check", { correct: false, empty: true }, { a, nr });
        const meldung = "Trag zuerst eine Formel in die gelb markierte Zelle " + refs[0] + " ein.";
        fehlerZeigen(feedback, meldung);
        E.showErrorPopup(sheet.node, meldung);
        return;
      }
      const ok = richtig === refs.length;
      if (ok) {
        E.showSuccessPopup(sheet.node);
      } else {
        const meldung = refs.length === 1 ? "Das Ergebnis stimmt noch nicht." : richtig + " von " + refs.length + " Feldern stimmen.";
        E.showErrorPopup(sheet.node, meldung);
        fehlerZeigen(feedback, meldung + " Schau dir die Tipps an – oder lass dir die Lösung anzeigen.");
      }
      pruefung(ok);
    });

    let angepasst = false;
    return {
      beimOeffnen() {
        if (angepasst) return;
        angepasst = true;
        if (istMobil()) handySpalten(sheet, a.grid.cols.length);
        zielzelleZeigen(sheet.inputEntries[refs[0]].td);
      },
    };
  }

  // Handy: leere Zusatzspalten der Engine ausblenden, Datenspalten auf die Bildschirmbreite bringen
  const ZEILENKOPF_HANDY = 34;
  const SPALTE_MIN_HANDY = 64;

  function handySpalten(sheet, anzahlDaten) {
    setTimeout(() => {
      const table = sheet.node.querySelector("table.sheet");
      const scroller = sheet.node.querySelector(".sheet-scroll");
      if (!table || !scroller || !scroller.clientWidth || table.offsetWidth <= scroller.clientWidth) return;
      const cols = [...table.querySelectorAll("colgroup col")];
      const spalten = cols.slice(1, 1 + anzahlDaten);
      cols.slice(1 + anzahlDaten).forEach((c) => (c.style.visibility = "collapse"));
      cols[0].style.width = ZEILENKOPF_HANDY + "px";
      const breiten = spalten.map((c) => parseFloat(c.style.width) || 110);
      const faktor = Math.min(1, (scroller.clientWidth - ZEILENKOPF_HANDY) / breiten.reduce((x, y) => x + y, 0));
      let summe = ZEILENKOPF_HANDY;
      spalten.forEach((c, i) => {
        const w = Math.max(SPALTE_MIN_HANDY, Math.floor(breiten[i] * faktor));
        c.style.width = w + "px";
        summe += w;
      });
      table.style.minWidth = "0";
      table.style.width = summe + "px";
    }, 0);
  }

  // Tabelle seitlich so weit scrollen, dass die gelbe Zielzelle sichtbar ist (nur falls verdeckt)
  function zielzelleZeigen(td) {
    setTimeout(() => {
      const scroller = td.closest(".sheet-scroll");
      if (!scroller || scroller.scrollWidth <= scroller.clientWidth) return;
      const verdeckt = td.getBoundingClientRect().right - scroller.getBoundingClientRect().right;
      if (verdeckt > 1) scroller.scrollLeft += verdeckt + 16;
    }, 0);
  }

  // Formelfeld fürs Handy: schreibt in die Eingabezelle (entry.raw – daraus liest auch die Prüfung)
  function formelFeld(bereich, a, sheet, ref, gestartet) {
    const entry = sheet.inputEntries[ref];
    const id = "formel-" + a.id;
    const feld = el("input", {
      id, type: "text", class: "bonus-formelfeld__eingabe", placeholder: "=",
      autocomplete: "off", autocapitalize: "off", autocorrect: "off", spellcheck: "false", enterkeyhint: "done",
    });
    bereich.appendChild(el("div", { class: "bonus-formelfeld" }, [el("label", { for: id, text: "Deine Formel in " + ref }), feld]));
    feld.addEventListener("input", () => {
      gestartet();
      entry.raw = feld.value.trim();
      entry.td.classList.remove("is-correct", "is-wrong");
      ergebnisAnzeigen(a, sheet, entry);
    });
    feld.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") feld.blur();
    });
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
      const Fo = window.ExcelFloFormula;
      const ergebnis = Fo.evaluate(raw, sheet.getCellValue);
      if (Fo.isFormulaError(ergebnis)) {
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

  /* ---------------- Pivot-Aufgabe ---------------- */

  // Das iframe entsteht erst beim Aufklappen – eine gesperrte Pivot-Aufgabe lädt so gar nicht erst
  function pivotTeil(bereich, a, feedback, pruefung, gestartet) {
    let iframe = null;

    window.addEventListener("message", (ev) => {
      if (!iframe || ev.origin !== location.origin || ev.source !== iframe.contentWindow) return;
      const m = ev.data;
      if (!m || m.quelle !== "excelflo-pivot" || m.typ !== "pruefung") return;
      const ok = !!(m.daten && m.daten.richtig);
      // Die Fehlermeldung zeigt der Pivot-Nachbau selbst; hier nur der Erfolg
      if (!ok) leeren(feedback);
      pruefung(ok);
    });

    return {
      beimOeffnen() {
        if (iframe) return;
        iframe = el("iframe", { class: "bonus-pivot", src: "pivot.html?v=4", title: "Pivot-Tabelle: " + a.title });
        iframe.addEventListener("load", () => {
          try {
            const doc = iframe.contentDocument;
            // Höhe folgt dem Inhalt (gleiche Herkunft) – keine zweite Scrollleiste
            const anpassen = () => (iframe.style.height = Math.ceil(doc.body.getBoundingClientRect().height) + "px");
            // Am PC soll die ganze Übung (Text, Tabelle, Prüfen, Tipps) ohne Scrollen auf den
            // Bildschirm passen: Arbeitsblatt + Feldliste bekommen die Höhe, die übrig bleibt
            const einpassen = () => {
              const karte = iframe.closest(".frei-karte");
              const blatt = doc.querySelector(".excel-body");
              if (!karte || !blatt || window.innerWidth < 768 || !window.innerHeight) return;
              const rest = karte.getBoundingClientRect().height - iframe.getBoundingClientRect().height
                + doc.body.getBoundingClientRect().height - blatt.getBoundingClientRect().height;
              const hoehe = Math.max(380, Math.min(560, Math.floor(window.innerHeight - rest - 16)));
              doc.documentElement.style.setProperty("--blatt-hoehe", hoehe + "px");
              anpassen();
            };
            anpassen();
            einpassen();
            // Schriften und Feldliste stehen beim load noch nicht endgültig – danach nachmessen
            setTimeout(einpassen, 400);
            if (doc.fonts) doc.fonts.ready.then(einpassen);
            window.addEventListener("resize", einpassen);
            new ResizeObserver(anpassen).observe(doc.body);
            doc.addEventListener("pointerdown", gestartet);
            doc.addEventListener("keydown", gestartet);
          } catch (e) {
            // feste Höhe aus portal.css bleibt
          }
        });
        bereich.appendChild(iframe);
      },
    };
  }

  /* ---------------- Tipps (mit Lösung), Rückmeldung ---------------- */

  function tipps(eintrag) {
    const a = eintrag.a;
    const loesung = el("div", { class: "bonus-loesung", hidden: true }, [
      el("p", { class: "bonus-label", text: "Lösung" }),
      el("p", { class: a.typ === "pivot" ? "bonus-loesung__text" : "bonus-loesung__formel", text: a.solution }),
      el("p", { text: a.explanation }),
    ]);
    const knopf = el("button", { type: "button", class: "bonus-btn bonus-btn--rand bonus-btn--klein", text: "Lösung anzeigen" });
    knopf.addEventListener("click", () => {
      loesung.hidden = !loesung.hidden;
      knopf.textContent = loesung.hidden ? "Lösung anzeigen" : "Lösung ausblenden";
      if (!loesung.hidden) F.track("solution_show", null, eintrag);
    });
    const details = el("details", { class: "bonus-tipps" }, [
      el("summary", { text: "Tipps anzeigen" }),
      el("ol", {}, (a.hints || []).map((h) => el("li", { text: h }))),
      knopf,
      loesung,
    ]);
    details.addEventListener("toggle", () => {
      if (details.open) F.track("hints_open", null, eintrag);
    });
    return details;
  }

  function leeren(feedback) {
    feedback.className = "bonus-feedback";
    feedback.textContent = "";
  }

  function fehlerZeigen(feedback, meldung) {
    leeren(feedback);
    feedback.classList.add("is-error");
    feedback.appendChild(el("p", { text: meldung }));
  }

  function erfolgZeigen(feedback, a, wiederhergestellt) {
    leeren(feedback);
    feedback.classList.add("is-success");
    // Einziges Erfolgssignal der Übung: die grüne Box (kein Häkchen-Icon daneben)
    feedback.appendChild(el("div", {}, [
      el("p", { class: "bonus-feedback__titel", text: wiederhergestellt ? "Schon gelöst" : "Richtig!" }),
      el("p", { text: a.erfolgTipp || a.explanation }),
    ]));
  }

  window.ExcelFloAufgabe = { bauen };
})();
