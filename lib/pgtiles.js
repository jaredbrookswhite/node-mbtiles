var fs = require('fs');
var crypto = require('crypto');
var zlib = require('zlib');
var path = require('path');
var url = require('url');
var qs = require('querystring');
var Buffer = require('buffer').Buffer;
var sm = new (require('sphericalmercator'));
var tiletype = require('tiletype');
var pg = require('pg');
var util = require('util');

function noop(err) {
    if (err) throw err;
}

function hash(z, x, y) {
    return (1 << z) * ((1 << z) + x) + y;
}

// pgtiles
// -------
// pgtiles class for doing common operations (schema setup, tile reading,
// insertion, etc.)
module.exports = pgtiles;
pgtiles.utils = require('./utils');
pgtiles.schema = fs.readFileSync(__dirname + '/schema.sql', 'utf8');

// Provides access to an pgtiles database file.
// - uri: A parsed URL hash, the only relevant part is `pathname`.
// - callback: Will be called when the resources have been acquired
//       or acquisition failed.
require('util').inherits(pgtiles, require('events').EventEmitter)
function pgtiles(db, callback) {

    db.query = db.query || {};

    var pgtiles = this;
    this.setMaxListeners(0);
    pgtiles._db = new pg.Client(db.connection);
    pgtiles._db.connect(function(err) {
        if (err) {
            return console.error('could not connect to postgres', err);
        }
        pgtiles._exists('pgimgtiles');
        callback(null, pgtiles);
    });

};

pgtiles.registerProtocols = function(tilelive) {
    tilelive.protocols['pgtiles:'] = pgtiles;
    tilelive.protocols['pgvectiles:'] = pgtiles;
};


// Retrieve the schema of the current pgtiles database and inform the caller of
// whether the specified table exists.
pgtiles.prototype._exists = function(table, callback) {
    if (typeof callback !== 'function') callback = noop;

    if (this._schema) return callback(null, this._schema.indexOf(table) !== -1);

    var sql = util.format("SELECT to_regclass('public.%s');", table);
    var pgtiles = this;
    this._db.query(sql, function(err, rows) {
        if (err) return callback(err);
        if (rows.rows[0].to_regclass == null)
            return new Error(table + ' does not exist in database');
    });
};

// Setup schema, indices, views for a new pgtiles database.
// - @param {Function(err)} callback
pgtiles.prototype._setup = function(callback) {
    this._db.query(pgtiles.schema, callback);
};



// Obtain metadata from the database. Performing fallback queries if certain
// keys(like `bounds`, `minzoom`, `maxzoom`) have not been provided.
//
// - @param {Function(err, data)} callback
/*pgtiles.prototype.getInfo = function(callback) {
 if (typeof callback !== 'function') throw new Error('Callback needed');
 var backend_decoy = {
 _minzoom: 0,
 _maxzoom: 22,
 _vector_layers: undefined,
 _layer: undefined,
 _maskLevel:undefined,
 data:undefined,
 _maskLevel:undefined,
 _source:undefined

 };
 callback(null,backend_decoy)
 };*/

// Select a tile from an pgtiles database. Scheme is XYZ.
//
// - @param {Number} m map parameter
// - @param {Number} z tile z coordinate.
// - @param {Number} x tile x coordinate.
// - @param {Number} y tile y coordinate.
// - @param {Number} vec is vector?.
// - @param {Function(err, grid, headers)} callback
pgtiles.prototype.getTile = function(m, z, x, y, vec, callback) {
    if (typeof callback === 'undefined') {
        callback = vec;
        vec = false;
    }
    else if (typeof callback !== 'function') throw new Error('Callback needed');
    var ttable = vec ? 'pgvectiles':'pgimgtiles';

    y = ((1 << z) - 1 - y);
    var sql = util.format('SELECT tile_data FROM %s WHERE m = \'%s\' and z = %s AND x = %s AND y = %s', ttable, m, z, x, y);
    var pgtiles = this;
    this._db.query(sql, function(err, row) {
        if ((!err && row.rows.length == 0) || (err && err.errno == 1)) {
            return callback(new Error('Tile does not exist'));
        } else if (err) {
            return callback(err);
        } else {
            var dbase = row.rows[0].tile_data.toString('base64');
            var data = vec ? row.rows[0].tile_data : Buffer(row.rows[0].tile_data, 'base64');
            var headers = tiletype.headers(data);
            if (!vec){
                headers['Content-Type'] = 'image/png';
            }
            return callback(null, data, headers);
        }
    });
};

pgtiles.prototype.close = function(callback) {
    this._db.close(callback);
};


// Inserts a tile into the pgtiles store. Scheme is XYZ.
//
// - @param {Number} m tile map parameter
// - @param {Number} z tile z coordinate
// - @param {Number} x tile x coordinate
// - @param {Number} y tile y coordinate
// - @param {Number} vec is vector?.
// - @param {Buffer} buffer tile image data
// - @param {Function(err)} callback
pgtiles.prototype.putTile = function(m, z, x, y, data, callback) {
    if (typeof callback !== 'function') throw new Error('Callback needed');
    if (!Buffer.isBuffer(data)) return callback(new Error('Image needs to be a Buffer'));
    y = ((1 << z) - 1 - y);
    var base = data.toString('base64');
    var sql = util.format('INSERT INTO pgimgtiles (m, z, x, y, tile_data) values (\'%s\', %s, %s, %s, \'%s\')',
        m, z, x, y, base
    );
    this._db.query(sql, function(err){
        if (err) return err;
        var headers = tiletype.headers(data);
        return callback(null, data, headers);
    });

};

