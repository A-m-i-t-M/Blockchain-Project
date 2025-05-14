// --- Global Variables ---
let provider;
let signer;
let currentAccount;
let consentManagementContract;
let patientRecordsContract;

// --- Deployed Contract Addresses ---
// IMPORTANT: These MUST be correct after deploying your contracts.
const consentManagementAddress = "use your deployed address"; // Example, use your deployed address
const patientRecordsAddress = "use your deployed address"; // Example, use your deployed address

// --- Contract ABIs ---
// IMPORTANT: Ensure these are the complete and correct ABI arrays from your artifact JSON files.
const consentManagementABI = [/*copy the entire array value from ConsentManagement.json*/];
const patientRecordsABI = [/*copy the entire array value from PatientRecords.json*/];


// --- DOM Elements ---
const connectWalletBtn = document.getElementById('connectWalletBtn');
const disconnectWalletBtn = document.getElementById('disconnectWalletBtn'); // New
const connectedAccountSpan = document.getElementById('connectedAccount');
const walletAddressSpans = document.querySelectorAll('.walletAddress');

const dataHashInput = document.getElementById('dataHash');
const metadataHashInput = document.getElementById('metadataHash');
const addRecordBtn = document.getElementById('addRecordBtn');
const recordStatusSpan = document.getElementById('recordStatus');

const consentRecordIdInput = document.getElementById('consentRecordId');
const consentRoleInput = document.getElementById('consentRole');
const consentRequestorIdInput = document.getElementById('consentRequestorId');
const consentActionSelect = document.getElementById('consentAction');
const consentedPurposeIdInput = document.getElementById('consentedPurposeId');
const grantConsentBtn = document.getElementById('grantConsentBtn');
const grantStatusSpan = document.getElementById('grantStatus');

const accessPatientAddressInput = document.getElementById('accessPatientAddress');
const accessRecordIdInput = document.getElementById('accessRecordId');
const accessRoleInput = document.getElementById('accessRole');
const accessRequestorIdInput = document.getElementById('accessRequestorId');
const accessActionSelect = document.getElementById('accessAction');
const accessPurposeIdInput = document.getElementById('accessPurposeId');
const accessRecordBtn = document.getElementById('accessRecordBtn');
const accessResultSpan = document.getElementById('accessResult');

const revokeRecordIdInput = document.getElementById('revokeRecordId');
const revokeInternalCounterInput = document.getElementById('revokeInternalCounter');
const revokeConsentBtn = document.getElementById('revokeConsentBtn');
const revokeStatusSpan = document.getElementById('revokeStatus');

console.log("app.js loaded");

// --- Initialization ---
window.addEventListener('load', async () => {
    console.log("Window loaded. Initializing dApp.");

    connectWalletBtn.addEventListener('click', connectWallet);
    disconnectWalletBtn.addEventListener('click', disconnectWallet); // New
    addRecordBtn.addEventListener('click', addRecord);
    grantConsentBtn.addEventListener('click', grantConsent);
    accessRecordBtn.addEventListener('click', accessRecord);
    revokeConsentBtn.addEventListener('click', revokeConsent);

    if (typeof window.ethereum !== 'undefined') {
        console.log('MetaMask is installed!');
        provider = new ethers.providers.Web3Provider(window.ethereum);
        console.log("Ethers provider initialized.");

        window.ethereum.on('accountsChanged', (accounts) => {
            console.log("MetaMask accountsChanged event detected:", accounts);
            handleAccountsChanged(accounts);
        });

        window.ethereum.on('chainChanged', (chainId) => {
            console.log("MetaMask chainChanged event detected, chainId:", chainId);
            window.location.reload();
        });

        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            console.log("Initial eth_accounts check returned:", accounts);
            if (accounts.length > 0) {
                handleAccountsChanged(accounts);
            } else {
                console.log("No accounts initially permitted or found.");
                updateUIForDisconnection();
            }
        } catch (err) {
            console.error("Error fetching initial accounts on load:", err);
            updateUIForDisconnection();
        }
    } else {
        console.error("MetaMask not detected! Please install MetaMask.");
        alert('MetaMask is not installed! Please install MetaMask to use this dApp.');
        connectWalletBtn.disabled = true;
    }
});

function updateUIForDisconnection() {
    currentAccount = null;
    signer = null;
    patientRecordsContract = null;
    consentManagementContract = null;

    connectedAccountSpan.textContent = 'Not Connected';
    connectedAccountSpan.className = "status status-neutral";
    walletAddressSpans.forEach(span => {
        span.textContent = 'N/A';
        span.className = "walletAddress status-neutral";
    });

    connectWalletBtn.textContent = 'Connect Wallet';
    connectWalletBtn.style.display = 'inline-flex';
    connectWalletBtn.disabled = false;
    disconnectWalletBtn.style.display = 'none';

    console.log("UI updated for disconnected state. Contracts and signer cleared.");
}

