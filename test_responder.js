/* global _ WebAppInternals WebApp */
import { EJSON } from 'meteor/ejson'
import fs from 'fs'
import path from 'path'
const TEST_RESPONDER_ROUTE = '/http_test_responder'

const respond = function (req, res) {
  if (req.url === '/static-content') {
    const pwd = process.cwd()
    const dir = '/assets/packages/local-test_jkuester_http/'
    const fileName = 'test_static.serveme'
    const resolved = path.join(pwd, dir, fileName)

    return fs.readFile(resolved, function (err, data) {
      if (err) {
        res.writeHead(404)
        res.end(JSON.stringify(err))
        return
      }
      res.writeHead(200)
      res.end(data)
    })
  } else if (req.url === '/static-file') {
    const pwd = process.cwd()
    const dir = '/assets/packages/local-test_jkuester_http/'
    const fileName = 'test_static.serveme'
    const resolved = path.join(pwd, dir, fileName)
    const stream = fs.createReadStream(resolved)

    res.statusCode = 200
    res.setHeader('Content-Type', 'text/plain')
    return stream.pipe(res)
  } else if (req.url.slice(0, 5) === '/slow') {
    setTimeout(function () {
      res.statusCode = 200
      res.end('A SLOW RESPONSE')
    }, 5000)
    return
  } else if (req.url === '/fail') {
    res.statusCode = 500
    res.end('SOME SORT OF SERVER ERROR. foo' +
      _.times(100, function () {
        return 'MAKE THIS LONG TO TEST THAT WE TRUNCATE'
      }).join(' '))
    return
  } else if (req.url === '/redirect') {
    res.statusCode = 301
    // XXX shouldn't be redirecting to a relative URL, per HTTP spec,
    // but browsers etc. seem to tolerate it.
    res.setHeader('Location', TEST_RESPONDER_ROUTE + '/foo')
    res.end('REDIRECT TO FOO')
    return
  } else if (req.url.slice(0, 6) === '/login') {
    const username = 'meteor'
    // get password from query string
    const password = req.url.slice(7)
    // realm is displayed in dialog box if one pops up, avoid confusion
    const realm = TEST_RESPONDER_ROUTE + '/login'
    const validate = function (user, pass) {
      return user === username && pass === password
    }
    const connect = WebAppInternals.NpmModules.connect.module
    const checker = connect.basicAuth(validate, realm)
    let success = false
    checker(req, res, function () {
      success = true
    })
    if (!success) { return }
  } else if (req.url === '/headers') {
    res.statusCode = 201
    res.setHeader('A-Silly-Header', 'Tis a')
    res.setHeader('Another-Silly-Header', 'Silly place.')
    res.end('A RESPONSE WITH SOME HEADERS')
    return
  }

  const chunks = []
  req.setEncoding('utf8')
  req.on('data', function (chunk) {
    chunks.push(chunk)
  })
  req.on('end', function () {
    let body = chunks.join('')

    if (body.charAt(0) === '{') {
      body = EJSON.parse(body)
    }

    const responseData = {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: body
    }

    let responseString = ''
    if (req.method !== 'HEAD') { responseString = EJSON.stringify(responseData) }

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(responseString)
  })
}

const runResponder = function () {
  WebApp.connectHandlers.stack.unshift({
    route: TEST_RESPONDER_ROUTE,
    handle: respond
  })
}

runResponder()
