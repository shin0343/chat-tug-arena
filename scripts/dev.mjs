import { spawn } from "node:child_process";
const production = process.argv.includes("--production");
const grouped = process.platform !== "win32";
const children = ["@chat-tug/web", "@chat-tug/realtime"].map((workspace) =>
  spawn("npm", ["run", production ? "start" : "dev", "-w", workspace], {
    detached: grouped,
    stdio: "inherit",
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1", ...(production ? { NODE_ENV: "production" } : {}) },
  }),
);
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    try {
      if (grouped && child.pid) process.kill(-child.pid, "SIGTERM");
      else child.kill("SIGTERM");
    } catch (error) {
      if (error.code !== "ESRCH") throw error;
    }
  }
  process.exitCode = code;
}
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => stop());
for (const child of children) {
  child.on("exit", (code) => {
    if (!stopping) stop(code ?? 1);
  });
  child.on("error", (error) => {
    console.error("Could not start local app:", error.message);
    stop(1);
  });
}
