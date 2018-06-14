#!/usr/bin/env node

const ParserError = require('./compiler/errors/parsererror');
const AssemblerProcessException = require('./compiler/processes/exceptions/assembler');
const LinkerException = require('./compiler/processes/exceptions/linker');

global.TAAL_START_COMPILE_DATE = Date.now();
global.TAAL_CONFIG = {
	debug: false,
	preserveTemp: false,
	skipOptimization: true,
	dumpJson: false
};

const Taal = require('./taal');
const path = require('path');
const chalk = require('chalk');
const program = require('commander');

program.version('0.1.0')
	.usage('[options] <file>')
	.option('-o, --output [name]', 'Output file name')
	.option('-d, --debug', 'Whether we push all kinds of gibberish to stdout when compiling')
	.option('-t, --temporary', 'Preserves the temporary assembly files')
	.option('-j, --json-dump', 'Dumps json of AST into tmp')
	.option('--skip-optimization', 'Skips optimization steps')	
	.parse(process.argv);

if(program.args.length < 1) {
	console.log(chalk.red('No file given.'));
	process.exit(1);
}

if(process.platform !== 'darwin') {
	console.log(chalk.red('We currently only support x86_64 on darwin (MacOS) platforms.'));
	process.exit(1);
}

global.TAAL_CONFIG.debug = program.debug;
// global.TAAL_CONFIG.skipOptimization = program.skipOptimization;
global.TAAL_CONFIG.preserveTemp = program.temporary;
global.TAAL_CONFIG.dumpJson = program.jsonDump;

Taal.compileFile(
	path.join(process.cwd(), program.args[0]), 
	program.output ? program.output : 'executable'
).then((obj) => {
	console.log(chalk.green(`Succesful compilation of binary '${obj.name}', finished in ${Date.now() - global.TAAL_START_COMPILE_DATE}ms!`));					
	process.exit(0);
}).catch((ex) => {
	console.log(chalk.red(`compilation failed ${process.platform === 'darwin' ? '\uD83D\uDE2D' : ':('}`));
				
	if (ex instanceof LinkerException) {
		process.stderr.write(ex.stderr);
		console.log(chalk.red(`linker process exited with code ${ex.code}`));
		process.exit(3);		
	} else if (ex instanceof AssemblerProcessException) {
		process.stderr.write(ex.stderr);
		console.log(chalk.red(`assembler process exited with code ${ex.code}`));
		process.exit(3);			
	} else if (ex instanceof ParserError) {
		console.log(chalk.red(ex.getTitle() + ':') + '\n' + ex.getMessage());
		console.log('\n' + ex.getSourceContext() + '\n');

		console.log(chalk.red('exiting compilation, compilation failed.'));
		process.exit(2);
	}

	console.log(ex.stack);
	process.exit(2);
});
