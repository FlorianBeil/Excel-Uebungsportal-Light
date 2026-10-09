/* Excel.Flo Bonus-Übungen – Übersichtsseite (index.html)
 *
 * Zwei Zustände:
 *  - unterwegs:   Kopfkarte mit Fortschritt und „Weiter mit Übung N“, die freien Übungen als
 *                 nummerierte Liste (geschafft / als nächstes / offen), darunter die gesperrten
 *                 Kurs-Übungen mit Stufen-Tabs.
 *  - abgeschlossen (alle freien gelöst): „5 von 5 geschafft“ mit Zeit, Mini-Kurs-Angebot
 *                 (nur wenn in daten/konfiguration.json eingetragen), geschaffte Übungen,
 *                 eine Auswahl gesperrter Übungen mit Link zur Vollversion.
 *
 * Daten: daten/uebersicht.json (erzeugt), daten/konfiguration.json (von Hand gepflegt)
 */

(function () {
  "use strict";

  const B = window.ExcelFloBonus;
  const { el } = B;
  const STUFE = "Stufe 2"; // Stufe 1 = die kostenlose Übungsseite

  function start() {
    const root = document.getElementById("bonus-uebersicht");
    const status = document.getElementById("stufen-status");

    B.ladeUebersicht()
      .then((daten) => {
        const render = () => aufbauen(root, status, daten, render);
        render();
        B.track("overview_view", null, { abgeschlossen: !B.naechste(daten.freie) });
      })
      .catch((err) => {
        root.innerHTML = "";
        root.appendChild(el("p", { class: "bonus-fehler", text: "Übungen konnten nicht geladen werden: " + err.message }));
      });
  }

  function aufbauen(root, status, daten, render) {
    const { freie, konfig } = daten;
    const naechste = B.naechste(freie);
    root.innerHTML = "";

    status.textContent = STUFE + (naechste ? " freigeschaltet" : " abgeschlossen");

    if (naechste) {
      root.appendChild(kopfUnterwegs(freie, naechste));
      root.appendChild(el("h2", { class: "bonus-abschnitt", html: B.CHECK_SVG + "<span>Für dich freigeschaltet</span>" }));
      root.appendChild(liste(freie, naechste));
      root.appendChild(gesperrtBereich(daten, false));
    } else {
      root.appendChild(kopfFertig(freie));
      const mini = miniKursBlock(konfig.miniKurs, freie);
      if (mini) root.appendChild(mini);
      root.appendChild(el("h2", { class: "bonus-abschnitt", html: B.CHECK_SVG + "<span>Das hast du geschafft</span>" }));
      root.appendChild(chips(freie));
      root.appendChild(gesperrtBereich(daten, true));
    }

    root.appendChild(zuruecksetzen(freie, render));
  }

  /* ---------------- Kopfkarten ---------------- */

  // Der Balken startet beim zuletzt gezeigten Stand (sessionStorage) und läuft sanft zum neuen –
  // so sieht man nach dem Zurückkehren von einer gelösten Übung den Fortschritt wachsen.
  const BALKEN_KEY = "excelflo_bonus_balken";

  function balken(freie) {
    const fertig = freie.filter(B.erledigt).length;
    const ziel = (100 * fertig) / freie.length;
    let vorher = ziel;
    try {
      const gemerkt = parseFloat(sessionStorage.getItem(BALKEN_KEY));
      vorher = isFinite(gemerkt) ? gemerkt : 0;
      sessionStorage.setItem(BALKEN_KEY, String(ziel));
    } catch (e) {
      // sessionStorage blockiert – Balken steht dann ohne Animation
    }
    const fuellung = el("span", { class: "bonus-balken__fuellung", style: "width:" + vorher + "%" });
    if (vorher !== ziel) setTimeout(() => (fuellung.style.width = ziel + "%"), 60);
    return el("div", {
      class: "bonus-balken",
      role: "progressbar",
      "aria-valuemin": "0",
      "aria-valuemax": String(freie.length),
      "aria-valuenow": String(fertig),
      "aria-label": fertig + " von " + freie.length + " Übungen geschafft",
    }, [fuellung]);
  }

  function kopfUnterwegs(freie, naechste) {
    const fertig = freie.filter(B.erledigt).length;
    const nr = freie.indexOf(naechste) + 1;
    const weiter = el("a", {
      class: "bonus-btn bonus-btn--gross",
      href: B.uebungUrl(naechste),
      text: (fertig ? "Weiter mit Übung " : "Los geht’s mit Übung ") + nr + " →",
    });
    return el("section", { class: "bonus-kopfkarte" }, [
      el("div", { class: "bonus-kopfkarte__text" }, [
        el("h1", { text: "Deine " + freie.length + " Übungen in " + STUFE }),
        el("p", { text: "Löse sie der Reihe nach – von leicht bis anspruchsvoll. Nach jeder Übung geht es direkt weiter." }),
        el("div", { class: "bonus-fortschritt" }, [
          el("div", { class: "bonus-fortschritt__zeile" }, [
            el("span", { text: fertig + " von " + freie.length + " geschafft" }),
            el("span", { text: "Noch " + (freie.length - fertig) + (freie.length - fertig === 1 ? " Übung" : " Übungen") }),
          ]),
          balken(freie),
        ]),
      ]),
      weiter,
    ]);
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

  /* ---------------- Freie Übungen ---------------- */

  // „Thema:“ statt nur des Funktionsnamens – die Zeile soll das Thema nennen, nicht wie die Lösung wirken.
  // „Als nächstes ·“ steht in einem eigenen Span, damit es am Handy wegfallen kann (seite.css).
  function kopfzeile(ex, nr, extra) {
    return el("p", { class: "bonus-label" }, [
      extra ? el("span", { class: "bonus-label__extra", text: extra + " · " }) : null,
      "Übung " + nr + (ex.funktion ? " · Thema: " + ex.funktion : ""),
    ]);
  }

  function liste(freie, naechste) {
    return el("ol", { class: "bonus-liste" }, freie.map((ex, i) => {
      const nr = i + 1;
      const fertig = B.erledigt(ex);
      const istNaechste = ex === naechste;
      const kreis = el("span", { class: "bonus-nr", "aria-hidden": "true", html: fertig ? B.CHECK_SVG : String(nr) });

      const inhalt = [
        kreis,
        el("div", { class: "bonus-zeile__text" }, [
          kopfzeile(ex, nr, istNaechste ? "Als nächstes" : null),
          el("h3", { text: ex.title }),
          istNaechste && ex.kurz ? el("p", { class: "bonus-zeile__kurz", text: ex.kurz }) : null,
        ]),
      ];

      // Aktive Übung: die ganze Karte ist der Link (kein zweiter Button neben „Los geht’s“ oben)
      if (istNaechste) {
        return el("li", {}, [
          el("a", { class: "bonus-zeile is-next", href: B.uebungUrl(ex), "aria-label": "Als nächstes, Übung " + nr + " starten: " + ex.title }, inhalt),
        ]);
      }

      let aktion;
      if (fertig) {
        aktion = el("div", { class: "bonus-zeile__aktion" }, [
          el("span", { class: "bonus-geschafft", text: "Geschafft" }),
          el("a", { class: "bonus-link", href: B.uebungUrl(ex), text: "Wiederholen", "aria-label": "Übung " + nr + " wiederholen" }),
        ]);
      } else {
        aktion = el("a", {
          class: "bonus-btn bonus-btn--rand",
          href: B.uebungUrl(ex),
          text: "Übung starten",
          "aria-label": "Übung " + nr + " starten: " + ex.title,
        });
      }

      return el("li", { class: "bonus-zeile" + (fertig ? " is-done" : "") }, [...inhalt, aktion]);
    }));
  }

  function chips(freie) {
    return el("ul", { class: "bonus-chips" }, freie.map((ex, i) =>
      el("li", {}, [
        el("a", { href: B.uebungUrl(ex), title: "Wiederholen: " + ex.title, html: B.CHECK_SVG }, [
          el("span", { text: i + 1 + " · " + (ex.funktion || ex.title) }),
        ]),
      ])
    ));
  }

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
    const kachel = el("div", { class: "bonus-video" }, [
      v.poster ? el("img", { class: "bonus-video__bild", src: v.poster, alt: "" }) : null,
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

  function zuruecksetzen(freie, render) {
    if (!freie.some(B.erledigt)) return el("span");
    const btn = el("button", { type: "button", class: "bonus-zuruecksetzen", text: "↺ Fortschritt zurücksetzen" });
    btn.addEventListener("click", () => {
      if (!window.confirm("Fortschritt aller " + freie.length + " Übungen wirklich zurücksetzen? Das kann nicht rückgängig gemacht werden.")) return;
      window.ExcelFloProgress.resetIds(freie.map((ex) => ex.id));
      render();
      window.scrollTo(0, 0);
    });
    return el("p", { class: "bonus-zuruecksetzen__zeile" }, [btn]);
  }

  document.addEventListener("DOMContentLoaded", start);
})();
