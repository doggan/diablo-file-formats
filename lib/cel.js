var cel_decode = require('./cel_decode'),
    celConfig = require('./config/cel_info'),
    pathLib = require('path');

/**
 * CEL files hold image data. Similar to GIF images, they
 * contain multiple frames and use color palettes (PAL). They are used
 * for things like animations, effects, and tile sets.
 *
 * There are many different optimizations that are applied to the individual
 * CEL types and frames in order to improve data compression, so the
 * decoding of CEL files can be tricky and very specialized.
 */
function CelFile(frames, path, name) {
    this.frames = frames;
    this.path = path;
    this.name = name;
}

function getFrameDimensions(celName) {
    var entry = celConfig[celName];
    if (typeof entry == 'undefined') {
        return [32, 32];
    }

    return [entry.w, entry.h];
}

function getFrameHeaderSize(celName) {
    var entry = celConfig[celName];
    if (typeof entry == 'undefined') {
        return 0;
    }

    return entry.header;
}

/**
 * Decode all the frames within the CEL file, using the PAL file
 * to perform color palette lookup. This function constructs the
 * per-frame color data, which is used for rendering.
 */
CelFile.prototype.decodeFrames = function(palFile) {
    var frameDimensions = getFrameDimensions(this.name);
    var frameWidth = frameDimensions[0];
    var frameHeight = frameDimensions[1];

    // Decode each frame with the appropriate decoder.
    var frames = this.frames;
    var decodedFrames = new Array(frames.length);
    for (var i = 0; i < frames.length; i++) {
        var frameData = frames[i];
        var frameDecoder = cel_decode.getCelFrameDecoder(this.name, frameData, i);
        decodedFrames[i] = frameDecoder(frameData, frameWidth, frameHeight, palFile);
    }

    return decodedFrames;
};

function _load(buffer, celPath) {
    var offset = 0;
    var frameCount = buffer.readUInt32LE(offset);

    // Frame offsets.
    // frameCount # of offsets + 1 for the endOffset
    var frameOffsets = new Array(frameCount + 1);
    for (var i = 0; i < frameOffsets.length; i++) {
        frameOffsets[i] = buffer.readUInt32LE(offset += 4);
    }

    // levels/towndata/town.cel -> town
    var celName = pathLib.basename(celPath, '.cel');

    var headerSize = getFrameHeaderSize(celName);
    
    var frames = new Array(frameCount);
    for (i = 0; i < frames.length; i++) {
        var frameStart = frameOffsets[i] + headerSize;
        var frameEnd = frameOffsets[i + 1];
        var frameSize = frameEnd - frameStart;

        var frameData = new Array(frameSize);
        for (var j = 0; j < frameData.length; j++) {
            frameData[j] = buffer.readUInt8(frameStart + j);
        }

        frames[i] = frameData;
    }

    return new CelFile(frames, celPath, celName);
}

module.exports = {
    load: _load
};
