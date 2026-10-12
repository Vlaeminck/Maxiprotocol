const fs = require('fs');

const host_plain = 'DESKTOP-33JNCVB';
const host_enc = Buffer.from('adb4a3a48cfa3bd3bfadb4a1958c4c', 'hex');

const bd_plain = 'mx_10783';
const bd_enc = Buffer.from('de80c712cdc5ccc7', 'hex');

const port_plain = '3399';
const port_enc = Buffer.from('8c4cd6e6', 'hex');

const user_enc = Buffer.from('a89dbacc0a8c47c9cdca', 'hex');
const clave_raw = 'M9NDg7W3MdxTHf2NVTkR0r0TM/N7Z98S87P9Axu30ZI=';

console.log('Comparing BD (mx_10783):');
for (let i = 0; i < bd_plain.length; i++) {
  const p = bd_plain.charCodeAt(i);
  const e = bd_enc[i];
  console.log(`pos ${i}: plain='${bd_plain[i]}' (0x${p.toString(16)}) enc=0x${e.toString(16)} xor=0x${(p^e).toString(16)} sum=0x${((p+e)&0xff).toString(16)}`);
}

console.log('\nComparing PORT (3399):');
for (let i = 0; i < port_plain.length; i++) {
  const p = port_plain.charCodeAt(i);
  const e = port_enc[i];
  console.log(`pos ${i}: plain='${port_plain[i]}' (0x${p.toString(16)}) enc=0x${e.toString(16)} xor=0x${(p^e).toString(16)} sum=0x${((p+e)&0xff).toString(16)}`);
}

console.log('\nComparing HOST (DESKTOP-33JNCVB):');
for (let i = 0; i < host_plain.length; i++) {
  const p = host_plain.charCodeAt(i);
  const e = host_enc[i];
  console.log(`pos ${i}: plain='${host_plain[i]}' (0x${p.toString(16)}) enc=0x${e.toString(16)} xor=0x${(p^e).toString(16)} sum=0x${((p+e)&0xff).toString(16)}`);
}
