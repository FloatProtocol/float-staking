import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();

  const timelockArgs = [
    process.env.MULTI_SIG_ACCOUNT,
    2 * 24 * 60 * 60,
  ];

  await deploy("TimeLock", {
    from: deployer,
    contract: "TimeLock",
    args: timelockArgs,
    log: true,
  });
};

export default func;
func.tags = ["TimeLock"];