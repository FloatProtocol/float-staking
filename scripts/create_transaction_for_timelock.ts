import { keccak256 } from "ethers/lib/utils";
import hre from "hardhat";
import { toUnit } from "../test/helper";
import { BankToken } from "../typechain";

async function main() {
  const { ethers, deployments } = hre;

  const timelockDeployment = await deployments.get("TimeLock");
  const bankDeployment = await deployments.get("BANK");
  const usdtDeployment = await deployments.get("USDTPool");
  const usdcDeployment = await deployments.get("USDCPool");
  const daiDeployment = await deployments.get("DAIPool");

  const BANK = await ethers.getContractFactory("BankToken");

  const bank = BANK.attach(bankDeployment.address) as BankToken;

  [
    usdtDeployment.address,
    usdcDeployment.address,
    daiDeployment.address,
  ].forEach((poolAddr) => {
    const target = bankDeployment.address;
    const value = 0;
    const signature = "mint(address,uint256)";
    const toMint = toUnit(3500);
    const data = bank.interface._encodeParams(bank.interface.getFunction("mint").inputs, [poolAddr, toMint]);
    // const eta_for_week_2 = 1613332800; // Sunday, 14 February 2021 20:00:00
    // const eta_for_week_3 = 1613937600; // Sunday, 21 Febuary 2021 20:00:00
    // const eta_for_week_4 = 1614542400; // Sunday, 28 February 2021 20:00:00
    const eta = 1615147200; // Sunday, 7 March 2021 20:00:00
    const params = {
      target,
      value,
      signature,
      data,
      eta,
      dataDecoded: {
        poolAddr,
        value: toMint.toHexString(),
      },
    };
    console.log(params);
    console.log(keccak256(ethers.utils.defaultAbiCoder.encode(["address", "uint256", "string", "bytes", "uint256"], [target, value, signature, data, eta])));
  });

  console.log("Send to: ", timelockDeployment.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
