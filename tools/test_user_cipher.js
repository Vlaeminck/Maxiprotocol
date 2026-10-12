const fs = require('fs');

const candidates = [
  'user_10783',
  'maxi_10783',
  'root_10783',
  'admi_10783',
  'clie_10783',
  'mari_10783',
  'mxusr10783',
  'usrmx10783',
  'gastromark',
  'gastro_mkt',
  'maxirest07',
  'maxirest71',
  'maxirest70'
];

const encUser = Buffer.from('a89dbacc0a8c47c9cdca', 'hex');

candidates.forEach(cand => {
  console.log('Testing cand:', cand);
  const diffs = [];
  const xors = [];
  for (let i = 0; i < cand.length; i++) {
    const c = cand.charCodeAt(i);
    const e = encUser[i];
    diffs.push(e - c);
    xors.push('0x' + (e ^ c).toString(16));
  }
  console.log('  xors: ', xors.join(' '));
  console.log('  diffs:', diffs.join(' '));
});
