const { Project, SyntaxKind } = require('ts-morph');
const fs = require('fs');

const project = new Project();
const sourceFile = project.addSourceFileAtPath('pages/AdminDashboard.tsx');

const adminDashboard = sourceFile.getVariableDeclaration('AdminDashboard');
const body = adminDashboard.getInitializer().getBody();

let csvStmt = null;
let pdfStmt = null;
let csvDecl = null;
let pdfDecl = null;

for (const stmt of body.getStatements()) {
    if (stmt.getKind() === SyntaxKind.VariableStatement) {
        for (const decl of stmt.getDeclarations()) {
            if (decl.getName() === 'downloadUsersCSV') {
                csvStmt = stmt;
                csvDecl = decl;
            }
            if (decl.getName() === 'downloadUsersPDF') {
                pdfStmt = stmt;
                pdfDecl = decl;
            }
        }
    }
}

if (!csvDecl || !pdfDecl) {
    console.log("Not found");
    process.exit(1);
}

// Generate the new file content
let newFileContent = `import { jsPDF } from 'jspdf';\nimport { Profile } from '../../lib/types';\n\n`;

const csvText = csvDecl.getInitializer().getText();
newFileContent += `export const downloadUsersCSV = (users: Profile[]) => {\n  const downloadUsersCSVLogic = ${csvText};\n  return downloadUsersCSVLogic();\n};\n\n`;

const pdfText = pdfDecl.getInitializer().getText();
newFileContent += `export const downloadUsersPDF = (users: Profile[]) => {\n  const downloadUsersPDFLogic = ${pdfText};\n  return downloadUsersPDFLogic();\n};\n`;

fs.writeFileSync('pages/admin/exportUtils.ts', newFileContent);

// Replace in original file
csvDecl.getInitializer().replaceWithText(`() => downloadUsersCSV(users)`);
pdfDecl.getInitializer().replaceWithText(`() => downloadUsersPDF(users)`);

sourceFile.addImportDeclaration({
    namedImports: ['downloadUsersCSV', 'downloadUsersPDF'],
    moduleSpecifier: `./admin/exportUtils`
});

sourceFile.saveSync();
console.log("Moved functions to exportUtils");
