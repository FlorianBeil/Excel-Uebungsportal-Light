/* Excel.Flo Light – Übersichtsseite
 *
 * Eigene Übersicht statt initOverview aus engine.js (die kennt keine gesperrten Übungen,
 * und das Kaufportal soll keinen Light-Sonderfall im Code bekommen). Aufbau und
 * CSS-Klassen entsprechen der Portal-Übersicht, dazu gesperrte Karten mit Upgrade-Link.
 *
 * Daten: daten/uebersicht.json (alle Übungen, frei: true/false – erzeugt vom Update-Skript)
 *        daten/konfiguration.json (vollversionUrl – von Hand gepflegt)
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

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    for (const key in attrs || {}) {
      if (key === "class") node.className = attrs[key];
      else if (key === "text") node.textContent = attrs[key];
      else if (key === "html") node.innerHTML = attrs[key];
      else node.setAttribute(key, attrs[key]);
    }
    (children || []).forEach((c) => c && node.appendChild(c));
    return node;
  }

  function track(event, exerciseId, detail) {
    if (window.ExcelFloTracking) window.ExcelFloTracking.track("light", exerciseId || null, event, detail || {});
  }

  const kategorie = (c) => (c ? c.charAt(0).toUpperCase() + c.slice(1) : "");
  const erledigt = (ex) => window.ExcelFloProgress.isCompleted(ex.id);

  function upgradeLink(url, text, ort, exerciseId) {
    const link = el("a", { class: "upgrade-link", href: url, target: "_blank", rel: "noopener", text: text });
    link.addEventListener("click", () => track("upgrade_click", exerciseId, { ort: ort }));
    return link;
  }

  function start() {
    const root = document.getElementById("light-list");
    const tabsRoot = document.getElementById("level-tabs");
    const resetRoot = document.getElementById("level-reset");
    const bannerRoot = document.getElementById("stage-banner");

    const laden = (pfad) =>
      fetch(pfad, { cache: "no-cache" }).then((res) => {
        if (!res.ok) throw new Error(pfad + " konnte nicht geladen werden (" + res.status + ")");
        return res.json();
      });

    Promise.all([laden("daten/uebersicht.json"), laden("daten/konfiguration.json")])
      .then(([uebungen, konfig]) => aufbauen(uebungen, konfig))
      .catch((err) => {
        root.innerHTML = "";
        root.appendChild(el("p", { class: "exercise-grid__empty", text: "Übungen konnten nicht geladen werden: " + err.message }));
      });

    function aufbauen(uebungen, konfig) {
      const url = konfig.vollversionUrl;
      const gruppen = {};
      STUFEN.forEach((s) => (gruppen[s.id] = uebungen.filter((ex) => ex.level === s.id)));
      const stufen = STUFEN.filter((s) => gruppen[s.id].length > 0);

      let aktiv = (location.hash || "").replace("#", "");
      if (!stufen.some((s) => s.id === aktiv)) aktiv = stufen[0].id;

      const freieDerStufe = () => gruppen[aktiv].filter((ex) => ex.frei);

      function renderTabs() {
        tabsRoot.innerHTML = "";
        stufen.forEach((s) => {
          const frei = gruppen[s.id].filter((ex) => ex.frei);
          const btn = el("button", { type: "button", class: "level-tab" + (s.id === aktiv ? " is-active" : "") }, [
            el("span", { text: s.label }),
            el("span", { class: "level-tab__count", text: frei.filter(erledigt).length + "/" + frei.length }),
          ]);
          btn.addEventListener("click", () => {
            aktiv = s.id;
            history.replaceState(null, "", "#" + s.id);
            render();
          });
          tabsRoot.appendChild(btn);
        });
      }

      function renderBanner() {
        bannerRoot.innerHTML = "";
        bannerRoot.classList.remove("is-visible");
        const frei = freieDerStufe();
        if (!frei.length || !frei.every(erledigt)) return;

        const label = stufen.find((s) => s.id === aktiv).label;
        const gesperrt = gruppen[aktiv].length - frei.length;
        const text =
          "✅ Alle freien Übungen der Stufe „" + label + "“ geschafft!" +
          (gesperrt > 0 ? " " + gesperrt + " weitere warten in der Vollversion. " : " ");
        bannerRoot.appendChild(el("p", {}, [document.createTextNode(text), upgradeLink(url, "Zur Vollversion →", "banner")]));
        bannerRoot.classList.add("is-visible");
      }

      function renderReset() {
        resetRoot.innerHTML = "";
        const frei = freieDerStufe();
        if (!frei.some(erledigt)) return;
        const label = stufen.find((s) => s.id === aktiv).label;
        const btn = el("button", { type: "button", class: "level-reset__btn", text: "↺ Fortschritt „" + label + "“ zurücksetzen" });
        btn.addEventListener("click", () => {
          if (!window.confirm("Fortschritt für die Stufe „" + label + "“ wirklich zurücksetzen? Das kann nicht rückgängig gemacht werden.")) return;
          window.ExcelFloProgress.resetIds(frei.map((ex) => ex.id));
          render();
        });
        resetRoot.appendChild(btn);
      }

      function karteFrei(ex) {
        const done = erledigt(ex);
        return el("a", { class: "exercise-card is-free" + (done ? " is-done" : ""), href: (ex.typ === "pivot" ? "pivot-uebung.html" : "uebung.html") + "?id=" + encodeURIComponent(ex.id) }, [
          el("div", { class: "exercise-card__badges" }, [
            el("span", { class: "badge badge--free", text: "Kostenlos" }),
            el("span", { class: "badge badge--category", text: kategorie(ex.category) }),
            done ? el("span", { class: "badge badge--done", text: "✓ erledigt" }) : null,
          ]),
          el("h3", { text: ex.title }),
          el("p", { text: ex.description || "" }),
          el("span", { class: "exercise-card__cta exercise-card__cta--button", text: done ? "Nochmal üben →" : "Übung starten →" }),
        ]);
      }

      function karteGesperrt(ex) {
        return el("div", { class: "exercise-card is-locked", "aria-disabled": "true" }, [
          el("div", { class: "exercise-card__badges" }, [
            el("span", { class: "badge badge--category", text: kategorie(ex.category) }),
            el("span", { class: "badge badge--locked", html: LOCK_SVG + "<span>In der Vollversion</span>" }),
          ]),
          el("h3", { text: ex.title }),
          el("p", { text: ex.description || "" }),
          upgradeLink(url, "Vollversion freischalten →", "karte", ex.id),
        ]);
      }

      function render() {
        renderTabs();
        root.innerHTML = "";
        const frei = gruppen[aktiv].filter((ex) => ex.frei);
        const gesperrt = gruppen[aktiv].filter((ex) => !ex.frei);
        if (frei.length) {
          root.appendChild(el("h2", { class: "light-trenner light-trenner--frei", text: "✓ Für dich freigeschaltet" }));
          frei.forEach((ex) => root.appendChild(karteFrei(ex)));
        }
        if (gesperrt.length) {
          root.appendChild(
            el("h2", { class: "light-trenner light-trenner--gesperrt" }, [
              el("span", { html: LOCK_SVG }),
              document.createTextNode(" In der Vollversion · " + gesperrt.length + " weitere Übungen"),
            ])
          );
          gesperrt.forEach((ex) => root.appendChild(karteGesperrt(ex)));
        }
        renderBanner();
        renderReset();
      }

      window.addEventListener("hashchange", () => {
        const h = (location.hash || "").replace("#", "");
        if (stufen.some((s) => s.id === h) && h !== aktiv) {
          aktiv = h;
          render();
        }
      });

      render();
      track("overview_view");
    }
  }

  document.addEventListener("DOMContentLoaded", start);
})();
