var BYTES_PER_PIXEL = 4;    // RGBA
var TRANSPARENT_COLOR = { r: 0, g: 0, b: 0, a: 0 };

/**
 * Utility for setting pixels.
 */
function getPixelSetter() {
    var offset = 0;
    return function(colors, c) {
        colors[offset] = c.r;
        colors[offset + 1] = c.g;
        colors[offset + 2] = c.b;
        colors[offset + 3] = c.a;
        offset += 4;
    };
}

/**
 * Returns true if the image is a plain 32x32.
 */
function isType0(celName, frameNum) {
    // These special frames are type 1.
    switch (celName) {
    case 'l1':
        switch (frameNum) {
        case 148: case 159: case 181: case 186: case 188:
            return false;
        }
        break;
    case 'l2':
        switch (frameNum) {
        case 47: case 1397: case 1399: case 1411:
            return false;
        }
        break;
    case 'l4':
        switch (frameNum) {
        case 336: case 639:
            return false;
        }
        break;
    case 'town':
        switch (frameNum) {
        case 2328: case 2367: case 2593:
            return false;
        }
    }

    return true;
}

/**
 * Returns true if the image is a less-than (<) shape.
 */
function isType2or4(frameData) {
    var zeroPositions = [0, 1, 8, 9, 24, 25, 48, 49, 80, 81, 120, 121, 168, 169, 224, 225];
    for (var i = 0; i < zeroPositions.length; i++) {
        if (frameData[zeroPositions[i]] !== 0) {
            return false;
        }
    }

    return true;
}

/**
 * Returns true if the image is a greater-than (>) shape.
 */
function isType3or5(frameData) {
    var zeroPositions = [2, 3, 14, 15, 34, 35, 62, 63, 98, 99, 142, 143, 194, 195, 254, 255];
    for (var i = 0; i < zeroPositions.length; i++) {
        if (frameData[zeroPositions[i]] !== 0) {
            return false;
        }
    }

    return true;
}

/**
 * Type0 corresponds to plain 32x32 images with no transparency.
 *
 * 	1) Range through the frame, one byte at the time.
 * 		- Each byte corresponds to a color index of the palette.
 * 		- Set one regular pixel per byte, using the color index to locate the
 * 		  color in the palette.
 */
function DecodeFrameType0(frameData, width, height, palFile) {
    var colors = new Uint8Array(width * height * BYTES_PER_PIXEL);
    var setPixel = getPixelSetter();
    for (var i = 0; i < frameData.length; i++) {
        setPixel(colors, palFile.colors[frameData[i]]);
    }

    return {
        width: width,
        height: height,
        colors: colors
    };
}

/**
 * Type1 corresponds to 32x32 images with arbitrary color / transparency data.
 *
 *  1). Read one byte (chunkSize).
 *  2). If chunkSize >= 128:
 *  	- Set (256 - chunkSize) # of transparent pixels.
 *  3). Else (chunkSize < 128):
 *  	- Set chunkSize # of regular pixels, using the color index to locate
 *  	  the color in the palette.
 *  	- Increment the frame counter for each byte read.
 *  4). Repeat from 1 till end of frame data.
 */
function DecodeFrameType1(frameData, width, height, palFile) {
    var colors = new Uint8Array(width * height * BYTES_PER_PIXEL);
    var setPixel = getPixelSetter();

    var j;
    for (var i = 0; i < frameData.length; /*i++*/) {
        var chunkSize = frameData[i++];
        if (chunkSize & 0x80) {
            // Transparent chunk.
            chunkSize = 256 - chunkSize;
            for (j = 0; j < chunkSize; j++) {
                setPixel(colors, TRANSPARENT_COLOR);
            }
        } else {
            // Regular (colored) chunk.
            for (j = 0; j < chunkSize; j++) {
                setPixel(colors, palFile.colors[frameData[i++]]);
            }
        }
    }

    return {
        width: width,
        height: height,
        colors: colors
    };
}

