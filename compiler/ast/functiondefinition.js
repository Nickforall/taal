const SyntaxTreeNode = require('./node');

class FunctionDefinition extends SyntaxTreeNode {
	constructor(name) {
		super();

		this.name = name;
		this.variables = [];
		this.expressions = [];
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
			name: name,
			offset: this.size,
			bytesize: sizeof
		});

		this.size += sizeof;		
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
			name: this.name,
			namespace: [],
			expressions: this.expressions,
		};
	}
}

module.exports = FunctionDefinition;