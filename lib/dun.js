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
function DunFile(startCoord, rawPillarData, dunName) {
    this.startCol = startCoord[0];
    this.startRow = startCoord[1];
    this.fileName = dunName;

    this.rawPillarData = rawPillarData;
    this.rawColCount = this.rawPillarData.length;
    this.rawRowCount = (this.rawColCount > 0) ? this.rawPillarData[0].length : 0;

    this.pillarData = null;     // Initialized during unpack operation.
    this.colCount = this.rawColCount * 2;
    this.rowCount = this.rawRowCount * 2;
}

/**
 * Unpacks the pillar data of the DUN file using the TIL file to perform
 * square index lookups. DUN file can be used without unpacking, but
 * this operation will convert it to an easier to use format.
 */
DunFile.prototype.unpack = function(tilFile) {
    // Already unpacked?
    if (this.pillarData !== null) {
        return;
    }

    // Pre-allocate.
    this.pillarData = new Array(this.colCount);
    for (var i = 0; i < this.pillarData.length; i++) {
        this.pillarData[i] = new Array(this.rowCount);
    }

    // Parse pillar data.
    var row = 0;
    for (i = 0; i < this.rawRowCount; i++) {
        var col = 0;
        for (var j = 0; j < this.rawColCount; j++) {
            var squareIndexPlus1 = this.rawPillarData[j][i];
            if (squareIndexPlus1 !== 0) {
                var square = tilFile.squares[squareIndexPlus1 - 1];

                this.pillarData[col][row] = square[Til.SQUARE_TOP];
                this.pillarData[col + 1][row] = square[Til.SQUARE_RIGHT];
                this.pillarData[col][row + 1] = square[Til.SQUARE_LEFT];
                this.pillarData[col + 1][row + 1] = square[Til.SQUARE_BOTTOM];
            } else {
                this.pillarData[col][row] = null;
                this.pillarData[col + 1][row] = null;
                this.pillarData[col][row + 1] = null;
                this.pillarData[col + 1][row + 1] = null;
            }

            col += 2;
        }
        row += 2;
    }
};

function getStartCoord(dunName) {
    var startCoord = dunConfig[dunName];
    if (typeof startCoord == 'undefined') {
        console.error('Unhandled DUN file: ' + dunName);
        return [0, 0];
    }

    return startCoord;
}

function _load(buffer, dunPath) {
    var offset = 0;
    var colCount = buffer.readUInt16LE(offset);
    var rowCount = buffer.readUInt16LE(offset += 2);

    // Pre-allocate.
    var rawPillarData = new Array(colCount);
    for (var i = 0; i < rawPillarData.length; i++) {
        rawPillarData[i] = new Array(rowCount);
    }

    // Parse pillar data.
    for (i = 0; i < rowCount; i++) {
        for (var j = 0; j < colCount; j++) {
            rawPillarData[j][i] = buffer.readUInt16LE(offset += 2);
        }
    }

    // levels/towndata/sector1s.dun -> sector1s
    var dunName = path.basename(dunPath, '.dun');
    var startCoord = getStartCoord(dunName);

    return new DunFile(startCoord, rawPillarData, dunName);
}

module.exports = {
    load: _load
};
