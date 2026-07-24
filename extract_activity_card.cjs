const { Project, SyntaxKind } = require('ts-morph');
const fs = require('fs');

const project = new Project();
const sourceFile = project.addSourceFileAtPath('pages/Activity.tsx');

const activityComp = sourceFile.getVariableDeclaration('Activity');
const returnStmt = activityComp.getInitializer().getBody().getStatements().find(s => s.getKind() === SyntaxKind.ReturnStatement);

const activityBody = activityComp.getInitializer().getBody();
const localDecls = new Set();
for (const stmt of activityBody.getStatements()) {
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
// Add props of Activity
localDecls.add('profile');
localDecls.add('onOpenChat');
localDecls.add('onUpgrade');
localDecls.add('onRefreshProfile');
localDecls.add('onViewTask');
localDecls.add('onViewWorker');
localDecls.add('onShowNotifications');
localDecls.add('unreadCount');

let mapCall = null;
const calls = returnStmt.getDescendantsOfKind(SyntaxKind.CallExpression);
for (const call of calls) {
    if (call.getExpression().getText() === 'currentItems.map') {
        mapCall = call;
        break;
    }
}

if (!mapCall) {
    console.log("Map not found");
    process.exit(1);
}

const arrowFunc = mapCall.getArguments()[0];
const itemParam = arrowFunc.getParameters()[0].getName(); // 'item'
const arrowBody = arrowFunc.getBody();

const identifiers = arrowBody.getDescendantsOfKind(SyntaxKind.Identifier);
const usedLocals = new Set();
for (const id of identifiers) {
    const name = id.getText();
    if (localDecls.has(name)) {
        usedLocals.add(name);
    }
}

const usedLocalsArray = Array.from(usedLocals);
const compName = 'ActivityItemCard';

let fileContent = `import React from 'react';\n`;
fileContent += `import { Profile } from '../../lib/types';\n\n`;

let propsDecl = `export interface ${compName}Props {\n  item: any;\n`;
for (const loc of usedLocalsArray) {
    propsDecl += `  ${loc}: any;\n`; 
}
propsDecl += `}\n\n`;

let compDecl = `export const ${compName}: React.FC<${compName}Props> = ({\n  item,\n`;
compDecl += usedLocalsArray.map(l => `  ${l}`).join(',\n') + '\n}) => {\n';
compDecl += `  return (\n    ${arrowBody.getText()}\n  );\n};\n`;

fs.writeFileSync(`pages/activity/${compName}.tsx`, fileContent + propsDecl + compDecl);

const newJsx = `<${compName}\n  key={item.id}\n  item={item}\n` + usedLocalsArray.map(l => `  ${l}={${l}}`).join('\n') + `\n/>`;
arrowBody.replaceWithText(newJsx);

sourceFile.addImportDeclaration({
    namedImports: [compName],
    moduleSpecifier: `./activity/${compName}`
});

sourceFile.saveSync();
console.log("Successfully extracted ActivityItemCard");
