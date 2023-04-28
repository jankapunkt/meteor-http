# jkuester:http

[![Test suite](https://github.com/jankapunkt/meteor-http/actions/workflows/testsuite.yml/badge.svg)](https://github.com/jankapunkt/meteor-http/actions/workflows/testsuite.yml)
[![CodeQL](https://github.com/jankapunkt/meteor-http/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/jankapunkt/meteor-http/actions/workflows/codeql-analysis.yml)
[![built with Meteor](https://img.shields.io/badge/Meteor-package-green?logo=meteor&logoColor=white)](https://atmospherejs.com/leaonline/oauth2-server)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
[![Project Status: Active – The project has reached a stable, usable state and is being actively developed.](https://www.repostatus.org/badges/latest/active.svg)](https://www.repostatus.org/#active)
![GitHub](https://img.shields.io/github/license/jankapunkt/meteor-http)

Meteor HTTP + EJSON + More

This is a maintained fork of the **deprecated Meteor `http` package**.
On the client it remains unchanged, while on the server it uses `node-fetch` 
instead of `request`.
It (mostly) preserves the API of the original `HTTP` module.

`HTTP` provides an HTTP request API on the client and server.  To use
these functions, add the HTTP package to your project with `$ meteor add http`.

Additionally it uses EJSON to parse responses, so you can send custom types via
your HTTP routes back to the client. 

## Installation and import

You can install this package via

```bash
$ meteor add jkuester:http
```

and import it into your code via

```javascript
import { HTTP } from 'meteor/jkuester:http'
```

## Usage

The package preserves all the original API functionality, except 
`npmRequestOptions` (since `request` has been deprecated).

The API is documented in the [API.md](./API.md) file.

If you want to send custom types, you need to read about [how `ejson` works in
Meteor](https://docs.meteor.com/api/ejson.html).

## Contribution

Your contributions are very welcomed. Please ensure to run tests via:

```bash
$ meteor test-packages ./ 
```


## Testing

We use mocha with `meteortesting:mocha` to run the tests. 
We also provide a local test project (which is not shipped with the package).

In order to setup the tests you need to change into the test project and install
the test dependencies: 

```bash
$ cd tests && meteor npm install
```

You can then leverage some of it's npm scripts to test code:

```bash
$ meteor npm run lint:code     # run linter in check mode
$ meteor npm run lint:code-fix # run linter and autofix issues
$ meteor npm run test          # run test once
$ meteor npm run test:watch    # run tests in watch mode
```


## Changelog

- **2.3.0**
  - AbortController is not used by default to comply with original API.
    If a value greater than -1 is given as timeout then AbortController will
    be called after that timeout.
- **2.2.0**
  - Add `HTTP.debug` to API to allow debugging of unsensitive internals
- **2.1.0**
  - Added `AbortController` implementation until we get Node >= 16
  - Refactored tests to use `meteortesting:mocha`
  - added bare `tests/` project
  - use standard linter; code is now standard linted
  - added EJSON tests
  - added static file serving tests
- **2.0.1**
  - replaced `JSON.stringify` and `JSON.parse` with `EJSON`
- **2.0.0**
  - ported original `http` package and replaced `request` with `fetch`

## License

The original package is part of the Meteor core, which is MIT licensed. There
is no intention to alter the license so this package preserves the original
MIT license.
