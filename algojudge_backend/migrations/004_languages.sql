-- Mo rong ngon ngu cham bai: python/cpp/js + java/go/c (ket hop da ngon ngu).
ALTER TABLE submissions MODIFY COLUMN language ENUM('python','cpp','js','java','go','c') NOT NULL;
