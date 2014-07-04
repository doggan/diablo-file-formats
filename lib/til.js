/**
 * TIL files contain indices for rendering the pillars found in the MIN files.
 *
 * Each 8 byte sequence in the TIL file describes the 4 quadrants of a square,
 * at 2 bytes each. Each square quadrant index is an index into the pillar
 * array of the MIN file.
 *
 * The square is arranged as follows:
 *
 *             top [0]
 *               /\
 *    left [2]  /\/\  right [1]
 *              \/\/
 *               \/
 *            bottom [3]
 */
function TilFile(squares) {
    this.squares = squares;
}

function _load(buffer, tilPath) {
    // 4 indices at 2 bytes a piece.
    var squareSizeInBytes = 4 * 2;

    if ((buffer.length % squareSizeInBytes) !== 0) {
        console.error('Invalid TIL file size [' + buffer.length + '] for ' + tilPath);
        return null;
    }

    var squares = new Array(buffer.length / squareSizeInBytes);

    var offset = 0;
    for (var i = 0; i < squares.length; i++) {
        squares[i] = [
            buffer.readUInt16LE(offset),        // top
            buffer.readUInt16LE(offset + 2),    // right
            buffer.readUInt16LE(offset + 4),    // left
            buffer.readUInt16LE(offset + 6)     // bottom
        ];

        offset += 8;
    }

    return new TilFile(squares);
}

module.exports = {
    load: _load,

    SQUARE_TOP: 0,
    SQUARE_RIGHT: 1,
    SQUARE_LEFT: 2,
    SQUARE_BOTTOM: 3
};
