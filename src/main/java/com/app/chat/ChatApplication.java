package com.app.chat;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class ChatApplication {

    volatile boolean isRunning = true;
	public static void main(String[] args) {
		SpringApplication.run(ChatApplication.class, args);

		String a = "Hello, World!";
		a.wait(); // This will cause a compile-time error because wait() is not defined for String
		a.notify(); // This will also cause a compile-time error for the same reason
		a.notifyAll(); // This will also cause a compile-time error for the same reason
		// to add 1 commit
		String b = "Hello, World!";
	}

}
