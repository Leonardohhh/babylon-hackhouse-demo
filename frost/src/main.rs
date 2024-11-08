// src/lib.rs
use bitcoin::address::Address;
use bitcoin::key::UntweakedPublicKey;
use bitcoin::network::Network;
use bitcoin::secp256k1::{PublicKey, Secp256k1};
use clap::{Parser, Subcommand};
use dotenv::dotenv;
use env_logger;
use frost_secp256k1 as frost;
use log::{debug, error, info, trace, warn};
use rand::thread_rng;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::env;
use std::fs::File;
use std::io::prelude::*;


const MAX_SIGNERS: u16 = 5;
const MIN_SIGNERS: u16 = 3;


#[derive(Parser)]
#[command(version, about, long_about = None)]
struct Cli {
    /// Optional name to operate on
    name: Option<String>,

    /// Turn debugging information on
    #[arg(short, long, action = clap::ArgAction::Count)]
    debug: u8,

    #[command(subcommand)]
    command: Option<Commands>,
}

#[derive(Subcommand)]
enum Commands {
    /// does testing things
    Test {},
    Verify {},
    Generate {},
    Load {},
}

#[derive(Serialize, Deserialize, Debug)]
struct MyMap(BTreeMap<frost::Identifier, frost::keys::KeyPackage>);

fn main() {
    // 加载 .env 文件
    dotenv().ok();
    env_logger::init();

    let cli = Cli::parse();

    // You can check the value provided by positional arguments, or option arguments
    if let Some(name) = cli.name.as_deref() {
        println!("Value for name: {name}");
    }

    // You can see how many times a particular flag or argument occurred
    // Note, only flags can have multiple occurrences
    // match cli.debug {
    //     0 => println!("Debug mode is off"),
    //     1 => println!("Debug mode is kind of on"),
    //     2 => println!("Debug mode is on"),
    //     _ => println!("Don't be crazy"),
    // }

    // You can check for the existence of subcommands, and if found use their
    // matches just as you would the top level cmd
    match &cli.command {
        Some(Commands::Test{}) => {
            let _ = generate_address();
        }
        Some(Commands::Verify{}) => {
            let _ = generate_signature();
        }
        Some(Commands::Generate{}) => {
            let _ = generate_keys();
        }
        Some(Commands::Load{}) => {
            let _my_map = load_map();
        }
        None => {}
    }

    // Continued program logic goes here...
}

fn generate_keys() -> Result<(), Box<dyn std::error::Error>> {
    // let secp = Secp256k1::verification_only();

    let mut rng = thread_rng();
    let (shares, pubkey_package) = frost::keys::generate_with_dealer(
        MAX_SIGNERS,
        MIN_SIGNERS,
        frost::keys::IdentifierList::Default,
        &mut rng,
    )?;
        
    let pubkey_buffer = pubkey_package.verifying_key().serialize()?;
    let pubkey = bitcoin::secp256k1::PublicKey::from_slice(&pubkey_buffer)?;
    let internal_key = UntweakedPublicKey::from(pubkey);
    let taproot_address = Address::p2tr(&bitcoin::secp256k1::Secp256k1::new(), internal_key, None, Network::Bitcoin);
    info!("Pubkey : {}", internal_key);
    info!("Taproot address: {}", taproot_address);

    // Verifies the secret shares from the dealer and store them in a BTreeMap.
    // In practice, the KeyPackages must be sent to its respective participants
    // through a confidential and authenticated channel.
    let mut key_packages: BTreeMap<_, _> = BTreeMap::new();

    for (identifier, secret_share) in shares {
        let key_package = frost::keys::KeyPackage::try_from(secret_share)?;
        key_packages.insert(identifier, key_package);
    }
    // info!("Key packages: {:?}", key_packages);

    // frost::keys::reconstruct()

    // 序列化 BTreeMap 为 JSON
    let my_map_json = serde_json::to_string(&key_packages)?;

    // 将 JSON 保存到文件
    let mut file = File::create("my_map.json")?;
    file.write_all(my_map_json.as_bytes())?;
    Ok(())
}

fn load_map(
) -> Result<BTreeMap<frost::Identifier, frost::keys::KeyPackage>, Box<dyn std::error::Error>> {
    // 从文件中读取 JSON 字符串
    let mut file = File::open("my_map.json")?;
    let mut contents = String::new();
    file.read_to_string(&mut contents)?;

    // 反序列化 JSON 字符串为 BTreeMap
    let my_map: BTreeMap<_, _> = serde_json::from_str(&contents)?;
    Ok(my_map)
}

fn private_key_to_signing_key(
    private_key_str: &str,
) -> Result<frost::SigningKey, Box<dyn std::error::Error>> {
    // 这里需要根据 frost-secp256k1 的 API 来转换私钥字符串为 SigningKey
    // 以下代码是一个示例，具体实现可能需要根据库的文档进行调整

    // 假设私钥是十六进制字符串，需要将其转换为字节序列
    let private_key_bytes = hex::decode(private_key_str)?;

    // 然后使用 frost-secp256k1 的函数来从字节序列创建 SigningKey
    // 这里需要查阅 frost-secp256k1 的文档来找到正确的方法
    let signing_key = frost::SigningKey::deserialize(&private_key_bytes)?;

    Ok(signing_key)
}

