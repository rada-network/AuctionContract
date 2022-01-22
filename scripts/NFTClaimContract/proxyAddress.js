const { ethers, upgrades, hardhatArguments } = require('hardhat');
const fs = require('fs');
const file_path = `${__dirname}/../../.deployed.json`;
const network = hardhatArguments.network;

module.exports = {
    getDeployedAddress: (contractName) => {
        let deployedData;
        try {
            deployedData = require(file_path);
        } catch (e) {
            deployedData = {};
        }  
    
        //const contractName = "NFTClaimContract";
        if (!deployedData[network] || !deployedData[network][contractName]?.proxyAddress) {
        console.log(`Contract ${contractName} has not deployed`);
        return;
        }
        return deployedData[network][contractName]?.proxyAddress;    
    },

    updateDeployedAddress: (contractName, addresses) => {
        let deployedData;
        try {
            deployedData = require(file_path);
        } catch (e) {
            deployedData = {};
        }
        if (!deployedData[network]) deployedData[network] = {};
        deployedData[network][contractName] = addresses;
      
        fs.writeFileSync(file_path, JSON.stringify(deployedData, null, "  "));
    }
}