function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        console.log('No accounts available from MetaMask or user disconnected.');
        updateUIForDisconnection();
    } else {
        const newAccount = accounts[0];
        // Only proceed if the account is actually new or if contracts aren't initialized yet
        // This helps prevent redundant re-initializations if accountsChanged fires without an actual change
        if (newAccount !== currentAccount || !patientRecordsContract || !consentManagementContract) {
            console.log(`Account changed/connected: ${newAccount}`);
            currentAccount = newAccount;
            signer = provider.getSigner();
            console.log("Signer updated for new account:", currentAccount);

            connectedAccountSpan.textContent = `${currentAccount.substring(0, 6)}...${currentAccount.substring(currentAccount.length - 4)}`;
            connectedAccountSpan.className = "status status-success";
            walletAddressSpans.forEach(span => {
                span.textContent = `${currentAccount.substring(0, 6)}...${currentAccount.substring(currentAccount.length - 4)}`;
                span.className = "walletAddress status-success";
            });

            connectWalletBtn.style.display = 'none';
            disconnectWalletBtn.style.display = 'inline-flex';

            initializeContractInstances();
        } else {
            console.log("handleAccountsChanged called but account is the same and contracts likely initialized:", currentAccount);
        }
    }
}

async function connectWallet() {
    console.log("Connect Wallet button clicked.");
    if (!provider) {
        alert("MetaMask provider not available. Please ensure MetaMask is installed and enabled.");
        console.error("Provider not available in connectWallet.");
        return;
    }
    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        console.log("eth_requestAccounts successful:", accounts);
        // The 'accountsChanged' event should ideally handle the update.
        // However, explicitly calling handleAccountsChanged ensures state update if the event is delayed or not fired for a fresh connection.
        handleAccountsChanged(accounts);
    } catch (err) {
        console.error("Error requesting accounts:", err);
        alert(`Error connecting wallet: ${err.message || "User rejected the request."}`);
        updateUIForDisconnection();
    }
}

async function disconnectWallet() {
    console.log("Disconnect Wallet button clicked.");
    updateUIForDisconnection(); // Resets app state and UI

    // Optional: Attempt to make MetaMask revoke permissions
    if (window.ethereum && window.ethereum.request) {
        try {
            console.log("Attempting to revoke wallet permissions via wallet_revokePermissions...");
            await window.ethereum.request({
                method: "wallet_revokePermissions",
                params: [{ "eth_accounts": {} }]
            });
            console.log("wallet_revokePermissions request sent. User may need to confirm in MetaMask if supported, or it might clear permissions silently.");
            // After this, MetaMask might emit 'accountsChanged' with an empty array,
            // which would re-trigger updateUIForDisconnection() via handleAccountsChanged.
        } catch (error) {
            console.error("Error during wallet_revokePermissions:", error);
            if (error.code === 4001) { // User rejected the request
                console.log("User rejected the revoke permissions request.");
            } else {
                console.log("wallet_revokePermissions might not be supported by this wallet or another error occurred.");
            }
        }
    }
    // Ensure UI is fully in disconnected state again, as accountsChanged might re-trigger things.
    updateUIForDisconnection();
}


function initializeContractInstances() {
    if (!signer || !currentAccount) {
        console.error("Cannot initialize contract instances: Signer or current account is missing.");
        return;
    }

    if (consentManagementAddress === "YOUR_CONSENT_MANAGEMENT_CONTRACT_ADDRESS" || !consentManagementABI || consentManagementABI.length === 0) {
        alert("FATAL ERROR: ConsentManagement contract address or ABI is not configured correctly in app.js!");
        console.error("FATAL ERROR: ConsentManagement contract address or ABI configuration issue.");
        updateUIForDisconnection();
        return;
    }
    if (patientRecordsAddress === "YOUR_PATIENT_RECORDS_CONTRACT_ADDRESS" || !patientRecordsABI || patientRecordsABI.length === 0) {
        alert("FATAL ERROR: PatientRecords contract address or ABI is not configured correctly in app.js!");
        console.error("FATAL ERROR: PatientRecords contract address or ABI configuration issue.");
        updateUIForDisconnection();
        return;
    }

    try {
        patientRecordsContract = new ethers.Contract(patientRecordsAddress, patientRecordsABI, signer);
        consentManagementContract = new ethers.Contract(consentManagementAddress, consentManagementABI, signer);
        console.log("Smart contract instances successfully initialized for account:", currentAccount);
    } catch (error) {
        console.error("Error during ethers.Contract instantiation:", error);
        alert("Error initializing smart contract instances. Check ABI/Address and console for details.");
        patientRecordsContract = null;
        consentManagementContract = null;
        updateUIForDisconnection();
    }
}

