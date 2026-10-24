# Nine schemes advance to Round 3 of NIST's Additional Digital Signatures process

Security · May 15, 2026

![Round 3](images/06-round3.jpg)

**Lattice, isogeny, MPC-in-the-Head and multivariate candidates move forward as alternatives to ML-DSA and SLH-DSA — with implications for blockchains.**

In May 2026 NIST named the third-round candidates of its Additional Digital Signatures process and published its second-round status report. Nine schemes advance; five do not. The next PQC Standardization Conference is planned for the first half of 2027.

Whatever comes out of this process will sit alongside NIST's existing post-quantum signature standards — ML-DSA, SLH-DSA and the forthcoming FN-DSA — rather than replace them.

## Why this process exists

Two of the three signature schemes from NIST's main standardisation effort are lattice-based. The additional call, opened in 2022, was meant to diversify the portfolio: non-lattice general-purpose signatures, and schemes with shorter signatures or faster verification than SPHINCS+. Lattice submissions had to show a large advantage over both Dilithium and Falcon; non-lattice submissions had to beat SPHINCS+ on at least one important axis.

Forty candidates entered the first round. Fourteen reached the second. Nine remain.

## Four mathematical families

- **Isogeny.** SQIsign is the only isogeny scheme left, with the smallest combined key and signature sizes of any candidate. Between rounds its signing became dramatically faster and its security argument cleaner.
- **Lattice.** A single lattice candidate remains, offering a different efficiency profile from ML-DSA and FN-DSA.
- **MPC-in-the-Head.** Schemes that build signatures from zero-knowledge proofs of simulated multi-party computation, trading size for conservative assumptions.
- **Multivariate.** Schemes based on solving systems of multivariate quadratic equations, often with very small signatures and fast verification but large public keys.

> For blockchains, signature size is block space, and verification time is a tax on every node.

## Why it matters for digital assets

Blockchains are unusually sensitive to signature size and verification cost, because every byte and every cycle is paid for by every participant forever. A scheme with tiny signatures but huge keys might suit one chain's design and be impossible for another. Diversity in the standard portfolio gives protocol designers room to choose — and a hedge if any single family of assumptions turns out weaker than it looks.

We will publish deeper reviews of the individual candidates over the coming months.

---

*Teaser:* Nine signature schemes are still standing in NIST's search for alternatives to ML-DSA. Which mathematical bets made it through, and why should anyone running a blockchain care which one wins?
