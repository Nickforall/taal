class StringStream {
	constructor (input) {
		this.input = input;
		this.cursor = -1;

		this.line = 0;
		this.column = 1;
	}

	peek() {
		return this.input[this.cursor + 1];
	}

	next() {
		let data = this.input[++this.cursor];

		if (data == '\n') {
			this.line++;
			this.column = 0;
		} else {
			this.column++;
		}

		return data;
	}

	getPosition() {
		return {
			line: this.line,
			column: this.column
		};
	}

	eof() {
		return  this.cursor + 1 >= this.input.length;
	}
}

module.exports = StringStream;