const fs = require('fs');
const chalk = require('chalk');

class ParserError extends Error {
	constructor(code, name, message, line, column, token, module) {
		super(message);

		this.code = code;
		this.name = name;
		this.line = line;
		this.column = column;
		this.token = token;
		this.module = module;

		if (this.module) {
			this.source = fs.readFileSync(this.module).toString('utf8');
		}
	}

	getTitle() {
		return `[${this.code}] ${this.name}`;
	}

	getMessage() {
		return `${this.message} at ${this.line}:${this.column}` 
			+ (module ? ` in ${this.module.split('/')[this.module.split('/').length - 1]}` : '');
	}

	getSourceContext() {
		let lines = this.source.split('\n');
		let line = lines[this.line];

		var lineNumber = '' + (this.line + 1);

		let context = '';

		if (this.line + 1 < 100) {
			lineNumber = '0' + lineNumber;
		}

		if (this.line + 1 < 10) {
			lineNumber = '0' + lineNumber;
		}

		context += `${chalk.gray(lineNumber + '|')} ${line}`;
		context += '\n     ';
		
		var end = this.column;
		if (this.token) {
			var start = end - this.token.value.length;

			for (let i = 0; i < start - 1; i++) {
				context += ' ';
			}

			for (let i = 0; i < end - start; i++) {
				context += '^';
			}
		} else {
			for (let i = 0; i < end - 1; i++) {
				context += ' ';
			}

			context += '^';
		}

		return context;
	}
}

module.exports = ParserError;