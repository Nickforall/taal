const RunnerException = require('./runner');

class LinkerException extends RunnerException {
	constructor(stderr, stdout, exit, message) {
		super(stderr, stdout, exit, 
			'An error occured while linking...'
		);
	}
}

module.exports = LinkerException;