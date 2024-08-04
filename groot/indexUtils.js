const fs = require("fs");

function loadIndex(indexPath) {
  if (fs.existsSync(indexPath)) {
    const indexData = JSON.parse(fs.readFileSync(indexPath, "utf8"));
    return new Map(indexData);
  }
  return new Map();
}

function saveIndex(index, indexPath) {
  const indexData = JSON.stringify(Array.from(index.entries()));
  fs.writeFileSync(indexPath, indexData);
}

module.exports = { loadIndex, saveIndex };
