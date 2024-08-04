const fs = require("fs");
const path = require("path");

function getCurrentBranch(grootDir) {
  const headContent = fs
    .readFileSync(path.join(grootDir, "HEAD"), "utf8")
    .trim();
  if (headContent.startsWith("ref: ")) {
    const match = headContent.match(/^ref: refs\/heads\/(.+)$/);
    return match ? match[1] : "HEAD";
  }
  return "HEAD"; // We're in a detached HEAD state
}

function getBranchCommit(branch, grootDir) {
  const branchPath = path.join(grootDir, "refs", "heads", branch);
  return fs.readFileSync(branchPath, "utf8").trim();
}

function updateBranch(branchName, commitHash, grootDir) {
  const branchPath = path.join(grootDir, "refs", "heads", branchName);
  fs.writeFileSync(branchPath, commitHash);
}

module.exports = { getCurrentBranch, getBranchCommit, updateBranch };
