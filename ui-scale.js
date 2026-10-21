// Fixed App interface size with explicit options in Settings > Appearance.
// Separate from profile data: the preference is per device, including before login.
(() => {
  "use strict";
  const KEY = "food_ui_scale_v1";
  const allowed = [90, 100, 110, 120];
  const options = [...document.querySelectorAll("#uiScaleOptions .ui-scale-option")];
  const root = document.documentElement;
  function normalize(value) {
    const size = Number(value);
    return allowed.includes(size) ? size : 100;
  }
  function read() {
    try { return normalize(localStorage.getItem(KEY)); }
    catch (_) { return 100; }
  }
  function apply(size, persist) {
    const chosen = normalize(size);
    root.style.setProperty("--food-ui-scale", String(chosen / 100));
    root.style.setProperty("--food-ui-control-font", chosen === 90 ? "18px" : "16px");
    root.dataset.uiScale = String(chosen);
    for (const button of options) {
      const on = Number(button.dataset.scale) === chosen;
      button.classList.toggle("on", on);
      button.setAttribute("aria-pressed", String(on));
    }
    if (persist) {
      try { localStorage.setItem(KEY, String(chosen)); }
      catch (_) { /* display size still changes if storage is not available */ }
    }
    return chosen;
  }
  apply(read(), false);
  for (const button of options) {
    button.addEventListener("click", () => apply(Number(button.dataset.scale), true));
  }
  window.addEventListener("storage", (event) => {
    if (event.key === KEY || event.key === null) apply(read(), false);
  });

  // Disable browser pinch/page zoom. A user-selected 90–120% CSS zoom
  // remains available; operating-system accessibility overrides may apply.
  const preventGesture = (event) => {
    if (event.cancelable) event.preventDefault();
  };
  for (const name of ["gesturestart", "gesturechange"]) {
    document.addEventListener(name, preventGesture, { passive:false });
  }
  document.addEventListener("touchmove", (event) => {
    if (event.touches && event.touches.length > 1) preventGesture(event);
  }, { passive:false });
  document.addEventListener("wheel", (event) => {
    if (event.ctrlKey) preventGesture(event);
  }, { passive:false });
})();
