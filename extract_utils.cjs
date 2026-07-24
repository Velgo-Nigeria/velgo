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

if (targetDecl) {
    const fn = targetDecl.getInitializer();
    const ids = fn.getDescendantsOfKind(SyntaxKind.Identifier).map(id => id.getText());
    const uniqueIds = Array.from(new Set(ids));
    console.log("handleDownloadPdf uses:", uniqueIds.join(', '));
}
