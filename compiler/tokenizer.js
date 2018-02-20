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

	isWhitespace() {
		return /\s/.test(this.input.peek());
	}

	isNewline() {
		return '\n'.indexOf(this.input.peek()) > -1;
	}

	isDigit() {
		return /[0-9]/.test(this.input.peek());
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
		return /[a-zA-Z_]/.test(this.input.peek());
	}

	isPunctuation() {
		return '(){};,'.indexOf(this.input.peek()) > -1;
	}

	isKeyword(id) {
		return ([
			'let',
			'mut',
			'fn',
			'ret'
		].indexOf(id) > -1);
	}

	isInstruction(id) {
		return ([
			'print'
		].indexOf(id) > -1);
	}

	next() {
		if (this.isWhitespace()) return this.skip();
		if (this.isPunctuation()) return this.token('punctuation', this.input.next());
		if (this.isDigit()) return this.token('numberLiteral', this.readDigit());
		if (this.isOperator()) return this.token('operator', this.input.next());
		if (this.isIdentifier()) {
			let ident =  this.readIdentifier();

			if (this.isKeyword(ident)) {
				return this.token('keyword', ident);
			} else if (this.isInstruction(ident)) {
				return this.token('instruction', ident);
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