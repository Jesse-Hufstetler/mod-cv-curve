// Keeps the graph in step with the plugin: redraws the curve when Curve changes, and moves the input/output
// dots, their guide lines and the IN / OUT readouts as the Input Value and Output Value ports change. MOD only
// reports those values a few times a second, so the dots glide to each new value instead of jumping.
function (event) {
    var icon = event.icon;
    // The graph is drawn in pixels: the plot area is 120x120 with 0 V, 0 V at (20, 156); the output ruler is the
    // right-hand edge at x = 140.
    var X0 = 20, Y0 = 156, SIZE = 120, XR = X0 + SIZE;
    // Milliseconds: how quickly the dots catch up with the latest value. Small on purpose, so the smoothing only
    // hides the steps between MOD's updates without trailing noticeably behind what you hear.
    var TAU = 30;

    // MOD calls this function afresh for every update; only event.data carries over between calls, so the
    // values the graph needs live there. (If this function ever throws, MOD disables the script for good.)
    var s = event.data.state || (event.data.state = {
        curve: 0, input: 0, output: 0,      // the latest values from the plugin
        shownIn: 0, shownOut: 0,            // what is drawn right now, easing toward the latest values
        last: 0, running: false
    });

    var curvePath = icon.find('.curve-path');
    var inLine = icon.find('.in-line');
    var outLine = icon.find('.out-line');
    var inDot = icon.find('.in-dot');
    var outDot = icon.find('.out-dot');
    var ptDot = icon.find('.pt-dot');
    var inVal = icon.find('.in-val');
    var outVal = icon.find('.out-val');

    function clamp(v) { return Math.max(0, Math.min(10, v)); }
    function px(v) { return X0 + clamp(v) / 10 * SIZE; }
    function py(v) { return Y0 - clamp(v) / 10 * SIZE; }

    function drawCurve() {
        // The same maths as the plugin. u is the input as a fraction of 0-10 V, y the output fraction.
        var coef = Math.pow(2 + s.curve * 0.123, s.curve);
        var d = '';
        for (var i = 0; i <= 64; i++) {
            var u = i / 64;
            var y = Math.pow(Math.abs(1 - Math.pow(1 - u, coef)), 1 / coef);
            d += (i ? 'L' : 'M') + (X0 + u * SIZE).toFixed(2) + ' ' + (Y0 - y * SIZE).toFixed(2);
        }
        curvePath.attr('d', d);
    }

    function drawMarkers() {
        var x = px(s.shownIn), y = py(s.shownOut);
        inDot.attr({ cx: x, cy: Y0 });
        outDot.attr({ cx: XR, cy: y });
        ptDot.attr({ cx: x, cy: y });
        inLine.attr('d', 'M' + x + ' ' + Y0 + 'V' + y);
        outLine.attr('d', 'M' + x + ' ' + y + 'H' + XR);
        inVal.text(s.shownIn.toFixed(2) + ' V');
        outVal.text(s.shownOut.toFixed(2) + ' V');
    }

    function frame(now) {
        s.running = false;
        var el = icon[0];
        if (el && el.isConnected === false) { return; } // the pedal was removed: stop animating
        var dt = Math.min(now - (s.last || now), 100);
        s.last = now;
        var k = 1 - Math.exp(-dt / TAU);
        s.shownIn += (s.input - s.shownIn) * k;
        s.shownOut += (s.output - s.shownOut) * k;
        if (Math.abs(s.input - s.shownIn) < 0.002) { s.shownIn = s.input; }
        if (Math.abs(s.output - s.shownOut) < 0.002) { s.shownOut = s.output; }
        drawMarkers();
        if (s.shownIn !== s.input || s.shownOut !== s.output) { request(); }
    }

    function request() {
        s.running = true;
        window.requestAnimationFrame(frame);
    }

    function start() {
        if (s.running) { return; }
        s.last = 0; // a fresh animation: the first frame only sets the clock
        request();
    }

    function apply(symbol, value, animate) {
        value = Number(value);
        if (!isFinite(value)) { return; }
        if (symbol == 'Curve') {
            s.curve = value;
            drawCurve();
        } else if (symbol == 'InputValue' || symbol == 'OutputValue') {
            if (symbol == 'InputValue') { s.input = value; } else { s.output = value; }
            if (animate) { start(); return; }
            s.shownIn = s.input; s.shownOut = s.output;
            drawMarkers();
        }
    }

    if (event.type == 'start') {
        for (var p in event.ports) {
            apply(event.ports[p].symbol, event.ports[p].value, false);
        }
    } else if (event.type == 'change') {
        apply(event.symbol, event.value, true);
    }
}
