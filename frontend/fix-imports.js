const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function getAllFiles(dir, exts = ['.js', '.jsx']) {
  let results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(getAllFiles(fullPath, exts));
    } else if (exts.includes(path.extname(entry.name))) {
      results.push(fullPath);
    }
  }
  return results;
}

function getRelativePath(fromFile, toPath) {
  const fromDir = path.dirname(fromFile);
  let rel = path.relative(fromDir, path.join(srcDir, toPath)).replace(/\\/g, '/');
  if (!rel.startsWith('.')) {
    rel = './' + rel;
  }
  return rel;
}

const files = getAllFiles(srcDir);
let totalReplacements = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  // Replace from "@/ and from '@/ patterns
  content = content.replace(/(from\s+["'])@\/([^"']+)(["'])/g, (match, prefix, importPath, suffix) => {
    const rel = getRelativePath(file, importPath);
    return `${prefix}${rel}${suffix}`;
  });

  // Replace import "@/ and import '@/ patterns (side-effect imports like CSS)
  content = content.replace(/(import\s+["'])@\/([^"']+)(["'])/g, (match, prefix, importPath, suffix) => {
    const rel = getRelativePath(file, importPath);
    return `${prefix}${rel}${suffix}`;
  });

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    const count = (original.match(/@\//g) || []).length;
    totalReplacements += count;
    console.log(`Updated: ${path.relative(srcDir, file)} (${count} replacements)`);
  }
}

console.log(`\nDone! ${totalReplacements} total replacements across ${files.length} files scanned.`);
