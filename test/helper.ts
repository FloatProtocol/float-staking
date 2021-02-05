import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { expect } from "chai";
import { BigNumber, BigNumberish, Contract, ContractTransaction } from "ethers";
import { ethers } from "hardhat";
import _ from "underscore";
import { TokenMock } from "../typechain";
import { utils, providers } from "ethers";
import { solidityKeccak256 } from "ethers/lib/utils";

interface SetupContractArgs {
  accounts: SignerWithAddress[];
  name: string;
  args?: unknown[];
}

export async function setupContract<T = Contract>({
  accounts,
  name,
  args = undefined,
}: SetupContractArgs): Promise<T> {
  const [deployerAccount] = accounts;
  const factory = await ethers.getContractFactory(name, deployerAccount);

  const defaultArgs: { [name: string]: unknown[] } = {
    "MockToken": ["name", "ABC"],
  };

  const constructorArgs = args || defaultArgs[name] || [];
  const _contract = await factory.deploy(...constructorArgs);
  await _contract.deployed();
  const contract = _contract as unknown as T;
  return contract;
}

interface MockTokenArgs {
  accounts: SignerWithAddress[];
  owner?: string;
  name?: string;
  symbol?: string;
  decimals?: number;
}

export async function mockToken({
  accounts,
  owner = accounts[0].address,
  name = "name",
  symbol = "ABC",
  decimals = 18,
}: MockTokenArgs): Promise<TokenMock> {
  return setupContract<TokenMock>({
    accounts,
    name: "TokenMock",
    args: [owner, name, symbol, decimals]
  });
}

export function randomString(n = 16): string {
  return _.times(n, () => (Math.random() * 0xF << 0).toString(16)).join("");
}

interface OnlyAddressCanInvokeArgs {
  call(account: SignerWithAddress): Promise<ContractTransaction>;
  accounts: SignerWithAddress[];
  allowedAccount: SignerWithAddress;
}

export async function expectOnlyAddressCanInvoke({
  call,
  accounts,
  allowedAccount,
}: OnlyAddressCanInvokeArgs): Promise<void> {

  for (const user of accounts) {
    if (user.address === allowedAccount.address) {
      continue;
    }
    await expect(call(user)).to.be.reverted;
  }
  await call(allowedAccount);
}

export async function advanceBlock(provider: providers.JsonRpcProvider): Promise<void> {
  await provider.send("evm_mine", []);
}

export async function increaseTime(provider: providers.JsonRpcProvider, duration: BigNumberish): Promise<void> {
  await provider.send("evm_increaseTime", [ethers.BigNumber.from(duration).toNumber()]);
  await advanceBlock(provider);
}

export async function currentTime(provider: providers.JsonRpcProvider): Promise<number> {
  const { timestamp } = await provider.getBlock("latest");
  return timestamp;
}

export const DAY = BigNumber.from(24 * 60 * 60);
export const WEEK = DAY.mul(7);

export const DEFAULT_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
export function role(name: string): string {
  return solidityKeccak256(["string"], [name]);
}
interface EnsureOnlyExpectedMutativeFunctionsArgs {
  contractInterface: utils.Interface;
  expected: string[];
}

export function ensureOnlyExpectedMutativeFunctions({ contractInterface, expected}: EnsureOnlyExpectedMutativeFunctionsArgs): void {
  const functionFragments = Object.entries(contractInterface.functions);
  const mutatingFunctions = functionFragments.filter(([, frag]) => !frag.constant).map((([n,]) => n)).sort();

  expect(mutatingFunctions).to.deep.equal(expected.sort());
}

export function toUnit(n: number, decimals = 18, precision = 2): BigNumber {
  return ethers.utils.parseUnits(n.toFixed(precision), decimals);
}

export function fromUnit(n: BigNumberish, decimals = 18): string {
  return ethers.utils.formatUnits(n, decimals);
}