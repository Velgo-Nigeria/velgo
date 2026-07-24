const { Project, SyntaxKind } = require('ts-morph');
const fs = require('fs');

const project = new Project();
const sourceFile = project.addSourceFileAtPath('pages/Overview.tsx');

const comp = sourceFile.getVariableDeclaration('Overview');
const returnStmt = comp.getInitializer().getBody().getStatements().find(s => s.getKind() === SyntaxKind.ReturnStatement);

const conditionals = returnStmt.getDescendantsOfKind(SyntaxKind.ConditionalExpression);
for (const cond of conditionals) {
    const condition = cond.getCondition();
    if (condition.getKind() === SyntaxKind.BinaryExpression) {
        if (condition.getLeft().getText() === 'activeTab') {
            console.log(condition.getRight().getText());
        }
    }
}
