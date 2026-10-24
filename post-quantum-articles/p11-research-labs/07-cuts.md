# Introducing CUTS, a new few-time hash-based signature scheme

Technical · September 28, 2026

![CUTS](images/07-cuts.jpg)

**Chained Uniform-sum Tree Signatures: compact post-quantum signatures that stay secure even if a key signs twice.**

The elliptic-curve signatures that protect Bitcoin and most other blockchains could be broken by a large enough quantum computer. Hash-based signatures are the most conservative replacement: their security rests only on hash functions, which these systems already trust. Their cost is size — and on a blockchain, size is block space.

Hash-based schemes are assembled from two kinds of small signing key. A one-time key, such as Winternitz, gives signatures of around 500 bytes but must never sign twice, and tracking which keys have been used is where real systems go wrong. A few-time key, such as the FORS keys inside SLH-DSA, survives a second signature but costs more than 2 KB at 128-bit security.

## The middle ground

CUTS — Chained Uniform-sum Tree Signatures — is a new few-time scheme from the research team, designed to sit between those two extremes. Every parameter set targets 128-bit security for a key's first signature.

- At about 550 bytes, close to one-time size, a CUTS key still retains meaningful security after two signatures.
- From around 1.4 KB, it keeps the full 128 bits after a second signature, with signatures substantially smaller than comparable FORS sets.
- At around 2.1 KB, it is also faster to verify and cheaper to generate than the FORS parameter sets we compared against.

> The goal is a signature that degrades gracefully when something goes wrong, instead of failing all at once.

## Why few-time matters

The hardest bugs in hash-based signing are not mathematical — they are operational. Backups get restored, devices get cloned, two signers briefly believe they hold the same next index. A scheme that tolerates an accidental second signature turns those incidents from catastrophic into recoverable.

## What's next

The full paper, with a complete specification and security proofs, is coming soon. The figures here reflect our current analysis, and the final parameter sets may differ. We are publishing early because the design space for blockchain-friendly post-quantum signatures benefits from more eyes, sooner.

---

*Teaser:* One-time signatures are small but fragile. Few-time signatures are forgiving but heavy. Is there room in between — and what would it change about the moment a key accidentally signs twice?
