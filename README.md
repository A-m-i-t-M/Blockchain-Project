# Smart Patient Consent Management System on Blockchain

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) <!-- Optional: Add a license badge -->

A decentralized application (dApp) demonstrating a patient-centric model for managing consent over health information exchange using Ethereum smart contracts. This project allows patients to control who accesses their medical record metadata, for what purpose, and for specific actions, all recorded transparently on the blockchain.

---

## Table of Contents

1.  [About The Project](#about-the-project)
    *   [Problem Statement](#problem-statement)
    *   [Our Solution](#our-solution)
    *   [Inspiration](#inspiration)
2.  [Key Features](#key-features)
3.  [Technology Stack](#technology-stack)
4.  [Project Structure](#project-structure)
5.  [Getting Started](#getting-started)
    *   [Prerequisites](#prerequisites)
    *   [Installation](#installation)
6.  [Running the Project](#running-the-project)
    *   [1. Compile Smart Contracts](#1-compile-smart-contracts)
    *   [2. Test Smart Contracts](#2-test-smart-contracts)
    *   [3. Start Local Blockchain Node](#3-start-local-blockchain-node)
    *   [4. Deploy Smart Contracts](#4-deploy-smart-contracts)
    *   [5. Configure Frontend](#5-configure-frontend)
    *   [6. Run Frontend Server](#6-run-frontend-server)
    *   [7. Configure MetaMask](#7-configure-metamask)
7.  [Demonstration Scenarios](#demonstration-scenarios)
    *   [Scenario 1: Patient Adds Health Record](#scenario-1-patient-adds-health-record)
    *   [Scenario 2: Patient Grants Specific Consent](#scenario-2-patient-grants-specific-consent)
    *   [Scenario 3: Authorized Doctor Accesses Record (Access Granted)](#scenario-3-authorized-doctor-accesses-record-access-granted)
    *   [Scenario 4: Unauthorized Access Attempt (Access Denied - Wrong Purpose)](#scenario-4-unauthorized-access-attempt-access-denied---wrong-purpose)
    *   [Scenario 5: Patient Revokes Consent](#scenario-5-patient-revokes-consent)
    *   [Scenario 6: Access Attempt After Consent Revocation (Access Denied)](#scenario-6-access-attempt-after-consent-revocation-access-denied)
    *   [Scenario 7: Wallet Management (Connect/Disconnect/Switch)](#scenario-7-wallet-management-connectdisconnectswitch)
8.  [Future Enhancements](#future-enhancements)
9.  [Contributing](#contributing)
10. [License](#license)

---

## About The Project

### Problem Statement
Traditional patient consent systems often lack transparency, granular control, and efficient management, leading to privacy concerns and inefficiencies in health information exchange. Patients have limited visibility or agency over who accesses their data and for what specific reasons.

### Our Solution
This project leverages blockchain technology to create a secure, transparent, and patient-centric system for managing consent related to health information. Patients can grant, manage, and revoke consent with fine-grained control, and all consent transactions are immutably recorded on the blockchain. This implementation focuses on managing consent for access to *metadata* or pointers (like IPFS hashes) to off-chain health records, not the sensitive data itself.

### Inspiration
The core concepts are inspired by research in blockchain for healthcare, particularly models like the "Smart Consent Blockchain Based System" (SCBCS), emphasizing purpose-based access control and patient empowerment.

---

## Key Features

*   **Patient-Centric Control:** Patients manage consent for their record metadata.
*   **Granular Permissions:** Consent is based on:
    *   Specific Record ID
    *   Requestor Role (e.g., "Doctor", "Researcher")
    *   Specific Requestor ID (e.g., license number)
    *   Action (e.g., "Read", "Copy")
    *   Purpose (hierarchically defined, e.g., "Diagnosis" under "Medical Treatment")
*   **Smart Contract Automation:** Consent logic is enforced by Ethereum smart contracts.
*   **Purpose Hierarchy:** A `PurposeTree` contract defines and validates data access purposes.
*   **Record Metadata Management:** A `PatientRecords` contract manages pointers (hashes) to off-chain data.
*   **Transparent Consent Ledger:** All consent grants and revocations are blockchain transactions.
*   **Interactive Frontend:** A basic web interface for patients and requestors to interact with the system via MetaMask.
*   **Wallet Management:** Users can connect and disconnect their MetaMask wallets, and switch accounts.

---

## Technology Stack

*   **Solidity:** For writing smart contracts.
*   **Hardhat:** Ethereum development environment (compilation, testing, deployment, local blockchain).
*   **Ethers.js (v5):** JavaScript library for interacting with the Ethereum blockchain from the frontend.
*   **Node.js & npm:** JavaScript runtime and package manager.
*   **HTML, CSS, JavaScript:** For the basic frontend.
*   **MetaMask:** Browser extension wallet for transaction signing and identity management.
*   **Live Server:** Simple development server for the frontend.

---

## Project Structure

patient_consent_project/
├── contracts/ # Solidity smart contracts (PurposeTree.sol, PatientRecords.sol, ConsentManagement.sol)
├── scripts/ # Deployment script (deploy.js) and interaction scripts
├── test/ # Test files for smart contracts (ConsentManagement.test.js)
├── frontend/ # HTML (index.html), CSS (style.css), and JS (app.js) for the UI
├── artifacts/ # Compiled contract ABIs and bytecode (auto-generated)
├── cache/ # Hardhat cache (auto-generated)
├── node_modules/ # Project dependencies (auto-generated)
├── .gitignore # Specifies intentionally untracked files
├── hardhat.config.js # Hardhat configuration file
├── package.json # npm project manifest
└── README.md # This file

---

## Getting Started

Follow these instructions to set up and run the project on your local machine.

### Prerequisites

*   **Node.js & npm:** Download and install from [nodejs.org](https://nodejs.org/) (v18+ recommended).
*   **MetaMask:** Install the browser extension from [metamask.io](https://metamask.io/).
*   **Git:** For cloning the repository (if applicable).
*   **A code editor:** Like VS Code.
*   **(Optional) `live-server` globally installed:**
    ```
    npm install -g live-server
    ```

### Installation

1.  **Clone the repository (if you have one):**
    ```
    git clone <your-repository-url>
    cd patient_consent_project
    ```
    If you don't have a repo yet, simply create a project folder (`mkdir patient_consent_project && cd patient_consent_project`) and place the provided code files in their respective directories.

2.  **Install Project Dependencies:**
    Open a terminal in the project root directory and run:
    ```
    npm install
    ```

---

## Running the Project

You'll typically need two terminal windows/tabs open in your project root directory.

### 1. Compile Smart Contracts
This step checks for errors and generates necessary files for deployment and interaction.
*   **In Terminal 2:**
    ```
    npx hardhat compile
    ```
    *Expected Output: "Compiled X Solidity files successfully" or "Nothing to compile."*

### 2. Test Smart Contracts (Recommended)
Verify the core logic of your smart contracts.
*   **In Terminal 2:**
    ```
    npx hardhat test
    ```
    *Expected Output: All tests related to `Patient Consent Management System` should pass (e.g., "17 passing").*

### 3. Start Local Blockchain Node
This runs a local Ethereum instance for development.
*   **In Terminal 1:**
    ```
    npx hardhat node
    ```
    *Expected Output: "Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/" and a list of 20 test accounts with private keys.*
    **Keep this terminal running.**

### 4. Deploy Smart Contracts
Deploy your compiled contracts to the local Hardhat node.
*   **In Terminal 2:**
    ```
    npx hardhat run scripts/deploy.js --network localhost
    ```
    *Expected Output: The script will log the deployed addresses for `PurposeTree`, `PatientRecords`, and `ConsentManagement`.*
    **Action Required: Copy these deployed contract addresses.**

### 5. Configure Frontend
The frontend needs to know where your contracts are deployed and how to talk to them.
1.  Open `frontend/app.js` in your code editor.
2.  **Update Contract Addresses:**
    *   Find `consentManagementAddress` and `patientRecordsAddress`.
    *   Replace the placeholder addresses with the actual addresses you copied from Step 4.
3.  **Update Contract ABIs:**
    *   Locate the ABI JSON files in `artifacts/contracts/YourContract.sol/YourContract.json`.
    *   For `ConsentManagement.json`, copy the entire array value of the `"abi": [...]` key.
    *   Paste this array into `frontend/app.js` for the `consentManagementABI` variable.
    *   Repeat for `PatientRecords.json` and the `patientRecordsABI` variable.
4.  Save `frontend/app.js`.

### 6. Run Frontend Server
Serve your `index.html` and associated files.
*   **In Terminal 2** (navigate to the `frontend` directory first):
    ```
    cd frontend
    live-server
    ```
    *Expected Output: `live-server` will start and usually open `index.html` in your default browser (e.g., at `http://127.0.0.1:8080`).*

### 7. Configure MetaMask
Connect MetaMask to your local Hardhat node and import test accounts.
1.  **Add Hardhat Network to MetaMask:**
    *   Open MetaMask -> Network Dropdown -> Add Network (or Custom RPC).
    *   **Network Name:** `Hardhat Localhost` (or similar)
    *   **New RPC URL:** `http://127.0.0.1:8545`
    *   **Chain ID:** `1337`
    *   **Currency Symbol:** `ETH`
    *   Save.
2.  **Import Test Accounts:**
    *   From the **Terminal 1** (Hardhat Node output), copy a **Private Key** for at least two accounts.
    *   In MetaMask -> Account Icon -> Import Account -> Paste Private Key -> Import.
    *   Repeat for a second account. Name them (e.g., "Patient Demo," "Doctor Demo") in MetaMask if helpful.
3.  **Select an Account:** Ensure one of your imported Hardhat accounts is active in MetaMask.

---

## Demonstration Scenarios

Follow these scenarios to demonstrate the dApp's functionality. Use the browser's Developer Console (F12) to monitor logs.

### Scenario 1: Patient Adds Health Record
*   **Actor:** Patient
*   **MetaMask Account:** Switch to/select your "Patient Demo Account".
1.  **Connect Wallet:** On the dApp webpage, click "Connect Wallet". Approve in MetaMask. The UI should show the patient's address.
2.  **Add Record:**
    *   In the "Add Health Record" section, enter example IPFS hashes for "Data" and "Metadata".
    *   Click "Add Record". Confirm the transaction in MetaMask.
    *   **Observe:** The UI should show a success message with a transaction hash and a **Record ID** (e.g., `1`). Note this ID.

### Scenario 2: Patient Grants Specific Consent
*   **Actor:** Patient
*   **MetaMask Account:** "Patient Demo Account".
1.  **Grant Consent:**
    *   In the "Grant Consent" section:
        *   **Record ID:** Enter the ID from Scenario 1 (e.g., `1`).
        *   **Requestor Role:** `Doctor`
        *   **Requestor Specific ID:** `DrDemoLicense123`
        *   **Action:** `Read (0)`
        *   **Consented Purpose ID:** `8` (for Diagnosis)
    *   Click "Grant Consent". Confirm in MetaMask.
    *   **Observe:** UI shows consent granted successfully.

### Scenario 3: Authorized Doctor Accesses Record (Access Granted)
*   **Actor:** Doctor
*   **MetaMask Account:** Switch to your "Doctor Demo Account". The dApp UI should update to this new account (or refresh page/reconnect wallet).
1.  **Access Record:**
    *   In the "Access Patient Record" section:
        *   **Patient's Address:** Enter the address of your "Patient Demo Account".
        *   **Record ID:** `1`.
        *   **Your Role:** `Doctor`.
        *   **Your Specific ID:** `DrDemoLicense123`.
        *   **Action:** `Read (0)`.
        *   **Access Purpose ID:** `8`.
    *   Click "Request & Access Record". Confirm in MetaMask.
    *   **Observe:** UI should show "Access Granted!" and display the record's IPFS hashes.

### Scenario 4: Unauthorized Access Attempt (Access Denied - Wrong Purpose)
*   **Actor:** Doctor
*   **MetaMask Account:** "Doctor Demo Account".
1.  **Attempt Access with Wrong Purpose:**
    *   In "Access Patient Record", use the same details as Scenario 3, but change:
        *   **Access Purpose ID:** `6` (for Statistics).
    *   Click "Request & Access Record". Confirm in MetaMask.
    *   **Observe:** UI should show "Access Denied..." with a reason like "CM: Access denied".

### Scenario 5: Patient Revokes Consent
*   **Actor:** Patient
*   **MetaMask Account:** Switch back to "Patient Demo Account". Verify UI updates.
1.  **Revoke Consent:**
    *   In the "Revoke Consent" section:
        *   **Record ID:** `1`.
        *   **Internal Consent Counter:** `1` (as it was the first consent for this record by this patient).
    *   Click "Revoke Consent". Confirm in MetaMask.
    *   **Observe:** UI shows consent revoked successfully.

### Scenario 6: Access Attempt After Consent Revocation (Access Denied)
*   **Actor:** Doctor
*   **MetaMask Account:** Switch back to "Doctor Demo Account". Verify UI updates.
1.  **Attempt Access Again:**
    *   In "Access Patient Record", use the exact same details that *previously granted access* in Scenario 3.
    *   Click "Request & Access Record". Confirm in MetaMask.
    *   **Observe:** UI must now show "Access Denied...".

### Scenario 7: Wallet Management (Connect/Disconnect/Switch)
1.  **Disconnect Wallet:**
    *   While any account is connected, click the "Disconnect" button.
    *   **Observe:** The UI should update to "Not Connected", the "Connect Wallet" button should reappear, and the "Disconnect" button should hide. Application state (signer, contracts) is cleared.
2.  **Switch Account & Reconnect:**
    *   In MetaMask, switch to a different imported Hardhat account.
    *   On the dApp, click "Connect Wallet".
    *   Approve the connection for this new account in MetaMask.
    *   **Observe:** The dApp should now be connected with the newly selected account.

---

## Future Enhancements

*   **More Robust Revocation:** Implement revocation by global `consentId`.
*   **Query Functions:** Allow patients/doctors to view active consents and record lists.
*   **Time-Bound Consents:** Add expiry dates to consents.
*   **Admin Roles:** For managing the `PurposeTree` post-deployment.
*   **Event Indexing:** For a production dApp, index blockchain events off-chain for faster querying and display of history.
*   **Advanced Frontend:** Utilize a framework like React/Vue/Svelte for a more dynamic UI.
*   **Data Encryption/Decryption Flow:** Integrate a conceptual flow for how encrypted off-chain data would be handled.

---

## Contributing

Contributions are welcome! If you'd like to contribute, please fork the repository and submit a pull request. For major changes, please open an issue first to discuss what you would like to change.

<!-- Optional:
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
-->

---

## License

Distributed under the MIT License. See `LICENSE` file for more information (if you add one).
