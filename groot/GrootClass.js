const fs = require("fs");
const path = require("path");
const {
  hashObject,
  readObject,
  createCommit,
  writeTree,
} = require("./objectUtils");
const { loadIndex, saveIndex } = require("./indexUtils");
const { isIgnored, colorize, RED, GREEN, YELLOW, BLUE, RESET } = require("./utils");
const { getCurrentBranch, getBranchCommit, updateBranch } = require("./branchUtils");
const configManager = require("./configManager");
const { showLineDiff } = require("./diffUtils");

class Groot {
  constructor() {
    this.rootDir = process.cwd();
    this.grootDir = path.join(this.rootDir, ".groot");
    this.indexPath = path.join(this.grootDir, "index");
    this.index = loadIndex(this.indexPath);
    this.ignorePatterns = [];
    this.loadIgnoreFile();
  }

  init() {
    if (fs.existsSync(this.grootDir)) {
      console.log("Groot repository already exists");
      return;
    }

    fs.mkdirSync(this.grootDir);
    fs.mkdirSync(path.join(this.grootDir, "objects"));
    fs.mkdirSync(path.join(this.grootDir, "refs"));
    fs.mkdirSync(path.join(this.grootDir, "refs", "heads"));

    fs.writeFileSync(
      path.join(this.grootDir, "HEAD"),
      "ref: refs/heads/master\n"
    );
    fs.writeFileSync(
      path.join(this.grootDir, "config"),
      "[core]\n\trepositoryformatversion = 0\n\tfilemode = false\n\tbare = false\n"
    );

    console.log(`Initialized empty Groot repository in ${this.rootDir}`);
  }

  loadIgnoreFile() {
    const ignorePath = path.join(this.rootDir, ".grootignore");
    if (fs.existsSync(ignorePath)) {
      const content = fs.readFileSync(ignorePath, "utf8");
      this.ignorePatterns = content
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#"));
    }
  }

  add(filePath) {
    if (filePath === ".") {
      this.addDirectory(this.rootDir);
    } else {
      this.addFile(filePath);
    }
    saveIndex(this.index, this.indexPath);
  }

  addDirectory(dirPath) {
    const files = fs.readdirSync(dirPath);
    files.forEach((file) => {
      const fullPath = path.join(dirPath, file);
      if (fs.statSync(fullPath).isDirectory()) {
        if (file !== ".groot" && !isIgnored(fullPath, this.ignorePatterns, this.rootDir)) {
          this.addDirectory(fullPath);
        }
      } else {
        if (!isIgnored(fullPath, this.ignorePatterns, this.rootDir)) {
          this.addFile(fullPath);
        }
      }
    });
  }

  addFile(filePath) {
    if (!fs.existsSync(filePath)) {
      console.log(`File not found: ${filePath}`);
      return;
    }
    if (isIgnored(filePath, this.ignorePatterns, this.rootDir)) {
      console.log(`Ignoring file: ${filePath}`);
      return;
    }
    const content = fs.readFileSync(filePath);
    const hash = hashObject(content, "blob", this.grootDir);
    const relativePath = path.relative(this.rootDir, filePath);
    const oldHash = this.index.get(relativePath);
    if (hash !== oldHash) {
      this.index.set(relativePath, hash);
      console.log(`Added ${relativePath} to index`);
    } else {
      console.log(`No changes in ${relativePath}`);
    }
  }

  async commit(message) {
    if (!fs.existsSync(this.grootDir)) {
      console.log("Groot repository not initialized. Run 'groot init' first.");
      return;
    }

    if (this.index.size === 0) {
      console.log(
        "No changes staged for commit. Use 'groot add <file>' to stage changes."
      );
      return;
    }

    const tree = writeTree(this.index, this.grootDir);
    const parent = this.getHead();
    const commit = await createCommit(tree, parent, message, this.grootDir);
    this.updateHEAD(commit);
    saveIndex(this.index, this.indexPath);
    console.log(
      `[${this.getCurrentBranch()} ${commit.substr(0, 7)}] ${message}`
    );
  }

