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
// Add props of AdminDashboard
localDecls.add('onBack');

const tabs = ['broadcast', 'verify', 'users', 'safety', 'support', 'reviews', 'stats', 'errors', 'audit'];

for (const targetTab of tabs) {
    let targetCond = null;
    const conditionals = returnStmt.getDescendantsOfKind(SyntaxKind.ConditionalExpression);
    for (const cond of conditionals) {
        const condition = cond.getCondition();
        if (condition.getKind() === SyntaxKind.BinaryExpression) {
            if (condition.getLeft().getText() === 'activeTab' && condition.getRight().getText() === `'${targetTab}'`) {
                targetCond = cond;
                break;
            }
        }
    }

    if (!targetCond) continue;

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
    
    // Create new file content
    const compName = targetTab.charAt(0).toUpperCase() + targetTab.slice(1) + 'Tab';
    let fileContent = `import React from 'react';\n`;
    // We should import types, assuming we use any for now if not sure, but let's just make it generic props
    
    // Add common imports for components used
    if (trueBranch.getText().includes('SparkChart')) {
        fileContent += `import { SparkChart } from '../AdminComponents';\n`;
    }
    if (trueBranch.getText().includes('SafetyReportRelationsCard')) {
        fileContent += `import { SafetyReportRelationsCard } from '../AdminComponents';\n`;
    }
    fileContent += `import { TIERS } from '../../lib/constants';\n`; // Just in case
    fileContent += `import { openWhatsAppHelper } from '../../lib/whatsapp';\n`; // Just in case
    
    let propsDecl = `export interface ${compName}Props {\n`;
    for (const loc of usedLocalsArray) {
        propsDecl += `  ${loc}: any;\n`; // use any for simplicity, can fix later if needed
    }
    propsDecl += `}\n\n`;
    
    let compDecl = `export const ${compName}: React.FC<${compName}Props> = ({\n`;
    compDecl += usedLocalsArray.map(l => `  ${l}`).join(',\n') + '\n}) => {\n';
    compDecl += `  return (\n    ${trueBranch.getText()}\n  );\n};\n`;
    
    fs.writeFileSync(`pages/admin/tabs/${compName}.tsx`, fileContent + propsDecl + compDecl);
    
    // Replace in original file
    const newJsx = `<${compName}\n` + usedLocalsArray.map(l => `  ${l}={${l}}`).join('\n') + `\n/>`;
    trueBranch.replaceWithText(newJsx);
    
    // Add import to original file
    sourceFile.addImportDeclaration({
        namedImports: [compName],
        moduleSpecifier: `./admin/tabs/${compName}`
    });
}

sourceFile.saveSync();
console.log("Successfully extracted tabs");
