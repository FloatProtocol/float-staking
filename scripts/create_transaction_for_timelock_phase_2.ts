import { keccak256 } from "ethers/lib/utils";
import hre from "hardhat";
import { toUnit } from "../test/helper";
import { BankToken } from "../typechain";

async function main() {
  const { ethers, deployments } = hre;

  const timelockDeployment = await deployments.get("TimeLock");
  const bankDeployment = await deployments.get("BANK");

  const BANK = await ethers.getContractFactory("BankToken");

  const bank = BANK.attach(bankDeployment.address) as BankToken;

  const pools = {
    "sLPPhase2Pool": toUnit(3500),
    "USDTPhase2Pool": toUnit(875),
    "DAIPhase2Pool": toUnit(875),
    "USDCPhase2Pool": toUnit(875),
    "SUSHIPhase2Pool": toUnit(875),
    "wBTCPhase2Pool": toUnit(875),
    "YAMPhase2Pool": toUnit(875),
    "YFIPhase2Pool": toUnit(875),
    "ETHPhase2Pool": toUnit(875),
  };

  for (const [pool, toMint] of Object.entries(pools)) {
    const poolDeployment = await deployments.get(pool);

    const target = bankDeployment.address;
    const value = 0;
    const signature = "mint(address,uint256)";
    const data = bank.interface._encodeParams(bank.interface.getFunction("mint").inputs, [poolDeployment.address, toMint]);
    const eta = 1616356800; // Sunday, 21 March 2021 20:00:00
    const params = {
      target,
      value,
      signature,
      data,
      eta,
      dataDecoded: {
        poolAddress: poolDeployment.address,
        value: toMint.toHexString(),
      },
    };
    console.log(`=== ${pool} ===`);
    console.log(params);
    console.log(keccak256(ethers.utils.defaultAbiCoder.encode(["address", "uint256", "string", "bytes", "uint256"], [target, value, signature, data, eta])));
  }

  console.log("Send to Timelock @ ", timelockDeployment.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
