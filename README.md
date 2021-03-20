# Float Contracts

The smart contracts behind Float Protocol. [See the docs](https://docs-float.gitbook.io/docs/)

The contracts are compiled with [Hardhat](https://hardhat.org/getting-started/) and tested using [Waffle](https://hardhat.org/guides/waffle-testing.html#testing-with-ethers-js-waffle) and [TypeScript](https://hardhat.org/guides/typescript.html#typescript-support).

> :two: **If you are looking for Phase 2 Contracts**:
>
> - ERC20 [Phase2Pool](./contracts/staking/Phase2Pool.sol)
> - [ETHPhase2Pool](./contracts/staking/ETHPhase2Pool.sol)

## Usage

### Installation

```sh
yarn
```

### Build

```sh
yarn build
```

### Test

```sh
yarn test
```

### Coverage

```sh
yarn coverage
```

### Deploy to Hardhat EVM

```sh
yarn dev
yarn local:dev
```

Will deploy the contracts to `localhost:8545`.

### Production deploy

1. Generate whitelist
2. Copy whitelist to contracts repo
3. yarn \<network>:deploy
4. yarn \<network>:verify
5. Hand verify proxies and implementation on etherscan
6. yarn \<network>:run ./scripts/generate_proof.ts
7. yarn \<network>:run ./scripts/load_pools.ts - Quick starts the pools
8. yarn \<network>:run ./scripts/revoke_deployer.ts - Revoke minting abilities of deployer
9. yarn \<network>:export --export deployment.json
10. Copy merkle tree and deployment generated to frontend.

### Running Slither

[Slither](https://github.com/crytic/slither) is a Solidity static analysis framework. To run it locally:

```sh
pip3 install slither-analyzer
slither .
```

### In-Depth security testing

Use the `eth-security-toolbox` docker image.

```sh
docker pull trailofbits/eth-security-toolbox
docker run -it -v $(pwd):/share trailofbits/eth-security-toolbox
```
