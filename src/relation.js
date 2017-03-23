import inflection from 'inflection'
import { clone } from './utils'
import _ from 'lodash'
import ModelBase from 'bookshelf/lib/base/model'
import CollectionBase from 'bookshelf/lib/base/collection'
import ThroughTargets from './throughtargets'

const decendants = [];

export default class Relation {
  constructor(Target, options) {
    Object.assign(this, { Target }, options)
  }

  // Creates a new relation instance, used by the `Eager` relation in
  // dealing with `morphTo` cases, where the same relation is targeting multiple models.
  instance(Target, options) {
    return new this.constructor(Target, options)
  }

  // Creates a new, unparsed model, used internally in the eager fetch helper
  // methods. (Parsing may mutate information necessary for eager pairing.)
  createModel(data) {
    if (this.Target.prototype instanceof CollectionBase) {
      return new this.Target.prototype.model(data)._reset()
    }
    return new this.Target(data)._reset()
  }

  init(source) {
    this.source = source

    // Can only be assigned and initiated if "source" is present
    if (this.isThrough()) {
      this.throughRelationChain = this.throughRelationChain(this)
      this.throughTarget = (fks) => {
        return new ThroughTargets(this.throughRelationChain, fks)
      }
    }

    const target = this.Target ? this.relatedInstance() : {}
    target.relatedData = this

    return target
  }

  clone() {
    return clone.call(this)
  }

  selectConstraints(knex, options) {
    const resp = options.parentResponse

    // The `belongsToMany` and `through` relations have joins & pivot columns.
    if (this.isJoined()) this.joinClauses(knex)

    // Call the function, if one exists, to constrain the eager loaded query.
    if (options._beforeFn) options._beforeFn.call(knex, knex)

    // The base select column
    if (_.isArray(options.columns)) {
      knex.columns(options.columns)
    }

    const currentColumns = _.findWhere(knex._statements, {grouping: 'columns'})

    if (!currentColumns || currentColumns.length === 0) {
      knex.column(this.key('targetTableName') + '.*')
    }

    if (this.isJoined()) this.joinColumns(knex)

    // If this is a single relation and we're not eager loading,
    // limit the query to a single item.
    if (this.isSingle() && !resp) knex.limit(1)

    // Finally, add (and validate) the where conditions, necessary for constraining the relation.
    this.whereClauses(knex, resp)
  }

  isJoined() {
    return !!this.throughRelationName
  }
  isThrough() {
    return this.isJoined()
  }

  through(relationName) {
    this.throughRelationName = relationName
  }

  throughRelationChain(relation) {
    const relationsChain = [relation]
    while (relation.isJoined()) {
      relation = this.resolveThroughRelation(relation.throughRelationName)
      relationsChain.push(relation)
    }
    return relationsChain
  }

  joinClauses(knex) {
    if (!this.isJoined()) {
      throw new Error()
    }

    this.throughRelationChain.reduce((accum, throughRelation, index, array) => {
      accum && accum.joinClause(throughRelation, knex)
      return throughRelation
    })
  }

  joinColumns(knex, columns = []) {
    const lastRelation = _.last(this.throughRelationChain) || this
    const joinTable = lastRelation.key('targetTableName')
    columns.push(lastRelation.key(lastRelation.isInverse()
      ? 'foreignKey'
      : 'primaryKey', {Source: this.source.constructor}))

    knex.columns(_.map(columns, function(col) {
      return joinTable + '.' + col + ' as _pivot_' + col
    }))
  }

  whereClauses(knex, response) {
    const lastRelation = _.last(this.throughRelationChain) || this
    const tableName = lastRelation.key('targetTableName')
    const [targetColumn, sourceColumn] = (() => {
      const foreignKey = this.key('foreignKey')
      const primaryKey = this.key('primaryKey')
      return lastRelation.isInverse() ? [primaryKey, foreignKey] : [foreignKey, primaryKey]
    })()
    const key = `${tableName}.${targetColumn}`

    const method = response ? 'whereIn' : 'where'
    const ids = response ? this.eagerKeys(response) : this.source.get(sourceColumn)
    knex[method](key, ids)
  }

  key(keyName, {Source, Target = this.Target} = {}) {
    const source = (Source && Source.prototype) || this.source
    switch(keyName) {
      case 'sourceTableName':
        return _.result(source, 'tableName')
      case 'sourceColumn':
        return this.key('primaryKey')
      case 'targetTableName':
        return _.result(Target.prototype, 'tableName')
      case 'targetColumn':
        return this.key('foreignKey')
    }
    return this[keyName]
  }

  resolveThroughRelation(throughRelationName) {
    if (!this.isThrough()) {
      throw new Error()
    }
    const throughRelationFactory = this.source.constructor.prototype[throughRelationName]
    if (typeof(throughRelationFactory) !== 'function' || !(throughRelationFactory.relation instanceof Relation)) {
      throw new Error()
    }
    return throughRelationFactory.relation.clone()
  }

  isInverse() { return false }
  isSingle() { return false }

  // Eager pair the models.
  eagerPair() {}

  // Creates a new model or collection instance, depending on
  // the `relatedData` settings and the models passed in.
  relatedInstance(models = []) {
    const { Target } = this

    // If it's a single model, check whether there's already a model
    // we can pick from... otherwise create a new instance.
    if (this.isSingle()) {
      if (!(Target.prototype instanceof ModelBase)) {
        throw new Error(`The ${this.type} related object must be a Bookshelf.Model`)
      }
      return models[0] || new Target()
    }

    // Allows us to just use a model, but create a temporary
    // collection for a "*-many" relation.
    if (Target.prototype instanceof ModelBase) {
      return Target.collection(models, {parse: true})
    }
    return new Target(models, {parse: true})
  }

  get parentFk() { return _.camelCase(this.constructor.name.replace('Relation', '')) }
  get type() { return _.camelCase(this.constructor.name.replace('Relation', '')) }
}

// Simple memoization of the singularize call.
const singularMemo = (function() {
  const cache = Object.create(null);
  return function(arg) {
    if (!(arg in cache)) {
      cache[arg] = inflection.singularize(arg);
    }
    return cache[arg];
  };
}());

export { decendants, singularMemo }

// Load decendants
require('./relations/belongsto')
require('./relations/hasandbelongstomany')
require('./relations/hasmany')
require('./relations/hasone')
require('./relations/morphone')
require('./relations/morphto')