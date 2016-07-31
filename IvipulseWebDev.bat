start /D "C:\Program Files\MongoDB 2.6 Standard\bin" mongod.exe --dbpath "D:\Programmation\Ivipulse\DB"
timeout 2

start /D "D:\Programmation\Ivipulse\prevVersions\ivipulseB\server\" coffee server.coffee

start http-server