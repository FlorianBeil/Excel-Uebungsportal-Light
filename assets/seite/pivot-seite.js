/* Excel.Flo Light – Übungsseite für Pivot-Aufgaben (pivot-uebung.html?id=pivot-…)
 *
 * Aufbau wie die Formel-Übungsseite aus engine.js (gleiche CSS-Klassen): Kopf, Aufgabe,
 * Arbeitsbereich, Rückmeldung, Tipps/Lösung. Der Arbeitsbereich ist pivot.html im iframe
 * (Pivot-Nachbau, siehe skripte/pivot-uebernehmen.js) – er prüft selbst, zeigt Erfolgs-/
 * Fehler-Popup und meldet das Ergebnis per postMessage. Hier: Fortschritt speichern,
 * Erklärung + nächste Übung zeigen, Tracking (portal = 'light', wie die Formel-Übungen).
 */

(function () {
  "use strict";

  const STUFEN = { anfaenger: "Anfänger", fortgeschritten: "Fortgeschritten", profi: "Profi" };

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    for (const key in attrs || {}) {
      if (key === "class") node.className = attrs[key];
      else if (key === "text") node.textContent = attrs[key];
      else node.setAttribute(key, attrs[key]);
    }
    (children || []).forEach((c) => c && node.appendChild(c));
    return node;
  }

  function track(exerciseId, event, detail) {
    if (window.ExcelFloTracking) window.ExcelFloTracking.track("light", exerciseId, event, detail || {});
  }

  const kategorie = (c) => (c ? c.charAt(0).toUpperCase() + c.slice(1) : "");

  function start() {
    const root = document.getElementById("exercise-root");
    const id = new URLSearchParams(location.search).get("id");

    const laden = (pfad) =>
      fetch(pfad, { cache: "no-cache" }).then((res) => {
        if (!res.ok) throw new Error(pfad + " (" + res.status + ")");
        return res.json();
      });

    Promise.all([laden("daten/pivot-aufgabe.json"), laden("daten/uebersicht.json")])
      .then(([daten, uebersicht]) => {
        const aufgabe = daten.aufgaben.find((a) => a.id === id);
        if (!aufgabe) throw new Error("Übung „" + id + "“ nicht gefunden");
        aufbauen(root, aufgabe, uebersicht);
      })
      .catch((err) => {
        root.textContent = "Fehler beim Laden der Übung: " + err.message;
      });
  }

  function aufbauen(root, a, uebersicht) {
    document.title = "Excel.Flo – " + a.title;
    root.innerHTML = "";
    const stats = { openedAt: Date.now(), attempts: 0 };

    root.appendChild(
      el("div", { class: "exercise-header" }, [
        el("div", { class: "exercise-header__badges" }, [
          el("span", { class: "badge badge--level", text: STUFEN[a.level] || a.level }),
          el("span", { class: "badge badge--category", text: kategorie(a.category) }),
        ]),
        el("h1", { text: a.title }),
      ])
    );

    root.appendChild(
      el("div", { class: "exercise-task" }, [
        el("p", { class: "exercise-task__intro", text: a.task.intro }),
        el("ol", { class: "exercise-task__steps" }, a.task.steps.map((step) => el("li", { text: step }))),
      ])
    );

    const iframe = el("iframe", { class: "light-pivot", src: "pivot.html", title: "Pivot-Tabelle: " + a.title });
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
    root.appendChild(iframe);

    const feedback = el("div", { class: "exercise-feedback", id: "exercise-feedback" });
    root.appendChild(feedback);

    const solutionBox = el("div", { class: "exercise-solution", id: "exercise-solution", text: a.solution });
    const solutionBtn = el("button", { class: "btn btn--secondary", type: "button", id: "btn-solution", text: "Lösung anzeigen" });
    const details = el("details", { class: "exercise-hints" }, [
      el("summary", { text: "Tipps anzeigen" }),
      el("ol", {}, a.hints.map((hint) => el("li", { text: hint }))),
      solutionBtn,
      solutionBox,
    ]);
    root.appendChild(details);
    details.addEventListener("toggle", () => {
      if (details.open) track(a.id, "hints_open");
    });
    solutionBtn.addEventListener("click", () => {
      solutionBox.classList.toggle("is-visible");
      if (solutionBox.classList.contains("is-visible")) track(a.id, "solution_show");
    });

    window.addEventListener("message", (ev) => {
      if (ev.origin !== location.origin || ev.source !== iframe.contentWindow) return;
      const m = ev.data;
      if (!m || m.quelle !== "excelflo-pivot" || m.typ !== "pruefung") return;
      const richtig = !!(m.daten && m.daten.richtig);
      stats.attempts++;
      track(a.id, "check", {
        correct: richtig,
        attempt: stats.attempts,
        seconds: Math.round((Date.now() - stats.openedAt) / 1000),
      });
      // Fehlermeldung zeigt der Pivot-Nachbau selbst; hier nur Erfolg
      feedback.classList.remove("is-success", "is-error");
      feedback.innerHTML = "";
      if (richtig) erfolg(feedback, a, uebersicht);
    });

    track(a.id, "exercise_open");
  }

  function erfolg(feedback, a, uebersicht) {
    window.ExcelFloProgress.markCompleted(a.id);
    feedback.classList.add("is-success");
    feedback.appendChild(el("p", { text: "Richtig! 🎉" }));
    feedback.appendChild(el("p", { class: "exercise-feedback__explanation", text: a.explanation }));

    // Nächste noch offene freie Übung derselben Stufe (wie „Nächste Übung“ in engine.js)
    const freie = uebersicht.filter((ex) => ex.frei && ex.level === a.level);
    const offen = (ex) => !window.ExcelFloProgress.isCompleted(ex.id);
    const idx = freie.findIndex((ex) => ex.id === a.id);
    const next = freie.slice(idx + 1).find(offen) || freie.find(offen);

    const ziel = next
      ? el("a", { class: "btn btn--primary", href: "uebung.html?id=" + encodeURIComponent(next.id) }, [
          document.createTextNode("Nächste Übung: " + next.title + " →"),
        ])
      : el("a", { class: "btn btn--primary", href: "index.html#" + a.level }, [
          document.createTextNode("✅ Stufe „" + (STUFEN[a.level] || a.level) + "“ abgeschlossen – zur Übersicht →"),
        ]);
    feedback.appendChild(el("p", { class: "exercise-feedback__next" }, [ziel]));
  }

  document.addEventListener("DOMContentLoaded", start);
})();