/**
 * Type2 corresponds to 32x32 images of left facing triangles (<).
 *
 * 	1) Dump one line of 32 pixels at the time.
 * 		- The illustration below tells if a pixel is transparent or regular.
 * 		- Only regular and zero (transparent) pixels are explicitly stored in
 * 		  the frame content. All other pixels of the illustration are
 * 		  implicitly transparent.
 *
 * Below is an illustration of the 32x32 image, where a space represents an
 * implicit transparent pixel, a '0' represents an explicit transparent pixel
 * and an 'x' represents an explicit regular pixel.
 *
 * Note: The output image will be "upside-down" compared to the illustration.
 *
 *    +--------------------------------+
 *    |                                |
 *    |                            00xx|
 *    |                            xxxx|
 *    |                        00xxxxxx|
 *    |                        xxxxxxxx|
 *    |                    00xxxxxxxxxx|
 *    |                    xxxxxxxxxxxx|
 *    |                00xxxxxxxxxxxxxx|
 *    |                xxxxxxxxxxxxxxxx|
 *    |            00xxxxxxxxxxxxxxxxxx|
 *    |            xxxxxxxxxxxxxxxxxxxx|
 *    |        00xxxxxxxxxxxxxxxxxxxxxx|
 *    |        xxxxxxxxxxxxxxxxxxxxxxxx|
 *    |    00xxxxxxxxxxxxxxxxxxxxxxxxxx|
 *    |    xxxxxxxxxxxxxxxxxxxxxxxxxxxx|
 *    |00xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx|
 *    |xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx|
 *    |00xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx|
 *    |    xxxxxxxxxxxxxxxxxxxxxxxxxxxx|
 *    |    00xxxxxxxxxxxxxxxxxxxxxxxxxx|
 *    |        xxxxxxxxxxxxxxxxxxxxxxxx|
 *    |        00xxxxxxxxxxxxxxxxxxxxxx|
 *    |            xxxxxxxxxxxxxxxxxxxx|
 *    |            00xxxxxxxxxxxxxxxxxx|
 *    |                xxxxxxxxxxxxxxxx|
 *    |                00xxxxxxxxxxxxxx|
 *    |                    xxxxxxxxxxxx|
 *    |                    00xxxxxxxxxx|
 *    |                        xxxxxxxx|
 *    |                        00xxxxxx|
 *    |                            xxxx|
 *    |                            00xx|
 *    +--------------------------------+
 */
function DecodeFrameType2(frameData, width, height, palFile) {
    var colors = new Uint8Array(width * height * BYTES_PER_PIXEL);
    var setPixel = getPixelSetter();

    var decodeCounts = [0, 4, 4, 8, 8, 12, 12, 16, 16, 20, 20, 24, 24, 28, 28, 32, 32, 32, 28, 28, 24, 24, 20, 20, 16, 16, 12, 12, 8, 8, 4, 4];
    var frameReadOffset = 0;
    for (var i = 0; i < decodeCounts.length; i++) {
        var zeroCount = ((i % 2) === 0) ? 0 : 2;
        var decodeCount = decodeCounts[i];
        decodeLineTransparencyLeft(colors, frameData, frameReadOffset, decodeCount, zeroCount, palFile, setPixel);
        frameReadOffset += decodeCount;
    }

    return {
        width: width,
        height: height,
        colors: colors
    };
}

/**
 * Type3 corresponds to 32x32 images of right facing triangles (>).
 *
 * 	1) Dump one line of 32 pixels at the time.
 * 		- The illustration below tells if a pixel is transparent or regular.
 * 	 	- Only regular and zero (transparent) pixels are explicitly stored in
 * 		  the frame content. All other pixels of the illustration are
 * 		  implicitly transparent.
 *
 * Below is an illustration of the 32x32 image, where a space represents an
 * implicit transparent pixel, a '0' represents an explicit transparent pixel
 * and an 'x' represents an explicit regular pixel.
 *
 * Note: The output image will be "upside-down" compared to the illustration.
 *
 *    +--------------------------------+
 *    |                                |
 *    |xx00                            |
 *    |xxxx                            |
 *    |xxxxxx00                        |
 *    |xxxxxxxx                        |
 *    |xxxxxxxxxx00                    |
 *    |xxxxxxxxxxxx                    |
 *    |xxxxxxxxxxxxxx00                |
 *    |xxxxxxxxxxxxxxxx                |
 *    |xxxxxxxxxxxxxxxxxx00            |
 *    |xxxxxxxxxxxxxxxxxxxx            |
 *    |xxxxxxxxxxxxxxxxxxxxxx00        |
 *    |xxxxxxxxxxxxxxxxxxxxxxxx        |
 *    |xxxxxxxxxxxxxxxxxxxxxxxxxx00    |
 *    |xxxxxxxxxxxxxxxxxxxxxxxxxxxx    |
 *    |xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx00|
 *    |xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx|
 *    |xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx00|
 *    |xxxxxxxxxxxxxxxxxxxxxxxxxxxx    |
 *    |xxxxxxxxxxxxxxxxxxxxxxxxxx00    |
 *    |xxxxxxxxxxxxxxxxxxxxxxxx        |
 *    |xxxxxxxxxxxxxxxxxxxxxx00        |
 *    |xxxxxxxxxxxxxxxxxxxx            |
 *    |xxxxxxxxxxxxxxxxxx00            |
 *    |xxxxxxxxxxxxxxxx                |
 *    |xxxxxxxxxxxxxx00                |
 *    |xxxxxxxxxxxx                    |
 *    |xxxxxxxxxx00                    |
 *    |xxxxxxxx                        |
 *    |xxxxxx00                        |
 *    |xxxx                            |
 *    |xx00                            |
 *    +--------------------------------+
 */
