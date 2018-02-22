object SomeException {
	fn get_message -> String {
		ret "this is some exception"
	}
} 

fn do_something !! SomeException {
	throw SomeException.new()
}

fn do_do_something {
	try {
		unwrap do_something()
	} catch (SomeException exception) {
		print exception.get_message()
	}
}