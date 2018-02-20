const fs = require('fs');
const spawn = require('child_process').spawn;
const chalk = require('chalk');

const Path = require('path');

class Runner {
	constructor(name, image) {
		this.name = name;
		this.image = image;
	}

	run() {
		let path = Path.join(process.cwd(), 'out', 'tmp', '' + Date.now());

		this.createOutIfNonExistent();

		fs.writeFileSync(path + '.s', this.image.get());
		this.compile_assembly(path);
	}

	createOutIfNonExistent() {
		if (!fs.existsSync(Path.join(process.cwd(), 'out'))) {
			fs.mkdirSync(Path.join(process.cwd(), 'out'));
		}

		if (!fs.existsSync(Path.join(process.cwd(), 'out', 'tmp'))) {
			fs.mkdirSync(Path.join(process.cwd(), 'out', 'tmp'));
		}
	}

	compile_assembly(path) {
		// nasm -f macho64 $1.s && ld -macosx_version_min 10.7.0 -lSystem -o $1 $1.o
		let nasm = spawn(
			'nasm',
			[
				'-f',
				'macho64',
				path + '.s'
			]
		);

		nasm.stdout.on('data', (data) => {
			console.log(chalk.green(`NASM:\t${data}`));
		});

		nasm.stderr.on('data', (data) => {
			console.log(chalk.red(`NASM:\t${data}`));
		});

		nasm.on('close', (code) => {
			if (code !== 0) {
				console.log(chalk.red('compilation failed'));
				console.log(chalk.red(`nasm process exited with code ${code}`));
				process.exit(3);
			}

			try {
				fs.unlinkSync('./out/' + this.name);
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
					'./out/' + this.name,
					path + '.o'
				]
			);

			linker.stderr.on('data', (data) => {
				console.log(chalk.red(`LD:  \t${data}`));
			});

			nasm.stdout.on('data', (data) => {
				console.log(chalk.green(`LD:  \t${data}`));
			});

			linker.on('close', (code) => {

				if (code !== 0) {
					console.log(chalk.red('compilation failed'));
					console.log(chalk.red(`linker process exited with code ${code}`));
					process.exit(3);
				}

				console.log(chalk.green(`Succesful compilation of binary '${this.name}', finished in ${Date.now() - global.TAAL_START_COMPILE_DATE}ms!`));
				
				if (!global.TAAL_CONFIG.preserveTemp) {
					fs.unlinkSync(path + '.o');
					fs.unlinkSync(path + '.s');	
				}
							
				
				process.exit(0);
			});
		});
	}
}

module.exports = Runner;