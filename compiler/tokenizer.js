const ParserError = require('./errors/parsererror');

class Tokenizer {
	/**
	 * Converts code in tokens
	 * @param {StringStream} input 
	 */
	constructor(input, module) {
		this.input = input;
		this.module = module;
	}

	token(name, content) {
		let pos = this.input.getPosition();

		return {
			type: name,
			value: content,
			position: pos,
		};
	}

	skip() {
		this.input.next();
	}

	readWhile(condition) {
		var out = '';

		while (condition()) {
			out += this.input.next();
		}

		return out;
	}

	readEscaped(end) {
		let escaped = false;
		let str = '';

		this.input.next();

		while (!this.input.eof()) {
			var ch = this.input.next();
			if (escaped) {
				str += ch;
				escaped = false;
			} else if (ch == '\\') {
				escaped = true;
			} else if (ch == end) {
				break;
			} else {
				str += ch;
			}
		}

		return str;
	}

	isWhitespace() {
		return /\s/.test(this.input.peek());
	}

	isNewline() {
		return '\n'.indexOf(this.input.peek()) > -1;
	}

	isDigit(ident) {
		return /^([0-9]+)$/.test(ident || this.input.peek());
	}

	readDigit() {
		return parseInt(this.readWhile(() => this.isDigit()));
	}

	readIdentifier() {
		return this.readWhile(() => this.isIdentifier());
	}

	isOperator() {
		return '/+-*='.indexOf(this.input.peek()) > -1;
	}

	isIdentifier() {
		return /[0-9a-zA-Z_]/.test(this.input.peek());
	}

	isPunctuation() {
		return '.(){};,:'.indexOf(this.input.peek()) > -1;
	}

	isKeyword(id) {
		return ([
			'let',
			'mut',
			'fn',
			'ret',
			'if',
			'else',
			'object'
		].indexOf(id) > -1);
	}

	isInstruction(id) {
		return ([
			'print',
			'syscall'
		].indexOf(id) > -1);
	}

	isString() {
		return this.input.peek() === '"';
	}

	isComment() {
		return this.input.peek() === '#';
	}

	isBooleanOperator() {
		return '><'.indexOf(this.input.peek()) > -1; 
	}

	next() {
		if (this.isWhitespace()) return this.skip();
		// skip comments
		if (this.isComment()) {
			this.readWhile(() => {
				return this.input.peek() !== '\n';
			});
			return;
		}

		if (this.isString()) return this.token('stringLiteral', this.readEscaped('"'));		
		if (this.isPunctuation()) return this.token('punctuation', this.input.next());
		if (this.isOperator()) return this.token('operator', this.input.next());
		if (this.isBooleanOperator()) return this.token('booleanop', this.input.next());
		
		if (this.isIdentifier()) {
			let ident = this.readIdentifier();

			if (this.isKeyword(ident)) {
				return this.token('keyword', ident);
			} else if (this.isInstruction(ident)) {
				return this.token('instruction', ident);
			} else if (this.isDigit(ident)) {
				return this.token('numberLiteral', parseInt(ident));
			}

			return this.token('identifier', ident);
		}

		let p = this.input.getPosition();
		throw new ParserError(
			'E0001',
			'SyntaxError',
			`Unknown character '${this.input.peek()}'`,
			p.line,
			p.column,
			null,
			this.module
		);
	}

	parse() {
		let tokens = [];

		while (!this.input.eof()) {
			let next = this.next();

			if (next) tokens.push(next);
		}

		return tokens;
	}
}

module.exports = Tokenizer;