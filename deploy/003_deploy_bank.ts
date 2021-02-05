import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { BankToken } from "../typechain/BankToken";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, ethers, upgrades, artifacts, getNamedAccounts } = hre;
  const { save } = deployments;

  const { deployer } = await getNamedAccounts();

  console.log("Getting TimeLock...");
  const timelock = await deployments.get("TimeLock");

  console.log("Deploying BankToken Proxy...");
  const Bank = await ethers.getContractFactory("BankToken");
  const args = [timelock.address, deployer];
  const bank = await upgrades.deployProxy(Bank, args) as BankToken;

  const srcName = "contracts/BankToken.sol:BankToken";
  const artifact = await artifacts.readArtifact(srcName);

  const values = {
    address: bank.address,
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    deployedBytecode: artifact.deployedBytecode,
    args,
    transactionHash: bank.deployTransaction.hash,
  };

  await save("BANK", values);

  console.log(`> Verify proxy @ https://etherscan.io/proxyContractChecker?a=${bank.address}`);
};

export default func;
func.tags = ["BANK"];
func.dependencies = ["TimeLock"];