// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "synthetix/contracts/interfaces/IStakingRewards.sol";

interface IStakingRewardWhitelisted is IStakingRewards {
  function stakeWithProof(uint256 amount, bytes32[] calldata proof) external;
}
