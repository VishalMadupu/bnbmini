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
const srcFiles = getAllFiles(path.join(__dirname, 'src'));
const allFiles = [...appFiles, ...srcFiles];

allFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace <Link to= with <Link href=
  // Also handle cases with spaces like <Link   to=
  content = content.replace(/<Link([^>]+)to=/g, '<Link$1href=');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Replaced to= with href= in ${file}`);
  }
});
