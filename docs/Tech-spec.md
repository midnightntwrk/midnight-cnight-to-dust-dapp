# **cNIGHT Generates DUST DApp**

# **Functional & Technical Specification**

## **Project overview**

The cNIGHT Generates DUST DApp enables users to register their Cardano wallet addresses containing cNIGHT tokens with corresponding Midnight wallet addresses, allowing them to generate DUST tokens based on their cNIGHT holdings through Midnight's generation and decay system.

This specification defines the technical architecture, user workflows, and implementation approach for delivering a privacy-preserving cross-chain DApp that bridges Cardano and Midnight networks.

## **Core functionality**

### **Address mapping system**

Users register a mapping between their Cardano wallet address (containing cNIGHT tokens) and their Midnight wallet address to enable DUST generation. The system supports:

* One-to-one address mapping per user.  
* On-chain registration via Cardano smart contract.  
* Mapping updates and deregistration capabilities.  
* Real-time validation of wallet connections.

### **DUST generation tracking**

The DApp displays DUST token generation and decay cycles based on registered cNIGHT holdings:

* Real-time DUST balance visualization (shielded information)  
* Generation timeline charts showing token accrual  
* Decay progression tracking with time-based calculations

### **Privacy-preserving interface**

Following Midnight's privacy-first approach, the DApp ensures:

* Shielded DUST balance visibility only to wallet owners  
* Clear separation between public and private data  
* Client-side balance calculations for enhanced privacy

## **Technical architecture**

### **Frontend framework**

**Technology stack:**

* Next.js with TypeScript for type-safe development  
* React-based component architecture  
* Tailwind CSS for styling consistency  
* Client-side state management for sensitive data

### **Wallet integration layer**

#### **Cardano wallet connectivity**

**Lucid Evolution integration:**

* Custom wrapper implementation for multiple wallet support  
* Compatible wallets: Lace, Eternl, Nami, and other CIP-30 compliant wallets  
* Wallet-agnostic connection interface  
* cNIGHT balance detection and display

#### **Midnight wallet connectivity**

**Custom adapter development:**

