# A review of SHRINCS

Analysis · August 28, 2026

![SHRINCS](images/03-shrincs.jpg)

**SHRINCS offers Bitcoin a path to post-quantum security without a blocksize increase — but its stateful design moves new risks onto wallets and custodians.**

SHRINCS has been formally proposed for Bitcoin. It is an elegant design that aims for quantum resistance without necessarily requiring larger blocks. It also carries real tradeoffs, and the largest of them is that it shifts part of the burden of security away from the protocol and onto wallets.

Much of the design appears to be organised around saving block space — a shared resource that is, today, not especially scarce. In optimising for it, SHRINCS introduces a failure mode that is silent, irreversible, and borne by individual holders at the exact layer where their money lives.

## Why hash-based signatures suit Bitcoin

Hash functions are the most scrutinised primitive in cryptography, and Bitcoin already depends on SHA-256 for consensus. SHRINCS is built entirely from SHA-256, so it adds no new family of mathematical assumptions. Grover's algorithm offers only a modest speedup against hashes, so security can be maintained by tuning parameters rather than replacing foundations. Verification is cheap, hardware acceleration is everywhere, and a 48-byte public key is very competitive for a post-quantum scheme.

The traditional costs of hash-based signatures are size and speed. SHRINCS is designed to attack both.

## Two signing paths

The primary path is stateful: a flexible XMSS tree with WOTS+C one-time keys, producing signatures as small as roughly 550 bytes. The fallback is stateless, based on SLH-DSA with a custom parameter set, producing signatures of about 5.8 KB. Losing state therefore does not mean losing funds — it means falling back to the larger signature.

That fallback is the strongest part of the proposal. It turns "lost state might mean lost coins" into "lost state means bigger transactions."

## What statefulness costs

Every stateful signature consumes a fresh one-time leaf, so the signer must keep a counter that only ever moves forward. Sign two different messages from the same state and the one-time key is reused, which can let an attacker forge signatures. That counter is a security invariant, not an implementation detail.

- A hardware wallet whose encrypted state is copied and later rolled back can be tricked into reusing a leaf — no key extraction required.
- A phone restored from an older cloud backup is, through ordinary disaster recovery, behind its own signing history.
- A seed imported into a new wallet carries the key material but not the knowledge of which leaves have been used.

The proposal handles these correctly by requiring a fallback to stateless signing whenever state is uncertain. But that means the compact path is expensive to build safely and gets demoted after any recovery anyway. Many consumer wallets may simply never implement it.

## Custody and incentives

Institutional custodians can maintain monotonic state far better than consumer wallets. But their architectures are built around redundancy: multiple HSMs, geographic failover, replicated services. SHRINCS adds a rule across all of it — no two instances of a key may ever consume the same state — which turns an operational consistency problem into a cryptographic one. Their clients rarely transact and care little about fees. The fallback is likely to become the default.

> A risk that is local to the signer is invisible to the network, and carried by the individual.

## Where we land

SHRINCS is serious engineering, and a sign that the Bitcoin community is taking Q-Day seriously. But the case for its stateful path is less a security argument than a way of side-stepping a political one: whether Bitcoin's blocksize should grow to accommodate post-quantum signatures. A stateless-only scheme, paired with an honest conversation about block space, would arguably give Bitcoin the most conservative security assumptions of any major chain — which is exactly what its design philosophy has always asked for.

---

*Teaser:* Bitcoin may finally have a post-quantum signature that doesn't demand bigger blocks. But every elegant trade-off has a cost somewhere. So where does this one land — and who ends up carrying it?
