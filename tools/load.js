/* 앱의 놀이 코드(core.js, speech.js, modes.js)를 브라우저 없이 node에서 불러온다.
   화면·소리와 관계없는 부분(문제 만들기, 정답, 보기, 말할 조각)만 시험할 때 쓴다. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');

module.exports = function load(options = {}) {
  const noop = () => {};
  const el = { classList: { toggle: noop }, addEventListener: noop };
  const ctx = {
    console, Math, JSON, Set, Map, Promise, setTimeout, clearTimeout,
    localStorage: options.storage || { getItem: () => null, setItem: noop },
    document: { documentElement: el, head: { appendChild: noop }, createElement: () => ({}), querySelector: () => null, querySelectorAll: () => [], addEventListener: noop },
    addEventListener: noop
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  for (const f of ['core.js', 'config.js', 'speech.js', 'modes.js', 'records.js']) vm.runInContext(fs.readFileSync(path.join(root, 'js', f), 'utf8'), ctx, { filename: f });
  return ctx.SC;
};