  status() {
    const currentBranch = this.getCurrentBranch();
    console.log(`On branch ${currentBranch}`);

    const stagedFiles = Array.from(this.index.keys());
    const untracked = this.getUntrackedFiles();
    const modified = this.getModifiedFiles();

    if (stagedFiles.length > 0) {
      console.log("\nChanges to be committed:");
      stagedFiles.forEach((file) =>
        console.log(`${GREEN}\tnew file:   ${file}${RESET}`)
      );
    }

    if (modified.length > 0) {
      console.log("\nChanges not staged for commit:");
      modified.forEach((file) =>
        console.log(`${RED}\tmodified:   ${file}${RESET}`)
      );
    }

    if (untracked.length > 0) {
      console.log("\nUntracked files:");
      untracked.forEach((file) => console.log(`${RED}\t${file}${RESET}`));
    }

    if (
      stagedFiles.length === 0 &&
      untracked.length === 0 &&
      modified.length === 0
    ) {
      console.log("nothing to commit, working tree clean");
    }
  }

  log() {
    let currentCommit = this.getHead();
    while (currentCommit) {
      const commitObject = readObject(currentCommit, this.grootDir);
      console.log(`commit ${YELLOW}${currentCommit}${RESET}`);

      const branchesAtCommit = this.getBranchesAtCommit(currentCommit);
      if (branchesAtCommit.length > 0) {
        console.log(`Branches: ${branchesAtCommit.join(", ")}`);
      }

      if (commitObject.author) {
        console.log(
          `Author: ${commitObject.author.name} <${commitObject.author.email}>`
        );
        console.log(
          `Date:   ${new Date(commitObject.author.time * 1000).toUTCString()}`
        );
      }

      console.log(`\n\t${commitObject.message || "No commit message"}\n`);
      currentCommit = commitObject.parent;
    }
  }

  diff(commitOrBranch1, commitOrBranch2) {
    const content1 = this.getContentAtCommit(commitOrBranch1);
    const content2 = this.getContentAtCommit(commitOrBranch2);

    console.log(`Diff between ${commitOrBranch1} and ${commitOrBranch2}:`);

    for (const [fileName, fileContent1] of Object.entries(content1)) {
      const fileContent2 = content2[fileName];
      if (fileContent2 === undefined) {
        console.log(`\n${RED}File deleted: ${fileName}${RESET}`);
        continue;
      }
      if (fileContent1 !== fileContent2) {
        console.log(`\n${YELLOW}File changed: ${fileName}${RESET}`);
        showLineDiff(fileContent1, fileContent2);
      }
    }

    for (const fileName of Object.keys(content2)) {
      if (content1[fileName] === undefined) {
        console.log(`\n${GREEN}File added: ${fileName}${RESET}`);
      }
    }
  }

  blame(filePath) {
    const relativePath = path.relative(this.rootDir, filePath);
    let currentCommit = this.getHead();
    let lineBlame = [];

    while (currentCommit) {
      const commitObj = readObject(currentCommit, this.grootDir);
      const tree = readObject(commitObj.tree, this.grootDir);
      const fileEntry = tree.entries.find(
        (entry) => entry.name === relativePath
      );

      if (fileEntry) {
        const fileContent = readObject(fileEntry.hash, this.grootDir).content.toString();
        const lines = fileContent.split("\n");

        lines.forEach((line, index) => {
          if (!lineBlame[index]) {
            lineBlame[index] = {
              commit: currentCommit,
              author: commitObj.author,
              line: line,
            };
          }
        });

        if (lineBlame.length === lines.length) {
          break; // All lines have been blamed
        }
      }

      currentCommit = commitObj.parent;
    }

    // Display blame information
    lineBlame.forEach((blame, index) => {
      const shortCommit = blame.commit.substr(0, 7);
      const author = blame.author ? blame.author.name : "Unknown";
      console.log(
        `${YELLOW}${shortCommit}${RESET} ${BLUE}(${author})${RESET} ${
          index + 1
        }: ${blame.line}`
      );
    });
  }

  branch(branchName) {
    if (!branchName) {
      this.listBranches();
    } else {
      this.createBranch(branchName);
    }
  }

  listBranches() {
    const branchesDir = path.join(this.grootDir, "refs", "heads");
    const branches = fs.readdirSync(branchesDir);
    const currentBranch = this.getCurrentBranch();
    branches.forEach((branch) => {
      console.log(branch === currentBranch ? `* ${branch}` : `  ${branch}`);
    });
  }

