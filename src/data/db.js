import alasql from 'alasql';

/**
 * SQLBolt Datasets & In-Memory SQL Execution Engine
 */

/** Drops and re-seeds every table, returning the database to its pristine state. */
export function resetDatabase() {
  try {
    // Drop everything rather than a fixed list, so tables a student creates in
    // the DDL lessons do not survive into the next run.
    for (const { tableid } of alasql('SHOW TABLES') || []) {
      alasql(`DROP TABLE IF EXISTS \`${tableid}\`;`);
    }
  } catch (e) {}

  // 1. Movies Table
  alasql(`
    CREATE TABLE movies (
      id INT PRIMARY KEY,
      title STRING,
      director STRING,
      year INT,
      length_minutes INT
    );
  `);

  alasql(`
    INSERT INTO movies VALUES
    (1, 'Toy Story', 'John Lasseter', 1995, 81),
    (2, 'A Bug''s Life', 'John Lasseter', 1998, 95),
    (3, 'Toy Story 2', 'John Lasseter', 1999, 92),
    (4, 'Monsters, Inc.', 'Pete Docter', 2001, 92),
    (5, 'Finding Nemo', 'Andrew Stanton', 2003, 107),
    (6, 'The Incredibles', 'Brad Bird', 2004, 115),
    (7, 'Cars', 'John Lasseter', 2006, 117),
    (8, 'Ratatouille', 'Brad Bird', 2007, 111),
    (9, 'WALL-E', 'Andrew Stanton', 2008, 98),
    (10, 'Up', 'Pete Docter', 2009, 101),
    (11, 'Toy Story 3', 'Lee Unkrich', 2010, 103),
    (12, 'Cars 2', 'John Lasseter', 2011, 106),
    (13, 'Brave', 'Mark Andrews', 2012, 102),
    (14, 'Monsters University', 'Dan Scanlon', 2013, 104);
  `);

  // 2. BoxOffice Table
  alasql(`
    CREATE TABLE boxoffice (
      movie_id INT,
      rating FLOAT,
      domestic_sales INT,
      international_sales INT
    );
  `);

  alasql(`
    INSERT INTO boxoffice VALUES
    (1, 8.3, 191796233, 170162503),
    (2, 7.2, 162798565, 200600000),
    (3, 7.9, 245852179, 251600000),
    (4, 8.1, 289916256, 272900000),
    (5, 8.1, 380843261, 555900000),
    (6, 8.0, 261441092, 370001000),
    (7, 7.2, 244082982, 217900100),
    (8, 8.0, 206445654, 417282858),
    (9, 8.4, 223808164, 297500000),
    (10, 8.3, 293004164, 438338580),
    (11, 8.4, 415004880, 651969703),
    (12, 6.3, 191452396, 368400000),
    (13, 7.2, 237283207, 303155000),
    (14, 7.4, 268492764, 475066843);
  `);

  // 3. North American Cities Table
  alasql(`
    CREATE TABLE north_american_cities (
      city STRING,
      country STRING,
      population INT,
      latitude FLOAT,
      longitude FLOAT
    );
  `);

  alasql(`
    INSERT INTO north_american_cities VALUES
    ('Guadalajara', 'Mexico', 1500800, 20.659699, -103.349609),
    ('Toronto', 'Canada', 2795060, 43.653226, -79.383184),
    ('Houston', 'United States', 2195914, 29.760427, -95.369803),
    ('New York', 'United States', 8405837, 40.712784, -74.005941),
    ('Philadelphia', 'United States', 1553165, 39.952584, -75.165222),
    ('Havana', 'Cuba', 2106146, 23.05407, -82.345189),
    ('Mexico City', 'Mexico', 8555500, 19.432608, -99.133208),
    ('Phoenix', 'United States', 1513367, 33.448377, -112.074037),
    ('Los Angeles', 'United States', 3884307, 34.052234, -118.243685),
    ('Monterrey', 'Mexico', 1135550, 25.686614, -100.316116),
    ('Chicago', 'United States', 2718782, 41.878114, -87.629798);
  `);

  // 4. Buildings Table
  alasql(`
    CREATE TABLE buildings (
      building_name STRING,
      capacity INT
    );
  `);

  alasql(`
    INSERT INTO buildings VALUES
    ('1e', 24),
    ('1w', 32),
    ('2e', 16),
    ('2w', 20);
  `);

  // 5. Employees Table
  alasql(`
    CREATE TABLE employees (
      role STRING,
      name STRING,
      building STRING,
      years_employed INT
    );
  `);

  alasql(`
    INSERT INTO employees VALUES
    ('Engineer', 'Becky A.', '1e', 4),
    ('Engineer', 'Dan B.', '1e', 2),
    ('Engineer', 'Sharon F.', '1e', 6),
    ('Engineer', 'Dan M.', '1e', 4),
    ('Engineer', 'Malachi S.', '1w', 1),
    ('Developer', 'Steve A.', '1w', 2),
    ('Developer', 'Yana L.', '1w', 6),
    ('Developer', 'Brenda R.', '1w', 7),
    ('Artist', 'Brandon J.', '2w', 7),
    ('Artist', 'Henri E.', '2w', 1),
    ('Artist', 'Carol J.', '2w', 4),
    ('Artist', 'Daniel U.', '2w', 2),
    ('Manager', 'Laura A.', '1e', 6),
    ('Manager', 'Alan J.', '1w', 11);
  `);
}

/** Table names that are legal unquoted in SQLite but reserved in alasql. */
const RESERVED_TABLE_NAMES = new Set(['database', 'order', 'group', 'table', 'index']);

/**
 * SQLBolt teaches SQLite, which the embedded lessons run. The offline
 * workspace runs alasql, which differs in two places these lessons hit.
 * Translating here means students are graded on the answer SQLBolt expects
 * rather than on our engine's quirks.
 */
function toAlasqlDialect(sql) {
  let out = sql;

  // SQLite accepts `ALTER TABLE t ADD col`; alasql requires the COLUMN keyword.
  if (/\bALTER\s+TABLE\b/i.test(out)) {
    out = out.replace(/\bADD\s+(?!COLUMN\b)([A-Za-z_]\w*)/gi, 'ADD COLUMN $1');
  }

  return out.replace(
    /\b(CREATE|DROP|ALTER)\s+TABLE\s+(IF\s+(?:NOT\s+)?EXISTS\s+)?([A-Za-z_]\w*)/gi,
    (match, verb, exists = '', name) =>
      RESERVED_TABLE_NAMES.has(name.toLowerCase())
        ? `${verb} TABLE ${exists}\`${name}\``
        : match
  );
}

export function runQuery(sqlString) {
  if (!sqlString || !sqlString.trim()) {
    return { success: false, error: 'Empty query' };
  }

  try {
    const res = alasql(toAlasqlDialect(sqlString));
    if (!Array.isArray(res)) {
      return { success: true, columns: ['Result'], rows: [[String(res)]], count: 1 };
    }

    if (res.length === 0) {
      return { success: true, columns: [], rows: [], count: 0 };
    }

    const columns = Object.keys(res[0]);
    const rows = res.map(row => columns.map(col => row[col]));

    return {
      success: true,
      columns,
      rows,
      raw: res,
      count: res.length
    };
  } catch (err) {
    return {
      success: false,
      error: err.message || String(err)
    };
  }
}
