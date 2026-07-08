/**
 * System Design context — structure for system design discussions.
 */
export const SYSTEM_DESIGN_CONTEXT = `For system design, follow the framework expected in Google/Meta/Microsoft Staff-level (L6+) interviews:

1. Requirements & Scope (5 min)
   - Functional requirements — core use cases, user-facing behavior.
   - Non-functional requirements — scale (DAU, QPS, storage), latency (P99), availability (SLA), consistency model.
   - Out of scope — explicitly state what you're NOT designing.

2. Back-of-Envelope Estimation (3 min)
   - Traffic: QPS (read vs write ratio), peak vs average.
   - Storage: data size × retention × growth rate.
   - Bandwidth: request/response sizes × QPS.
   - Memory: working set size for caching.

3. High-Level Architecture (10 min)
   - Component diagram with data flow.
   - API design (REST/gRPC/GraphQL) with key endpoints.
   - Data model — schema, relationships, access patterns.

4. Deep Dive (20 min) — pick 2-3 components:
   - Database choice & schema — SQL vs NoSQL, partitioning key, indexing strategy.
   - Caching strategy — cache-aside, write-through, TTL, invalidation, thundering herd mitigation.
   - Message queues & async processing — when to decouple, exactly-once delivery.
   - Consistency & conflict resolution — CRDTs, vector clocks, last-writer-wins.
   - Search & indexing — inverted index, ranking, real-time vs batch.
   - CDN & edge — what to cache at edge, cache busting strategy.

5. Scalability & Reliability (5 min)
   - Horizontal scaling — stateless services, sharding strategy.
   - Replication — leader-follower, multi-region, conflict resolution.
   - Failure handling — circuit breaker, bulkhead, retry with exponential backoff + jitter.
   - Graceful degradation — what features to shed under load.

6. Observability & Operations (2 min)
   - Key metrics, SLIs/SLOs, alerting philosophy.
   - Distributed tracing, structured logging.
   - Deployment strategy — canary, blue-green, feature flags.

7. Security (where relevant)
   - AuthN/AuthZ, rate limiting, data encryption, PII handling.

Always relate design choices back to the requirements. The interviewer evaluates whether you can JUSTIFY choices, not just list components.
`;
