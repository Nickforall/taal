class X86_64AssemblyImage {
	constructor() {
		this.mainFunction = '';
	}

	addMainLine(line, comment) {
		this.mainFunction += '\t' + line + (comment ? ' ; ' + comment : '') + '\n';
	}

	getMainFunction() {
		let func = '\nstart:\n';

		func += '\t; setup the stack frame\n';
		func += '\tpush rbp\n';
		func += '\tmov rbp, rsp\n\n';

		func += this.mainFunction;

		// exit script
		func += '\t;exit with code 0\n';
		func += '\tadd rsp, 16\n';		
		func += '\tmov rdi, 0\n';
		func += '\tcall _exit\n';

		return func;
	}

	get() {
		let script = '';

		script += 'section .text\n';
		script += 'global start\n';
		script += 'extern _printf\n';
		script += 'extern _exit\n';

		script += this.getMainFunction();

		script += '\n';
		script += 'section .data\n';
		script += '\tprint_digit_instr: db "%d", 0x0a, 0x00\n';

		return script;
	}
}

module.exports = X86_64AssemblyImage;