const Hapi = require('hapi')
const h2o2 = require('h2o2')
const Hoek = require('hoek')
const Boom = require('boom')
const Wreck = require('wreck')
const basicAuth = require('basic-auth')

module.exports.start = function (options, callback) {
  const server = new Hapi.Server({
    debug: {
      log: ['error', 'request'],
      request: ['error', 'requested', 'request']
    }
  })
  server.connection(options.connection)

  const mapUri = (request, response) => {
    if (!request.headers.authorization) {
      return response(Boom.unauthorized('Missing authorization header'))
    }
    response(null, options.couchdb + request.url.path)
  }

  const mapUriChanges = (request, response) => {
    if (!request.headers.authorization) {
      return response(Boom.unauthorized('Missing authorization header'))
    }

    // if user X, get username & roles and query _design/$auth/_view/users-and-roles
    // with all startkey/endkey ranges
    // first stab with just username
    getUserSessionByRequest(request, (session) => {
      // if admin, go to regular changes
      if (session.userCtx.roles.indexOf('_admin') !== -1) {
        return response(null, options.couchdb + request.url.path)
      }
      const name = session.userCtx.name
      const uri = options.couchdb + '/authtest/_design/$auth/_view/users-and-roles?startkey=["' + name + '"]&endkey=["' + name + '",{}]'
      response(null, uri)
    })
  }

  server.register([
    h2o2
  ], (registerError) => {
    Hoek.assert(!registerError, registerError)

    server.route({
      method: 'GET',
      path: '/authtest',
      handler: function proxyHandler (request, reply) {
        return reply.proxy({
          passThrough: true,
          mapUri: mapUri
        })
      }
    })

    server.route({
      method: 'GET',
      path: '/authtest/_changes',
      handler: function proxyHandler (request, reply) {
        return reply.proxy({
          passThrough: true,
          mapUri: mapUriChanges,
          onResponse: function (error, response, req, reply) {
            Hoek.assert(!error, error)
            Wreck.read(response, {json: 'force'}, (error, body) => {
              Hoek.assert(!error, error)
              let lastSeq = 0
              const changes = {
                results: body.rows.map((row) => {
                  const seq = row.key[1]
                  lastSeq = seq
                  return {seq: seq, id: row.id, changes: [{rev: row.rev}]}
                })
              }
              changes.lastSeq = lastSeq
              reply(changes)
            })
          }
        })
      }
    })

    server.route({
      method: ['PUT', 'POST', 'DELETE'],
      path: '/authtest/{path*}',
      config: {
        payload: {
          output: 'stream',
          parse: false
        }
      },
      handler: function proxyHandler (request, reply) {
        return reply.proxy({
          passThrough: true,
          mapUri: mapUri
        })
      }
    })

    server.route({
      method: ['GET'],
      path: '/authtest/{path*}',
      handler: function proxyHandler (request, reply) {
        return reply.proxy({
          passThrough: true,
          mapUri: mapUri,
          onResponse: function (error, response, req, reply) {
            Hoek.assert(!error, error)
            // this is gnarly!
            const name = getUserNameFromRequest(req)
            readBody(response, (body) => {
              getUserSession(req, (session) => {
                if (!userOrRoleCanAccess(name, session.userCtx.roles, body)) {
                  return reply(Boom.unauthorized())
                }
                reply(body)
              })
            })
          }
        })
      }
    })

    server.start((startError) => {
      Hoek.assert(!startError, startError)
      callback(null, server)
    })
  })
}

function userOrRoleCanAccess (name, roles, body) {
  var hasUserName = function (doc) {
    if (!doc.$access) { return false }
    return doc.$access.indexOf(name) !== -1
  }

  var hasRole = function (doc) {
    if (!doc.$access) { return false }
    for (var idx = 0; idx < roles.length - 1; idx++) {
      if (doc.$access.indexOf(roles[idx]) !== -1) {
        return true
      }
    }
    return false
  }
  const res = hasUserName(body) || hasRole(body)
  return res
}

function getUserSession (request, callback) {
  var sessionUri = process.env.COUCHDB + '/_session'
  const authzHeader = request.headers.authorization
  const options = {
    json: 'force',
    headers: {
      authorization: authzHeader
    }
  }
  Wreck.get(sessionUri, options, (error, response, payload) => {
    Hoek.assert(!error, error)
    callback(payload)
  })
}

function getUserNameFromRequest (request) {
  return basicAuth.parse(request.headers.authorization).name
}

function readBody (response, callback) {
  Wreck.read(response, {json: 'force'}, (error, body) => {
    Hoek.assert(!error, error)
    callback(body)
  })
}

function getUserSessionByRequest (request, callback) {
  getUserSession(request, (session) => {
    callback(session)
  })
}
