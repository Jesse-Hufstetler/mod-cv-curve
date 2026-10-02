// Keeps the graph in step with the plugin: redraws the curve when Curve changes, and moves the input/output
// dots, their guide lines and the numeric readouts as the Input Value and Output Value ports change.
function (event) {
    var icon = event.icon;
    // The graph is drawn in pixels: the plot area is 120x120 with 0 V, 0 V at (30, 126).
    var X0 = 30, Y0 = 126, SIZE = 120;
    // MOD calls this function afresh for every update; only event.data carries over between calls, so the
    // values the graph needs live there. (If this function ever throws, MOD disables the script for good.)
    var state = event.data.state || (event.data.state = { curve: 0, input: 0, output: 0 });

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
        var coef = Math.pow(2 + state.curve * 0.123, state.curve);
        var d = '';
        for (var i = 0; i <= 64; i++) {
            var u = i / 64;
            var y = Math.pow(Math.abs(1 - Math.pow(1 - u, coef)), 1 / coef);
            d += (i ? 'L' : 'M') + (X0 + u * SIZE).toFixed(2) + ' ' + (Y0 - y * SIZE).toFixed(2);
        }
        curvePath.attr('d', d);
    }

    function drawMarkers() {
        var x = px(state.input), y = py(state.output);
        inDot.attr({ cx: x, cy: Y0 });
        outDot.attr({ cx: X0, cy: y });
        ptDot.attr({ cx: x, cy: y });
        inLine.attr('d', 'M' + x + ' ' + Y0 + 'V' + y);
        outLine.attr('d', 'M' + X0 + ' ' + y + 'H' + x);
        inVal.text(state.input.toFixed(2) + ' V');
        outVal.text(state.output.toFixed(2) + ' V');
    }

    function apply(symbol, value) {
        value = Number(value);
        if (!isFinite(value)) { return; }
        if (symbol == 'Curve') { state.curve = value; drawCurve(); }
        else if (symbol == 'InputValue') { state.input = value; }
        else if (symbol == 'OutputValue') { state.output = value; }
        else { return; }
        drawMarkers();
    }

    if (event.type == 'start') {
        for (var p in event.ports) {
            apply(event.ports[p].symbol, event.ports[p].value);
        }
    } else if (event.type == 'change') {
        apply(event.symbol, event.value);
    }
}
