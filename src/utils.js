import _ from 'lodash'

export function clone() {
  const target = Object.create(this)
  const source = this

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      if (_.isObject(source[key]) && _.isFunction(source[key].clone)) {
        target[key] = source[key].clone()
      } else {
        target[key] = source[key]
      }
    }
  }
  return target
}