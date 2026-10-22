(function (SC) {
'use strict';
const counts = ['done', 'hinted', 'prompted', 'askHelp', 'askRest', 'offers', 'demos', 'restWaited'];
const integer = n => Number.isSafeInteger(n) && n >= 0;
function readRecords() {
  const saved = SC.store.get('rec', []);
  if (!Array.isArray(saved)) return [];
  return saved.filter(r => {
    if (!r || typeof r !== 'object' || Array.isArray(r)) return false;
    if (!Object.prototype.hasOwnProperty.call(SC.MODES, r.mode)) return false;
    if (!Number.isFinite(r.t) || !Number.isFinite(new Date(r.t).getTime())) return false;
    if (!integer(r.total) || r.total < 1 || r.total > 100 || !integer(r.first)) return false;
    if (counts.some(k => r[k] != null && !integer(r[k]))) return false;
    const done = r.done == null ? r.total : r.done;
    if (done > r.total || r.first > done) return false;
    return [20, 30, 50, 100].includes(r.range) && [1, 2, 3].includes(r.level)
      && ['lots', 'some', 'none'].includes(r.help) && (r.small == null || [5, 10].includes(r.small));
  }).map(r => {
    const record = {};
    for (const k of ['t', 'mode', 'total', 'first', 'range', 'level', 'help', 'small', ...counts]) {
      if (r[k] != null) record[k] = r[k];
    }
    if (r.stopped === true) record.stopped = true;
    for (const k of ['moodStart', 'moodEnd']) {
      if (['good', 'soso', 'hard'].includes(r[k])) record[k] = r[k];
    }
    return record;
  });
}
SC.readRecords = readRecords;
})(window.SC);
