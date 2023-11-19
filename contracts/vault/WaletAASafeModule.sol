// SPDX-License-Identifier: BUSL-1.1

/**
 * @title WaletAA - Safe Module for a particular Index
 * @author Velvet.Capital
 * @notice This contract is used for creating a bridge between the contract and the gnosis safe vault
 * @dev This contract includes functionalities:
 *      1. Add a new owner of the vault
 *      2. Transfer BNB and other tokens to and fro from vault
 */
pragma solidity 0.8.19;

import {Module, Enum} from "@gnosis.pm/zodiac/contracts/core/Module.sol";
import {TransferHelper} from "@uniswap/lib/contracts/libraries/TransferHelper.sol";
import {ErrorLibrary} from "../library/ErrorLibrary.sol";
import { ByteHasher } from './ByteHasher.sol';
import { IWorldID } from './IWorldID.sol';

contract WaletAASafeModule is Module {
	using ByteHasher for bytes;

	/// @notice Thrown when attempting to reuse a nullifier
	error InvalidNullifier();

	/// @dev The World ID group ID (always 1)
	uint256 internal immutable groupId = 1;

	/// @dev Whether a nullifier hash has been used already. Used to guarantee an action is only performed once by a single person
	mapping(uint256 => bool) internal nullifierHashes;

  address public multiSendLibrary;
 
  /**
   * @notice This function transfers module ownership
   * @param initializeParams Encoded data having the init parameters
   */
  function setUp(bytes memory initializeParams) public override initializer {
    __Ownable_init();
    (address _safeAddress, address owner, address _multiSendLib) = abi.decode(
      initializeParams,
      (address, address, address)
    );
    multiSendLibrary = _multiSendLib;
    setAvatar(_safeAddress);
    setTarget(_safeAddress);
    transferOwnership(owner);
   
    
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
