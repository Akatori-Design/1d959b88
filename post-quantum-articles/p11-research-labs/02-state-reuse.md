# Key recovery from state reuse: a flaw in Threshold ML-DSA's reference code

Security · September 8, 2026

![State Reuse](images/02-state-reuse.jpg)

**Reviewing the first fully ML-DSA-compatible threshold scheme, we found a state-reuse issue that could expose a signer's secret share — and worked with PQShield on a fix.**

Threshold ML-DSA is the first threshold signature scheme that is fully compatible with ML-DSA: a quorum of T out of N parties cooperates to produce a signature that any standard ML-DSA verifier will accept. That property is a big deal for anyone who wants post-quantum threshold signing without asking the rest of the world to upgrade its verifiers, and it is closely aligned with our own work. So we read the paper, and then we read the code.

The authors published a Go reference implementation alongside the paper. Comparing the two, we found a requirement that the paper's security model enforces but the code did not: the state of a signing attempt must be used at most once.

## What went wrong

The implementation's API allowed the same round-one randomness to be reused when producing responses to different challenges. In lattice-based signing, that is precisely the kind of reuse that can leak information — in this case, enough to reveal a party's secret share. Nothing about the mathematics was broken. The discipline around state simply was not encoded where developers would hit it.

> A reference implementation of a new construction is, in practice, its specification. Whatever the README says.

The repository is honest about being an academic proof of concept that has not been carefully reviewed. But that warning does not change how code like this gets used. It is the natural starting point for anyone implementing threshold ML-DSA, it has already been ported to other languages, and a port can easily preserve the API while losing the state-deletion discipline from the paper's pseudocode. AI-assisted development makes that propagation faster still.

## Disclosure and fix

We opened a pull request, talked through the right shape of the fix with Guilhem Niot at PQShield, and the change was merged on September 5. Since then we have contacted teams that reimplemented the scheme, explained the issue, and helped review their own state handling.

## The general lesson

Single-use state is a recurring hazard in post-quantum cryptography — it shows up in stateful hash-based signatures, in nonce handling, and here, in interactive threshold protocols. The safest APIs make reuse impossible rather than merely documented: consume the state on use, make it non-copyable where the language allows, and fail loudly if anything tries to sign twice with the same commitment.

---

*Teaser:* The first threshold scheme that any ML-DSA verifier accepts arrived with careful proofs and public reference code. Reading the two side by side, one small mismatch stood out — and it touched the one thing a signer must never give away.
