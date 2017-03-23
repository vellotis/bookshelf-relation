import Promise from 'bluebird'

export default class ThroughTargets {
  constructor(relationChain, fks) {
    Object.assign(this, { relationChain, fks })
  }

  triggerThen(nameOrNames, ...args) {return Promise.try(() => {
    return Promise.map(this.relationChain, relation => new relation.Target().triggerThen(nameOrNames, ...args))
  })}

  parse(pivotalColumns) {
    return Promise.map(this.relationChain, relation => new relation.Target().parse(pivotalColumns))
  }
}