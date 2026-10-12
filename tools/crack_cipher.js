const hostPlain = Buffer.from('DESKTOP-33JNCVB', 'ascii');
const hostCipher = Buffer.from('adb4a3a48cfa3bd3bfadb4a1958c4c', 'hex');

const bdPlain = Buffer.from('mx_10783', 'ascii');
const bdCipher = Buffer.from('de80c712cdc5ccc7', 'hex');

const portPlain = Buffer.from('3399', 'ascii');
const portCipher = Buffer.from('8c4cd6e6', 'hex');

const userPlain = Buffer.from('user_10783', 'ascii');
const userCipher = Buffer.from('a89dbacc0a8c47c9cdca', 'hex');

console.log('--- HOST ---');
for (let i = 0; i < hostPlain.length; i++) {
  console.log(`[${i}] '${String.fromCharCode(hostPlain[i])}' (0x${hostPlain[i].toString(16)}) -> 0x${hostCipher[i].toString(16)} | XOR: 0x${(hostPlain[i] ^ hostCipher[i]).toString(16)} | DIFF: ${(hostCipher[i] - hostPlain[i])}`);
}

console.log('\n--- BD (mx_10783) ---');
for (let i = 0; i < bdPlain.length; i++) {
  console.log(`[${i}] '${String.fromCharCode(bdPlain[i])}' (0x${bdPlain[i].toString(16)}) -> 0x${bdCipher[i].toString(16)} | XOR: 0x${(bdPlain[i] ^ bdCipher[i]).toString(16)} | DIFF: ${(bdCipher[i] - bdPlain[i])}`);
}

console.log('\n--- PORT (3399) ---');
for (let i = 0; i < portPlain.length; i++) {
  console.log(`[${i}] '${String.fromCharCode(portPlain[i])}' (0x${portPlain[i].toString(16)}) -> 0x${portCipher[i].toString(16)} | XOR: 0x${(portPlain[i] ^ portCipher[i]).toString(16)} | DIFF: ${(portCipher[i] - portPlain[i])}`);
}

console.log('\n--- USER (user_10783) ---');
for (let i = 0; i < userPlain.length; i++) {
  console.log(`[${i}] '${String.fromCharCode(userPlain[i])}' (0x${userPlain[i].toString(16)}) -> 0x${userCipher[i].toString(16)} | XOR: 0x${(userPlain[i] ^ userCipher[i]).toString(16)} | DIFF: ${(userCipher[i] - userPlain[i])}`);
}
