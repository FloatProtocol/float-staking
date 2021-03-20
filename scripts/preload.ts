import { parseUnits } from "ethers/lib/utils";
import hre, { ethers } from "hardhat";

async function main() {
  const { deployments } = hre;
  const [deployer] = await ethers.getSigners();

  const usdtDeployment = await deployments.get("USDT");
  const usdcDeployment = await deployments.get("USDC");
  const daiDeployment = await deployments.get("DAI");

  const DAI = await ethers.getContractAt(daiDeployment.abi, daiDeployment.address);
  await DAI.connect(deployer).mint(deployer.address, parseUnits("50000", 18));

  const USDC = await ethers.getContractAt(usdcDeployment.abi, usdcDeployment.address);
  await USDC.connect(deployer).mint(deployer.address, parseUnits("50000", 6));

  const USDT = await ethers.getContractAt(usdtDeployment.abi, usdtDeployment.address);
  await USDT.connect(deployer).mint(deployer.address, parseUnits("50000", 6));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
