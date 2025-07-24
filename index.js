const { spawn } = require("child_process");
const readline = require("readline");
const path = require("path");

const WEINRE_PORT = 8080;
const CLOUDFLARED_BIN = path.join(
  __dirname,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "cloudflared.cmd" : "cloudflared"
);

function startServer() {
  console.log("🚀 Starting Weinre + Cloudflared...");

  const weinreMain = require.resolve("weinre");

  const weinre = spawn(
    process.execPath, // equivalent to `node`
    [
      "--require",
      path.join(__dirname, "weinre-patch.js"),
      weinreMain,
      "--httpPort",
      WEINRE_PORT,
      "--boundHost",
      "-all-",
    ],
    {
      stdio: "inherit",
    }
  );

  weinre.on("error", (err) => {
    console.error("❌ Failed to start Weinre:", err);
  });

  weinre.on("exit", (code) => {
    console.error(`💥 Weinre exited with code ${code}. Restarting...`);
    setTimeout(startServer, 2000);
  });

  // Delay before tunnel
  setTimeout(() => {
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
      console.error(
        `💥 Cloudflared exited with code ${code}. Restarting server...`
      );
      weinre.kill();
      setTimeout(startServer, 2000);
    });
  }, 1000);
}

startServer();
