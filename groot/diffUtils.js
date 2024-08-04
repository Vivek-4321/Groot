const { colorize, RED, GREEN } = require('./utils');

function computeDiff(lines1, lines2) {
    const diff = [];
    let i = 0,
      j = 0;

    while (i < lines1.length && j < lines2.length) {
      if (lines1[i] === lines2[j]) {
        diff.push(["equal", lines1[i]]);
        i++;
        j++;
      } else {
        const deletedLines = [];
        const insertedLines = [];

        while (i < lines1.length && !lines2.includes(lines1[i])) {
          deletedLines.push(lines1[i]);
          i++;
        }

        while (j < lines2.length && !lines1.includes(lines2[j])) {
          insertedLines.push(lines2[j]);
          j++;
        }

        deletedLines.forEach((line) => diff.push(["delete", line]));
        insertedLines.forEach((line) => diff.push(["insert", line]));
      }
    }

    while (i < lines1.length) {
      diff.push(["delete", lines1[i]]);
      i++;
    }

    while (j < lines2.length) {
      diff.push(["insert", lines2[j]]);
      j++;
    }

    return diff;
  }


function showLineDiff(content1, content2) {
  const lines1 = content1.split('\n');
  const lines2 = content2.split('\n');
  const diff = computeDiff(lines1, lines2);

  diff.forEach(([type, value]) => {
    switch (type) {
      case 'equal':
        console.log(`  ${value}`);
        break;
      case 'insert':
        console.log(colorize(`+ ${value}`, GREEN));
        break;
      case 'delete':
        console.log(colorize(`- ${value}`, RED));
        break;
    }
  });
}

module.exports = { computeDiff, showLineDiff };