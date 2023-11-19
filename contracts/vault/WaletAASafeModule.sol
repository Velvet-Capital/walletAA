// SPDX-License-Identifier: BUSL-1.1

/**
 * @title WaletAA - Safe Module for a particular Index
 * @author Velvet.Capital
 * @notice This contract is used for creating a bridge between the contract and the gnosis safe vault
 * @dev This contract includes functionalities:
 *      1. Add a new owner of the vault
 *      2. Transfer BNB and other tokens to and fro from vault
 */
pragma solidity 0.8.16;

import {Module, Enum} from "@gnosis.pm/zodiac/contracts/core/Module.sol";
import {TransferHelper} from "@uniswap/lib/contracts/libraries/TransferHelper.sol";
import {ErrorLibrary} from "../library/ErrorLibrary.sol";

contract WaletAASafeModule is Module {
  address public multiSendLibrary;
  /// @param _worldId The WorldID instance that will verify the proofs
	/// @param _appId The World ID app ID
	/// @param _actionId The World ID action ID
	constructor(IWorldID _worldId, string memory _appId, string memory _actionId) {
		}
  /**
   * @notice This function transfers module ownership
   * @param initializeParams Encoded data having the init parameters
   */
  function setUp(bytes memory initializeParams) public override initializer {
    __Ownable_init();
    (address _safeAddress, address owner, address _multiSendLib, IWorldID _worldId, string memory _appId, string memory _actionId) = abi.decode(
      initializeParams,
      (address, address, address, IWorldID, string, string)
    );
    multiSendLibrary = _multiSendLib;
    setAvatar(_safeAddress);
    setTarget(_safeAddress);
    transferOwnership(owner);
    worldId = _worldId;
		externalNullifier = abi.encodePacked(abi.encodePacked(_appId).hashToField(), _actionId).hashToField();

  }

  /// @param signal An arbitrary input from the user, usually the user's wallet address (check README for further details)
	/// @param root The root of the Merkle tree (returned by the JS widget).
	/// @param nullifierHash The nullifier hash for this proof, preventing double signaling (returned by the JS widget).
	/// @param proof The zero-knowledge proof that demonstrates the claimer is registered with World ID (returned by the JS widget).
	/// @dev Feel free to rename this method however you want! We've used `claim`, `verify` or `execute` in the past.
	function verifyAndExecute(address signal, uint256 root, uint256 nullifierHash, uint256[8] calldata proof) public onlyOwner{
		// First, we make sure this person hasn't done this before
		if (nullifierHashes[nullifierHash]) revert InvalidNullifier();

		// We now verify the provided proof is valid and the user is verified by World ID
		worldId.verifyProof(
			root,
			groupId,
			abi.encodePacked(signal).hashToField(),
			nullifierHash,
			externalNullifier,
			proof
		);

		// We now record the user has done this, so they can't do it again (proof of uniqueness)
		nullifierHashes[nullifierHash] = true;

		// Finally, execute your logic here, for example issue a token, NFT, etc...
		// Make sure to emit some kind of event afterwards!
	}

  /**
   * @notice This function executes to get non-derivative tokens back to the vault
   * @param handlerAddresses Address of the handler to be used
   * @param encodedCalls Encoded calldata for the `executeWallet` function
   */
  function executeWallet(
    address handlerAddresses,
    bytes calldata encodedCalls
  ) public onlyOwner returns (bool isSuccess, bytes memory data) {
    (isSuccess, data) = execAndReturnData(handlerAddresses, 0, encodedCalls, Enum.Operation.Call);
    if (!isSuccess) revert ErrorLibrary.CallFailed();
  }

  /**
   * @notice This function executes encoded calls using the module to the vault
   * @param encodedCalls Encoded calldata for the `executeWalletDelegate` function
   */
  function executeWalletDelegate(bytes calldata encodedCalls) public onlyOwner returns (bool isSuccess) {
    isSuccess = exec(multiSendLibrary, 0, encodedCalls, Enum.Operation.DelegateCall);
    if (!isSuccess) revert ErrorLibrary.CallFailed();
  }
}
