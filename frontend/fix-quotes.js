const fs = require('fs');
const path = require('path');

function getAllFiles(dir, ext = '.jsx') {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(filePath, ext));
    } else if (filePath.endsWith(ext) || filePath.endsWith('.js')) {
      results.push(filePath);
    }
  });
  return results;
}

const appFiles = getAllFiles(path.join(__dirname, 'app'));

appFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Fix the quote mismatch: `from '../../src/components...";`
  content = content.replace(/from\s+'((?:\.\.\/)+src\/[^'"]+)";/g, 'from "$1";');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Fixed quotes in ${file}`);
  }
});
