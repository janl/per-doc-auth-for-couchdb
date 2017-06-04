/* gobal isArray, log */
function (newDoc, oldDoc, ctx) {
  var hasUserName = function (doc) {
    if (!doc.$access) { return false }
    return doc.$access.indexOf(ctx.name) !== -1
  }

  var hasRole = function (doc) {
    if (!doc.$access) { return false }
    for (var idx = 0; idx < ctx.roles.length - 1; idx++) {
      if (doc.$access.indexOf(ctx.roles[idx]) !== -1) {
        return true
      }
    }
    return false
  }

  var isAdmin = function () {
    return ctx.roles.indexOf('_admin') !== -1
  }

  if (isAdmin()) {
    log('admin override!')
    return
  }

  // doc update requires old doc to have current user/role
  if (oldDoc && !(hasUserName(oldDoc) || hasRole(oldDoc))) {
    throw ({forbidden: 'You can’t update/delete docs that you don’t own'})
  }

  // doc deletes need no more checking
  if (newDoc._deleted) {
    return
  }

  // doc create or update needs
  if (!newDoc.$access || !isArray(newDoc.$access)) {
    throw ({forbidden: 'All docs must have `$access` property as an array'})
  }

  if (!hasUserName(newDoc) && !hasRole(newDoc)) {
    throw ({forbidden: 'You have to add your username or one of your roles to the `$access` array'})
  }
}
