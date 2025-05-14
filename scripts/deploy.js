const { ethers } = require("hardhat"); // Use CommonJS require

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // 1. Deploy PurposeTree
  const PurposeTreeFactory = await ethers.getContractFactory("PurposeTree");
  const purposeTree = await PurposeTreeFactory.deploy();
  await purposeTree.waitForDeployment(); // New way to wait for deployment
  const purposeTreeAddress = await purposeTree.getAddress(); // New way to get address
  console.log("PurposeTree deployed to:", purposeTreeAddress);

  // 2. Deploy PatientRecords
  const PatientRecordsFactory = await ethers.getContractFactory("PatientRecords");
  const patientRecords = await PatientRecordsFactory.deploy();
  await patientRecords.waitForDeployment();
  const patientRecordsAddress = await patientRecords.getAddress();
  console.log("PatientRecords deployed to:", patientRecordsAddress);

  // 3. Deploy ConsentManagement, linking the other two
  const ConsentManagementFactory = await ethers.getContractFactory("ConsentManagement");
  const consentManagement = await ConsentManagementFactory.deploy(purposeTreeAddress, patientRecordsAddress);
  await consentManagement.waitForDeployment();
  const consentManagementAddress = await consentManagement.getAddress();
  console.log("ConsentManagement deployed to:", consentManagementAddress);

  console.log("\n--- Deployment Summary ---");
  console.log(`PurposeTree Address: ${purposeTreeAddress}`);
  console.log(`PatientRecords Address: ${patientRecordsAddress}`);
  console.log(`ConsentManagement Address: ${consentManagementAddress}`);
  console.log("--------------------------\n");

  // You can save these addresses to a file or use them in other scripts/frontend
  // For frontend, you'll also need the ABIs from the artifacts folder.
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
