/**
 * SOL files contain meta information about pillars, such as
 * collision and transparency properties.
 *
 * The usage of some of the bits are currently unknown.
 */
function SolFile(data) {
    this.data = data;
}

var CHECK_COLLISION = 0x01;
var CHECK_0x02 = 0x02;
var CHECK_COLLISION_RANGE = 0x04;
var CHECK_TRANSPARENCY = 0x08;
var CHECK_0x10 = 0x10;
var CHECK_0x20 = 0x20;
var CHECK_0x40 = 0x40;
var CHECK_0x80 = 0x80;

SolFile.prototype = {
    /**
     * Returns true if the block has collision and should
     * not be passable by player / enemies.
     */
    isCollision: function(pillarIndex) {
        return ((this.data[pillarIndex] & CHECK_COLLISION) !== 0);
    },

    /**
     * Returns true if the block has 'range' collision, for things
     * like missiles and summoning of monsters.
     */
    isCollisionRange: function(pillarIndex) {
        return ((this.data[pillarIndex] & CHECK_COLLISION_RANGE) !== 0);
    },

    /**
     * Returns true if the block allows for transparency.
     */
    allowTransparency: function(pillarIndex) {
        return ((this.data[pillarIndex] & CHECK_TRANSPARENCY) !== 0);
    }
};

function _load(buffer, path) {
    var solData = new Array(buffer.length);
    var offset = 0;
    for (var i = 0; i < solData.length; i++) {
        solData[i] = buffer.readUInt8(offset++);
    }

    return new SolFile(solData);
}

module.exports = {
    load: _load
};
