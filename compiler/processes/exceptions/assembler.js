const RunnerException = require('./runner');

class AssemblerProcessEsxeption extends RunnerException {
	constructor(stderr, stdout, exit, message) {
		super(stderr, stdout, exit, 
			'An error occured while assembling...'
		);
	}
}

module.exports = AssemblerProcessEsxeption;