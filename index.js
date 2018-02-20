#!/usr/bin/env node

global.TAAL_START_COMPILE_DATE = Date.now();
global.TAAL_CONFIG = {
	debug: false,
	preserveTemp: false,
};

const Taal = require('./taal');
const path = require('path');
const chalk = require('chalk');
const program = require('commander');

program.version('0.1.0')
	.usage('[options] <file>')
	.option('-o, --output [name]', 'Output file name')
	.option('-d, --debug', 'Whether we push all kinds of gibberish to stdout when compiling')
	.option('-t, --temporary', 'Preverses the temporary assembly files')
	.parse(process.argv);

if(program.args.length < 1) {
	console.log(chalk.red('No file given.'));
	process.exit(1);
	return;
}

global.TAAL_CONFIG.debug = program.debug;
global.TAAL_CONFIG.preserveTemp = program.temporary;

Taal.compileFile(
	path.join(process.cwd(), program.args[0]), 
	program.output ? program.output : 'executable'
);	
