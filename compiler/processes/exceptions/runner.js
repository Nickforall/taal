class RunnerException {
	/**
	 * @param {String} stdin 
	 * @param {String} stderr
	 * @param {Number} exit 
	 */
	constructor(stderr, stdout, exit) {
		this.exit = exit;
		this.stderr = stderr;
		this.stdout = stdout;
	}
}

module.exports = RunnerException;