function DecodeFrameType3(frameData, width, height, palFile) {
    var colors = new Uint8Array(width * height * BYTES_PER_PIXEL);
    var setPixel = getPixelSetter();

    var decodeCounts = [0, 4, 4, 8, 8, 12, 12, 16, 16, 20, 20, 24, 24, 28, 28, 32, 32, 32, 28, 28, 24, 24, 20, 20, 16, 16, 12, 12, 8, 8, 4, 4];
    var frameReadOffset = 0;
    for (var i = 0; i < decodeCounts.length; i++) {
        var zeroCount = ((i % 2) === 0) ? 0 : 2;
        var decodeCount = decodeCounts[i];
        decodeLineTransparencyRight(colors, frameData, frameReadOffset, decodeCount, zeroCount, palFile, setPixel);
        frameReadOffset += decodeCount;
    }

    return {
        width: width,
        height: height,
        colors: colors
    };
}

/**
 * Type4 corresponds to 32x32 images of left facing triangles (<), with
 * an additional section of the image filled in with solid colors.
 *
 *  1) Dump one line of 32 pixels at the time.
 *      - The illustration below tells if a pixel is transparent or regular.
 *      - Only regular and zero (transparent) pixels are explicitly stored in
 *        the frame content. All other pixels of the illustration are
 *        implicitly transparent.
 *
 * Below is an illustration of the 32x32 image, where a space represents an
 * implicit transparent pixel, a '0' represents an explicit transparent pixel
 * and an 'x' represents an explicit regular pixel.
 *
 * Note: The output image will be "upside-down" compared to the illustration.
 *
 *    +--------------------------------+
 *    |                            00xx|
 *    |                            xxxx|
 *    |                        00xxxxxx|
 *    |                        xxxxxxxx|
 *    |                    00xxxxxxxxxx|
 *    |                    xxxxxxxxxxxx|
 *    |                00xxxxxxxxxxxxxx|
 *    |                xxxxxxxxxxxxxxxx|
 *    |            00xxxxxxxxxxxxxxxxxx|
 *    |            xxxxxxxxxxxxxxxxxxxx|
 *    |        00xxxxxxxxxxxxxxxxxxxxxx|
 *    |        xxxxxxxxxxxxxxxxxxxxxxxx|
 *    |    00xxxxxxxxxxxxxxxxxxxxxxxxxx|
 *    |    xxxxxxxxxxxxxxxxxxxxxxxxxxxx|
 *    |00xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx|
 *    |xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx|
 *    |xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx|
 *    |xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx|
 *    |xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx|
 *    |xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx|
 *    |xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx|
 *    |xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx|
 *    |xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx|
 *    |xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx|
 *    |xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx|
 *    |xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx|
 *    |xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx|
 *    |xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx|
 *    |xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx|
 *    |xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx|
 *    |xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx|
 *    |xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx|
 *    +--------------------------------+
 */
