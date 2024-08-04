# Groot: A Git-like Version Control System 🌳

Groot is a lightweight, Git-inspired version control system implemented in JavaScript. It provides functionality for tracking changes, creating branches, and managing your project's history and much more.

## 📋 Table of Contents

- [Installation](#installation)
- [Setup](#setup)
- [Commands](#commands)
- [Contributing](#contributing)
- [License](#license)

## 🚀 Installation

### Prerequisites

- Node.js (v12 or higher)

### Clone the Repository

```bash
git clone https://github.com/yourusername/groot.git
cd groot
```

### Install Dependencies

```bash
npm install
```

## 🛠 Setup

To use Groot like Git (e.g., `groot init` instead of `node groot.js init`), you'll need to set up an alias or add it to your system's PATH.

### Windows

1. Create a batch file named `groot.bat` in the Groot project directory:

```batch
@echo off
node %~dp0groot.js %*
```

2. Add the Groot directory to your system's PATH:
   - Press Win + X and select "System"
   - Click "Advanced system settings"
   - Click "Environment Variables"
   - Under "System variables", find "Path" and click "Edit"
   - Click "New" and add the full path to your Groot directory
   - Click "OK" to save changes

### macOS and Linux

1. Open your shell configuration file (e.g., `~/.bashrc`, `~/.zshrc`):

```bash
nano ~/.bashrc  # or ~/.zshrc
```

2. Add the following alias:

```bash
alias groot='node /path/to/groot/groot.js'
```

3. Save the file and reload your shell configuration:

```bash
source ~/.bashrc  # or ~/.zshrc
```

## 💻 Commands

### Initialize a Repository

```bash
groot init
```

Creates a new Groot repository in the current directory.

### Add Files to Staging

```bash
groot add <file>
groot add .  # Add all files
```

Adds files to the staging area for the next commit.

### Commit Changes

```bash
groot commit -m "Your commit message"
```

Creates a new commit with the staged changes.

### Check Repository Status

```bash
groot status
```

Displays the current state of the repository, including staged and unstaged changes.

### Create a Branch

```bash
groot branch <branch-name>
```

Creates a new branch.

### Switch Branches

```bash
groot checkout <branch-name>
```

Switches to the specified branch.

### Merge Branches

```bash
groot merge <branch-name>
```

Merges the specified branch into the current branch..

### View Commit History

```bash
groot log
```

Displays the commit history of the current branch.

### Rebase Branches

```bash
groot rebase <branch-name>
```

Rebases the current branch onto the specified branch.

### View Differences

```bash
groot diff <commit1/branch1> <commit2/branch2>
```

Shows the differences between two commits or branches.

### Blame

```bash
groot blame <file-path>
```

Shows who last modified each line of a file.

### Checkout a Specific Commit

```bash
groot checkoutCommit <commit-hash>
```

Checks out the repository at a specific commit.

### Configure User Information

```bash
groot config user.name "Your Name"
groot config user.email "your.email@example.com"
```

Sets or updates the user's name and email for commits.

### View Current User Information

```bash
groot whoami
```

Displays the currently configured user name and email.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
