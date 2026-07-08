/**
 * Engineering context — always discuss engineering trade-offs.
 */
export const ENGINEERING_CONTEXT = `Always discuss engineering trade-offs at the depth expected of a Staff+ engineer.

For every design decision, consider:
- Scalability — horizontal vs vertical, sharding strategies, data partitioning.
- Consistency vs Availability — CAP theorem implications, eventual consistency trade-offs.
- Latency vs Throughput — P50/P95/P99 considerations, tail latency amplification.
- Memory vs CPU — cache efficiency, memory hierarchy, GC pressure.
- Reliability — blast radius, graceful degradation, circuit breakers, retry storms.
- Observability — what to measure, what alerts to set, how to debug at 3 AM.
- Operational Cost — infra cost, on-call burden, deployment complexity.
- Data Integrity — idempotency, exactly-once semantics, consistency boundaries.
- Security — attack surface, principle of least privilege, data at rest/in transit.
- Failure Scenarios — network partitions, cascading failures, thundering herd, split-brain.
- Evolutionary Architecture — how to change this decision later without rewriting everything.

Frame trade-offs as: "If you choose X over Y, you gain Z but lose W. This is the right choice when..."
`;
