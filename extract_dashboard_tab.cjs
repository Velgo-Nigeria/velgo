const { Project, SyntaxKind } = require('ts-morph');
const fs = require('fs');

const project = new Project();
const sourceFile = project.addSourceFileAtPath('pages/Overview.tsx');

const comp = sourceFile.getVariableDeclaration('Overview');
const body = comp.getInitializer().getBody();

const localDecls = new Set();
for (const stmt of body.getStatements()) {
    if (stmt.getKind() === SyntaxKind.VariableStatement) {
        for (const decl of stmt.getDeclarations()) {
            if (decl.getKind() === SyntaxKind.VariableDeclaration) {
                if (decl.getNameNode().getKind() === SyntaxKind.Identifier) {
                    localDecls.add(decl.getName());
                } else if (decl.getNameNode().getKind() === SyntaxKind.ArrayBindingPattern) {
                    for (const elem of decl.getNameNode().getElements()) {
                        if (elem.getKind() === SyntaxKind.BindingElement) {
                            localDecls.add(elem.getName());
                        }
                    }
                }
            }
        }
    } else if (stmt.getKind() === SyntaxKind.FunctionDeclaration) {
        localDecls.add(stmt.getName());
    }
}
// Add props of Overview
localDecls.add('profile');
localDecls.add('stats');
localDecls.add('hasPendingBookings');
localDecls.add('onRefreshProfile');
localDecls.add('onUpgrade');
localDecls.add('onShowNotifications');

const returnStmt = body.getStatements().find(s => s.getKind() === SyntaxKind.ReturnStatement);
let jsx = returnStmt.getExpression().getExpression();

const hubTabChild = jsx.getChildrenOfKind(SyntaxKind.JsxExpression).find(c => c.getText().includes("hubTab === 'dashboard'"));
const cond = hubTabChild.getExpression();
const dashboardBranch = cond.getWhenTrue();

const identifiers = dashboardBranch.getDescendantsOfKind(SyntaxKind.Identifier);
const usedLocals = new Set();
for (const id of identifiers) {
    const name = id.getText();
    if (localDecls.has(name)) {
        usedLocals.add(name);
    }
}

const usedLocalsArray = Array.from(usedLocals);
const compName = 'DashboardTab';

let fileContent = `import React from 'react';\n`;

let propsDecl = `export interface ${compName}Props {\n`;
for (const loc of usedLocalsArray) {
    propsDecl += `  ${loc}: any;\n`; 
}
propsDecl += `}\n\n`;

let compDecl = `export const ${compName}: React.FC<${compName}Props> = ({\n`;
compDecl += usedLocalsArray.map(l => `  ${l}`).join(',\n') + '\n}) => {\n';
compDecl += `  return (\n    ${dashboardBranch.getText()}\n  );\n};\n`;

fs.writeFileSync(`pages/overview/${compName}.tsx`, fileContent + propsDecl + compDecl);

const newJsx = `<${compName}\n` + usedLocalsArray.map(l => `  ${l}={${l}}`).join('\n') + `\n/>`;
dashboardBranch.replaceWithText(newJsx);

sourceFile.addImportDeclaration({
    namedImports: [compName],
    moduleSpecifier: `./overview/${compName}`
});

sourceFile.saveSync();
console.log("Successfully extracted DashboardTab");
