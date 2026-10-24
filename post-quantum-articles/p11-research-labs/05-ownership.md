# Proving Crypto Ownership After Q-Day

Technical · July 15, 2026

![After Q-Day](images/05-ownership.jpg)

**A post-quantum zero-knowledge proof over wallet key derivation can tell legitimate owners from quantum attackers — even after a migration window closes.**

Most conversations about quantum risk in crypto are about moving funds before quantum computers can break elliptic-curve signatures. Chains will introduce post-quantum accounts and give users a window to migrate. But some users will miss the window, and some will refuse to publish a migration transaction that exposes their public key. What happens to them?

After Q-Day, a legacy private key no longer proves anything. If a quantum computer can derive the private key from a public key, the rightful owner and the attacker can both produce valid signatures, and the chain cannot tell them apart.

## Derivation is the asymmetry

A quantum computer can walk from a public key to its private key. It cannot walk up a wallet's derivation tree past a hardened step. Hardened derivation feeds the parent's private key through HMAC-SHA512, so recovering the parent means inverting a hash — and Grover's algorithm only halves the security exponent, with poor parallelism making the real cost higher still.

> An attacker who has broken your address holds the same key you do. They do not hold the seed it came from.

## The proof

Working with the lead developer of Binius, we built a practical post-quantum zero-knowledge proof that lets a user demonstrate they know a seed and a derivation path that lead to a given address — without revealing any key material along the way.

On a current laptop the implementation produces a proof in roughly a quarter of a second on four cores and verifies it in about forty milliseconds, using around two gigabytes of memory and no GPU. That is fast enough to be practical in wallets and verification infrastructure today.

## What this enables

- A recovery path for users who missed a migration deadline, without reopening the door to attackers.
- A way for chains to freeze vulnerable outputs while still letting provable owners reclaim them.
- A building block for custodians who need to demonstrate control of legacy reserves after classical signatures stop meaning anything.

None of this replaces migration. But it narrows the set of bad outcomes, and gives governance processes a tool other than "burn it" or "let the fastest machine win."

---

*Teaser:* Once quantum computers can forge signatures, how do you prove a wallet is yours? The answer might be something every wallet already has — it just never needed to show it before.
