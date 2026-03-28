export interface Example {
  name: string
  source: string
}

export const examples: Example[] = [
  {
    name: 'Simple Flow',
    source: `@flow LR

User -> Auth: login
Auth -> |DB|: verify
|DB| -> Auth: ok
Auth -> User: token`,
  },
  {
    name: 'Architecture',
    source: `@flow TB

Client -> API Gateway: request

Backend {
  API Gateway -> <Auth>: validate
  Auth -> Users: allowed
  Auth -> API Gateway: denied
  Users -> |Database|: query
}

API Gateway -> Client: response`,
  },
  {
    name: 'Microservices',
    source: `@flow LR

Client -> (LB): request

Services {
  (LB) -> Auth: route
  (LB) -> Products: route
  Auth -> |Redis|: sessions
  Products -> |Postgres|: query
  Products -> (Cache): check
}

Auth -> Client: 401
Products -> Client: response`,
  },
  {
    name: 'CI Pipeline',
    source: `@flow LR

Push -> Build: trigger
Build -> <Tests>: run
Tests -> Deploy: pass
Tests -> Notify: fail
Deploy -> |Registry|: publish
Deploy -> Staging: release
Staging -> <Approval>: review
Approval -> Production: approved
Approval -> Staging: rejected`,
  },
  {
    name: 'Decision Flow',
    source: `@flow TB

Request -> <Authenticated>: check

Authenticated -> <Authorized>: yes
Authenticated -> (401 Unauthorized): no

Authorized -> Process: yes
Authorized -> (403 Forbidden): no

Process -> |Database|: save
Database -> (200 OK): success
Database -> (500 Error): failure`,
  },
  {
    name: 'Sequence',
    source: `@seq

User -> Frontend: click buy
Frontend -> API: POST /order
API -> |DB|: insert order
DB -> API: order_id
API -> Payment: charge

alt success {
  Payment -> API: ok
  API -> Frontend: 201 Created
  Frontend -> User: confirmation
} else {
  Payment -> API: declined
  API -> Frontend: 402
  Frontend -> User: payment failed
}`,
  },
  {
    name: 'Auth Sequence',
    source: `@seq

Client -> Gateway: request
Gateway -> Auth: validate token
Auth -> Auth: check expiry

alt valid {
  Auth -> Gateway: 200 OK
  Gateway -> API: forward
  API -> |DB|: query
  DB -> API: result
  API -> Gateway: response
  Gateway -> Client: 200
} else {
  Auth -> Gateway: 401
  Gateway -> Client: unauthorized
}`,
  },
]
