# RADA Auction Contract DEPLOYMENT

## BoxToken

```shell
npx hardhat run scripts/BoxToken/deploy.js --network testnet
# Copy Token address to ../BoxTokenAddresses.js
```

## RandomizeByRarity

```shell
npx hardhat run scripts/RandomizeByRarity/1_deploy.js --network testnet
# Copy Contract address to proxyAddresses.js
# TODO: Remember send LINK+MATIC token to Contract

npx hardhat run scripts/RandomizeByRarity/setAdmin.js --network testnet
```

## Whitelist Contract

```shell
npx hardhat run scripts/WhitelistContract/1_deploy.js --network testnet
# Copy Contract address to proxyAddresses.js

```

## Token SALE to testnet / mainnet

```shell
npx hardhat run scripts/NFTManContract/1_deploy.js --network testnet
# Copy Contract address to proxyAddresses.js
# TODO: Require setMinterFactories for NFTMan at NFT Contract

npx hardhat run scripts/RadaAuctionContract/1_deploy.js --network testnet
# Copy Contract address to proxyAddresses.js
npx hardhat run scripts/RadaFixedSwapContract/1_deploy.js --network testnet
# Copy Contract address to proxyAddresses.js

# REMEMBER: Deployer need update WITHDRAW_ADDRESS at 2 contracts, default is deployer

# Set Admins
npx hardhat run scripts/WhitelistContract/setAdmin.js --network testnet
npx hardhat run scripts/RadaFixedSwapContract/setAdmin.js --network testnet
npx hardhat run scripts/RadaAuctionContract/setAdmin.js --network testnet
npx hardhat run scripts/NFTManContract/setAdmin.js --network testnet

# Verify
npx hardhat run scripts/RadaFixedSwapContract/verify.js --network testnet
npx hardhat run scripts/RadaAuctionContract/verify.js --network testnet
npx hardhat run scripts/NFTManContract/verify.js --network testnet
npx hardhat run scripts/WhitelistContract/verify.js --network testnet
npx hardhat run scripts/BoxToken/verify.js --network testnet

```
