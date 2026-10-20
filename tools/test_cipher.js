const bdBytes = [ 222, 128, 199, 18, 205, 197, 204, 199 ];
const expectedBd = "mx_10783";
const expectedBytes = expectedBd.split('').map(c => c.charCodeAt(0));

console.log('BD bytes:      ', bdBytes);
console.log('Expected bytes:', expectedBytes);

console.log('XOR:           ', bdBytes.map((b, i) => b ^ expectedBytes[i]));
console.log('SUB (bd - exp):', bdBytes.map((b, i) => (b - expectedBytes[i] + 256) % 256));
console.log('SUB (exp - bd):', bdBytes.map((b, i) => (expectedBytes[i] - b + 256) % 256));

// Check HOST
const hostBytes = [ 173, 180, 163, 164, 140, 250, 59, 211, 191, 173, 180, 161, 149, 140, 76 ];
console.log('Host bytes len:', hostBytes.length);
// Host could be "192.168.1.4" (11 chars) or "DESKTOP-33JNCVB" (15 chars!)
const expHost15 = "DESKTOP-33JNCVB";
console.log('Host XOR with DESKTOP-33JNCVB:', hostBytes.map((b, i) => b ^ expHost15.charCodeAt(i)));
console.log('Host SUB with DESKTOP-33JNCVB:', hostBytes.map((b, i) => (b - expHost15.charCodeAt(i) + 256) % 256));

// Also check "192.168.1.4    "
const expHostIp = "192.168.1.4";
console.log('Host XOR with 192.168.1.4:', hostBytes.slice(0, expHostIp.length).map((b, i) => b ^ expHostIp.charCodeAt(i)));
