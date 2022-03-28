import { EJSON } from 'meteor/ejson'

const MAX_LENGTH = 500 // if you change this, also change the appropriate test
const slice = Array.prototype.slice

export const makeErrorByStatus = function makeErrorByStatus (statusCode, content) {
  let message = `failed [${statusCode}]`

  if (content) {
    const stringContent = typeof content === 'string'
      ? content
      : content.toString()

    message = `${message} ${truncate(stringContent.replace(/\n/g, ' '), MAX_LENGTH)}`
  }

  return new Error(message)
}

const truncate = (str, length) => str.length > length ? str.slice(0, length) + '...' : str

const supportedContentTypes = [
  'application/json',
  'text/javascript',
  'application/javascript',
  'application/x-javascript'
]

// Fill in `response.data` if the content-type is JSON.
export const populateData = function populateData (response) {
  // Read Content-Type header, up to a ';' if there is one.
  // A typical header might be "application/json; charset=utf-8"
  // or just "application/json".
  const contentType = (response.headers['content-type'] || ';').split(';')[0]

  // Only try to parse data as JSON if server sets correct content type.
  if (supportedContentTypes.includes(contentType)) {
    try {
      response.data = EJSON.parse(response.content)
    } catch (err) {
      response.data = null
    }
  } else {
    response.data = null
  }
}

export const HTTP = {}

let debug = () => {} // noop

HTTP.debug = function (fn) {
  if (typeof fn === 'function') {
    debug = fn
  }
  return debug
}

/**
 * @summary Send an HTTP `GET` request. Equivalent to calling [`HTTP.call`](#http_call) with "GET" as the first argument.
 * @param {String} url The URL to which the request should be sent.
 * @param {Object} [callOptions] Options passed on to [`HTTP.call`](#http_call).
 * @param {Function} [asyncCallback] Callback that is called when the request is completed. Required on the client.
 * @locus Anywhere
 */
HTTP.get = function (...args) {
  return HTTP.call.apply(this, ['GET'].concat(slice.apply(args)))
}

/**
 * @summary Send an HTTP `POST` request. Equivalent to calling [`HTTP.call`](#http_call) with "POST" as the first argument.
 * @param {String} url The URL to which the request should be sent.
 * @param {Object} [callOptions] Options passed on to [`HTTP.call`](#http_call).
 * @param {Function} [asyncCallback] Callback that is called when the request is completed. Required on the client.
 * @locus Anywhere
 */
HTTP.post = function (...args) {
  return HTTP.call.apply(this, ['POST'].concat(slice.apply(args)))
}

/**
 * @summary Send an HTTP `PUT` request. Equivalent to calling [`HTTP.call`](#http_call) with "PUT" as the first argument.
 * @param {String} url The URL to which the request should be sent.
 * @param {Object} [callOptions] Options passed on to [`HTTP.call`](#http_call).
 * @param {Function} [asyncCallback] Callback that is called when the request is completed. Required on the client.
 * @locus Anywhere
 */
HTTP.put = function (...args) {
  return HTTP.call.apply(this, ['PUT'].concat(slice.apply(args)))
}

/**
 * @summary Send an HTTP `DELETE` request. Equivalent to calling [`HTTP.call`](#http_call) with "DELETE" as the first argument. (Named `del` to avoid conflict with the Javascript keyword `delete`)
 * @param {String} url The URL to which the request should be sent.
 * @param {Object} [callOptions] Options passed on to [`HTTP.call`](#http_call).
 * @param {Function} [asyncCallback] Callback that is called when the request is completed. Required on the client.
 * @locus Anywhere
 */
HTTP.del = function (...args) {
  return HTTP.call.apply(this, ['DELETE'].concat(slice.apply(args)))
}

/**
 * @summary Send an HTTP `PATCH` request. Equivalent to calling [`HTTP.call`](#http_call) with "PATCH" as the first argument.
 * @param {String} url The URL to which the request should be sent.
 * @param {Object} [callOptions] Options passed on to [`HTTP.call`](#http_call).
 * @param {Function} [asyncCallback] Callback that is called when the request is completed. Required on the client.
 * @locus Anywhere
 */
HTTP.patch = function (...args) {
  return HTTP.call.apply(this, ['PATCH'].concat(slice.apply(args)))
}
