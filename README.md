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

## Valid check Pool testnet / mainnet

```shell
npx hardhat run scripts/CheckValidPool/TOKEN_FixedSwap.js --network testnet
npx hardhat run scripts/CheckValidPool/TOKEN_Auction.js --network testnet
npx hardhat run scripts/CheckValidPool/NFT_Auction.js --network testnet
npx hardhat run scripts/CheckValidPool/NFT_FixedSwap.js --network testnet

```

## Deploy Whitelist Contract to testnet / mainnet

```shell
npx hardhat run scripts/WhitelistContract/1_deploy.js --network testnet
npx hardhat run scripts/WhitelistContract/2_addList.js --network testnet
npx hardhat run scripts/WhitelistContract/3_updateList.js --network testnet

npx hardhat run scripts/WhitelistContract/setAdmin.js --network testnet
# npx hardhat run scripts/WhitelistContract/upgradeContract_v2.js --network testnet

# npx hardhat run scripts/WhitelistContract/verify.js --network testnet
```

## Deploy NFT SALE to testnet / mainnet

```shell
npx hardhat run scripts/NFTAuctionContract/1_deploy.js --network testnet
# Copy Contract address to proxyAddresses.js
npx hardhat run scripts/NFTFixedSwapContract/1_deploy.js --network testnet
# Copy Contract address to proxyAddresses.js

npx hardhat run scripts/NFTFixedSwapContract/setAdmin.js --network testnet
npx hardhat run scripts/NFTAuctionContract/setAdmin.js --network testnet

# REMEMBER: owner need update WITHDRAW_ADDRESS at 2 contracts

# Auction, Got NFT first and update range tokenId
npx hardhat run scripts/NFTAuctionContract/2_addOrUpdatePool.js --network testnet
npx hardhat run scripts/NFTAuctionContract/3_updateSalePool.js --network testnet

# Fixed Swap, Got NFT first and update range tokenId
npx hardhat run scripts/NFTFixedSwapContract/2_addOrUpdatePool.js --network testnet
npx hardhat run scripts/NFTFixedSwapContract/3_updateSalePool.js --network testnet

# npx hardhat run scripts/NFTAuctionContract/verify.js --network testnet
# npx hardhat run scripts/NFTFixedSwapContract/verify.js --network testnet

```

## Deploy NFTClaim Contract to testnet / mainnet

```shell
npx hardhat run scripts/NFTClaimContract/deploy.js --network testnet
# npx hardhat run scripts/NFTClaimContract/upgrade.js --network testnet

```

## Deploy Token SALE to testnet / mainnet

```shell
npx hardhat run scripts/NFTManContract/1_deploy.js --network testnet
# Copy Contract address to proxyAddresses.js
npx hardhat run scripts/RadaAuctionContract/1_deploy.js --network testnet
# Copy Contract address to proxyAddresses.js
npx hardhat run scripts/RadaFixedSwapContract/1_deploy.js --network testnet
# Copy Contract address to proxyAddresses.js

# TODO: Require setMinterFactories for NFTMan at NFT Contract
# REMEMBER: owner need update WITHDRAW_ADDRESS at 2 contracts, default is deployer

npx hardhat run scripts/RadaFixedSwapContract/setAdmin.js --network testnet
npx hardhat run scripts/RadaAuctionContract/setAdmin.js --network testnet
npx hardhat run scripts/NFTManContract/setAdmin.js --network testnet

# TOKEN - Auction
npx hardhat run scripts/RadaAuctionContract/TOKEN_2_addOrUpdatePool.js --network testnet

# TOKEN - Fixed Swap
npx hardhat run scripts/RadaFixedSwapContract/TOKEN_2_addOrUpdatePool.js --network testnet

# npx hardhat run scripts/RadaAuctionContract/4_handleEndAuction.js --network testnet

# npx hardhat run scripts/RadaFixedSwapContract/verify.js --network testnet
# npx hardhat run scripts/RadaAuctionContract/verify.js --network testnet
```

## NFTMan to testnet / mainnet

```shell
npx hardhat run scripts/NFTManContract/1_deploy.js --network testnet
# Copy Contract address to proxyAddresses.js
# Token Box
npx hardhat run scripts/NFTManContract/TOKEN_2_addOrUpdatePool.js --network testnet

npx hardhat run scripts/NFTManContract/setAdmin.js --network testnet
npx hardhat run scripts/NFTManContract/upgradeContract_v2.js --network testnet

# npx hardhat run scripts/NFTManContract/verify.js --network testnet
```

## RandomizeByRarity to testnet / polygon

```shell
npx hardhat run scripts/RandomizeByRarity/1_deploy.js --network testnet
# Copy Contract address to proxyAddresses.js
# TODO: Remember send LINK+MATIC token to Contract

npx hardhat run scripts/RandomizeByRarity/2_addPool.js --network testnet

# npx hardhat run scripts/RandomizeByRarity/updatePool.js --network testnet

npx hardhat run scripts/RandomizeByRarity/setAdmin.js --network testnet

# npx hardhat verify --network testnet 0x72Cd36e466918A5f4961d1a7eE6642E9be7Ef9fb "0x326C977E6efc84E512bB9C30f76E30c160eD06FB" "0x8C7382F9D8f56b33781fE506E897a4F1e2d17255" "0x6e75b569a01ef56d18cab6a8e71e6600d6ce853834d4a5748b720d06f878b3a4" "100000000000"
```

## Build & Deploy BSC testnet | BUSDToken

```shell

npx hardhat run scripts/BUSDToken/deploy.js --network testnet
# Copy Token address to tokenAddresses.js

# npx hardhat verify --network testnet --contract contracts/BUSDToken.sol:BUSDToken TODO_token_address

```

## Build & Deploy BSC testnet | BoxToken

```shell

npx hardhat run scripts/BoxToken/deploy.js --network testnet
# Copy Token address to tokenAddresses.js

# Test
npx hardhat run scripts/BoxToken/sendTokentest.js --network testnet


# npx hardhat verify --network testnet --contract contracts/BoxToken.sol:BoxToken TODO_token_address

```

```shell
remixd -s ./ --remix-ide https://remix.ethereum.org

grep \"bytecode\" artifacts/contracts/NFTAuctionContract.sol/* | awk '{print $1 " " length($3)/2}'
```
