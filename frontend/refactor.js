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

  // Replace react-router-dom Link with next/link
  if (content.includes("from 'react-router-dom'") || content.includes('from "react-router-dom"')) {
    
    // We need to parse what's imported from react-router-dom
    const importRegex = /import\s+{([^}]+)}\s+from\s+['"]react-router-dom['"];?/g;
    
    content = content.replace(importRegex, (match, imports) => {
      const items = imports.split(',').map(i => i.trim());
      let newImports = [];
      
      const hasLink = items.includes('Link');
      if (hasLink) {
        newImports.push(`import Link from 'next/link';`);
      }
      
      const navItems = items.filter(i => i === 'useParams' || i === 'useSearchParams' || i === 'useNavigate' || i === 'useLocation');
      if (navItems.length > 0) {
        // Map useNavigate to useRouter
        const mappedNavItems = navItems.map(i => {
          if (i === 'useNavigate') return 'useRouter';
          if (i === 'useLocation') return 'usePathname';
          return i;
        });
        // We might have duplicates if both useNavigate and useRouter were somehow there, but next/navigation provides useRouter
        newImports.push(`import { ${mappedNavItems.join(', ')} } from 'next/navigation';`);
      }

      return newImports.join('\n');
    });
  }

  // Replace useNavigate() usage with useRouter()
  content = content.replace(/useNavigate\(\)/g, 'useRouter()');
  // Replace useLocation() usage with usePathname()
  // Note: useLocation returns an object { pathname, search, hash, state, key }, usePathname returns string
  // If they do `const location = useLocation();` and then `location.pathname`, we need to change it.
  content = content.replace(/const\s+(\w+)\s*=\s*useLocation\(\);/g, 'const $1 = { pathname: usePathname() };');
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Refactored ${file}`);
  }
});
