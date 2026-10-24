# Every Cryptographic Decision Is Temporary

Analysis · August 7, 2026

![Temporary](images/04-temporary.jpg)

**The AI-assisted break of HAWK shows that cryptographic security is a moving target — and that systems must be designed for continuous migration.**

In July 2026, a post-quantum signature candidate that had spent two years in NIST's review process was broken in about sixty hours of AI-assisted work. Two years of scrutiny by specialists, then a language model, then a key recovery.

A security level is not an intrinsic property of an algorithm. It is a price quote for the best published attack, and that quote only ever moves one way. "128-bit security" means nobody has yet shown how to do meaningfully better than 2^128 operations. It promises nothing about next year.

## Three clocks

Cryptographic strength decays through three mechanisms, each running at a different speed.

- **Incremental cryptanalysis.** Papers shave bits off the margin year after year. SHA-1 went from a theoretical attack in 2005 to a practical collision in 2017 to a cheaper chosen-prefix collision in 2020.
- **Economics.** Compute gets cheaper while the target stays fixed. DES's 56-bit key was defensible in 1977 and fell to a purpose-built machine in 1998 without the algorithm changing at all.
- **New kinds of attacker.** Shor's algorithm in 1994 was one. AI-assisted cryptanalysis looks like the next.

Measure those clocks against the lifetime of what is being protected. Medical records can carry obligations for half a century. Blockchain state is designed to last forever. Public-key primitives have historically lasted twenty to thirty years in production. When data outlives the mathematics protecting it, an adversary can simply record now and decrypt later.

> Choosing a primitive does not buy permanent security. It buys a position in a migration graph.

## What crypto agility actually means

Crypto agility is the ability to discover, replace and migrate cryptographic components at bounded cost, without re-architecting what depends on them. It comes in several forms: swapping algorithms, changing parameters, replacing implementations, and running hybrids side by side. If key length is a deployment parameter, a break that halves effective strength is a config change and a re-keying ceremony. If it is an architectural constant, it is a rewrite.

And no one migrates alone. TLS stacks negotiate with browsers you do not control; chains validate signatures from wallets shipped a decade ago. Agility includes the machinery of coordination as much as the machinery of code.

## What past migrations teach

DES to AES, MD5 and SHA-1, RSA to elliptic curves: across every case, migrations took ten to twenty-five years from credible break to disappearance from production. Meanwhile the gap between theoretical break and practical exploit keeps shrinking — two decades for DES, twelve years for SHA-1, and now a matter of days for a challenge key.

## Blockchains, the least agile systems ever built

Primitives are embedded in consensus, so changing them means a coordinated fork. There is no administrator who can rotate keys on a user's behalf. History is immutable, so every legacy output remains valid and attackable forever. Some coins will never move because their keys are lost — which turns unmigrated funds into a governance question with no comfortable answer.

## Conclusion

The quantum threat is a forcing function, not a destination. The goal was never to arrive at post-quantum cryptography and stop; today's new standard will be somebody's legacy primitive one day. The goal is to come out the other side more agile than we went in.

Every cryptographic decision is temporary. The strongest systems are the ones built to change.

---

*Teaser:* A signature scheme survived two years of expert review. Then it met an AI. What does that say about the security levels we quietly treat as permanent?
