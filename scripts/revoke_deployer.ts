import hre from "hardhat";

async function main() {
  const { ethers, upgrades, deployments } = hre;

  // const multiSig = "0x383dF49ad1f0219759a46399fE33Cb7A63cd051c";
  const timelockedMultisig = "0xdE4B9cBaD10cdFf96eE4b1f9C7568283e96C0089";
  const newProxyAdminOwner = timelockedMultisig;

  // Revoke Deployers control over the Proxy Admin
  const proxyAdmin = await upgrades.admin.getInstance();
  console.log(proxyAdmin.address);
  console.log(`${await proxyAdmin.owner()} -> ${newProxyAdminOwner}`);

  await upgrades.admin.transferProxyAdminOwnership(newProxyAdminOwner);

  // Revoke Deployers control over minting
  const Bank = await ethers.getContractFactory("BankToken");
  const bankDeployment = await deployments.get("BANK");
  const bank = Bank.attach(bankDeployment.address);

  const txn = await bank.renounceRole("0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6", "0x2B84260068A16B8d32fB8f5940FCE559511851f5");

  console.log(txn);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
