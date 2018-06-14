const SyntaxTreeNode = require('./node');

class ObjectDefinition extends SyntaxTreeNode {
	constructor(name) {
		super('objectDefinition');

		this.name = name;
		this.properties = [];
		this.functions = [];
	}

	get size() {
		let s = 0;
		for (const v of this.properties) {
			s += v.size;
		}

		return s;
	}

	/**
	 * Adds a property to the structure of this object definition
	 * @param {String} name The name of the given property
	 * @param {Number} size The size of the given property in bytes
	 */
	createProperty(name, size) {
		this.properties.push({
			name, size, offset: this.size
		});
	}
	
	/**
	 * Gets the property of a struct
	 * @param {String} name 
	 */
	getProperty(name) {
		const prop = this.properties.find(obj => obj.name === name);

		if (!prop) {
			//TODO: proper error handling!
			throw new Error('unknown property');
		}

		return prop;
	}
}

module.exports = ObjectDefinition;