function DecodeFrameType4(frameData, width, height, palFile) {
    var colors = new Uint8Array(width * height * BYTES_PER_PIXEL);
    var setPixel = getPixelSetter();

    var decodeCounts = [4, 4, 8, 8, 12, 12, 16, 16, 20, 20, 24, 24, 28, 28, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32];
    var frameReadOffset = 0;
    for (var i = 0; i < decodeCounts.length; i++) {
        var zeroCount = 0;
        switch (i) {
        case 0: case 2: case 4: case 6: case 8: case 10: case 12: case 14:
            zeroCount = 2;
        }
        var decodeCount = decodeCounts[i];
        decodeLineTransparencyLeft(colors, frameData, frameReadOffset, decodeCount, zeroCount, palFile, setPixel);
        frameReadOffset += decodeCount;
    }

    return {
        width: width,
        height: height,
        colors: colors
    };
}

/**
 * Type5 corresponds to 32x32 images of right facing triangles (>), with
 * an additional section of the image filled in with solid colors.
 *
 *  1) Dump one line of 32 pixels at the time.
 *      - The illustration below tells if a pixel is transparent or regular.
 *      - Only regular and zero (transparent) pixels are explicitly stored in
 *        the frame content. All other pixels of the illustration are
 *        implicitly transparent.
 *
 * Below is an illustration of the 32x32 image, where a space represents an
 * implicit transparent pixel, a '0' represents an explicit transparent pixel
 * and an 'x' represents an explicit regular pixel.
 *
 * Note: The output image will be "upside-down" compared to the illustration.
 *
 *    +--------------------------------+
 *    |xx00                            |
 *    |xxxx                            |
 *    |xxxxxx00                        |
 *    |xxxxxxxx                        |
 *    |xxxxxxxxxx00                    |
 *    |xxxxxxxxxxxx                    |
 *    |xxxxxxxxxxxxxx00                |
 *    |xxxxxxxxxxxxxxxx                |
 *    |xxxxxxxxxxxxxxxxxx00            |
 *    |xxxxxxxxxxxxxxxxxxxx            |
 *    |xxxxxxxxxxxxxxxxxxxxxx00        |
 *    |xxxxxxxxxxxxxxxxxxxxxxxx        |
 *    |xxxxxxxxxxxxxxxxxxxxxxxxxx00    |
 *    |xxxxxxxxxxxxxxxxxxxxxxxxxxxx    |
 *    |xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx00|
 *    |xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx|
 *    |xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx|
 *    |xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx|
 *    |xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx|
 *    |xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx|
 *    |xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx|
 *    |xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx|
 *    |xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx|
 *    |xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx|
 *    |xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx|
 *    |xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx|
 *    |xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx|
 *    |xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx|
 *    |xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx|
 *    |xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx|
 *    |xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx|
 *    |xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx|
 *    +--------------------------------+
 */
function DecodeFrameType5(frameData, width, height, palFile) {
    var colors = new Uint8Array(width * height * BYTES_PER_PIXEL);
    var setPixel = getPixelSetter();

    var decodeCounts = [4, 4, 8, 8, 12, 12, 16, 16, 20, 20, 24, 24, 28, 28, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32];
    var frameReadOffset = 0;
    for (var i = 0; i < decodeCounts.length; i++) {
        var zeroCount = 0;
        switch (i) {
        case 0: case 2: case 4: case 6: case 8: case 10: case 12: case 14:
            zeroCount = 2;
        }
        var decodeCount = decodeCounts[i];
        decodeLineTransparencyRight(colors, frameData, frameReadOffset, decodeCount, zeroCount, palFile, setPixel);
        frameReadOffset += decodeCount;
    }

    return {
        width: width,
        height: height,
        colors: colors
    };
}

/**
 * Type6 corresponds to an image with arbitrary color / transparency data.
 * Both transparent and color data use run-length encoding for compression.
 *
 *  1). Read one byte (chunkSize).
 *  2). If chunkSize >= 128:
 *  	- Subtract chunkSize from 256
 *  	2a). If chunkSize <= 65, read that many bytes.
 *  		- Each byte read corresponds to a color index in the palette.
 *  		- Set the pixel color to this color.
 *    	2b). Else (chunkSize > 65), subtract 65 and read one byte.
 *    		- The byte corresponds to a color index in the palette.
 *    		- Set chunkSize # of pixels to this color.
 *  3). Else (chunkSize < 128):
 *  	- Set chunkSize # of transparent pixels.
 *  4). Repeat from 1 till end of frame data.
 */
