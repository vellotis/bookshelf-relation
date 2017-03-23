var Knex = require('knex')
var mockKnex = require('mock-knex')
var Bookshelf = require('bookshelf')

var plugin = require('../')
console.log(plugin);
console.log('dasgdasgdasgdas');

var knex = Knex({
  client: 'mysql',
  connection: {
    host     : '127.0.0.1',
    user     : 'your_database_user',
    password : 'your_database_password',
    database : 'myapp_test'
  }
});
mockKnex.mock(knex);
var bookshelf = Bookshelf(knex);

bookshelf.plugin(plugin)

var RelationModel = bookshelf.Model.extend({
  tableName: 'xxxs'
});

var ThroughModel = bookshelf.Model.extend({
  tableName: 'yyyz',
  targetRelation: bookshelf.belongsTo(RelationModel).through(''),
  sourceRelation: bookshelf.belongsTo(RelationModel).through('')
});

var Model = bookshelf.Model.extend({
  tableName: 'zzzs',
  throughRelation: bookshelf.hasMany(ThroughModel),
  targetRelation: bookshelf.hasMany(RelationModel).through('throughRelation')
});

var tracker = mockKnex.getTracker();
tracker.install();
tracker.on('query', function () {
  console.log(arguments)
});

Model.forge({id: 123}).targetRelation().fetch()
.then(function (rel) {
  console.log(rel);
});