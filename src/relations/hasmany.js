import Relation, { singularMemo, decendants } from '../relation'

export default class HasManyRelation extends Relation {
	constructor(Target, options = {}) {
		const { primaryKey, foreignKey, ...otherOptions } = options
		super(Target, otherOptions)
		this.primaryKey = primaryKey || 'id'
		this.foreignKey = foreignKey
	}

	init(source) {
		return super.init(...arguments)
	}

	joinClause(sourceRelation, knex) {
		const sourceTableName = sourceRelation.key('targetTableName')
		knex.innerJoin(sourceTableName, this.key('targetTableName') + '.' + sourceRelation.key('foreignKey', {Source: sourceRelation.Target}), sourceTableName + '.' + this.key('primaryKey', {Source: sourceRelation.Target}))
	}

	key(keyName, {Source = (this.source || (() => {return;})).constructor, Target = this.Target} = {}) {
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

decendants.push(HasManyRelation)