fn get_keys() -> Result<
    (
        BTreeMap<frost::Identifier, frost::keys::KeyPackage>,
        frost::keys::PublicKeyPackage,
        rand::rngs::ThreadRng,
    ),
    Box<dyn std::error::Error>,
> {
    // let mut key_packages = load_map().ok().unwrap();
    // info!("Key packages: {:?}", key_packages);
    let mut rng = thread_rng();

    // 获取私钥字符串
    let private_key_str = env::var("PRIVATE_KEY")?;
    // println!("Private key: {}", private_key_str);

    // 将私钥字符串转换为 SigningKey
    let signing_key = private_key_to_signing_key(&private_key_str)?;

    let (shares, pubkey_package) = frost::keys::split(
        &signing_key,
        MAX_SIGNERS,
        MIN_SIGNERS,
        frost::keys::IdentifierList::Default,
        &mut rng,
    )?;

    let mut key_packages: BTreeMap<_, _> = BTreeMap::new();

    for (identifier, secret_share) in shares {
        let key_package = frost::keys::KeyPackage::try_from(secret_share)?;
        key_packages.insert(identifier, key_package);
    }

    Ok((key_packages, pubkey_package, rng))
}

fn generate_address() -> Result<(), Box<dyn std::error::Error>> {
    let (_key_packages, pubkey_package, _rng) = get_keys()?;

    let pubkey_buffer = pubkey_package.verifying_key().serialize()?;

    let pubkey = bitcoin::secp256k1::PublicKey::from_slice(&pubkey_buffer)?;

    let internal_key = UntweakedPublicKey::from(pubkey);

    let taproot_address = Address::p2tr(&bitcoin::secp256k1::Secp256k1::new(), internal_key, None, Network::Bitcoin);

    info!("Taproot address: {}", taproot_address);

    Ok(())
}

fn generate_signature() -> Result<(), Box<dyn std::error::Error>> {
    let (key_packages, pubkey_package, mut rng) = get_keys()?;

    // info!("pubkey_package: {:?}", pubkey_package);

    // let pubkey_buffer = pubkey_package.verifying_key().serialize()?;
    // let pubkey = bitcoin::secp256k1::PublicKey::from_slice(&pubkey_buffer)?;
    // let internal_key = UntweakedPublicKey::from(pubkey);
    // let taproot_address = Address::p2tr(&bitcoin::secp256k1::Secp256k1::new(), internal_key, None, Network::Bitcoin);
    // info!("Taproot address: {}", taproot_address);

    let mut nonces_map = BTreeMap::new();
    let mut commitments_map = BTreeMap::new();

    ////////////////////////////////////////////////////////////////////////////
    // Round 1: generating nonces and signing commitments for each participant
    ////////////////////////////////////////////////////////////////////////////

    // In practice, each iteration of this loop will be executed by its respective participant.
    for participant_index in 1..=MIN_SIGNERS {
        let participant_identifier = participant_index.try_into().expect("should be nonzero");
        let key_package = &key_packages[&participant_identifier];
        // Generate one (1) nonce and one SigningCommitments instance for each
        // participant, up to _threshold_.
        let (nonces, commitments) = frost::round1::commit(key_package.signing_share(), &mut rng);
        // In practice, the nonces must be kept by the participant to use in the
        // next round, while the commitment must be sent to the coordinator
        // (or to every other participant if there is no coordinator) using
        // an authenticated channel.
        nonces_map.insert(participant_identifier, nonces);
        commitments_map.insert(participant_identifier, commitments);
    }

    // This is what the signature aggregator / coordinator needs to do:
    // - decide what message to sign
    // - take one (unused) commitment per signing participant
    let mut signature_shares = BTreeMap::new();
    let message: &[u8] = "0x68c158664c20d9d7df31a747782bcc9d36d1f595c36184ee0fc62627e2a72fc0".as_bytes();
    let signing_package = frost::SigningPackage::new(commitments_map, message);

    ////////////////////////////////////////////////////////////////////////////
    // Round 2: each participant generates their signature share
    ////////////////////////////////////////////////////////////////////////////

    // In practice, each iteration of this loop will be executed by its respective participant.
    for participant_identifier in nonces_map.keys() {
        let key_package = &key_packages[participant_identifier];

        let nonces = &nonces_map[participant_identifier];

        // Each participant generates their signature share.
        let signature_share = frost::round2::sign(&signing_package, nonces, key_package)?;

        // In practice, the signature share must be sent to the Coordinator
        // using an authenticated channel.
        signature_shares.insert(*participant_identifier, signature_share);
    }

    ////////////////////////////////////////////////////////////////////////////
    // Aggregation: collects the signing shares from all participants,
    // generates the final signature.
    ////////////////////////////////////////////////////////////////////////////

    // Aggregate (also verifies the signature shares)
    let group_signature = frost::aggregate(&signing_package, &signature_shares, &pubkey_package)?;
    info!("Group signature: {:?}", hex::encode(group_signature.serialize()?));

    // Check that the threshold signature can be verified by the group public
    // key (the verification key).
    let is_signature_valid = pubkey_package
        .verifying_key()
        .verify(message, &group_signature)
        .is_ok();
    info!("Signature valid: {}", is_signature_valid);
    assert!(is_signature_valid);

    Ok(())
}
