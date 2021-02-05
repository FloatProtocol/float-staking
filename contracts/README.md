# Contracts

## Phase1Pool
The Phase1Pool is a Phase2Pool with a few notable restrictions:
1. The standard `stake(uint256)` interface is disabled.
2. The new `stake(uint256,bytes32[])` interfaces supplies a proof to the `onlyWhitelisted()` contract.
3. The amount staked cannot exceed the `MAXIMUM_CONTRIBUTION` of 10000e18 tokens.

The MerkleWhitelist contract (see description below) is responsible for the `onlyWhitelisted` modifier.

## Phase2Pool
The Phase2Pool is largely based on the original Synthetix rewards contract (https://etherscan.io/address/0xDCB6A51eA3CA5d3Fd898Fd6564757c7aAeC3ca92#code) developed by @k06a which is battled tested and widely used in the industry.
Changes are minimal and mostly related to additional restrictions of valid parameters, and a ERC20 recovery function.

There will be no contract difference between Pools, only dependent on constructor parameters.

The Phase2Pool is not proxied and is therefore immutable.

The Phase2Pool is ownable, and the owner of that contract is the Timelock contract. The Timelock contract has admin function and the admin funciton is the FloatProtocol Gnosis Multisig.

The Owner has the power to:
- Change the reward distribution address (the address that can change the reward distribution rate, by supplying additional rewards to the contract)
- Extract any ERC20 tokens stored in the contract _excluding_ the staked token. This allows for token recovery if accidental transfers occur of non-staked tokens. This function is extracted directly from the new Synthetix reward contract.  

The Reward Distribution Address is also the Timelock contract. 

## MerkleWhitelist
This MerkleWhitelist is Ownable, by the Timelocked MultiSig.


## RewardDistributionRecipient

## Timelock
The Timelock contract is _entirely_ based on the Compound Timelock contract that is widely used. It delays any call by a minimum of 2 days, maximum of 44 days. It allows greater visibility in the case of FloatProtocol Multi-Sig misbehaviour.

## Whitelisted


# Ownership
- MultiSig:
  - owns TimeLock
  - acts as Reward Distributor (can set rewards)
- Timelock:
  - owns Phase1Pools
  - can recover tokens
  - can set new Reward Distributor
  - owns ProxyAdmin
- ProxyAdmin:
  - Can update BankProxy
- BankProxy:
  - Storage for BANK token
  - Can be upgrades with ProxyAdmin
- Deployer (On first deploy)
  - Can pause BANK
  - Can mint BANK
  - Can assign others to pauser / mint roles


- Deployer (After minting initial BANK for Epoch 1):
  - No rights.
- TimeLock (After minting initial BANK for Epoch 1):
  - Can pause BANK
  - Can mint BANK
  - Can assign others to pauser / mint roles.