  createBranch(branchName) {
    const branchPath = path.join(this.grootDir, "refs", "heads", branchName);
    if (fs.existsSync(branchPath)) {
      console.log(`Branch ${branchName} already exists`);
      return;
    }
    const currentCommit = this.getHead();
    fs.writeFileSync(branchPath, currentCommit);
    console.log(`Created branch ${branchName}`);
  }

  checkout(branchName) {
    const branchPath = path.join(this.grootDir, "refs", "heads", branchName);
    if (!fs.existsSync(branchPath)) {
      console.log(`Branch ${branchName} does not exist.`);
      return;
    }

    const commitHash = fs.readFileSync(branchPath, "utf8").trim();
    this.checkoutCommit(commitHash);
    fs.writeFileSync(
      path.join(this.grootDir, "HEAD"),
      `ref: refs/heads/${branchName}\n`
    );
    console.log(`Switched to branch '${branchName}'`);
  }

  checkoutCommit(commitHash) {
    const commit = readObject(commitHash, this.grootDir);
    if (!commit || commit.type !== "commit") {
      console.log(`Invalid commit hash: ${commitHash}`);
      return;
    }
    const tree = readObject(commit.tree, this.grootDir);
    this.updateWorkingDirectory(tree);

    // Update HEAD to point to the commit hash, indicating detached HEAD state
    fs.writeFileSync(path.join(this.grootDir, "HEAD"), commitHash);

    console.log(`Checked out commit ${commitHash}`);
  }

  merge(branchName) {
    const currentBranch = this.getCurrentBranch();
    const currentCommit = this.getHead();
    const branchCommit = this.getBranchCommit(branchName);

    if (currentCommit === branchCommit) {
      console.log(`Already up to date.`);
      return;
    }

    const baseCommit = this.findCommonAncestor(currentCommit, branchCommit);
    const mergeResult = this.mergeTrees(
      currentCommit,
      branchCommit,
      baseCommit
    );

    if (mergeResult.conflicts) {
      console.log(
        "Merge conflict detected. Please resolve conflicts and commit the result."
      );
      this.writeConflicts(mergeResult.conflicts);
      return;
    }

    const mergeCommit = this.createMergeCommit(
      currentCommit,
      branchCommit,
      mergeResult.tree
    );
    this.updateWorkingDirectory(readObject(mergeResult.tree, this.grootDir));
    this.updateHEAD(mergeCommit);

    // We don't delete the branch reference, just update the current branch
    this.updateBranch(currentBranch, mergeCommit);

    console.log(`Merged branch '${branchName}' into ${currentBranch}`);
  }

  rebase(branchName) {
    console.log(`Starting rebase of current branch onto ${branchName}`);
    const currentBranch = this.getCurrentBranch();
    const currentCommit = this.getHead();
    const branchCommit = this.getBranchCommit(branchName);

    console.log(`Current branch: ${currentBranch}, commit: ${currentCommit}`);
    console.log(`Target branch: ${branchName}, commit: ${branchCommit}`);

    if (currentCommit === branchCommit) {
      console.log(`Already up to date. Nothing to rebase.`);
      return;
    }

    const baseCommit = this.findCommonAncestor(currentCommit, branchCommit);
    console.log(`Base commit: ${baseCommit}`);

    if (baseCommit === branchCommit) {
      console.log(
        `${currentBranch} is already based on ${branchName}. Nothing to do.`
      );
      return;
    }

    // Get the list of commits to rebase
    const commitsToRebase = this.getCommitsToRebase(currentCommit, baseCommit);
    console.log(`Commits to rebase: ${commitsToRebase.join(", ")}`);

    // Checkout the branch we're rebasing onto
    this.checkout(branchName);

    // Apply each commit from the current branch
    for (const commitHash of commitsToRebase.reverse()) {
      console.log(`Applying commit: ${commitHash}`);
      const commit = readObject(commitHash, this.grootDir);
      if (!commit) {
        console.error(`Failed to read commit: ${commitHash}`);
        return;
      }
      console.log(`Commit tree: ${commit.tree}`);
      const newTree = this.applyCommitChanges(commit.tree, this.getHead());
      if (!newTree) {
        console.error(`Failed to apply changes for commit: ${commitHash}`);
        return;
      }
      console.log(`New tree after applying changes: ${newTree}`);
      const newCommit = createCommit(
        newTree,
        this.getHead(),
        commit.message,
        this.grootDir
      );
      console.log(`Created new commit: ${newCommit}`);
      this.updateHEAD(newCommit);
    }

    // Move the current branch to point to the new HEAD
    this.updateBranch(currentBranch, this.getHead());

    // Checkout the rebased branch
    this.checkout(currentBranch);

    console.log(`Successfully rebased ${currentBranch} onto ${branchName}.`);
  }

