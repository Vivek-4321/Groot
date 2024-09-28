const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const zlib = require("zlib");
const configManager = require("./configManager");

// Helper methods

function hashObject(content, type, grootDir) {
  const header = `${type} ${content.length}\0`;
  const store = Buffer.concat([Buffer.from(header), content]);
  const hash = crypto.createHash("sha1").update(store).digest("hex");
  const compressed = zlib.deflateSync(store);
  const objectPath = path.join(
    grootDir,
    "objects",
    hash.substr(0, 2),
    hash.substr(2)
  );
  fs.mkdirSync(path.dirname(objectPath), { recursive: true });
  fs.writeFileSync(objectPath, compressed);
  return hash;
}

function readObject(hash, grootDir) {
  // console.log(`Reading object: ${hash}`);
  const objectPath = path.join(
    grootDir,
    "objects",
    hash.substr(0, 2),
    hash.substr(2)
  );
  if (!fs.existsSync(objectPath)) {
    console.error(`Object not found: ${hash}`);
    return null;
  }
  const compressed = fs.readFileSync(objectPath);
  const content = zlib.inflateSync(compressed);
  const nullIndex = content.indexOf(0);
  const header = content.slice(0, nullIndex).toString();
  const body = content.slice(nullIndex + 1);

  const [type, size] = header.split(" ");
  // console.log(`Object type: ${type}, size: ${size}`);

  if (type === "commit") {
    const lines = body.toString().split("\n");
    const commit = { type: "commit" };
    let messageStartIndex;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i] === "") {
        messageStartIndex = i + 1;
        break;
      }
      const [key, ...valueParts] = lines[i].split(" ");
      const value = valueParts.join(" ");
      if (key === "author" || key === "committer") {
        const match = value.match(/^(.*) <(.*)> (\d+) (.*)$/);
        if (match) {
          commit[key] = {
            name: match[1],
            email: match[2],
            time: parseInt(match[3]),
            timezone: match[4],
          };
        }
      } else {
        commit[key] = value;
      }
    }
    commit.message = lines.slice(messageStartIndex).join("\n").trim();
    // console.log("Parsed commit object:", JSON.stringify(commit, null, 2));
    return commit;
  } else if (type === "tree") {
    const entries = body.toString().split("\n").filter(Boolean);
    const tree = { type: "tree", entries: [] };
    entries.forEach((entry) => {
      const [mode, type, hash, ...nameParts] = entry.split(/\s+/);
      const name = nameParts.join(" ");
      tree.entries.push({ mode, type, hash, name });
    });
    // console.log("Parsed tree object:", JSON.stringify(tree, null, 2));
    return tree;
  } else if (type === "blob") {
    // console.log("Blob content (truncated):", body.toString().substring(0, 100));
    return { type, size: parseInt(size), content: body };
  }

  console.error(`Unknown object type: ${type}`);
  return null;
}

function createCommit(tree, parent, message, grootDir) {
  let { name, email } = configManager.getUser();

  if (!name || !email) {
    console.error("User name and email are not set. Please configure them using 'groot config --global user.name \"Your Name\"' and 'groot config --global user.email \"your.email@example.com\"'");
    process.exit(1);
  }

  const author = {
    name,
    email,
    time: Math.floor(Date.now() / 1000),
  };

  let commitContent = `tree ${tree}\n`;
  if (parent) {
    commitContent += `parent ${parent}\n`;
  }
  commitContent += `author ${author.name} <${author.email}> ${author.time} +0000\n`;
  commitContent += `committer ${author.name} <${author.email}> ${author.time} +0000\n\n`;
  commitContent += `${message}\n`;

  return hashObject(Buffer.from(commitContent), "commit", grootDir);
}

function writeTree(index, grootDir) {
  let treeContent = "";
  for (const [filePath, hash] of index) {
    treeContent += `100644 blob ${hash}\t${filePath}\n`;
  }
  return hashObject(Buffer.from(treeContent), "tree", grootDir);
}

module.exports = { hashObject, readObject, createCommit, writeTree };
