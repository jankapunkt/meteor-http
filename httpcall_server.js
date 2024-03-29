import { Meteor } from 'meteor/meteor'
import { EJSON } from 'meteor/ejson'
import { fetch, Request } from 'meteor/fetch'
import { URL } from 'meteor/url'
import { HTTP, makeErrorByStatus, populateData } from './httpcall_common.js'

export { HTTP }

const hasOwn = Object.prototype.hasOwnProperty

// if we use a Meteor version that bundles Node <= 16 we cannot use the
// global defined AbortController and fall back to a custom shim
const AbortControllerImpl = global.AbortController || require('./AbortController').AbortController

/**
 * @deprecated
 */
export const HTTPInternals = {}

// _call always runs asynchronously; HTTP.call, defined below,
// wraps _call and runs synchronously when no callback is provided.
function _call (method, url, options, callback) {
  const debug = HTTP.debug() || (() => {
  })

  /// /////// Process arguments //////////
  debug('call', method, url)

  if (!callback && typeof options === 'function') {
    // support (method, url, callback) argument list
    callback = options
    options = null
  }

  options = options || {}

  if (hasOwn.call(options, 'beforeSend')) {
    throw new Error('Option beforeSend not supported on server.')
  }

  method = (method || '').toUpperCase()

  if (!/^https?:\/\//.test(url)) {
    throw new Error('url must be absolute and start with http:// or https://')
  }

  const headers = {}
  let content = options.content

  if (options.data) {
    content = EJSON.stringify(options.data)
    headers['Content-Type'] = 'application/json'
  }

  let paramsForUrl
  let paramsForBody

  if (content || method === 'GET' || method === 'HEAD') {
    paramsForUrl = options.params
  } else {
    paramsForBody = options.params
  }

  const newUrl = URL._constructUrl(url, options.query, paramsForUrl)

  if (options.auth) {
    if (options.auth.indexOf(':') < 0) {
      throw new Error('auth option should be of the form "username:password"')
    }

    const base64 = Buffer.from(options.auth, 'ascii').toString('base64')
    headers.Authorization = `Basic ${base64}`
  }

  if (paramsForBody) {
    const data = new URLSearchParams()
    Object.entries(paramsForBody).forEach(([key, value]) => {
      data.append(key, value)
    })
    content = data
    headers['Content-Type'] = 'application/x-www-form-urlencoded'
  }

  if (options.headers) {
    Object.keys(options.headers).forEach(function (key) {
      headers[key] = options.headers[key]
    })
  }

  const caching = options.cache || 'cache'
  const corsMode = options.mode || 'cors'
  const timeout = options.timeout || -1
  const useAbort = timeout > -1
  const controller = useAbort
    ? new AbortControllerImpl()
    : undefined

  // wrap callback to add a 'response' property on an error, in case
  // we have both (http 4xx/5xx error, which has a response payload)
  callback = (function (cb) {
    let called = false
    return function (error, response) {
      if (!called) {
        called = true
        if (error && response) {
          error.response = response
        }
        cb(error, response)
      }
    }
  })(callback)

  // is false if false, otherwise always true
  const followRedirects = options.followRedirects === false
    ? 'manual'
    : 'follow'

  /// /////// Kickoff! //////////

  // Allow users to override any request option with the npmRequestOptions
  // option.

  const requestOptions = {
    method: method,
    caching: caching,
    mode: corsMode,
    jar: false,
    body: content,
    redirect: followRedirects,
    referrer: options.referrer,
    integrity: options.integrity,
    headers: headers
  }

  // connect with abort controller only of we have defined
  // a timeout, otherwise controller will be undefined
  if (useAbort) {
    requestOptions.signal = controller.signal
  }

  const request = new Request(newUrl, requestOptions)
  let timeoutId

  // the timeout is only initialized if it
  // is set greater than -1
  if (useAbort) {
    timeoutId = setTimeout(() => {
      debug(method, url, 'timeout of', timeout, 'ms exceeded - abort request')
      controller.abort()
    }, timeout)
  }

  fetch(request)
    .then(async res => {
      const content = await res.text()
      const response = {}
      response.statusCode = res.status
      response.content = '' + content

      // fetch headers don't allow simple read using bracket notation
      // so we iterate their entries and assign them to a new Object
      response.headers = {}
      for (const entry of res.headers.entries()) {
        const [key, val] = entry
        response.headers[key] = val
      }

      response.ok = res.ok
      response.redirected = res.redirected

      populateData(response)

      if (response.statusCode >= 400) {
        const error = makeErrorByStatus(
          response.statusCode,
          response.content
        )
        callback(error, response)
      } else {
        callback(undefined, response)
      }
    })
    .catch(err => callback(err))
    .finally(() => {
      if (typeof timeoutId !== 'undefined') {
        clearTimeout(timeoutId)
      }
    })
}

HTTP.call = Meteor.wrapAsync(_call)
