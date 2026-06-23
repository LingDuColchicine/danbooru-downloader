import dns from "node:dns/promises";
import net from "node:net";
import tls from "node:tls";

const host = "danbooru.donmai.us";
const path = "/posts.json?tags=rating%3Asafe&limit=1";
const timeoutMs = 15000;

function withTimeout(label, promise) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);
}

async function checkDns() {
  console.log("DNS lookup");
  const records = await dns.lookup(host, { all: true });
  console.log(records);
  return records;
}

function checkTcp(address) {
  return new Promise((resolve, reject) => {
    console.log(`TCP connect ${address.address}:443 (${address.family === 6 ? "IPv6" : "IPv4"})`);
    const socket = net.createConnection({ host: address.address, port: 443, family: address.family });
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => {
      console.log("TCP connected");
      socket.destroy();
      resolve();
    });
    socket.once("timeout", () => {
      socket.destroy();
      reject(new Error("TCP timeout"));
    });
    socket.once("error", reject);
  });
}

function checkTls(address) {
  return new Promise((resolve, reject) => {
    console.log(`TLS handshake ${address.address}:443`);
    const socket = tls.connect({
      host: address.address,
      port: 443,
      family: address.family,
      servername: host,
      ALPNProtocols: ["http/1.1"],
    });
    socket.setTimeout(timeoutMs);
    socket.once("secureConnect", () => {
      console.log(`TLS connected: ${socket.getProtocol()} ${socket.getCipher().name}`);
      socket.end();
      resolve();
    });
    socket.once("timeout", () => {
      socket.destroy();
      reject(new Error("TLS timeout"));
    });
    socket.once("error", reject);
  });
}

async function checkFetch() {
  console.log("Fetch API request");
  const response = await fetch(`https://${host}${path}`, {
    headers: {
      "User-Agent": "danbooru-api-probe/0.1",
      Accept: "application/json",
    },
  });
  console.log(`HTTP ${response.status} ${response.statusText}`);
  console.log(`content-type: ${response.headers.get("content-type")}`);
  const text = await response.text();
  console.log(text.slice(0, 500));
}

try {
  const addresses = await withTimeout("DNS", checkDns());
  const ipv4 = addresses.find(address => address.family === 4) ?? addresses[0];
  await withTimeout("TCP", checkTcp(ipv4));
  await withTimeout("TLS", checkTls(ipv4));
  await withTimeout("fetch", checkFetch());
} catch (error) {
  console.error(`FAILED: ${error.stack ?? error.message}`);
  process.exit(1);
}
