# Exceptions

## E0001 (SyntaxError)
This error is thrown whenever an character that is not known by the compiler in its context.

**For Example:**
```taal
1 :+ 1
```

**Will throw the following error**
```
[E0001] SyntaxError:
Unknown character ':' at 0:3 in incorrect.tl

001| 1 :+ 1
       ^
```

**Fix**

You can fix this by checking your syntax.

## E0002 (UnexpectedToken)

This error is thrown whenever an unexpected token is found next in your source code.

**For Example**
```taal

```

**Will throw the following error**
```
[E0002] UnexpectedToken:
Unexpected token '10', expected: '{' at 0:10 in unexpected_token.tl

001| fn hey 10 {
```

**Fix**
You can fix this by checking your syntax.

## E0003 (ReturnScopeError)

This error is thrown whenever you try to return in the main context.

**For example**
```taal
fn hey {
	ret 1
}

ret 1 + 1 * 3
```

**Will throw the following error**
```
[E0003] ReturnScopeError:
Unexpected return statement, 'ret' should always be placed inside a function block. at 4:5 in unexpected_token.tl

005| ret 1 + 1 * 3
```

**Fix**

You can fix this by removing the return statement from the main context. 

If you want to return an exit code, like you do in C's main entry function. You can call the exit syscall.

## E0004 (UnexpectedEOF)

This error occurs when the compiler has reached the end of the file, but still expects something from you.

**For Example**

```taal
fn hey {
	ret 1
```

**Will throw the following error**
```
[E0004] UnexpectedEOF:
The file ended, but the last expression wasn't finished yet at 1:6 in unexpected_eof.tl

002|    ret 1
        ^^^^^
```

**Fix**

You can fix this by checking your syntax at the end of the file.

## E0005 (UnsupportedExpression)

This is a special little snowflake and is usually thrown whenever an expression you're using is not supported by the platform you're compiling to.

## E0006 (SyscallExceedingArguments)

This error occurs when you're performing a syscall with more arguments than allowed. On OSX the maximum amount of arguments passed to a syscall are 8.

Later this will exception will be changed to know the maximum amount of arguments for each specific syscall.

## E0007 (NestedFunctionError)

This error occurs whenever you're tring to declare a function inside a function.

**For Example**

```taal
fn hey {
	ret 1

	fn test {
		
	}
}
```

**Will throw the following error**
```
[E0007] NestedFunctionError:
You are not allowed to nest named functions... at 3:8 in exctest.tl

004|    fn test {
        ^^
```