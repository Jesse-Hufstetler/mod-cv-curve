// Runs the pedal script the way MOD does, so GUI logic can be checked without a device.
//
// What MOD actually does (see triggerJS in mod-ui's modgui.js):
//   - it calls the script's function afresh for EVERY update, with a new `event` each time;
//   - the only thing carried from one call to the next is `event.data`, one object kept for the life of the pedal;
//   - if the function ever throws, MOD disables the script for good.
// Animation frames are driven by hand here so the smoothing can be checked exactly.
//
// Usage: node tests/modgui-script-test.js
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'mod-cv-curve.lv2', 'modgui', 'script-mod-cv-curve.js'), 'utf8').trim();
const fn = eval('(' + src + ')');

// Animation frames, advanced by hand.
let frames = [];
let now = 1000;
global.window = { requestAnimationFrame(f) { frames.push(f); return frames.length; } };
function advance(ms) {
  for (let t = 0; t < ms; t += 16) {
    now += 16;
    const batch = frames; frames = [];
    batch.forEach(f => f(now));
  }
}

// A stand-in for MOD's icon: remembers the last thing the script wrote to each element.
const written = {};
const icon = {
  0: { isConnected: true },
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
// The graph: 0 V, 0 V is at (20, 156); the plot is 120 px square; the output ruler is the right-hand edge, x = 140.
const px = v => 20 + v / 10 * 120, py = v => 156 - v / 10 * 120;

send({ type: 'start', ports: [{ symbol: 'Curve', value: -0.25 }, { symbol: 'InputValue', value: 0 }, { symbol: 'OutputValue', value: 0 }] });
check('start draws the curve from the bottom-left corner', /^M20\.00 156\.00L/.test(written['.curve-path d'] || ''));
check('start puts the dots at the origin of their rulers', written['.in-dot cx'] === 20 && written['.in-dot cy'] === 156 && written['.out-dot cx'] === 140 && written['.out-dot cy'] === 156);
check('start needs no animation', frames.length === 0);

// The Dwarf reports the two values in separate updates.
send({ type: 'change', symbol: 'InputValue', value: 6.44 });
send({ type: 'change', symbol: 'OutputValue', value: 5.27 });
check('a new value does not jump: the dots have not moved yet', written['.in-dot cx'] === 20 && written['.out-dot cy'] === 156);
check('updates start exactly one animation loop', frames.length === 1);

advance(64);
const inEarly = written['.in-dot cx'], outEarly = written['.out-dot cy'];
check('the input dot glides: partway along the bottom ruler', inEarly > 20 && inEarly < px(6.44));
check('the output dot glides: partway up the right-hand ruler', outEarly < 156 && outEarly > py(5.27));
advance(64);
check('both dots keep moving toward their targets', written['.in-dot cx'] > inEarly && written['.out-dot cy'] < outEarly);

advance(3000);
check('the input dot settles exactly on the input voltage, on the bottom ruler', written['.in-dot cx'] === px(6.44) && written['.in-dot cy'] === 156);
check('the output dot settles exactly on the output voltage, on the right-hand ruler', written['.out-dot cx'] === 140 && written['.out-dot cy'] === py(5.27));
check('the curve dot is where the two meet', written['.pt-dot cx'] === px(6.44) && written['.pt-dot cy'] === py(5.27));
check('vertical guide line joins the input dot to the curve', written['.in-line d'] === 'M' + px(6.44) + ' 156V' + py(5.27));
check('horizontal guide line joins the curve to the output dot', written['.out-line d'] === 'M' + px(6.44) + ' ' + py(5.27) + 'H140');
check('IN and OUT readouts show the final values', written['.in-val text'] === '6.44 V' && written['.out-val text'] === '5.27 V');
check('the loop stops once everything has settled', frames.length === 0);

send({ type: 'change', symbol: 'InputValue', value: 2 });
advance(3000);
check('a new input keeps the last output', written['.out-val text'] === '5.27 V' && written['.in-val text'] === '2.00 V');

const before = written['.curve-path d'];
send({ type: 'change', symbol: 'Curve', value: 3 });
check('turning Curve redraws the curve at once', written['.curve-path d'] !== before && frames.length === 0);
check('turning Curve keeps the dots where they were', written['.in-val text'] === '2.00 V' && written['.out-val text'] === '5.27 V');

send({ type: 'change', symbol: 'InputValue', value: 14 });
advance(3000);
check('input above 10 V keeps its dot on the graph', written['.in-dot cx'] === px(10));
send({ type: 'change', symbol: 'OutputValue', value: -3 });
advance(3000);
check('output below 0 V keeps its dot on the graph', written['.out-dot cy'] === py(0));

send({ type: 'change', symbol: 'InputValue', value: 8 });
send({ type: 'change', symbol: 'OutputValue', value: 9 });
icon[0].isConnected = false;
advance(200);
check('animation stops when the pedal is removed from the page', frames.length === 0);
icon[0].isConnected = true;

send({ type: 'change', symbol: 'InputValue', value: 'oops' });
send({ type: 'change', symbol: 'InputValue', value: NaN });
send({ type: 'change', symbol: 'SomethingElse', value: 1 });
check('bad or unknown updates never throw (MOD would disable the script)', broken === null);

console.log(failures ? 'FAILED (' + failures + ')' : 'ALL PASSED');
process.exit(failures ? 1 : 0);
