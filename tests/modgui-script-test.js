// Runs the pedal script the way MOD does, so GUI logic can be checked without a device.
//
// What MOD actually does (see triggerJS in mod-ui's modgui.js):
//   - it calls the script's function afresh for EVERY update, with a new `event` each time;
//   - the only thing carried from one call to the next is `event.data`, one object kept for the life of the pedal;
//   - if the function ever throws, MOD disables the script for good.
//
// Usage: node tests/modgui-script-test.js
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'mod-cv-curve.lv2', 'modgui', 'script-mod-cv-curve.js'), 'utf8').trim();
const fn = eval('(' + src + ')');

// A stand-in for MOD's icon: remembers the last thing the script wrote to each element.
const written = {};
const icon = {
  find(selector) {
    return {
      attr(key, value) {
        if (typeof key === 'object') { for (const k in key) written[selector + ' ' + k] = key[k]; }
        else written[selector + ' ' + key] = value;
        return this;
      },
      text(value) { written[selector + ' text'] = value; return this; },
    };
  },
};
const data = {};
let broken = null;
function send(event) {
  if (broken) return;
  event.icon = icon; event.data = data; event.api_version = 3;
  try { fn(event); } catch (err) { broken = err; }
}

let failures = 0;
function check(name, ok) { console.log((ok ? 'PASS' : 'FAIL') + '  ' + name); if (!ok) failures++; }
const px = v => 30 + v / 10 * 120, py = v => 126 - v / 10 * 120;

send({ type: 'start', ports: [{ symbol: 'Curve', value: -0.25 }, { symbol: 'InputValue', value: 0 }, { symbol: 'OutputValue', value: 0 }] });
check('start draws the curve', /^M30\.00 126\.00L/.test(written['.curve-path d'] || ''));

// The Dwarf reports the two values in separate updates, so each update must keep the other value.
send({ type: 'change', symbol: 'InputValue', value: 6.44 });
send({ type: 'change', symbol: 'OutputValue', value: 5.27 });
check('input readout survives the output update', written['.in-val text'] === '6.44 V');
check('output readout shows the output value', written['.out-val text'] === '5.27 V');
check('input dot is on the bottom axis at the input voltage', written['.in-dot cx'] === px(6.44) && written['.in-dot cy'] === 126);
check('output dot is on the left axis at the output voltage', written['.out-dot cx'] === 30 && written['.out-dot cy'] === py(5.27));
check('curve dot is where the two meet', written['.pt-dot cx'] === px(6.44) && written['.pt-dot cy'] === py(5.27));
check('vertical guide line joins the input dot to the curve', written['.in-line d'] === 'M' + px(6.44) + ' 126V' + py(5.27));
check('horizontal guide line joins the output dot to the curve', written['.out-line d'] === 'M30 ' + py(5.27) + 'H' + px(6.44));

send({ type: 'change', symbol: 'InputValue', value: 2 });
check('a new input keeps the last output', written['.out-val text'] === '5.27 V' && written['.in-val text'] === '2.00 V');

const before = written['.curve-path d'];
send({ type: 'change', symbol: 'Curve', value: 3 });
check('turning Curve redraws the curve', written['.curve-path d'] !== before);
check('turning Curve keeps the dots where they were', written['.in-val text'] === '2.00 V' && written['.out-val text'] === '5.27 V');

send({ type: 'change', symbol: 'InputValue', value: 14 });
check('input above 10 V keeps its dot on the graph', written['.in-dot cx'] === px(10));
send({ type: 'change', symbol: 'OutputValue', value: -3 });
check('output below 0 V keeps its dot on the graph', written['.out-dot cy'] === py(0));

send({ type: 'change', symbol: 'InputValue', value: 'oops' });
send({ type: 'change', symbol: 'InputValue', value: NaN });
send({ type: 'change', symbol: 'SomethingElse', value: 1 });
check('bad or unknown updates never throw (MOD would disable the script)', broken === null);

console.log(failures ? 'FAILED (' + failures + ')' : 'ALL PASSED');
process.exit(failures ? 1 : 0);
