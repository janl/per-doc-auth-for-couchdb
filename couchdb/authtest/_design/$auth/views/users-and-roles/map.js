function (doc) {
  log(doc)
  var now = Date.now()
  if (!doc.$access) { return }
  doc.$access.forEach(function (user_role) {
    emit([user_role, now], doc._rev)
  })
}
