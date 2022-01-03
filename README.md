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
npx hardhat run scripts/RadaNftContract/1_deploy.js --network testnet
// Copy Contract address to proxyAddresses.js
npx hardhat run scripts/RadaAuctionContract/1_deploy.js --network testnet
// Copy Contract address to proxyAddresses.js
npx hardhat run scripts/RadaFixedSwapContract/1_deploy.js --network testnet
// Copy Contract address to proxyAddresses.js

# Require setMinterFactories for 2 contract RADA above

# NFT - Auction
npx hardhat run scripts/RadaAuctionContract/NFT_2_addPool.js --network testnet
npx hardhat run scripts/RadaAuctionContract/NFT_3_updatePool.js --network testnet
# TOKEN - Auction
npx hardhat run scripts/RadaAuctionContract/TOKEN_2_addPool.js --network testnet
npx hardhat run scripts/RadaAuctionContract/TOKEN_3_updatePool.js --network testnet

# NFT - Fixed Swap
npx hardhat run scripts/RadaFixedSwapContract/NFT_2_addPool.js --network testnet
npx hardhat run scripts/RadaFixedSwapContract/NFT_3_updatePool.js --network testnet
# TOKEN - Fixed Swap
npx hardhat run scripts/RadaFixedSwapContract/TOKEN_2_addPool.js --network testnet
npx hardhat run scripts/RadaFixedSwapContract/TOKEN_3_updatePool.js --network testnet

# npx hardhat run scripts/RadaAuctionContract/4_handleEndAuction.js --network testnet

```

Step by step Deploy OpenBox to testnet / mainnet

```shell
npx hardhat run scripts/OpenBoxContract/1_deploy.js --network testnet
# Copy Contract address to proxyAddresses.js
npx hardhat run scripts/OpenBoxContract/NFT_2_addPool.js --network testnet
npx hardhat run scripts/OpenBoxContract/NFT_3_updatePool.js --network testnet
npx hardhat run scripts/OpenBoxContract/setAdmin.js --network testnet

npx hardhat run scripts/OpenBoxContract/getImplementationAddress.js --network testnet
npx hardhat verify --network testnet DDDDDDDDD
```

Build & Deploy BSC testnet | RadaNftContract

```shell

npx hardhat run scripts/RadaNftContract/1_deploy.js --network testnet
// Copy Token address to proxyAddresses.js
# npx hardhat run scripts/RadaNftContract/2_setup.js --network testnet

// npx hardhat verify --network testnet --contract contracts/RadaNftContract.sol:RadaNftContract 0x6d6E82862a32A16787cC6a4b7084B05d38f22948

```

Build & run script

```shell

npx hardhat run scripts/RadaAuctionContract/upgradeContract_v2.js --network testnet

npx hardhat run scripts/RadaAuctionContract/getImplementationAddress.js --network testnet
npx hardhat verify --network testnet 0xdcEc2C5f5aF78a08c513cf4Ed139C88A3aD2eaE7
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
