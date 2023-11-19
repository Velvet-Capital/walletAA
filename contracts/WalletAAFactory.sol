// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.19;
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable, Initializable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {IWaletAASafeModule} from "./vault/IWaletAASafeModule.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {WaletAASafeModule} from "./vault/WaletAASafeModule.sol";
import {SafeDeployer} from "./library/SafeDeployer.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {FunctionParameters} from "./FunctionParameters.sol";
import { ErrorLibrary } from "./library/ErrorLibrary.sol";

contract WalletAAFactory is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
  address internal baseGnosisSafeModuleAddress;
      SafeDeployer.DeploymentConfig config;

  //Gnosis Helper Contracts
  address public gnosisSingleton;
  address public gnosisFallbackLibrary;
  address public gnosisMultisendLibrary;
  address public gnosisSafeProxyFactory;

  mapping(address => address[]) public WalletList;
  event UpdateGnosisAddresses(
    address newGnosisSingleton,
    address newGnosisFallbackLibrary,
    address newGnosisMultisendLibrary,
    address newGnosisSafeProxyFactory
  );
  event WalletInfo(address walletAddresses, address owner);

  /**
   * @notice This function is used to initialise the IndexFactory while deployment
   */
  function initialize(FunctionParameters.FactoryInitData memory initData) external initializer {
    __UUPSUpgradeable_init();
    __Ownable_init();
    __ReentrancyGuard_init();
    if (
      initData._basetGnosisSafeModuleAddress == address(0) ||
      initData._gnosisSingleton == address(0) ||
      initData._gnosisFallbackLibrary == address(0) ||
      initData._gnosisMultisendLibrary == address(0) ||
      initData._gnosisSafeProxyFactory == address(0)
    ) {
      revert ErrorLibrary.InvalidAddress();
    }
    baseGnosisSafeModuleAddress = initData._basetGnosisSafeModuleAddress;
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
    _createWalletBase(initData, false, _owner, 1);
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
      _owner[0] = address(msg.sender);
      _threshold = 1;
    }
      config.gnosisSingleton = gnosisSingleton;
        config.gnosisSafeProxyFactory = gnosisSafeProxyFactory;
        config.gnosisMultisendLibrary = gnosisMultisendLibrary;
        config.gnosisFallbackLibrary = gnosisFallbackLibrary;
        config.baseGnosisModule = baseGnosisSafeModuleAddress;
        config.owners = [ msg.sender];
        config.threshold = 1;

    (vaultAddress, module) = SafeDeployer.deployGnosisSafeAndModule(config);
  
    IWaletAASafeModule(address(module)).setUp(

      abi.encode(vaultAddress, address(this), address(gnosisMultisendLibrary))
    );

  
    WalletList[msg.sender].push(
      vaultAddress
    );


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
  function _createWalletBase(
    FunctionParameters.IndexCreationInitData memory initData,
    bool _custodial,
    address[] memory _owner,
    uint256 _threshold
  ) internal virtual {
   
    // Vault creation
    address vaultAddress;
    address module;
    if (!_custodial) {
      _owner[0] = address(msg.sender);
      _threshold = 1;
    }
      config.gnosisSingleton = gnosisSingleton;
        config.gnosisSafeProxyFactory = gnosisSafeProxyFactory;
        config.gnosisMultisendLibrary = gnosisMultisendLibrary;
        config.gnosisFallbackLibrary = gnosisFallbackLibrary;
        config.baseGnosisModule = baseGnosisSafeModuleAddress;
        config.owners = [ msg.sender];
        config.threshold = 1;

    (vaultAddress, module) = SafeDeployer.deployGnosisSafeAndModule(
     config );
    IWaletAASafeModule(address(module)).setUp(
      abi.encode(vaultAddress, address(this), address(gnosisMultisendLibrary))
    );

  
    WalletList[msg.sender].push(
      vaultAddress
    );

   

    emit WalletInfo(address(vaultAddress), msg.sender);
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