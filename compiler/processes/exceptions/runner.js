class RunnerException extends Error {
	/**
	 * @param {String} stdin 
	 * @param {String} stderr
	 * @param {Number} exit 
	 */
	constructor(stderr, stdout, exit, message) {
		super(message);

		this.exit = exit;
		this.stderr = stderr;
		this.stdout = stdout;
	}
}

module.exports = RunnerException;