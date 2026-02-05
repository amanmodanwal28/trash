const os = require("os");

function getIP() {
  const iface = os.networkInterfaces()["enp2s0"];
  if (!iface) return null;

  for (const net of iface) {
    if (net.family === "IPv4" && !net.internal) {
      return net.address;
    }
  }
}

setInterval(async () => {
  const ip = getIP();
  if (!ip) return;

  try {
    await fetch(`http://192.168.10.10:3000/heartbeat?ip=${ip}`);
  } catch {}
}, 1000);
