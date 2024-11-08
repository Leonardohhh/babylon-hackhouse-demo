import "dotenv/config";
import { StakingScriptData, stakingTransaction, initBTCCurve } from "./dist/index.js";
import * as ecc from "@bitcoin-js/tiny-secp256k1-asmjs";
import { payments, opcodes, script, networks, crypto } from "bitcoinjs-lib";
// import { ECPairFactory } from "ecpair";
import * as bip39 from 'bip39';
import { BIP32Factory } from 'bip32';
import { covenantPks, covenantThreshold, finalityProviders, magicBytes, minUnbondingTime } from "./staking_params.js";
import { toXOnly } from 'bitcoinjs-lib/src/psbt/bip371.js';
// import mempoolJS from "@mempool/mempool.js";

// const stakerPrivateKey = process.env.PRIVATE_KEY;

const mnemonic = process.env.mnemonic;
// console.log("Staker private key: ", stakerPrivateKey);
const validatorMpcPk = process.env.VALIDATOR_MPC_PK;
console.log("Validator MPC public key: ", validatorMpcPk);

const network = networks.testnet;

// const { bitcoin: { transactions, addresses } } = mempoolJS({
//     hostname: 'mempool.space',
//     network: "signet"
// });

async function getKey() {
    const bip32 = BIP32Factory(ecc);
    const seed = await bip39.mnemonicToSeed(mnemonic);
    const rootKey = bip32.fromSeed(seed);
    const path = `m/86'/0'/0'/0/0`; // Path to first child of receiving wallet on first account
    const childNode = rootKey.derivePath(path);
    return childNode;
}

async function main({
    validatorMpcPk,
    stakingDuration,
    stakingAmount,
    inputUTXOs,
    feeRate,
}) {

    initBTCCurve();

    // const ECPair = ECPairFactory(ecc);
    // const stakerKeyPair = ECPair.fromPrivateKey(Buffer.from(stakerPrivateKey, 'hex'));

    const keys = await getKey(mnemonic);

    const stakerPk = toXOnly(keys.publicKey);
    // console.log("Staker public key: ", stakerPk);
    // console.log("Staker public key: ", stakerPk.toString('hex'));

    const { address } = payments.p2tr({ internalPubkey: stakerPk, network });
    console.log("staker taproot address: ", address);

    // const addressTxsUtxo = await addresses.getAddressTxsUtxo({ address });
    // const tx = await transactions.getTx({ txid });

    // const { txInputs: inputUTXOs, inputsSum } = findUTXOInput(addressTxsUtxo, 50000, scriptPubKey);

    const stakingScriptData = new StakingScriptData(
        stakerPk,
        finalityProviders,
        covenantPks,
        covenantThreshold,
        stakingDuration,
        minUnbondingTime,
        magicBytes
    );

    const {
        timelockScript,
        unbondingScript,
        slashingScript,
        unbondingTimelockScript,
        dataEmbedScript,
    } = stakingScriptData.buildScripts();

    const scripts = {
        timelockScript,
        unbondingScript,
        slashingScript,
        dataEmbedScript,
    }

    if (validatorMpcPk) {
        const frostSlashingScript = script.compile([
            validatorMpcPk,
            opcodes.OP_CHECKSIGVERIFY,
        ]);
        scripts.frostSlashingScript = frostSlashingScript;
        console.log("Found validator MPC public key: ", validatorMpcPk);
    } else {
        console.log("No validator MPC public key");
    }

    const { psbt, fee } = stakingTransaction(
        scripts,
        stakingAmount,
        address,
        inputUTXOs,
        network,
        feeRate,
        stakerPk,
    );

    // staker signs the transaction
    // psbt.signAllInputs(stakerKeyPair)
    const tweakedKeys = keys.tweak(
        crypto.taggedHash('TapTweak', stakerPk),
    );
    // unsignedStakingTx.signInput(0, tweakedKeys)
    psbt.signAllInputs(tweakedKeys);

    psbt.finalizeAllInputs();
    const stakingTx = psbt.extractTransaction();
    console.log("Transaction: ", stakingTx.toHex());
}

function findUTXOInput(
    addressTxsUtxo,
    tatalAmount,
    scriptPubKey,
) {
    let value = 0;
    const txInputs = [];
    for (let i = 0; i < addressTxsUtxo.length; i += 1) {
        const ele = addressTxsUtxo[i];
        txInputs.push({
            txid: ele.txid,
            vout: ele.vout,
            value: ele.value,
            scriptPubKey,
        });
        value += ele.value;
        if (value >= tatalAmount) {
            return {
                txInputs,
                inputsSum: value,
            };
        }
    }
    throw new Error("find utxo error");
}


const stakingDuration = 1440;
const stakingAmount = 50000;
// const stakingFee = 800;
const feeRate = 2;

// const scriptPubKey = "5120709aba52a9b93ee52b92fe141cd82e5ba61947cf75e16ee713708fb0803f2a52";

const inputUTXOs = [
    {
        txid: 'f15b0d87c92ee9ae2ab3e10ea44a59b9b36f8874f168224317b98be971233846',
        vout: 0,
        value: 10000,
        scriptPubKey: '5120709aba52a9b93ee52b92fe141cd82e5ba61947cf75e16ee713708fb0803f2a52'
    },
    {
        txid: '8e93dd623cc3600b5f5b58dc7e52a366b1347cbf598591fc59e5db64c8a55669',
        vout: 0,
        value: 12300,
        scriptPubKey: '5120709aba52a9b93ee52b92fe141cd82e5ba61947cf75e16ee713708fb0803f2a52'
    },
    {
        txid: '6b3fc3f4abee2d45ec5e1f55f6e81de028a8908a89018d04923acf455a12b7cc',
        vout: 0,
        value: 1000,
        scriptPubKey: '5120709aba52a9b93ee52b92fe141cd82e5ba61947cf75e16ee713708fb0803f2a52'
    },
    {
        txid: 'e358afaf64f0dcadc998379ab39019ca99bae70d21ed7815177da5e31ecea72a',
        vout: 1,
        value: 1220758,
        scriptPubKey: '5120709aba52a9b93ee52b92fe141cd82e5ba61947cf75e16ee713708fb0803f2a52'
    }
];

main({
    stakingDuration,
    stakingAmount,
    inputUTXOs,
    feeRate
});

main({
    validatorMpcPk,
    stakingDuration,
    stakingAmount,
    inputUTXOs,
    feeRate
});
