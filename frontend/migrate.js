const fs = require('fs');
const path = require('path');

const srcPagesDir = path.join(__dirname, 'src', 'pages');
const appDir = path.join(__dirname, 'app');
const srcComponentsDir = path.join(__dirname, 'src', 'components');

const routeMapping = {
  'Home.jsx': 'page.jsx',
  'Jobs.jsx': 'jobs/page.jsx',
  'JobDetail.jsx': 'jobs/[slug]/page.jsx',
  'Tenders.jsx': 'tenders/page.jsx',
  'TenderDetail.jsx': 'tenders/[slug]/page.jsx',
  'WorkRequirements.jsx': 'work-requirements/page.jsx',
  'WorkRequirementDetail.jsx': 'work-requirements/[slug]/page.jsx',
  'KnowledgeHub.jsx': 'knowledge-hub/page.jsx',
  'KnowledgeDetail.jsx': 'knowledge-hub/[slug]/page.jsx',
  'SubmitHub.jsx': 'submit/page.jsx',
  'Submit.jsx': 'submit/opportunity/page.jsx',
  'WorkRequirementSubmit.jsx': 'submit/work-requirement/page.jsx',
  'KnowledgeSubmit.jsx': 'submit/knowledge/page.jsx',
  'ResumeSubmit.jsx': 'submit/resume/page.jsx',
  'VendorRegister.jsx': 'submit/vendor/page.jsx',
  'Admin.jsx': 'admin/page.jsx'
};

function copyAndTransform(source, dest, isLegal = false) {
  if (!fs.existsSync(source)) return;
  
  let content = fs.readFileSync(source, 'utf8');
  
  if (!isLegal) {
    // Add "use client" if not there
    if (!content.startsWith('"use client"') && !content.startsWith("'use client'")) {
      content = '"use client";\n\n' + content;
    }
  }

  // Transform relative imports since the file moved
  // From src/pages/X to app/X/page.jsx
  // This is tricky. Next.js supports absolute imports if configured, but let's just rewrite ../ to ../../ if needed.
  // Actually, we can use the jsconfig baseUrl="." we have, but react components use relative like `../components/UI`
  
  // A simpler way: we know it moved from `src/pages/File.jsx` to `app/some/route/page.jsx`
  // We can just calculate the relative path back to `src`.
  const srcDir = path.join(__dirname, 'src');
  const destDir = path.dirname(dest);
  const relPathToSrc = path.relative(destDir, srcDir).replace(/\\/g, '/');
  
  // Replace `../components` with `${relPathToSrc}/components`
  // Replace `../constants` with `${relPathToSrc}/constants`
  // Replace `../lib` with `${relPathToSrc}/lib`
  content = content.replace(/(import\s+.*?from\s+['"])(?:\.\.\/)+([^'"]+)(['"])/g, (match, p1, p2, p3) => {
    // If it's importing from something inside src (components, constants, lib, hooks)
    if (p2.startsWith('components') || p2.startsWith('constants') || p2.startsWith('lib') || p2.startsWith('hooks') || p2.startsWith('pages')) {
      return `${p1}${relPathToSrc}/${p2}${p3}`;
    }
    return match; // fallback
  });

  // Replace `./components` if it was in the same folder? Usually it's `../components`
  content = content.replace(/(import\s+.*?from\s+['"])\.\/([^'"]+)(['"])/g, (match, p1, p2, p3) => {
    // If a page imports another page locally like `./Legal`
    return `${p1}${relPathToSrc}/pages/${p2}${p3}`;
  });

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, content, 'utf8');
}

for (const [file, route] of Object.entries(routeMapping)) {
  const source = path.join(srcPagesDir, file);
  const dest = path.join(appDir, route);
  copyAndTransform(source, dest);
}

// Handle Legal.jsx specially
const legalSource = path.join(srcPagesDir, 'Legal.jsx');
const legalDest = path.join(srcComponentsDir, 'Legal.jsx');
if (fs.existsSync(legalSource)) {
  copyAndTransform(legalSource, legalDest, true);
  // Add "use client" to Legal.jsx
  let legalContent = fs.readFileSync(legalDest, 'utf8');
  if (!legalContent.startsWith('"use client"')) {
    fs.writeFileSync(legalDest, '"use client";\n\n' + legalContent, 'utf8');
  }
}

// Create wrapper pages for Legal
const legals = ['privacy', 'disclaimer', 'terms'];
for (const legal of legals) {
  const dest = path.join(appDir, legal, 'page.jsx');
  const relPathToSrc = path.relative(path.dirname(dest), path.join(__dirname, 'src')).replace(/\\/g, '/');
  const content = `"use client";\nimport Legal from '${relPathToSrc}/components/Legal';\n\nexport default function ${legal.charAt(0).toUpperCase() + legal.slice(1)}Page() {\n  return <Legal page="${legal}" />;\n}\n`;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, content, 'utf8');
}

console.log("Pages migrated to app directory.");
