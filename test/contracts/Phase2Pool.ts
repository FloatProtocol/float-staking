import { ethers } from "hardhat";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import {
  Phase2Pool,
  TokenMock,
} from "../../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { currentTime, DAY, toUnit, expectOnlyAddressCanInvoke, increaseTime, mockToken, setupContract, WEEK, ensureOnlyExpectedMutativeFunctions, fromUnit, DEFAULT_ROLE, role } from "../helper";
import { BigNumber } from "ethers";

chai.use(solidity);
const { expect } = chai;

describe("Phase2Pool", () => {
  let rewardContract: Phase2Pool;
  let rewardToken: TokenMock;
  let stakeToken: TokenMock;

  let owner: SignerWithAddress;
  let rewardDistribution: SignerWithAddress;
  let stakingAccount: SignerWithAddress;
  let others: SignerWithAddress[];

  const DURATION = WEEK;
  const OWNER_PRESUPPLY = toUnit(1e4);

  beforeEach(async () => {
    [owner, rewardDistribution, stakingAccount, ...others] = await ethers.getSigners();

    // Setup Tokens
    rewardToken = await mockToken({
      accounts: [owner],
      name: "External Reward Token",
      symbol: "RWRD",
    });
    stakeToken = await mockToken({
      accounts: [owner],
      name: "Staking Token",
      symbol: "STKN",
    });

    // Presupply owner to make tests easier.
    await rewardToken.connect(owner).mint(owner.address, OWNER_PRESUPPLY);
    await stakeToken.connect(owner).mint(owner.address, OWNER_PRESUPPLY);

    rewardContract = await setupContract<Phase2Pool>({
      accounts: [owner],
      name: "Phase2Pool",
      args: [owner.address, rewardDistribution.address, rewardToken.address, stakeToken.address],
    });

    expect(rewardContract.address).to.properAddress;
    expect(rewardToken.address).to.properAddress;
    expect(stakeToken.address).to.properAddress;
  });

  it("ensure only known functions are mutative", () => {
    ensureOnlyExpectedMutativeFunctions({
      contractInterface: rewardContract.interface,
      expected: [
        "stake(uint256)",
        "withdraw(uint256)",
        "exit()",
        "getReward()",
        "notifyRewardAmount(uint256)",
        "setRewardDistribution(address)",
        "recoverERC20(address,uint256)",
        // Due to AccessControl
        "grantRole(bytes32,address)",
        "renounceRole(bytes32,address)",
        "revokeRole(bytes32,address)",
      ],
    });
  });

  describe("Constructor & Settings", async () => {
    it("should set rewards token on constructor", async () => {
      expect(await rewardContract.rewardToken()).to.equal(rewardToken.address);
    });

    it("should staking token on constructor", async () => {
      expect(await rewardContract.stakeToken()).to.equal(stakeToken.address);
    });

    it("should set access control on constructor", async () => {
      const defaultAdminSize = await rewardContract.getRoleMemberCount(DEFAULT_ROLE);
      expect(defaultAdminSize).to.equal(1);

      const recoverSize = await rewardContract.getRoleMemberCount(role("RECOVER_ROLE"));
      expect(recoverSize).to.equal(1);

      const defaultRoleAdminAddress = await rewardContract.getRoleMember(DEFAULT_ROLE, 0);
      expect(defaultRoleAdminAddress).to.equal(owner.address);
    
      const recoverRoleAddress = await rewardContract.getRoleMember(role("RECOVER_ROLE"), 0);
      expect(recoverRoleAddress).to.equal(owner.address);
    });
  });

  describe("Function Permissions", () => {
    const rewardValue = toUnit(1.0);

    beforeEach(async () => {
      // Transfer some reward amount to the contract, so that we can call notifyRewardAmount
      await rewardToken.connect(owner).mint(rewardContract.address, rewardValue);
    });

    it("only rewardsDistribution address can call notifyRewardAmount", async () => {
      await expectOnlyAddressCanInvoke({
        call: (accnt) => rewardContract.connect(accnt).notifyRewardAmount(rewardValue),
        accounts: others,
        allowedAccount: rewardDistribution
      });
    });
  });

  describe("External Rewards Recovery", () => {
    const amount = toUnit(5000);
    let randToken: TokenMock;

    before(async () => {
      randToken = await mockToken({
        accounts: [owner],
        name: "Random Token",
        symbol: "RAND",
      });
    });

    beforeEach(async () => {
      // Send ERC20 to rewardContract Contract
      await randToken.connect(owner).mint(owner.address, amount);
      await randToken.connect(owner).transfer(rewardContract.address, amount);
      expect(await randToken.balanceOf(rewardContract.address)).to.be.equal(amount);
    });

    it("only owner can call recoverERC20", async () => {
      await expectOnlyAddressCanInvoke({
        call: (accnt) => rewardContract.connect(accnt).recoverERC20(randToken.address, amount),
        accounts: others,
        allowedAccount: owner
      });
    });

    it("should revert if recovering staking token", async () => {
      await expect(
        rewardContract
          .connect(owner)
          .recoverERC20(stakeToken.address, amount)
      ).to.be.revertedWith("Phase2Pool::recoverERC20: Cannot recover the staking token");
    });
    it("should retrieve external token from rewardContract and reduce contracts balance", async () => {
      await rewardContract.connect(owner).recoverERC20(randToken.address, amount);
      expect(await randToken.balanceOf(rewardContract.address)).to.be.equal(ethers.constants.AddressZero);
    });
    it("should retrieve external token from rewardContract and increase owners balance", async () => {
      const ownerMOARBalanceBefore = await randToken.balanceOf(owner.address);

      await rewardContract.connect(owner).recoverERC20(randToken.address, amount);

      const ownerMOARBalanceAfter = await randToken.balanceOf(owner.address);
      expect(ownerMOARBalanceAfter.sub(ownerMOARBalanceBefore)).to.be.equal(amount);
    });
    it("should emit Recovered event", async () => {
      expect(rewardContract.connect(owner).recoverERC20(randToken.address, amount)).to.emit(rewardContract, "Recovered").withArgs(randToken.address, amount);
    });
  });

  describe("lastTimeRewardApplicable()", () => {
    it("should return 0", async () => {
      expect(await rewardContract.lastTimeRewardApplicable()).to.be.equal(ethers.constants.AddressZero);
    });

    describe("when updated", () => {
      it("should equal current timestamp", async () => {
        const rewardAmount = toUnit(1);

        // Ensure the rewardContract gets enough tokens, to distribute
        await rewardToken.connect(owner).mint(rewardContract.address, rewardAmount);
        await rewardContract.connect(rewardDistribution).notifyRewardAmount(rewardAmount);

        // Check that the current time is the last time reward was applicable due to notifyRewardAmount.
        const cur = await currentTime(ethers.provider);
        const lastTimeReward = await rewardContract.lastTimeRewardApplicable();

        expect(cur.toString()).to.be.equal(lastTimeReward.toString());
      });
    });
  });

  describe("rewardPerToken()", () => {
    const totalToStake = toUnit(100);
    const totalReward = toUnit(5000);

    it("should return 0", async () => {
      expect(await rewardContract.rewardPerToken()).to.be.equal(ethers.constants.AddressZero);
    });

    it("should be > 0", async () => {
      await stakeToken.connect(owner).transfer(stakingAccount.address, totalToStake);
      await stakeToken.connect(stakingAccount).approve(rewardContract.address, totalToStake);
      await rewardContract.connect(stakingAccount).stake(totalToStake);

      const totalSupply = await rewardContract.totalSupply();
      expect(totalSupply).to.be.above(0);

      await rewardToken.connect(owner).transfer(rewardContract.address, totalReward);
      await rewardContract.connect(rewardDistribution).notifyRewardAmount(totalReward);

      await increaseTime(ethers.provider, DAY);
      const rewardPerToken = await rewardContract.rewardPerToken();
      expect(rewardPerToken).to.be.above(0);
    });
  });

  describe("stake()", () => {
    const totalToStake = toUnit(100);

    it("staking increases staking balance", async () => {
      await stakeToken.connect(owner).transfer(stakingAccount.address, totalToStake);
      await stakeToken.connect(stakingAccount).approve(rewardContract.address, totalToStake);

      const initialStakeBal = await rewardContract.balanceOf(stakingAccount.address);
      const initialUnderlyingBal = await stakeToken.balanceOf(stakingAccount.address);

      await rewardContract.connect(stakingAccount).stake(totalToStake);

      const postStakeBal = await rewardContract.balanceOf(stakingAccount.address);
      const postUnderlyingBal = await stakeToken.balanceOf(stakingAccount.address);

      expect(postUnderlyingBal).to.be.below(initialUnderlyingBal);
      expect(postStakeBal).to.be.above(initialStakeBal);
    });

    it("cannot stake 0", async () => {
      await expect(rewardContract.stake(0)).to.be.revertedWith("Cannot stake 0");
    });
  });

  describe("earned()", () => {
    const totalToStake = toUnit(100);
    const rewardValue = toUnit(5000);
    const totalToDistribute = toUnit(5000);

    it("should be 0 when not staking", async () => {
      expect(await rewardContract.earned(stakingAccount.address)).to.be.equal(ethers.constants.AddressZero);
    });

    it("should be > 0 when staking", async () => {

      await stakeToken.connect(owner).transfer(stakingAccount.address, totalToStake);
      await stakeToken.connect(stakingAccount).approve(rewardContract.address, totalToStake);
      await rewardContract.connect(stakingAccount).stake(totalToStake);

      await rewardToken.connect(owner).transfer(rewardContract.address, rewardValue);
      await rewardContract.connect(rewardDistribution).notifyRewardAmount(rewardValue);

      await increaseTime(ethers.provider, DAY);

      const earned = await rewardContract.earned(stakingAccount.address);

      expect(earned).to.be.above(ethers.constants.AddressZero);
    });

    it("rewardRate should increase if new rewards come before DURATION ends", async () => {

      await rewardToken.connect(owner).transfer(rewardContract.address, totalToDistribute);
      await rewardContract.connect(rewardDistribution).notifyRewardAmount(totalToDistribute);

      const rewardRateInitial = await rewardContract.rewardRate();

      await rewardToken.connect(owner).transfer(rewardContract.address, totalToDistribute);
      await rewardContract.connect(rewardDistribution).notifyRewardAmount(totalToDistribute);

      const rewardRateLater = await rewardContract.rewardRate();

      expect(rewardRateInitial).to.be.above(ethers.constants.AddressZero);
      expect(rewardRateLater).to.be.above(rewardRateInitial);
    });

    it("rewards token balance should rollover after DURATION", async () => {

      await stakeToken.connect(owner).transfer(stakingAccount.address, totalToStake);
      await stakeToken.connect(stakingAccount).approve(rewardContract.address, totalToStake);
      await rewardContract.connect(stakingAccount).stake(totalToStake);

      await rewardToken.connect(owner).transfer(rewardContract.address, totalToDistribute);
      await rewardContract.connect(rewardDistribution).notifyRewardAmount(totalToDistribute);

      await increaseTime(ethers.provider, DURATION);
      const earnedFirst = await rewardContract.earned(stakingAccount.address);

      await rewardToken.connect(owner).transfer(rewardContract.address, totalToDistribute);
      await rewardContract.connect(rewardDistribution).notifyRewardAmount(totalToDistribute);

      await increaseTime(ethers.provider, DURATION);
      const earnedSecond = await rewardContract.earned(stakingAccount.address);

      expect(earnedSecond).to.be.equal(earnedFirst.add(earnedFirst));
    });
  });

  describe("getReward()", () => {
    it("should increase rewards token balance", async () => {
      const totalToStake = toUnit(100);
      const totalToDistribute = toUnit(5000);

      await stakeToken.connect(owner).transfer(stakingAccount.address, totalToStake);
      await stakeToken.connect(stakingAccount).approve(rewardContract.address, totalToStake);
      await rewardContract.connect(stakingAccount).stake(totalToStake);

      await rewardToken.connect(owner).transfer(rewardContract.address, totalToDistribute);
      await rewardContract.connect(rewardDistribution).notifyRewardAmount(totalToDistribute);

      await increaseTime(ethers.provider, DAY);

      const initialRewardBal = await rewardToken.balanceOf(stakingAccount.address);
      const initialEarnedBal = await rewardContract.earned(stakingAccount.address);
      await rewardContract.connect(stakingAccount).getReward();
      const postRewardBal = await rewardToken.balanceOf(stakingAccount.address);
      const postEarnedBal = await rewardContract.earned(stakingAccount.address);

      expect(postEarnedBal).to.be.below(initialEarnedBal);
      expect(postRewardBal).to.be.above(initialRewardBal);
    });
  });

  describe("getRewardForDuration()", () => {
    it("should increase rewards token balance", async () => {
      const totalToDistribute = toUnit(5000);
      await rewardToken.connect(owner).transfer(rewardContract.address, totalToDistribute);
      await rewardContract.connect(rewardDistribution).notifyRewardAmount(totalToDistribute);

      const rewardForDuration = await rewardContract.getRewardForDuration();

      const rewardRate = await rewardContract.rewardRate();

      expect(rewardForDuration).to.be.above(ethers.constants.AddressZero);
      expect(rewardForDuration).to.be.equal(DURATION.mul(rewardRate));
    });
  });

  describe("withdraw()", () => {
    it("cannot withdraw if nothing staked", async () => {
      await expect(rewardContract.withdraw(toUnit(100))).to.be.revertedWith("SafeMath: subtraction overflow");
    });

    it("should increases underlying token balance and decreases staking balance", async () => {
      const totalToStake = toUnit(100);
      await stakeToken.connect(owner).transfer(stakingAccount.address, totalToStake);
      await stakeToken.connect(stakingAccount).approve(rewardContract.address, totalToStake);
      await rewardContract.connect(stakingAccount).stake(totalToStake);

      const initialUnderlyingBal = await stakeToken.balanceOf(stakingAccount.address);
      const initialStakeBal = await rewardContract.balanceOf(stakingAccount.address);

      await rewardContract.connect(stakingAccount).withdraw(totalToStake);

      const postUnderlyingBal = await stakeToken.balanceOf(stakingAccount.address);
      const postStakeBal = await rewardContract.balanceOf(stakingAccount.address);

      expect(postStakeBal.add(ethers.BigNumber.from(totalToStake))).to.be.equal(initialStakeBal);
      expect(initialUnderlyingBal.add(ethers.BigNumber.from(totalToStake))).to.be.equal(postUnderlyingBal);
    });

    it("cannot withdraw 0", async () => {
      await expect(rewardContract.withdraw(0)).to.be.revertedWith("Cannot withdraw 0");
    });
  });

  describe("exit()", () => {
    it("should retrieve all earned and increase rewards bal", async () => {
      const totalToStake = toUnit(100);
      const totalToDistribute = toUnit(5000);

      await stakeToken.connect(owner).transfer(stakingAccount.address, totalToStake);
      await stakeToken.connect(stakingAccount).approve(rewardContract.address, totalToStake);
      await rewardContract.connect(stakingAccount).stake(totalToStake);

      await rewardToken.connect(owner).transfer(rewardContract.address, totalToDistribute);
      await rewardContract.connect(rewardDistribution).notifyRewardAmount(toUnit(5000));

      await increaseTime(ethers.provider, DAY);

      const initialRewardBal = await rewardToken.balanceOf(stakingAccount.address);
      const initialEarnedBal = await rewardContract.earned(stakingAccount.address);
      await rewardContract.connect(stakingAccount).exit();
      const postRewardBal = await rewardToken.balanceOf(stakingAccount.address);
      const postEarnedBal = await rewardContract.earned(stakingAccount.address);

      expect(postEarnedBal).to.be.below(initialEarnedBal);
      expect(postRewardBal).to.be.above(initialRewardBal);
      expect(postEarnedBal).to.be.equal(ethers.constants.AddressZero);
    });
  });

  describe("notifyRewardAmount()", () => {
    let localPhase2Pool: Phase2Pool;

    beforeEach(async () => {
      localPhase2Pool = await setupContract<Phase2Pool>({
        accounts: [owner],
        name: "Phase2Pool",
        args: [owner.address, rewardDistribution.address, rewardToken.address, stakeToken.address],
      });

      await localPhase2Pool.connect(owner).setRewardDistribution(rewardDistribution.address);
    });

    it("Reverts if the provided reward is greater than the balance.", async () => {
      const rewardValue = toUnit(1000);
      await rewardToken.connect(owner).transfer(localPhase2Pool.address, rewardValue);
      expect(
        localPhase2Pool.connect(rewardDistribution).notifyRewardAmount(rewardValue.add(toUnit(0.1)))
      ).to.be.revertedWith(
        "hase2Pool::notifyRewardAmount: Insufficent balance for reward rate"
      );
    });

    it("Reverts if the provided reward is greater than the balance, plus rolled-over balance.", async () => {
      const rewardValue = toUnit(1000);
      await rewardToken.connect(owner).transfer(localPhase2Pool.address, rewardValue);
      localPhase2Pool.connect(rewardDistribution).notifyRewardAmount(rewardValue);
      await rewardToken.connect(owner).transfer(localPhase2Pool.address, rewardValue);
      // Now take into account any leftover quantity.
      expect(
        localPhase2Pool.connect(rewardDistribution).notifyRewardAmount(rewardValue.add(toUnit(0.1)))
      ).to.be.revertedWith("Phase2Pool::notifyRewardAmount: Insufficent balance for reward rate");
    });
  });

  describe("Integration Tests", () => {
    const totalToDistribute = toUnit(35000);
    const totalToStake = toUnit(500);

    // Note that this happens _beforeEach_ is necessary to have
    // this occur _after_ contract setup.
    beforeEach(async () => {
      // Set rewardDistribution address
      await rewardContract.connect(owner).setRewardDistribution(rewardDistribution.address);

      // Populate RewardDistribution with Rewards Tokens
      await rewardToken.connect(owner).mint(rewardDistribution.address, totalToDistribute);

      // Populate STKN Token to staking account
      await stakeToken.connect(owner).mint(stakingAccount.address, totalToStake);
    });

    it("stake and claim", async () => {
      // Stake STKN Tokens
      await stakeToken.connect(stakingAccount).approve(rewardContract.address, totalToStake);
      await rewardContract.connect(stakingAccount).stake(totalToStake);

      // Lock Rewards in contract, and notify of Reward Amount.
      await rewardToken.connect(rewardDistribution).transfer(rewardContract.address, totalToDistribute);
      await rewardContract.connect(rewardDistribution).notifyRewardAmount(totalToDistribute);

      // Period finish should be ~7 days from now
      const periodFinish = await rewardContract.periodFinish();
      const curTimestamp = await currentTime(ethers.provider);
      expect(parseInt(periodFinish.toString(), 10)).to.be.equal(BigNumber.from(curTimestamp).add(DURATION));

      // Reward duration is 7 days, so we'll
      // increaseTime time by 6 days to prevent expiration
      await increaseTime(ethers.provider, DAY.mul(6));

      // Reward rate and reward per token
      const rewardRate = await rewardContract.rewardRate();
      expect(rewardRate).to.be.above(ethers.constants.AddressZero);

      const rewardPerToken = await rewardContract.rewardPerToken();
      expect(rewardPerToken).to.be.above(ethers.constants.AddressZero);

      // Make sure we earned in proportion to reward per token
      const rewardRewardsEarned = await rewardContract.earned(stakingAccount.address);
      expect(rewardRewardsEarned).to.be.equal(rewardPerToken.mul(totalToStake).div(toUnit(1)));

      // Make sure after withdrawing, we still have the ~amount of rewardRewards
      // The two values will be a bit different as time has "passed"
      const initialWithdraw = toUnit(100);
      await rewardContract.connect(stakingAccount).withdraw(initialWithdraw);
      expect(initialWithdraw).to.be.equal(await stakeToken.balanceOf(stakingAccount.address));

      const rewardRewardsEarnedPostWithdraw = await rewardContract.earned(stakingAccount.address);

      // Expect rewards to be within 0.1 of each other.
      expect(rewardRewardsEarnedPostWithdraw.sub(rewardRewardsEarned)).to.be.below(toUnit(0.1));

      // Get rewards
      const initialRewardBal = await rewardToken.balanceOf(stakingAccount.address);
      await rewardContract.connect(stakingAccount).getReward();
      const postRewardRewardBal = await rewardToken.balanceOf(stakingAccount.address);

      expect(postRewardRewardBal).to.be.above(initialRewardBal);

      // Exit
      const preExitLPBal = await stakeToken.balanceOf(stakingAccount.address);
      await rewardContract.connect(stakingAccount).exit();
      const postExitLPBal = await stakeToken.balanceOf(stakingAccount.address);
      expect(postExitLPBal).to.be.above(preExitLPBal);
    });
  });

  describe("Scenario Testing", () => {
    const totalToDistribute = toUnit(35_000);
    const stakePerPerson = toUnit(1_000);

    beforeEach(async () => {
      // Set rewardDistribution address
      await rewardContract.connect(owner).setRewardDistribution(rewardDistribution.address);

      // Populate RewardDistribution with Rewards Tokens
      await rewardToken.connect(owner).mint(rewardDistribution.address, totalToDistribute);

      // Populate STKN Token to some accounts
      await stakeToken.connect(owner).mint(others[0].address, stakePerPerson);
      await stakeToken.connect(owner).mint(others[1].address, stakePerPerson);
      await stakeToken.connect(owner).mint(others[2].address, stakePerPerson);

      // Lock Rewards in contract, and notify of Reward Amount.
      await rewardToken.connect(rewardDistribution).transfer(rewardContract.address, totalToDistribute);
      await rewardContract.connect(rewardDistribution).notifyRewardAmount(totalToDistribute);

      // Approve
      await stakeToken.connect(others[0]).approve(rewardContract.address, stakePerPerson);
      await stakeToken.connect(others[1]).approve(rewardContract.address, stakePerPerson);
      await stakeToken.connect(others[2]).approve(rewardContract.address, stakePerPerson);
    });

    it("all submit 10k at start", async () => {
      // Stake STKN Tokens
      await rewardContract.connect(others[0]).stake(stakePerPerson);
      await rewardContract.connect(others[1]).stake(stakePerPerson);
      await rewardContract.connect(others[2]).stake(stakePerPerson);

      await increaseTime(ethers.provider, DAY.mul(7));

      // Reward rate and reward per token
      const rewardPerToken = await rewardContract.rewardPerToken();

      console.log(`
        rewardPerToken: ${fromUnit(rewardPerToken)}
      `);

      // Make sure we earned in proportion to reward per token
      const rewardsEarned0 = await rewardContract.earned(others[0].address);
      const rewardsEarned1 = await rewardContract.earned(others[1].address);
      const rewardsEarned2 = await rewardContract.earned(others[2].address);

      // Expect the amount earned to be on par as everyone contributed at the same time.

      console.log(`
        Rewards Earned [0]: ${fromUnit(rewardsEarned0)}
        Rewards Earned [1]: ${fromUnit(rewardsEarned1)}
        Rewards Earned [2]: ${fromUnit(rewardsEarned2)}
      `);

      expect(rewardsEarned0).to.be.gte(rewardsEarned1);
      expect(rewardsEarned1).to.be.gte(rewardsEarned2);

      expect(rewardsEarned0.sub(rewardsEarned2)).to.be.lt(toUnit(1));
    });


    it("submit 10k every day", async () => {
      console.log(`rewardPerToken (D0): ${fromUnit(await rewardContract.rewardPerToken())}`);
      
      // Stake STKN Tokens
      await rewardContract.connect(others[0]).stake(stakePerPerson);
      
      await increaseTime(ethers.provider, DAY);
      console.log(`rewardPerToken (D1): ${fromUnit(await rewardContract.rewardPerToken())}`);

      await rewardContract.connect(others[1]).stake(stakePerPerson);
      
      await increaseTime(ethers.provider, DAY);
      console.log(`rewardPerToken (D2): ${fromUnit(await rewardContract.rewardPerToken())}`);

      await rewardContract.connect(others[2]).stake(stakePerPerson);

      await increaseTime(ethers.provider, DAY);
      console.log(`rewardPerToken (D3): ${fromUnit(await rewardContract.rewardPerToken())}`);

      // Make sure we earned in proportion to reward per token
      const rewardsEarned0 = await rewardContract.earned(others[0].address);
      const rewardsEarned1 = await rewardContract.earned(others[1].address);
      const rewardsEarned2 = await rewardContract.earned(others[2].address);

  
      // Expect diminishing returns as we add more to the pool
      console.log(`
        Rewards Earned [0]: ${fromUnit(rewardsEarned0)}
        Rewards Earned [1]: ${fromUnit(rewardsEarned1)}
        Rewards Earned [2]: ${fromUnit(rewardsEarned2)}
      `);

      // We'd expect the first commer to gain more than double what the second commer would get
      expect(rewardsEarned0).to.be.gte(rewardsEarned1.mul(2));
      // We'd expect the 2nd commer to gain more than the 3rd 
      // commer by a factor of 2, but less than the the difference
      // between 1st and second
      expect(rewardsEarned1).to.be.gte(rewardsEarned2.mul(2));
      expect(rewardsEarned0.sub(rewardsEarned1)).to.be.gt(rewardsEarned1.sub(rewardsEarned2));
    });
  });
});