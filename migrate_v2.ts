import { Project, SyntaxKind, CallExpression, SourceFile, Node } from 'ts-morph';

const project = new Project({
  tsConfigFilePath: 'tsconfig.json',
});

const sourceFiles = project.getSourceFiles('app/**/*.tsx').concat(project.getSourceFiles('app/**/*.ts'));

let modifications = 0;

for (const sourceFile of sourceFiles) {
  let changed = false;

  // We are looking for calls to apiText, apiJson, authFetch, fetchPulseJson
  const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);

  for (const callExpr of callExpressions) {
    const expr = callExpr.getExpression();
    const funcName = expr.getText();
    
    if (['apiText', 'apiJson', 'authFetch', 'fetchPulseJson'].includes(funcName)) {
      const args = callExpr.getArguments();
      if (args.length === 0) continue;
      
      const firstArg = args[0];
      let urlStr = '';
      
      if (Node.isStringLiteral(firstArg) || Node.isNoSubstitutionTemplateLiteral(firstArg)) {
        urlStr = firstArg.getLiteralText();
      } else if (Node.isTemplateExpression(firstArg)) {
        urlStr = firstArg.getText(); // Includes backticks and ${}
      } else {
        continue; // e.g. a variable
      }

      // Check if it's a legacy API
      if (!urlStr.includes('/api/') && !urlStr.includes('/engine/')) continue;
      if (urlStr.includes('/api/V2/')) continue;

      // Now we have an API call. We want to replace it.
      // But replacing it via AST is complex because of different arguments (topic, lastId, etc.)
      // Actually, since we only have ~40 calls, maybe we can just write a smart replacer for the most common ones.
      
      // Let's just log them to see what we have to deal with, or we can use a simpler approach.
      console.log(`Found ${funcName} in ${sourceFile.getFilePath()}: ${urlStr}`);
    }
  }
}

console.log(`Total modifications: ${modifications}`);
project.saveSync();
