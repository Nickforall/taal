const SyntaxTreeNode = require('./node');

class FunctionDefinition extends SyntaxTreeNode {
	constructor(name) {
		super();

		this.name = name;
		this.variables = [];
		this.expressions = [];
		this.arguments = [];
		this.argsize = -1;
		this.size = 0;
	}

	/**
	 * Adds variable information to the function's scope if it doesn't exist yet
	 * @param {String} name 
	 * @param {Number} sizeof 
	 */
	addVariable(name, sizeof) {
		if (this.variables.find((x) => x.name === name)) return;

		this.variables.push({
			name,
			offset: this.size,
			bytesize: sizeof
		});

		this.size += sizeof;		
	}

	/**
	 * Adds argument information to function
	 * @param {String} name 
	 * @param {Number} sizeof 
	 */
	addArgument(name, sizeof) {
		if (this.arguments.find((x) => x.name === name)) return;
		
		this.arguments.push({
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

	/**
	 * Returns a js object that represents this function
	 * @returns {Object}
	 */
	serialize() {
		return {
			type: 'functionDefinition',
			variables: this.variables,
			varsize: this.size,
			args: this.arguments,
			name: this.name,
			namespace: [],
			expressions: this.expressions,
		};
	}
}

module.exports = FunctionDefinition;