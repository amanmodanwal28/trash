// DeviceSSHManager.js

const SftpClient = require('ssh2-sftp-client');
const { Client: SSH } = require('ssh2');
const fs = require('fs');

class DeviceSSHManager {
  constructor(host) {
    this.config = {
      host,
      port: 22,
      username: 'ptcs',
      password: 'Ptcs@!1357',
      readyTimeout: 5000
    };

    this.sftp = new SftpClient();
    this.ssh = new SSH();
    this.connected = false;
  }

  // =========================
  // CONNECT
  // =========================
  async connect() {
    if (this.connected) return;

    await this.sftp.connect(this.config);

    await new Promise((res, rej) => {
      this.ssh
        .on('ready', res)
        .on('error', rej)
        .connect(this.config);
    });

    this.connected = true;
    console.log(`✅ Connected ${this.config.host}`);
  }

  // =========================
  // RECONNECT AUTO
  // =========================
  async reconnect() {
    console.log("⚠ Reconnecting...");
    await this.close();
    await this.connect();
  }

  // =========================
  // FILE EXIST CHECK
  // =========================
  async fileExists(remotePath) {
    try {
      const exists = await this.sftp.exists(remotePath);
      return !!exists;
    } catch {
      return false;
    }
  }

  // =========================
  // UPLOAD WITH RESUME
  // =========================
  async uploadFile(localPath, remotePath) {
    await this._retry(async () => {
      let remoteSize = 0;

      try {
        const stat = await this.sftp.stat(remotePath);
        remoteSize = stat.size;
      } catch {}

      const read = fs.createReadStream(localPath, { start: remoteSize });
      const write = await this.sftp.createWriteStream(remotePath, {
        flags: 'a'
      });

      await new Promise((res, rej) =>
        read.pipe(write).on('finish', res).on('error', rej)
      );

      console.log(`📤 Uploaded ${remotePath}`);
    });
  }

  // =========================
  // RUN COMMAND
  // =========================
  async exec(cmd) {
    return this._retry(() =>
      new Promise((res, rej) => {
        this.ssh.exec(cmd, (err, stream) => {
          if (err) return rej(err);

          let output = '';

          stream
            .on('data', d => (output += d))
            .on('close', () => res(output));
        });
      })
    );
  }

  // =========================
  // GENERIC RETRY LOGIC
  // =========================
  async _retry(fn, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (e) {
        console.log("Retrying...");
        await this.reconnect();
      }
    }
    throw new Error("Operation failed after retries");
  }

  // =========================
  // CLOSE
  // =========================
  async close() {
    this.connected = false;
    await this.sftp.end().catch(() => {});
    this.ssh.end();
  }
}

module.exports = DeviceSSHManager;