  getHead() {
    const headPath = path.join(this.grootDir, "HEAD");
    if (!fs.existsSync(headPath)) {
      return null;
    }
    const headContent = fs.readFileSync(headPath, "utf8").trim();
    if (headContent.startsWith("ref: ")) {
      const ref = headContent.slice(5);
      const refPath = path.join(this.grootDir, ref);
      if (!fs.existsSync(refPath)) {
        return null;
      }
      return fs.readFileSync(refPath, "utf8").trim();
    }
    return headContent; // It's already a commit hash
  }

  updateHEAD(commit) {
    const currentBranch = this.getCurrentBranch();
    const branchPath = path.join(this.grootDir, "refs", "heads", currentBranch);
    fs.mkdirSync(path.dirname(branchPath), { recursive: true });
    fs.writeFileSync(branchPath, commit);
  }

  getCurrentBranch() {
    return getCurrentBranch(this.grootDir);
  }

  getUntrackedFiles() {
    const files = fs.readdirSync(this.rootDir);
    return files.filter(
      (file) =>
        !this.index.has(file) && file !== ".groot" && fs.statSync(file).isFile()
    );
  }

  getModifiedFiles() {
    const modified = [];
    for (const [file, hash] of this.index) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file);
        const currentHash = hashObject(content, "blob", this.grootDir);
        if (currentHash !== hash) {
          modified.push(file);
        }
      } else {
        modified.push(file); // File was deleted
      }
    }
    return modified;
  }

  updateWorkingDirectory(tree) {
    // Get the current files in the working directory
    const currentFiles = new Set(
      fs.readdirSync(this.rootDir).filter((file) => file !== ".groot")
    );

    // Clear the index
    this.index.clear();

    // Update or add files from the tree
    tree.entries.forEach((entry) => {
      if (entry.type === "blob") {
        const filePath = path.join(this.rootDir, entry.name);
        const content = readObject(entry.hash, this.grootDir).content;
        fs.writeFileSync(filePath, content);
        this.index.set(entry.name, entry.hash);
        currentFiles.delete(entry.name);
      }
    });

    // Remove files that are not in the tree
    currentFiles.forEach((file) => {
      const filePath = path.join(this.rootDir, file);
      fs.unlinkSync(filePath);
    });

    saveIndex(this.index, this.indexPath);
  }

  clearWorkingDirectory() {
    const files = fs.readdirSync(this.rootDir);
    files.forEach((file) => {
      if (file !== ".groot") {
        const filePath = path.join(this.rootDir, file);
        if (fs.statSync(filePath).isDirectory()) {
          fs.rmdirSync(filePath, { recursive: true });
        } else {
          fs.unlinkSync(filePath);
        }
      }
    });
  }

  restoreFiles(tree) {
    tree.entries.forEach((entry) => {
      if (entry.type === "blob") {
        const content = readObject(entry.hash, this.grootDir).content;
        const filePath = path.join(this.rootDir, entry.name);
        fs.writeFileSync(filePath, content);
      }
    });
  }

  findCommonAncestor(commit1, commit2) {
    const history1 = this.getCommitHistory(commit1);
    const history2 = this.getCommitHistory(commit2);
    return history1.find((commit) => history2.includes(commit));
  }

  getCommitHistory(commit) {
    const history = [];
    let current = commit;
    while (current) {
      history.push(current);
      const commitObj = readObject(current, this.grootDir);
      current = commitObj.parent;
    }
    return history;
  }

  getContentAtCommit(commitOrBranch) {
    let commitHash = commitOrBranch;
    if (this.isBranch(commitOrBranch)) {
      commitHash = this.getBranchCommit(commitOrBranch);
    }

    const commit = readObject(commitHash, this.grootDir);
    const tree = readObject(commit.tree, this.grootDir);
    const content = {};

    for (const entry of tree.entries) {
      if (entry.type === "blob") {
        const blob = readObject(entry.hash, this.grootDir);
        content[entry.name] = blob.content.toString();
      }
    }

    return content;
  }

  isBranch(name) {
    const branchPath = path.join(this.grootDir, "refs", "heads", name);
    return fs.existsSync(branchPath);
  }

  writeConflicts(conflicts) {
    for (const [fileName, content] of conflicts) {
      const conflictContent =
        "<<<<<<< HEAD\n" +
        (content.current || "") +
        "=======\n" +
        (content.branch || "") +
        ">>>>>>> branch\n";

      fs.writeFileSync(path.join(this.rootDir, fileName), conflictContent);
      this.index.set(
        fileName,
        hashObject(Buffer.from(conflictContent), "blob", this.grootDir)
      );
    }
    saveIndex(this.index, this.indexPath);
  }

  getCommitsToRebase(currentCommit, baseCommit) {
    const commits = [];
    let current = currentCommit;

    while (current !== baseCommit) {
      commits.push(current);
      const commitObj = readObject(current, this.grootDir);
      current = commitObj.parent;

      if (!current) {
        throw new Error("Base commit not found in history.");
      }
    }

    return commits;
  }

  applyCommitChanges(commitTree, baseTree) {
    const commitTreeObj = readObject(commitTree, this.grootDir);
    let baseTreeObj = readObject(baseTree, this.grootDir);

    // If baseTreeObj is a commit, get its tree
    if (baseTreeObj.type === "commit") {
      baseTreeObj = readObject(baseTreeObj.tree, this.grootDir);
    }

    if (!commitTreeObj || !baseTreeObj) {
      console.error("Failed to read tree objects");
      return null;
    }

    if (
      !Array.isArray(commitTreeObj.entries) ||
      !Array.isArray(baseTreeObj.entries)
    ) {
      console.error("Invalid tree structure");
      return null;
    }

    const newEntries = new Map(
      baseTreeObj.entries.map((entry) => [entry.name, entry])
    );

    for (const entry of commitTreeObj.entries) {
      newEntries.set(entry.name, entry);
    }

    let newTreeContent = "";
    for (const entry of newEntries.values()) {
      newTreeContent += `${entry.mode} ${entry.type} ${entry.hash}\t${entry.name}\n`;
    }

    const newTreeHash = hashObject(Buffer.from(newTreeContent), "tree", this.grootDir);
    console.log(`Created new tree with hash: ${newTreeHash}`);
    return newTreeHash;
  }

  getBranchCommit(branch) {
    return getBranchCommit(branch, this.grootDir);
  }

  updateBranch(branchName, commitHash) {
    updateBranch(branchName, commitHash, this.grootDir);
  }

  getBranchesAtCommit(commitHash) {
    const branches = [];
    const branchesDir = path.join(this.grootDir, "refs", "heads");
    const branchFiles = fs.readdirSync(branchesDir);

    for (const branchFile of branchFiles) {
      const branchPath = path.join(branchesDir, branchFile);
      const branchCommit = fs.readFileSync(branchPath, "utf8").trim();
      if (branchCommit === commitHash) {
        branches.push(branchFile);
      }
    }

    return branches;
  }

  createMergeCommit(currentCommit, branchCommit, mergeTree) {
    const message = `Merge branch '${this.getCurrentBranch()}' into ${this.getBranchNameFromCommit(branchCommit)}`;
    return createCommit(mergeTree, currentCommit, message, this.grootDir, branchCommit);
  }

  getBranchNameFromCommit(commitHash) {
    const branchesDir = path.join(this.grootDir, "refs", "heads");
    const branches = fs.readdirSync(branchesDir);

    for (const branch of branches) {
      const branchPath = path.join(branchesDir, branch);
      const branchCommit = fs.readFileSync(branchPath, "utf8").trim();
      if (branchCommit === commitHash) {
        return branch;
      }
    }

    return "unknown";
  }
}

module.exports = { Groot };