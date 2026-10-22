/* 음성 조각 목록 만들기: node tools/voice_units.js > tools/units.json
   [찾는 이름, 녹음할 글] 쌍을 내보낸다. 빠진 조각 검사는 node tools/check.js가 한다. */
const SC = require('./load')();
const pairs = SC.voiceUnits();
process.stdout.write(JSON.stringify(pairs, null, 0));
console.error(`조각 ${pairs.length}개`);
