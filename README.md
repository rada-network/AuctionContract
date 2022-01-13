# RADA Auction Contract

Configuration .env file

```shell
PRIVATE_KEY=
RINKEBY_API_KEY=
ETHERSCAN_API_KEY=
BSC_API_KEY=
MNEMONIC=
```

The following tasks:

```shell
npx hardhat accounts
npx hardhat compile
npx hardhat clean
npx hardhat test
```

Step by step Deploy to testnet / mainnet

```shell
npx hardhat run scripts/NFTManContract/1_deploy.js --network testnet
# Copy Contract address to proxyAddresses.js
npx hardhat run scripts/RadaAuctionContract/1_deploy.js --network testnet
# Copy Contract address to proxyAddresses.js
npx hardhat run scripts/RadaFixedSwapContract/1_deploy.js --network testnet
# Copy Contract address to proxyAddresses.js

# TODO: Require setMinterFactories for NFTMan at NFT Contract

npx hardhat run scripts/RadaFixedSwapContract/setAdmin.js --network testnet
npx hardhat run scripts/RadaAuctionContract/setAdmin.js --network testnet
npx hardhat run scripts/NFTManContract/setAdmin.js --network testnet

# TOKEN - Auction
npx hardhat run scripts/RadaAuctionContract/TOKEN_2_addPool.js --network testnet
npx hardhat run scripts/RadaAuctionContract/TOKEN_3_updatePool.js --network testnet

# TOKEN - Fixed Swap
npx hardhat run scripts/RadaFixedSwapContract/TOKEN_2_addPool.js --network testnet
npx hardhat run scripts/RadaFixedSwapContract/TOKEN_3_updatePool.js --network testnet

# npx hardhat run scripts/RadaAuctionContract/4_handleEndAuction.js --network testnet

```

Step by step Deploy NFTMan to testnet / mainnet

```shell
npx hardhat run scripts/NFTManContract/1_deploy.js --network testnet
# Copy Contract address to proxyAddresses.js
# Token Box
npx hardhat run scripts/NFTManContract/TOKEN_2_addPool.js --network testnet
npx hardhat run scripts/NFTManContract/TOKEN_3_updatePool.js --network testnet

npx hardhat run scripts/NFTManContract/setAdmin.js --network testnet
npx hardhat run scripts/NFTManContract/upgradeContract_v2.js --network testnet

npx hardhat run scripts/NFTManContract/getImplementationAddress.js --network testnet
npx hardhat verify --network testnet DDDDDDDDD
```

Step by step Deploy RandomizeByRarity to polygonMumbai / polygon

```shell
npx hardhat run scripts/RandomizeByRarity/1_deploy.js --network polygonMumbai
# Copy Contract address to proxyAddresses.js
# TODO: Remember send LINK token to Contract 

npx hardhat run scripts/RandomizeByRarity/2_addPool.js --network polygonMumbai

# npx hardhat run scripts/RandomizeByRarity/updatePool.js --network polygonMumbai

npx hardhat run scripts/RandomizeByRarity/setAdmin.js --network polygonMumbai

npx hardhat verify --network polygonMumbai 0x7a789f5620408a44219e63a5b037f12a5f36196b "0x326C977E6efc84E512bB9C30f76E30c160eD06FB" "0x8C7382F9D8f56b33781fE506E897a4F1e2d17255" "0x6e75b569a01ef56d18cab6a8e71e6600d6ce853834d4a5748b720d06f878b3a4" 100000000000
```

Build & run script

```shell

npx hardhat run scripts/RadaAuctionContract/upgradeContract_v2.js --network testnet

npx hardhat run scripts/RadaAuctionContract/getImplementationAddress.js --network testnet
npx hardhat verify --network testnet ADDRESS_ABOVE


npx hardhat run scripts/RadaFixedSwapContract/getImplementationAddress.js --network testnet
npx hardhat verify --network testnet ADDRESS_ABOVE
```

Build & Deploy BSC testnet | BUSDToken

```shell

npx hardhat run scripts/BUSDToken/deploy.js --network testnet
// Copy Token address to tokenAddresses.js

// npx hardhat verify --network testnet TODO_token_address
// npx hardhat verify --network testnet --contract contracts/BUSDToken.sol:BUSDToken TODO_token_address

```

Build & Deploy BSC testnet | BoxToken

```shell

npx hardhat run scripts/BoxToken/deploy.js --network testnet
// Copy Token address to tokenAddresses.js

// Test
npx hardhat run scripts/BoxToken/sendTokentest.js --network testnet


// npx hardhat verify --network testnet TODO_token_address
// npx hardhat verify --network testnet --contract contracts/BoxToken.sol:BoxToken TODO_token_address

```

```shell
remixd -s ./ --remix-ide https://remix.ethereum.org
```
