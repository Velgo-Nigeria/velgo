const { Project, SyntaxKind } = require('ts-morph');
const project = new Project();
const sourceFile = project.addSourceFileAtPath('pages/Overview.tsx');

const overviewComp = sourceFile.getVariableDeclaration('Overview');
const body = overviewComp.getInitializer().getBody();

const functions = [];
for (const stmt of body.getStatements()) {
    if (stmt.getKind() === SyntaxKind.VariableStatement) {
        for (const decl of stmt.getDeclarations()) {
            if (decl.getInitializer() && (decl.getInitializer().getKind() === SyntaxKind.ArrowFunction || decl.getInitializer().getKind() === SyntaxKind.FunctionExpression)) {
                functions.push({
                    name: decl.getName(),
                    lines: decl.getInitializer().getEndLineNumber() - decl.getInitializer().getStartLineNumber()
                });
            }
        }
    } else if (stmt.getKind() === SyntaxKind.FunctionDeclaration) {
        functions.push({
            name: stmt.getName(),
            lines: stmt.getEndLineNumber() - stmt.getStartLineNumber()
        });
    }
}

functions.sort((a, b) => b.lines - a.lines);
console.log(functions.slice(0, 10));
