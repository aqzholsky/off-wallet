# Test fixture provenance

All fixtures in this directory come from sources that share no code with `@off-wallet/crypto`.
They exist so that a systematically wrong implementation cannot validate itself.

## Public test mnemonics — never fund these addresses

| Set | Words | Passphrase | Mnemonic |
|---|---|---|---|
| A | 12 | (empty) | `abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about` |
| B | 24 | `TREZOR` | `legal winner thank year wave sausage worth useful legal winner thank year wave sausage worth useful legal winner thank year wave sausage worth title` |

Both phrases are published BIP-39 reference vectors. Every address and key derived from them
is public knowledge. **Funds sent to any of them are lost.**

## Files

| File | Source | Pin |
|---|---|---|
| `oracle-addresses.json` | Python `bip_utils` 2.9.3 on CPython 3.11.10 (an independent implementation; not an npm package, never imported by this repo) | generated 2026-09-20; set A at (account,index) = (0,0) and (2,3), set B at (1,5); 48 records |
| `trezor-bip39-vectors.json` | `trezor/python-mnemonic` `vectors.json` | commit `b57a5ad77a981e743f4167ab2f7927a55c1e82a8`, sha256 `fa3b937b7cff9c9b8ecd3aa011faeb8d6dd67993174b72326e83f4de8fdb30f8`; passphrase `TREZOR`; each entry `[entropyHex, mnemonic, seedHex, xprv]` |
| `bip32-vectors.json` | BIP-32 test vectors 1–4, `bitcoin/bips` `bip-0032.mediawiki` | extracted 2026-09-20 |
| `slip10-ed25519-vectors.json` | SLIP-0010 ed25519 test vectors 1–2, `satoshilabs/slips` `slip-0010.md` | extracted 2026-09-20 |
| `bip86-vectors.json` | BIP-86 test vectors, `bitcoin/bips` `bip-0086.mediawiki` | extracted 2026-09-20 |
| `bech32-vectors.json` | BIP-173 and BIP-350 test strings and segwit addresses, `bitcoin/bips` | extracted 2026-09-20; strings containing non-ASCII bytes are omitted |
| `eip55-vectors.json` | ERC-55 test cases, `ethereum/ERCs` `ERCS/erc-55.md` | extracted 2026-09-20 |
| `address-patterns.json` | `b2binpay_common` 26.1.0 (commit `0521572`) Cerberus validator regexes, mainnet only | copied 2026-09-20; the three Cosmos-family bech32 patterns were written here, marked `derived` |

## How `oracle-addresses.json` was produced

Outside this repository, in a throwaway virtual environment:

- `bip_utils.Bip39SeedGenerator(mnemonic).Generate(passphrase)` for the seed.
- secp256k1 profiles: `Bip32Slip10Secp256k1.FromSeed(seed).DerivePath(path)`, then
  `P2PKHAddrEncoder` (net_ver `0x00`), `P2WPKHAddrEncoder` (hrp `bc`), `P2TRAddrEncoder` (hrp `bc`),
  `EthAddrEncoder`, `TrxAddrEncoder`, `AtomAddrEncoder` (hrp `cosmos` / `osmo` / `thor`).
- ed25519 profiles: `Bip32Slip10Ed25519.FromSeed(seed).DerivePath(path)`, then `SolAddrEncoder`.
- `publicKey` is `RawCompressed().ToHex()` (the leading `00` that bip_utils prepends to ed25519 keys is stripped).
- `privateKey` is `Raw().ToHex()`.
- Cross-check: the high-level `Bip44`/`Bip84`/`Bip86` APIs with `Bip44Coins.BITCOIN`, `ETHEREUM`,
  `TRON`, `COSMOS`, `OSMOSIS`, `SOLANA` produced identical addresses for set A (0,0).
- Taproot set A (0,0) equals the first BIP-86 reference address, an independent confirmation.

## Bundled wordlists (`packages/crypto/src/wordlists/*.json`)

From `bitcoin/bips` `bip-0039/<language>.txt` at commit `befa252b515d4104157bc57d3797050da51627fc`,
converted to a JSON array of 2048 strings with no other transformation. Source-file sha256:

| Language | sha256 of the upstream `.txt` |
|---|---|
| english | `2f5eed53a4727b4bf8880d8f3f199efc90e58503646d9ff8eff3a2ed3b24dbda` |
| japanese | `2eed0aef492291e061633d7ad8117f1a2b03eb80a29d0e4e3117ac2528d05ffd` |
| korean | `9e95f86c167de88f450f0aaf89e87f6624a57f973c67b516e338e8e8b8897f60` |
| spanish | `46846a5a0139d1e3cb77293e521c2865f7bcdb82c44e8d0a06a2cd0ecba48c0b` |
| chinese_simplified | `5c5942792bd8340cb8b27cd592f1015edf56a8c5b26276ee18a482428e7c5726` |
| chinese_traditional | `417b26b3d8500a4ae3d59717d7011952db6fc2fb84b807f3f94ac734e89c1b5f` |
| french | `ebc3959ab7801a1df6bac4fa7d970652f1df76b683cd2f4003c941c63d517e59` |
| italian | `d392c49fdb700a24cd1fceb237c1f65dcc128f6b34a8aacb58b59384b5c648c2` |
| czech | `7e80e161c3e93d9554c2efb78d4e3cebf8fc727e9c52e03b83b94406bdcc95fc` |
| portuguese | `2685e9c194c82ae67e10ba59d9ea5345a23dc093e92276fc5361f6667d79cd3f` |

Commit `ce1862ac6bcffa1dd20aad858380e51e66e949ea` contains only `english.txt`; the other nine
files were added to `bip-0039/` later. Commit `befa252b515d4104157bc57d3797050da51627fc` is the
latest commit touching that directory and serves all ten files with exactly the sha256 values
above, so the content pin is unchanged.

Every word in all ten lists is already NFKD-normalised upstream, so the JSON files are used as-is.
