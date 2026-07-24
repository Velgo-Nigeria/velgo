const { Project, SyntaxKind } = require('ts-morph');
const fs = require('fs');

const project = new Project();
const sourceFile = project.addSourceFileAtPath('pages/AdminDashboard.tsx');

const adminDashboard = sourceFile.getVariableDeclaration('AdminDashboard');
const returnStmt = adminDashboard.getInitializer().getBody().getStatements().find(s => s.getKind() === SyntaxKind.ReturnStatement);

const adminDashboardBody = adminDashboard.getInitializer().getBody();
const localDecls = new Set();
for (const stmt of adminDashboardBody.getStatements()) {
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
localDecls.add('onBack');

let targetCond = null;
const conditionals = returnStmt.getDescendantsOfKind(SyntaxKind.ConditionalExpression);
for (const cond of conditionals) {
    const condition = cond.getCondition();
    if (condition.getKind() === SyntaxKind.BinaryExpression) {
        if (condition.getText() === "activeTab === 'stats' && stats") {
            targetCond = cond;
            break;
        }
    }
}

if (!targetCond) {
    console.log("Stats tab not found");
    process.exit(1);
}

const trueBranch = targetCond.getWhenTrue();
const identifiers = trueBranch.getDescendantsOfKind(SyntaxKind.Identifier);

const usedLocals = new Set();
for (const id of identifiers) {
    const name = id.getText();
    if (localDecls.has(name)) {
        usedLocals.add(name);
    }
}

const usedLocalsArray = Array.from(usedLocals);
const compName = 'StatsTab';

let fileContent = `import React from 'react';\n`;
if (trueBranch.getText().includes('SparkChart')) {
    fileContent += `import { SparkChart } from '../AdminComponents';\n`;
}

let propsDecl = `export interface ${compName}Props {\n`;
for (const loc of usedLocalsArray) {
    propsDecl += `  ${loc}: any;\n`; 
}
propsDecl += `}\n\n`;

let compDecl = `export const ${compName}: React.FC<${compName}Props> = ({\n`;
compDecl += usedLocalsArray.map(l => `  ${l}`).join(',\n') + '\n}) => {\n';
compDecl += `  return (\n    ${trueBranch.getText()}\n  );\n};\n`;

fs.writeFileSync(`pages/admin/tabs/${compName}.tsx`, fileContent + propsDecl + compDecl);

const newJsx = `<${compName}\n` + usedLocalsArray.map(l => `  ${l}={${l}}`).join('\n') + `\n/>`;
trueBranch.replaceWithText(newJsx);

sourceFile.addImportDeclaration({
    namedImports: [compName],
    moduleSpecifier: `./admin/tabs/${compName}`
});

sourceFile.saveSync();
console.log("Successfully extracted Stats tab");
