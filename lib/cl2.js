var Cel = require('./cel'),
    cl2Config = require('./config/cl2_info');

function Cl2File(images) {
    this.images = images;
}

var ARCHIVE_IMAGE_COUNT = 8;

Cl2File.prototype.decodeFrames = function(palFile) {

};

function _load(buffer, cl2Path) {
    // TODO: archives only
    if (buffer.readUInt32LE(0) === 32) {
        console.log('archive file!');
    } else {
        console.log('not an archive file!!');
        return null;
    }

    var i, j;
    var offset = 0;

    // Header offsets.
    var headerOffsets = new Array(ARCHIVE_IMAGE_COUNT);
    for (i = 0; i < headerOffsets.length; i++) {
        headerOffsets[i] = buffer.readUInt32LE(offset);
        offset += 4;
    }

    // Process the images. Each image content is a CEL file.
    var images = new Array(headerOffsets.length);
    for (i = 0; i < images.length; i++) {
        var imageBuffer = buffer.slice(headerOffsets[i]);
        images[i] = Cel.load(imageBuffer, cl2Path);
    }

    return new Cl2File(images);
}

module.exports = {
    load: _load
};
