import { parseUnits } from "ethers/lib/utils";
import { ethers } from "hardhat";

import BANK_D from "../deployments/mainnet/BANK.json";

import DAIPool_D from "../deployments/mainnet/DAIPool.json";
import USDCPool_D from "../deployments/mainnet/USDCPool.json";
import USDTPool_D from "../deployments/mainnet/USDTPool.json";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  const rewardAmount = parseUnits("3500", 18);
  // const rewardAmount = parseUnits("3500", 22);

  const BANK = await ethers.getContractAt(BANK_D.abi, BANK_D.address);
  const DAIPool = await ethers.getContractAt(DAIPool_D.abi, DAIPool_D.address);
  const USDCPool = await ethers.getContractAt(USDCPool_D.abi, USDCPool_D.address);
  const USDTPool = await ethers.getContractAt(USDTPool_D.abi, USDTPool_D.address);

  // Mint to Pools
  console.log("Minting to pools...");
  await BANK.connect(deployer).mint(DAIPool.address, rewardAmount);
  await BANK.connect(deployer).mint(USDCPool.address, rewardAmount);
  await BANK.connect(deployer).mint(USDTPool.address, rewardAmount);

  // // Notify Reward Amount
  // console.log("Notify Reward Amount...");
  // await DAIPool.connect(rewardDistribution).notifyRewardAmount(rewardAmount);
  // await USDCPool.connect(rewardDistribution).notifyRewardAmount(rewardAmount);
  // await USDTPool.connect(rewardDistribution).notifyRewardAmount(rewardAmount);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
