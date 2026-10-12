const bd_plain = 'mx_10783';
const bd_enc = Buffer.from('de80c712cdc5ccc7', 'hex');

const port_plain = '3399';
const port_enc = Buffer.from('8c4cd6e6', 'hex');

const host_plain = 'DESKTOP-33JNCVB';
const host_enc = Buffer.from('adb4a3a48cfa3bd3bfadb4a1958c4c', 'hex');

console.log('--- XOR with position ---');
for (let i = 0; i < bd_plain.length; i++) {
  const p = bd_plain.charCodeAt(i);
  const e = bd_enc[i];
  console.log(`BD[${i}]: (e ^ p) = 0x${(e ^ p).toString(16)} | (e - p) = ${(e - p)} | (e + p)&255 = ${(e + p)&255}`);
}

console.log('--- PORT ---');
for (let i = 0; i < port_plain.length; i++) {
  const p = port_plain.charCodeAt(i);
  const e = port_enc[i];
  console.log(`PORT[${i}]: (e ^ p) = 0x${(e ^ p).toString(16)} | (e - p) = ${(e - p)}`);
}

console.log('--- HOST ---');
for (let i = 0; i < host_plain.length; i++) {
  const p = host_plain.charCodeAt(i);
  const e = host_enc[i];
  console.log(`HOST[${i}]: (e ^ p) = 0x${(e ^ p).toString(16)} | (e - p) = ${(e - p)}`);
}
