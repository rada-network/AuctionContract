# NFT Fixed Swap Contract DEPLOYMENT

## Whitelist Contract

```shell
npx hardhat run scripts/WhitelistContract/1_deploy.js --network testnet
# Copy Contract address to proxyAddresses.js

# Set Admins
npx hardhat run scripts/WhitelistContract/setAdmin.js --network testnet

# Verify
npx hardhat run scripts/WhitelistContract/verify.js --network testnet

```

## NFT SALE to testnet / mainnet

```shell
npx hardhat run scripts/NFTFixedSwapContract/1_deploy.js --network testnet
# Copy Contract address to proxyAddresses.js
# REMEMBER: Deployer need update WITHDRAW_ADDRESS, default is deployer
npx hardhat run scripts/NFTFixedSwapContract/setWithdrawAddress.js --network testnet

# Set Admins
npx hardhat run scripts/NFTFixedSwapContract/setAdmin.js --network testnet

# Verify
npx hardhat run scripts/NFTFixedSwapContract/verify.js --network testnet

# withdrawFund
npx hardhat run scripts/NFTFixedSwapContract/withdrawFund.js --network testnet
```

## NFT Auction to testnet / mainnet

```shell
npx hardhat run scripts/NFTAuctionContract/1_deploy.js --network testnet
# Copy Contract address to proxyAddresses.js
# REMEMBER: Deployer need update WITHDRAW_ADDRESS, default is deployer
npx hardhat run scripts/NFTAuctionContract/setWithdrawAddress.js --network testnet

# Set Admins
npx hardhat run scripts/NFTAuctionContract/setAdmin.js --network testnet

# Verify
npx hardhat run scripts/NFTAuctionContract/verify.js --network testnet
```
