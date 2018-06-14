const ParserError = require('./errors/parsererror');
const FunctionDefinition = require('./ast/functiondefinition');
const ObjectDefinition = require('./ast/objectdefinition');

const TypeStore = require('./typestore');

const PRECEDENCE = {
	'=': 1,
	'||': 2,
	'&&': 3,
	'<': 7, '>': 7, '<=': 7, '>=': 7, '==': 7, '!=': 7,
	'+': 10, '-': 10,
	'*': 20, '/': 20, '%': 20,
};

class Parser {
	constructor(tokens, module) {
		this.tokens = tokens;
		this.module = module;
		this.cursor = -1;		

		this.main = new FunctionDefinition('start');
		this.currentFunction = null;
		this.functions = [];
		this.typestore = new TypeStore();

		if (global.TAAL_CONFIG.debug) console.log(tokens);
	}

	/** 
	 * Returns the next token and moves the cursor
	 */
	next() {
		if (this.peek() == undefined) {
			throw new ParserError(
				'E0004',
				'UnexpectedEOF',
				'The file ended, but the last expression wasn\'t finished yet', 
				this.activeToken().position.line, 
				this.activeToken().position.column, 
				this.activeToken(),
				this.module
			);
		}

		return this.tokens[++this.cursor];
	}

	/**
	 * Returns the active token
	 */
	activeToken() {
		return this.tokens[this.cursor];
	}

	/**
	 * Returns the next token without moving the cursor
	 */
	peek() {
		return this.tokens[this.cursor + 1];
	}

	/**
	 * Nexts if match, errors otherwise
	 * @param {String} type 
	 * @param {String} val 
	 */
	nextIf(type, val) {
		if (this.is(type, val)) {
			return this.next();
		} else {
			throw new ParserError(
				'E0002',
				'UnexpectedToken',
				`Unexpected token ${this.peek().value}, expected: '${val}'`, 
				this.peek().position.line, 
				this.peek().position.column, 
				this.peek(),
				this.module
			);
		}
	}

	/**
	 * Checks whether a peeked value is of a certain type and value
	 * @param {String} type 
	 * @param {String} val 
	 */
	is(type, val) {
		var tok = this.peek();
		return tok && tok.type == type && (!val || tok.value == val) && tok;
	}

	/**
	 * Skips a token if it matches the given value and type, errors if the next token doesn't match
	 * @param {String} type 
	 * @param {String} val 
	 */
	skip(type, val) {
		if (this.is(type, val)) {
			this.next();
		} else {
			throw new ParserError(
				'E0002',
				'UnexpectedToken',
				`Unexpected token '${this.peek().value}', expected: '${val}'`, 
				this.peek().position.line, 
				this.peek().position.column, 
				this.peek(),
				this.module
			);
		}
	}

	/**
	 * Skips a token if it matches the given value and type
	 * @param {String} type 
	 * @param {String} val 
	 */
	optionalSkip(type, val) {
		if (this.is(type, val)) {
			this.next();
			return true;
		}

		return false;
	}

	/**
	 * Parses something delimited by 2 characters, seperated by x or parser function
	 * @param {String} start starting punctuation
	 * @param {String} stop ending punctuation
	 * @param {String|Null} separator seperator of the delimited list
	 * @param {Function} parser whatever to do every item
	 */
	delimited(start, stop, separator, parser) {
		var items = [];
		var first = true;

		this.skip('punctuation', start);

		while (this.peek() !== undefined) {
			if (this.is('punctuation', start)) break;

			if (first) {
				first = false;
				
			}

			if (this.is('punctuation', stop)) break;
			
			// parse the delimited expression
			items.push(parser());

			// check if we're at the last, break if we are
			if (this.is('punctuation', stop)) break;

			// if we aren't, skip punctuation
			if (separator) this.skip('punctuation', separator);
		}

		this.skip('punctuation', stop);

		return items;
	}

	/** 
	 * Parses a code block
	 */
	parseBlock() {
		var program = this.delimited('{', '}', null, this.parseExpression.bind(this));
		return {
			type: 'block',
			expressions: program
		};
	}

