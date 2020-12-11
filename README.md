# jkuester:http

This is a fork of the **deprecated Meteor `http` package**.
On the client it remains unchanged, while on the server it uses `node-fetch` 
instead of `request`. 
It (mostly) preserves the API of the original `HTTP` module.

`HTTP` provides an HTTP request API on the client and server.  To use
these functions, add the HTTP package to your project with `$ meteor add http`.

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

The API is documented in the [API.md file](./API.md)

## Contribution

Your contributions are very welcomed. Please ensure to run tests via:

```bash
$ meteor test-packages ./ 
```

## Changelog

- **2.0.1**
  - replaced `JSON.stringify` and `JSON.parse` with `EJSON`
- **2.0.0**
  - ported original `http` package and replaced `request` with `fetch`

## License

The original package is part of the Meteor core, which is MIT licensed. There
is no intention to alter the license so this package preserves the original
MIT license.
