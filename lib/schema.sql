BEGIN;

CREATE TABLE IF NOT EXISTS pgvectiles (
	m varchar,
	x INTEGER,
	y INTEGER,
	z INTEGER,
	tile_data bytea
);

CREATE UNIQUE INDEX pgvectiles_index ON pgvectiles (m, x, y, z);

CREATE TABLE IF NOT EXISTS pgimgtiles (
	m varchar,
	x INTEGER,
	y INTEGER,
	z INTEGER,
	tile_data varchar
);


CREATE UNIQUE INDEX pgimgtiles_index ON pgimgtiles (m, x, y, z);

COMMIT;
