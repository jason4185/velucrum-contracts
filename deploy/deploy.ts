import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const counterDeployment = await deploy("ConfidentialCounter", {
    from: deployer,
    log: true,
    waitConfirmations: 1,
  });

  console.log("ConfidentialCounter deployed to:", counterDeployment.address);
};

export default func;
func.id = "deploy_confidential_counter";
func.tags = ["ConfidentialCounter"];
