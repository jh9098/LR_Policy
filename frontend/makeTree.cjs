// makeTree.js
const fs = require('fs');
const path = require('path');

const IGNORE = ['node_modules', '.git', '.vscode', 'dist', 'build'];

function walk(dir, depth = 0) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  const indent = '  '.repeat(depth);

  for (const item of items) {
    if (IGNORE.includes(item.name)) continue;

    const fullPath = path.join(dir, item.name);
    const isDir = item.isDirectory();

    console.log(`${indent}- ${item.name}`);

    if (isDir) {
      walk(fullPath, depth + 1);
    }
  }
}

walk(process.cwd());
