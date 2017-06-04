const tap = require('tape')
const Wreck = require('wreck')

const proxyUnauth = 'http://127.0.0.1:7984/'
const proxyAuth = 'http://aa:aa@127.0.0.1:7984/'
const proxyButh = 'http://bb:bb@127.0.0.1:7984/'
const testDb = 'authtest/'

const wreck = Wreck.defaults({
  headers: {
    'Content-Type': 'Application/json'
  }
})

tap.test('get db info unauthenticated', (t) => {
  wreck.get(proxyUnauth + 'authtest', (error) => {
    t.equal(error.output.statusCode, 401)
    t.end()
  })
})

tap.test('get db info authenticated', (t) => {
  wreck.get(proxyAuth + 'authtest', (error, response) => {
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

tap.test('get existing doc with my user', (t) => {
  const doc = {
    a: 1,
    $access: ['aa']
  }
  createDocAs(proxyAuth, t, doc, (body) => {
    wreck.get(proxyAuth + testDb + 'a', {json: 'force'}, (error, response, payload) => {
      t.error(error)
      t.equal(response.statusCode, 200)
      t.equal(payload.a, 1)
      deleteDocAs(proxyAuth, t, body, t.end)
    })
  })
})

tap.test('get existing doc with my role', (t) => {
  const doc = {
    a: 1,
    $access: ['x']
  }
  createDocAs(proxyAuth, t, doc, (body) => {
    wreck.get(proxyAuth + testDb + 'a', {json: 'force'}, (error, response, payload) => {
      t.error(error)
      t.equal(response.statusCode, 200)
      t.equal(payload.a, 1)
      deleteDocAs(proxyAuth, t, body, t.end)
    })
  })
})

tap.test('get existing doc with other user', (t) => {
  const doc = {
    a: 1,
    $access: ['bb']
  }
  createDocAs(proxyButh, t, doc, (body) => {
    wreck.get(proxyAuth + testDb + 'a', {json: 'force'}, (error, response, payload) => {
      t.equal(error.output.payload.statusCode, 401)
      deleteDocAs(proxyButh, t, body, t.end)
    })
  })
})

tap.test('get existing doc with other role', (t) => {
  const doc = {
    a: 1,
    $access: ['a']
  }
  createDocAs(proxyButh, t, doc, (body) => {
    wreck.get(proxyAuth + testDb + 'a', {json: 'force'}, (error, response, payload) => {
      t.equal(error.output.payload.statusCode, 401)
      deleteDocAs(proxyButh, t, body, t.end)
    })
  })
})

tap.test('create docs with two users and query each _changes', (t) => {
  const docA = {
    _id: 'xa',
    a: 1,
    $access: ['aa']
  }
  const docB = {
    _id: 'xb',
    b: 1,
    $access: ['bb']
  }
  createDocAs(proxyAuth, t, docA, (bodyA) => {
    createDocAs(proxyButh, t, docB, (bodyB) => {
      getChangesAs(proxyAuth, t, (changesA) => {
        getChangesAs(proxyButh, t, (changesB) => {
          // tests go here
          t.equals(changesA.results.length, 1)
          t.equals(changesA.results[0].id, 'xa')
          t.equals(changesB.results.length, 1)
          t.equals(changesB.results[0].id, 'xb')
          deleteDocAs(proxyAuth, t, bodyA, () => {
            deleteDocAs(proxyButh, t, bodyB, t.end)
          })
        })
      })
    })
  })
})

// utilities

function getChangesAs (auth, t, callback) {
  wreck.get(auth + testDb + '_changes', { json: 'force' }, (error, payload, body) => {
    t.error(error)
    callback(body)
  })
}

function createDocAs (auth, t, doc, callback) {
  wreck.request('put', auth + testDb + (doc._id || 'a'), { payload: doc }, (error, response) => {
    t.error(error)
    t.equal(response.statusCode, 201)
    readBody(t, response, (body) => {
      callback(body)
    })
  })
}

function deleteDocAs (auth, t, doc, callback) {
  const delUrl = auth + testDb + (doc.id || 'a') + '?rev=' + doc.rev
  wreck.delete(delUrl, callback)
}

function readBody (t, response, callback) {
  wreck.read(response, {json: 'force'}, (error, body) => {
    t.error(error)
    callback(body)
  })
}
