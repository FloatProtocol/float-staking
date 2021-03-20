import { ethers } from "hardhat";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";

import {
  MerkleWhitelist,
} from "../../../typechain";
import { DEFAULT_ROLE, ensureOnlyExpectedMutativeFunctions, expectOnlyAddressCanInvoke, randomString, role, setupContract } from "../../helper";
import MerkleTree from "../../merkletree";
import _ from "underscore";

chai.use(solidity);
const { expect } = chai;

describe("MerkleWhitelist", () => {
  let tree: MerkleTree;
  let whitelist: MerkleWhitelist;
  let uri: string;
  
  let owner: SignerWithAddress;
  let whitelistAccount: SignerWithAddress;
  let nonWhitelistAccount: SignerWithAddress;
  let others: SignerWithAddress[];

  beforeEach(async () => {
    [owner, whitelistAccount, nonWhitelistAccount, ...others] = await ethers.getSigners();
    
    // Setup merkle tree
    // Input should be sorted, checksummed addresses without 0x...
    // These are then converted to keccak256 packed (ethers.utils.soliditykeccak256)
    const addresses = [whitelistAccount, owner, ...others].map((a) => a.address);
    tree = new MerkleTree(addresses);
    uri = "ipfs://Qmsomehashthatshouldbeuploaded";
    const root = tree.getHexRoot();

    whitelist = await setupContract<MerkleWhitelist>({
      accounts: [owner],
      name: "MerkleWhitelist",
      args: [owner.address, root, uri],
    });

    expect(whitelist.address).to.properAddress;
  });

  it("ensure only known functions are mutative", () => {
    ensureOnlyExpectedMutativeFunctions({
      contractInterface: whitelist.interface,
      expected: [
        "updateWhitelist(bytes32,string)",
        // Due to AccessControl
        "grantRole(bytes32,address)",
        "renounceRole(bytes32,address)",
        "revokeRole(bytes32,address)",
      ],
    });
  });

  describe("Constructor & Settings", async () => {
    it("should set root on constructor", async () => {
      expect(await whitelist.root()).to.equal(tree.getHexRoot());
    });

    it("should set uri on constructor", async () => {
      expect(await whitelist.uri()).to.equal(uri);
    });

    it("should set access control on constructor", async () => {
      const defaultAdminSize = await whitelist.getRoleMemberCount(DEFAULT_ROLE);
      expect(defaultAdminSize).to.equal(1);

      const whitelisterSize = await whitelist.getRoleMemberCount(role("WHITELISTER_ROLE"));
      expect(whitelisterSize).to.equal(1);

      const defaultRoleAdminAddress = await whitelist.getRoleMember(DEFAULT_ROLE, 0);
      expect(defaultRoleAdminAddress).to.equal(owner.address);
    
      const whitelisterRoleAddress = await whitelist.getRoleMember(role("WHITELISTER_ROLE"), 0);
      expect(whitelisterRoleAddress).to.equal(owner.address);
    });
  });

  describe("Function permissions", () => {
    it("only owner can call updateWhitelist", async () => {
      await expectOnlyAddressCanInvoke({
        call: (accnt) => whitelist.connect(accnt).updateWhitelist(tree.getHexRoot(), "ipfs://test"),
        accounts: others,
        allowedAccount: owner
      });
    });
  });

  describe("Updating parameters", () => {
    it("can update whitelist when owner", async () => {
      const root = `0x${randomString(64)}`;
      const hash = "ipfs://QmABCDEFGH";

      await whitelist.updateWhitelist(root, hash);
      expect(await whitelist.root()).to.equal(root);
      expect(await whitelist.uri()).to.equal(hash);
    });
  });

  describe("Generic Whitelist Proof from other accounts", () => {
    let proof: string[];

    it("whitelist address gets true", async () => {
      proof = tree.getProof(whitelistAccount.address);

      expect(await whitelist.whitelisted(whitelistAccount.address, proof)).to.be.true;
    });

    it("all whitelist addresses result in truth", async () => {
      for (const accnt of others) {
        proof = tree.getProof(accnt.address);
        expect(await whitelist.whitelisted(accnt.address, proof)).to.be.true;
      }
    });

    it("non whitelist address should be false", async () => {
      expect(await whitelist.whitelisted(nonWhitelistAccount.address, proof)).to.be.false;
    });
  });

  describe("Manual Proof", () => {
    it("whitelist address gets true with manual proof", async () => {
      const manualProof = [
        "0x2a3f35f7f3be90419011b0c76119e352430b9de52f5851ae3581918fda290be4",
        "0x3c7857477876fcf4e114a76e367b00cb1c8d6cdaf16622cc3de9dc8a1c27459e",
        "0xd1999cfdd4218a9702826ab9f0da69774eabed02e6bf4f31b0345d871c47c15c",
        "0x1914560486952799420872dde9ee3120b54c29b1da1e6930f013565feff19d29"
      ];

      await whitelist.updateWhitelist("0xbce5d4a68e74c51135ae5f4111440dd5017a642cb2582c6be24e29158f095393", "ipfs://QmZErQGQNWhxA59CjVz6tWWjQFBQHfHLu8P9uZBtUkLfx1");

      expect(await whitelist.whitelisted("0xcb557035c76d2732d5c74249dabeb9111ab50409", manualProof)).to.be.true;
    });
  });

  describe("Randomised large whitelist", () => {
    let addresses: string[];

    beforeEach(async () => {
      addresses = Array.from(Array(200).keys()).map(() => `0x${randomString(40)}`);
      tree = new MerkleTree(addresses);
      const root = tree.getHexRoot();
      await whitelist.updateWhitelist(root, "ipfs://Qm...");
    });

    it("Sample of whitelist addresses are true", async () => {
      const testedAddresses = _.sample(addresses, 10);

      for (const addr of testedAddresses) {
        const proof = tree.getProof(addr);
        expect(await whitelist.whitelisted(addr, proof)).to.be.true;
      }
    });

    it("Randomised whitelist addresses are false", async () => {
      const random = Array.from(Array(20).keys()).map(() => `0x${randomString(40)}`);
      for (const addr of random) {
        const proof = tree.randomProof();
        expect(await whitelist.whitelisted(addr, proof)).to.be.false;
      }
    });
  });
});
