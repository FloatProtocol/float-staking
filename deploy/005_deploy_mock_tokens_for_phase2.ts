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
  console.log("(005) Deploy additional mock tokens for Phase 2");
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy } = deployments;

  if (network.name === "mainnet") {
    return;
  }

  const { deployer } = await getNamedAccounts();

  await deployToken("sLP", [
    deployer,
    "BANK-ETH sLP",
    "SLP",
    18,
  ], { deploy, deployer });

  await deployToken("wBTC", [
    deployer,
    "Wrapped Bitcoin",
    "wBTC",
    8,
  ], { deploy, deployer });

  await deployToken("YAM", [
    deployer,
    "YAM",
    "YAM",
    18,
  ], { deploy, deployer });

  await deployToken("SUSHI", [
    deployer,
    "SushiToken",
    "SUSHI",
    18,
  ], { deploy, deployer });

  await deployToken("YFI", [
    deployer,
    "yearn.finance",
    "YFI",
    18,
  ], { deploy, deployer });

};

export default func;
func.tags = ["MockTokens"];