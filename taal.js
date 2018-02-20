class Taal {
	static compileFile(p, outputname) {
		const Tokenizer = require('./compiler/tokenizer');
		const StringStream = require('./compiler/stringstream');
		const Parser = require('./compiler/parser');
		const Compiler = require('./compiler/assembly/compiler');
		const ParserError = require('./compiler/errors/parsererror');
		const Runner = require('./runner');

		const chalk = require('chalk');
		const fs = require('fs');
		const path = require('path');

		let f = fs.readFileSync(
			p
		).toString('utf8');

		try {
			let script = new Parser(
				new Tokenizer(
					new StringStream(f),
					p
				).parse(),
				p
			).parse();

			if (global.TAAL_CONFIG.debug) console.log(JSON.stringify(script, null, 4));		

			let c = new Compiler(script, p);
			let binary = c.compile();

			let runner = new Runner(outputname, binary);
			runner.run();

		} catch (error) {
			if (error instanceof ParserError) {
				console.log(chalk.red(error.getTitle() + ':') + '\n' + error.getMessage());
				console.log('\n' + error.getSourceContext() + '\n');

				console.log(chalk.red('exiting compilation, compilation failed.'));
				process.exit(2);
			}

			console.log(error.stack);
			process.exit(2);
		}
	}
}

module.exports = Taal;