const { Project, SyntaxKind } = require('ts-morph');
const project = new Project();
const sourceFile = project.addSourceFileAtPath('pages/Overview.tsx');

const comp = sourceFile.getVariableDeclaration('Overview');
const returnStmt = comp.getInitializer().getBody().getStatements().find(s => s.getKind() === SyntaxKind.ReturnStatement);

let jsx = returnStmt.getExpression().getExpression();

if (jsx.getKind() === SyntaxKind.JsxElement) {
    const children = jsx.getChildrenOfKind(SyntaxKind.JsxExpression);
    // Find the one containing hubTab
    const hubTabChild = children.find(c => c.getText().includes("hubTab === 'dashboard'"));
    if (hubTabChild) {
        const cond = hubTabChild.getExpression();
        if (cond.getKind() === SyntaxKind.ConditionalExpression) {
            console.log("True branch length:", cond.getWhenTrue().getText().split('\n').length);
            console.log("False branch length:", cond.getWhenFalse().getText().split('\n').length);
        }
    }
}
