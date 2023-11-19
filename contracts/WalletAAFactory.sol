// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.16;
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable, Initializable} from "@openzeppelin/contracts-upgradeable-4.3.2/access/OwnableUpgradeable.sol";
import {IWaletAASafeModule} from "./vault/IWaletAASafeModule.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {WaletAASafeModule} from "./vault/WaletAASafeModule.sol";
import {SafeDeployer} from "contract/library/SafeDeployer.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/security/ReentrancyGuardUpgradeable.sol";
import {FunctionParameters} from "./FunctionParameters.sol";

contract WalletAAFactory is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
  address internal baseVelvetGnosisSafeModuleAddress;
  //Gnosis Helper Contracts
  address public gnosisSingleton;
  address public gnosisFallbackLibrary;
  address public gnosisMultisendLibrary;
  address public gnosisSafeProxyFactory;

  mapping(address => address[]) public walletList;
  event UpdateGnosisAddresses(
    address newGnosisSingleton,
    address newGnosisFallbackLibrary,
    address newGnosisMultisendLibrary,
    address newGnosisSafeProxyFactory
  );
  event WalletInfo(address[] walletAddresses, address owner);

  /**
   * @notice This function is used to initialise the IndexFactory while deployment
   */
  function initialize(FunctionParameters.FactoryInitData memory initData) external initializer {
    __UUPSUpgradeable_init();
    __Ownable_init();
    __ReentrancyGuard_init();
    if (
      initData._baseVelvetGnosisSafeModuleAddress == address(0) ||
      initData._gnosisSingleton == address(0) ||
      initData._gnosisFallbackLibrary == address(0) ||
      initData._gnosisMultisendLibrary == address(0) ||
      initData._gnosisSafeProxyFactory == address(0)
    ) {
      revert ErrorLibrary.InvalidAddress();
    }
    baseVelvetGnosisSafeModuleAddress = initData._baseVelvetGnosisSafeModuleAddress;
    tokenRegistry = initData._tokenRegistry;
    gnosisSingleton = initData._gnosisSingleton;
    gnosisFallbackLibrary = initData._gnosisFallbackLibrary;
    gnosisMultisendLibrary = initData._gnosisMultisendLibrary;
    gnosisSafeProxyFactory = initData._gnosisSafeProxyFactory;
  }

  /**
   * @notice This function enables to create a new non custodial portfolio
   * @param initData Accepts the input data from the user
   */
  function createIndexNonCustodial(
    FunctionParameters.IndexCreationInitData memory initData
  ) external virtual nonReentrant {
    address[] memory _owner = new address[](1);
    _owner[0] = address(0x0000000000000000000000000000000000000000);
    _createIndex(initData, false, _owner, 1);
  }

  /**
   * @notice This function enables to create a new custodial portfolio
   * @param initData Accepts the input data from the user
   * @param _owners Array list of owners for gnosis safe
   * @param _threshold Threshold for the gnosis safe(min number of transaction required)
   */
  function createIndexCustodial(
    FunctionParameters.IndexCreationInitData memory initData,
    address[] memory _owners,
    uint256 _threshold
  ) external virtual nonReentrant {
    if (_owners.length == 0) {
      revert ErrorLibrary.NoOwnerPassed();
    }
    if (_threshold > _owners.length || _threshold == 0) {
      revert ErrorLibrary.InvalidThresholdLength();
    }
    _createWallet(initData, true, _owners, _threshold);
  }

  /**
   * @notice This internal function enables to create a new portfolio according to given inputs
   * @param initData Input params passed as a struct
   * @param _custodial Boolean param as to whether the fund is custodial or non-custodial
   * @param _owner Address of the owner of the fund
   * @param _threshold Number of signers required for the multi-sig fund creation
   */
  function _createWallet(
    FunctionParameters.IndexCreationInitData memory initData,
    bool _custodial,
    address[] memory _owner,
    uint256 _threshold
  ) internal virtual {
   
    // Vault creation
    address vaultAddress;
    address module;
    if (!_custodial) {
      _owner[0] = address(_exchangeHandler);
      _threshold = 1;
    }

    (vaultAddress, module) = SafeDeployer.deployGnosisSafeAndModule(
      gnosisSingleton,
      gnosisSafeProxyFactory,
      gnosisMultisendLibrary,
      gnosisFallbackLibrary,
      baseVelvetGnosisSafeModuleAddress,
      _owner,
      _threshold
    );
    IWaletAASafeModule(address(module)).setUp(
      abi.encode(vaultAddress, address(_exchangeHandler), address(gnosisMultisendLibrary))
    );

  
    WalletList[msg.sender].push(
      vaultAddress
    );

   

    emit WalletInfo(walletList[msg.sender], msg.sender);
    indexId = indexId + 1;
  }

  /**
   * @notice This function returns the IndexSwap address at the given index id
   * @param indexfundId Integral id of the index fund whose IndexSwap address is to be retrieved
   * @return Return the IndexSwap address of the fund
   */
  function getWalletList(address owner) external view virtual returns (address) {
    return address(WalletList[owner].indexSwap);
  }


  /**
   * @notice This function is the base UUPS upgrade function used to make all the upgrades happen
   * @param _proxy Address of the upgrade proxy contract
   * @param _newImpl Address of the new implementation that is the module to be upgraded to
   */
  function _upgrade(address[] calldata _proxy, address _newImpl) internal virtual onlyOwner {
    if (ITokenRegistry(tokenRegistry).getProtocolState() == false) {
      revert ErrorLibrary.ProtocolNotPaused();
    }
    if (_newImpl == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    for (uint256 i = 0; i < _proxy.length; i++) {
      UUPSUpgradeable(_proxy[i]).upgradeTo(_newImpl);
    }
  }

  /**
   * @notice This function allows us to pause or unpause the index creation state
   * @param _state Boolean parameter to set the index creation state of the factory
   */
  function setIndexCreationState(bool _state) public virtual onlyOwner {
    indexCreationPause = _state;
    emit IndexCreationState(_state);
  }

  /**
   * @notice This function is used to set the base indexswap address
   * @param _indexSwap Address of the IndexSwap module to set as base
   */
  function _setBaseIndexSwapAddress(address _indexSwap) internal {
    baseIndexSwapAddress = _indexSwap;
  }

  /**
   * @notice This function allows us to update gnosis deployment addresses
   * @param _newGnosisSingleton New address of GnosisSingleton
   * @param _newGnosisFallbackLibrary New address of GnosisFallbackLibrary
   * @param _newGnosisMultisendLibrary New address of GnosisMultisendLibrary
   * @param _newGnosisSafeProxyFactory New address of GnosisSafeProxyFactory
   */
  function updateGnosisAddresses(
    address _newGnosisSingleton,
    address _newGnosisFallbackLibrary,
    address _newGnosisMultisendLibrary,
    address _newGnosisSafeProxyFactory
  ) external virtual onlyOwner {
    gnosisSingleton = _newGnosisSingleton;
    gnosisFallbackLibrary = _newGnosisFallbackLibrary;
    gnosisMultisendLibrary = _newGnosisMultisendLibrary;
    gnosisSafeProxyFactory = _newGnosisSafeProxyFactory;

    emit UpdateGnosisAddresses(
      _newGnosisSingleton,
      _newGnosisFallbackLibrary,
      _newGnosisMultisendLibrary,
      _newGnosisSafeProxyFactory
    );
  }

  /**
   * @notice Authorizes upgrade for this contract
   * @param newImplementation Address of the new implementation
   */
  function _authorizeUpgrade(address newImplementation) internal virtual override onlyOwner {}
}