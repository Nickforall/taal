// TODO: make a more complete list
const OSXCALLS = {
	'exit': 0x2000001,
	'fork': 0x2000002,
	'read': 0x2000003,
	'write': 0x2000004,
	'open': 0x2000005,
	'close': 0x2000006,
};

const ORDER = [
	'rdi',
	'rsi',
	'rdx',
	'rcx',
	'r8',
	'r9',
];

/**
 * X86SysCall is a class that constructs system calls
 */
class X86Syscall {
	/**
	 * 
	 * @param {String} name the syscall's name as documented 
	 * @param {Array} args the arg
	 * @param {X86Function} fn 
	 */
	constructor (name, args, fn) {
		this.name = name;
		this.args = args;
		this.fn = fn;
	}

	/**
	 * Creates the syscall in the main function
	*/
	create() {
		this.fn.addLine(`; syscall ${this.name}`);
		this.fn.addLine(`mov rax, ${OSXCALLS[this.name]}`);

		for (let index = 0; index < this.args.length; index++) {
			this.fn.addLine(`pop ${ORDER[index]}`);			
		}
		
		this.fn.addLine('syscall');
	}
}

module.exports = X86Syscall;