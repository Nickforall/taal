const fs = require('fs');
const spawn = require('child_process').spawn;
const chalk = require('chalk');
const Path = require('path');

const AssemblerProcessException = require('./exceptions/assembler');
const LinkerException = require('./exceptions/linker');


class Runner {
	constructor(name, image) {
		this.name = name;
		this.image = image;
	}

	/**
	 * @returns {Promise}
	 */
	run() {
		let path = Path.join(process.cwd(), 'out', 'tmp', '' + Date.now());

		this.createOutIfNonExistent();

		fs.writeFileSync(path + '.s', this.image.serialize());
		
		return this.compile_assembly(path);
	}

	createOutIfNonExistent() {
		if (!fs.existsSync(Path.join(process.cwd(), 'out'))) {
			fs.mkdirSync(Path.join(process.cwd(), 'out'));
		}

		if (!fs.existsSync(Path.join(process.cwd(), 'out', 'tmp'))) {
			fs.mkdirSync(Path.join(process.cwd(), 'out', 'tmp'));
		}
	}

	/**
	 * @param {String} asmpath 
	 * @returns {Promise}
	 */
	compile_assembly(asmpath) {
		// nasm -f macho64 $1.s && ld -macosx_version_min 10.7.0 -lSystem -o $1 $1.o
		return new Promise((resolve, reject) => {
			let result = Path.join(process.cwd(), '/out/', this.name);
			
			let nasm = spawn(
				'nasm',
				[
					'-f',
					'macho64',
					asmpath + '.s'
				]
			);

			let nasmstdout = '';
			let nasmstderr = '';
			
			nasm.stdout.on('data', (data) => {
				nasmstdout += chalk.green(`NASM:\t${data}\n`);
			});
	
			nasm.stderr.on('data', (data) => {
				nasmstderr += chalk.red(`NASM:\t${data}\n`);
			});

			nasm.on('close', (code) => {
				if (code !== 0) {
					reject(new AssemblerProcessException(
						nasmstderr,
						nasmstdout,
						code
					));
				}
	
				try {
					fs.unlinkSync(result);
				} catch (_) { 
					// do nothing
				}
	
				let linker = spawn(
					'ld',
					[
						'-macosx_version_min',
						'10.7.0',
						'-lSystem',
						'-o',
						result,
						asmpath + '.o'
					]
				);
				
				let ldstdout = '';
				let ldstderr = '';
				
				linker.stdout.on('data', (data) => {
					ldstdout += chalk.green(`LLD :\t${data}\n`);
				});
		
				linker.stderr.on('data', (data) => {
					ldstderr += chalk.red(`LLD :\t${data}\n`);
				});
	
				linker.on('close', (code) => {
	
					if (code !== 0) {
						reject(new LinkerException(
							ldstderr,
							ldstdout,
							code
						));
					}
						
					if (!global.TAAL_CONFIG.preserveTemp) {
						fs.unlinkSync(asmpath + '.o');
						fs.unlinkSync(asmpath + '.s');	
					}

					resolve(this.name);
				});
			});
		});
	}
}

module.exports = Runner;