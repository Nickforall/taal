object Person {
	id: i32
	age: i32
	length: i32
}

let nick: Person

nick.id = 1
nick.age = 19
nick.length = 190

print nick.id
print nick.age
print nick.length

if nick.age < 18 {
	print 1
}

syscall "exit" (0)
