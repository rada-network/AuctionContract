const { ethers,  } = require('hardhat');

// Utils
const pe = (num) => ethers.utils.parseEther(num) // parseEther
const fe = (num) => ethers.utils.formatEther(num) // formatEther
const pu = (num, decimals = 0) => ethers.utils.parseUnits(num, decimals) // parseUnits
const fu = (num, decimals = 0) => ethers.utils.formatUnits(num, decimals) // formatEther


const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {pe,fe,pu,fu, sleep}