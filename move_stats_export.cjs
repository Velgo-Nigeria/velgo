const { Project, SyntaxKind } = require('ts-morph');
const fs = require('fs');

const project = new Project();
const sourceFile = project.addSourceFileAtPath('pages/AdminDashboard.tsx');

const adminDashboard = sourceFile.getVariableDeclaration('AdminDashboard');
const body = adminDashboard.getInitializer().getBody();

let targetDecl = null;
for (const stmt of body.getStatements()) {
    if (stmt.getKind() === SyntaxKind.VariableStatement) {
        for (const decl of stmt.getDeclarations()) {
            if (decl.getName() === 'handleDownloadPdf') {
                targetDecl = decl;
            }
        }
    }
}

if (!targetDecl) {
    console.log("Not found");
    process.exit(1);
}

const utilsFile = project.addSourceFileAtPath('pages/admin/exportUtils.ts');

const pdfText = targetDecl.getInitializer().getText();

utilsFile.addVariableStatement({
    isExported: true,
    declarationKind: 'const',
    declarations: [{
        name: 'downloadStatsPDF',
        initializer: `(stats: any) => {\n  const handleDownloadPdfLogic = ${pdfText};\n  return handleDownloadPdfLogic();\n}`
    }]
});

targetDecl.getInitializer().replaceWithText(`() => downloadStatsPDF(stats)`);

const imports = sourceFile.getImportDeclarations();
const utilsImport = imports.find(i => i.getModuleSpecifierValue() === './admin/exportUtils');
utilsImport.addNamedImport('downloadStatsPDF');

sourceFile.saveSync();
utilsFile.saveSync();
console.log("Moved handleDownloadPdf to exportUtils");
