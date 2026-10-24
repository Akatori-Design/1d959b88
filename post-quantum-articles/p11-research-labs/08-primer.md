# Post-Quantum Signing #1: Primer

Education · September 24, 2026

![Signing #1](images/08-primer.jpg)

**ECDSA, Schnorr, EdDSA and BLS all reduce to the same elliptic-curve problem — which means one quantum algorithm breaks all four at once.**

Almost everything a blockchain does comes down to checking signatures. Balances, transactions, consensus votes — strip away the machinery and a node spends its day asking one question: does this signature verify under that public key? Nothing is encrypted. What protects your coins is that only you can produce a valid signature for your key.

Today that job is done by four schemes: ECDSA, Schnorr, EdDSA and BLS. They look like four independent choices. They are really four versions of the same bet.

## What a signature scheme is

A signature scheme is three algorithms working together. Key generation produces a public key you can publish and a private key you guard. Signing takes the private key and a message and produces a signature. Verification lets anyone with the public key check that the signature is valid for that message.

From that structure come three guarantees at once: authenticity (the signer held the key), integrity (the message was not altered), and non-repudiation (the signer cannot plausibly deny it later).

## Four schemes, one assumption

- **ECDSA** secures Bitcoin's legacy outputs and Ethereum accounts.
- **Schnorr** brings linearity and cleaner aggregation, and underpins Taproot.
- **EdDSA** offers deterministic signing and fast, misuse-resistant implementations.
- **BLS** uses pairings to aggregate many signatures into one, which is why consensus layers love it.

> Each of them is secure only as long as the elliptic-curve discrete logarithm problem is hard.

Shor's algorithm solves exactly that problem efficiently on a large enough quantum computer. When it arrives, all four fall together.

## The real attack surface

A quantum attacker needs your public key. Many addresses hide it behind a hash until the first spend — but reused addresses, early pay-to-public-key outputs, and some modern output types expose it directly on-chain. Exposed public keys, not the algorithms in the abstract, define who is at risk first.

In the next part of this series we will look at the post-quantum replacements, what they cost in bytes and cycles, and why "just swap the algorithm" is never the whole story.

---

*Teaser:* ECDSA, Schnorr, EdDSA, BLS: four schemes, four design philosophies — and one thing in common. Before talking about replacements, it's worth seeing exactly what a quantum computer would break, and where.
