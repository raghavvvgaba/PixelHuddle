# Architecture Decisions

## ADR-001: Use MongoDB as the primary application database

**Status:** Accepted

### Decision

GatherMeet will use MongoDB with Mongoose as its primary persistent database throughout the application's lifecycle.

### Why MongoDB fits GatherMeet

- Authentication and user accounts already use MongoDB and Mongoose.
- Persistent entities such as users, offices, memberships, invitations, and map configuration can be represented with referenced documents and appropriate indexes.
- High-frequency realtime state such as player movement, active conversations, media state, and presence is handled by Socket.IO instead of being persisted on every update.
- Using one database and data-access stack keeps the project simpler to learn, test, deploy, and maintain.

### Why PostgreSQL was not selected

- Migrating would require rewriting existing models, authentication persistence, database configuration, tests, and deployment setup.
- GatherMeet does not currently depend on billing, complex relational reporting, audit-heavy administration, or deeply interconnected transactional workflows.
- PostgreSQL's relational guarantees would not currently offset the migration and maintenance cost.
- Running PostgreSQL alongside MongoDB would add operational complexity without a clear product requirement.

### Tradeoff

Some workflows update multiple MongoDB documents. For example, invitation acceptance creates a membership and marks the invitation as accepted. If only one write succeeds, the data can become inconsistent.

Use unique indexes, idempotent operations, and MongoDB transactions where supported. Reconsider this decision only if strongly relational or multi-record transactional workflows become central to GatherMeet.
