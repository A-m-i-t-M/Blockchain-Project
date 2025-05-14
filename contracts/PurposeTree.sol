// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract PurposeTree {
    struct Purpose {
        string name;
        bool exists;
        uint256[] children; // Stores IDs of child purposes
    }

    mapping(uint256 => Purpose) public purposes;
    uint256 public purposeCount; // Acts as a counter for unique purpose IDs
    uint256 public rootPurposeId;

    event PurposeAdded(uint256 indexed id, string name, uint256 indexed parentId);

    constructor() {
        // ID 0 is implicitly reserved or unused, start with ID 1 for root
        rootPurposeId = _addPurposeInternal("root", 0); // Root has no parent (parentId 0)

        // Main categories (as per paper)
        uint256 educationId = _addPurposeInternal("Education", rootPurposeId);
        uint256 medicalTreatmentId = _addPurposeInternal("Medical_Treatment", rootPurposeId);
        uint256 insuranceId = _addPurposeInternal("Insurance", rootPurposeId);

        // Subcategories for Education
        _addPurposeInternal("Survey", educationId);
        _addPurposeInternal("Statistics", educationId);
        _addPurposeInternal("Discovery", educationId);

        // Subcategories for Medical Treatment
        _addPurposeInternal("Diagnosis", medicalTreatmentId);
        _addPurposeInternal("Report", medicalTreatmentId);
        _addPurposeInternal("Investigation", medicalTreatmentId);

        // Subcategories for Insurance
        _addPurposeInternal("Claim", insuranceId);
        _addPurposeInternal("Documentation", insuranceId);
    }

    function _addPurposeInternal(string memory name, uint256 parentId) private returns (uint256) {
        require(parentId == 0 || purposes[parentId].exists, "PT: Parent purpose does not exist");
        purposeCount++; // New ID for the purpose
        uint256 newPurposeId = purposeCount;

        purposes[newPurposeId] = Purpose({
            name: name,
            exists: true,
            children: new uint256[](0) // Initialize with empty children array
        });

        if (parentId != 0) {
            purposes[parentId].children.push(newPurposeId);
        }

        emit PurposeAdded(newPurposeId, name, parentId);
        return newPurposeId;
    }

    // Public function for adding purposes dynamically if needed (not used by constructor)
    function addPurpose(string memory name, uint256 parentId) public returns (uint256) {
        // Add admin control if this function is to be used post-deployment
        return _addPurposeInternal(name, parentId);
    }


    function getPurposeName(uint256 purposeId) public view returns (string memory) {
        require(purposes[purposeId].exists, "PT: Purpose does not exist");
        return purposes[purposeId].name;
    }

    function getChildren(uint256 purposeId) public view returns (uint256[] memory) {
        require(purposes[purposeId].exists, "PT: Purpose does not exist");
        return purposes[purposeId].children;
    }

    /**
     * @dev Checks if an accessPurposeId is allowed given an intendedPurposeId.
     *      Access is allowed if accessPurposeId is the same as or a descendant of intendedPurposeId.
     * @param accessPurposeId The purpose for which access is being requested.
     * @param consentedPurposeId The purpose for which consent was granted.
     */
    function isPurposeAllowed(uint256 accessPurposeId, uint256 consentedPurposeId) public view returns (bool) {
        require(purposes[accessPurposeId].exists, "PT: Access purpose does not exist");
        require(purposes[consentedPurposeId].exists, "PT: Consented purpose does not exist");

        if (accessPurposeId == consentedPurposeId) {
            return true;
        }
        return isDescendant(consentedPurposeId, accessPurposeId);
    }

    /**
     * @dev Checks if 'potentialDescendantId' is a descendant of 'ancestorId'.
     */
    function isDescendant(uint256 ancestorId, uint256 potentialDescendantId) public view returns (bool) {
        require(purposes[ancestorId].exists, "PT: Ancestor purpose does not exist");
        require(purposes[potentialDescendantId].exists, "PT: Potential descendant purpose does not exist");

        uint256[] memory children = purposes[ancestorId].children;
        for (uint256 i = 0; i < children.length; i++) {
            if (children[i] == potentialDescendantId) {
                return true;
            }
            // Recursively check in sub-children
            if (isDescendant(children[i], potentialDescendantId)) {
                return true;
            }
        }
        return false;
    }
}
