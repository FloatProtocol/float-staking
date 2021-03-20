import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log("(101) Auxilliary - Earned Aggregator");
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();

  const daiPool = await deployments.get("DAIPool");
  const usdcPool = await deployments.get("USDCPool");
  const usdtPool = await deployments.get("USDTPool");
  const timelock = await deployments.get("TimeLock");

  await deploy("EarnedAggregator", {
    from: deployer,
    contract: "EarnedAggregator",
    args: [
      timelock.address,
      [daiPool.address, usdcPool.address, usdtPool.address],
    ],
    log: true,
  });

};

export default func;
func.tags = ["Auxilliary", "EarnedAggregator"];
// func.dependencies = ["Phase1Pool"];