	/**
	 * Parses a binary expression
	 * @param {Object} left left token or expression
	 * @param {Number} precedence the right's part precedence number
	 */
	maybeBinary(left, precedence) {
		var token = this.is('operator') || this.is('booleanop');

		if (token) {
			var rightPrecedence = PRECEDENCE[token.value];

			var operator = 'binary';
			if (token.type == 'booleanop') {
				operator = 'compare';
			}

			var type = (token.value === '=' ? 'assign' : operator);

			if (type == 'assign' && left.type == 'identifier') {
				var varName = left.value;

				if (this.currentFunction !== null) {
					this.currentFunction.addVariable(varName, 8);
				} else {			
					this.main.addVariable(varName, 8);
				}
			}

			if (rightPrecedence > precedence) {
				this.next();
				return this.maybeBinary({
					type,
					operator: token.value,
					left,
					right: this.maybeBinary(this.parseExpressionNoBinary(), rightPrecedence),
				}, precedence);
			}
		}

		return left;
	}

	/** 
	 * Handles parenthesis in a binary expression
	 */
	parseParenthesisBinary() {
		this.next();
		var expression = this.parseExpression();
		this.skip('punctuation', ')');
		return expression;
	}

	/** 
	 * Parses a function
	 */
	parseFunction() {
		// skip 'fn' keyword
		this.next();

		if (this.currentFunction !== null) {
			throw new ParserError(
				'E0007',
				'NestedFunctionError',
				'You are not allowed to nest named functions...', 
				this.peek().position.line, 
				this.peek().position.column, 
				this.peek(),
				this.module
			);
		}

		// the function expression
		this.currentFunction = new FunctionDefinition(this.next('identifier').value);

		if (this.is('punctuation', '(')) {
			var args = this.delimited('(', ')', ',', this.parseExpression.bind(this));
			for (const a of args) {
				if (a.type !== 'identifier') throw new ParserError(
					'E0002',
					'UnexpectedToken',
					`Unexpected token ${a.value}, expected an identifier`, 
					this.peek().position.line, 
					this.peek().position.column, 
					this.peek(),
					this.module
				);

				this.currentFunction.addArgument(a.value, 8);
			}
		}

		// parse the block
		this.currentFunction.setBlock(this.parseBlock());

		// move to local variable
		var functionObject = this.currentFunction;

		// set global back to null
		this.currentFunction = null;

		// return the local
		return functionObject;
	}

	/** 
	 * Parses a return statement
	 */
	parseReturn() {
		// skip the keyword
		this.skip('keyword', 'ret');

		if (this.currentFunction === null) {
			throw new ParserError(
				'E0003',
				'ReturnScopeError',
				'Unexpected return statement, \'ret\' should always be placed inside a function block.', 
				this.peek().position.line, 
				this.peek().position.column, 
				this.peek(),
				this.module
			);
		}

		return {
			type: 'returnStatement',
			expression: this.parseExpression()
		};
	}

	/** 
	 * Parses an if-statement
	 */
	parseIf() {
		this.skip('keyword', 'if');

		const condition = this.parseExpression();
		const block = this.parseBlock();

		let elseBlock;

		if (this.is('keyword', 'else')) {
			this.skip('keyword', 'else');

			elseBlock = this.parseBlock();
		}

		return {
			condition,
			block,
			elseBlock,
			type: 'ifStatement'
		};
	}

	/**
	 * Parses a call
	 * @param {Object} expression the expression that makes up the function
	 */
	parseCall(expression) {
		return {
			type: 'call',
			name: expression,
			args: this.delimited('(', ')', ',', this.parseExpression.bind(this)),
		};
	}

	/**
	 * Parses the print instruction
	 */
	parsePrintInstruction() {
		// skip the keyword
		this.next();

		return {
			type: 'printInstruction',
			expression: this.parseExpression()
		};
	}

	/**
	 * Parses a syscall instruction
	 */
	parseSyscallInstruction() {
		// skip the keyword
		this.next();

		let name = this.nextIf('stringLiteral');
		let args = this.delimited('(', ')', ',', this.parseExpression.bind(this));

		if (args.length > 8) {
			throw new ParserError(
				'E0006',
				'SyscallExceedingArguments',
				`Syscall ${name.value} has more than the maximum amount of arguments for a syscall (8)\n\tExpected a maximum of ${8}, received ${args.length}`, 
				name.position.line, 
				name.position.column, 
				name,
				this.module
			);
		}

		delete name.position;

		return {
			type: 'syscallInstruction',
			name: name,
			arguments: args
		};
	}

