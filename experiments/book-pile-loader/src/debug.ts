/** Dev-only controls: pause/play, scrub the timeline, change speed. */
export interface DebugControls {
  paused: boolean;
  speed: number;
  sync(time: number): void;
}

export function createDebugControls(total: number, onScrub: (time: number) => void): DebugControls {
  const panel = document.createElement("div");
  panel.style.cssText =
    "position:fixed;left:12px;bottom:12px;display:flex;gap:8px;align-items:center;" +
    "padding:6px 10px;border-radius:8px;background:#0000000d;font:12px system-ui,sans-serif;color:#333";

  const button = document.createElement("button");
  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = "0";
  slider.max = String(total);
  slider.step = "0.01";
  slider.style.width = "240px";
  const readout = document.createElement("span");
  readout.style.cssText = "min-width:5.5em;font-variant-numeric:tabular-nums";
  const speed = document.createElement("select");
  for (const s of [0.1, 0.25, 0.5, 1, 2]) {
    speed.add(new Option(`${s}×`, String(s), false, s === 1));
  }

  const controls: DebugControls = {
    paused: false,
    speed: 1,
    sync(time) {
      slider.value = String(time);
      readout.textContent = `${time.toFixed(2)} / ${total.toFixed(2)}s`;
    },
  };
  const label = () => (button.textContent = controls.paused ? "Play" : "Pause");
  label();

  button.addEventListener("click", () => {
    controls.paused = !controls.paused;
    label();
  });
  slider.addEventListener("input", () => {
    controls.paused = true;
    label();
    controls.sync(Number(slider.value));
    onScrub(Number(slider.value));
  });
  speed.addEventListener("change", () => (controls.speed = Number(speed.value)));

  panel.append(button, slider, readout, speed);
  document.body.append(panel);
  return controls;
}
