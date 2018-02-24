const AssemblyFunction = require('./function');

class X86_64AssemblyImage {
	constructor() {
		this.mainFunction = '';
		// this is the entry point of our application
		this.main = new AssemblyFunction('start');

		this.main.addLine('; setup stack frame');
		this.main.addLine('push rbp');
		this.main.addLine('mov rbp, rsp');
		this.main.addLine('add rsp, 16', 'align stack with 16bits');
		
		this.externs = [
			'printf',
			'exit'
		];

		this.functions = [];
	}

	/**
	 * Adds an `extern` statement to the top of the file
	 * @param {String} name 
	 */
	linkWithC(name) {
		this.externs.push(name);
	}

	/**
	 * Adds a line to the main function
	 * @param {String} line 
	 * @param {String} comment 
	 */
	addMainLine(line, comment) {
		this.main.addLine(line, comment);
	}

	addFunction(fun) {
		this.functions.push(fun);
	}

	serialize() {
		let script = '';

		script += 'section .text\n';
		script += 'global start\n';

		for (const extern of this.externs) {
			script += `extern _${extern}\n`;
		}

		for (const f of this.functions) {
			script += '\n';
			script += f.serialize();
		}

		script += 'section .data\n';
		script += '\tprint_digit_instr: db "%d", 0x0a, 0x00\n';

		return script;
	}
}

module.exports = X86_64AssemblyImage;