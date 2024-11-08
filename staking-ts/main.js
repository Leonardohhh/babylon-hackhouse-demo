import "dotenv/config";
import { StakingScriptData, stakingTransaction, initBTCCurve } from "./dist/index.js";
import * as ecc from "@bitcoin-js/tiny-secp256k1-asmjs";
import { payments, opcodes, script, networks } from "bitcoinjs-lib";
import { ECPairFactory } from "ecpair";
import { covenantPks, covenantThreshold, finalityProviders, magicBytes, minUnbondingTime } from "./staking_params.js";
import { toXOnly } from 'bitcoinjs-lib/src/psbt/bip371.js';

const stakerPrivateKey = process.env.PRIVATE_KEY;
// console.log("Staker private key: ", stakerPrivateKey);

const network = networks.testnet;

async function main(validatorMpcPk, {
    stakingDuration,
    stakingAmount,
    inputUTXOs,
    feeRate,
}) {

    initBTCCurve();

    const ECPair = ECPairFactory(ecc);

    const stakerKeyPair = ECPair.fromPrivateKey(Buffer.from(stakerPrivateKey, 'hex'));

    const stakerPk = toXOnly(stakerKeyPair.publicKey);
    console.log("Staker public key: ", stakerPk.toString('hex'));

    const { address } = payments.p2tr({ internalPubkey: stakerPk, network });
    console.log("Taproot address: ", address);

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

    const frostSlashingScript = script.compile([
        validatorMpcPk,
        opcodes.OP_CHECKSIGVERIFY,
    ]);

    const { psbt, fee } = stakingTransaction(
        {
            timelockScript,
            unbondingScript,
            slashingScript,
            dataEmbedScript,
            // frostSlashingScript,
        },
        stakingAmount,
        address,
        inputUTXOs,
        network,
        feeRate,
        stakerPk,
    );

    // staker signs the transaction
    psbt.signAllInputs(stakerKeyPair)
    psbt.finalizeAllInputs();
    const stakingTx = psbt.extractTransaction();
    console.log("Transaction: ", stakingTx.toHex());
}

const validatorMpcPk = process.env.VALIDATOR_MPC_PK;
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

main(validatorMpcPk, {
    stakingDuration,
    stakingAmount,
    inputUTXOs,
    feeRate
});
