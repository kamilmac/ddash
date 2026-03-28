export interface Example {
  name: string
  source: string
}

export const examples: Example[] = [
  {
    name: 'Simple Flow',
    source: `flowchart LR
  User -->|login| Auth
  Auth --> DB[(DB)]
  DB -->|ok| Auth
  Auth -->|token| User`,
  },
  {
    name: 'Architecture',
    source: `flowchart TB
  Client -->|request| Gateway[API Gateway]

  subgraph Backend
    Gateway --> Valid{Auth}
    Valid -->|allowed| Users
    Valid -->|denied| Gateway
    Users --> DB[(Database)]
  end

  Gateway -->|response| Client`,
  },
  {
    name: 'Microservices',
    source: `flowchart LR
  Client --> LB([Load Balancer])

  subgraph Services
    LB -->|route| Auth
    LB -->|route| Products
    Auth --> Redis[(Redis)]
    Products --> Postgres[(Postgres)]
    Products --> Cache([Cache])
  end

  Auth -->|401| Client
  Products -->|response| Client`,
  },
  {
    name: 'CI/CD Pipeline',
    source: `flowchart LR
  Push -->|trigger| Build
  Build -->|run| Tests{Tests}
  Tests -->|pass| Deploy
  Tests -->|fail| Notify
  Deploy -->|publish| Registry[(Registry)]
  Deploy -->|release| Staging
  Staging -->|review| Approval{Approval}
  Approval -->|approved| Production
  Approval -->|rejected| Staging`,
  },
  {
    name: 'Decision Tree',
    source: `flowchart TB
  Request -->|check| Authn{Authenticated?}

  Authn -->|yes| Authz{Authorized?}
  Authn -->|no| R401([401 Unauthorized])

  Authz -->|yes| Process
  Authz -->|no| R403([403 Forbidden])

  Process -->|save| DB[(Database)]
  DB -->|success| R200([200 OK])
  DB -->|failure| R500([500 Error])`,
  },
  {
    name: 'State Machine',
    source: `flowchart LR
  Idle -->|start| Loading
  Loading -->|success| Ready
  Loading -->|error| Error
  Ready -->|edit| Dirty
  Dirty -->|save| Saving
  Saving -->|success| Ready
  Saving -->|error| Error
  Error -->|retry| Loading
  Error -->|dismiss| Idle
  Dirty -->|discard| Ready`,
  },
  {
    name: 'Event-Driven',
    source: `flowchart LR
  Producer -->|publish| Queue[(Message Queue)]

  subgraph Consumers
    Queue -->|subscribe| OrderSvc[Order Service]
    Queue -->|subscribe| NotifySvc[Notification Service]
    Queue -->|subscribe| AnalyticsSvc[Analytics Service]
  end

  OrderSvc --> OrderDB[(Orders DB)]
  NotifySvc -->|email| SMTP
  NotifySvc -->|push| PushGW([Push Gateway])
  AnalyticsSvc --> ClickHouse[(ClickHouse)]`,
  },
  {
    name: 'Git Flow',
    source: `flowchart LR
  Main -->|branch| Feature
  Feature -->|commit| Feature
  Feature -->|PR| Review{Code Review}
  Review -->|approved| Merge([Merge])
  Review -->|changes| Feature
  Merge --> Main
  Main -->|tag| Release([Release])
  Release -->|deploy| Prod`,
  },
  {
    name: 'Entity Relationship',
    source: `flowchart LR
  User -->|has many| Order
  Order -->|has many| LineItem[Line Item]
  LineItem -->|belongs to| Product
  Product -->|has many| Category
  Order -->|has one| Payment
  Payment -->|processed by| Stripe([Stripe API])
  User -->|has one| Profile
  Product -->|has many| Review
  Review -->|belongs to| User`,
  },
  {
    name: 'Network Topology',
    source: `flowchart TB
  Internet((Internet))

  subgraph DMZ
    LB([Load Balancer])
    WAF{WAF}
    Internet --> WAF
    WAF -->|allow| LB
    WAF -->|block| Deny([Blocked])
  end

  subgraph Private Network
    LB --> Web1[Web Server 1]
    LB --> Web2[Web Server 2]
    Web1 --> AppDB[(Primary DB)]
    Web2 --> AppDB
    AppDB --> Replica[(Read Replica)]
    Web1 --> Redis[(Redis Cache)]
    Web2 --> Redis
  end`,
  },
  {
    name: 'Sequence: Auth',
    source: `sequenceDiagram
  Client ->> Gateway: request
  Gateway ->> Auth: validate token
  Auth ->> Auth: check expiry

  alt valid
    Auth -->> Gateway: 200 OK
    Gateway ->> API: forward
    API ->> DB: query
    DB -->> API: result
    API -->> Gateway: response
    Gateway -->> Client: 200
  else expired
    Auth -->> Gateway: 401
    Gateway -->> Client: unauthorized
  end`,
  },
  {
    name: 'Sequence: E-Commerce',
    source: `sequenceDiagram
  participant User
  participant UI
  participant API
  participant DB
  participant Payment
  participant Email

  User ->> UI: click buy
  UI ->> API: POST /order
  API ->> DB: insert order
  DB -->> API: order_id
  API ->> Payment: charge card

  alt success
    Payment -->> API: ok
    API ->> DB: update status
    API ->> Email: send confirmation
    API -->> UI: 201 Created
    UI -->> User: order confirmed
  else declined
    Payment -->> API: declined
    API ->> DB: mark failed
    API -->> UI: 402
    UI -->> User: payment failed
  end`,
  },
  {
    name: 'Sequence: WebSocket',
    source: `sequenceDiagram
  participant Client
  participant Server
  participant Redis

  Client ->> Server: WS handshake
  Server -->> Client: 101 Switching Protocols
  Server ->> Redis: subscribe channel

  loop heartbeat
    Client ->> Server: ping
    Server -->> Client: pong
  end

  Redis -->> Server: new message
  Server -->> Client: push update
  Client ->> Server: ack

  opt disconnect
    Client ->> Server: close frame
    Server ->> Redis: unsubscribe
    Server -->> Client: close ack
  end`,
  },
]
