import { EJSON } from 'meteor/ejson'

class Distance {
  constructor (value, unit) {
    this.value = value
    this.unit = unit
  }

  // Convert our type to JSON.
  toJSONValue () {
    return {
      value: this.value,
      unit: this.unit
    }
  }

  // Unique type name.
  typeName () {
    return 'Distance'
  }
}

EJSON.addType('Distance', function fromJSONValue (json) {
  return new Distance(json.value, json.unit)
})

export { Distance }
