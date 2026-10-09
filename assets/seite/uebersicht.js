/* Excel.Flo Bonus-Übungen – Übersicht (index.html), aufgebaut wie die kostenlose Übungsseite
 *
 * Unterwegs: Kopfkarte (Überschrift, Einleitung, „1 von 5 geschafft“ + Balken, kein Button),
 * darunter die Übungen als Liste – die aktuelle ist sofort aufgeklappt (Inhalt aus aufgabe.js):
 *  - gelöst:      schmale Zeile „✓ Gelöst“, per Klick aufklappbar (Erklärung „Schon gelöst“)
 *  - freigeschaltet, noch offen: aufgeklappt (bzw. per Klick aufklappbar)
 *  - gesperrt:    ausgegraute Zeile mit Schloss – der Reihe nach: Übung 2 erst nach Übung 1 usw.
 * Es ist immer genau eine Übung offen; die Zeile gibt es nur im zugeklappten Zustand.
 * Darunter die gesperrten Kurs-Übungen mit Stufen-Tabs.
 *
 * Abgeschlossen (alle gelöst): „5 von 5 geschafft“ mit Zeit, Mini-Kurs-Angebot (nur wenn in
 * daten/konfiguration.json eingetragen), die gelösten Übungen als Zeilen zum Nachlesen,
 * eine Auswahl gesperrter Übungen mit Link zur Vollversion.
 *
 * Daten: daten/uebersicht.json (erzeugt), daten/uebungen/<id>.json bzw. daten/pivot-aufgabe.json,
 *        daten/konfiguration.json (von Hand gepflegt)
 */

