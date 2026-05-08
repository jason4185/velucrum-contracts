import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployment = await deploy("ConfidentialYieldDistributor", {
    from: deployer,
    log: true,
    waitConfirmations: 1,
  });

  console.log("ConfidentialYieldDistributor deployed to:", deployment.address);
};

export default func;
func.id = "deploy_confidential_yield_distributor";
func.tags = ["ConfidentialYieldDistributor"];
