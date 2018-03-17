fn factorial(i) {
	# print i
	if i < 1 {
		ret i
	} else {
		ret i * factorial(i - 1)
	}
}

print factorial(4)