* Lucid Evolution pattern adaptation for Midnight Wallet API  
* Integration with Midnight Lace wallet via [Midnight Wallet API](https://docs.midnight.network/develop/reference/midnight-api/wallet-api/globals)  
* Shielded balance retrieval using viewing keys  
* Transaction signing capabilities for address registration

### **Cross-chain integration**

#### **Cardano smart contract integration**

**Mapping validator contract:** The Cardano smart contract for address mapping is provided by the Midnight Engineering Team. Implementation details, contract interface, and integration patterns are pending delivery from their development team.

**Expected functionality:**

* Address registration transactions  
* Mapping validation and storage  
* Deregistration transaction support  
* Mapping addresses update  
* On-chain mapping verification

#### **DUST generation data source**

**Data connectivity:** The specific protocol and endpoints for accessing DUST generation and decay data are currently being defined by the Midnight Engineering Team. The following represents our planned approach pending their technical specifications. 

**Anticipated integration points:**

* Real-time DUST balance queries  
* Generation and decay cycle data  
* Historical transaction information  
* Live update mechanism (WebSocket or polling-based)

### **Data visualization components**

#### **Balance tracking interface**

**Chart implementations:**

* Timeline visualization for DUST generation cycles  
* Balance over time progression charts  
* Decay timeline with predictive calculations  
* Interactive data points with detailed tooltips

**Real-time updates:**

* Live balance synchronization  
* Automatic chart updates on new data  
* Connection status indicators  
* Data refresh mechanisms

### **Configuration management**

**Mapping updates:**

* Modify registered Midnight address  
* Transaction confirmation workflow  
* Updated mapping verification

**Deregistration process:**

* Remove address mapping to stop DUST generation  
* On-chain deregistration transaction  
* Confirmation of mapping removal

## **Security considerations**

### **Wallet security**

* No private key handling within the DApp  
* Secure wallet extension integration  
* Transaction signing via connected wallets only  
* Client-side sensitive data processing

### **Privacy protection**

* Shielded balance calculations performed locally  
* No server-side storage of sensitive information  
* Viewing key management through wallet integration  
* ZK proof verification without content exposure

### **Cross-chain validation**

* Address mapping verification on both networks  
* Transaction confirmation across chains  
* Invalid mapping detection and prevention  
* Fallback mechanisms for connection failures

## **Integration dependencies**

### **Midnight Engineering Team deliverables**

**Critical dependencies requiring coordination:**

1. **Cardano mapping validator contract**

   * Smart contract deployment details  
   * Contract interface and ABI specifications  
   * Integration documentation and examples  
   * Testnet deployment endpoints  
2. **DUST generation data access**

   * API endpoints or GraphQL schema  
   * Authentication and authorization mechanisms  
   * Real-time update protocols (WebSocket/polling)  
   * Data format specifications and examples  
3. **Cross-chain event handling (documentation)**

   * CMST (Cardano-based Midnight System Transactions) integration  
   * Event listening and processing patterns  
   * Error handling and retry mechanisms  
   * Synchronization protocols between networks

### **External dependencies**

* Cardano node access for transaction submission  
* Midnight Indexer API for blockchain data  
* Wallet extension APIs (CIP-30 compliance)  
* Midnight Wallet API for shielded operations

### **UX Definitions**

**Main Users Persona**

**[Midnight Personas – Mar 2024](https://docs.google.com/presentation/d/1AGf-alw_T26ijjzfd6mD4bjgJcgNwBbBhxBLFkIsxP0/edit?slide=id.g208a57ecb5b_0_13#slide=id.g208a57ecb5b_0_13)**

**Main Workflows**

**1\. Connect Cardano Wallet**

User Story: *"I want to connect my Cardano wallet to the DApp."*

1. User opens the DApp landing page.  
2. Clicks Connect Wallet.  
3. DApp requests access using CIP-30 compatible wallets (e.g., Lace, Eternl, Nami).  
4. System retrieves wallet address and verifies connection.  
5. DApp checks the backend for existing mapping status.  
   * If registered → Proceed to View DUST Status workflow.  
   * If not registered → Proceed to Register Mapping workflow.

### **2\. Register Mapping**

User Story: *"I want to register a mapping between my Cardano wallet and my Midnight DUST address."*

1. User enters or selects a Midnight DUST address.  
2. DApp validates:  
   * The connected Cardano wallet holds cNIGHT tokens.  
   * The Midnight address format is valid.

3. User confirms mapping.  
4. Wallet prompts for transaction signing to store mapping on-chain.  
5. Backend updates state and confirms mapping registration.  
6. User is redirected to View DUST Status.

### **3\. Update DUST Address**

User Story: *"I want to change the DUST address where my generated DUST is sent."*

1. From the dashboard, user selects Update DUST Address.  
2. Enters new Midnight DUST address.  
3. DApp validates new address format.  
4. Wallet prompts for transaction signing to update mapping on-chain.  
5. Backend updates mapping and confirms the change.  
6. Dashboard refreshes with updated address.

### **4\. Deregister from DUST Production**

User Story: *"I want to pause production or prevent new DUST issuance."*

1. From the dashboard, user selects Stop DUST Production.  
2. Confirms deregistration action.  
3. Wallet prompts for transaction signing to remove mapping.  
4. Backend updates status to stop new DUST generation.  
5. Dashboard reflects “Not Registered” state.

### **5\. Resync After Chain Events**

User Story: *"I want to recover or re-register after address loss, accidental deregistration, or chain reorganization."*

1. User connects to the Cardano wallet.  
2. Backend detects:  
   * Missing or outdated mapping record.  
   * Chain reorganization affecting registration UTxO.  
3. DApp prompts the user to re-enter or confirm their Midnight DUST address.  
4. User signs a re-registration transaction.  
5. Backend verifies UTxO and mapping, then restores DUST production.

### **6\. View DUST Balance and Production Status**

User Story: *"I want to see how much DUST I've generated from my cNIGHT holdings."*

1. User accesses the dashboard.  
2. Backend sends:  
   * Total generated DUST balance.  
   * Status of current production (active/inactive).  
3. DApp decrypts balance locally using a viewing key.  
4. Dashboard displays:  
   * Current DUST balance.  
   * Generation rate and decay timeline.  
   * Graph of production history.

### **7\. Display UTxO Status and Activation**

User Story: *"I want to see which of my UTxOs are producing DUST."*

1. From the dashboard, user opens UTxO Details.  
2. Backend provides a list of UTxOs and their production status.  
3. DApp shows:  
   * Active UTxOs generating DUST.  
   * Inactive UTxOs and reasons (e.g., not eligible, deregistered).  
4. User can filter or sort UTxOs for clarity.

**UI Definitions**

**Branding definitions**  
Branding for the cNgD DApp will follow the Midnight Foundation branding available in this Midnight Figma Library [Figma](https://www.figma.com/design/0UaTsJ35DzwT3bauMmg4lr/Midnight-3.2-Component-Library?node-id=7-14&t=LeMO8h8VxqzvT387-1)

