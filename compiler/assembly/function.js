class X86Function {
	constructor(name) {
		this.name = name;
		this.buffer = '';

		this.lines = [];
	}

	addLine(line, comment) {
		this.lines.push(line + (comment ? ' ; ' + comment : ''));
	}

	stripComment(line) {
		var splitted = line.split(';');
		
		if (splitted[0] == '') {
			return {
				expression: ';',
				comment: splitted[1]
			};
		}

		if (splitted[0].length > 1) {
			let expr = splitted[0];
			splitted.shift();
			return {
				expression: expr,
				comment: ';' + splitted.join(';')
			};
		}

		return {
			expression: splitted[0],
			comment: ''
		};
	}

	/**
	 * This is a temporary optimization script that moves something like
	 * ```assembly
	 * push rax
	 * pop rdx
	 * ```
	 * to 
	 * ```assembly
	 * mov rdx, rax
	 * ```
	 */
	optimize() {
		var optimized = [];

		// copy our lines
		var ourLines = this.lines;

		// loop through lines
		for (let index = 0; index < ourLines.length; index++) {
			var l = ourLines[index];

			// if we did stuff to this line, we have set it to null, so we can skip it
			if (l === null) {
				continue;
			}

			// get the expression from a line
			let lineObject = this.stripComment(l);
			l = lineObject.expression;

			// check whether our is a push
			var instructionParts = l.split(' ');
			if (instructionParts[0].trim() === 'push') {
				var from = instructionParts[1]; // save the from address

				// check whether the next one is a pop
				var nextLine = this.lines[index + 1];
				var nextLineArray = nextLine.split(' ');
				if (nextLineArray[0].trim() == 'pop') {
					var to = nextLineArray[1]; // also save the to address
					// we're doing an optimization and removing the next expression to merge it into the current.
					ourLines[index + 1] = null; 

					// push the optimized expression
					optimized.push(`mov ${to}, ${from}`);
					continue;
				}
			}

			// add comments
			if (lineObject.comment) {
				l += lineObject.comment;
			}
			
			// if the line is empty, we move on.
			if (!l.length) {
				continue;
			}

			optimized.push(l);
		}

		this.lines = optimized;
	}

	serialize() {
		let section = this.name + ':\n';

		if (!global.TAAL_CONFIG.skipOptimization) this.optimize();

		this.addLine('\n');

		section += this.lines.join('\n\t'); 

		return section;
	}
}

module.exports = X86Function;