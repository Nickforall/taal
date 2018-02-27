const Tokenizer = require('./compiler/tokenizer');
const StringStream = require('./compiler/stringstream');
const Parser = require('./compiler/parser');
const Compiler = require('./compiler/assembly/compiler');
const Runner = require('./compiler/processes/runner');

const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

class Taal {
	static compileFile(p, outputname) {
		let f = fs.readFileSync(
			p
		).toString('utf8');

		return new Promise((resolve, reject) => {
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
	
				runner.run().then((name, fullpath) => {
					resolve(name, fullpath);
				}).catch((ex) => {
					reject(ex);
				});
	
			} catch (ex) {
				reject(ex);
			}
		});
	}
}

module.exports = Taal;