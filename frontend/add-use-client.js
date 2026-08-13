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

const componentsDir = path.join(__dirname, 'src', 'components');
const files = getAllFiles(componentsDir);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  if (!content.startsWith('"use client"') && !content.startsWith("'use client'")) {
    content = '"use client";\n\n' + content;
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Added "use client" to ${file}`);
  }
});
