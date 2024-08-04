const path = require("path");

function isIgnored(filePath, ignorePatterns, rootDir) {
  const relativePath = path.relative(rootDir, filePath);
  return ignorePatterns.some((pattern) => {
    if (pattern.endsWith("/")) {
      return relativePath.startsWith(pattern);
    }
    return relativePath === pattern || relativePath.startsWith(pattern + "/");
  });
}

// ANSI color codes
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const BLUE = "\x1b[34m";
const RESET = "\x1b[0m";

function colorize(text, color) {
  return `${color}${text}${RESET}`;
}

module.exports = {
  isIgnored,
  colorize,
  RED,
  GREEN,
  YELLOW,
  BLUE,
  RESET,
};
