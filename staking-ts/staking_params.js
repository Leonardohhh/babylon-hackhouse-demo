
const finalityProvider = {
    "btc_pk": "88b32b005d5b7e29e6f82998aff023bff7b600c6a1a74ffac984b3aa0579b384",
}

// const covenant_pks = [
//     "ffeaec52a9b407b355ef6967a7ffc15fd6c3fe07de2844d61550475e7a5233e5",
//     "a5c60c2188e833d39d0fa798ab3f69aa12ed3dd2f3bad659effa252782de3c31",
//     "59d3532148a597a2d05c0395bf5f7176044b1cd312f37701a9b4d0aad70bc5a4",
//     "57349e985e742d5131e1e2b227b5170f6350ac2e2feb72254fcc25b3cee21a18",
//     "c8ccb03c379e452f10c81232b41a1ca8b63d0baf8387e57d302c987e5abb8527"
// ]
// const covenant_quorum = 6;
// const max_active_finality_providers = 80;
// const min_commission_rate = "0.050000000000000000";
// const min_slashing_tx_fee_sat = 1000;
// const min_unbonding_time = 100;
// const slashing_address = "tb1qv03wm7hxhag6awldvwacy0z42edtt6kwljrhd9";
// const slashing_rate = "0.100000000000000000";

const babylon_global_params = {
    "version": 0,
    "activation_height": 197535,
    "staking_cap": 500000000,
    "tag": "62627434",
    "covenant_pks": [
        "0249766ccd9e3cd94343e2040474a77fb37cdfd30530d05f9f1e96ae1e2102c86e",
        "0276d1ae01f8fb6bf30108731c884cddcf57ef6eef2d9d9559e130894e0e40c62c",
        "0217921cf156ccb4e73d428f996ed11b245313e37e27c978ac4d2cc21eca4672e4",
        "02113c3a32a9d320b72190a04a020a0db3976ef36972673258e9a38a364f3dc3b0",
        "0379a71ffd71c503ef2e2f91bccfc8fcda7946f4653cef0d9f3dde20795ef3b9f0",
        "023bb93dfc8b61887d771f3630e9a63e97cbafcfcc78556a474df83a31a0ef899c",
        "03d21faf78c6751a0d38e6bd8028b907ff07e9a869a43fc837d6b3f8dff6119a36",
        "0340afaf47c4ffa56de86410d8e47baa2bb6f04b604f4ea24323737ddc3fe092df",
        "03f5199efae3f28bb82476163a7e458c7ad445d9bffb0682d10d3bdb2cb41f8e8e"
    ],
    "covenant_quorum": 6,
    "unbonding_time": 1008,
    "unbonding_fee": 2000,
    "max_staking_amount": 5000000,
    "min_staking_amount": 50000,
    "max_staking_time": 64000,
    "min_staking_time": 64000,
    "confirmation_depth": 10
}

// 1. Collect the Babylon system parameters.
//    These are parameters that are shared between for all Bitcoin staking
//    transactions, and are maintained by Babylon governance.
//    They involve:
//       - `covenantPks: Buffer[]`: A list of the public keys
//          without the coordinate bytes correspondongin to the
//          covenant emulators.
//       - `covenantThreshold: number`: The amount of covenant
//          emulator signatures required for the staking to be activated.
//       - `minimumUnbondingTime: number`: The minimum unbonding period
//          allowed by the Babylon system .
//       - `magicBytes: Buffer`: The magic bytes that are appended to the data
//          embed script that is used to identify the staking transaction on BTC.
//    Below, these values are hardcoded, but they should be retrieved from the
//    Babylon system.

export const covenantPks = babylon_global_params.covenant_pks.map((pk) => Buffer.from(pk.slice(2), "hex"));
export const covenantThreshold = babylon_global_params.covenant_quorum;
export const minUnbondingTime = babylon_global_params.unbonding_time;
export const magicBytes = Buffer.from(babylon_global_params.tag, "hex") // "bbt4" tag

// 2. Define the user selected parameters of the staking contract:
//    - `stakerPk: Buffer`: The public key without the coordinate of the
//       staker.
//    - `finalityProviders: Buffer[]`: A list of public keys without the
//       coordinate corresponding to the finality providers. Currently,
//       a delegation to only a single finality provider is allowed,
//       so the list should contain only a single item.
//    - `stakingDuration: number`: The staking period in BTC blocks.
//    - `stakingAmount: number`: The amount to be staked in satoshis.
//    - `unbondingTime: number`: The unbonding time. Should be `>=` the
//      `minUnbondingTime`.

// const stakerPk = btcWallet.publicKeyNoCoord();
export const finalityProviders = [
    Buffer.from(finalityProvider.btc_pk, "hex"),
];
export const stakingAmount = babylon_global_params.min_staking_amount;
export const unbondingTime = minUnbondingTime;

// 3. Define the parameters for the staking transaction that will contain the
//    staking contract:
//    - `inputUTXOs: UTXO[]`: The list of UTXOs that will be used as an input
//       to fund the staking transaction.
//    - `stakingFee: number`: The fee of the transaction in satoshis.
//    - `changeAddress: string`: BTC wallet change address, Taproot or Native
//       Segwit.
//    - `network: network to work with, either networks.testnet
//       for BTC Testnet and BTC Signet, or networks.bitcoin for BTC Mainnet.

// Each object in the inputUTXOs array represents a single UTXO with the following properties:
// - txid: transaction ID, string
// - vout: output index, number
// - value: value of the UTXO, in satoshis, number
// - scriptPubKey: script which provides the conditions that must be fulfilled for this UTXO to be spent, string
// export const inputUTXOs = [
//     {
//         txid: "a18e9f6142c1c1266ba8089ab095440f90c668074bc532390f81aff81967a92f",
//         vout: 1,
//         value: 79000,
//         scriptPubKey: "5120490f06af9e5264ea1c8429ba90a3d1309a4b2e3d46d459e2af41f338542af722",
//     },
// ];
