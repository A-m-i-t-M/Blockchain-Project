// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PurposeTree.sol";
import "./PatientRecords.sol";

contract ConsentManagement {
    PurposeTree public immutable purposeTree;
    PatientRecords public immutable patientRecords;

    enum Action { Read, Copy } // As per paper's description

    struct Consent {
        address patient;      // Address of the patient giving consent
        uint256 recordId;     // ID of the record for which consent is given
        string role;          // Role of the entity requesting access (e.g., "Doctor")
        string requestorId;   // Specific ID of the requestor (e.g., "DoctorLicense123")
        Action action;        // Permitted action (Read or Copy)
        uint256 purposeId;    // ID from PurposeTree for which consent is granted
        bool active;          // Is the consent currently active?
        uint256 timestamp;    // Timestamp of consent creation/last update
        uint256 consentId;    // Unique ID for this consent instance
    }

    // patientAddress => recordId => internalConsentCounter => Consent
    // This structure allows multiple consents per record for different requestors/purposes
    mapping(address => mapping(uint256 => mapping(uint256 => Consent))) private consents;
    // patientAddress => recordId => count of consents for that record
    mapping(address => mapping(uint256 => uint256)) private consentCountersForRecord;
    // Global consent ID counter
    uint256 private nextConsentId;

    event ConsentGranted(
        uint256 indexed consentId,
        address indexed patient,
        uint256 indexed recordId,
        string role,
        string requestorId,
        Action action,
        uint256 purposeId
    );
    event ConsentRevoked(uint256 indexed consentId, address indexed patient, uint256 recordId);
    event AccessAttempt(
        address indexed requestorAddress, // Address making the call
        address indexed patientWhoseData,
        uint256 recordId,
        string role,
        string requestorId,
        Action action,
        uint256 accessPurposeId,
        bool granted
    );

    constructor(address _purposeTreeAddress, address _patientRecordsAddress) {
        require(_purposeTreeAddress != address(0), "CM: Invalid PurposeTree address");
        require(_patientRecordsAddress != address(0), "CM: Invalid PatientRecords address");
        purposeTree = PurposeTree(_purposeTreeAddress);
        patientRecords = PatientRecords(_patientRecordsAddress);
        nextConsentId = 1; // Start consent IDs from 1
    }

    function grantConsent(
        uint256 recordId,
        string memory role,
        string memory requestorId,
        Action action,
        uint256 consentedPurposeId
    ) public returns (uint256) {
        require(patientRecords.doesRecordExist(msg.sender, recordId), "CM: Record does not exist or you are not the owner");
        // Further check if msg.sender is owner of recordId can be done by calling patientRecords contract,
        // or assuming PatientRecords.addRecord correctly assigns ownership.
        // For simplicity here, we trust doesRecordExist implies msg.sender created it (as per PatientRecords logic).

        require(bytes(role).length > 0, "CM: Role cannot be empty");
        require(bytes(requestorId).length > 0, "CM: Requestor ID cannot be empty");
        // require(purposeTree.getPurposeName(consentedPurposeId) != bytes32(0), "CM: Invalid consented purpose ID"); // Basic check
        string memory purposeName = purposeTree.getPurposeName(consentedPurposeId); // This will revert if purposeId is bad
        require(bytes(purposeName).length > 0, "CM: Consented purpose name is empty or ID is invalid");


        uint256 internalCounter = consentCountersForRecord[msg.sender][recordId] + 1;
        consentCountersForRecord[msg.sender][recordId] = internalCounter;

        uint256 currentConsentId = nextConsentId++;

        consents[msg.sender][recordId][internalCounter] = Consent({
            patient: msg.sender,
            recordId: recordId,
            role: role,
            requestorId: requestorId,
            action: action,
            purposeId: consentedPurposeId,
            active: true,
            timestamp: block.timestamp,
            consentId: currentConsentId
        });

        emit ConsentGranted(currentConsentId, msg.sender, recordId, role, requestorId, action, consentedPurposeId);
        return currentConsentId;
    }

    function revokeConsentByInternalId(uint256 recordId, uint256 internalConsentCounter) public {
        Consent storage consentToRevoke = consents[msg.sender][recordId][internalConsentCounter];
        require(consentToRevoke.patient == msg.sender, "CM: Not your consent to revoke");
        require(consentToRevoke.active, "CM: Consent already inactive");

        consentToRevoke.active = false;
        consentToRevoke.timestamp = block.timestamp; // Update timestamp on revocation

        emit ConsentRevoked(consentToRevoke.consentId, msg.sender, recordId);
    }

    // A more robust revocation might require finding the consent by its global consentId
    // This is a simplified version. For a real system, you'd need a mapping from global consentId to its storage path.

    function checkAccess(
        address patientAddress,
        uint256 recordId,
        string memory role,
        string memory requestorId,
        Action action,
        uint256 accessPurposeId // The purpose for which access is being attempted
    ) public view returns (bool) {
        uint256 maxInternalCounter = consentCountersForRecord[patientAddress][recordId];
        for (uint256 i = 1; i <= maxInternalCounter; i++) {
            Consent storage c = consents[patientAddress][recordId][i];
            if (
                c.active &&
                keccak256(bytes(c.role)) == keccak256(bytes(role)) &&
                keccak256(bytes(c.requestorId)) == keccak256(bytes(requestorId)) &&
                c.action >= action && // e.g., if consent is for Copy, Read is also allowed
                purposeTree.isPurposeAllowed(accessPurposeId, c.purposeId)
            ) {
                return true;
            }
        }
        return false;
    }

    // function requestAndAccessRecord(
    //     address patientAddress,
    //     uint256 recordId,
    //     string memory role,
    //     string memory requestorId,
    //     Action action,
    //     uint256 accessPurposeId
    // ) public returns (string memory dataHash, string memory metadataHash) {
    //     bool hasAccess = checkAccess(patientAddress, recordId, role, requestorId, action, accessPurposeId);

    //     emit AccessAttempt(msg.sender, patientAddress, recordId, role, requestorId, action, accessPurposeId, hasAccess);

    //     require(hasAccess, "CM: Access denied");

    //     // If access is granted, fetch the record metadata from PatientRecords contract
    //     (string memory _dataHash, string memory _metadataHash, , ) = patientRecords.getRecord(patientAddress, recordId);
    //     return (_dataHash, _metadataHash);
    // }


    // In ConsentManagement.sol - REVERT TO THIS VERSION
    function requestAndAccessRecord(
        address patientAddress,
        uint256 recordId,
        string memory role,
        string memory requestorId,
        Action action,
        uint256 accessPurposeId
    ) public returns (string memory dataHash, string memory metadataHash) {
        bool hasAccess = checkAccess(patientAddress, recordId, role, requestorId, action, accessPurposeId);

        emit AccessAttempt(msg.sender, patientAddress, recordId, role, requestorId, action, accessPurposeId, hasAccess);

        require(hasAccess, "CM: Access denied");

        (string memory _dataHash, string memory _metadataHash, , ) = patientRecords.getRecord(patientAddress, recordId);
        return (_dataHash, _metadataHash);
    }


    // Helper function for debugging lowLevelData (if needed, add to contract)
    function bytesToHex(bytes memory data) internal pure returns (string memory) {
        bytes memory SPREAD = "0123456789abcdef";
        bytes memory tem = new bytes(2 * data.length);
        for (uint i = 0; i < data.length; i++) {
            tem[2 * i] = SPREAD[uint8(data[i] >> 4)];
            tem[2 * i + 1] = SPREAD[uint8(data[i] & 0x0f)];
        }
        return string(abi.encodePacked("0x", tem));
    }

    // Helper function uint2str (if not already present from previous step)
    function uint2str(uint _i) internal pure returns (string memory _uintAsString) {
        if (_i == 0) {
            return "0";
        }
        uint j = _i;
        uint len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint k = len - 1;
        while (_i != 0) {
            bstr[k--] = bytes1(uint8(48 + _i % 10));
            _i /= 10;
        }
        return string(bstr);
    }


}
