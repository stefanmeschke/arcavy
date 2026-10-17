import { start } from "./start";

const container = document.getElementById("scene");
if (!container) throw new Error("Missing #scene element");
start(container);
