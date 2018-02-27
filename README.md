# Taal

[![Build Status](https://travis-ci.org/Nickforall/taal.svg?branch=master)](https://travis-ci.org/Nickforall/taal)

Taal is a little weird experimental programming langauge that compiles to machine code (currently only on MacOS, only 64 bit, and requires `ld` and `nasm`)

## Installation

Simply run `npm i -g` and the `taalc` command will be available.

Use `taalc -h` for usage instruction

## Examples

Most examples in the `/examples` folder are sketches and don't actually compile to assembly (yet).

One thing you can do right now is print simple maths, create simple functions, and create local variables!

```taal
print 2 + 2 - 1
print 1234 * 129
```

```taal
fn quick_maths {
	four = 2 + 2
	three = four - 1

	print three
}

quick_maths()
```