(function () {
  "use strict";

  const B = window.ExcelFloBonus;
  const { el } = B;
  const STUFE = "Stufe 2"; // Stufe 1 = die kostenlose Übungsseite
  const reduzierteBewegung = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SCHLOSS_SVG = B.LOCK_SVG;

  let daten = null; // { alle, freie, gesperrte, konfig }
  let aufgaben = []; // volle Übungsdaten der freien Übungen, gleiche Reihenfolge wie daten.freie
  let fokusIdx = null; // die eine aufgeklappte Übung
  let karten = [];
  let balkenEl = null;
  let root = null;

  const erledigt = (i) => window.ExcelFloProgress.isCompleted(daten.freie[i].id);
  // Der Reihe nach: Übung 1 immer, jede weitere, sobald die vorherige gelöst ist
  const freigeschaltet = (i) => i === 0 || erledigt(i - 1) || erledigt(i);
  const ersteOffene = () => {
    const i = daten.freie.findIndex((_, j) => !erledigt(j));
    return i === -1 ? null : i;
  };

  function start() {
    root = document.getElementById("bonus-uebersicht");
    B.ladeUebersicht()
      .then((d) => {
        daten = d;
        let pivot = null;
        return Promise.all(daten.freie.map((ex) =>
          ex.typ === "pivot"
            ? (pivot || (pivot = B.laden("daten/pivot-aufgabe.json"))).then((p) => p.aufgaben.find((a) => a.id === ex.id))
            : B.laden("daten/uebungen/" + encodeURIComponent(ex.id) + ".json")
        ));
      })
      .then((liste) => {
        // Kurzdaten der Übersicht (funktion, kurz, typ …) ergänzen die Übungsdateien
        aufgaben = liste.map((a, i) => Object.assign({}, daten.freie[i], a));
        aufbauen();
        B.track("overview_view", null, { abgeschlossen: ersteOffene() === null });
      })
      .catch((err) => {
        root.innerHTML = "";
        root.appendChild(el("p", { class: "bonus-fehler", text: "Übungen konnten nicht geladen werden: " + err.message }));
      });
  }

  function aufbauen() {
    const { freie } = daten;
    const fertig = ersteOffene() === null;
    root.innerHTML = "";
    karten = [];
    balkenEl = null;
    fokusIdx = ersteOffene();
    document.getElementById("stufen-status").textContent = STUFE + (fertig ? " abgeschlossen" : " freigeschaltet");

    const liste = el("ol", { class: "frei-liste" }, aufgaben.map((a, i) => karteBauen(a, i)));
    if (!fertig) {
      root.appendChild(kopfUnterwegs());
      root.appendChild(el("h2", { class: "bonus-abschnitt", text: "Deine Übungen" }));
      root.appendChild(liste);
      root.appendChild(gesperrtBereich(daten, false));
    } else {
      root.appendChild(kopfFertig(freie));
      const mini = miniKursBlock(daten.konfig.miniKurs, freie);
      if (mini) root.appendChild(mini);
      root.appendChild(el("h2", { class: "bonus-abschnitt", text: "Das hast du geschafft" }));
      root.appendChild(liste);
      root.appendChild(gesperrtBereich(daten, true));
    }
    root.appendChild(zuruecksetzen());
    aktualisieren();

    // Wiederkehrer landen direkt bei der offenen Übung
    if (!fertig && freie.some((_, i) => erledigt(i)) && fokusIdx !== null) {
      setTimeout(() => karten[fokusIdx].li.scrollIntoView({ block: "start" }), 50);
    }
  }

  /* ---------------- Eine Übung in der Liste ---------------- */

  function karteBauen(a, i) {
    const nr = i + 1;
    const aufgabe = window.ExcelFloAufgabe.bauen(a, nr, {
      erledigt: (x) => window.ExcelFloProgress.isCompleted(x.id),
      geloest: (x, neu) => {
        if (neu) {
          zeit.geloest(i); // vor markCompleted – danach nimmt addTime nichts mehr an
          window.ExcelFloProgress.markCompleted(x.id);
        }
        aktualisieren();
      },
    });

    const kreis = el("span", { class: "bonus-nr", "aria-hidden": "true" });
    const status = el("span", { class: "frei-zeile__status" });
    const zeile = el("button", { type: "button", class: "frei-zeile", "aria-controls": "uebung-" + nr + "-inhalt" }, [
      kreis,
      el("span", { class: "frei-zeile__titel" }, [el("span", { class: "frei-zeile__nr", text: "Übung " + nr + " · " }), a.title]),
      status,
    ]);
    aufgabe.node.id = "uebung-" + nr + "-inhalt";
    const li = el("li", { class: "frei-karte", id: "uebung-" + nr, tabindex: "-1", "aria-labelledby": "uebung-" + nr + "-titel" }, [zeile, aufgabe.node]);

    // Immer genau eine Übung offen: Klick auf eine Zeile öffnet sie, die bisher offene klappt zu
    zeile.addEventListener("click", () => {
      if (zeile.disabled) return;
      fokusIdx = i;
      aktualisieren();
    });

    karten[i] = { a, li, zeile, kreis, status, aufgabe };
    return li;
  }

  /* ---------------- Anzeige an den Stand anpassen ---------------- */

  function aktualisieren() {
    karten.forEach((k, i) => {
      const geloest = erledigt(i);
      const frei = freigeschaltet(i);
      const offen = frei && i === fokusIdx;

      k.li.classList.toggle("is-offen", offen);
      k.li.classList.toggle("is-aktiv", offen);
      k.li.classList.toggle("is-erledigt", geloest);
      k.li.classList.toggle("is-gesperrt", !frei);
      k.aufgabe.node.hidden = !offen;
      // Die Zeile gibt es nur zugeklappt – aufgeklappt beginnt die Übung direkt mit „ÜBUNG X · THEMA“
      k.zeile.hidden = offen;
      k.zeile.disabled = !frei;
      k.zeile.setAttribute("aria-expanded", offen ? "true" : "false");
      k.kreis.innerHTML = geloest ? B.CHECK_SVG : String(i + 1);

      k.status.textContent = "";
      if (geloest) k.status.append("✓ Gelöst");
      else if (!frei) k.status.insertAdjacentHTML("beforeend", SCHLOSS_SVG);

      if (offen) k.aufgabe.beimOeffnen();
      weiterBereich(k, i, geloest);
    });
    if (balkenEl) kopfFortschritt();
    zeit.fokus(fokusIdx);
  }

  // Nach dem Lösen: „Weiter zu Übung X →“ zur ersten noch offenen Übung (beim Nachlesen einer
  // früheren also zurück dorthin). Ist alles gelöst: „Zum Abschluss →“.
  function weiterBereich(k, i, geloest) {
    const w = k.aufgabe.weiter;
    w.textContent = "";
    if (!geloest) return;
    const offen = ersteOffene();
    if (offen === i) return;
    if (offen === null) {
      if (karten.length && root.querySelector(".bonus-kopfkarte--fertig")) return; // Abschluss steht schon
      const knopf = el("button", { type: "button", class: "bonus-btn bonus-btn--gross bonus-btn--voll", text: "Zum Abschluss →" });
      knopf.addEventListener("click", () => {
        aufbauen();
        window.scrollTo({ top: 0, behavior: reduzierteBewegung ? "auto" : "smooth" });
      });
      w.appendChild(knopf);
      return;
    }
    const knopf = el("button", { type: "button", class: "bonus-btn bonus-btn--gross bonus-btn--voll", text: "Weiter zu Übung " + (offen + 1) + " →" });
    knopf.addEventListener("click", () => {
      fokusIdx = offen;
      aktualisieren();
      springeZu(karten[offen].li);
    });
    w.appendChild(knopf);
  }

  function springeZu(ziel) {
    ziel.scrollIntoView({ behavior: reduzierteBewegung ? "auto" : "smooth", block: "start" });
    ziel.focus({ preventScroll: true });
    // Absicherung: Bricht das sanfte Scrollen ab (Seitenhöhe ändert sich gerade durch das
    // Zuklappen, oder der Browser kann es nicht), direkt hinspringen
    setTimeout(() => {
      if (Math.abs(ziel.getBoundingClientRect().top) > 40) ziel.scrollIntoView({ block: "start" });
    }, 900);
  }

  /* ---------------- Kopfkarte ---------------- */

  // Der Balken startet beim zuletzt gezeigten Stand (sessionStorage) und läuft sanft zum neuen
  const BALKEN_KEY = "excelflo_bonus_balken";

  function kopfUnterwegs() {
    let vorher = 0;
    try {
      const gemerkt = parseFloat(sessionStorage.getItem(BALKEN_KEY));
      if (isFinite(gemerkt)) vorher = gemerkt;
    } catch (e) { /* ohne Animation */ }
    balkenEl = el("div", { class: "bonus-balken", role: "progressbar", "aria-valuemin": "0" }, [
      el("span", { class: "bonus-balken__fuellung", style: "width:" + vorher + "%" }),
    ]);
    const karte = el("section", { class: "bonus-kopfkarte frei-kopf" }, [
      el("div", { class: "bonus-kopfkarte__text" }, [
        el("h1", { text: "Deine " + daten.freie.length + " Übungen in " + STUFE }),
        el("p", { text: "Löse sie der Reihe nach – von leicht bis anspruchsvoll. Nach jeder Übung geht es direkt weiter." }),
        el("div", { class: "frei-kopf__fortschritt" }, [
          el("div", { class: "bonus-fortschritt" }, [el("div", { class: "bonus-fortschritt__zeile" }), balkenEl]),
        ]),
      ]),
    ]);
    setTimeout(kopfFortschritt, 0);
    return karte;
  }

  function kopfFortschritt() {
    const gesamt = daten.freie.length;
    const fertig = daten.freie.filter((_, i) => erledigt(i)).length;
    const ziel = (100 * fertig) / gesamt;
    const text = fertig + " von " + gesamt + " geschafft";
    balkenEl.parentNode.querySelector(".bonus-fortschritt__zeile").replaceChildren(el("span", { text }));
    balkenEl.setAttribute("aria-valuemax", String(gesamt));
    balkenEl.setAttribute("aria-valuenow", String(fertig));
    balkenEl.setAttribute("aria-label", text);
    setTimeout(() => (balkenEl.firstChild.style.width = ziel + "%"), 60);
    try {
      sessionStorage.setItem(BALKEN_KEY, String(ziel));
    } catch (e) { /* egal */ }
  }

  function kopfFertig(freie) {
    const zeit = B.gesamtZeit(freie);
    const erste = freie[0].funktion || freie[0].title;
    const letzte = freie[freie.length - 1].funktion || freie[freie.length - 1].title;
    return el("section", { class: "bonus-kopfkarte bonus-kopfkarte--fertig" }, [
      el("div", { class: "bonus-kopfkarte__text" }, [
        el("h1", { text: freie.length + " von " + freie.length + " geschafft" }),
        el("p", { text: "Du hast alle Übungen aus " + STUFE + " gelöst, von " + erste + " bis zur " + letzte + "." }),
        el("div", { class: "bonus-segmente bonus-segmente--fertig", "aria-hidden": "true" }, freie.map(() => el("span"))),
      ]),
      zeit
        ? el("div", { class: "bonus-zeit" }, [
            el("p", { class: "bonus-label", text: "Deine Zeit" }),
            el("p", { class: "bonus-zeit__wert", text: B.formatZeit(zeit) + " Min." }),
            el("p", { class: "bonus-zeit__unter", text: "für alle " + freie.length + " Übungen" }),
          ])
        : null,
    ]);
  }

  /* ---------------- Zeitmessung („Deine Zeit“ im Abschluss) ---------------- */

  // Gezählt wird die sichtbare Zeit, in der eine noch nicht gelöste Übung die offene ist
  const zeit = (function () {
    let idx = null;
    let seit = null;
    const laeuft = () => idx !== null && !erledigt(idx);
    const sichern = () => {
      if (idx !== null && seit !== null) window.ExcelFloProgress.addTime(daten.freie[idx].id, Date.now() - seit);
      seit = null;
    };
    const starten = () => {
      seit = laeuft() && document.visibilityState === "visible" ? Date.now() : null;
    };
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") starten();
      else sichern();
    });
    window.addEventListener("pagehide", sichern);
    return {
      fokus(neu) {
        if (neu === idx) {
          if (seit === null) starten();
          return;
        }
        sichern();
        idx = neu;
        starten();
      },
      geloest(i) {
        if (i === idx) sichern();
      },
    };
  })();

  /* ---------------- Mini-Kurs (nur Abschluss, nur wenn eingetragen) ---------------- */

  // Icons der Merkmal-Chips (Schlüssel in konfiguration.json → miniKurs.merkmale[].icon)
  const ICONS = {
    play: '<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M7 4.5v15l12-7.5z"/></svg>',
    lupe: '<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/></svg>',
    haken: '<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  };
  const UHR_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
  const PLAY_GROSS = '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M8 5v14l11-7z"/></svg>';

  function miniKursBlock(m, freie) {
    if (!m || !/^https:\/\//.test(m.url || "")) return null;
    const link = el("a", { class: "bonus-btn bonus-btn--hell bonus-angebot__btn", href: m.url, target: "_blank", rel: "noopener" }, [
      m.button + (m.preis ? " · " + m.preis : "") + " →",
    ]);
    link.addEventListener("click", () => B.track("mini_kurs_click", null, { ort: "abschluss" }));

    // „Du hast 4:12 Min. gebraucht“ – nur mit gemessener Zeit, sonst der Satz ohne Zeit
    const zeit = B.gesamtZeit(freie);
    const zeitZeile = m.zeitText
      ? el("p", { class: "bonus-angebot__zeit", html: UHR_SVG }, [
          el("span", {}, zeit
            ? textMitZeit(m.zeitText, B.formatZeit(zeit) + " Min.")
            : [m.zeitTextOhneZeit || ""]),
        ])
      : null;

    const tasten = m.tasten && m.tasten.length
      ? el("p", { class: "bonus-angebot__tasten" }, [
          ...m.tasten.flatMap((t, i) => [i ? el("span", { class: "bonus-angebot__plus", text: "+", "aria-hidden": "true" }) : null, el("kbd", { text: t })]),
          m.tastenText ? el("span", { class: "bonus-angebot__tastentext", text: m.tastenText }) : null,
        ])
      : null;

    return el("section", { class: "bonus-angebot" + (videoUrl(m.video) ? " bonus-angebot--video" : "") }, [
      videoKachel(m.video),
      el("div", { class: "bonus-angebot__inhalt" }, [
        el("p", { class: "bonus-angebot__marke", text: m.etikett || "Dein nächster Schritt" }),
        el("h2", { text: m.titel }),
        zeitZeile,
        m.text ? el("p", { class: "bonus-angebot__text", text: m.text }) : null,
        m.merkmale && m.merkmale.length
          ? el("ul", { class: "bonus-angebot__merkmale" }, m.merkmale.map((x) => el("li", { html: ICONS[x.icon] || "" }, [el("span", { text: x.text })])))
          : null,
        tasten,
        el("div", { class: "bonus-angebot__aktion" }, [link, m.hinweis ? el("p", { text: m.hinweis }) : null]),
      ]),
    ]);
  }

  // {zeit} im Text fett einsetzen
  function textMitZeit(vorlage, zeit) {
    const teile = vorlage.split("{zeit}");
    return teile.flatMap((t, i) => (i ? [el("strong", { text: zeit }), t] : [t]));
  }

  function videoUrl(v) {
    // https-Link (YouTube, Vimeo, MP4 woanders) oder eigene Videodatei im Repo (z. B. assets/video/fall.mp4)
    return v && (/^https:\/\//.test(v.url || "") || /^[\w\/.-]+\.(mp4|webm)$/i.test(v.url || "")) ? v.url : null;
  }

  // Videokachel: MP4 spielt direkt in der Kachel; YouTube/Vimeo wird erst nach dem Klick geladen
  // (vorher keine Verbindung zu Google/Vimeo – Datenschutz)
  function videoKachel(v) {
    const url = videoUrl(v);
    if (!url) return null;
    const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
    const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    const knopf = el("button", { type: "button", class: "bonus-video__play", "aria-label": "Video abspielen: " + (v.titel || "Trailer"), html: PLAY_GROSS });
    // YouTube-Shorts sind Hochformat → Kachel beim Abspielen 9:16 statt schwarzer Balken
    const kachel = el("div", { class: "bonus-video" + (/\/shorts\//.test(url) ? " bonus-video--hochkant" : "") }, [
      v.poster ? el("img", { class: "bonus-video__bild" + (v.posterFreigestellt ? " bonus-video__bild--person" : ""), src: v.poster, alt: "" }) : null,
      knopf,
      el("div", { class: "bonus-video__text" }, [
        v.label ? el("p", { class: "bonus-video__label", text: v.label }) : null,
        v.titel ? el("p", { class: "bonus-video__titel", text: v.titel }) : null,
      ]),
    ]);
    knopf.addEventListener("click", () => {
      B.track("mini_kurs_video", null, {});
      let player;
      if (yt) player = el("iframe", { src: "https://www.youtube-nocookie.com/embed/" + yt[1] + "?autoplay=1&rel=0", allow: "autoplay; encrypted-media; fullscreen", allowfullscreen: true, title: v.titel || "Video" });
      else if (vimeo) player = el("iframe", { src: "https://player.vimeo.com/video/" + vimeo[1] + "?autoplay=1&dnt=1", allow: "autoplay; fullscreen", allowfullscreen: true, title: v.titel || "Video" });
      else player = el("video", { src: url, controls: true, autoplay: true, playsinline: true, poster: v.poster || null });
      kachel.innerHTML = "";
      kachel.classList.add("is-playing");
      kachel.appendChild(player);
    });
    return kachel;
  }

  /* ---------------- Gesperrte Kurs-Übungen ---------------- */

  function gesperrtBereich(daten, fertig) {
    const { gesperrte, konfig } = daten;
    const url = konfig.vollversionUrl;
    const stufen = B.STUFEN.filter((s) => gesperrte.some((ex) => ex.level === s.id));
    const grid = el("div", { class: "bonus-gesperrt__grid" });
    const kopf = el("div", { class: "bonus-gesperrt__kopf" }, [
      el("div", {}, [
        el("h2", { class: "bonus-abschnitt bonus-abschnitt--grau", html: B.LOCK_SVG + "<span>In der Vollversion · " + gesperrte.length + " weitere Übungen</span>" }),
        el("p", { text: fertig ? [konfig.vollversionText, konfig.webinarHinweis].filter(Boolean).join(" ") : konfig.vollversionText }),
      ]),
    ]);

    if (fertig) {
      // Kleine Auswahl statt aller Karten (konfiguration.json → abschlussKarten);
      // ohne Liste je Stufe die ersten zwei
      kopf.appendChild(B.upgradeLink(url, konfig.vollversionButton, "abschluss", "bonus-btn bonus-btn--rand"));
      const auswahl = (konfig.abschlussKarten || []).map((id) => gesperrte.find((ex) => ex.id === id)).filter(Boolean);
      (auswahl.length ? auswahl : [].concat(...stufen.map((s) => gesperrte.filter((ex) => ex.level === s.id).slice(0, 2))))
        .forEach((ex) => grid.appendChild(karte(ex, url)));
    } else {
      let aktiv = stufen.some((s) => s.id === location.hash.slice(1)) ? location.hash.slice(1) : stufen[0].id;
      const tabs = el("div", { class: "bonus-tabs", role: "tablist", "aria-label": "Stufe der Vollversion" });
      const zeigen = () => {
        tabs.querySelectorAll("button").forEach((b) => {
          const an = b.dataset.stufe === aktiv;
          b.classList.toggle("is-active", an);
          b.setAttribute("aria-selected", an ? "true" : "false");
        });
        grid.innerHTML = "";
        gesperrte.filter((ex) => ex.level === aktiv).forEach((ex) => grid.appendChild(karte(ex, url)));
      };
      stufen.forEach((s) => {
        const b = el("button", { type: "button", role: "tab", class: "bonus-tab", "data-stufe": s.id, text: s.label });
        b.addEventListener("click", () => {
          aktiv = s.id;
          history.replaceState(null, "", "#" + s.id);
          zeigen();
        });
        tabs.appendChild(b);
      });
      kopf.appendChild(tabs);
      zeigen();
    }

    return el("section", { class: "bonus-gesperrt" }, [kopf, grid]);
  }

  function karte(ex, url) {
    return el("article", { class: "bonus-karte" }, [
      el("div", { class: "bonus-karte__badges" }, [
        el("span", { class: "bonus-badge", text: B.kategorie(ex.category) }),
        el("span", { class: "bonus-badge", html: B.LOCK_SVG + "<span>In der Vollversion</span>" }),
      ]),
      el("h3", { text: ex.title }),
      el("p", { text: ex.description || "" }),
      B.upgradeLink(url, "Vollversion freischalten", "karte", "bonus-btn bonus-btn--rand bonus-btn--klein", ex.id),
    ]);
  }

  /* ---------------- Fortschritt zurücksetzen ---------------- */

  function zuruecksetzen() {
    const freie = daten.freie;
    if (!freie.some(B.erledigt)) return el("span");
    const btn = el("button", { type: "button", class: "bonus-zuruecksetzen", text: "↺ Fortschritt zurücksetzen" });
    btn.addEventListener("click", () => {
      if (!window.confirm("Fortschritt aller " + freie.length + " Übungen wirklich zurücksetzen? Das kann nicht rückgängig gemacht werden.")) return;
      window.ExcelFloProgress.resetIds(freie.map((ex) => ex.id));
      location.reload();
    });
    return el("p", { class: "bonus-zuruecksetzen__zeile" }, [btn]);
  }

  document.addEventListener("DOMContentLoaded", start);
})();
