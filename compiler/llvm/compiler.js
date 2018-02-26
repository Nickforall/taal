const llvm = require('llvm-node');

class LLVMCompiler {
	constructor(ast) {
		this.context = new llvm.LLVMContext();
		this.module = new llvm.Module('module', this.context);
		this.ast = ast;

		this.builder = null;
	}

	compileBinary(ex) {
		const left = this.compileExpression(ex.left);
		const right = this.compileExpression(ex.right);

		switch (ex.operator) {
		case '+':
			this.builder.createAdd(left, right, 'addtmp');		
			break;
		case '*':
			this.builder.createMul(left, right, 'multmp');
			break;
		case '-':
			this.builder.createSub(left, right, 'subtmp');		
			break;
		}
	}

	compileNumberLit(ex) {
		return llvm.ConstantInt.get(this.context, ex.value);
	}

	compileCall(ex) {
		const calledFun = this.module.getFunction(ex.name.value);
		if (!calledFun) {
			throw Error('i dunno tf u doin');
		}

		var args = [];
		for (const arg of ex.args) {
			args.push(this.compileExpression(arg));
		}

		return this.builder.createCall(calledFun, args, 'calltmp');
	}

	compileExpression(ex) {
		if(ex.type == 'binary') return this.compileBinary(ex);
		if(ex.type == 'numberLiteral') return this.compileNumberLit(ex);		
		if(ex.type == 'call') return this.compileCall(ex);

		throw new Error('unsupported expression ' + ex.type);
	}

	compile() {
		// extern
		for (const funcDef of this.ast.functions) {
			const builder = new llvm.IRBuilder(this.context);

			// create the function, it's void when not start, int otherwise
			const functionType = llvm.FunctionType.get(
				funcDef.isEntry ? llvm.Type.getInt32Ty(this.context) : llvm.Type.getVoidTy(this.context), 
				false
			);
			const LLVMFunction = llvm.Function.create(
				functionType, 
				llvm.LinkageTypes.ExternalLinkage,
				funcDef.name,
				this.module
			);

			const entryBlock = llvm.BasicBlock.create(this.context, 'entry', LLVMFunction);
			builder.setInsertionPoint(entryBlock);

			this.builder = builder;

			// do stuff
			for (const ex of funcDef.expressions) {
				this.compileExpression(ex);			
			}

			if (funcDef.isEntry) {
				builder.createRet(new llvm.ConstantInt.get(this.context, 0));
			} else {
				builder.createRetVoid();
			}
		}

		const ll = this.module.print(); // prints IR 
		console.log(ll);

		llvm.writeBitcodeToFile(this.module, 'dunno');
	}

	test() {
		const ctx = new llvm.LLVMContext();
		const mod = new llvm.Module('module', ctx);

		const builder = new llvm.IRBuilder(ctx);

		const FunctionType = llvm.FunctionType.get(llvm.Type.getInt32Ty(ctx), false);
		const Function = llvm.Function.create(
			FunctionType, 
			llvm.LinkageTypes.ExternalLinkage,
			'main',
			mod
		);

		const BasicBlock = llvm.BasicBlock.create(ctx, 'entry', Function);
		builder.setInsertionPoint(BasicBlock);

		const tmpadd = builder.createAdd(
			llvm.ConstantInt.get(ctx, 10), 
			llvm.ConstantInt.get(ctx, 100)
		);
		builder.createRet(tmpadd);
				
		const ll = mod.print(); // prints IR 
		console.log(ll);

		llvm.writeBitcodeToFile(mod, 'dunno');
	}
}

module.exports = LLVMCompiler;