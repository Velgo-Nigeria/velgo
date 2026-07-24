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

let targetExpr = null;
const binaryExprs = returnStmt.getDescendantsOfKind(SyntaxKind.BinaryExpression);
for (const expr of binaryExprs) {
    if (expr.getOperatorToken().getKind() === SyntaxKind.AmpersandAmpersandToken) {
        if (expr.getLeft().getText() === 'lightboxUser') {
            targetExpr = expr;
            break;
        }
    }
}

if (!targetExpr) {
    console.log("Lightbox not found");
    process.exit(1);
}

const rightSide = targetExpr.getRight();
const identifiers = rightSide.getDescendantsOfKind(SyntaxKind.Identifier);

const usedLocals = new Set();
usedLocals.add('lightboxUser');

for (const id of identifiers) {
    const name = id.getText();
    if (localDecls.has(name)) {
        usedLocals.add(name);
    }
}

const usedLocalsArray = Array.from(usedLocals);
const compName = 'VerificationLightbox';

let fileContent = `import React from 'react';\n`;
fileContent += `import { openWhatsAppHelper } from '../../lib/whatsapp';\n`;

let propsDecl = `export interface ${compName}Props {\n`;
for (const loc of usedLocalsArray) {
    propsDecl += `  ${loc}: any;\n`; 
}
propsDecl += `}\n\n`;

let compDecl = `export const ${compName}: React.FC<${compName}Props> = ({\n`;
compDecl += usedLocalsArray.map(l => `  ${l}`).join(',\n') + '\n}) => {\n';
compDecl += `  return (\n    ${rightSide.getText()}\n  );\n};\n`;

fs.writeFileSync(`pages/admin/${compName}.tsx`, fileContent + propsDecl + compDecl);

const newJsx = `<${compName}\n` + usedLocalsArray.map(l => `  ${l}={${l}}`).join('\n') + `\n/>`;
rightSide.replaceWithText(newJsx);

sourceFile.addImportDeclaration({
    namedImports: [compName],
    moduleSpecifier: `./admin/${compName}`
});

sourceFile.saveSync();
console.log("Successfully extracted Lightbox");
