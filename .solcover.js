module.exports = {
  skipFiles: [
    // Ignore contracts from safe sources (e.g. OpenZeppelin / Compound)
    "contracts/BankToken.sol",
    "contracts/TimeLock.sol",
    "contracts/lib/UniswapV2Library.sol",
    "contracts/lib/UniswapV2OracleLibrary.sol",

    // Ignore contracts that are non essential
    "contracts/mock/TokenMock.sol",
    "contracts/auxiliary/EarnedAggregator.sol",
  ],
};
