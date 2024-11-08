# Sippar
**bring strong finalization to BTC staking for mission critical chains.**

![](logo.png)
## Currently this repo is a demo to do two things:

1. generate a multi-party key shares using FROST algorithm.

2. add a slashing path on Babylon BTC stakingScript that is controlled by the above multi-party keys.


> [!WARNING]
> This is just a demo for Hackathon . Code is not meant to be in any proudction setting. For more information please refer our submission [page](https://dorahacks.io/buidl/19063/milestones) 

### generate a multi-party key shares

```
cd frost
# generate 3/5 key shares
RUST_LOG=debug cargo run generate

==>  key shares are output in my_map.json

# verify checks
RUST_LOG=debug cargo run verify
```

### create a staking tx with the added path
```
```

## Why
Babylon creates a BTC staking platform where a pubkey owner (finalization provider) is confined from double-signing. This guarantee leads to finalization guarantee. 

However, for practical reasons, for mission-critical operations like cross-chain swap, or bridges, the fp cannot be trusted in this setup, since they can just cheat to benefit from a wrong finalisation, and then simply disappear. The btc stakers (collider or innocent delegator) can still unbond their btc. 

```
We believe there needs to be a stonger form of finalization.
```

One implementation is to add an option for some of the staker to commit their bitcoin to social slashing, a pubkey generated by consumer's PoS validators through threshold encryption. This allows these stakers to finalize for more important blocks and create skin-in-the-game for those finalization.

Threshold encryption enables the active validators to refresh their key shares. This can solve the on-going update of active validator sets. There is some risk of malicious ex-validator colliding with existing validators by [using their previous copy]((https://frost.zfnd.org/frost.html#admonition-danger)). This risk of colliding can be controlled based on an epoch based rotation regarding the generated pubkey.


## Further Research
We intend to leverage the FROST threshold signature to enable this new taproot script, the slashing has to be agreed by more than 2/3 of consumer's validators set. In the future, some attestation mechanism can be added to the new taproot path by leveraging bitVM's ZKsnark technology

