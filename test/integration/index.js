const tap = require('tape')
const Wreck = require('wreck')

const proxyUnauth = 'http://127.0.0.1:7984/'
const proxyAuth = 'http://aa:aa@127.0.0.1:7984/'
const testDb = 'authtest/'

const wreck = Wreck.defaults({
  headers: {
    'Content-Type': 'Application/json'
  }
})

tap.test('get db info unauthenticated', (t) => {
  wreck.get(proxyUnauth + testDb, (error) => {
    t.equal(error.output.statusCode, 401)
    t.end()
  })
})

tap.test('get db info authenticated', (t) => {
  wreck.get(proxyAuth + testDb, (error, response) => {
    t.error(error)
    t.equal(response.statusCode, 200)
    t.end()
  })
})

tap.test('create doc without $access', (t) => {
  const req = {
    payload: {
      a: 1
    }
  }
  wreck.request('put', proxyAuth + testDb + 'a', req, (error, response) => {
    t.error(error)
    t.equal(response.statusCode, 403)
    t.end()
  })
})

tap.test('create doc with $access, but not an array', (t) => {
  const req = {
    payload: {
      a: 1,
      $access: 'string'
    }
  }
  wreck.request('put', proxyAuth + testDb + 'a', req, (error, response) => {
    t.error(error)
    t.equal(response.statusCode, 403)
    t.end()
  })
})

tap.test('create doc with $access as empty array', (t) => {
  const req = {
    payload: {
      a: 1,
      $access: []
    }
  }
  wreck.request('put', proxyAuth + testDb + 'a', req, (error, response) => {
    t.error(error)
    t.equal(response.statusCode, 403)
    readBody(t, response, (body) => {
      t.equal(body.reason, 'You have to add your username or one of your roles to the `$access` array')
      t.end()
    })
  })
})

tap.test('create doc with $access with a user or roles that are not mine', (t) => {
  const req = {
    payload: {
      a: 1,
      $access: ['bb']
    }
  }
  wreck.request('put', proxyAuth + testDb + 'a', req, (error, response) => {
    t.error(error)
    t.equal(response.statusCode, 403)
    readBody(t, response, (body) => {
      t.equal(body.reason, 'You have to add your username or one of your roles to the `$access` array')
      t.end()
    })
  })
})

tap.test('create doc with $access with my user', (t) => {
  const req = {
    payload: {
      a: 1,
      $access: ['aa']
    }
  }
  wreck.request('put', proxyAuth + testDb + 'a', req, (error, response) => {
    t.error(error)
    t.equal(response.statusCode, 201)
    readBody(t, response, (body) => {
      t.ok(body.ok, 'response should be ok')
      t.ok(body.id, 'response should have id')
      t.ok(body.rev, 'response should have rev')
      const delUrl = proxyAuth + testDb + 'a?rev=' + body.rev
      wreck.delete(delUrl, (delError, delResponse) => {
        t.error(delError)
        t.equal(delResponse.statusCode, 200)
        t.end()
      })
    })
  })
})

tap.test('create doc with $access with my role', (t) => {
  const req = {
    payload: {
      a: 1,
      $access: ['x']
    }
  }
  wreck.request('put', proxyAuth + testDb + 'a', req, (error, response) => {
    t.error(error)
    t.equal(response.statusCode, 201)
    readBody(t, response, (body) => {
      t.ok(body.ok, 'response should be ok')
      t.ok(body.id, 'response should have id')
      t.ok(body.rev, 'response should have rev')
      const delUrl = proxyAuth + testDb + 'a?rev=' + body.rev
      wreck.delete(delUrl, (delError, delResponse) => {
        t.error(delError)
        t.equal(delResponse.statusCode, 200)
        t.end()
      })
    })
  })
})

// get existing doc with my user
// get existing doc with my role
// get existing doc with other user
// get existing doc with other role

function readBody (t, response, callback) {
  wreck.read(response, {json: 'force'}, (error, body) => {
    t.error(error)
    callback(body)
  })
}
