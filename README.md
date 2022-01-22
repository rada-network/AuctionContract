# RADA Auction Contract

Configuration .env file

```shell
PRIVATE_KEY=
RINKEBY_API_KEY=
ETHERSCAN_API_KEY=
BSC_API_KEY=
MNEMONIC=
```

## Scripts

Use for deploy and update

## Valid check Pool polygonMumbai / mainnet

```shell
npx hardhat run scripts/CheckValidPool/TOKEN_FixedSwap.js --network polygonMumbai
npx hardhat run scripts/CheckValidPool/TOKEN_Auction.js --network polygonMumbai
npx hardhat run scripts/CheckValidPool/NFT_Auction.js --network polygonMumbai
npx hardhat run scripts/CheckValidPool/NFT_FixedSwap.js --network polygonMumbai

```

## Step by step Deploy Whitelist Contract to polygonMumbai / mainnet

```shell
npx hardhat run scripts/WhitelistContract/1_deploy.js --network polygonMumbai
npx hardhat run scripts/WhitelistContract/2_addList.js --network polygonMumbai
npx hardhat run scripts/WhitelistContract/3_updateList.js --network polygonMumbai
# npx hardhat run scripts/WhitelistContract/upgradeContract_v2.js --network polygonMumbai

# npx hardhat run scripts/WhitelistContract/getImplementationAddress.js --network polygonMumbai
# npx hardhat verify --network polygonMumbai DDDDDDDDD
```

## Step by step Deploy NFT SALE to polygonMumbai / mainnet

```shell
npx hardhat run scripts/NFTAuctionContract/1_deploy.js --network polygonMumbai
# Copy Contract address to proxyAddresses.js
npx hardhat run scripts/NFTFixedSwapContract/1_deploy.js --network polygonMumbai
# Copy Contract address to proxyAddresses.js

npx hardhat run scripts/NFTFixedSwapContract/setAdmin.js --network polygonMumbai
npx hardhat run scripts/NFTAuctionContract/setAdmin.js --network polygonMumbai

# REMEMBER: owner need update WITHDRAW_ADDRESS at 2 contracts

# Auction, Got NFT first and update range tokenId
npx hardhat run scripts/NFTAuctionContract/2_addOrUpdatePool.js --network polygonMumbai
npx hardhat run scripts/NFTAuctionContract/3_updateSalePool.js --network polygonMumbai

# Fixed Swap, Got NFT first and update range tokenId
npx hardhat run scripts/NFTFixedSwapContract/2_addOrUpdatePool.js --network polygonMumbai
npx hardhat run scripts/NFTFixedSwapContract/3_updateSalePool.js --network polygonMumbai

# npx hardhat run scripts/NFTAuctionContract/getImplementationAddress.js --network polygonMumbai
# npx hardhat run scripts/NFTFixedSwapContract/getImplementationAddress.js --network polygonMumbai
# npx hardhat verify --network polygonMumbai DDDDDDDDD

```

## Step by step Deploy Token SALE to polygonMumbai / mainnet

```shell
npx hardhat run scripts/NFTManContract/1_deploy.js --network polygonMumbai
# Copy Contract address to proxyAddresses.js
npx hardhat run scripts/RadaAuctionContract/1_deploy.js --network polygonMumbai
# Copy Contract address to proxyAddresses.js
npx hardhat run scripts/RadaFixedSwapContract/1_deploy.js --network polygonMumbai
# Copy Contract address to proxyAddresses.js

# TODO: Require setMinterFactories for NFTMan at NFT Contract
# REMEMBER: owner need update WITHDRAW_ADDRESS at 2 contracts, default is deployer

npx hardhat run scripts/RadaFixedSwapContract/setAdmin.js --network polygonMumbai
npx hardhat run scripts/RadaAuctionContract/setAdmin.js --network polygonMumbai
npx hardhat run scripts/NFTManContract/setAdmin.js --network polygonMumbai

# TOKEN - Auction
npx hardhat run scripts/RadaAuctionContract/TOKEN_2_addOrUpdatePool.js --network polygonMumbai

# TOKEN - Fixed Swap
npx hardhat run scripts/RadaFixedSwapContract/TOKEN_2_addOrUpdatePool.js --network polygonMumbai

# npx hardhat run scripts/RadaAuctionContract/4_handleEndAuction.js --network polygonMumbai

# npx hardhat run scripts/RadaFixedSwapContract/getImplementationAddress.js --network polygonMumbai
# npx hardhat run scripts/RadaAuctionContract/getImplementationAddress.js --network polygonMumbai
# npx hardhat verify --network polygonMumbai ADDRESS_IMPLEMENT
```

## NFTMan to polygonMumbai / mainnet

```shell
npx hardhat run scripts/NFTManContract/1_deploy.js --network polygonMumbai
# Copy Contract address to proxyAddresses.js
# Token Box
npx hardhat run scripts/NFTManContract/TOKEN_2_addOrUpdatePool.js --network polygonMumbai

npx hardhat run scripts/NFTManContract/setAdmin.js --network polygonMumbai
npx hardhat run scripts/NFTManContract/upgradeContract_v2.js --network polygonMumbai

npx hardhat run scripts/NFTManContract/getImplementationAddress.js --network polygonMumbai
npx hardhat verify --network polygonMumbai DDDDDDDDD
```

## RandomizeByRarity to polygonMumbai / polygon

```shell
npx hardhat run scripts/RandomizeByRarity/1_deploy.js --network polygonMumbai
# Copy Contract address to proxyAddresses.js
# TODO: Remember send LINK+MATIC token to Contract

npx hardhat run scripts/RandomizeByRarity/2_addPool.js --network polygonMumbai

# npx hardhat run scripts/RandomizeByRarity/updatePool.js --network polygonMumbai

npx hardhat run scripts/RandomizeByRarity/setAdmin.js --network polygonMumbai

# npx hardhat verify --network polygonMumbai 0x72Cd36e466918A5f4961d1a7eE6642E9be7Ef9fb "0x326C977E6efc84E512bB9C30f76E30c160eD06FB" "0x8C7382F9D8f56b33781fE506E897a4F1e2d17255" "0x6e75b569a01ef56d18cab6a8e71e6600d6ce853834d4a5748b720d06f878b3a4" "100000000000"
```

## Build & Deploy BSC polygonMumbai | BUSDToken

```shell

npx hardhat run scripts/BUSDToken/deploy.js --network polygonMumbai
# Copy Token address to tokenAddresses.js

# npx hardhat verify --network polygonMumbai --contract contracts/BUSDToken.sol:BUSDToken TODO_token_address

```

## Build & Deploy BSC polygonMumbai | BoxToken

```shell

npx hardhat run scripts/BoxToken/deploy.js --network polygonMumbai
# Copy Token address to tokenAddresses.js

# Test
npx hardhat run scripts/BoxToken/sendTokentest.js --network polygonMumbai


# npx hardhat verify --network polygonMumbai --contract contracts/BoxToken.sol:BoxToken TODO_token_address

```

```shell
remixd -s ./ --remix-ide https://remix.ethereum.org

grep \"bytecode\" artifacts/contracts/NFTAuctionContract.sol/* | awk '{print $1 " " length($3)/2}'
```
