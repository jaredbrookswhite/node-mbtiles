# pgtiles

Simple alteration to node-mbtiles allowing for storing mbtiles in a postgres database, gutted for readability. you must use https://github.com/jaredbrookswhite/tilelive-vector for compatibility with tilelive-vector based mapbox builds.

[![Build Status](https://travis-ci.org/mapbox/node-mbtiles.svg?branch=master)](https://travis-ci.org/mapbox/node-mbtiles)
[![Build status](https://ci.appveyor.com/api/projects/status/04wbok5rs3eroffe)](https://ci.appveyor.com/project/Mapbox/node-mbtiles)

### Installation

    npm install mbtiles

### Use

    // call connection once and store in global variable
    // connection info can be found with the npm pg package
    new pgtiles({
            connection: {
              "user": "username",
              "password": "yourpassword",
              "database": "yourdb",
              "port": 5432,
              "host": "path/to/host",
              "ssl": true
            },
            query: { batch: 1 }
        }, function(err, pgtiles) {
            if (err) return err;
            tm.pgtiles = pgtiles;
        });

    //storage schema is simplified, use gettile and puttile as such,
    //m stands for map name and stores all records on a single table...
    //optimal for speed, no, but great for simplicity.
    pgtiles.gettile(m,z,x,y,callback);
    pgtiles.puttile(m,z,x,y,callback);

[1]: https://github.com/mapbox/tilelive.js
[2]: http://mbtiles.org
