import { parseUnits } from "ethers/lib/utils";
import { ethers } from "hardhat";

import DAI_D from "../deployments/rinkeby/DAI.json";
import USDC_D from "../deployments/rinkeby/USDC.json";
import USDT_D from "../deployments/rinkeby/USDT.json";

async function main() {
  const [deployer] = await ethers.getSigners();

  // await deployer.sendTransaction({
  //   to: process.env.DEV_ACCOUNT,
  //   value: ethers.utils.parseEther("100"),
  // });

  const DAI = await ethers.getContractAt(DAI_D.abi, DAI_D.address);
  await DAI.connect(deployer).mint(deployer.address, parseUnits("50000", 18));

  const USDC = await ethers.getContractAt(USDC_D.abi, USDC_D.address);
  await USDC.connect(deployer).mint(deployer.address, parseUnits("50000", 6));

  const USDT = await ethers.getContractAt(USDT_D.abi, USDT_D.address);
  await USDT.connect(deployer).mint(deployer.address, parseUnits("50000", 6));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
