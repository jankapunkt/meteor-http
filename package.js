/* eslint-env meteor */
Package.describe({
  name: 'jkuester:http',
  version: '2.3.0',
  // Brief, one-line summary of the package.
  summary: 'Make HTTP calls to remote servers using fetch API',
  // URL to the Git repository containing the source code for this package.
  git: 'git@github.com:jankapunkt/meteor-http.git',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
})

Package.onUse(function (api) {
  api.versionsFrom('1.2')
  api.use('ecmascript')
  api.use(['url'], ['server', 'client'])
  api.use('fetch@0.1.1', 'server')

  api.mainModule('httpcall_client.js', 'client')
  api.mainModule('httpcall_server.js', 'server')

  api.export('HTTP')
  api.export('HTTPInternals', 'server')
})

Package.onTest(function (api) {
  api.use('ecmascript')
  api.use('webapp', 'server')
  api.use('underscore')
  api.use('random')
  api.use('lmieulet:meteor-coverage')
  api.use('lmieulet:meteor-legacy-coverage')
  api.use('meteortesting:mocha')
  api.use('jkuester:http', ['client', 'server'])
  // api.use('test-helpers', ['client', 'server'])

  api.addFiles('test_responder.js', 'server')
  api.addFiles('httpcall_tests.js', ['client', 'server'])

  api.addAssets('test_static.serveme', ['client', 'server'])
})
