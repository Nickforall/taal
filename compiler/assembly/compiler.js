const ParserError = require('../errors/parsererror');
const X86AssemblyImage = require('./x86image');
const X86Syscall = require('./syscall');


class Compiler {
	constructor(ast, module) {
		this.script = ast;
		this.module = module;
		this.image = new X86AssemblyImage();
	}

	compileBinary(binary) {
		this.image.addMainLine(';' 
			+ binary.left.value + ' ' 
			+ binary.operator + ' ' 
			+ binary.right.value
		);

		this.compileExpression(binary.right);
		this.compileExpression(binary.left);
		this.image.addMainLine('pop rax');

		switch (binary.operator) {
			
		case '*':
			this.image.addMainLine('imul rax, [rsp]');
			break;
		case '+':
			this.image.addMainLine('add rax, [rsp]');
			break;
		case '-':
			this.image.addMainLine('sub rax, [rsp]');
			break;

		}

		this.image.addMainLine('pop rdx');
		this.image.addMainLine('push rax');
	}

	compileLiteral(expression) {
		this.image.addMainLine('push ' + expression.value);
	}

	compileExpression(expression) {
		if (expression.type == 'binary') return this.compileBinary(expression);
		if (expression.type == 'printInstruction') return this.compilePrintInstruction(expression);
		if (expression.type == 'syscallInstruction') return this.compileSyscallInstruction(expression);
		
		if (expression.type == 'numberLiteral') return this.compileLiteral(expression);

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

		this.image.addMainLine('; printing expression result from above');
		this.image.addMainLine('pop rsi');
		this.image.addMainLine('add rsp, 16', 'align stack with 16bits');
		this.image.addMainLine('mov rdi, print_digit_instr', 'preset constant string to print numbers');	
		this.image.addMainLine('call _printf');
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
}

module.exports = Compiler;