diablo-file-formats
==================
Handles parsing of binary files found within Diablo 1 MPQ archives, and the creation of convenient run-time data structures.

Currently supported file formats:
 * ```.cel```
 * ```.cl2``` (partial)
 * ```.pal```
 * ```.dun```
 * ```.til```
 * ```.min```
 * ```.sol```

## Installation
``` bash
npm install diablo-file-formats
```

## Usage
```javascript
// 1). Require the package.
var DFormats = require('diablo-file-formats');

// 2). Read the file.
var path = 'levels/towndata/town.pal';
fs.readFile(path, function read(err, buffer) {
    // 3). Parse the file.
    var palFile = DFormats.Pal.load(buffer, path);
    
    // 4). Do something with the file.
    for (var i = 0; i < palFile.colors; i++) {
        console.log(palFile.colors[i]);
    }
});

```

## Protip
Use along with MPQ readers like [mech-mpq](https://www.npmjs.org/package/mech-mpq) or [mpq-server](https://www.npmjs.org/package/mpq-server) to dynamically extract and parse the MPQ archive (without having to pre-extract the contents).
