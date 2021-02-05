import { ethers } from "hardhat";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";

import {
  TimeLock,
} from "../../typechain";
import { setupContract, WEEK } from "../helper";
// import { BigNumberish } from "ethers";

chai.use(solidity);
const { expect } = chai;

// interface QueuedTransaction {
//   target: string;
//   value: BigNumberish;
//   signature: string;
//   data: string;
//   eta: BigNumberish;
// }

// const ethers.utils.solidityPack(['uint256'], [toUnit(360)]);

// const setPendingAdmin = async (timelock: Timelock, admin: SignerWithAddress, pendingAdmin: SignerWithAddress, delay: BigNumberish): Promise<void> => {

//   const now = await currentTime(ethers.provider);
//   const tx: QueuedTransaction = {
//     target: timelock.address,
//     value: BigNumber.from(0),
//     signature: "setPendingAdmin(address)",
//     data: ethers.utils.solidityPack(["address"], [pendingAdmin.address]),
//     eta: BigNumber.from(delay).add(now),
//   };

//   await timelock.connect(admin).queueTransaction(tx.target, tx.value, tx.signature, tx.data, tx.eta);

//   await increaseTime(ethers.provider, delay);

//   await timelock.connect(admin).executeTransaction(tx.target, tx.value, tx.signature, tx.data, tx.eta);
// };

// const queuedTxHash = ({
//   target,
//   value,
//   signature,
//   data,
//   eta,
// }: QueuedTransaction) => {
//   return ethers.utils.solidityKeccak256(["address", "uint256", "string", "bytes", "uint256"], [target, value, signature, data, eta]);
// };

describe("TimeLock", () => {
  const delay = WEEK;
  
  // Accounts
  let deployer: SignerWithAddress;
  let root: SignerWithAddress;
  let notAdmin: SignerWithAddress;
  let newAdmin: SignerWithAddress;

  // Contract
  let TimeLock: TimeLock;

  beforeEach(async () => {
    [deployer, root, notAdmin, newAdmin] = await ethers.getSigners();
  

    TimeLock = await setupContract<TimeLock>({
      accounts: [deployer],
      name: "TimeLock",
      args: [root.address, delay],
    });

    expect(TimeLock.address).to.properAddress;
  });

  describe("Constructor & Settings", async () => {
    it("should set admin on constructor", async () => {
      expect(await TimeLock.admin()).to.equal(root.address);
    });

    it("should set delay on constructor", async () => {
      expect(await TimeLock.delay()).to.equal(delay);
    });
  });

  describe("setPendingAdmin()", () => {
    it("only TimeLock contract can call setPendingAdmin", async () => {
      expect(TimeLock.connect(root).setPendingAdmin(newAdmin.address)).to.be.revertedWith("TimeLock::setPendingAdmin: Call must come from TimeLock.");
    });
  });

  describe("acceptAdmin()", () => {
    it("requires msg.sender to be pendingAdmin", async () => {
      expect(TimeLock.connect(notAdmin).acceptAdmin()).to.be.revertedWith("TimeLock::acceptAdmin: Call must come from pendingAdmin.");
    });

    // TODO: Finishing copying test from https://github.com/compound-finance/compound-protocol/blob/master/tests/TimelockTest.js
    //   it('sets pendingAdmin to address 0 and changes admin', async () => {
    //     await setPendingAdmin(timelock, root, newAdmin, delay);

    //     const pendingAdminBefore = await timelock.pendingAdmin();
    //     expect(pendingAdminBefore).to.equal(newAdmin.address);

    //     const result = await timelock.connect(newAdmin).acceptAdmin();
    //     const pendingAdminAfter = await timelock.pendingAdmin();
    //     expect(pendingAdminAfter).to.equal(ethers.constants.AddressZero);

    //     const timelockAdmin = await timelock.admin();
    //     expect(timelockAdmin).to.equal(newAdmin.address);

  //     expect(result).to.emit(timelock, 'NewAdmin').withArgs(newAdmin.address);
  //   });
  });

});
