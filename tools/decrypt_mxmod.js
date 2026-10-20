const fs = require('fs');

const buf = fs.readFileSync('C:/MaxiREST_SQL/mxmod.DBF');
// Find fields
const headerLen = buf.readUInt16LE(8);
const recordLen = buf.readUInt16LE(10);

const rec = buf.slice(headerLen, headerLen + recordLen);
console.log('Record hex:', rec.toString('hex'));

// USUARIO: len 100, starts at offset 1 + 30 + 50 + 20 = 101
const userBytes = rec.slice(101, 101 + 100);
const claveBytes = rec.slice(201, 201 + 100);
const hostBytes = rec.slice(301, 301 + 100);
const bdBytes = rec.slice(401, 401 + 100);
const portBytes = rec.slice(501, 501 + 100);

console.log('PORT bytes:', Array.from(portBytes.slice(0, 10)));
console.log('HOST bytes:', Array.from(hostBytes.slice(0, 20)));
console.log('USER bytes:', Array.from(userBytes.slice(0, 20)));
console.log('BD bytes:', Array.from(bdBytes.slice(0, 20)));
console.log('CLAVE raw:', claveBytes.toString('utf8').trim());

// Compare PORT bytes to "3399"
const knownPort = [51, 51, 57, 57]; // "3399"
const actualPort = Array.from(portBytes.slice(0, 4));
console.log('XOR with 3399:', actualPort.map((b, i) => b ^ knownPort[i]));
console.log('SUB with 3399:', actualPort.map((b, i) => b - knownPort[i]));

// We also know HOST is "192.168.1.4" or "192.168.1.3" or "CAJA" or "DESKTOP-33JNCVB"
console.log('HOST chars as hex:', Array.from(hostBytes.slice(0, 15)).map(b => b.toString(16)));
