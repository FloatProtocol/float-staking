import { parseUnits } from "ethers/lib/utils";
import hre, { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const { deployments } = hre;

  const rewardAmount = parseUnits("3500", 18);

  const bankDeployment = await deployments.get("BANK");
  const usdtPoolDeployment = await deployments.get("USDTPool");
  const usdcPoolDeployment = await deployments.get("USDCPool");
  const daiPoolDeployment = await deployments.get("DAIPool");

  const BANK = await ethers.getContractAt(bankDeployment.abi, bankDeployment.address);
  const DAIPool = await ethers.getContractAt(daiPoolDeployment.abi, daiPoolDeployment.address);
  const USDCPool = await ethers.getContractAt(usdcPoolDeployment.abi, usdcPoolDeployment.address);
  const USDTPool = await ethers.getContractAt(usdtPoolDeployment.abi, usdtPoolDeployment.address);

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
