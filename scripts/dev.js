const { spawn } = require("node:child_process");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

const children = [
  spawn(npm, ["run", "dev:backend"], { cwd: root, stdio: "inherit", shell: true }),
  spawn(npm, ["run", "dev:frontend"], { cwd: root, stdio: "inherit", shell: true })
];

function stop(code = 0) {
  for (const child of children) {
    if (!child.killed) child.kill();
  }
  process.exit(code);
}

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));

for (const child of children) {
  child.on("error", (error) => {
    console.error(error);
    stop(1);
  });

  child.on("exit", (code) => {
    if (code && code !== 0) stop(code);
  });
}
