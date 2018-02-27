const tests = require('./tests.json').tests;
const Chalk = require('chalk');
const Taal = require('../taal');
const Path = require('path');
const spawn = require('child_process').spawn;

global.TAAL_CONFIG = {
	debug: false,
	preserveTemp: false,
	skipOptimization: false
};

var returningExit = 0;
var testIndex = 0;

function nextTest(num) {
	var test = tests[num];

	const source = Path.join(__dirname, test.source);

	Taal.compileFile(source, 'executable')
		.then((result) => {
			tryRunning(
				result.executablepath,
				test
			);
		})
		.catch((ex) => {
			console.log(`[${Chalk.red(' X ')}] Error during compiletime for ${test.source}`);
			console.error(ex);
			if(ex.stderr) console.error(ex.stderr);
			returningExit = 1;
		});
}

nextTest(testIndex++);

function tryRunning(path, test) {
	let proc = spawn(
		path,
		[]
	);

	let stdout = '';

	proc.stdout.on('data', (data) => {
		stdout += data;
	});

	proc.on('close', (code) => {
		var expect = (test.exitCode ? test.exitCode : 0);
		if (code === expect) {
			if (stdout === test.stdout) {
				console.log(`[${Chalk.green(' √ ')}] Succesfully tested ${test.source}`);
			} else {
				returningExit = 1;
				console.log(`[${Chalk.red(' X ')}] Stdin output did not match the expected for ${test.source}.`);				
			}
		} else {
			returningExit = 1;			
			console.log(`[${Chalk.red(' X ')}] Expected exit code ${expect}, got ${code} for ${test.source}`);
		}

		if (testIndex < tests.length) {
			nextTest(testIndex++);
		} else {
			process.exit(returningExit);
		}
	});
}