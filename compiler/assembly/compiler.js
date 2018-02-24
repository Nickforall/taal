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

		var source = '[rsp]';

		if (binary.right.type === 'numberLiteral' && !global.TAAL_CONFIG.skipOptimization) {
			source = `${binary.right.value}`;
		} else {
			this.compileExpression(binary.right);
		}

		this.compileExpression(binary.left);
		this.addLine('pop rax');

		switch (binary.operator) {
		case '*':
			this.addLine(`imul rax, ${source}`);
			break;
		case '+':
			this.addLine(`add rax, ${source}`);
			break;
		case '-':
			this.addLine(`sub rax, ${source}`);
			break;
		}

		this.addLine('pop rdx');
		this.addLine('push rax');
	}

	compileLiteral(expression) {
		this.addLine(`push ${expression.value}`);
	}

	compileFunctionDefinition(expression) {
		var f = new X86Function(expression.name);

		this.currentFunction = f;
		this.currentFunctionExpression = expression;

		// setup stack
		f.addLine('push rbp');
		f.addLine('mov rbp, rsp');

		if (f.name == 'start') {
			f.addLine('add rsp, 16');
		}

		f.addLine(`sub rsp, ${expression.varsize}`);
		
		// do stuff
		for (const ex of expression.expressions) {
			this.compileExpression(ex);			
		}

		if (f.name !== 'start') {
			// restore stack jizz
			f.addLine('mov rsp, rbp');
			f.addLine('pop rbp');
			// return
			f.addLine('ret');
		}

		this.currentFunction = null;
		this.currentFunctionExpression = null;

		return f;
	}
	
	compileAssign(assign) {
		this.compileExpression(assign.right);

		var offset = this.currentFunctionExpression.variables.find(x => x.name === assign.left.value).offset;

		this.addLine('pop rdx');
		this.addLine(`mov [rbp-${this.currentFunctionExpression.varsize - offset}], rdx`);
	}

	compileIdentifier(expression) {
		var offset = this.currentFunctionExpression.variables.find(x => x.name === expression.value).offset;		
		// so i couldn't do `push dword [rbp-offset]`, this is the best i could do...
		this.addLine(`mov rdx, [rbp-${this.currentFunctionExpression.varsize - offset}]`);
		this.addLine('push rdx');	
	}

	compileCall(expression) {
		this.addLine(`call ${expression.name.value}`);
	}

	compileExpression(expression) {	
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
		for (const f of this.script.functions) {
			let asmf = this.compileFunctionDefinition(f);

			if(f.isEntry) {
				asmf.addLine('; exit with zero code');
				asmf.addLine('and rsp, -16');
				asmf.addLine('mov rdi, 0');
				asmf.addLine('call _exit');
			}
			
			this.image.addFunction(asmf);
		}

		return this.image;
	}

	addLine(code, comment) {
		if (this.currentFunction !== null) {
			this.currentFunction.addLine(code, comment);
		} else {
			throw Error('why are we not in a function');
		}
	}
}

module.exports = Compiler;