function setProcessingUI(buttonElement, statusSpanElement, isProcessing) {
    if (isProcessing) {
        statusSpanElement.textContent = "Processing... Please wait.";
        statusSpanElement.className = "status status-processing";
        buttonElement.disabled = true;
    } else {
        buttonElement.disabled = false;
    }
}

async function addRecord() {
    console.log("addRecord called. Signer:", signer, "PatientRecordsContract:", patientRecordsContract);
    if (!patientRecordsContract || !signer) {
        alert("Please connect your wallet and ensure contracts are initialized before adding a record.");
        recordStatusSpan.textContent = "Wallet/Contracts not ready.";
        recordStatusSpan.className = "status status-error";
        return;
    }
    const dataHash = dataHashInput.value;
    const metadataHash = metadataHashInput.value;

    if (!dataHash.trim()) {
        alert("Data Hash cannot be empty.");
        recordStatusSpan.textContent = "Data Hash empty.";
        recordStatusSpan.className = "status status-error";
        return;
    }

    setProcessingUI(addRecordBtn, recordStatusSpan, true);
    try {
        const tx = await patientRecordsContract.addRecord(dataHash, metadataHash);
        console.log("addRecord transaction sent:", tx.hash);
        const receipt = await tx.wait();
        console.log("addRecord transaction mined:", receipt);

        let recordId = "N/A";
        if (receipt.logs) {
            const iface = new ethers.utils.Interface(patientRecordsABI);
            for (const log of receipt.logs) {
                try {
                    const parsedLog = iface.parseLog(log);
                    if (parsedLog.name === "RecordAdded") {
                        recordId = parsedLog.args.recordId.toString();
                        break;
                    }
                } catch (e) { console.warn("Could not parse a log for RecordAdded event:", e); }
            }
        }
        recordStatusSpan.textContent = `Record added! Tx: ${tx.hash.substring(0,10)}... Record ID: ${recordId}`;
        recordStatusSpan.className = "status status-success";
    } catch (error) {
        console.error("Error adding record:", error);
        recordStatusSpan.textContent = `Error: ${error.reason || error.message || "Transaction failed"}`;
        recordStatusSpan.className = "status status-error";
    } finally {
        setProcessingUI(addRecordBtn, recordStatusSpan, false);
    }
}

async function grantConsent() {
    if (!consentManagementContract || !signer) {
        alert("Please connect your wallet and ensure contracts are initialized before granting consent.");
        grantStatusSpan.textContent = "Wallet/Contracts not ready.";
        grantStatusSpan.className = "status status-error";
        return;
    }
    const recordId = parseInt(consentRecordIdInput.value);
    const role = consentRoleInput.value.trim();
    const requestorId = consentRequestorIdInput.value.trim();
    const action = parseInt(consentActionSelect.value);
    const purposeId = parseInt(consentedPurposeIdInput.value);

    if (isNaN(recordId) || recordId <= 0 || !role || !requestorId || isNaN(action) || isNaN(purposeId) || purposeId <= 0) {
        alert("All fields for granting consent are required and must be valid positive numbers where applicable.");
        grantStatusSpan.textContent = "Invalid input.";
        grantStatusSpan.className = "status status-error";
        return;
    }

    setProcessingUI(grantConsentBtn, grantStatusSpan, true);
    try {
        const tx = await consentManagementContract.grantConsent(recordId, role, requestorId, action, purposeId);
        console.log("grantConsent transaction sent:", tx.hash);
        await tx.wait();
        console.log("grantConsent transaction mined");
        grantStatusSpan.textContent = `Consent granted! Tx: ${tx.hash.substring(0,10)}...`;
        grantStatusSpan.className = "status status-success";
    } catch (error) {
        console.error("Error granting consent:", error);
        grantStatusSpan.textContent = `Error: ${error.reason || error.message || "Transaction failed"}`;
        grantStatusSpan.className = "status status-error";
    } finally {
        setProcessingUI(grantConsentBtn, grantStatusSpan, false);
    }
}

