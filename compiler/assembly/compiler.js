const ParserError = require('../errors/parsererror');
const X86AssemblyImage = require('./x86image');
const X86Function = require('./function');
const X86Syscall = require('./syscall');


class Compiler {
	constructor(ast, module) {
		this.script = ast;
		this.module = module;
		this.image = new X86AssemblyImage();

		// for the labels of blocks to be unique
		this.blockIndex = 0; 

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

	compileCondition(expression) {
		this.compileExpression(expression.left);
		this.compileExpression(expression.right);

		// NOTE: this is incompatible with our standard system, pushing after every
		//		 expression. It should always be followed by a conditional jump.

		this.addLine('pop rax');
		this.addLine('pop rdx');

		this.addLine('cmp rdx, rax');

		return expression.operator;
	}

	compileIfStatement(expression) {
		const op = this.compileCondition(expression.condition);
		let jmpInstruction;

		// this is the inverse instruction, because if it's true
		switch(op) {

		case '>':
			jmpInstruction = 'jl';
			break;
		case '<':
			jmpInstruction = 'jg';
		}

		var blockIndex = this.blockIndex++;		

		this.addLine(`${jmpInstruction} .__if_${blockIndex}_${expression.elseBlock ? 'else' : 'end'}`);
		this.addLine(`.__if_${blockIndex}:`);

		for (const blockExpression of expression.block.expressions) {
			this.compileExpression(blockExpression);
		}

		if (expression.elseBlock) {
			this.addLine(`jmp .__if_${blockIndex}_end`);
			this.addLine('sub rsp, 8');	
					
			this.addLine(`.__if_${blockIndex}_else:`);

			for (const blockExpression of expression.elseBlock.expressions) {
				this.compileExpression(blockExpression);
			}
		}
		
		this.addLine(`.__if_${blockIndex}_end:`);
		// I really don't know what this does tbh, but control flow is broken if i don't
		this.addLine('sub rsp, 8');
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
			f.addLine('sub rsp, 16');
		}

		f.addLine(`sub rsp, ${expression.varsize}`);

		const abiRegs = [
			'rdi', 'rsi', 'rdx', 'rcx', 'r8', 'r9'
		];

		if (this.currentFunctionExpression.args.length > 0) {
			for (const arg of this.currentFunctionExpression.args) {
				var offset = this.currentFunctionExpression.variables.find(
					x => x.name === arg.name
				).offset;

				var src = abiRegs[arg.index];
				if (arg.index >= abiRegs.length) {
					f.addLine('pop rax');
					src = 'rax';
				}

				f.addLine(`mov [rbp-${this.currentFunctionExpression.varsize - offset}], ${src}`);
			}
		}
		
		// do stuff
		for (const ex of expression.expressions) {
			this.compileExpression(ex);			
		}

		if (f.name !== 'start') {
			// restore stack
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
		const abiRegs = [
			'rdi', 'rsi', 'rdx', 'rcx', 'r8', 'r9'
		];

		if (expression.args.length > 0) {
			for (let i = 0; i < expression.args.length; i++) {
				const arg = expression.args[i];
				
				this.compileExpression(arg);
				
				if (abiRegs.length > i) {
					this.addLine(`pop ${abiRegs[i]}`);
				}
			}
		}

		this.addLine(`call ${expression.name.value}`);
		this.addLine('push rax'); //pop the return value
	}

	compileReturn(expression) {
		this.compileExpression(expression.expression);
		this.addLine('pop rax');
		this.addLine('mov rsp, rbp');
		this.addLine('pop rbp');
		this.addLine('ret');
	}

	compileExpression(expression) {	
		if (expression.type === 'binary') return this.compileBinary(expression);
		if (expression.type === 'assign') return this.compileAssign(expression);
		if (expression.type === 'call') return this.compileCall(expression);		
		if (expression.type === 'identifier') return this.compileIdentifier(expression);
		if (expression.type === 'printInstruction') return this.compilePrintInstruction(expression);
		if (expression.type === 'syscallInstruction') return this.compileSyscallInstruction(expression);
		if (expression.type === 'ifStatement') return this.compileIfStatement(expression);
		if (expression.type === 'returnStatement') return this.compileReturn(expression);		
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
		var call = new X86Syscall(expression.name.value, reversed_args, this.currentFunction);

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