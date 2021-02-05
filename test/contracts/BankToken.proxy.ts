import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { ethers, upgrades } from "hardhat";

import { BankToken } from "../../typechain";
import { DEFAULT_ROLE, role } from "../helper";

chai.use(solidity);
const { expect } = chai;

describe("BankToken (proxy)", () => {
  let BankToken;
  let bankToken: BankToken;

  let owner: SignerWithAddress;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();

    BankToken = await ethers.getContractFactory("BankToken");
    // Here we let owner be both quick start minter and default owner.
    bankToken = await upgrades.deployProxy(BankToken, [owner.address, owner.address]) as BankToken;
    await bankToken.deployed();
  });

  describe("Constructor & Settings", async () => {
    it("should set decimals on constructor", async () => {
      expect(await bankToken.decimals()).to.equal(18);
    });

    it("should set decimals on constructor", async () => {
      expect(await bankToken.name()).to.equal("Float Bank");
    });

    it("should set symbol on constructor", async () => {
      expect(await bankToken.symbol()).to.equal("BANK");
    });


    it("should set access control on constructor", async () => {
      const defaultAdminSize = await bankToken.getRoleMemberCount(DEFAULT_ROLE);
      expect(defaultAdminSize).to.equal(1);

      const minterSize = await bankToken.getRoleMemberCount(role("MINTER_ROLE"));
      expect(minterSize).to.equal(1);

      const pauserSize = await bankToken.getRoleMemberCount(role("PAUSER_ROLE"));
      expect(pauserSize).to.equal(1);

      const defaultRoleAdminAddress = await bankToken.getRoleMember(DEFAULT_ROLE, 0);
      expect(defaultRoleAdminAddress).to.equal(owner.address);
    
      const minterRoleAddress = await bankToken.getRoleMember(role("MINTER_ROLE"), 0);
      expect(minterRoleAddress).to.equal(owner.address);
      
      const pauserRoleAddress = await bankToken.getRoleMember(role("PAUSER_ROLE"), 0);
      expect(pauserRoleAddress).to.equal(owner.address);
    });

  });

});