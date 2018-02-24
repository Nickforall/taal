const ParserError = require('./errors/parsererror');
const FunctionDefinition = require('./ast/functiondefinition');

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
	 * Returns the next token without the position object and moves the cursor 
	 */
	nextClean() {
		let next = Object.assign({}, this.next());
		delete next.position;

		return next;
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
	 * Nexts w/o position if match, errors otherwise
	 * @param {String} type 
	 * @param {String} val 
	 */
	nextCleanIf(type, val) {
		if (this.is(type, val)) {
			return this.nextClean();
		} else {
			throw new ParserError(
				'E0002',
				'UnexpectedToken',
				`Unexpected token ${this.peek().value}, expected: '${val}'`, 
				this.peek().position.line, 
				this.peek().position.column, 
				null,
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
		var token = this.is('operator');

		if (token) {
			var rightPrecedence = PRECEDENCE[token.value];

			var type = (token.value === '=' ? 'assign' : 'binary');

			if (type == 'assign' && left.type == 'identifier') {
				var varName = left.value;

				if (this.currentFunction !== null) {
					this.currentFunction.addVariable(varName, 4);
				} else {			
					this.main.addVariable(varName, 4);
				}
			}

			if (rightPrecedence > precedence) {
				this.next();
				return this.maybeBinary({
					type,
					operator: token.value,
					left,
					right: this.maybeBinary(this.parseAtom(), rightPrecedence),
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
		this.currentFunction = new FunctionDefinition(this.nextCleanIf('identifier').value);

		// parse the block
		this.currentFunction.setBlock(this.parseBlock());

		// copy local
		var functionObject = this.currentFunction.serialize();

		// set back to null
		this.currentFunction = null;

		// return the currentFunction
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
	 * Parses some part of code
	 */
	parseAtom() {
		if (this.is('keyword', 'fn')) {
			this.functions.push(this.parseFunction());
			return;
		}

		// parse binary within parenthesis first, because math
		if (this.is('punctuation', '(')) return this.parseParenthesisBinary();
		if (this.is('instruction', 'print')) return this.parsePrintInstruction();
		if (this.is('instruction', 'syscall')) return this.parseSyscallInstruction();
					
		if (this.is('keyword', 'ret')) return this.parseReturn();

		let peek = this.peek();
		if (peek.type === 'numberLiteral') return this.nextClean();
		if (peek.type === 'identifier') return this.nextClean();

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

		let fObj = this.main.serialize();
		fObj.isEntry = true;

		this.functions.unshift(fObj);

		return {
			type: 'script',
			functions: this.functions
		};
	}
}

module.exports = Parser;