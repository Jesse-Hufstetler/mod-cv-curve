// Redraws the curve graph whenever the Curve control changes.
function (event) {
    var path = event.icon.find('.curve-path');

    function draw(curve) {
        // The same maths as the plugin. u is the input as a fraction of 0-10 V, y the output fraction.
        var coef = Math.pow(2 + curve * 0.123, curve);
        var d = '';
        for (var i = 0; i <= 64; i++) {
            var u = i / 64;
            var y = Math.pow(Math.abs(1 - Math.pow(1 - u, coef)), 1 / coef);
            d += (i ? 'L' : 'M') + (u * 100).toFixed(2) + ' ' + (100 - y * 100).toFixed(2);
        }
        path.attr('d', d);
    }

    if (event.type == 'start') {
        var ports = event.ports;
        for (var p in ports) {
            if (ports[p].symbol == 'Curve') {
                draw(ports[p].value);
            }
        }
    } else if (event.type == 'change' && event.symbol == 'Curve') {
        draw(event.value);
    }
}
