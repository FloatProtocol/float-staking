import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log("(006) Deploy standard Phase 2 Pools");
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();

  const standardPhase2Pools = {
    // Liquidity Pools
    "sLP": "0x938625591adb4e865b882377e2c965f9f9b85e34",
    // Stablecoin Pools
    "DAI": "0x6b175474e89094c44da98b954eedeac495271d0f",
    "USDC": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    "USDT": "0xdac17f958d2ee523a2206206994597c13d831ec7",
    // Community Chosen
    "wBTC": "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
    "YAM": "0x0aacfbec6a24756c20d41914f2caba817c0d8521",
    "SUSHI": "0x6b3595068778dd592e39a122f4f5a5cf09c90fe2",
    "YFI": "0x0bc529c00c6401aef6d220be8c6ea1667f6ad93e",
    // Special Pools
    // - ETH to allow native interaction
  };

  if (network.name === "rinkeby" || network.name === "ropsten") {
    let tokenName: keyof typeof standardPhase2Pools;
    for (tokenName in standardPhase2Pools) {
      try {
        const mockToken = await deployments.get(tokenName);
        standardPhase2Pools[tokenName] = mockToken.address;
      } catch (error) {
        console.error(`Couldn't find mock for ${tokenName}`);
      }
    }
  }

  const bankToken = await deployments.get("BANK");
  const timelock = await deployments.get("TimeLock");

  const adminAddr = timelock.address;
  console.log({
    adminAddr,
    multi: process.env.MULTI_SIG_ACCOUNT,
  });

  for (const [token, tokenAddress] of Object.entries(standardPhase2Pools)) {
    const args = [
      adminAddr,
      process.env.MULTI_SIG_ACCOUNT ?? adminAddr,
      bankToken.address,
      tokenAddress
    ];
    await deploy(`${token}Phase2Pool`, {
      from: deployer,
      contract: "Phase2Pool",
      args: args,
      log: true,
    });
  }

  // Deploy ETH Phase 2 Pool
  const ethArgs = [
    adminAddr,
    process.env.MULTI_SIG_ACCOUNT ?? adminAddr,
    bankToken.address
  ];
  await deploy("ETHPhase2Pool", {
    from: deployer,
    contract: "ETHPhase2Pool",
    args: ethArgs,
    log: true
  });
};

export default func;
func.tags = ["Phase2Pool"];
func.dependencies = ["TimeLock", "MockTokens", "BANK"];