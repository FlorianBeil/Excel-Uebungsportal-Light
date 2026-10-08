/* Excel.Flo Light – Fortschritt und Tracking
 *
 * Fortschritt: gleiche API wie progress.js im Portal (window.ExcelFloProgress), aber nur
 * im Browser gespeichert – keine Supabase-Anmeldung für Besucher der Light-Version.
 * Eigener Speicherschlüssel: alle GitHub-Pages-Seiten unter florianbeil.github.io teilen
 * sich denselben localStorage, der Fortschritt darf sich nicht mit dem Kaufportal mischen.
 *
 * Tracking: engine.js meldet Ereignisse fest als portal = 'funktionen'. Hier wird das auf
 * 'light' umgeschrieben, damit die Auswertung des Kaufportals sauber bleibt
 * (Voraussetzung: supabase/light.sql wurde ausgeführt, sonst werden Ereignisse still verworfen).
 * Muss NACH assets/geteilt/tracking.js und VOR engine.js geladen werden.
 */

(function () {
  "use strict";

  const STORAGE_KEY = "excelflo_light_progress_v1";
  let speicherErsatz = { completedExerciseIds: [], zeiten: {} }; // falls localStorage blockiert ist

  // zeiten: Übungs-ID → Millisekunden, die die Übung bis zum ersten Lösen sichtbar offen war
  // (für „Deine Zeit“ auf der Abschlussseite). Ältere Stände ohne zeiten bleiben gültig.
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { completedExerciseIds: speicherErsatz.completedExerciseIds.slice(), zeiten: Object.assign({}, speicherErsatz.zeiten) };
      const parsed = JSON.parse(raw);
      const zeiten = {};
      if (parsed.zeiten && typeof parsed.zeiten === "object") {
        Object.keys(parsed.zeiten).forEach((id) => {
          const ms = Number(parsed.zeiten[id]);
          if (isFinite(ms) && ms > 0) zeiten[id] = ms;
        });
      }
      return { completedExerciseIds: Array.isArray(parsed.completedExerciseIds) ? parsed.completedExerciseIds : [], zeiten };
    } catch (e) {
      return { completedExerciseIds: speicherErsatz.completedExerciseIds.slice(), zeiten: Object.assign({}, speicherErsatz.zeiten) };
    }
  }

  function save(state) {
    speicherErsatz = state;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      // blockiert (privates Fenster o. Ä.) – Fortschritt gilt dann nur für diesen Seitenaufruf
    }
  }

  function getCompletedIds() {
    return load().completedExerciseIds.slice();
  }

  function isCompleted(exerciseId) {
    return getCompletedIds().indexOf(exerciseId) !== -1;
  }

  function markCompleted(exerciseId) {
    const state = load();
    if (state.completedExerciseIds.indexOf(exerciseId) === -1) {
      state.completedExerciseIds.push(exerciseId);
      save(state);
    }
    return state;
  }

  function resetIds(exerciseIds) {
    const state = load();
    const removeSet = new Set(exerciseIds);
    state.completedExerciseIds = state.completedExerciseIds.filter((id) => !removeSet.has(id));
    exerciseIds.forEach((id) => delete state.zeiten[id]);
    save(state);
    return state;
  }

  // Zeit nur bis zum ersten Lösen sammeln – Wiederholen verändert „Deine Zeit“ nicht mehr
  function addTime(exerciseId, ms) {
    if (!(ms > 0)) return;
    const state = load();
    if (state.completedExerciseIds.indexOf(exerciseId) !== -1) return;
    state.zeiten[exerciseId] = (state.zeiten[exerciseId] || 0) + ms;
    save(state);
  }

  function getTimes() {
    return load().zeiten;
  }

  window.ExcelFloProgress = { isCompleted, markCompleted, getCompletedIds, resetIds, addTime, getTimes };

  if (window.ExcelFloTracking) {
    const original = window.ExcelFloTracking.track;
    window.ExcelFloTracking = {
      track: (portal, exerciseId, event, detail) => original("light", exerciseId, event, detail),
    };
  }
})();
