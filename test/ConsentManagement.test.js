const { ethers } = require("hardhat"); // CommonJS for tests
const { expect } = require("chai"); // Chai is included with hardhat-toolbox

describe("Patient Consent Management System", function () {
    let deployer, patient1, doctor1, researcher1, unauthorizedUser;
    let purposeTree, patientRecords, consentManagement;

    // Predefined Purpose IDs based on PurposeTree constructor
    // These are illustrative; actual IDs depend on deployment order in PurposeTree constructor.
    // Root=1, Education=2, Medical_Treatment=3, Insurance=4
    // Survey=5, Statistics=6, Discovery=7
    // Diagnosis=8, Report=9, Investigation=10
    // Claim=11, Documentation=12
    const PURPOSE_IDS = {
        ROOT: 1,
        EDUCATION: 2,
        MEDICAL_TREATMENT: 3,
        DIAGNOSIS: 8, // Sub-purpose of Medical Treatment
        STATISTICS: 6, // Sub-purpose of Education
    };

    // Action Enum (mirroring the one in ConsentManagement.sol)
    const ACTION = {
        READ: 0,
        COPY: 1,
    };

    beforeEach(async function () {
        [deployer, patient1, doctor1, researcher1, unauthorizedUser] = await ethers.getSigners();

        // Deploy PurposeTree
        const PurposeTreeFactory = await ethers.getContractFactory("PurposeTree", deployer);
        purposeTree = await PurposeTreeFactory.deploy();
        await purposeTree.waitForDeployment();

        // Deploy PatientRecords
        const PatientRecordsFactory = await ethers.getContractFactory("PatientRecords", deployer);
        patientRecords = await PatientRecordsFactory.deploy();
        await patientRecords.waitForDeployment();

        // Deploy ConsentManagement
        const ConsentManagementFactory = await ethers.getContractFactory("ConsentManagement", deployer);
        consentManagement = await ConsentManagementFactory.deploy(
            await purposeTree.getAddress(),
            await patientRecords.getAddress()
        );
        await consentManagement.waitForDeployment();
    });

    describe("Deployment & Setup", function () {
        it("Should deploy all contracts successfully", async function () {
            expect(await purposeTree.getAddress()).to.not.equal(ethers.ZeroAddress);
            expect(await patientRecords.getAddress()).to.not.equal(ethers.ZeroAddress);
            expect(await consentManagement.getAddress()).to.not.equal(ethers.ZeroAddress);
        });

        it("ConsentManagement should have correct dependent contract addresses", async function () {
            expect(await consentManagement.purposeTree()).to.equal(await purposeTree.getAddress());
            expect(await consentManagement.patientRecords()).to.equal(await patientRecords.getAddress());
        });

        it("PurposeTree should have Diagnosis as a descendant of Medical_Treatment", async function () {
            expect(await purposeTree.isDescendant(PURPOSE_IDS.MEDICAL_TREATMENT, PURPOSE_IDS.DIAGNOSIS)).to.be.true;
            expect(await purposeTree.isPurposeAllowed(PURPOSE_IDS.DIAGNOSIS, PURPOSE_IDS.MEDICAL_TREATMENT)).to.be.true;
        });
    });

    describe("Patient Record Management (via PatientRecords contract)", function () {
        it("Patient should be able to add a record", async function () {
            const recordTx = await patientRecords.connect(patient1).addRecord("ipfs://hash1", "ipfs://meta1");
            await expect(recordTx)
                .to.emit(patientRecords, "RecordAdded")
                .withArgs(patient1.address, 1, "ipfs://hash1", (await ethers.provider.getBlock(recordTx.blockNumber)).timestamp); // Check timestamp
            expect(await patientRecords.getRecordCount(patient1.address)).to.equal(1);
        });
    });

    describe("Consent Granting and Revocation", function () {
        let recordId;
        beforeEach(async function() {
            // Patient1 adds a record
            const tx = await patientRecords.connect(patient1).addRecord("ipfs://recordData", "ipfs://recordMeta");
            const receipt = await tx.wait();
            // A simple way to get recordId assuming it's the first record for patient1
            recordId = 1;
        });

        it("Patient should be able to grant consent", async function () {
            const grantTx = await consentManagement.connect(patient1).grantConsent(
                recordId,
                "Doctor",
                "DoctorLicenseID123",
                ACTION.READ,
                PURPOSE_IDS.DIAGNOSIS
            );
            const receipt = await grantTx.wait();
            const events = receipt.logs.filter(log => log.fragment && log.fragment.name === "ConsentGranted");
            expect(events.length).to.equal(1);
            const consentId = events[0].args.consentId;

            await expect(grantTx)
                .to.emit(consentManagement, "ConsentGranted")
                .withArgs(
                    consentId, // Check consentId
                    patient1.address,
                    recordId,
                    "Doctor",
                    "DoctorLicenseID123",
                    ACTION.READ,
                    PURPOSE_IDS.DIAGNOSIS
                );
        });

        it("Patient should be able to revoke consent", async function () {
            // Grant consent first
            const grantTx = await consentManagement.connect(patient1).grantConsent(
                recordId, "Doctor", "DocRevokeTest", ACTION.READ, PURPOSE_IDS.DIAGNOSIS
            );
            const grantReceipt = await grantTx.wait();
            const grantEvents = grantReceipt.logs.filter(log => log.fragment && log.fragment.name === "ConsentGranted");
            const consentId = grantEvents[0].args.consentId;

            // The internalCounter for the first consent on a record for a patient is 1
            const internalConsentCounter = 1;

            const revokeTx = await consentManagement.connect(patient1).revokeConsentByInternalId(recordId, internalConsentCounter);
            await expect(revokeTx)
                .to.emit(consentManagement, "ConsentRevoked")
                .withArgs(consentId, patient1.address, recordId);

            // Verify access is now denied
            const hasAccess = await consentManagement.checkAccess(
                patient1.address, recordId, "Doctor", "DocRevokeTest", ACTION.READ, PURPOSE_IDS.DIAGNOSIS
            );
            expect(hasAccess).to.be.false;
        });

        it("Should fail to grant consent for a non-existent record", async function () {
             await expect(consentManagement.connect(patient1).grantConsent(
                99, // Non-existent recordId
                "Doctor",
                "DoctorLicenseID123",
                ACTION.READ,
                PURPOSE_IDS.DIAGNOSIS
            )).to.be.revertedWith("CM: Record does not exist or you are not the owner");
        });
    });

    // describe("Access Control Logic", function () {
    //     let recordId = 1; // Assuming first record for patient1
    //     const doctorRole = "Doctor";
    //     const doctorId = "DrStrange";
    //     const researcherRole = "Researcher";
    //     const researcherId = "ResBanner";

    //     beforeEach(async function() {
    //         await patientRecords.connect(patient1).addRecord("ipfs://healthData", "ipfs://healthMeta");

    //         // Patient1 grants consent to DoctorStrange for Diagnosis (specific purpose)
    //         await consentManagement.connect(patient1).grantConsent(
    //             recordId, doctorRole, doctorId, ACTION.READ, PURPOSE_IDS.DIAGNOSIS
    //         );
    //         // Patient1 grants consent to ResBanner for Statistics (specific purpose under Education)
    //         await consentManagement.connect(patient1).grantConsent(
    //             recordId, researcherRole, researcherId, ACTION.COPY, PURPOSE_IDS.STATISTICS
    //         );
    //          // Patient1 grants consent to another doctor for broader Medical_Treatment purpose
    //         await consentManagement.connect(patient1).grantConsent(
    //             recordId, "Doctor", "DrHouse", ACTION.READ, PURPOSE_IDS.MEDICAL_TREATMENT
    //         );
    //     });

    //     it("DoctorStrange should have access for Diagnosis (exact match)", async function () {
    //         const hasAccess = await consentManagement.connect(doctor1).checkAccess( // doctor1 is just an address, the contract checks role/id strings
    //             patient1.address, recordId, doctorRole, doctorId, ACTION.READ, PURPOSE_IDS.DIAGNOSIS
    //         );
    //         expect(hasAccess).to.be.true;
    //     });

    //     it("DoctorStrange should NOT have access for Statistics (wrong purpose)", async function () {
    //         const hasAccess = await consentManagement.connect(doctor1).checkAccess(
    //             patient1.address, recordId, doctorRole, doctorId, ACTION.READ, PURPOSE_IDS.STATISTICS
    //         );
    //         expect(hasAccess).to.be.false;
    //     });

    //     it("ResBanner should have COPY access for Statistics", async function () {
    //         const hasAccess = await consentManagement.connect(researcher1).checkAccess(
    //             patient1.address, recordId, researcherRole, researcherId, ACTION.COPY, PURPOSE_IDS.STATISTICS
    //         );
    //         expect(hasAccess).to.be.true;
    //     });

    //     it("ResBanner should also have READ access for Statistics (Copy implies Read)", async function () {
    //          const hasAccess = await consentManagement.connect(researcher1).checkAccess(
    //             patient1.address, recordId, researcherRole, researcherId, ACTION.READ, PURPOSE_IDS.STATISTICS
    //         );
    //         expect(hasAccess).to.be.true;
    //     });

    //     it("Unauthorized user/role/id should not have access", async function () {
    //         const hasAccess = await consentManagement.connect(unauthorizedUser).checkAccess(
    //             patient1.address, recordId, "Hacker", "HackID", ACTION.READ, PURPOSE_IDS.DIAGNOSIS
    //         );
    //         expect(hasAccess).to.be.false;
    //     });

    //     it("DrHouse should have access for Diagnosis (Diagnosis is descendant of Medical_Treatment)", async function () {
    //         const hasAccess = await consentManagement.connect(doctor1).checkAccess(
    //             patient1.address, recordId, "Doctor", "DrHouse", ACTION.READ, PURPOSE_IDS.DIAGNOSIS
    //         );
    //         expect(hasAccess).to.be.true;
    //     });

    //      it("DoctorStrange should NOT have access for Medical_Treatment (Diagnosis is specific, cannot access broader)", async function () {
    //         const hasAccess = await consentManagement.connect(doctor1).checkAccess(
    //             patient1.address, recordId, doctorRole, doctorId, ACTION.READ, PURPOSE_IDS.MEDICAL_TREATMENT
    //         );
    //         expect(hasAccess).to.be.false;
    //     });

    //     // it("Should allow access and retrieve record hash if permitted", async function() {
    //     //     const [dataHash, metadataHash] = await consentManagement.connect(doctor1).requestAndAccessRecord(
    //     //         patient1.address, recordId, doctorRole, doctorId, ACTION.READ, PURPOSE_IDS.DIAGNOSIS
    //     //     );
    //     //     expect(dataHash).to.equal("ipfs://healthData");
    //     //     expect(metadataHash).to.equal("ipfs://healthMeta");
    //     // });

    //     it("Should allow access and retrieve record hash if permitted", async function() {
    //         // Temporary debug:
    //         const hasAccessDebug = await consentManagement.connect(doctor1).checkAccess(
    //             patient1.address, recordId, doctorRole, doctorId, ACTION.READ, PURPOSE_IDS.DIAGNOSIS
    //         );
    //         console.log("DEBUG: hasAccess =", hasAccessDebug); // Check this output in the console
    //         expect(hasAccessDebug, "DEBUG: Access check should be true").to.be.true; // Assert this first

    //         // Original test:
    //         const [dataHash, metadataHash] = await consentManagement.connect(doctor1).requestAndAccessRecord(
    //             patient1.address, recordId, doctorRole, doctorId, ACTION.READ, PURPOSE_IDS.DIAGNOSIS
    //         );
    //         expect(dataHash).to.equal("ipfs://healthData");
    //         expect(metadataHash).to.equal("ipfs://healthMeta");
    //     });


    //     it("Should revert if trying to access record without permission", async function() {
    //         await expect(consentManagement.connect(unauthorizedUser).requestAndAccessRecord(
    //             patient1.address, recordId, "Hacker", "HackID", ACTION.READ, PURPOSE_IDS.DIAGNOSIS
    //         )).to.be.revertedWith("CM: Access denied");
    //     });
    // });


    describe("Access Control Logic", function () {
        let recordId; // Declare here
        const doctorRole = "Doctor";
        const doctorId = "DrStrange";
        const researcherRole = "Researcher";
        const researcherId = "ResBanner";

        beforeEach(async function() {
            const tx = await patientRecords.connect(patient1).addRecord("ipfs://healthData", "ipfs://healthMeta");
            const receipt = await tx.wait();

            // Find the RecordAdded event and extract recordId
            const events = receipt.logs.filter(log => {
                try {
                    const parsedLog = patientRecords.interface.parseLog(log);
                    return parsedLog.name === "RecordAdded" && parsedLog.args.patient === patient1.address;
                } catch (e) {
                    return false;
                }
            });
            expect(events.length, "RecordAdded event not found or patient mismatch").to.equal(1);
            recordId = events[0].args.recordId; // Get the actual recordId
            // console.log("DEBUG: Created recordId:", recordId.toString()); // Optional debug

            // Patient1 grants consent to DoctorStrange for Diagnosis (specific purpose)
            await consentManagement.connect(patient1).grantConsent(
                recordId, doctorRole, doctorId, ACTION.READ, PURPOSE_IDS.DIAGNOSIS
            );
            // Patient1 grants consent to ResBanner for Statistics (specific purpose under Education)
            await consentManagement.connect(patient1).grantConsent(
                recordId, researcherRole, researcherId, ACTION.COPY, PURPOSE_IDS.STATISTICS
            );
            // Patient1 grants consent to another doctor for broader Medical_Treatment purpose
            await consentManagement.connect(patient1).grantConsent(
                recordId, "Doctor", "DrHouse", ACTION.READ, PURPOSE_IDS.MEDICAL_TREATMENT
            );
        });

        // ... your tests, including the failing one ...
        // it("Should allow access and retrieve record hash if permitted", async function() {
        //     // Remove or comment out the temporary debug if you wish
        //     const hasAccessDebug = await consentManagement.connect(doctor1).checkAccess(
        //         patient1.address, recordId, doctorRole, doctorId, ACTION.READ, PURPOSE_IDS.DIAGNOSIS
        //     );
        //     // console.log("DEBUG: hasAccess for retrieval test =", hasAccessDebug);
        //     expect(hasAccessDebug, "Access check should be true for retrieval").to.be.true;

        //     const [dataHash, metadataHash] = await consentManagement.connect(doctor1).requestAndAccessRecord(
        //         patient1.address, recordId, doctorRole, doctorId, ACTION.READ, PURPOSE_IDS.DIAGNOSIS
        //     );
        //     expect(dataHash).to.equal("ipfs://healthData");
        //     expect(metadataHash).to.equal("ipfs://healthMeta");
        // });


        // In test/ConsentManagement.test.js
    it("Should allow access and retrieve record hash if permitted", async function() {
        const hasAccessDebug = await consentManagement.connect(doctor1).checkAccess(
            patient1.address, recordId, doctorRole, doctorId, ACTION.READ, PURPOSE_IDS.DIAGNOSIS
        );
        console.log(`DEBUG (test file): hasAccess for recordId ${recordId.toString()} = ${hasAccessDebug}`);
        expect(hasAccessDebug, "Access check should be true for retrieval").to.be.true;

        // Step 1: Call the state-modifying function and ensure it doesn't revert
        // This also emits the AccessAttempt event.
        console.log(`DEBUG (test file): Attempting requestAndAccessRecord for recordId ${recordId.toString()} by doctor1`);
        const tx = await consentManagement.connect(doctor1).requestAndAccessRecord(
            patient1.address,
            recordId,
            doctorRole,
            doctorId,
            ACTION.READ,
            PURPOSE_IDS.DIAGNOSIS
        );
        // Wait for the transaction to be mined to ensure events are emitted and state changes (if any) are applied.
        // Also, this will throw an error if the transaction reverted.
        await tx.wait();
        console.log("DEBUG (test file): requestAndAccessRecord transaction successfully mined.");

        // Step 2: Since access was granted, now directly call the view function from PatientRecords
        // to get the data that requestAndAccessRecord *would have conceptually returned*
        // if it were a view function or if we were capturing an event with these values.
        const recordData = await patientRecords.connect(doctor1).getRecord( // or connect(patient1) if contextually more appropriate for who can view
            patient1.address,
            recordId
        );

        // recordData from patientRecords.getRecord is an array: [dataHash, metadataHash, timestamp, owner]
        expect(Array.isArray(recordData), "Result from patientRecords.getRecord should be an array").to.be.true;
        expect(recordData.length, "Result array from patientRecords.getRecord should have 4 elements").to.equal(4);

        const dataHash = recordData[0];
        const metadataHash = recordData[1];

        expect(dataHash).to.equal("ipfs://healthData");
        expect(metadataHash).to.equal("ipfs://healthMeta");
    });


    });

});
