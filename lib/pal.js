/**
 * PAL files are the color palettes used to render images.
 * Partial transparency is not supported.
 */
function PalFile(colors) {
    this.colors = colors;
}

var COLOR_COUNT = 256;

function _load(buffer, path) {
    if (buffer.length != (COLOR_COUNT * 3)) {
        console.error('Invalid PAL file size [' + buffer.length + '] for ' + path);
        return null;
    }

    var colors = new Array(COLOR_COUNT);
    var offset = 0;
    for (var i = 0; i < COLOR_COUNT; i++) {
        colors[i] = {
            r: buffer.readUInt8(offset),
            g: buffer.readUInt8(offset + 1),
            b: buffer.readUInt8(offset + 2),
            a: 0xFF
        };

        offset += 3;
    }

    return new PalFile(colors);
}

module.exports = {
    load: _load
};