function DecodeFrameType6(frameData, width, height, palFile) {
    var colors = new Uint8Array(width * height * BYTES_PER_PIXEL);
    var setPixel = getPixelSetter();

    // TODO: ?? investigate where this is coming from
    var headerSizeSkip = 10;

    var j;
    for (var i = headerSizeSkip; i < frameData.length; /*i++*/) {
        var chunkSize = frameData[i++];
        if (chunkSize & 0x80) {
            // Regular (colored) chunks.
            chunkSize = 256 - chunkSize;

            if (chunkSize <= 65) {
                for (j = 0; j < chunkSize; j++) {
                    setPixel(colors, palFile.colors[frameData[i++]]);
                }
            } else {
                // Run-length encoding (repeat the same color).
                chunkSize -= 65;
                var color = palFile.colors[frameData[i++]];
                for (j = 0; j < chunkSize; j++) {
                    setPixel(colors, color);
                }
            }
        } else {
            // Transparent chunk.
            for (j = 0; j < chunkSize; j++) {
                setPixel(colors, TRANSPARENT_COLOR);
            }
        }
    }

    return {
        width: width,
        height: height,
        colors: colors
    };
}

/**
 * Decodes a line of the frame, where decodeCount is the total # of
 * explicit pixels, and zeroCount is the total # of explicit transparent
 * pixels, and the rest of the line is implictly transparent.
 *
 * Each line is assumed to have a width of 32 pixels.
 */
function decodeLineTransparencyLeft(colors, frameData, frameReadOffset, decodeCount, zeroCount, palFile, setPixel) {
    // Implicit transparent pixels.
    for (var i = decodeCount; i < 32; i++) {
        setPixel(colors, TRANSPARENT_COLOR);
    }

    // Explicit transparent pixels (zeroes).
    for (i = 0; i < zeroCount; i++) {
        setPixel(colors, TRANSPARENT_COLOR);
    }

    // Explicit regular pixels.
    for (i = zeroCount; i < decodeCount; i++) {
        setPixel(colors, palFile.colors[frameData[frameReadOffset + i]]);
    }
}

/**
 * Decodes a line of the frame, where decodeCount is the total # of
 * explicit pixels, and zeroCount is the total # of explicit transparent
 * pixels, and the rest of the line is implictly transparent.
 *
 * Each line is assumed to have a width of 32 pixels.
 */
function decodeLineTransparencyRight(colors, frameData, frameReadOffset, decodeCount, zeroCount, palFile, setPixel) {
    // Total # of explicit pixels.
    var regularCount = decodeCount - zeroCount;

    // Implicit transparent pixels.
    for (var i = 0; i < regularCount; i++) {
        setPixel(colors, palFile.colors[frameData[frameReadOffset + i]]);
    }

    // Explicit transparent pixels (zeroes).
    for (i = 0; i < zeroCount; i++) {
        setPixel(colors, TRANSPARENT_COLOR);
    }

    // Explicit regular pixels.
    for (i = decodeCount; i < 32; i++) {
        setPixel(colors, TRANSPARENT_COLOR);
    }
}

/**
 * Gets the appropriate frame decoder for the particular frame.
 */
function _getCelFrameDecoder(celName, frameData, frameNum) {
    var frameSize = frameData.length;

    switch (celName) {
    case 'l1': case 'l2': case 'l3': case 'l4': case 'town':
        // Some regular (type 1) CEL images just happen to have a frame size of
		// exactly 0x220, 0x320 or 0x400. Therefore the isType* functions are
		// required to figure out the appropriate decoding function.
        switch (frameSize) {
        case 0x400:
            if (isType0(celName, frameNum)) {
                return DecodeFrameType0;
            }
            break;
        case 0x220:
            if (isType2or4(frameData)) {
                return DecodeFrameType2;
            } else if (isType3or5(frameData)) {
                return DecodeFrameType3;
            }
            break;
        case 0x320:
            if (isType2or4(frameData)) {
                return DecodeFrameType4;
            } else if (isType3or5(frameData)) {
                return DecodeFrameType5;
            }
        }
    }

    return DecodeFrameType1;
}

function _getCl2FrameDecoder() {
    return DecodeFrameType6;
}

module.exports = {
    getCelFrameDecoder: _getCelFrameDecoder,
    getCl2FrameDecoder: _getCl2FrameDecoder
};
