const SyntaxTreeNode = require('./node');

class FunctionDefinition extends SyntaxTreeNode {
	constructor(name) {
		super('function');

		this.name = name;
		this.variables = [];
		this.expressions = [];
		this.args = [];
		this.argsize = -1;
		this.varsize = 0;
	}

	/**
	 * Adds variable information to the function's scope if it doesn't exist yet
	 * @param {String} name 
	 * @param {Number} sizeof 
	 * @param {Object} addition
	 */
	addVariable(name, bytesize, addition) {
		if (this.variables.find((x) => x.name === name)) return;
		this.variables.push({
			name,
			offset: this.varsize,
			bytesize,
			addition
		});

		this.varsize += bytesize;		
	}

	/**
	 * Adds argument information to function
	 * @param {String} name 
	 * @param {Number} sizeof 
	 */
	addArgument(name, sizeof) {
		if (this.args.find((x) => x.name === name)) return;
		
		this.args.push({
			name,
			index: ++this.argsize,
			bytesize: sizeof
		});

		this.addVariable(name, sizeof);
	}

	/**
	 * Sets the AST block node to the function
	 * @param {Object} block 
	 */
	setBlock(block) {
		this.expressions = block.expressions;
	}

	toJSON() {
		const obj = { ...this };
		delete obj.argsize;

		return obj;
	}
}

module.exports = FunctionDefinition;