const { Project, SyntaxKind } = require('ts-morph');
const fs = require('fs');

const project = new Project();
const sourceFile = project.addSourceFileAtPath('pages/Activity.tsx');

const activityComp = sourceFile.getVariableDeclaration('Activity');
const body = activityComp.getInitializer().getBody();

let stmt1 = null, stmt2 = null;
let decl1 = null, decl2 = null;

for (const stmt of body.getStatements()) {
    if (stmt.getKind() === SyntaxKind.VariableStatement) {
        for (const decl of stmt.getDeclarations()) {
            if (decl.getName() === 'downloadJobReceipt') {
                stmt1 = stmt;
                decl1 = decl;
            }
            if (decl.getName() === 'downloadAllHistoryPDF') {
                stmt2 = stmt;
                decl2 = decl;
            }
        }
    }
}

if (!decl1 || !decl2) {
    console.log("Not found");
    process.exit(1);
}

// Check what external identifiers are needed for each
const getNeededLocals = (decl) => {
    const fn = decl.getInitializer();
    const ids = fn.getDescendantsOfKind(SyntaxKind.Identifier).map(id => id.getText());
    return Array.from(new Set(ids));
};

console.log("downloadJobReceipt uses:", getNeededLocals(decl1).join(', '));
console.log("downloadAllHistoryPDF uses:", getNeededLocals(decl2).join(', '));

// Create utility file
let newFileContent = `import { jsPDF } from 'jspdf';\nimport { Profile } from '../../lib/types';\n\n`;

const text1 = decl1.getInitializer().getText();
newFileContent += `export const downloadJobReceipt = (item: any, profile: any) => {\n  const downloadJobReceiptLogic = ${text1};\n  return downloadJobReceiptLogic(item);\n};\n\n`;

const text2 = decl2.getInitializer().getText();
newFileContent += `export const downloadAllHistoryPDF = (bookings: any[], tasks: any[], profile: any, viewMode: string) => {\n  const downloadAllHistoryPDFLogic = ${text2};\n  return downloadAllHistoryPDFLogic();\n};\n`;

fs.writeFileSync('pages/activity/exportUtils.ts', newFileContent);

// Replace in original file
decl1.getInitializer().replaceWithText(`(item: any) => downloadJobReceipt(item, profile)`);
decl2.getInitializer().replaceWithText(`() => downloadAllHistoryPDF(bookings, tasks, profile, viewMode)`);

sourceFile.addImportDeclaration({
    namedImports: ['downloadJobReceipt', 'downloadAllHistoryPDF'],
    moduleSpecifier: `./activity/exportUtils`
});

sourceFile.saveSync();
console.log("Moved functions to exportUtils");
