import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import fleekStorage from "@fleekhq/fleek-storage-js";
import fs from "fs";

import MerkleTree from "../test/merkletree";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();

  // Check necessary env vars
  if (!process.env.FLEEK_API_KEY || !process.env.FLEEK_API_SECRET) {
    console.log("Could not deploy due to missing IPFS keys");
  }

  // Setup Whitelist
  const whitelistFp = fs.readFileSync("./whitelist.json", "utf-8");
  const whitelistEntries = JSON.parse(whitelistFp);
  
  console.log("Uploading whitelist...");
  const uploadedFile = await fleekStorage.upload({
    apiKey: process.env.FLEEK_API_KEY as string,
    apiSecret: process.env.FLEEK_API_SECRET as string,
    key: "whitelist",
    data: whitelistFp,
  });

  console.log("Computing tree...");
  const tree = new MerkleTree(whitelistEntries);
  console.log(`Tree Root: ${tree.getHexRoot()}`);

  const timelock = await deployments.get("TimeLock");

  const deployArgs = [
    timelock.address,
    tree.getHexRoot(),
    `ipfs://${uploadedFile.hash}`,
  ];

  await deploy("MerkleWhitelist", {
    from: deployer,
    contract: "MerkleWhitelist",
    args: deployArgs,
    log: true,
  });
};

export default func;
func.tags = ["MerkleWhitelist"];
func.dependencies = ["TimeLock"];