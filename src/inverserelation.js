import Relation from './relation'
export {singularMemo, decendants } from './relation'

export default class InverseRelation extends Relation {
  joinColumns(knex, columns = []) {
    //const joinTable = this.key('targetTableName')
    columns.push(this.key('foreignKey'))

    if (this.isJoined()) {
      let lastThroughRelation = this
      while (lastThroughRelation.isJoined()) {
        lastThroughRelation = lastThroughRelation.resolveThroughRelation()
      }
      columns.push(lastThroughRelation.key(lastThroughRelation.isInverse()
        ? 'foreignKey'
        : 'primaryKey'))
    }

    super.joinColumns(knex, columns)
  }

  isInverse() { return true }
}