	/**
	 * Parses an object definition
	 */
	parseObject() {

		this.nextIf('keyword', 'object');
		const name = this.next('identifier');
		this.skip('punctuation', '{');

		const definition = new ObjectDefinition(name);
		let methods = [];

		while (!this.is('punctuation', '}')) {
			if (this.is('identifier')) {
				let prop = this.parseObjectProperty();
				definition.createProperty(prop.name, prop.type.size);
				continue;
			}

			if (this.is('keyword', 'fn')) {
				methods.push(this.parseFunction());
				continue;
			}

			throw new ParserError(
				'E0002',
				'UnexpectedToken',
				`Unexpected token ${this.peek().value}, expected an identifier or function`, 
				this.peek().position.line, 
				this.peek().position.column, 
				this.peek(),
				this.module
			);
		}

		this.skip('punctuation', '}');

		var node = definition;

		this.typestore.addDefinition(name, node, definition.size);

		return node;
	}

	/**
	 * Parses a property in an object definition
	 */
	parseObjectProperty() {
		let propertyObject = {
			name: this.next(),
		};

		this.skip('punctuation', ':');

		let typeName = this.nextIf('identifier').value;
		propertyObject.type = this.typestore.getDefinition(typeName);

		return propertyObject;
	}

	/**
	 * Parses a `let` expression
	 */
	parseBinding() {
		this.nextIf('keyword', 'let');

		let bindingObject = {
			type: 'binding',
			name: this.parseIdentifier(),
		};

		if (this.is('punctuation', ':')) {
			bindingObject.valueType = this.parseBindingValueType();
		}

		// TODO: optimize
		if (this.currentFunction !== null) {
			this.currentFunction.addVariable(
				bindingObject.name.value, 
				bindingObject.valueType.size,
				bindingObject.valueType
			);
		} else {			
			this.main.addVariable(
				bindingObject.name.value, 
				bindingObject.valueType.size,
				bindingObject.valueType				
			);
		}

		return bindingObject;
	}

	/**
	 * Parses the type of a let expression
	 */
	parseBindingValueType() {
		this.nextIf('punctuation', ':');

		return this.typestore.getDefinition(this.nextIf('identifier'));
	}

	/**
	 * Parses an identifier
	 */
	parseIdentifier() {
		const ident = this.next('identifier');
		if (this.is('punctuation', '.')) {
			this.skip('punctuation', '.');
			ident.child = this.parseIdentifier();
		}

		return ident;
	}

	/** 
	 * Parses some part of code
	 */
	parseAtom() {
		if (this.is('keyword', 'fn')) {
			this.functions.push(this.parseFunction());
			return;
		}

		if (this.is('keyword', 'object')) return this.parseObject();
		if (this.is('keyword', 'if')) return this.parseIf();
		if (this.is('keyword', 'let')) return this.parseBinding();

		// parse binary within parenthesis first, because math
		if (this.is('punctuation', '(')) return this.parseParenthesisBinary();
		if (this.is('instruction', 'print')) return this.parsePrintInstruction();
		if (this.is('instruction', 'syscall')) return this.parseSyscallInstruction();
					
		if (this.is('keyword', 'ret')) return this.parseReturn();
		if (this.is('identifier')) return this.parseIdentifier();

		let peek = this.peek();
		if (peek.type === 'numberLiteral') return this.next();

		throw new ParserError(
			'E0002',
			'UnexpectedToken',
			`Unexpected token ${peek.value}, but I don't really know what I expected either`, 
			peek.position.line, 
			peek.position.column, 
			peek,
			this.module
		);
	}

	/**
	 * Parses a simple expression
	 */
	parseExpression() {
		return this.maybeCall(() => {
			let atom = this.parseAtom();
			if (atom) {
				return this.maybeBinary(atom, 0);
			}
		});
	}

	/**
	 * Parses a simple expression inside a binary (never returns binary expression)
	 */
	parseExpressionNoBinary() {
		return this.maybeCall(() => {
			return this.parseAtom();
		});
	}

	/**
	 * There might be a call, check for it or return the result of the function
	 * @param {Function} exprHandler 
	 */
	maybeCall(exprHandler) {
		let expression = exprHandler();
		return this.is('punctuation', '(') ? this.parseCall(expression) : expression;
	}

	/** 
	 * A function that keeps on parsing until we run out of token 
	 */
	parse() {
		let mainFunctionBlock = [];

		while (this.peek() !== undefined) {
			let expr = this.parseExpression();
			if(expr) mainFunctionBlock.push(expr);

			if (this.peek() !== undefined) {
				this.optionalSkip('punctuation', ';');
			}
		}

		this.main.setBlock({
			expressions: mainFunctionBlock
		});

		let fObj = this.main;
		fObj.isEntry = true;

		this.functions.unshift(fObj);

		return {
			type: 'script',
			functions: this.functions
		};
	}
}

module.exports = Parser;