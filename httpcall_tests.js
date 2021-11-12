/* global WebApp */
import { EJSON } from 'meteor/ejson'
import { Random } from 'meteor/random'
import { HTTP } from 'meteor/jkuester:http'
import { assert } from 'chai'
import { Distance } from './test_ejson'

// URL prefix for tests to talk to
let _XHR_URL_PREFIX = '/http_test_responder'

const urlBase = function () {
  if (Meteor.isServer) {
    return 'http://127.0.0.1:9876'
  } else {
    return ''
  }
}

const urlPrefix = function () {
  if (Meteor.isServer && _XHR_URL_PREFIX.indexOf('http') !== 0) {
    _XHR_URL_PREFIX = urlBase() + _XHR_URL_PREFIX
  }
  return _XHR_URL_PREFIX
}

const onClient = x => Meteor.isClient ? x() : undefined
const onServer = x => Meteor.isServer ? x() : undefined

describe('http tests', function () {
  //----------------------------------------------------------------------------
  // httpcall - basic
  //----------------------------------------------------------------------------
  describe('httpcall - basic', function () {
    const basicGet = function (url, options, expectedUrl) {
      it(`basic get: ${expectedUrl}`, function (done) {
        const callback = (error, result) => {
          assert.isFalse(!!error)

          if (!error) {
            assert.equal(typeof result, 'object')
            assert.equal(result.statusCode, 200)

            const data = result.data

            // allow dropping of final ? (which mobile browsers seem to do)
            const allowed = [expectedUrl]
            if (expectedUrl.slice(-1) === '?') {
              allowed.push(expectedUrl.slice(0, -1))
            }

            assert.include(allowed, expectedUrl)
            assert.equal(data.method, 'GET')
            done()
          }
        }

        onServer(function () {
          // test sync version
          try {
            const result = HTTP.call('GET', urlPrefix() + url, options)
            callback(undefined, result)
          } catch (e) {
            callback(e, e.response)
            done(e)
          }
        })

        onClient(function () {
          HTTP.call('GET', urlPrefix() + url, options, callback)
        })
      })
    }

    basicGet('/foo', null, '/foo')
    basicGet('/foo?', null, '/foo?')
    basicGet('/foo?a=b', null, '/foo?a=b')
    basicGet('/foo', { params: { fruit: 'apple' } }, '/foo?fruit=apple')
    basicGet('/foo', {
      params: {
        fruit: 'apple',
        dog: 'Spot the dog'
      }
    }, '/foo?fruit=apple&dog=Spot+the+dog')
    basicGet('/foo?', {
      params: {
        fruit: 'apple',
        dog: 'Spot the dog'
      }
    }, '/foo?fruit=apple&dog=Spot+the+dog')
    basicGet('/foo?bar', {
      params: {
        fruit: 'apple',
        dog: 'Spot the dog'
      }
    }, '/foo?bar&fruit=apple&dog=Spot+the+dog')
    basicGet('/foo?bar', {
      params: { fruit: 'apple', dog: 'Spot the dog' },
      query: 'baz'
    }, '/foo?baz&fruit=apple&dog=Spot+the+dog')
    basicGet('/foo', {
      params: { fruit: 'apple', dog: 'Spot the dog' },
      query: 'baz'
    }, '/foo?baz&fruit=apple&dog=Spot+the+dog')
    basicGet('/foo?', {
      params: { fruit: 'apple', dog: 'Spot the dog' },
      query: 'baz'
    }, '/foo?baz&fruit=apple&dog=Spot+the+dog')
    basicGet('/foo?bar', { query: '' }, '/foo?')
    basicGet('/foo?bar', {
      params: { fruit: 'apple', dog: 'Spot the dog' },
      query: ''
    }, '/foo?fruit=apple&dog=Spot+the+dog')
  })

  //----------------------------------------------------------------------------
  // httpcall - errors
  //----------------------------------------------------------------------------
  describe('httpcall - errors', function () {
    it('should fail to make any connection', function (done) {
      this.timeout(10000)

      // Accessing unknown server (should fail to make any connection)
      const unknownServerCallback = function (error, result) {
        onServer(function () {
          assert.equal(error.message, 'The user aborted a request.', 'expected error')
        })
        onClient(function () {
          assert.equal(error.message, 'Connection timeout', 'expected error')
        })
        assert.equal(!!result, false, 'expected no result')
        assert.equal(!!error.response, false, 'expected no response')
        done()
      }

      const options = { timeout: 2500 }
      const invalidIp = '0.0.0.199'
      // This is an invalid destination IP address, and thus should always give an error.
      // If your ISP is intercepting DNS misses and serving ads, an obviously
      // invalid URL (http://asdf.asdf) might produce an HTTP response.

      onServer(function () {
        // test sync version
        try {
          const unknownServerResult = HTTP.call('GET', `http://${invalidIp}/`, options)
          unknownServerCallback(undefined, unknownServerResult)
        } catch (e) {
          unknownServerCallback(e, e.response)
        }
      })

      onClient(function () {
        HTTP.call('GET', `http://${invalidIp}/`, options, unknownServerCallback)
      })
    })

    it('should handle expected 500 error', function (done) {
      // Server serves 500
      const error500Callback = function (error, result) {
        assert.equal(!!error, true, 'expect error')
        assert.equal(error.message.includes('500'), true, 'expect 500') // message has statusCode
        assert.equal(error.message.includes(error.response.content.substring(0, 10)), true, 'expect res content in message') // message has part of content

        assert.isTrue(!!result)
        assert.isTrue(!!error.response)
        assert.equal(result, error.response)
        assert.equal(error.response.statusCode, 500)

        // in test_responder.js we make a very long response body, to make sure
        // that we truncate messages. first of all, make sure we didn't make that
        // message too short, so that we can be sure we're verifying that we truncate.
        assert.isTrue(error.response.content.length > 520)
        assert.isTrue(error.message.length < 520) // make sure we truncate.

        done()
      }

      if (Meteor.isServer) {
        // test sync version
        try {
          const error500Result = HTTP.call('GET', urlPrefix() + '/fail')
          error500Callback(undefined, error500Result)
        } catch (e) {
          error500Callback(e, e.response)
        }
      }
      else {
        HTTP.call('GET', urlPrefix() + '/fail', error500Callback)
      }
    })
  })

  //----------------------------------------------------------------------------
  // httpcall - timeout
  //----------------------------------------------------------------------------
  describe('httpcall - timeout', function () {
    it('should time out', function (done) {
      const timeoutCallback = function (error, result) {
        assert.isTrue(!!error)
        assert.isFalse(!!result)
        assert.isFalse(!!error.response)
        done()
      }

      const timeoutUrl = urlPrefix() + '/slow-' + Random.id()
      const options = { timeout: 500 }

      onServer(function () {
        try {
          const timeoutResult = HTTP.call('GET', timeoutUrl, options)
          timeoutCallback(undefined, timeoutResult)
        } catch (e) {
          timeoutCallback(e, e.response)
        }
      })

      onClient(function () {
        HTTP.call('GET', timeoutUrl, options, timeoutCallback)
      })
    })

    it('should not time out', function (done) {
      const noTimeoutCallback = function (error, result) {
        assert.isFalse(!!error)
        assert.isTrue(!!result)
        assert.equal(result.statusCode, 200)

        const data = result.data
        assert.isTrue(!!data)
        assert.equal(data.url.substring(0, 4), '/foo')
        assert.equal(data.method, 'GET')

        done()
      }

      const noTimeoutUrl = urlPrefix() + '/foo-' + Random.id()
      const options = { timeout: 2000 }

      onServer(function () {
        try {
          const noTimeoutResult = HTTP.call('GET', noTimeoutUrl, options)
          noTimeoutCallback(undefined, noTimeoutResult)
        } catch (e) {
          noTimeoutCallback(e, e.response)
        }
      })

      onClient(function () {
        HTTP.call('GET', noTimeoutUrl, options, noTimeoutCallback)
      })
    })
  })

  //----------------------------------------------------------------------------
  // httpcall - redirect
  //----------------------------------------------------------------------------
  describe('httpcall - redirect', function () {
    it('should follow redirect by default', function (done) {
      const redirectCallback = function (error, result) {
        assert.equal(!!error, false, 'expected no error')
        assert.equal(!!result, true, 'expected result')

        // should be redirected transparently to /foo
        assert.equal(result.statusCode, 200)

        const data = result.data
        assert.equal(data.url, '/foo')
        assert.equal(data.method, 'GET')

        done()
      }

      onServer(function () {
        try {
          const redirect = HTTP.call('GET', urlPrefix() + '/redirect')
          redirectCallback(undefined, redirect)
        } catch (e) {
          done(e)
        }
      })

      onClient(function () {
        HTTP.call('GET', urlPrefix() + '/redirect', redirectCallback)
      })
    })

    ;[false, true].forEach(function (followRedirects) {
      ['GET', 'POST'].forEach(method => {
        it(`should ${followRedirects ? '' : 'not'} follow redirect on ${method} method`, function (done) {

          const callback = (error, result) => {
            assert.equal(!!error, false, 'expected no error')
            assert.equal(!!result, true, 'expected result')

            if (followRedirects) {
              // should be redirected transparently to /foo
              assert.equal(result.statusCode, 200)
              const data = result.data
              assert.equal(data.url, '/foo')
              // This is "GET" even when the initial request was a
              // POST because browsers follow redirects with a GET
              // even when the initial request was a different method.
              assert.equal(data.method, 'GET')
            } else {
              // should see redirect
              assert.equal(result.statusCode, 301)
            }

            done()
          }

          const options = { followRedirects: followRedirects }

          onServer(function () {
            try {
              const redirect = HTTP.call(method, urlPrefix() + '/redirect', options)
              callback(undefined, redirect)
            } catch (e) {
              done(e)
            }
          })

          onClient(function () {
            if (!followRedirects) {
              // clients can't set followRedirects to false
              return done()
            }
            HTTP.call(method, urlPrefix() + '/redirect', options, callback)
          })
        })
      })
    })
  })

  //----------------------------------------------------------------------------
  // httpcall - methods
  //----------------------------------------------------------------------------
  describe('httpcall - methods', function () {
    const testMethod = function (methodName, fctName) {
      const name = fctName || methodName.toLowerCase()

      it(name, function (done) {
        const callback = function (error, result) {
          assert.isFalse(!!error)
          assert.isTrue(!!result)
          assert.equal(result.statusCode, 200)

          const data = result.data
          assert.equal(data.url, '/foo')
          assert.equal(data.method, methodName)

          done()
        }

        onServer(function () {
          try {
            const res = HTTP[name](urlPrefix() + '/foo')
            callback(undefined, res)
          } catch (e) {
            done(e)
          }
        })

        onClient(function () {
          HTTP[name](urlPrefix() + '/foo', callback)
        })
      })
    }

    testMethod('GET')
    testMethod('PUT')
    testMethod('DELETE', 'del')
    testMethod('PATCH')
    testMethod('POST')

    it('post + text', function (done) {
      const callback = function (error, result) {
        assert.isFalse(!!error)
        assert.isTrue(!!result)
        assert.equal(result.statusCode, 200)
        const data = result.data
        assert.equal(data.body, 'Hello World!')
        done()
      }

      onServer(function () {
        try {
          const res = HTTP.call('POST', urlPrefix() + '/foo', { content: 'Hello World!' })
          callback(undefined, res)
        } catch (e) {
          done(e)
        }
      })

      onClient(function () {
        HTTP.call('POST', urlPrefix() + '/foo', { content: 'Hello World!' }, callback)
      })
    })

    it('post + json', function (done) {
      const callback = function (error, result) {
        assert.isFalse(!!error)
        assert.isTrue(!!result)
        assert.equal(result.statusCode, 200)
        const data = result.data
        assert.deepEqual(data.body, { greeting: 'Hello World!' })
        // nb: some browsers include a charset here too.
        assert.match(data.headers['content-type'], /^application\/json\b/)
        done()
      }

      const options = { data: { greeting: 'Hello World!' } }

      onServer(function () {
        try {
          const res = HTTP.call('POST', urlPrefix() + '/data-test', options)
          callback(undefined, res)
        } catch (e) {
          done(e)
        }
      })

      onClient(function () {
        HTTP.call('POST', urlPrefix() + '/data-test', options, callback)
      })
    })

    it('post + custom content type', function (done) {
      const callback = function (error, result) {
        assert.isFalse(!!error)
        assert.isTrue(!!result)
        assert.equal(result.statusCode, 200)
        const data = result.data
        assert.deepEqual(data.body, { greeting: 'Hello World!' })
        assert.match(data.headers['content-type'], /^text\/stupid\b/)
        done()
      }

      const options = {
        data: { greeting: 'Hello World!' },
        headers: { 'Content-Type': 'text/stupid' }
      }

      onServer(function () {
        try {
          const res = HTTP.call('POST', urlPrefix() + '/data-test-explicit', options)
          callback(undefined, res)
        } catch (e) {
          done(e)
        }
      })

      onClient(function () {
        HTTP.call('POST', urlPrefix() + '/data-test-explicit', options, callback)
      })
    })

    it('post + EJSON data', function (done) {
      const dist = new Distance(1000, 'cm')

      const callback = function (error, result) {
        assert.isFalse(!!error)
        assert.isTrue(!!result)
        assert.equal(result.statusCode, 200)

        const { dist } = result.data.body
        assert.equal(dist.unit, 'cm')
        assert.equal(dist.value, 1000)
        done()
      }

      const options = {
        data: { dist }
      }

      onServer(function () {
        try {
          const res = HTTP.call('POST', urlPrefix() + '/ejson', options)
          callback(undefined, res)
        } catch (e) {
          done(e)
        }
      })

      onClient(function () {
        HTTP.call('POST', urlPrefix() + '/ejson', options, callback)
      })
    })
  })

  //----------------------------------------------------------------------------
  // httpcall - http auth
  //----------------------------------------------------------------------------
  describe('httpcall - http auth', function () {
    // Unfortunately, any failed auth will result in a browser
    // password prompt.  So we don't test auth failure, only
    // success.

    // Random password breaks in Firefox, because Firefox incorrectly
    // uses cached credentials even if we supply different ones:
    // https://bugzilla.mozilla.org/show_bug.cgi?id=654348

    // XXX: we use puppeteer for testing so this should be no issue

    it('should pass with correct auth', function (done) {
      const password = Random.id().replace(/[^0-9a-zA-Z]/g, '')
      const options = { auth: 'meteor:' + password }
      const callback = function (error, result) {
        // should succeed
        assert.isFalse(!!error)
        assert.isTrue(!!result)
        assert.equal(result.statusCode, 200)

        const data = result.data
        assert.equal(data.url, '/login?' + password)

        done()
      }

      onServer(function () {
        try {
          const res = HTTP.call('GET', urlPrefix() + '/login?' + password, options)
          callback(undefined, res)
        } catch (e) {
          done(e)
        }
      })

      onClient(function () {
        HTTP.call('GET', urlPrefix() + '/login?' + password, options, callback)
      })
    })

    it('should not pass with incorrect auth', function (done) {
      const password = Random.id().replace(/[^0-9a-zA-Z]/g, '')
      const options = { auth: 'fooooo' }
      const callback = function (error, result) {
        onServer(function () {
          assert.equal(error.message, 'auth option should be of the form "username:password"')
        })
        onClient(function () {
          assert.equal(error.message, 'Option auth should be of the form "username:password"')
        })
        assert.isFalse(!!result)

        done()
      }

      onServer(function () {
        try {
          HTTP.call('GET', urlPrefix() + '/login?' + password, options)
        } catch (e) {
          callback(e)
        }
      })

      onClient(function () {
        try {
          HTTP.call('GET', urlPrefix() + '/login?' + password, options, callback)
        } catch (e) {
          callback(e)
        }
      })
    })
  })

  //----------------------------------------------------------------------------
  // httpcall - headers
  //----------------------------------------------------------------------------
  describe('httpcall - headers', function () {
    it('should work with custom request headers', function (done) {
      const callback = function (error, result) {
        assert.equal(!!error, false)
        assert.equal(!!result, true)
        assert.equal(result.statusCode, 200)

        const data = result.data
        assert.equal(data.url, '/foo-with-headers')
        assert.equal(data.method, 'GET')
        assert.equal(data.headers['test-header'], 'Value')
        assert.equal(data.headers['another'], 'Value2')

        done()
      }

      const options = {
        headers: {
          'Test-header': 'Value',
          'another': 'Value2'
        }
      }

      onServer(function () {
        try {
          const res = HTTP.call('GET', urlPrefix() + '/foo-with-headers', options)
          callback(undefined, res)
        } catch (e) {
          done(e)
        }
      })

      onClient(function () {
        HTTP.call('GET', urlPrefix() + '/foo-with-headers', options, callback)
      })
    })
    it('should work with custom response headers', function (done) {
      const callback = function (error, result) {
        assert.equal(!!error, false)
        assert.equal(!!result, true)

        assert.equal(result.statusCode, 201)
        assert.equal(result.headers['a-silly-header'], 'Tis a')
        assert.equal(result.headers['another-silly-header'], 'Silly place.')

        done()
      }

      onServer(function () {
        try {
          const res = HTTP.call('GET', urlPrefix() + '/headers')
          callback(undefined, res)
        } catch (e) {
          done(e)
        }
      })

      onClient(function () {
        HTTP.call('GET', urlPrefix() + '/headers', callback)
      })
    })
  })

  //----------------------------------------------------------------------------
  // httpcall - caching
  //----------------------------------------------------------------------------
  onClient(function () {
    // https://developer.mozilla.org/en-US/docs/Web/API/Request/cache
    describe('httpcall - caching', function () {
      it('no-store')
      it('reload')
      it('no-cache')
      it('force-cache')
      it('only-if-cached')
      it('only-if-cached')
    })
  })

  //----------------------------------------------------------------------------
  // httpcall - cors
  //----------------------------------------------------------------------------
  onClient(function () {
    // https://developer.mozilla.org/en-US/docs/Web/API/Request/mode
    describe('httpcall - mode (cors)', function () {
      it('same-origin')
      it('no-cors')
      it('cors')
      it('navigate')
      it('websocket')
    })
  })

  //----------------------------------------------------------------------------
  // httpcall - params
  //----------------------------------------------------------------------------
  describe('httpcall - params', function () {
    const testParams = function (method, url, params, options, expectUrl, expectBody) {

      let opts = {}
      if (typeof options === 'string') {
        // opt_opts omitted
        expectBody = expectUrl
        expectUrl = options
      } else {
        opts = options
      }

      it(`${method}: ${expectUrl}`, function (done) {
        const callOptions = { params, ...opts }
        const callback = function (error, result) {
          assert.isFalse(!!error)
          assert.isTrue(!!result)
          assert.equal(result.statusCode, 200)
          if (method !== 'HEAD') {
            const data = result.data
            assert.equal(data.method, method)
            assert.equal(data.url, expectUrl)
            assert.equal(data.body, expectBody, `${method} ${url} ${EJSON.stringify(params)} - expect body`)
          }
          done()
        }

        onServer(function () {
          try {
            const res = HTTP.call(method, urlPrefix() + url, callOptions)
            callback(undefined, res)
          } catch (e) {
            done(e)
          }
        })

        onClient(function () {
          HTTP.call(method, urlPrefix() + url, callOptions, callback)
        })
      })
    }

    testParams('GET', '/', {
      foo: 'bar',
      fruit: 'apple'
    }, '/?foo=bar&fruit=apple', '')

    testParams('GET', '/', { 'foo?': 'bang?' }, {}, '/?foo%3F=bang%3F', '')
    testParams('GET', '/blah', { foo: 'bar' }, '/blah?foo=bar', '')
    testParams('POST', '/', {
      foo: 'bar',
      fruit: 'apple'
    }, '/', 'foo=bar&fruit=apple')

    testParams('POST', '/', { 'foo?': 'bang?' }, {}, '/', 'foo%3F=bang%3F')
    testParams('POST', '/', {
      foo: 'bar',
      fruit: 'apple'
    }, { content: 'stuff!' }, '/?foo=bar&fruit=apple', 'stuff!')

    testParams('POST', '/', {
      foo: 'bar',
      greeting: 'Hello World'
    }, { content: 'stuff!' }, '/?foo=bar&greeting=Hello+World', 'stuff!')

    testParams('POST', '/foo', {
      foo: 'bar',
      greeting: 'Hello World'
    }, '/foo', 'foo=bar&greeting=Hello+World')

    testParams('HEAD', '/head', { foo: 'bar' }, '/head?foo=bar', '')
    testParams('PUT', '/put', { foo: 'bar' }, '/put', 'foo=bar')
  })

  //----------------------------------------------------------------------------
  // httpcall - before send (client only)
  //----------------------------------------------------------------------------
  onClient(function () {
    describe('httpcall - before send', function () {
      it('is not implemented', function (done) {
        let fired = false
        const beforeSend = function (xhr) {
          assert.isFalse(fired)
          assert.isTrue(xhr instanceof XMLHttpRequest)
          fired = true
        }

        const options = { beforeSend }

        HTTP.get(urlPrefix() + '/', options, function () {
          assert.isTrue(fired)
          done()
        })
      })
    })
  })

  //----------------------------------------------------------------------------
  // httpcall - static file serving (server only)
  //----------------------------------------------------------------------------
  onServer(function () {
    // This is testing the server's static file sending code, not the http
    // package. It's here because it is very similar to the other tests
    // here, even though it is testing something else.
    //
    // client http library mangles paths before they are requested. only
    // run this test on the server.
    describe('httpcall - static file serving', function () {
      // Suppress error printing for this test (and for any other code that sets
      // the x-suppress-error header).
      WebApp.suppressConnectErrors()

      function testStatic (path, code, match, shouldServe) {
        const options = { headers: { 'x-suppress-error': 'true' } }
        const prefix = Meteor.isModern
          ? '' // No prefix for web.browser (modern).
          : '/__browser.legacy'



        it(`should ${shouldServe ? '' : 'not'} serve ${path}`, function (done) {
          const callback = function (error, result) {
            assert.equal(result.statusCode, code, 'code')
            if (match) {
              assert.match(result.content, match, 'content match')
            }
            done()
          }

          onServer(function () {
            try {
              const url = (shouldServe ? urlPrefix() : (urlBase() + prefix)) + path
              const res = HTTP.get(url, options)
              callback(undefined, res)
            } catch (e) {
              console.error('failed')
              done(e)
            }
          })
        })
      }

      // existing static file
      testStatic('/static-content', 200, /static file serving/, true)
      testStatic('/static-file', 200, /static file serving/, true)

      // no such file, so return the default app HTML.
      const getsAppHtml = [
        // This file doesn't exist.
        '/nosuchfile',

        // Our static file serving doesn't process .. or its encoded version, so
        // any of these return the app HTML.
        '/../nosuchfile',
        '/%2e%2e/nosuchfile',
        '/%2E%2E/nosuchfile',
        '/%2d%2d/nosuchfile',
        '/packages/jkuester_http/../jkuester_http/test_static.serveme',
        '/packages/jkuester_http/%2e%2e/jkuester_http/test_static.serveme',
        '/packages/jkuester_http/%2E%2E/jkuester_http/test_static.serveme',
        '/packages/jkuester_http/../../packages/jkuester_http/test_static.serveme',
        '/packages/jkuester_http/%2e%2e/%2e%2e/packages/jkuester_http/test_static.serveme',
        '/packages/jkuester_http/%2E%2E/%2E%2E/packages/v/test_static.serveme',

        // ... and they *definitely* shouldn't be able to escape the app bundle.
        '/packages/jkuester_http/../../../../../../packages/jkuester_http/test_static.serveme',
        '/../../../../../../../../../../../bin/ls',
        '/%2e%2e/%2e%2e/%2e%2e/%2e%2e/%2e%2e/%2e%2e/%2e%2e/%2e%2e/%2e%2e/%2e%2e/%2e%2e/bin/ls',
        '/%2E%2E/%2E%2E/%2E%2E/%2E%2E/%2E%2E/%2E%2E/%2E%2E/%2E%2E/%2E%2E/%2E%2E/%2E%2E/bin/ls'
      ]

      getsAppHtml.forEach(x => {
        testStatic(x, 200, /__meteor_runtime_config__ = JSON/)
      })
    })
  })
})


// TODO TEST/ADD:
// - full fetch api? fetch on the client?
// - https
// - cookies?
// - human-readable error reason/cause?
// - data parse error
// - redirect
