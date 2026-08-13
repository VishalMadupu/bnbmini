const fs = require('fs');
const path = require('path');

const filesToFix = [
  'app/work-requirements/page.jsx',
  'app/tenders/page.jsx',
  'app/jobs/page.jsx',
  'app/knowledge-hub/page.jsx'
];

filesToFix.forEach(relPath => {
  const filePath = path.join(__dirname, relPath);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix 1: Add Suspense wrapping
  // Change "export default function ComponentName() {"
  // to "function ComponentName() {"
  // and add the export default at the bottom.
  const funcMatch = content.match(/export default function (\w+)\(\)\s*{/);
  if (funcMatch) {
    const compName = funcMatch[1];
    content = content.replace(funcMatch[0], `function ${compName}() {`);
    
    // Add Suspense import if missing
    if (!content.includes('Suspense')) {
      if (content.includes('from "react"')) {
        content = content.replace(/from "react"/, 'from "react"');
        content = content.replace(/import { ([^}]+) } from "react"/, 'import { $1, Suspense } from "react"');
      } else {
        content = `import { Suspense } from "react";\n` + content;
      }
    }

    content += `\nexport default function ${compName}Page() {\n  return (\n    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading...</div>}>\n      <${compName} />\n    </Suspense>\n  );\n}\n`;
  }

  // Fix 2: Replace `const [params, setParams] = useSearchParams();`
  // with Next.js equivalent
  if (content.includes('const [params, setParams] = useSearchParams();')) {
    // Add useRouter and usePathname imports if missing
    if (!content.includes('useRouter')) {
      content = content.replace(/import { ([^}]+) } from 'next\/navigation'/, 'import { $1, useRouter, usePathname } from "next/navigation"');
    }
    
    const nextJsHooks = `
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  // Shim for params.get
  const params = searchParams;
  
  const setParams = useCallback((paramsObj) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    Object.entries(paramsObj).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        current.delete(key);
      } else {
        current.set(key, value);
      }
    });
    const search = current.toString();
    const query = search ? '?' + search : "";
    router.push(pathname + query);
  }, [searchParams, pathname, router]);
`;

    content = content.replace('const [params, setParams] = useSearchParams();', nextJsHooks.trim());
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Fixed ${relPath}`);
});
