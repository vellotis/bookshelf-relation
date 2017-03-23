import { decendants as relationTypes } from './relation'
import _ from 'lodash'

export default function (bookshelf, options) {
  const ModelCtor = bookshelf.Model

  for(const Relation of relationTypes) {
    const relationName = _.camelCase(Relation.name.replace('Relation', ''))
    bookshelf[relationName] = function (Target, options, modifyer) {
      if (!Target || !(Target.prototype instanceof ModelCtor)) {
        if (typeof(Target) !== 'string' || typeof(bookshelf.registry) !== 'object' || !(Target = bookshelf.model(Target))) {
          throw new Error()
        }
      }

      if (typeof(options) === 'function') {
        modifyer = options
        options = {}
      }

      const relation = new Relation(Target, options, modifyer);
      return factoryBuilder(relation)
    }
  }
}

function factoryBuilder(relation) {
  const relationFactory = function() {
    return relation.init(this)
  }
  relationFactory.relation = relation
  relationFactory.through = function () {
    relation.through(...arguments)
    relationFactory.through = () => {
      throw new Error("relation declaration can have only one `through` declaration");
    }
    return relationFactory
  }
  return relationFactory
}