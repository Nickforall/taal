const ParserError = require('../errors/parsererror');
const X86AssemblyImage = require('./x86image');
const X86Function = require('./function');
const X86Syscall = require('./syscall');


class Compiler {
	constructor(ast, module) {
		this.script = ast;
		this.module = module;
		this.image = new X86AssemblyImage();

		this.currentFunction = null;
		this.currentFunctionExpression = null;
	}

	compileBinary(binary) {
		this.addLine(';' 
			+ binary.left.value + ' ' 
			+ binary.operator + ' ' 
			+ binary.right.value
		);

		this.compileExpression(binary.right);
		this.compileExpression(binary.left);
		this.addLine('pop rax');

		// TODO: if right is numeral literal, 
		// 		 we can drastically optimize this

		switch (binary.operator) {
			
		case '*':
			this.addLine('imul rax, [rsp]');
			break;
		case '+':
			this.addLine('add rax, [rsp]');
			break;
		case '-':
			this.addLine('sub rax, [rsp]');
			break;

		}

		this.addLine('pop rdx');
		this.addLine('push rax');
	}

	compileLiteral(expression) {
		this.addLine(`push ${expression.value}`);
	}

	compileFunctionDefinition(expression) {
		var f = new X86Function(expression.name.value);

		this.currentFunction = f;
		this.currentFunctionExpression = expression;

		// setup stack
		f.addLine('push rbp');
		f.addLine('mov rbp, rsp');
		f.addLine(`sub rsp, ${expression.localVariableSize}`);

		// do stuff
		for (const ex of expression.block.expressions) {
			this.compileExpression(ex);			
		}

		// restore stack jizz
		f.addLine('mov rsp, rbp');
		f.addLine('pop rbp');
		// return
		f.addLine('ret');

		this.currentFunction = null;
		this.currentFunctionExpression = null;

		this.image.addFunction(f);
	}
	
	compileAssign(assign) {
		this.compileExpression(assign.right);

		var offset = this.currentFunctionExpression.variables.find(x => x.variable === assign.left.value).offset;

		this.addLine('pop rdx');
		this.addLine(`mov [rbp-${this.currentFunctionExpression.localVariableSize - offset}], rdx`);
	}

	compileIdentifier(expression) {
		var offset = this.currentFunctionExpression.variables.find(x => x.variable === expression.value).offset;		
		// so i couldn't do `push dword [rbp-offset]`, this is the best i could do...
		this.addLine(`mov rdx, [rbp-${this.currentFunctionExpression.localVariableSize - offset}]`);
		this.addLine('push rdx');	
	}

	compileCall(expression) {
		this.addLine(`call ${expression.name.value}`);
	}

	compileExpression(expression) {
		if (expression.type === 'functionDefinition') return this.compileFunctionDefinition(expression);		
		if (expression.type === 'binary') return this.compileBinary(expression);
		if (expression.type === 'assign') return this.compileAssign(expression);
		if (expression.type === 'call') return this.compileCall(expression);		
		if (expression.type === 'identifier') return this.compileIdentifier(expression);
		if (expression.type === 'printInstruction') return this.compilePrintInstruction(expression);
		if (expression.type === 'syscallInstruction') return this.compileSyscallInstruction(expression);
		
		if (expression.type === 'numberLiteral') return this.compileLiteral(expression);

		throw new ParserError(
			'E0005',
			'UnsupportedExpression', 
			`Idk what the fuck a '${expression.type}' expression type is?`, 
			null, 
			null, 
			null,
			this.module
		);
	}

	compilePrintInstruction(expression) {
		this.compileExpression(expression.expression);

		this.addLine('; printing expression result from above');
		this.addLine('pop rsi');
		this.addLine('and rsp, -16', 'align stack with 16bits');
		this.addLine('mov rdi, print_digit_instr', 'preset constant string to print numbers');	
		this.addLine('call _printf');
	}

	compileSyscallInstruction(expression) {
		var reversed_args = expression.arguments.reverse();
		var call = new X86Syscall(expression.name.value, reversed_args, this.image.main);

		for (const arg_expression of reversed_args) {
			this.compileExpression(arg_expression);
		}
		
		call.create();
	}
	

	compile() {
		var expressionList = this.script;

		for (const expression of expressionList) {
			this.compileExpression(expression);
		}

		return this.image;
	}

	addLine(code, comment) {
		if (this.currentFunction !== null) {
			this.currentFunction.addLine(code, comment);
		} else {
			this.image.addMainLine(code, comment);
		}
	}
}

module.exports = Compiler;