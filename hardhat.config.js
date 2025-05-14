// require("@nomicfoundation/hardhat-toolbox");

// /** @type import('hardhat/config').HardhatUserConfig */
// module.exports = {
//   solidity: "0.8.28",
// };

require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28", // You can choose a recent stable version
  networks: {
    hardhat: { // Default network for local testing
      chainId: 1337 // Standard for local development
    },
    localhost: { // Network for connecting to a separate Hardhat node
      url: "http://127.0.0.1:8545",
      chainId: 1337
    }
    // You can add other networks like Sepolia, Mainnet here
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
};
