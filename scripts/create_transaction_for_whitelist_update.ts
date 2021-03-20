import { keccak256 } from "ethers/lib/utils";
import hre from "hardhat";
import fleekStorage from "@fleekhq/fleek-storage-js";
import fs from "fs";
import MerkleTree from "../test/merkletree";
import { MerkleWhitelist } from "../typechain";

async function main() {
  const { ethers, deployments } = hre;

  const timelockDeployment = await deployments.get("TimeLock");
  const merkleWhitelistDeployment = await deployments.get("MerkleWhitelist");
  const MerkleWhitelist = await ethers.getContractFactory("MerkleWhitelist");

  const merkleWhitelist = MerkleWhitelist.attach(merkleWhitelistDeployment.address) as MerkleWhitelist;

  // Setup Whitelist
  const whitelistFp = fs.readFileSync("./whitelist_week_3.json", "utf-8");
  const whitelistEntries = JSON.parse(whitelistFp);

  console.log("Uploading whitelist...");
  const uploadedFile = await fleekStorage.upload({
    apiKey: process.env.FLEEK_API_KEY as string,
    apiSecret: process.env.FLEEK_API_SECRET as string,
    key: "whitelist2",
    data: whitelistFp,
  });
  const uri = `ipfs://${uploadedFile.hash}`;

  console.log("Computing tree...");
  const tree = new MerkleTree(whitelistEntries);
  const root = tree.getHexRoot();
  console.log(`Tree Root: ${root}`);

  const target = merkleWhitelist.address;
  const value = 0;
  const signature = "updateWhitelist(bytes32,string)";
  const data = merkleWhitelist.interface._encodeParams(
    merkleWhitelist.interface.getFunction("updateWhitelist").inputs,
    [root, uri]
  );
  const eta = 1613937600; // Sunday, 21 Febuary 2021 20:00:00
  const params = {
    target,
    value,
    signature,
    data,
    eta,
    dataDecoded: {
      root_: root,
      uri_: uri,
    },
  };
  console.log(params);
  console.log(keccak256(ethers.utils.defaultAbiCoder.encode(["address", "uint256", "string", "bytes", "uint256"], [target, value, signature, data, eta])));

  console.log("Send to: ", timelockDeployment.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
