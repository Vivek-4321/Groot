const { Groot } = require("./GrootClass");

function main() {
  const groot = new Groot();
  const command = process.argv[2];
  const args = process.argv.slice(3);

  switch (command) {
    case "init":
      groot.init();
      break;
    case "add":
      args.forEach((arg) => groot.add(arg));
      break;
    case "commit":
      if (args[0] === "-m" && args[1]) {
        groot.commit(args[1]);
      } else {
        console.log('Usage: groot commit -m "commit message"');
      }
      break;
    case "status":
      groot.status();
      break;
    case "rebase":
      if (args[0]) {
        groot.rebase(args[0]);
      } else {
        console.log("Usage: groot rebase <branch-name>");
      }
      break;
    case "branch":
      if (args[0]) {
        groot.branch(args[0]);
      } else {
        groot.branch();
      }
      break;
    case "checkout":
      if (args[0]) {
        groot.checkout(args[0]);
      } else {
        console.log("Usage: groot checkout <branch-name>");
      }
      break;
    case "merge":
      if (args[0]) {
        groot.merge(args[0]);
      } else {
        console.log("Usage: groot merge <branch-name>");
      }
      break;
    case "diff":
      if (args[0] && args[1]) {
        groot.diff(args[0], args[1]);
      } else {
        console.log("Usage: groot diff <commit1/branch1> <commit2/branch2>");
      }
      break;
    case "log":
      groot.log();
      break;
    case "checkoutCommit":
      if (args[0]) {
        groot.checkoutCommit(args[0]);
      } else {
        console.log("Usage: groot checkoutCommit <commit-hash>");
      }
      break;
    case "blame":
      if (args[0]) {
        groot.blame(args[0]);
      } else {
        console.log("Usage: groot blame <file-path>");
      }
      break;
    case "config":
      if (args[0] === "user.name" && args[1]) {
        const currentUser = configManager.getUser();
        configManager.setUser(args[1], currentUser.email);
        console.log(`User name set to: ${args[1]}`);
      } else if (args[0] === "user.email" && args[1]) {
        const currentUser = configManager.getUser();
        configManager.setUser(currentUser.name, args[1]);
        console.log(`User email set to: ${args[1]}`);
      } else {
        console.log('Usage: groot config user.name "Your Name"');
        console.log('       groot config user.email "your.email@example.com"');
      }
      break;
    case "whoami":
      const user = configManager.getUser();
      if (user.name && user.email) {
        console.log(`Name: ${user.name}`);
        console.log(`Email: ${user.email}`);
      } else {
        console.log(
          "User information not set. Use 'groot config' to set your name and email."
        );
      }
      break;
    default:
      console.log(
        "Unknown command. Available commands: init, add, commit, status, branch, checkout, merge, log, rebase, config, whoami"
      );
  }
}

main()
