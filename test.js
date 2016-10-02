"use strict";

const Sequelize = require('sequelize');
const MicroMigration = require('sequelize-micro-migration');
const MicroMigrationCli = require('./index');
const task = require('xcane').task;
const path = require('path');

let overrideFs = {
  _files: [],
  _lastDir: null,
  _storage: {},
  _upped: {},
  readdir: dir => {
    overrideFs._lastDir = dir;
    return Promise.resolve(overrideFs._files);
  },
  _require: x => overrideFs._storage[x]
};

const filesSorted = [
  '201601011200-AddPerson.js',
  '201601101200-AddName.js',
  '2016011012001-AddAge.js',
  '201602011403-RemoveAge.js'
];

overrideFs._storage[path.join(__dirname, filesSorted[0].replace(/\.js$/g, ''))] = {
  up: (queryInterface, sequelize) => task.spawn(function* () {
    yield queryInterface.createTable('people', {
      id: {
        type: sequelize.Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      }
    });

    overrideFs._upped[filesSorted[0]] = true;
  }),

  down: (queryInterface, sequelize) => task.spawn(function* () {
    yield queryInterface.dropTable('people');
    overrideFs._upped[filesSorted[0]] = false;
  })
};

overrideFs._storage[path.join(__dirname, filesSorted[1].replace(/\.js$/g, ''))] = {
  up: (queryInterface, sequelize) => task.spawn(function* () {
    yield queryInterface.addColumn('people', 'name', {
      type: Sequelize.TEXT
    });
    overrideFs._upped[filesSorted[1]] = true;
  }),

  down: (queryInterface, sequelize) => task.spawn(function* () {
    yield queryInterface.removeColumn('people', 'name');
    overrideFs._upped[filesSorted[1]] = false;
  })
};

overrideFs._storage[path.join(__dirname, filesSorted[2].replace(/\.js$/g, ''))] = {
  up: (queryInterface, sequelize) => task.spawn(function* () {
    yield queryInterface.addColumn('people', 'age', {
      type: Sequelize.INTEGER
    });
    overrideFs._upped[filesSorted[2]] = true;
  }),

  down: (queryInterface, sequelize) => task.spawn(function* () {
    yield queryInterface.removeColumn('people', 'age');
    overrideFs._upped[filesSorted[2]] = false;
  })
};

overrideFs._storage[path.join(__dirname, filesSorted[3].replace(/\.js$/g, ''))] = {
  up: (queryInterface, sequelize) => task.spawn(function* () {
    yield queryInterface.removeColumn('people', 'age');
    overrideFs._upped[filesSorted[3]] = true;
  }),

  down: (queryInterface, sequelize) => task.spawn(function* () {
    yield queryInterface.addColumn('people', 'age', {
      type: Sequelize.INTEGER
    });
    overrideFs._upped[filesSorted[3]] = false;
  })
};

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: ':memory:',
  benchmark: true
});
MicroMigration._overrideFs(overrideFs);
MicroMigration._overrideRequire(overrideFs._require);
const migration = new MicroMigration(sequelize, 'myapp', __dirname);
overrideFs._lastDir = null;
overrideFs._upped = {};

task.spawn(function* () {
  yield sequelize.sync();
  MicroMigrationCli.watch(migration);

  const app = yield MicroMigrationCli._selectApplication();
  yield MicroMigrationCli._showCurrentVersion(app);
}).then(() => console.log('done!')).catch(err => console.log(err));
