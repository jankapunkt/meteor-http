import { EventEmitter } from 'events'

// -----------------------------------------------------------------------------
// This is a custom implementation, based on two existing implementations:
//
// https://github.com/mysticatea/abort-controller
// (Copyright (c) 2017 Toru Nagashima)
//
// and
//
// https://github.com/southpolesteve/node-abort-controller
// (Copyright (c) 2019 Steve Faulkner)
// -----------------------------------------------------------------------------


class AbortController {
  constructor () {
    createSignal(this)
  }

  get signal () {
    return getSignal(this)
  }

  abort () {
    const signal = getSignal(this)
    if (signal.aborted) return

    signal.aborted = true
    signal.dispatchEvent('abort')
  }

  toString () {
    return '[object AbortController]'
  }

  get [Symbol.toStringTag] () {
    return 'AbortController'
  }
}

class AbortSignal {
  constructor () {
    this.eventEmitter = new EventEmitter()
    this.onabort = null
    this.aborted = false
  }

  toString () {
    return '[object AbortSignal]'
  }

  get [Symbol.toStringTag] () {
    return 'AbortSignal'
  }

  removeEventListener (name, handler) {
    this.eventEmitter.removeListener(name, handler)
  }

  addEventListener (name, handler) {
    this.eventEmitter.on(name, handler)
  }

  dispatchEvent (type) {
    const event = { type, target: this }
    const handlerName = `on${type}`

    if (typeof this[handlerName] === 'function') this[handlerName](event)

    this.eventEmitter.emit(type, event)
  }
}

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------
const signals = new WeakMap()

const createSignal = controller => {
  signals.set(controller, new AbortSignal())
}

const getSignal = controller => {
  const signal = signals.get(controller)

  if (!signal) {
    throw new TypeError(`Expected 'AbortController', but got ${controller}`)
  }

  return signal
}

export { AbortController }
