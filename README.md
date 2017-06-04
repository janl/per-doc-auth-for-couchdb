# Tech Demo: Do Not Use


### Design:

- Docs have new property `$access: ['user', 'role', …]`
  - if they don’t, docs are admin only or public (maybe a per-db setting)

- R/W access to docs is matched against the http user & roles and the `$access` field

- `_changes` is built off a built-in view that sorts all docs by elements in `$access`

- `_changes` is subject to http request auth:
  - no auth: deny
  - user: list all user/roles docs
  -

TODO:
  - load roles view results for _changes repsonse
  - sort _chages response by `seq`
  - maybe hack CouchDB to include updateSeq in map fun.
  - moar test
