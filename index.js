const { spawn } = require("child_process");
const readline = require("readline");
const path = require("path");

const WEINRE_PORT = 8080;

// Use local cloudflared binary
const CLOUDFLARED_BIN = path.join(
  __dirname,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "cloudflared.cmd" : "cloudflared"
);

(async () => {
  // Start Weinre
  const weinre = spawn(
    "weinre",
    ["--httpPort", WEINRE_PORT, "--boundHost", "-all-"],
    {
      stdio: "inherit",
    }
  );

  weinre.on("error", (err) => {
    console.error("❌ Failed to start Weinre:", err);
  });

  weinre.on("exit", (code) => {
    console.log(`ℹ️ Weinre exited with code ${code}`);
  });

  // Wait a bit before starting tunnel
  await new Promise((r) => setTimeout(r, 1000));

  // Start cloudflared tunnel
  const cloudflared = spawn(CLOUDFLARED_BIN, [
    "tunnel",
    "--url",
    `http://localhost:${WEINRE_PORT}`,
  ]);

  const rl = readline.createInterface({ input: cloudflared.stdout });

  rl.on("line", (line) => {
    const match = line.match(/https:\/\/.*\.trycloudflare\.com/);
    if (match) {
      const url = match[0];
      console.log(
        "\n✅ Weinre server is running and exposed via Cloudflare Tunnel:"
      );
      console.log(`🔍 Debug client: ${url}/client`);
      console.log(
        `📦 Target script: <script src="${url}/target/target-script-min.js#anonymous"></script>\n`
      );
    }
  });

  cloudflared.stderr.on("data", (data) => {
    console.error(`❌ cloudflared error: ${data}`);
  });

  cloudflared.on("exit", (code) => {
    console.log(`ℹ️ Cloudflared tunnel exited with code ${code}`);
  });
})();
