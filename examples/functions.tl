# Heads up: this program will segfault at some point, since it's infinitely creating variables

fn count (i) {
	print i
	count (i+1)
}

count (0)