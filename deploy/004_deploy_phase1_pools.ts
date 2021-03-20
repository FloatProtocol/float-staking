import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { BigNumber } from "ethers";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log("(004) Deploy Phase 1 Pool");
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();

  let daiTokenAddr = "0x6b175474e89094c44da98b954eedeac495271d0f";
  let usdcTokenAddr = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
  let usdtTokenAddr = "0xdac17f958d2ee523a2206206994597c13d831ec7";

  if (network.name === "ropsten") {
    daiTokenAddr = "0x2D69aD895797C880abce92437788047BA0Eb7fF6";
    const usdcToken = await deployments.get("USDC");
    const usdtToken = await deployments.get("USDT");
    usdcTokenAddr = usdcToken.address;
    usdtTokenAddr = usdtToken.address;
  }

  if (network.name === "rinkeby") {
    const daiToken = await deployments.get("DAI");
    const usdcToken = await deployments.get("USDC");
    const usdtToken = await deployments.get("USDT");
    daiTokenAddr = daiToken.address;
    usdcTokenAddr = usdcToken.address;
    usdtTokenAddr = usdtToken.address;
  }

  const whitelist = await deployments.get("MerkleWhitelist");
  const bankToken = await deployments.get("BANK");
  const timelock = await deployments.get("TimeLock");

  const adminAddr = timelock.address;
  console.log({
    adminAddr,
    multi: process.env.MULTI_SIG_ACCOUNT,
  });

  // DAI POOL
  const daiArgs = [
    adminAddr,
    process.env.MULTI_SIG_ACCOUNT ?? adminAddr,
    whitelist.address,
    bankToken.address,
    daiTokenAddr,
    BigNumber.from(10).pow(18).mul(10000).toHexString(),
  ];
  await deploy("DAIPool", {
    from: deployer,
    contract: "Phase1Pool",
    args: daiArgs,
    log: true,
  });

  // USDC POOL
  const usdcArgs = [
    adminAddr,
    process.env.MULTI_SIG_ACCOUNT ?? adminAddr,
    whitelist.address,
    bankToken.address,
    usdcTokenAddr,
    BigNumber.from(10).pow(6).mul(10000).toHexString(),
  ];
  await deploy("USDCPool", {
    from: deployer,
    contract: "Phase1Pool",
    args: usdcArgs,
    log: true,
  });

  // USDT POOL
  const usdtArgs = [
    adminAddr,
    process.env.MULTI_SIG_ACCOUNT ?? adminAddr,
    whitelist.address,
    bankToken.address,
    usdtTokenAddr,
    BigNumber.from(10).pow(6).mul(10000).toHexString(),
  ];
  await deploy("USDTPool", {
    from: deployer,
    contract: "Phase1Pool",
    args: usdtArgs,
    log: true,
  });
};

export default func;
func.tags = ["Phase1Pool"];
func.dependencies = ["MerkleWhitelist", "MockTokens", "BANK", "TimeLock"];