async function revokeConsent() {
    if (!consentManagementContract || !signer) {
        alert("Please connect your wallet and ensure contracts are initialized.");
        revokeStatusSpan.textContent = "Wallet/Contracts not ready.";
        revokeStatusSpan.className = "status status-error";
        return;
    }
    const recordId = parseInt(revokeRecordIdInput.value);
    const internalCounter = parseInt(revokeInternalCounterInput.value);

    if (isNaN(recordId) || isNaN(internalCounter) || recordId <= 0 || internalCounter <= 0) {
        alert("Record ID and Internal Consent Counter must be valid positive numbers.");
        revokeStatusSpan.textContent = "Invalid input.";
        revokeStatusSpan.className = "status status-error";
        return;
    }

    setProcessingUI(revokeConsentBtn, revokeStatusSpan, true);
    try {
        console.log(`Attempting to revoke consent for Record ID: ${recordId}, Internal Counter: ${internalCounter}`);
        const tx = await consentManagementContract.revokeConsentByInternalId(recordId, internalCounter);
        console.log("Revoke transaction sent:", tx.hash);
        await tx.wait();
        console.log("Revoke transaction mined");
        revokeStatusSpan.textContent = `Consent revoked! Tx: ${tx.hash.substring(0,10)}...`;
        revokeStatusSpan.className = "status status-success";
    } catch (error) {
        console.error("Error revoking consent:", error);
        revokeStatusSpan.textContent = `Error: ${error.reason || error.message || "Transaction failed"}`;
        revokeStatusSpan.className = "status status-error";
    } finally {
        setProcessingUI(revokeConsentBtn, revokeStatusSpan, false);
    }
}

async function accessRecord() {
    if (!consentManagementContract || !patientRecordsContract || !signer) {
        alert("Please connect your wallet and ensure contracts are initialized before accessing a record.");
        accessResultSpan.textContent = "Wallet/Contracts not ready.";
        accessResultSpan.className = "status status-error";
        return;
    }
    const patientAddress = accessPatientAddressInput.value.trim();
    const recordId = parseInt(accessRecordIdInput.value);
    const role = accessRoleInput.value.trim();
    const requestorId = accessRequestorIdInput.value.trim();
    const action = parseInt(accessActionSelect.value);
    const purposeId = parseInt(accessPurposeIdInput.value);

    if (!ethers.utils.isAddress(patientAddress) || isNaN(recordId) || recordId <= 0 || !role || !requestorId || isNaN(action) || isNaN(purposeId) || purposeId <= 0) {
        alert("All fields for accessing record are required and must be valid. Patient address must be a valid Ethereum address.");
        accessResultSpan.textContent = "Invalid input.";
        accessResultSpan.className = "status status-error";
        return;
    }

    setProcessingUI(accessRecordBtn, accessResultSpan, true);
    try {
        console.log("Attempting to call requestAndAccessRecord...");
        const tx = await consentManagementContract.requestAndAccessRecord(
            patientAddress, recordId, role, requestorId, action, purposeId
        );
        console.log("requestAndAccessRecord transaction sent:", tx.hash);
        const receipt = await tx.wait();
        console.log("requestAndAccessRecord transaction mined:", receipt);

        let accessGrantedByEvent = false;
        if (receipt.logs) {
            const iface = new ethers.utils.Interface(consentManagementABI);
            for (const log of receipt.logs) {
                try {
                    const parsedLog = iface.parseLog(log);
                    if (parsedLog.name === "AccessAttempt" && parsedLog.args.granted) {
                        accessGrantedByEvent = true;
                        break;
                    } else if (parsedLog.name === "AccessAttempt" && !parsedLog.args.granted) {
                        accessGrantedByEvent = false; // Explicitly set if event shows not granted
                        break;
                    }
                } catch (e) { console.warn("Could not parse a log for AccessAttempt event:", e); }
            }
        }

        if (accessGrantedByEvent) {
            console.log("Access granted by event, now fetching record details...");
            const recordDetails = await patientRecordsContract.getRecord(patientAddress, recordId);
            const eventDataHash = recordDetails[0];
            const eventMetadataHash = recordDetails[1];

            accessResultSpan.textContent = `Access Granted! Data Hash: ${eventDataHash}, Meta: ${eventMetadataHash}`;
            accessResultSpan.className = "status status-success";
            console.log("Access granted. Data:", { dataHash: eventDataHash, metadataHash: eventMetadataHash });
        } else {
            // If the transaction succeeded but the "AccessAttempt" event (with granted=true) was not found,
            // or if it explicitly stated granted=false.
            // A revert due to `require(hasAccess...)` in Solidity should be caught by the main catch block.
            accessResultSpan.textContent = `Access Denied (or event indicated no grant). Tx: ${tx.hash.substring(0,10)}...`;
            accessResultSpan.className = "status status-error";
        }

    } catch (error) {
        console.error("Error accessing record:", error);
        accessResultSpan.textContent = `Access Denied or Error: ${error.reason || error.message || "Transaction failed"}`;
        accessResultSpan.className = "status status-error";
    } finally {
        setProcessingUI(accessRecordBtn, accessResultSpan, false);
    }
}
