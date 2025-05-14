// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract PatientRecords {
    struct Record {
        string dataHash;     // e.g., IPFS hash of the encrypted medical data
        string metadataHash; // e.g., IPFS hash of any associated metadata
        uint256 timestamp;
        address owner;       // Patient's address
        bool exists;
    }

    // patientAddress => recordId => Record
    mapping(address => mapping(uint256 => Record)) private patientRecords;
    // patientAddress => count of records
    mapping(address => uint256) private patientRecordCounts;

    event RecordAdded(address indexed patient, uint256 indexed recordId, string dataHash, uint256 timestamp);
    event RecordUpdated(address indexed patient, uint256 indexed recordId, string newDataHash, uint256 timestamp);

    modifier onlyRecordOwner(address patient, uint256 recordId) {
        require(patientRecords[patient][recordId].exists, "PR: Record does not exist");
        require(patientRecords[patient][recordId].owner == msg.sender, "PR: Caller is not the record owner");
        _;
    }

    function addRecord(string memory dataHash, string memory metadataHash) public returns (uint256) {
        require(bytes(dataHash).length > 0, "PR: Data hash cannot be empty");

        uint256 newRecordId = patientRecordCounts[msg.sender] + 1;
        patientRecordCounts[msg.sender] = newRecordId;

        patientRecords[msg.sender][newRecordId] = Record({
            dataHash: dataHash,
            metadataHash: metadataHash,
            timestamp: block.timestamp,
            owner: msg.sender,
            exists: true
        });

        emit RecordAdded(msg.sender, newRecordId, dataHash, block.timestamp);
        return newRecordId;
    }

    function updateRecord(uint256 recordId, string memory newDataHash, string memory newMetadataHash) public onlyRecordOwner(msg.sender, recordId) {
        require(bytes(newDataHash).length > 0, "PR: New data hash cannot be empty");

        patientRecords[msg.sender][recordId].dataHash = newDataHash;
        patientRecords[msg.sender][recordId].metadataHash = newMetadataHash;
        patientRecords[msg.sender][recordId].timestamp = block.timestamp;

        emit RecordUpdated(msg.sender, recordId, newDataHash, block.timestamp);
    }

    function getRecord(address patientAddress, uint256 recordId) public view returns (string memory dataHash, string memory metadataHash, uint256 timestamp, address owner) {
        // This function could be restricted based on consent in a real system,
        // but for this project, ConsentManagement contract will gate access.
        Record storage recordDetails = patientRecords[patientAddress][recordId];
        require(recordDetails.exists, "PR: Record does not exist");
        return (recordDetails.dataHash, recordDetails.metadataHash, recordDetails.timestamp, recordDetails.owner);
    }

    function getRecordCount(address patientAddress) public view returns (uint256) {
        return patientRecordCounts[patientAddress];
    }

    function doesRecordExist(address patientAddress, uint256 recordId) public view returns (bool) {
        return patientRecords[patientAddress][recordId].exists;
    }
}
