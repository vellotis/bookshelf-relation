import Relation, { singularMemo, decendants } from '../relation'

export default class HasOneRelation extends Relation {
	constructor(Target, options = {}) {
		const { primaryKey, foreignKey, ...otherOptions } = options
		super(Target, otherOptions)
		this.primaryKey = primaryKey || 'id'
		this.foreignKey = foreignKey
	}

	init(source) {
		return super.init(source)
	}

	joinClause(Source, knex) {
		knex.innerJoin(this.key('targetTableName'), this.key('targetTableName') + '.' + this.key('foreignKey', {Source}), this.key('sourceTableName', {Source}) + '.' + this.key('primaryKey', {Source}))
	}

	key(keyName, {Source = this.source.constructor, Target = this.Target} = {}) {
		let key = super.key(...arguments)
		if (key) return key
		switch(keyName) {
			case 'primaryKey':
				key = this[keyName] = Source.prototype.idAttribute
				break;
			case 'foreignKey':
				key = this[keyName] = singularMemo(Source.prototype.tableName) + '_' + Target.prototype.idAttribute
				break;
			default:
				throw new Error(`Invalid key '${ keyName }' requested for ${ this.constructor.name }`)
		}
		return key
	}
}

decendants.push(HasOneRelation)