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

  // Next.js supports the @/* -> src/* alias natively if we add "app" to jsconfig include!
  // Let's just fix the bad relative imports by looking for from "../components/..." or from "../../components/..."
  // and converting them to the correct path.
  
  // Calculate relative path to src
  const srcDir = path.join(__dirname, 'src');
  const destDir = path.dirname(file);
  const relPathToSrc = path.relative(destDir, srcDir).replace(/\\/g, '/');

  // Fix multiline imports that were missed by the previous script (import {\n ... \n} from "../components")
  // We look for any import from a path that starts with `../components` (or `../../components`) but DOESN'T have `src/`
  // Actually, we can just look for `from "(?:\.\.\/)+components` and replace it with `from "${relPathToSrc}/components`
  
  content = content.replace(/from\s+['"]((?:\.\.\/)+)(components|lib|constants|hooks)/g, (match, p1, p2) => {
    // p1 is something like "../" or "../../"
    // p2 is "components"
    return `from '${relPathToSrc}/${p2}`;
  });

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Fixed multiline imports in ${file}`);
  }
});
