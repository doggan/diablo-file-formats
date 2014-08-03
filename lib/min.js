'use strict';

var path = require('path'),
    minConfig = require('./config/min_info');

/**
 * MIN files contain information on how to arrange the frames
 * in a CEL image, in order to form a vertical pillar. This allows
 * for 'tall' configurations of images, such as for trees and roofs.
 *
 * A single pillar is arranged in the following configuration,
 * vertically from top to bottom. Depending on the specific file,
 * MIN files will have either 16 or 10 blocks.
 *
 *    +----+----+
 *    |  0 |  1 |
 *    +----+----+
 *    |  2 |  3 |
 *    +----+----+
 *    |  4 |  5 |
 *    +----+----+
 *    |  6 |  7 |
 *    +----+----+
 *    |  8 |  9 |
 *    +----+----+
 *    | 10 | 11 |
 *    +----+----+
 *    | 12 | 13 |
 *    +----+----+
 *    | 14 | 15 |
 *    +----+----+
 */
function MinFile(pillars) {
    this.pillars = pillars;
}

function getBlockCountPerPillar(minName) {
    var pillarCount = minConfig[minName];
    if (typeof pillarCount == 'undefined') {
        console.error('Unhandled MIN file: ' + minName);
        return 0;
    }

    return pillarCount;
}

var BYTE_COUNT_PER_BLOCK = 2;

function _load(buffer, minPath) {
    // levels/towndata/town.min -> town
    var minName = path.basename(minPath, '.min');
    var blockCountPerPillar = getBlockCountPerPillar(minName);
    var totalBlockCount = buffer.length / BYTE_COUNT_PER_BLOCK;

    // There should be exactly the correct # of bytes for creating the pillars.
    if ((buffer.length % BYTE_COUNT_PER_BLOCK) !== 0 ||
        (totalBlockCount % blockCountPerPillar) !== 0) {
        console.error('Invalid MIN file size [' + buffer.length + '] for ' + minPath);
        return null;
    }

    var pillars = new Array(totalBlockCount / blockCountPerPillar);

    var offset = 0;
    for (var p = 0; p < pillars.length; p++) {
        var pillarBlocks = new Array(blockCountPerPillar);
        for (var i = 0; i < blockCountPerPillar; i++) {
            // Read in the raw block value.
            var rawBlockValue = buffer.readUInt16LE(offset);
            offset += BYTE_COUNT_PER_BLOCK;

            // Parse the block value for easy usage.
            var frameNumPlus1 = (rawBlockValue & 0x0FFF);
            if (frameNumPlus1 !== 0) {
                pillarBlocks[i] = {
                    frameNum: frameNumPlus1 - 1,
                    type: (rawBlockValue & 0x7000) >>> 12
                };
            } else {
                pillarBlocks[i] = null;
            }
        }

        pillars[p] = pillarBlocks;
    }

    return new MinFile(pillars);
}

module.exports = {
    load: _load
};
