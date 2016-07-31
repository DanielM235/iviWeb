start /D "C:\Program Files\MongoDB 2.6 Standard\bin" mongod.exe --dbpath "D:\Programmation\Ivipulse\DB"
timeout 2

start /D "D:\Programmation\Ivipulse\latest\ivipulse\server\" coffee server.coffee