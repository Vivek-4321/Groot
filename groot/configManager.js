const fs = require("fs");
const path = require("path");
const os = require("os");

class ConfigManager {
  constructor() {
    this.configPath = path.join(os.homedir(), ".grootconfig");
    this.config = this.loadConfig();
  }

  loadConfig() {
    if (fs.existsSync(this.configPath)) {
      return JSON.parse(fs.readFileSync(this.configPath, "utf8"));
    }
    return {};
  }

  saveConfig() {
    fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
  }

  getUser() {
    return {
      name: this.config.user?.name,
      email: this.config.user?.email,
    };
  }

  setUser(name, email) {
    this.config.user = { name, email };
    this.saveConfig();
  }

  promptForUser() {
    const readline = require("readline").createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      readline.question("Enter your name: ", (name) => {
        readline.question("Enter your email: ", (email) => {
          readline.close();
          this.setUser(name, email);
          resolve({ name, email });
        });
      });
    });
  }
}

module.exports = new ConfigManager();
