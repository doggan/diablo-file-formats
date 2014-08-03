'use strict';

var path = require('path'),
    Til = require('./til'),
    dunConfig = require('./config/dun_info');

/**
 * DUN files contain information for arranging the squares of a TIL file.
 * Multiple DUN files can be pieced together to form entire levels.
 * For example, the 'town' level is a combination of 4 DUN files.
 *
 * In addition, DUN files also provide information regarding dungeon
 * monsters and object ids.
 */
function DunFile(startCoord, pillarData, dunName) {
    this.startCol = startCoord[0];
    this.startRow = startCoord[1];
    this.pillarData = pillarData;
    this.fileName = dunName;

    this.colCount = this.pillarData.length;
    this.rowCount = (this.colCount > 0) ? this.pillarData[0].length : 0;
}

function getStartCoord(dunName) {
    var startCoord = dunConfig[dunName];
    if (typeof startCoord == 'undefined') {
        console.error('Unhandled DUN file: ' + dunName);
        return [0, 0];
    }

    return startCoord;
}

function _load(buffer, dunPath, tilFile) {
    var offset = 0;
    var colCount = buffer.readUInt16LE(offset);
    var rowCount = buffer.readUInt16LE(offset += 2);

    // Pre-allocate.
    var pillarData = new Array(colCount * 2);
    for (var i = 0; i < pillarData.length; i++) {
        pillarData[i] = new Array(rowCount * 2);
    }

    // Parse pillar data.
    var row = 0;
    for (i = 0; i < rowCount; i++) {
        var col = 0;
        for (var j = 0; j < colCount; j++) {
            var squareIndexPlus1 = buffer.readUInt16LE(offset += 2);
            if (squareIndexPlus1 !== 0) {
                var square = tilFile.squares[squareIndexPlus1 - 1];

                pillarData[col][row] = square[Til.SQUARE_TOP];
                pillarData[col + 1][row] = square[Til.SQUARE_RIGHT];
                pillarData[col][row + 1] = square[Til.SQUARE_LEFT];
                pillarData[col + 1][row + 1] = square[Til.SQUARE_BOTTOM];
            } else {
                pillarData[col][row] = null;
                pillarData[col + 1][row] = null;
                pillarData[col][row + 1] = null;
                pillarData[col + 1][row + 1] = null;
            }

            col += 2;
        }
        row += 2;
    }

    // levels/towndata/sector1s.dun -> sector1s
    var dunName = path.basename(dunPath, '.dun');
    var startCoord = getStartCoord(dunName);

    return new DunFile(startCoord, pillarData, dunName);
}

module.exports = {
    load: _load
};
