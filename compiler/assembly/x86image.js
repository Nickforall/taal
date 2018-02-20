const AssemblyFunction = require('./function');

class X86_64AssemblyImage {
	constructor() {
		this.mainFunction = '';
		// this is the entry point of our application
		this.main = new AssemblyFunction('start');

		this.main.addLine('; setup stack frame');
		this.main.addLine('push rbp');
		this.main.addLine('mov rbp, rsp');
		
		this.externs = [
			'printf',
			'exit'
		];
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

	serialize() {
		let script = '';

		script += 'section .text\n';
		script += 'global start\n';

		for (const extern of this.externs) {
			script += `extern _${extern}\n`;
		}

		// don't be confused, this is AFTER the main function instructions!
		this.main.addLine('; exit with zero code');
		this.main.addLine('sub rsp, 16');
		this.main.addLine('mov rdi, 0');
		this.main.addLine('call _exit');

		script += this.main.serialize();

		script += 'section .data\n';
		script += '\tprint_digit_instr: db "%d", 0x0a, 0x00\n';

		return script;
	}
}

module.exports = X86_64AssemblyImage;