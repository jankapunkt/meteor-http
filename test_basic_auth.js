/* global http */
export const basicAuth = function (callback, realm) {
  let username, password

  // user / pass strings
  if (typeof callback === 'string') {
    username = callback
    password = realm
    if (typeof password !== 'string') throw new Error('password argument required')
    realm = arguments[2]
    callback = function (user, pass) {
      return user === username && pass === password
    }
  }

  realm = realm || 'Authorization Required'

  return function (req, res, next) {
    const authorization = req.headers.authorization

    if (req.user) return next()
    if (!authorization) {
      unauthorized(res, realm)
      return
    }

    const parts = authorization.split(' ')

    if (parts.length !== 2) return next(error(400))

    const scheme = parts[0]
    const credentials = Buffer.from(parts[1], 'base64').toString()
    const index = credentials.indexOf(':')

    if (scheme !== 'Basic' || index < 0) return next(error(400))

    const user = credentials.slice(0, index)
    const pass = credentials.slice(index + 1)

    // async
    if (callback.length >= 3) {
      callback(user, pass, function (err, user) {
        if (err || !user) {
          unauthorized(res, realm)
          return
        }
        req.user = req.remoteUser = user
        next()
      })
      // sync
    } else {
      if (callback(user, pass)) {
        req.user = req.remoteUser = user
        next()
      } else {
        unauthorized(res, realm)
      }
    }
  }
}

/**
 * Respond with 401 "Unauthorized".
 *
 * @param {ServerResponse} res
 * @param {String} realm
 * @api private
 */

function unauthorized (res, realm) {
  res.status(401)
  res.set('WWW-Authenticate', 'Basic realm="' + realm + '"')
  res.send('Unauthorized')
};

/**
 * Generate an `Error` from the given status `code`
 * and optional `msg`.
 *
 * @param {Number} code
 * @param {String} msg
 * @return {Error}
 * @api private
 */

function error (code, msg) {
  const err = new Error(msg || http.STATUS_CODES[code])
  err.status = code
  return err
};
