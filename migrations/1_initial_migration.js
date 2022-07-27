const Migrations = artifacts.require('Migrations');
const MZNFT_ETH = artifacts.require('MZNFT_ETH');

module.exports = function (deployer) {
  deployer.deploy(Migrations);
  deployer.deploy(MZNFT_ETH);
};
