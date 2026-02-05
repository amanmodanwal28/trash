//device.js


const express = require("express");
const app = express();

const devices = {};
const TIMEOUT = 4000; // 4 seconds

// heartbeat receive
app.get("/heartbeat", (req, res) => {
  const ip = req.query.ip;

  devices[ip] = Date.now(); // last seen update

  res.send("ok");
});

// monitor every 1 sec
setInterval(() => {
  const now = Date.now();

  console.clear();
  console.log("===== DEVICE STATUS =====");

  Object.keys(devices).forEach(ip => {
    const diff = now - devices[ip];

    if (diff <= TIMEOUT) {
      console.log(ip, "🟢 ONLINE");
    } else {
      console.log(ip, "🔴 OFFLINE");
    }
  });

}, 1000);

app.listen(3000, () => console.log("Heartbeat server started"));
