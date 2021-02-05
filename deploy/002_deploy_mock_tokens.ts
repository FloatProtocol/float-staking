import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function deployToken(name: string, args: unknown[], context: { deploy: any, deployer: string }): Promise<void> {
  await context.deploy(name, {
    from: context.deployer,
    contract: "TokenMock",
    args: args,
    log: true,
  });
}

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy } = deployments;

  if (network.name === "mainnet") {
    return;
  }

  const { deployer } = await getNamedAccounts();

  await deployToken("DAI", [
    deployer,
    "Dai Stablecoin",
    "DAI",
    18,
  ], { deploy, deployer });

  await deployToken("USDC", [
    deployer,
    "USD Coin",
    "USDC",
    6,
  ], { deploy, deployer });

  await deployToken("USDT", [
    deployer,
    "Tether USD",
    "USDT",
    6,
  ], { deploy, deployer });
  
};

export default func;
func.tags = ["MockTokens"];