const ParserError = require('./errors/parsererror');

const PRIMITIVES = {
	'i32': 8, // wrong but everything is an i64 for now
	'i64': 8,
};

class TypeStore {
	constructor() {
		this.definitions = {};
	}

	getDefinition(name) {
		if (PRIMITIVES[name] !== undefined) {
			return {
				kind: 'primitive',
				name,
				size: PRIMITIVES[name]
			};
		}

		if (this.definitions[name]) {
			return {
				... this.definitions[name],
				kind: 'declared',
			};
		}

		throw new ParserError(
			'E0009',
			'UndefinedTypeError',
			`You tried using the undefined type ${name}`, 
			0, 
			0, 
			0,
		);
	}

	addDefinition(name, object, size) {
		if (this.definitions[name] !== undefined) {
			throw new ParserError(
				'E0008',
				'TypeRedefinitionError',
				`You tried redeclaring the type ${name}`, 
				0, 
				0, 
				0,
			);
		}

		this.definitions[name] = {
			object,
			size,
			name
		};
	}
}

module.exports = TypeStore;